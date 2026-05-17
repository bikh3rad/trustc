// Package store handles escrow persistence: accounts, locks, releases.
package store

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	sharederrs "github.com/trustc/trustc/services/shared/errs"
)

type Account struct {
	ID            string `json:"id"`
	StartupID     string `json:"startup_id"`
	BalanceCents  int64  `json:"balance_cents"`
	LockedCents   int64  `json:"locked_cents"`
	Currency      string `json:"currency"`
	AvailableCents int64 `json:"available_cents"`
}

type Lock struct {
	ID            string    `json:"id"`
	ProcurementID string    `json:"procurement_id"`
	AccountID     string    `json:"account_id"`
	AmountCents   int64     `json:"amount_cents"`
	Currency      string    `json:"currency"`
	State         string    `json:"state"`
	LockedAt      time.Time `json:"locked_at"`
	ReleasedAt    *time.Time `json:"released_at,omitempty"`
}

type Release struct {
	ID            string    `json:"id"`
	LockID        string    `json:"lock_id"`
	ProcurementID string    `json:"procurement_id"`
	AmountCents   int64     `json:"amount_cents"`
	SupplierName  string    `json:"supplier_name"`
	ReleasedAt    time.Time `json:"released_at"`
	TxnRef        string    `json:"txn_ref,omitempty"`
}

type Store struct{ db *pgxpool.Pool }

func New(db *pgxpool.Pool) *Store { return &Store{db: db} }

func (s *Store) GetOrCreateAccount(ctx context.Context, startupID, currency string) (*Account, error) {
	var a Account
	err := s.db.QueryRow(ctx, `
		WITH ins AS (
		    INSERT INTO escrow.escrow_accounts (startup_id, currency)
		    VALUES ($1, $2)
		    ON CONFLICT (startup_id) DO NOTHING
		    RETURNING id, startup_id, balance_cents, locked_cents, currency
		)
		SELECT id, startup_id, balance_cents, locked_cents, currency FROM ins
		UNION ALL
		SELECT id, startup_id, balance_cents, locked_cents, currency
		FROM escrow.escrow_accounts WHERE startup_id = $1
		LIMIT 1
	`, startupID, currency).Scan(&a.ID, &a.StartupID, &a.BalanceCents, &a.LockedCents, &a.Currency)
	if err != nil {
		return nil, fmt.Errorf("escrow: get/create account: %w", err)
	}
	a.AvailableCents = a.BalanceCents - a.LockedCents
	return &a, nil
}

// Lock reserves amountCents on the account. Returns ErrInsufficientFunds if available < amount.
// Idempotent on procurement_id: the same procurement gets back the same lock.
func (s *Store) Lock(ctx context.Context, procurementID, startupID, currency, supplierName string, amountCents int64) (*Lock, error) {
	tx, err := s.db.BeginTx(ctx, pgx.TxOptions{IsoLevel: pgx.Serializable})
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	// idempotency check
	var existing Lock
	err = tx.QueryRow(ctx, `
		SELECT id, procurement_id, account_id, amount_cents, currency, state, locked_at, released_at
		FROM escrow.escrow_locks WHERE procurement_id = $1
	`, procurementID).Scan(&existing.ID, &existing.ProcurementID, &existing.AccountID,
		&existing.AmountCents, &existing.Currency, &existing.State, &existing.LockedAt, &existing.ReleasedAt)
	if err == nil {
		return &existing, tx.Commit(ctx)
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return nil, fmt.Errorf("escrow: lookup existing lock: %w", err)
	}

	// upsert account, lock the row
	var accountID string
	var balance, locked int64
	err = tx.QueryRow(ctx, `
		INSERT INTO escrow.escrow_accounts (startup_id, currency)
		VALUES ($1, $2)
		ON CONFLICT (startup_id) DO UPDATE SET updated_at = NOW()
		RETURNING id, balance_cents, locked_cents
	`, startupID, currency).Scan(&accountID, &balance, &locked)
	if err != nil {
		return nil, fmt.Errorf("escrow: upsert account: %w", err)
	}

	available := balance - locked
	if available < amountCents {
		return nil, sharederrs.New(sharederrs.KindInvariantViolation, "INSUFFICIENT_ESCROW_FUNDS",
			fmt.Sprintf("available=%d cents, requested=%d cents", available, amountCents))
	}

	var l Lock
	err = tx.QueryRow(ctx, `
		INSERT INTO escrow.escrow_locks (procurement_id, account_id, amount_cents, currency)
		VALUES ($1, $2, $3, $4)
		RETURNING id, procurement_id, account_id, amount_cents, currency, state, locked_at, released_at
	`, procurementID, accountID, amountCents, currency).Scan(
		&l.ID, &l.ProcurementID, &l.AccountID, &l.AmountCents, &l.Currency, &l.State, &l.LockedAt, &l.ReleasedAt)
	if err != nil {
		return nil, fmt.Errorf("escrow: insert lock: %w", err)
	}

	_, err = tx.Exec(ctx, `
		UPDATE escrow.escrow_accounts
		SET locked_cents = locked_cents + $2, updated_at = NOW()
		WHERE id = $1
	`, accountID, amountCents)
	if err != nil {
		return nil, fmt.Errorf("escrow: bump locked_cents: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return &l, nil
}

// Release marks the lock RELEASED, debits balance + locked by the lock amount,
// and inserts a releases row. Returns the release plus the lock.
// Idempotent on procurement_id.
func (s *Store) Release(ctx context.Context, procurementID, supplierName string) (*Release, *Lock, error) {
	tx, err := s.db.BeginTx(ctx, pgx.TxOptions{IsoLevel: pgx.Serializable})
	if err != nil {
		return nil, nil, err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var l Lock
	err = tx.QueryRow(ctx, `
		SELECT id, procurement_id, account_id, amount_cents, currency, state, locked_at, released_at
		FROM escrow.escrow_locks WHERE procurement_id = $1 FOR UPDATE
	`, procurementID).Scan(&l.ID, &l.ProcurementID, &l.AccountID, &l.AmountCents, &l.Currency, &l.State, &l.LockedAt, &l.ReleasedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil, sharederrs.New(sharederrs.KindNotFound, "LOCK_NOT_FOUND",
			"no escrow lock for procurement "+procurementID)
	}
	if err != nil {
		return nil, nil, err
	}
	if l.State == "RELEASED" {
		// idempotent return
		var r Release
		err = tx.QueryRow(ctx, `
			SELECT id, lock_id, procurement_id, amount_cents, supplier_name, released_at, COALESCE(txn_ref,'')
			FROM escrow.releases WHERE procurement_id = $1
		`, procurementID).Scan(&r.ID, &r.LockID, &r.ProcurementID, &r.AmountCents, &r.SupplierName, &r.ReleasedAt, &r.TxnRef)
		if err != nil {
			return nil, nil, err
		}
		return &r, &l, tx.Commit(ctx)
	}
	if l.State != "LOCKED" {
		return nil, nil, sharederrs.New(sharederrs.KindInvariantViolation, "LOCK_NOT_RELEASABLE",
			"lock is in state "+l.State+", cannot release")
	}

	_, err = tx.Exec(ctx, `
		UPDATE escrow.escrow_locks SET state = 'RELEASED', released_at = NOW() WHERE id = $1
	`, l.ID)
	if err != nil {
		return nil, nil, err
	}

	_, err = tx.Exec(ctx, `
		UPDATE escrow.escrow_accounts
		SET balance_cents = balance_cents - $2,
		    locked_cents  = locked_cents  - $2,
		    updated_at    = NOW()
		WHERE id = $1
	`, l.AccountID, l.AmountCents)
	if err != nil {
		return nil, nil, err
	}

	var r Release
	err = tx.QueryRow(ctx, `
		INSERT INTO escrow.releases (lock_id, procurement_id, amount_cents, supplier_name)
		VALUES ($1, $2, $3, $4)
		RETURNING id, lock_id, procurement_id, amount_cents, supplier_name, released_at, COALESCE(txn_ref,'')
	`, l.ID, l.ProcurementID, l.AmountCents, supplierName).Scan(
		&r.ID, &r.LockID, &r.ProcurementID, &r.AmountCents, &r.SupplierName, &r.ReleasedAt, &r.TxnRef)
	if err != nil {
		return nil, nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, nil, err
	}
	return &r, &l, nil
}

func (s *Store) AccountFor(ctx context.Context, startupID string) (*Account, error) {
	var a Account
	err := s.db.QueryRow(ctx, `
		SELECT id, startup_id, balance_cents, locked_cents, currency
		FROM escrow.escrow_accounts WHERE startup_id = $1
	`, startupID).Scan(&a.ID, &a.StartupID, &a.BalanceCents, &a.LockedCents, &a.Currency)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, sharederrs.New(sharederrs.KindNotFound, "ESCROW_ACCOUNT_NOT_FOUND",
			"no escrow account for startup "+startupID)
	}
	if err != nil {
		return nil, err
	}
	a.AvailableCents = a.BalanceCents - a.LockedCents
	return &a, nil
}

// AdjustBalance is used by the seed and by capital recycling (later phase)
// to top up an escrow account. NOT exposed via REST.
func (s *Store) AdjustBalance(ctx context.Context, startupID string, deltaCents int64) error {
	_, err := s.db.Exec(ctx, `
		UPDATE escrow.escrow_accounts
		SET balance_cents = balance_cents + $2, updated_at = NOW()
		WHERE startup_id = $1
	`, startupID, deltaCents)
	return err
}

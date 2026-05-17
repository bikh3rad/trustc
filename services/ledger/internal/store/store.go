// Package store handles all DB access for the Ledger service.
package store

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	sharederrs "github.com/trustc/trustc/services/shared/errs"

	"github.com/trustc/trustc/services/ledger/internal/domain"
)

type Store struct{ db *pgxpool.Pool }

func New(db *pgxpool.Pool) *Store { return &Store{db: db} }

type PostedEntry struct {
	ID                  string    `json:"id"`
	TransactionID       string    `json:"transaction_id"`
	WorkflowReferenceID string    `json:"workflow_reference_id,omitempty"`
	Description         string    `json:"description,omitempty"`
	PostedAt            time.Time `json:"posted_at"`
	TotalDebitsCents    int64     `json:"total_debits_cents"`
	TotalCreditsCents   int64     `json:"total_credits_cents"`
}

// Post inserts an entry + its lines atomically. The CHECK constraints in the
// ledger.journal_entries table enforce balance and non-zero totals; if the
// app accidentally drifted, the DB would still reject.
func (s *Store) Post(ctx context.Context, e domain.Entry) (*PostedEntry, error) {
	var debits, credits int64
	for _, l := range e.Lines {
		if l.Side == domain.Debit {
			debits += l.AmountCents
		} else {
			credits += l.AmountCents
		}
	}

	tx, err := s.db.BeginTx(ctx, pgx.TxOptions{IsoLevel: pgx.Serializable})
	if err != nil {
		return nil, fmt.Errorf("ledger: begin tx: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var (
		id       string
		postedAt time.Time
	)
	err = tx.QueryRow(ctx, `
		INSERT INTO ledger.journal_entries
		    (transaction_id, workflow_reference_id, description,
		     total_debits_cents, total_credits_cents)
		VALUES ($1, NULLIF($2,''), NULLIF($3,''), $4, $5)
		RETURNING id, posted_at
	`, e.TransactionID, e.WorkflowReferenceID, e.Description, debits, credits).
		Scan(&id, &postedAt)
	if err != nil {
		// 23505 = unique violation on transaction_id → idempotent re-post
		if isUnique(err) {
			return s.byTxnID(ctx, e.TransactionID)
		}
		// 23514 = check constraint (e.g. balance) failed
		if isCheck(err) {
			return nil, sharederrs.Wrap(sharederrs.KindInvariantViolation,
				"LEDGER_BALANCE_REJECTED",
				"database rejected entry (balance/check violation)", err)
		}
		return nil, fmt.Errorf("ledger: insert entry: %w", err)
	}

	for _, l := range e.Lines {
		_, err := tx.Exec(ctx, `
			INSERT INTO ledger.journal_lines (entry_id, account_code, side, amount_cents)
			VALUES ($1, $2, $3, $4)
		`, id, l.AccountCode, string(l.Side), l.AmountCents)
		if err != nil {
			if isFK(err) {
				return nil, sharederrs.Wrap(sharederrs.KindBadRequest,
					"UNKNOWN_ACCOUNT",
					"account_code does not exist in chart of accounts: "+l.AccountCode, err)
			}
			return nil, fmt.Errorf("ledger: insert line: %w", err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("ledger: commit: %w", err)
	}

	return &PostedEntry{
		ID:                  id,
		TransactionID:       e.TransactionID,
		WorkflowReferenceID: e.WorkflowReferenceID,
		Description:         e.Description,
		PostedAt:            postedAt,
		TotalDebitsCents:    debits,
		TotalCreditsCents:   credits,
	}, nil
}

func (s *Store) byTxnID(ctx context.Context, txnID string) (*PostedEntry, error) {
	var p PostedEntry
	err := s.db.QueryRow(ctx, `
		SELECT id, transaction_id, COALESCE(workflow_reference_id,''), COALESCE(description,''),
		       posted_at, total_debits_cents, total_credits_cents
		FROM ledger.journal_entries
		WHERE transaction_id = $1
	`, txnID).Scan(&p.ID, &p.TransactionID, &p.WorkflowReferenceID, &p.Description,
		&p.PostedAt, &p.TotalDebitsCents, &p.TotalCreditsCents)
	if err != nil {
		return nil, fmt.Errorf("ledger: lookup by txn: %w", err)
	}
	return &p, nil
}

// Balance returns the current balance (in cents) of an account.
func (s *Store) Balance(ctx context.Context, code string) (int64, error) {
	var bal int64
	err := s.db.QueryRow(ctx, `
		SELECT COALESCE(balance_cents, 0) FROM ledger.account_balances WHERE code = $1
	`, code).Scan(&bal)
	if errors.Is(err, pgx.ErrNoRows) {
		return 0, sharederrs.New(sharederrs.KindNotFound, "ACCOUNT_NOT_FOUND",
			"unknown account: "+code)
	}
	if err != nil {
		return 0, fmt.Errorf("ledger: balance: %w", err)
	}
	return bal, nil
}

type EntrySummary struct {
	ID                  string    `json:"id"`
	TransactionID       string    `json:"transaction_id"`
	WorkflowReferenceID string    `json:"workflow_reference_id,omitempty"`
	Description         string    `json:"description,omitempty"`
	PostedAt            time.Time `json:"posted_at"`
	TotalCents          int64     `json:"total_cents"`
}

func (s *Store) List(ctx context.Context, workflowRef string, limit int) ([]EntrySummary, error) {
	if limit <= 0 || limit > 500 {
		limit = 100
	}
	rows, err := s.db.Query(ctx, `
		SELECT id, transaction_id, COALESCE(workflow_reference_id,''),
		       COALESCE(description,''), posted_at, total_debits_cents
		FROM ledger.journal_entries
		WHERE ($1 = '' OR workflow_reference_id = $1)
		ORDER BY posted_at DESC
		LIMIT $2
	`, workflowRef, limit)
	if err != nil {
		return nil, fmt.Errorf("ledger: list: %w", err)
	}
	defer rows.Close()
	out := []EntrySummary{}
	for rows.Next() {
		var e EntrySummary
		if err := rows.Scan(&e.ID, &e.TransactionID, &e.WorkflowReferenceID,
			&e.Description, &e.PostedAt, &e.TotalCents); err != nil {
			return nil, err
		}
		out = append(out, e)
	}
	return out, rows.Err()
}

// pgx error code detection helpers.
func isUnique(err error) bool { return pgErrCode(err) == "23505" }
func isCheck(err error) bool  { return pgErrCode(err) == "23514" }
func isFK(err error) bool     { return pgErrCode(err) == "23503" }

func pgErrCode(err error) string {
	type sqlStateErr interface{ SQLState() string }
	var s sqlStateErr
	if errors.As(err, &s) {
		return s.SQLState()
	}
	return ""
}

// Package store handles startup persistence.
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

type Startup struct {
	ID            string    `json:"id"`
	VCID          string    `json:"vc_id"`
	StartupName   string    `json:"startup_name"`
	LegalName     string    `json:"legal_name"`
	Industry      string    `json:"industry"`
	Country       string    `json:"country"`
	TaxID         string    `json:"tax_id"`
	Status        string    `json:"status"`
	CreditScore   int       `json:"credit_score"`
	BurnRateCents int64     `json:"burn_rate_cents"`
	RiskLevel     string    `json:"risk_level"`
	CreatedAt     time.Time `json:"created_at"`
}

type Founder struct {
	FounderName string `json:"founder_name"`
	Email       string `json:"email"`
	Phone       string `json:"phone,omitempty"`
}

type Bank struct {
	BankAccount string `json:"bank_account"`
	BankName    string `json:"bank_name,omitempty"`
}

type CreateInput struct {
	Startup
	Founder Founder `json:"founder"`
	Bank    Bank    `json:"bank"`
}

type Store struct{ db *pgxpool.Pool }

func New(db *pgxpool.Pool) *Store { return &Store{db: db} }

func (s *Store) Create(ctx context.Context, in CreateInput) (*Startup, error) {
	tx, err := s.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, fmt.Errorf("startup: begin: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var out Startup
	err = tx.QueryRow(ctx, `
		INSERT INTO startup.startups
		   (vc_id, startup_name, legal_name, industry, country, tax_id,
		    credit_score, burn_rate_cents, risk_level)
		VALUES ($1,$2,$3,$4,$5,$6,
		        COALESCE(NULLIF($7, 0), 50),
		        COALESCE(NULLIF($8, 0), 0),
		        COALESCE(NULLIF($9, ''), 'MEDIUM'))
		RETURNING id, vc_id, startup_name, legal_name, industry, country, tax_id,
		          status, credit_score, burn_rate_cents, risk_level, created_at
	`, in.VCID, in.StartupName, in.LegalName, in.Industry, in.Country, in.TaxID,
		in.CreditScore, in.BurnRateCents, in.RiskLevel,
	).Scan(&out.ID, &out.VCID, &out.StartupName, &out.LegalName, &out.Industry,
		&out.Country, &out.TaxID, &out.Status, &out.CreditScore, &out.BurnRateCents,
		&out.RiskLevel, &out.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("startup: insert startup: %w", err)
	}

	if in.Founder.FounderName != "" {
		_, err = tx.Exec(ctx, `
			INSERT INTO startup.founders (startup_id, founder_name, email, phone)
			VALUES ($1, $2, $3, NULLIF($4,''))
		`, out.ID, in.Founder.FounderName, in.Founder.Email, in.Founder.Phone)
		if err != nil {
			return nil, fmt.Errorf("startup: insert founder: %w", err)
		}
	}

	if in.Bank.BankAccount != "" {
		_, err = tx.Exec(ctx, `
			INSERT INTO startup.bank_details (startup_id, bank_account, bank_name)
			VALUES ($1, $2, NULLIF($3,''))
		`, out.ID, in.Bank.BankAccount, in.Bank.BankName)
		if err != nil {
			return nil, fmt.Errorf("startup: insert bank: %w", err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("startup: commit: %w", err)
	}
	return &out, nil
}

func (s *Store) Get(ctx context.Context, id string) (*Startup, error) {
	var out Startup
	err := s.db.QueryRow(ctx, `
		SELECT id, vc_id, startup_name, legal_name, industry, country, tax_id,
		       status, credit_score, burn_rate_cents, risk_level, created_at
		FROM startup.startups WHERE id = $1
	`, id).Scan(&out.ID, &out.VCID, &out.StartupName, &out.LegalName, &out.Industry,
		&out.Country, &out.TaxID, &out.Status, &out.CreditScore, &out.BurnRateCents,
		&out.RiskLevel, &out.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, sharederrs.New(sharederrs.KindNotFound, "STARTUP_NOT_FOUND", "no such startup")
	}
	if err != nil {
		return nil, fmt.Errorf("startup: get: %w", err)
	}
	return &out, nil
}

func (s *Store) List(ctx context.Context, vcID string) ([]Startup, error) {
	rows, err := s.db.Query(ctx, `
		SELECT id, vc_id, startup_name, legal_name, industry, country, tax_id,
		       status, credit_score, burn_rate_cents, risk_level, created_at
		FROM startup.startups
		WHERE ($1 = '' OR vc_id::text = $1)
		ORDER BY created_at DESC
		LIMIT 500
	`, vcID)
	if err != nil {
		return nil, fmt.Errorf("startup: list: %w", err)
	}
	defer rows.Close()
	out := []Startup{}
	for rows.Next() {
		var s Startup
		if err := rows.Scan(&s.ID, &s.VCID, &s.StartupName, &s.LegalName, &s.Industry,
			&s.Country, &s.TaxID, &s.Status, &s.CreditScore, &s.BurnRateCents,
			&s.RiskLevel, &s.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, s)
	}
	return out, rows.Err()
}

type VC struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	AUMCents int64  `json:"aum_cents"`
}

// ListVCs returns every VC fund. MVP has exactly one ("trustC Ventures").
func (s *Store) ListVCs(ctx context.Context) ([]VC, error) {
	rows, err := s.db.Query(ctx, `
		SELECT id, name, COALESCE(aum_cents, 0)
		FROM startup.vcs
		ORDER BY name
		LIMIT 100
	`)
	if err != nil {
		return nil, fmt.Errorf("startup: list vcs: %w", err)
	}
	defer rows.Close()
	out := []VC{}
	for rows.Next() {
		var v VC
		if err := rows.Scan(&v.ID, &v.Name, &v.AUMCents); err != nil {
			return nil, err
		}
		out = append(out, v)
	}
	return out, rows.Err()
}

// DefaultVCID returns the ID of the only VC in the system. Used when a VC
// user creates a startup without specifying vc_id — MVP is single-VC per
// CLAUDE.md §13. Returns an error if 0 or >1 VCs are configured.
func (s *Store) DefaultVCID(ctx context.Context) (string, error) {
	var id string
	var count int
	err := s.db.QueryRow(ctx, `
		SELECT (SELECT id::text FROM startup.vcs ORDER BY name LIMIT 1),
		       (SELECT COUNT(*) FROM startup.vcs)
	`).Scan(&id, &count)
	if err != nil {
		return "", fmt.Errorf("startup: default vc: %w", err)
	}
	if count == 0 {
		return "", sharederrs.New(sharederrs.KindNotFound, "NO_VC",
			"no VC configured; seed startup.vcs first")
	}
	if count > 1 {
		return "", sharederrs.New(sharederrs.KindBadRequest, "AMBIGUOUS_VC",
			"multiple VCs configured; vc_id must be specified explicitly")
	}
	return id, nil
}

func (s *Store) SetStatus(ctx context.Context, id, status string) error {
	tag, err := s.db.Exec(ctx, `
		UPDATE startup.startups SET status = $2, updated_at = NOW() WHERE id = $1
	`, id, status)
	if err != nil {
		return fmt.Errorf("startup: set status: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return sharederrs.New(sharederrs.KindNotFound, "STARTUP_NOT_FOUND", "no such startup")
	}
	return nil
}

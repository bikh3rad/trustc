// Package store handles auth.users persistence.
//
// The User struct is the canonical shape the auth + admin services return
// to the gateway. Password hashes are NEVER included in JSON responses
// (the field is excluded via `-`).
package store

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	sharederrs "github.com/trustc/trustc/services/shared/errs"
)

type User struct {
	ID           string     `json:"id"`
	Email        string     `json:"email"`
	PasswordHash string     `json:"-"`
	Role         string     `json:"role"`
	Status       string     `json:"status"`
	Name         string     `json:"name"`
	Company      string     `json:"company,omitempty"`
	StartupID    string     `json:"startup_id,omitempty"`
	JoinedAt     time.Time  `json:"joined_at"`
	LastLogin    *time.Time `json:"last_login,omitempty"`
}

type Store struct{ db *pgxpool.Pool }

func New(db *pgxpool.Pool) *Store { return &Store{db: db} }

// scan reads a full user row into a User struct, normalising null timestamps.
func scan(row pgx.Row) (*User, error) {
	var u User
	var company, startup *string
	var last *time.Time
	if err := row.Scan(&u.ID, &u.Email, &u.PasswordHash, &u.Role, &u.Status,
		&u.Name, &company, &startup, &u.JoinedAt, &last); err != nil {
		return nil, err
	}
	if company != nil {
		u.Company = *company
	}
	if startup != nil {
		u.StartupID = *startup
	}
	u.LastLogin = last
	return &u, nil
}

const selectCols = `id, email, password_hash, role, status, name, company, startup_id, joined_at, last_login`

// CreateInput is the field set the auth service accepts for /register.
// Status is always derived (admins set initial value; we never accept it from the client).
type CreateInput struct {
	Email        string
	PasswordHash string
	Role         string
	Status       string
	Name         string
	Company      string
	StartupID    string
}

func (s *Store) Create(ctx context.Context, in CreateInput) (*User, error) {
	if in.Status == "" {
		in.Status = "PENDING"
	}
	var startup any
	if in.StartupID != "" {
		startup = in.StartupID
	}
	row := s.db.QueryRow(ctx, `
		INSERT INTO auth.users (email, password_hash, role, status, name, company, startup_id)
		VALUES ($1,$2,$3,$4,$5, NULLIF($6,''), $7)
		RETURNING `+selectCols,
		strings.ToLower(strings.TrimSpace(in.Email)),
		in.PasswordHash, in.Role, in.Status, in.Name, in.Company, startup)
	u, err := scan(row)
	if err != nil {
		if isUniqueViolation(err) {
			return nil, sharederrs.New(sharederrs.KindConflict, "EMAIL_TAKEN", "email already registered")
		}
		return nil, fmt.Errorf("auth.store: insert user: %w", err)
	}
	return u, nil
}

func (s *Store) GetByEmail(ctx context.Context, email string) (*User, error) {
	row := s.db.QueryRow(ctx,
		`SELECT `+selectCols+` FROM auth.users WHERE email = $1`,
		strings.ToLower(strings.TrimSpace(email)))
	u, err := scan(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, sharederrs.New(sharederrs.KindNotFound, "USER_NOT_FOUND", "no user with that email")
	}
	if err != nil {
		return nil, fmt.Errorf("auth.store: get by email: %w", err)
	}
	return u, nil
}

func (s *Store) GetByID(ctx context.Context, id string) (*User, error) {
	row := s.db.QueryRow(ctx,
		`SELECT `+selectCols+` FROM auth.users WHERE id = $1`, id)
	u, err := scan(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, sharederrs.New(sharederrs.KindNotFound, "USER_NOT_FOUND", "no such user")
	}
	if err != nil {
		return nil, fmt.Errorf("auth.store: get by id: %w", err)
	}
	return u, nil
}

// List returns users filtered by status/role. Empty filter = no filter on that field.
func (s *Store) List(ctx context.Context, status, role string) ([]User, error) {
	rows, err := s.db.Query(ctx, `
		SELECT `+selectCols+`
		FROM auth.users
		WHERE ($1 = '' OR status = $1)
		  AND ($2 = '' OR role   = $2)
		ORDER BY joined_at DESC
		LIMIT 500
	`, status, role)
	if err != nil {
		return nil, fmt.Errorf("auth.store: list: %w", err)
	}
	defer rows.Close()
	out := []User{}
	for rows.Next() {
		u, err := scan(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *u)
	}
	return out, rows.Err()
}

// SetPassword overwrites the bcrypt hash for an existing user. Used by the
// admin "set password" flow (auth /internal/users/{id}/password proxied from
// admin /admin/users/{id}/password).
func (s *Store) SetPassword(ctx context.Context, id, hash string) (*User, error) {
	row := s.db.QueryRow(ctx, `
		UPDATE auth.users
		SET password_hash = $2, updated_at = NOW()
		WHERE id = $1
		RETURNING `+selectCols,
		id, hash)
	u, err := scan(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, sharederrs.New(sharederrs.KindNotFound, "USER_NOT_FOUND", "no such user")
	}
	if err != nil {
		return nil, fmt.Errorf("auth.store: set password: %w", err)
	}
	return u, nil
}

func (s *Store) SetStatus(ctx context.Context, id, status string) (*User, error) {
	row := s.db.QueryRow(ctx, `
		UPDATE auth.users
		SET status = $2, updated_at = NOW()
		WHERE id = $1
		RETURNING `+selectCols,
		id, status)
	u, err := scan(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, sharederrs.New(sharederrs.KindNotFound, "USER_NOT_FOUND", "no such user")
	}
	if err != nil {
		return nil, fmt.Errorf("auth.store: set status: %w", err)
	}
	return u, nil
}

// SetStartupID links (or clears, when startupID == "") a user to a startup.
// Used by the admin/VC "assign founder to company" flow — a founder who
// self-registers lands without a startup_id and the dashboard's empty state
// kicks in until this is called.
func (s *Store) SetStartupID(ctx context.Context, id, startupID string) (*User, error) {
	var arg any
	if startupID != "" {
		arg = startupID
	}
	row := s.db.QueryRow(ctx, `
		UPDATE auth.users
		SET startup_id = $2, updated_at = NOW()
		WHERE id = $1
		RETURNING `+selectCols,
		id, arg)
	u, err := scan(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, sharederrs.New(sharederrs.KindNotFound, "USER_NOT_FOUND", "no such user")
	}
	if err != nil {
		return nil, fmt.Errorf("auth.store: set startup_id: %w", err)
	}
	return u, nil
}

func (s *Store) TouchLogin(ctx context.Context, id string) error {
	_, err := s.db.Exec(ctx, `UPDATE auth.users SET last_login = NOW() WHERE id = $1`, id)
	return err
}

func isUniqueViolation(err error) bool {
	// pgx surfaces PG error codes via *pgconn.PgError; rather than import that
	// just for one check we string-match. (Both 23505 and the SQLSTATE text appear.)
	return err != nil && strings.Contains(err.Error(), "SQLSTATE 23505")
}

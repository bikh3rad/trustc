// Package store handles governance persistence: freeze records and lookups.
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

type Scope string
type Duration string

const (
	ScopeFull    Scope = "FULL"
	ScopePartial Scope = "PARTIAL"

	DurationTemporary Duration = "TEMPORARY"
	DurationPermanent Duration = "PERMANENT"
)

type Freeze struct {
	ID           string     `json:"id"`
	StartupID    string     `json:"startup_id"`
	Scope        Scope      `json:"scope"`
	Duration     Duration   `json:"duration"`
	Reason       string     `json:"reason"`
	ActorID      string     `json:"actor_id,omitempty"`
	ActorRole    string     `json:"actor_role,omitempty"`
	RequestID    string     `json:"request_id,omitempty"`
	ActivatedAt  time.Time  `json:"activated_at"`
	LiftedAt     *time.Time `json:"lifted_at,omitempty"`
	LiftReason   string     `json:"lift_reason,omitempty"`
	LiftedBy     string     `json:"lifted_by,omitempty"`
}

type Store struct{ db *pgxpool.Pool }

func New(db *pgxpool.Pool) *Store { return &Store{db: db} }

// Activate inserts a new active freeze. Conflict with the partial unique index
// (one active per startup) returns ALREADY_FROZEN.
func (s *Store) Activate(ctx context.Context, f Freeze) (*Freeze, error) {
	if f.Scope != ScopeFull && f.Scope != ScopePartial {
		return nil, sharederrs.New(sharederrs.KindBadRequest, "BAD_SCOPE",
			"scope must be FULL or PARTIAL")
	}
	if f.Duration != DurationTemporary && f.Duration != DurationPermanent {
		return nil, sharederrs.New(sharederrs.KindBadRequest, "BAD_DURATION",
			"duration must be TEMPORARY or PERMANENT")
	}
	if f.StartupID == "" {
		return nil, sharederrs.New(sharederrs.KindBadRequest, "MISSING_STARTUP_ID",
			"startup_id required")
	}
	if f.Reason == "" {
		return nil, sharederrs.New(sharederrs.KindBadRequest, "MISSING_REASON",
			"reason required for compliance trail")
	}

	var out Freeze
	err := s.db.QueryRow(ctx, `
		INSERT INTO governance.freezes (
		    startup_id, scope, duration, reason,
		    actor_id, actor_role, request_id
		) VALUES (
		    $1, $2, $3, $4,
		    NULLIF($5,'')::uuid, NULLIF($6,''), NULLIF($7,'')
		)
		RETURNING id, startup_id, scope, duration, reason,
		          COALESCE(actor_id::text,''), COALESCE(actor_role,''), COALESCE(request_id,''),
		          activated_at, lifted_at, COALESCE(lift_reason,''), COALESCE(lifted_by::text,'')
	`, f.StartupID, string(f.Scope), string(f.Duration), f.Reason,
		f.ActorID, f.ActorRole, f.RequestID,
	).Scan(&out.ID, &out.StartupID, &out.Scope, &out.Duration, &out.Reason,
		&out.ActorID, &out.ActorRole, &out.RequestID,
		&out.ActivatedAt, &out.LiftedAt, &out.LiftReason, &out.LiftedBy)
	if err != nil {
		if isUniqueViolation(err) {
			return nil, sharederrs.New(sharederrs.KindConflict, "ALREADY_FROZEN",
				"startup already has an active freeze")
		}
		return nil, fmt.Errorf("governance: insert freeze: %w", err)
	}
	return &out, nil
}

// Lift marks an active freeze as lifted. Returns NOT_FOUND if the id is unknown
// or the freeze is already lifted.
func (s *Store) Lift(ctx context.Context, id, liftReason, liftedBy string) (*Freeze, error) {
	var out Freeze
	err := s.db.QueryRow(ctx, `
		UPDATE governance.freezes
		SET lifted_at   = NOW(),
		    lift_reason = $2,
		    lifted_by   = NULLIF($3,'')::uuid
		WHERE id = $1 AND lifted_at IS NULL
		RETURNING id, startup_id, scope, duration, reason,
		          COALESCE(actor_id::text,''), COALESCE(actor_role,''), COALESCE(request_id,''),
		          activated_at, lifted_at, COALESCE(lift_reason,''), COALESCE(lifted_by::text,'')
	`, id, liftReason, liftedBy).Scan(
		&out.ID, &out.StartupID, &out.Scope, &out.Duration, &out.Reason,
		&out.ActorID, &out.ActorRole, &out.RequestID,
		&out.ActivatedAt, &out.LiftedAt, &out.LiftReason, &out.LiftedBy)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, sharederrs.New(sharederrs.KindNotFound, "FREEZE_NOT_ACTIVE",
			"no active freeze with that id")
	}
	if err != nil {
		return nil, fmt.Errorf("governance: lift freeze: %w", err)
	}
	return &out, nil
}

// ActiveForStartup returns the current active freeze for a startup, or nil if
// the startup is not frozen.
func (s *Store) ActiveForStartup(ctx context.Context, startupID string) (*Freeze, error) {
	var out Freeze
	err := s.db.QueryRow(ctx, `
		SELECT id, startup_id, scope, duration, reason,
		       COALESCE(actor_id::text,''), COALESCE(actor_role,''), COALESCE(request_id,''),
		       activated_at, lifted_at, COALESCE(lift_reason,''), COALESCE(lifted_by::text,'')
		FROM governance.freezes
		WHERE startup_id = $1 AND lifted_at IS NULL
	`, startupID).Scan(
		&out.ID, &out.StartupID, &out.Scope, &out.Duration, &out.Reason,
		&out.ActorID, &out.ActorRole, &out.RequestID,
		&out.ActivatedAt, &out.LiftedAt, &out.LiftReason, &out.LiftedBy)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &out, nil
}

// ListActive returns every currently-active freeze across all startups,
// newest first. Used by the VC dashboard.
func (s *Store) ListActive(ctx context.Context) ([]Freeze, error) {
	rows, err := s.db.Query(ctx, `
		SELECT id, startup_id, scope, duration, reason,
		       COALESCE(actor_id::text,''), COALESCE(actor_role,''), COALESCE(request_id,''),
		       activated_at, lifted_at, COALESCE(lift_reason,''), COALESCE(lifted_by::text,'')
		FROM governance.freezes
		WHERE lifted_at IS NULL
		ORDER BY activated_at DESC
		LIMIT 500
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanFreezes(rows)
}

// History returns every freeze (active + lifted) for a single startup.
func (s *Store) History(ctx context.Context, startupID string) ([]Freeze, error) {
	rows, err := s.db.Query(ctx, `
		SELECT id, startup_id, scope, duration, reason,
		       COALESCE(actor_id::text,''), COALESCE(actor_role,''), COALESCE(request_id,''),
		       activated_at, lifted_at, COALESCE(lift_reason,''), COALESCE(lifted_by::text,'')
		FROM governance.freezes
		WHERE startup_id = $1
		ORDER BY activated_at DESC
	`, startupID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanFreezes(rows)
}

func scanFreezes(rows pgx.Rows) ([]Freeze, error) {
	out := []Freeze{}
	for rows.Next() {
		var f Freeze
		if err := rows.Scan(
			&f.ID, &f.StartupID, &f.Scope, &f.Duration, &f.Reason,
			&f.ActorID, &f.ActorRole, &f.RequestID,
			&f.ActivatedAt, &f.LiftedAt, &f.LiftReason, &f.LiftedBy,
		); err != nil {
			return nil, err
		}
		out = append(out, f)
	}
	return out, rows.Err()
}

// isUniqueViolation reports whether err is a Postgres unique-constraint
// violation (SQLSTATE 23505). Used to map the partial unique index on
// "one active freeze per startup" to a domain error.
func isUniqueViolation(err error) bool {
	type sqlStater interface{ SQLState() string }
	var s sqlStater
	if errors.As(err, &s) {
		return s.SQLState() == "23505"
	}
	return false
}

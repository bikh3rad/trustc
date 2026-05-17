// Package store handles admin.system_settings persistence.
//
// There is exactly one row (id=1). PATCH semantics: any field omitted from
// the request keeps its prior value.
package store

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	sharederrs "github.com/trustc/trustc/services/shared/errs"
)

type Settings struct {
	RegistrationEnabled     bool      `json:"registration_enabled"`
	RequireApprovalForRoles []string  `json:"require_approval_for_roles"`
	TwoFactorRequired       bool      `json:"two_factor_required"`
	AuditRetentionDays      int       `json:"audit_retention_days"`
	MaxFreezeOverrideHours  int       `json:"max_freeze_override_hours"`
	UpdatedAt               time.Time `json:"updated_at"`
}

type Store struct{ db *pgxpool.Pool }

func New(db *pgxpool.Pool) *Store { return &Store{db: db} }

func (s *Store) Get(ctx context.Context) (*Settings, error) {
	var out Settings
	var rolesRaw []byte
	err := s.db.QueryRow(ctx, `
		SELECT registration_enabled, require_approval_for_roles,
		       two_factor_required, audit_retention_days, max_freeze_override_hours,
		       updated_at
		FROM admin.system_settings WHERE id = 1
	`).Scan(&out.RegistrationEnabled, &rolesRaw,
		&out.TwoFactorRequired, &out.AuditRetentionDays, &out.MaxFreezeOverrideHours,
		&out.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, sharederrs.New(sharederrs.KindNotFound, "SETTINGS_MISSING",
			"system settings row not initialized; run migrations")
	}
	if err != nil {
		return nil, fmt.Errorf("admin.store: get settings: %w", err)
	}
	if len(rolesRaw) > 0 {
		_ = json.Unmarshal(rolesRaw, &out.RequireApprovalForRoles)
	}
	return &out, nil
}

// Patch updates only the fields with non-nil pointers. Returns the row after update.
type Patch struct {
	RegistrationEnabled     *bool     `json:"registration_enabled,omitempty"`
	RequireApprovalForRoles *[]string `json:"require_approval_for_roles,omitempty"`
	TwoFactorRequired       *bool     `json:"two_factor_required,omitempty"`
	AuditRetentionDays      *int      `json:"audit_retention_days,omitempty"`
	MaxFreezeOverrideHours  *int      `json:"max_freeze_override_hours,omitempty"`
}

func (s *Store) Patch(ctx context.Context, p Patch, actor string) (*Settings, error) {
	var rolesJSON []byte
	if p.RequireApprovalForRoles != nil {
		b, err := json.Marshal(*p.RequireApprovalForRoles)
		if err != nil {
			return nil, sharederrs.Wrap(sharederrs.KindBadRequest, "BAD_ROLES",
				"could not encode roles", err)
		}
		rolesJSON = b
	}
	var actorArg any
	if actor != "" {
		actorArg = actor
	}
	_, err := s.db.Exec(ctx, `
		UPDATE admin.system_settings
		SET registration_enabled       = COALESCE($1, registration_enabled),
		    require_approval_for_roles = COALESCE($2::jsonb, require_approval_for_roles),
		    two_factor_required        = COALESCE($3, two_factor_required),
		    audit_retention_days       = COALESCE($4, audit_retention_days),
		    max_freeze_override_hours  = COALESCE($5, max_freeze_override_hours),
		    updated_at                 = NOW(),
		    updated_by                 = COALESCE($6::uuid, updated_by)
		WHERE id = 1
	`, p.RegistrationEnabled, rolesJSON, p.TwoFactorRequired,
		p.AuditRetentionDays, p.MaxFreezeOverrideHours, actorArg)
	if err != nil {
		return nil, fmt.Errorf("admin.store: patch settings: %w", err)
	}
	return s.Get(ctx)
}

-- Admin service schema (CLAUDE.md §4.1 — new service for v2 admin panel).
--
-- Holds the single platform-wide settings row. Mutations go through
-- POST /v1/admin/settings and emit an audit event with actorRole=ADMIN.

CREATE SCHEMA IF NOT EXISTS admin;
SET search_path TO admin, public;

-- Singleton row (id = 1) — enforced by the CHECK constraint plus a primary key.
-- We use INT instead of UUID so the singleton invariant is trivial to express.
CREATE TABLE IF NOT EXISTS system_settings (
    id                            INT         PRIMARY KEY CHECK (id = 1),
    registration_enabled          BOOLEAN     NOT NULL DEFAULT TRUE,
    require_approval_for_roles    JSONB       NOT NULL DEFAULT '["FOUNDER","VC","AUDITOR"]'::jsonb,
    two_factor_required           BOOLEAN     NOT NULL DEFAULT FALSE,
    audit_retention_days          INT         NOT NULL DEFAULT 2555 CHECK (audit_retention_days >= 30),
    max_freeze_override_hours     INT         NOT NULL DEFAULT 72 CHECK (max_freeze_override_hours >= 0),
    updated_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by                    UUID
);

-- Seed the singleton on first migration; on re-run we keep whatever is there.
INSERT INTO system_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

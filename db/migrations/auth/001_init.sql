-- Auth service schema (CLAUDE.md §4.1 — new service for v2 auth + RBAC).
--
-- Stores accounts that can sign in to the trustC platform. Authentication
-- failures, password rotation history, and refresh tokens are out of scope
-- for the MVP; we hold only the minimum needed to issue a JWT.

CREATE SCHEMA IF NOT EXISTS auth;
SET search_path TO auth, public;

-- Roles are app-level RBAC (frontend gates + gateway gates).
-- ADMIN bypasses scope filters at the gateway. The other three are tenant-scoped.
-- Status governs whether the account can log in at all:
--   PENDING  — created but awaiting admin approval (cannot log in)
--   ACTIVE   — normal user (can log in)
--   DISABLED — admin revoked access (cannot log in)
CREATE TABLE IF NOT EXISTS users (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    email           TEXT        NOT NULL UNIQUE,
    password_hash   TEXT        NOT NULL,
    role            TEXT        NOT NULL
                                CHECK (role IN ('ADMIN','FOUNDER','VC','AUDITOR')),
    status          TEXT        NOT NULL DEFAULT 'PENDING'
                                CHECK (status IN ('PENDING','ACTIVE','DISABLED')),
    name            TEXT        NOT NULL,
    company         TEXT,
    -- Founder accounts are tied to a single startup row. We store the FK as
    -- a UUID without a REFERENCES constraint because the startups table lives
    -- in another service's schema (CLAUDE.md §11 forbids cross-schema FKs).
    startup_id      UUID,
    joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login      TIMESTAMPTZ,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_status     ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_role       ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_startup_id ON users(startup_id) WHERE startup_id IS NOT NULL;

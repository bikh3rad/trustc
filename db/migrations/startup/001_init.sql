-- Startup service schema
-- Implements form contract st_form_001 from CLAUDE.md §8.1.

SET search_path TO startup, public;

CREATE TABLE IF NOT EXISTS startups (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    vc_id           UUID        NOT NULL,
    startup_name    TEXT        NOT NULL,
    legal_name      TEXT        NOT NULL,
    industry        TEXT        NOT NULL,
    country         TEXT        NOT NULL,
    tax_id          TEXT        NOT NULL,
    status          TEXT        NOT NULL DEFAULT 'ACTIVE'
                                CHECK (status IN ('ACTIVE','FROZEN','SUSPENDED','CLOSED')),
    credit_score    INTEGER     NOT NULL DEFAULT 50 CHECK (credit_score BETWEEN 0 AND 100),
    burn_rate_cents BIGINT      NOT NULL DEFAULT 0,
    risk_level      TEXT        NOT NULL DEFAULT 'MEDIUM'
                                CHECK (risk_level IN ('LOW','MEDIUM','HIGH','CRITICAL')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_startups_vc        ON startups(vc_id);
CREATE INDEX IF NOT EXISTS idx_startups_status    ON startups(status);

CREATE TABLE IF NOT EXISTS founders (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    startup_id      UUID        NOT NULL REFERENCES startups(id) ON DELETE CASCADE,
    founder_name    TEXT        NOT NULL,
    email           TEXT        NOT NULL,
    phone           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_founders_startup ON founders(startup_id);

CREATE TABLE IF NOT EXISTS bank_details (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    startup_id      UUID        NOT NULL REFERENCES startups(id) ON DELETE CASCADE,
    bank_account    TEXT        NOT NULL,
    bank_name       TEXT,
    is_primary      BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bank_details_startup ON bank_details(startup_id);

-- VCs live here too (separate table) for Phase 1; portfolio-service split comes later.
CREATE TABLE IF NOT EXISTS vcs (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT        NOT NULL,
    aum_cents       BIGINT      NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

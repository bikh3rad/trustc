-- Governance service schema
-- Freeze / kill-switch enforcement per CLAUDE.md §6 (Core System Rules) and §4.2 #8.
-- Form contract: CLAUDE.md §8.5 (frz_form_005).
--
-- A freeze is an active record (lifted_at IS NULL) that blocks downstream
-- procurement transitions for the affected startup. Lifting sets lifted_at
-- but never deletes — history is part of the compliance trail.

SET search_path TO governance, public;

CREATE TABLE IF NOT EXISTS freezes (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    startup_id      UUID        NOT NULL,
    scope           TEXT        NOT NULL CHECK (scope    IN ('FULL','PARTIAL')),
    duration        TEXT        NOT NULL CHECK (duration IN ('TEMPORARY','PERMANENT')),
    reason          TEXT        NOT NULL,
    actor_id        UUID,
    actor_role      TEXT,
    request_id      TEXT,
    activated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    lifted_at       TIMESTAMPTZ,
    lift_reason     TEXT,
    lifted_by       UUID
);

-- One active freeze per startup at a time. Multiple historical lifted rows are fine.
CREATE UNIQUE INDEX IF NOT EXISTS uq_freeze_active_per_startup
    ON freezes(startup_id) WHERE lifted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_freezes_startup ON freezes(startup_id);
CREATE INDEX IF NOT EXISTS idx_freezes_active  ON freezes(startup_id) WHERE lifted_at IS NULL;

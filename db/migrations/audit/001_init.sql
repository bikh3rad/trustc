-- Audit service schema — immutable, SHA-256 chained event log.
-- Implements the PRD §12 contract. Every state transition in the system
-- writes one row here; the row is then signed by hashing
--   (prev_hash || canonical_payload)
-- producing a tamper-evident chain.

SET search_path TO audit, public;

CREATE TABLE IF NOT EXISTS audit_logs (
    id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id              TEXT        NOT NULL UNIQUE,
    actor_id              UUID,
    actor_role            TEXT,
    service               TEXT        NOT NULL,         -- emitting service name
    event_type            TEXT        NOT NULL,         -- e.g. ProcurementApproved
    request_id            TEXT,                          -- distributed trace id
    subject_type          TEXT,                          -- e.g. procurement_request
    subject_id            TEXT,
    previous_state        TEXT,
    new_state             TEXT,
    linked_transaction_id TEXT,                          -- ledger transaction_id
    network_ip            INET,
    network_user_agent    TEXT,
    payload               JSONB       NOT NULL,
    previous_hash         TEXT,                          -- previous row's signature
    signature             TEXT        NOT NULL,         -- sha256(prev_hash || canonical_payload)
    recorded_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- seq is the canonical chain order. BIGSERIAL → strictly increasing.
    seq                   BIGSERIAL   NOT NULL UNIQUE
);

CREATE INDEX IF NOT EXISTS idx_audit_subject ON audit_logs(subject_type, subject_id);
CREATE INDEX IF NOT EXISTS idx_audit_type    ON audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_actor   ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_time    ON audit_logs(recorded_at);

-- Append-only enforcement.
CREATE OR REPLACE FUNCTION audit.forbid_mutation()
RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'audit.audit_logs is append-only (attempted %)', TG_OP;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_immutable ON audit_logs;
CREATE TRIGGER trg_audit_immutable
    BEFORE UPDATE OR DELETE OR TRUNCATE ON audit_logs
    FOR EACH STATEMENT EXECUTE FUNCTION audit.forbid_mutation();

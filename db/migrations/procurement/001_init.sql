-- Procurement service schema
-- Implements pr_form_002 (CLAUDE.md §8.2) and the 8-state FSM from PRD §10.1.

SET search_path TO procurement, public;

CREATE TABLE IF NOT EXISTS procurement_requests (
    id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    startup_id             UUID        NOT NULL,
    title                  TEXT        NOT NULL,
    supplier_name          TEXT        NOT NULL,
    supplier_id            UUID,
    amount_cents           BIGINT      NOT NULL CHECK (amount_cents > 0),
    currency               TEXT        NOT NULL DEFAULT 'USD' CHECK (length(currency) = 3),
    category               TEXT        NOT NULL,
    priority               TEXT        NOT NULL DEFAULT 'MEDIUM'
                                       CHECK (priority IN ('LOW','MEDIUM','HIGH')),
    invoice_id             UUID,
    invoice_number         TEXT,
    description            TEXT,
    operational_reason     TEXT,
    department             TEXT,
    budget_category        TEXT,
    project_reference      UUID,
    expected_delivery_date DATE,

    -- FSM state. Allowed values come from PRD §10.1.
    state                  TEXT        NOT NULL DEFAULT 'DRAFT'
                                       CHECK (state IN (
                                         'DRAFT',
                                         'MANAGER_REVIEW',
                                         'FINANCIAL_VALIDATION',
                                         'ESCROW_LOCK',
                                         'SUPPLIER_DISPATCH',
                                         'DELIVERY_CONFIRMATION',
                                         'PAYMENT_RELEASE',
                                         'ACCOUNTING_FINALIZATION',
                                         'CANCELLED',
                                         'FROZEN'
                                       )),

    created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_procurement_startup ON procurement_requests(startup_id);
CREATE INDEX IF NOT EXISTS idx_procurement_state   ON procurement_requests(state);

-- Workflow transition log: every state change leaves a row here.
CREATE TABLE IF NOT EXISTS workflow_states (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    procurement_id  UUID        NOT NULL REFERENCES procurement_requests(id) ON DELETE CASCADE,
    from_state      TEXT,
    to_state        TEXT        NOT NULL,
    actor_id        UUID,
    actor_role      TEXT,
    reason          TEXT,
    request_id      TEXT,
    transitioned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflow_proc ON workflow_states(procurement_id, transitioned_at);

-- Append-only: workflow_states represents history; never mutate or drop rows.
CREATE OR REPLACE FUNCTION procurement.forbid_history_mutation()
RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'workflow_states is append-only (attempted %)', TG_OP;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_workflow_states_immutable ON workflow_states;
CREATE TRIGGER trg_workflow_states_immutable
    BEFORE UPDATE OR DELETE OR TRUNCATE ON workflow_states
    FOR EACH STATEMENT EXECUTE FUNCTION procurement.forbid_history_mutation();

-- Approval records (manager review, financial validation).
CREATE TABLE IF NOT EXISTS approvals (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    procurement_id  UUID        NOT NULL REFERENCES procurement_requests(id) ON DELETE CASCADE,
    stage           TEXT        NOT NULL
                                CHECK (stage IN ('MANAGER_REVIEW','FINANCIAL_VALIDATION')),
    approver_id     UUID        NOT NULL,
    approver_role   TEXT        NOT NULL,
    decision        TEXT        NOT NULL CHECK (decision IN ('APPROVED','REJECTED')),
    note            TEXT,
    decided_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_approvals_proc ON approvals(procurement_id);

-- Escrow service schema
-- JIT locking per PRD §10.1 (ESCROW_LOCK → PAYMENT_RELEASE).

SET search_path TO escrow, public;

CREATE TABLE IF NOT EXISTS escrow_accounts (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    startup_id      UUID        NOT NULL UNIQUE,
    balance_cents   BIGINT      NOT NULL DEFAULT 0 CHECK (balance_cents >= 0),
    locked_cents    BIGINT      NOT NULL DEFAULT 0 CHECK (locked_cents  >= 0),
    currency        TEXT        NOT NULL DEFAULT 'USD',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_locked_le_balance CHECK (locked_cents <= balance_cents)
);

CREATE TABLE IF NOT EXISTS escrow_locks (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    procurement_id  UUID        NOT NULL UNIQUE,
    account_id      UUID        NOT NULL REFERENCES escrow_accounts(id),
    amount_cents    BIGINT      NOT NULL CHECK (amount_cents > 0),
    currency        TEXT        NOT NULL DEFAULT 'USD',
    state           TEXT        NOT NULL DEFAULT 'LOCKED'
                                CHECK (state IN ('LOCKED','RELEASED','REFUNDED','CANCELLED')),
    locked_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    released_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_locks_account ON escrow_locks(account_id);
CREATE INDEX IF NOT EXISTS idx_locks_state   ON escrow_locks(state);

CREATE TABLE IF NOT EXISTS releases (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    lock_id         UUID        NOT NULL REFERENCES escrow_locks(id),
    procurement_id  UUID        NOT NULL,
    amount_cents    BIGINT      NOT NULL CHECK (amount_cents > 0),
    supplier_name   TEXT        NOT NULL,
    released_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    txn_ref         TEXT        -- bank reference, set after payout dispatch
);

CREATE INDEX IF NOT EXISTS idx_releases_proc ON releases(procurement_id);

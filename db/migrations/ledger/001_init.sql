-- Ledger service schema — financial integrity core.
-- Per CLAUDE.md §6.1 / PRD §7.2: the ledger is append-only and every
-- transaction must satisfy SUM(debits) = SUM(credits). Both invariants are
-- enforced at the database level so no application bug can violate them.

SET search_path TO ledger, public;

-- Chart of accounts. Account codes follow PRD §7.3 ("2103_FIDUCIARY_ESCROW_LIABILITY", etc).
CREATE TABLE IF NOT EXISTS accounts (
    code            TEXT        PRIMARY KEY,
    name            TEXT        NOT NULL,
    type            TEXT        NOT NULL
                                CHECK (type IN ('ASSET','LIABILITY','EQUITY','REVENUE','EXPENSE')),
    normal_side     TEXT        NOT NULL CHECK (normal_side IN ('DEBIT','CREDIT')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One journal entry per business transaction. Header row.
CREATE TABLE IF NOT EXISTS journal_entries (
    id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id         TEXT        NOT NULL UNIQUE,        -- PRD §7.3 transaction_id
    workflow_reference_id  TEXT,                                -- e.g. procurement_id
    description            TEXT,
    posted_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Cached totals — populated atomically by the ledger service inside the
    -- same TX that inserts the lines.
    total_debits_cents     BIGINT      NOT NULL CHECK (total_debits_cents  >= 0),
    total_credits_cents    BIGINT      NOT NULL CHECK (total_credits_cents >= 0),
    CONSTRAINT chk_balanced CHECK (total_debits_cents = total_credits_cents),
    CONSTRAINT chk_nonzero  CHECK (total_debits_cents > 0)
);

CREATE INDEX IF NOT EXISTS idx_entries_workflow ON journal_entries(workflow_reference_id);
CREATE INDEX IF NOT EXISTS idx_entries_posted   ON journal_entries(posted_at);

-- Individual lines (one debit OR one credit per row).
CREATE TABLE IF NOT EXISTS journal_lines (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_id        UUID        NOT NULL REFERENCES journal_entries(id),
    account_code    TEXT        NOT NULL REFERENCES accounts(code),
    side            TEXT        NOT NULL CHECK (side IN ('DEBIT','CREDIT')),
    amount_cents    BIGINT      NOT NULL CHECK (amount_cents > 0),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lines_entry   ON journal_lines(entry_id);
CREATE INDEX IF NOT EXISTS idx_lines_account ON journal_lines(account_code);

-- ABSOLUTE MUTABILITY BARRIER (PRD §7.2, CLAUDE.md §6.1).
-- The ledger is append-only. UPDATE/DELETE/TRUNCATE all raise.
CREATE OR REPLACE FUNCTION ledger.forbid_mutation()
RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'ledger.% is append-only (attempted %)', TG_TABLE_NAME, TG_OP;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_journal_entries_immutable ON journal_entries;
CREATE TRIGGER trg_journal_entries_immutable
    BEFORE UPDATE OR DELETE OR TRUNCATE ON journal_entries
    FOR EACH STATEMENT EXECUTE FUNCTION ledger.forbid_mutation();

DROP TRIGGER IF EXISTS trg_journal_lines_immutable ON journal_lines;
CREATE TRIGGER trg_journal_lines_immutable
    BEFORE UPDATE OR DELETE OR TRUNCATE ON journal_lines
    FOR EACH STATEMENT EXECUTE FUNCTION ledger.forbid_mutation();

-- Convenience view: live balance per account.
CREATE OR REPLACE VIEW ledger.account_balances AS
SELECT
    a.code,
    a.name,
    a.type,
    a.normal_side,
    COALESCE(SUM(CASE WHEN l.side = 'DEBIT'  THEN l.amount_cents ELSE 0 END), 0) AS debits_cents,
    COALESCE(SUM(CASE WHEN l.side = 'CREDIT' THEN l.amount_cents ELSE 0 END), 0) AS credits_cents,
    CASE
        WHEN a.normal_side = 'DEBIT'  THEN COALESCE(SUM(CASE WHEN l.side='DEBIT'  THEN l.amount_cents ELSE -l.amount_cents END), 0)
        ELSE                                COALESCE(SUM(CASE WHEN l.side='CREDIT' THEN l.amount_cents ELSE -l.amount_cents END), 0)
    END AS balance_cents
FROM accounts a
LEFT JOIN journal_lines l ON l.account_code = a.code
GROUP BY a.code, a.name, a.type, a.normal_side;

-- Seed the chart of accounts. Codes mirror PRD §7.3 examples.
INSERT INTO accounts (code, name, type, normal_side) VALUES
    ('1101_CASH_OPERATING',           'Operating cash',                 'ASSET',     'DEBIT'),
    ('1102_BANK_PLATFORM',            'Platform bank account',          'ASSET',     'DEBIT'),
    ('1103_ESCROW_BANK',              'Escrow bank account (fiduciary)','ASSET',     'DEBIT'),
    ('1104_SUPPLIER_PAYABLE_CLEARING','Supplier payable clearing',      'ASSET',     'DEBIT'),
    ('1201_ACCOUNTS_RECEIVABLE',      'Accounts receivable',            'ASSET',     'DEBIT'),
    ('2103_FIDUCIARY_ESCROW_LIABILITY','Fiduciary escrow liability',    'LIABILITY', 'CREDIT'),
    ('2201_SUPPLIER_PAYABLE',         'Supplier payable',               'LIABILITY', 'CREDIT'),
    ('3101_EQUITY_VC_CAPITAL',        'VC capital contributions',       'EQUITY',    'CREDIT'),
    ('4101_REVENUE_SERVICES',         'Service revenue',                'REVENUE',   'CREDIT'),
    ('5101_EXPENSE_INFRA',            'Infrastructure expense',         'EXPENSE',   'DEBIT'),
    ('5102_EXPENSE_PAYROLL',          'Payroll expense',                'EXPENSE',   'DEBIT'),
    ('5103_EXPENSE_GENERAL',          'General operating expense',      'EXPENSE',   'DEBIT')
ON CONFLICT (code) DO NOTHING;

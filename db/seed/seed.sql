-- trustC MVP seed dataset
-- Per CLAUDE.md §13: 1 VC ("trustC Ventures") + 10 startups with
-- consistent financial relationships (no orphan records).
--
-- Idempotent: ON CONFLICT DO NOTHING everywhere so re-running is safe.

BEGIN;

-- --------------------------------------------------------------------------
-- 1) VC
-- --------------------------------------------------------------------------
INSERT INTO startup.vcs (id, name, aum_cents)
VALUES ('00000000-0000-0000-0000-000000000001', 'trustC Ventures', 10000000 * 100)
ON CONFLICT (id) DO NOTHING;

-- --------------------------------------------------------------------------
-- 2) 10 startups, linked to the VC, with realistic distributions.
-- --------------------------------------------------------------------------
INSERT INTO startup.startups (
    id, vc_id, startup_name, legal_name, industry, country, tax_id,
    status, credit_score, burn_rate_cents, risk_level
) VALUES
    ('11111111-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
        'AlphaTech', 'AlphaTech Co.', 'SaaS', 'Iran', 'IR-1001',
        'ACTIVE', 78, 1200000, 'MEDIUM'),
    ('11111111-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001',
        'BetaFlow', 'BetaFlow Ltd.', 'Fintech', 'Iran', 'IR-1002',
        'ACTIVE', 82, 1800000, 'MEDIUM'),
    ('11111111-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001',
        'GammaLogix', 'GammaLogix Pvt.', 'Logistics', 'UAE', 'AE-1003',
        'ACTIVE', 65, 2200000, 'HIGH'),
    ('11111111-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001',
        'DeltaMed', 'DeltaMed JSC', 'Healthtech', 'Iran', 'IR-1004',
        'ACTIVE', 71, 1450000, 'MEDIUM'),
    ('11111111-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001',
        'EpsilonAI', 'EpsilonAI Inc.', 'AI/ML', 'USA', 'US-1005',
        'ACTIVE', 88, 2700000, 'LOW'),
    ('11111111-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001',
        'ZetaPay', 'ZetaPay LLC', 'Fintech', 'Iran', 'IR-1006',
        'ACTIVE', 74, 1600000, 'MEDIUM'),
    ('11111111-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001',
        'EtaRobot', 'EtaRobot GmbH', 'Robotics', 'Germany', 'DE-1007',
        'ACTIVE', 69, 1900000, 'HIGH'),
    ('11111111-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001',
        'ThetaSec', 'ThetaSec Co.', 'CyberSec', 'Iran', 'IR-1008',
        'ACTIVE', 80, 1350000, 'LOW'),
    ('11111111-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000001',
        'IotaGrid', 'IotaGrid SA', 'EnergyTech', 'Iran', 'IR-1009',
        'ACTIVE', 62, 2400000, 'HIGH'),
    ('11111111-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-000000000001',
        'KappaCloud', 'KappaCloud Inc.', 'Infrastructure', 'USA', 'US-1010',
        'ACTIVE', 85, 2100000, 'LOW')
ON CONFLICT (id) DO NOTHING;

-- --------------------------------------------------------------------------
-- 3) Founders + bank details, one per startup.
-- --------------------------------------------------------------------------
INSERT INTO startup.founders (startup_id, founder_name, email, phone)
SELECT id, startup_name || ' Founder', lower(replace(startup_name,' ','')) || '@example.com', '+98-21-555-' || lpad((row_number() OVER ())::text, 4, '0')
FROM startup.startups
ON CONFLICT DO NOTHING;

INSERT INTO startup.bank_details (startup_id, bank_account, bank_name, is_primary)
SELECT id, 'ACC-' || substring(id::text from 1 for 8), 'Bank Mellat', TRUE
FROM startup.startups
ON CONFLICT DO NOTHING;

-- --------------------------------------------------------------------------
-- 4) Escrow accounts pre-funded for each startup (realistic distribution).
--    Balances range $30k - $120k. Cash on the platform fiduciary side.
-- --------------------------------------------------------------------------
INSERT INTO escrow.escrow_accounts (startup_id, balance_cents, locked_cents, currency)
VALUES
    ('11111111-0000-0000-0000-000000000001', 4500000,        0, 'USD'),  -- AlphaTech
    ('11111111-0000-0000-0000-000000000002', 7200000,        0, 'USD'),  -- BetaFlow
    ('11111111-0000-0000-0000-000000000003', 3100000,        0, 'USD'),  -- GammaLogix
    ('11111111-0000-0000-0000-000000000004', 5500000,        0, 'USD'),  -- DeltaMed
    ('11111111-0000-0000-0000-000000000005', 11800000,       0, 'USD'),  -- EpsilonAI
    ('11111111-0000-0000-0000-000000000006', 4800000,        0, 'USD'),  -- ZetaPay
    ('11111111-0000-0000-0000-000000000007', 6100000,        0, 'USD'),  -- EtaRobot
    ('11111111-0000-0000-0000-000000000008', 5200000,        0, 'USD'),  -- ThetaSec
    ('11111111-0000-0000-0000-000000000009', 3000000,        0, 'USD'),  -- IotaGrid
    ('11111111-0000-0000-0000-00000000000a', 9500000,        0, 'USD')   -- KappaCloud
ON CONFLICT (startup_id) DO NOTHING;

-- --------------------------------------------------------------------------
-- 5) Mirror the funded escrow on the ledger as a single seed journal entry
--    so the books match the escrow balances from inception.
--      DR 1103_ESCROW_BANK              total escrow funded
--      CR 3101_EQUITY_VC_CAPITAL        VC contributed capital
-- --------------------------------------------------------------------------
WITH totals AS (
    SELECT COALESCE(SUM(balance_cents), 0) AS total FROM escrow.escrow_accounts
), entry AS (
    INSERT INTO ledger.journal_entries
        (transaction_id, workflow_reference_id, description,
         total_debits_cents, total_credits_cents)
    SELECT 'txn_seed_vc_funding', 'seed', 'Initial VC capital deposited into escrow', total, total
    FROM totals
    WHERE total > 0
    ON CONFLICT (transaction_id) DO NOTHING
    RETURNING id, total_debits_cents
)
INSERT INTO ledger.journal_lines (entry_id, account_code, side, amount_cents)
SELECT id, '1103_ESCROW_BANK',         'DEBIT',  total_debits_cents FROM entry
UNION ALL
SELECT id, '3101_EQUITY_VC_CAPITAL',   'CREDIT', total_debits_cents FROM entry;

-- --------------------------------------------------------------------------
-- 6) Two sample procurement requests (DRAFT) per startup-1 to demo the FSM.
-- --------------------------------------------------------------------------
INSERT INTO procurement.procurement_requests (
    id, startup_id, title, supplier_name, amount_cents, currency, category, priority,
    description, operational_reason, department, budget_category, state
) VALUES
    ('22222222-0000-0000-0000-000000000001',
        '11111111-0000-0000-0000-000000000001',
        'Cloud Infrastructure Renewal', 'AWS Inc.', 480000, 'USD', 'SERVICE', 'HIGH',
        'Annual production cluster renewal',
        'Production infra auto-scale cluster node renewal',
        'ENGINEERING', 'INFRASTRUCTURE', 'DRAFT'),
    ('22222222-0000-0000-0000-000000000002',
        '11111111-0000-0000-0000-000000000002',
        'Compliance Audit Services', 'PwC LLP', 1200000, 'USD', 'SERVICE', 'MEDIUM',
        'Annual SOC2 audit',
        'Regulatory requirement: SOC2 type-II renewal',
        'FINANCE', 'COMPLIANCE', 'DRAFT')
ON CONFLICT (id) DO NOTHING;

-- Record the initial DRAFT entry for each seeded procurement (FSM history).
INSERT INTO procurement.workflow_states (procurement_id, from_state, to_state, actor_role)
SELECT id, NULL, 'DRAFT', 'SEED'
FROM procurement.procurement_requests
WHERE id IN ('22222222-0000-0000-0000-000000000001',
             '22222222-0000-0000-0000-000000000002')
ON CONFLICT DO NOTHING;

-- --------------------------------------------------------------------------
-- 7) Auth users — demo accounts matching hi-fi/src/data.js (v2 auth).
--
--    All four ACTIVE accounts share the same bcrypt(cost=12) hash for the
--    password "demo1234" — bcrypt's salt is embedded in the hash, so a single
--    hash works for every user. NEVER reuse a shared password in production.
--
--    The two PENDING founders (beta, gamma) demonstrate the admin approval
--    flow: they cannot log in until /v1/admin/users/{id}/approve is called.
-- --------------------------------------------------------------------------
INSERT INTO auth.users (id, email, password_hash, role, status, name, company, startup_id)
VALUES
    ('aaaaaaaa-0000-0000-0000-000000000001', 'admin@trustc.io',
        '$2a$12$IaE6Fz4n8R7t37GzLJKo4.W9JCC4zQk6VQ/Pt3boqVJEhkWZCu6kO',
        'ADMIN',   'ACTIVE',  'مدیر سیستم',       'trustC',                           NULL),
    ('aaaaaaaa-0000-0000-0000-000000000002', 'founder@alpha.io',
        '$2a$12$IaE6Fz4n8R7t37GzLJKo4.W9JCC4zQk6VQ/Pt3boqVJEhkWZCu6kO',
        'FOUNDER', 'ACTIVE',  'بنیان‌گذار آلفا',   'شرکت آلفا',                        '11111111-0000-0000-0000-000000000001'),
    ('aaaaaaaa-0000-0000-0000-000000000003', 'vc@trustc.io',
        '$2a$12$IaE6Fz4n8R7t37GzLJKo4.W9JCC4zQk6VQ/Pt3boqVJEhkWZCu6kO',
        'VC',      'ACTIVE',  'مدیر صندوق',       'صندوق سرمایه‌گذاری trustC',          NULL),
    ('aaaaaaaa-0000-0000-0000-000000000004', 'auditor@trustc.io',
        '$2a$12$IaE6Fz4n8R7t37GzLJKo4.W9JCC4zQk6VQ/Pt3boqVJEhkWZCu6kO',
        'AUDITOR', 'ACTIVE',  'حسابرس مستقل',     'مؤسسه حسابرسی مودیان',              NULL),
    ('aaaaaaaa-0000-0000-0000-000000000005', 'founder@beta.io',
        '$2a$12$IaE6Fz4n8R7t37GzLJKo4.W9JCC4zQk6VQ/Pt3boqVJEhkWZCu6kO',
        'FOUNDER', 'PENDING', 'بنیان‌گذار بتا',    'BetaFlow',                          '11111111-0000-0000-0000-000000000002'),
    ('aaaaaaaa-0000-0000-0000-000000000006', 'founder@gamma.io',
        '$2a$12$IaE6Fz4n8R7t37GzLJKo4.W9JCC4zQk6VQ/Pt3boqVJEhkWZCu6kO',
        'FOUNDER', 'PENDING', 'بنیان‌گذار گاما',   'GammaLogix',                        '11111111-0000-0000-0000-000000000003')
ON CONFLICT (email) DO NOTHING;

COMMIT;

-- Diagnostic summary.
\echo '--- SEED SUMMARY ---'
SELECT (SELECT COUNT(*) FROM startup.vcs)               AS vcs,
       (SELECT COUNT(*) FROM startup.startups)          AS startups,
       (SELECT COUNT(*) FROM escrow.escrow_accounts)    AS escrow_accounts,
       (SELECT COUNT(*) FROM ledger.journal_entries)    AS journal_entries,
       (SELECT COUNT(*) FROM procurement.procurement_requests) AS procurements,
       (SELECT COUNT(*) FROM auth.users)                AS users,
       (SELECT COUNT(*) FROM auth.users WHERE status='PENDING') AS users_pending;

-- trustC MVP seed dataset
-- Per CLAUDE.md §13: 1 VC ("trustC Ventures") + 10 startups with
-- consistent financial relationships (no orphan records).
--
-- Portfolio: 10 well-known affiliates of بنیاد مستضعفان (Mostazafan Foundation
-- holding). Each company has an exclusive founder login. Credentials live
-- alongside this file in db/seed/credentials.md — DEMO ONLY.
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
-- 2) 10 Mostazafan-affiliated portfolio companies, linked to the VC.
--    Codes (used to derive emails + passwords):
--      SINA, BEHRAN, BIDC, KAVIR, ALBORZ, IRALCO, SIMAN, PARSIAN, VALFAJR, PAXAN
-- --------------------------------------------------------------------------
INSERT INTO startup.startups (
    id, vc_id, startup_name, legal_name, industry, country, tax_id,
    status, credit_score, burn_rate_cents, risk_level
) VALUES
    ('11111111-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
        'صنایع غذایی سینا', 'شرکت صنایع غذایی سینا (سهامی عام)',
        'صنایع غذایی', 'Iran', 'IR-SINA-1001',
        'ACTIVE', 78, 1800000, 'MEDIUM'),
    ('11111111-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001',
        'نفت بهران', 'شرکت نفت بهران (سهامی عام)',
        'روان‌کارها و مشتقات نفتی', 'Iran', 'IR-BHRN-1002',
        'ACTIVE', 84, 2400000, 'LOW'),
    ('11111111-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001',
        'توسعه صنایع بهشهر', 'شرکت توسعه صنایع بهشهر (سهامی عام)',
        'هلدینگ صنعتی', 'Iran', 'IR-BIDC-1003',
        'ACTIVE', 80, 2100000, 'MEDIUM'),
    ('11111111-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001',
        'کویر تایر', 'شرکت لاستیک کویر تایر (سهامی عام)',
        'لاستیک و پلیمر', 'Iran', 'IR-KVT-1004',
        'ACTIVE', 71, 1600000, 'MEDIUM'),
    ('11111111-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001',
        'سرمایه‌گذاری البرز', 'شرکت سرمایه‌گذاری البرز (سهامی عام)',
        'سرمایه‌گذاری دارویی', 'Iran', 'IR-ALBZ-1005',
        'ACTIVE', 88, 1900000, 'LOW'),
    ('11111111-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001',
        'آلومینیوم ایران', 'شرکت آلومینیوم ایران - ایرالکو (سهامی عام)',
        'فلزات اساسی', 'Iran', 'IR-IRAL-1006',
        'ACTIVE', 82, 2800000, 'LOW'),
    ('11111111-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001',
        'سیمان فارس و خوزستان', 'شرکت سیمان فارس و خوزستان (سهامی عام)',
        'سیمان و مصالح ساختمانی', 'Iran', 'IR-FKHS-1007',
        'ACTIVE', 74, 2200000, 'MEDIUM'),
    ('11111111-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001',
        'هتل‌های بین‌المللی پارسیان', 'شرکت هتل‌های بین‌المللی پارسیان (سهامی عام)',
        'هتل‌داری و گردشگری', 'Iran', 'IR-PARS-1008',
        'ACTIVE', 66, 1400000, 'HIGH'),
    ('11111111-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000001',
        'کشتیرانی والفجر', 'شرکت کشتیرانی والفجر (سهامی عام)',
        'حمل و نقل دریایی', 'Iran', 'IR-VLFJ-1009',
        'ACTIVE', 69, 2000000, 'HIGH'),
    ('11111111-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-000000000001',
        'پاکسان', 'شرکت پاکسان (سهامی عام)',
        'شوینده و بهداشتی', 'Iran', 'IR-PXSN-1010',
        'ACTIVE', 77, 1500000, 'MEDIUM')
ON CONFLICT (id) DO NOTHING;

-- --------------------------------------------------------------------------
-- 3) Founders + bank details, one per startup.
--    Emails are derived from each company's code to keep them exclusive.
-- --------------------------------------------------------------------------
INSERT INTO startup.founders (startup_id, founder_name, email, phone) VALUES
    ('11111111-0000-0000-0000-000000000001', 'حسین کریمی',     'founder@sina.trustc.io',    '+98-21-555-0001'),
    ('11111111-0000-0000-0000-000000000002', 'رضا اسدی',        'founder@behran.trustc.io',  '+98-21-555-0002'),
    ('11111111-0000-0000-0000-000000000003', 'محمدرضا فلاح',    'founder@bidc.trustc.io',    '+98-21-555-0003'),
    ('11111111-0000-0000-0000-000000000004', 'علی اکبری',       'founder@kavir.trustc.io',   '+98-21-555-0004'),
    ('11111111-0000-0000-0000-000000000005', 'مریم نوروزی',     'founder@alborz.trustc.io',  '+98-21-555-0005'),
    ('11111111-0000-0000-0000-000000000006', 'سعید قاسمی',      'founder@iralco.trustc.io',  '+98-21-555-0006'),
    ('11111111-0000-0000-0000-000000000007', 'مهدی محمدی',      'founder@siman.trustc.io',   '+98-21-555-0007'),
    ('11111111-0000-0000-0000-000000000008', 'فاطمه صادقی',     'founder@parsian.trustc.io', '+98-21-555-0008'),
    ('11111111-0000-0000-0000-000000000009', 'احمد حسینی',      'founder@valfajr.trustc.io', '+98-21-555-0009'),
    ('11111111-0000-0000-0000-00000000000a', 'زهرا رحیمی',      'founder@paxan.trustc.io',   '+98-21-555-0010')
ON CONFLICT DO NOTHING;

INSERT INTO startup.bank_details (startup_id, bank_account, bank_name, is_primary) VALUES
    ('11111111-0000-0000-0000-000000000001', 'IR-SINA-6037-0011',    'بانک ملت',     TRUE),
    ('11111111-0000-0000-0000-000000000002', 'IR-BHRN-6274-0022',    'بانک صادرات',  TRUE),
    ('11111111-0000-0000-0000-000000000003', 'IR-BIDC-5022-0033',    'بانک پارسیان', TRUE),
    ('11111111-0000-0000-0000-000000000004', 'IR-KVT-5859-0044',     'بانک تجارت',   TRUE),
    ('11111111-0000-0000-0000-000000000005', 'IR-ALBZ-6104-0055',    'بانک ملت',     TRUE),
    ('11111111-0000-0000-0000-000000000006', 'IR-IRAL-5859-0066',    'بانک سپه',     TRUE),
    ('11111111-0000-0000-0000-000000000007', 'IR-FKHS-6273-0077',    'بانک سامان',   TRUE),
    ('11111111-0000-0000-0000-000000000008', 'IR-PARS-5022-0088',    'بانک پارسیان', TRUE),
    ('11111111-0000-0000-0000-000000000009', 'IR-VLFJ-6037-0099',    'بانک ملت',     TRUE),
    ('11111111-0000-0000-0000-00000000000a', 'IR-PXSN-5859-0100',    'بانک تجارت',   TRUE)
ON CONFLICT DO NOTHING;

-- --------------------------------------------------------------------------
-- 4) Escrow accounts pre-funded for each startup (realistic distribution).
--    Balances range $32k - $114k. Cash on the platform fiduciary side.
-- --------------------------------------------------------------------------
INSERT INTO escrow.escrow_accounts (startup_id, balance_cents, locked_cents, currency)
VALUES
    ('11111111-0000-0000-0000-000000000001',  5800000, 0, 'USD'),  -- صنایع غذایی سینا
    ('11111111-0000-0000-0000-000000000002',  9200000, 0, 'USD'),  -- نفت بهران
    ('11111111-0000-0000-0000-000000000003',  7500000, 0, 'USD'),  -- توسعه صنایع بهشهر
    ('11111111-0000-0000-0000-000000000004',  4100000, 0, 'USD'),  -- کویر تایر
    ('11111111-0000-0000-0000-000000000005', 11400000, 0, 'USD'),  -- سرمایه‌گذاری البرز
    ('11111111-0000-0000-0000-000000000006', 10300000, 0, 'USD'),  -- آلومینیوم ایران
    ('11111111-0000-0000-0000-000000000007',  6700000, 0, 'USD'),  -- سیمان فارس و خوزستان
    ('11111111-0000-0000-0000-000000000008',  3200000, 0, 'USD'),  -- هتل‌های پارسیان
    ('11111111-0000-0000-0000-000000000009',  3800000, 0, 'USD'),  -- کشتیرانی والفجر
    ('11111111-0000-0000-0000-00000000000a',  5500000, 0, 'USD')   -- پاکسان
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
-- 6) Two sample procurement requests (DRAFT) demonstrating the FSM.
-- --------------------------------------------------------------------------
INSERT INTO procurement.procurement_requests (
    id, startup_id, title, supplier_name, amount_cents, currency, category, priority,
    description, operational_reason, department, budget_category, state
) VALUES
    ('22222222-0000-0000-0000-000000000001',
        '11111111-0000-0000-0000-000000000001',
        'Aseptic Packaging Line Renewal', 'Tetra Pak Middle East', 480000, 'USD', 'EQUIPMENT', 'HIGH',
        'Annual milk-line aseptic filling unit maintenance kit',
        'Q3 production line scheduled maintenance — مجوز فنی #SINA-2026-04',
        'PRODUCTION', 'EQUIPMENT', 'DRAFT'),
    ('22222222-0000-0000-0000-000000000002',
        '11111111-0000-0000-0000-000000000002',
        'Annual Financial Audit', 'Mofid Rahbar Audit Co.', 1200000, 'USD', 'SERVICE', 'MEDIUM',
        'Annual statutory audit of consolidated accounts',
        'Regulatory: Tehran Stock Exchange disclosure requirement (1405)',
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
-- 7) Auth users — exclusive credentials per company.
--
--    Pattern: password = "<code-lowercase>@trustc-2026"
--      e.g. founder@sina.trustc.io / sina@trustc-2026
--    Bcrypt(cost=12) hashes were generated per password — each row has its
--    OWN salt+hash, so no two accounts share secrets. See credentials.md.
--
--    Two founders (PARSIAN, PAXAN) are PENDING to keep the admin-approval
--    demo flow intact (/v1/admin/users/{id}/approve).
-- --------------------------------------------------------------------------
INSERT INTO auth.users (id, email, password_hash, role, status, name, company, startup_id)
VALUES
    -- ---------- platform-level accounts ----------
    ('aaaaaaaa-0000-0000-0000-000000000001', 'admin@trustc.io',
        '$2b$12$ZfntFUpPTMQZOwwhGrwydu2IKFKwL/iOPOzvCbxijS4yOwkY/a3JO',
        'ADMIN',   'ACTIVE',  'مدیر سیستم',     'trustC',                              NULL),
    ('aaaaaaaa-0000-0000-0000-000000000002', 'vc@trustc.io',
        '$2b$12$FzgfgaRygT/wBkHNbwpAf.mF4hkTbCckHJ0AuMDI1vKVXa2x2sYqe',
        'VC',      'ACTIVE',  'مدیر صندوق',     'صندوق سرمایه‌گذاری trustC',              NULL),
    ('aaaaaaaa-0000-0000-0000-000000000003', 'auditor@trustc.io',
        '$2b$12$G4JVPx7wvX2cBPWJrj0xm.Z8XH2yZffFvmeo6iKAlwy4uB6bnd6/i',
        'AUDITOR', 'ACTIVE',  'حسابرس مستقل',   'مؤسسه حسابرسی مفید راهبر',              NULL),

    -- ---------- 10 founder accounts, one per Mostazafan affiliate ----------
    ('aaaaaaaa-0000-0000-0000-000000000011', 'founder@sina.trustc.io',
        '$2b$12$RZfk/ooWDydqNjGL6v69buk3zDZH60AZXxNV2KtmUZc0vdR9d2VI.',
        'FOUNDER', 'ACTIVE',  'حسین کریمی',     'صنایع غذایی سینا',           '11111111-0000-0000-0000-000000000001'),
    ('aaaaaaaa-0000-0000-0000-000000000012', 'founder@behran.trustc.io',
        '$2b$12$.KtW6xjmlAmis.Gyv35vueZzscRRMyNZdClkK0Sxnmn2AO2lv9FTK',
        'FOUNDER', 'ACTIVE',  'رضا اسدی',        'نفت بهران',                  '11111111-0000-0000-0000-000000000002'),
    ('aaaaaaaa-0000-0000-0000-000000000013', 'founder@bidc.trustc.io',
        '$2b$12$aEpy7XqCls50UOvgRE91Q.TsfALhAMj65WPDOp955U4W0gWdNz0jW',
        'FOUNDER', 'ACTIVE',  'محمدرضا فلاح',    'توسعه صنایع بهشهر',          '11111111-0000-0000-0000-000000000003'),
    ('aaaaaaaa-0000-0000-0000-000000000014', 'founder@kavir.trustc.io',
        '$2b$12$VG/UjoQdORkITQ4ZWBiKRu8jiJD4phZfBx5YDGNj3nG5V35PIr1Vi',
        'FOUNDER', 'ACTIVE',  'علی اکبری',       'کویر تایر',                  '11111111-0000-0000-0000-000000000004'),
    ('aaaaaaaa-0000-0000-0000-000000000015', 'founder@alborz.trustc.io',
        '$2b$12$PuZshvTVxwt7WRIsPWPY8uDcjS0gU5MOzfnkeZVXo8EIwv/89SwDq',
        'FOUNDER', 'ACTIVE',  'مریم نوروزی',     'سرمایه‌گذاری البرز',          '11111111-0000-0000-0000-000000000005'),
    ('aaaaaaaa-0000-0000-0000-000000000016', 'founder@iralco.trustc.io',
        '$2b$12$MyNdZgVToRNrIknCwxghwOIZlP/D05/2.Mx3w63fvJm0SlYaHn8me',
        'FOUNDER', 'ACTIVE',  'سعید قاسمی',      'آلومینیوم ایران (ایرالکو)',  '11111111-0000-0000-0000-000000000006'),
    ('aaaaaaaa-0000-0000-0000-000000000017', 'founder@siman.trustc.io',
        '$2b$12$TxEwaGQzXp3GKoq/hnH9J.B2Zg94qZvZvWw69VHBVYzN4pQ1/xXh.',
        'FOUNDER', 'ACTIVE',  'مهدی محمدی',      'سیمان فارس و خوزستان',       '11111111-0000-0000-0000-000000000007'),
    ('aaaaaaaa-0000-0000-0000-000000000018', 'founder@parsian.trustc.io',
        '$2b$12$NWDEE1YjNeXse423VejSZOQ0r8VnDn0V1QVc/M06Wn9SxXXSS.5QO',
        'FOUNDER', 'PENDING', 'فاطمه صادقی',     'هتل‌های بین‌المللی پارسیان',  '11111111-0000-0000-0000-000000000008'),
    ('aaaaaaaa-0000-0000-0000-000000000019', 'founder@valfajr.trustc.io',
        '$2b$12$qGTrA6KRoDyOqZIwjxZGjuigJR3OunKM/x0/AJMn06iUS6eRL2Q3W',
        'FOUNDER', 'ACTIVE',  'احمد حسینی',      'کشتیرانی والفجر',            '11111111-0000-0000-0000-000000000009'),
    ('aaaaaaaa-0000-0000-0000-00000000001a', 'founder@paxan.trustc.io',
        '$2b$12$w7qzf6zmnaDE.4URb.X.5usBhwj1BUWLMGdMxH8VZZXHgh55idNdK',
        'FOUNDER', 'PENDING', 'زهرا رحیمی',      'پاکسان',                     '11111111-0000-0000-0000-00000000000a')
ON CONFLICT (email) DO NOTHING;

-- --------------------------------------------------------------------------
-- 8) Synthetic 6-month procurement history (~100 per company).
--    Idempotent: skips any startup that already has > 5 procurements.
--    Amounts are derived from each company's burn_rate; states are
--    distributed across the FSM with older months biased toward completion.
-- --------------------------------------------------------------------------
DO $$
DECLARE
    s          RECORD;
    i          INT;
    j          INT;
    state_idx  INT;
    bucket_idx INT;
    age        INT;
    proc_count INT;
    chosen_state TEXT;
    completed_prob NUMERIC;
    variation  NUMERIC;
    trend      NUMERIC;
    trend_mult NUMERIC;
    base_avg   BIGINT;
    amount     BIGINT;
    created_ts TIMESTAMPTZ;
    new_id     UUID;
    title_pool TEXT[];

    months TEXT[] := ARRAY[
        '2025-12','2026-01','2026-02','2026-03','2026-04','2026-05'
    ];
    states TEXT[] := ARRAY[
        'DRAFT','MANAGER_REVIEW','FINANCIAL_VALIDATION','ESCROW_LOCK',
        'SUPPLIER_DISPATCH','DELIVERY_CONFIRMATION','PAYMENT_RELEASE',
        'ACCOUNTING_FINALIZATION'
    ];
    suppliers TEXT[] := ARRAY[
        'آراز سرور','بازرگانی پارسا','خدمات فنی مهرگان','نوین تجارت ایرانیان',
        'تابان لجستیک','پویا انفورماتیک','تأمین کالای ایرانیان','بازرگانی ساحل'
    ];
    cats TEXT[] := ARRAY['EQUIPMENT','SERVICE','MATERIAL','LOGISTICS','UTILITIES'];
    prios TEXT[] := ARRAY['LOW','MEDIUM','HIGH'];
    depts TEXT[] := ARRAY['مهندسی','تأمین','عملیات','تولید','مالی','لجستیک'];
BEGIN
    -- Deterministic randomness so re-runs produce identical history.
    PERFORM setseed(0.42);

    FOR s IN
        SELECT id, tax_id, burn_rate_cents, risk_level FROM startup.startups
    LOOP
        SELECT count(*) INTO proc_count
          FROM procurement.procurement_requests WHERE startup_id = s.id;
        IF proc_count > 5 THEN CONTINUE; END IF;

        trend := CASE s.risk_level
            WHEN 'LOW'      THEN 1.045
            WHEN 'MEDIUM'   THEN 1.012
            WHEN 'HIGH'     THEN 0.978
            WHEN 'CRITICAL' THEN 0.93
            ELSE 1.0
        END;

        -- Industry-flavored title pool, picked by tax_id (each company has
        -- a unique one). Falls back to a generic pool.
        title_pool := CASE s.tax_id
            WHEN 'IR-SINA-1001' THEN ARRAY['خرید شیر خام دامداری‌ها','تجهیزات بسته‌بندی Tetra Pak','سرویس پاستوریزاسیون','افزودنی کلسیم و ویتامین','حمل سرد محصول','تست میکروبی نمونه‌ها','قرارداد سردخانه','نگه‌داری خط پرکنی']
            WHEN 'IR-BHRN-1002' THEN ARRAY['خرید روغن پایه گروه II','افزودنی API SN','بسته‌بندی فلزی روغن موتور','سرویس راکتور تقطیر','تست آزمایشگاهی','حمل تانکر','کاتالیست مس','بشکه ۲۰۰ لیتری']
            WHEN 'IR-BIDC-1003' THEN ARRAY['مواد اولیه روغن خام','حمل کانتینری بندرعباس','صابون و بهداشت فله','سرویس خط تولید','تعمیر دستگاه پرکن','پلت‌سازی برند بهار','خرید مواد بسته‌بندی']
            WHEN 'IR-KVT-1004'  THEN ARRAY['خرید لاستیک طبیعی NR-20','کربن بلک N330','سرویس قالب پخت','کابل فولادی تایر کامیون','بازرسی Vulc','افزودنی پلیمر بوتیل','حمل از بندر چابهار']
            WHEN 'IR-ALBZ-1005' THEN ARRAY['ماده مؤثره API','تجهیزات GMP استریل','بسته‌بندی آنتی‌بیوتیک','سرویس کنترل کیفی QC','کابینت ISO 5','تست BA/BE','خرید مواد جانبی']
            WHEN 'IR-IRAL-1006' THEN ARRAY['خرید آلومینا کلسینه','پودر کریولیت','الکترود کربنی پری‌بیک','نگه‌داری کوره ذوب','کنسانتره مس','آنود گرافیتی','سرویس برق صنعتی']
            WHEN 'IR-FKHS-1007' THEN ARRAY['سنگ آهک خشک','پتکوک سوخت کوره','تعمیر کوره دوار','حمل کلینکر','شارژ گلوله آسیاب','افزودنی PCE','خرید گاز طبیعی صنعتی']
            WHEN 'IR-PARS-1008' THEN ARRAY['تجهیزات اتاق مهمان','سرویس آشپزخانه هتل','لباسشویی صنعتی','مواد شوینده هتل','رزرواسیون GDS','ست ملحفه و حوله','تعمیر آسانسور']
            WHEN 'IR-VLFJ-1009' THEN ARRAY['تعمیر بدنه شناور','سوخت Bunker IFO','رنگ Antifouling','سرویس موتور MAN B&W','بازرسی ILO پرسنل','نوسازی لنگرگاه','قطعات یدکی موتور']
            WHEN 'IR-PXSN-1010' THEN ARRAY['سدیم لوریل سولفات','عطر و رایحه شوینده','بسته‌بندی پلاستیکی','تعمیر خط شوینده','تست QC مایع','افزودنی آنزیمی','خرید گلیسرین']
            ELSE ARRAY['تجدید زیرساخت ابری','سرویس پشتیبانی سرور','لپ‌تاپ تیم تولید','تجهیزات اداری','سرویس امنیت سایبری']
        END;

        base_avg := s.burn_rate_cents / 16;

        FOR i IN 1..100 LOOP
            -- Sqrt distribution gives a fair spread with mild recency bias.
            bucket_idx := LEAST(5, FLOOR(power(random(), 0.85) * 6))::INT;
            age := 5 - bucket_idx;

            completed_prob := 0.15 + age * 0.16;
            IF random() < completed_prob THEN
                chosen_state := CASE WHEN random() < 0.55
                    THEN 'ACCOUNTING_FINALIZATION'
                    ELSE 'PAYMENT_RELEASE'
                END;
            ELSE
                chosen_state := states[LEAST(6, 1 + FLOOR(age * 1.1 + random() * 2))::INT];
            END IF;

            variation   := 0.35 + random() * 1.9;
            trend_mult  := power(trend, bucket_idx);
            amount      := GREATEST(50000, ROUND(base_avg * variation * trend_mult))::BIGINT;

            created_ts := (months[bucket_idx + 1] || '-' ||
                           LPAD((FLOOR(random()*28)+1)::TEXT, 2, '0'))::TIMESTAMPTZ
                          + (FLOOR(random()*86400)::TEXT || ' seconds')::INTERVAL;

            new_id := gen_random_uuid();

            INSERT INTO procurement.procurement_requests
              (id, startup_id, title, supplier_name, amount_cents, currency,
               category, priority, description, operational_reason,
               department, budget_category, state, created_at, updated_at)
            VALUES (
                new_id, s.id,
                title_pool[FLOOR(random() * array_length(title_pool, 1)) + 1],
                suppliers[FLOOR(random() * array_length(suppliers, 1)) + 1],
                amount, 'IRR',
                cats[FLOOR(random() * array_length(cats, 1)) + 1],
                prios[FLOOR(random() * array_length(prios, 1)) + 1],
                'Auto-generated demo entry',
                'مورد نیاز برای ادامه عملیات شرکت',
                depts[FLOOR(random() * array_length(depts, 1)) + 1],
                cats[FLOOR(random() * array_length(cats, 1)) + 1],
                chosen_state, created_ts, created_ts
            );

            -- Write workflow_states up to the chosen state so FSM history
            -- is self-consistent (each transition 1 hour after the previous).
            state_idx := array_position(states, chosen_state);
            FOR j IN 1..state_idx LOOP
                INSERT INTO procurement.workflow_states
                  (procurement_id, from_state, to_state, actor_role, transitioned_at)
                VALUES (
                    new_id,
                    CASE WHEN j = 1 THEN NULL ELSE states[j-1] END,
                    states[j],
                    CASE states[j]
                        WHEN 'DRAFT'                   THEN 'OPERATOR'
                        WHEN 'MANAGER_REVIEW'          THEN 'MANAGER'
                        WHEN 'FINANCIAL_VALIDATION'    THEN 'VC'
                        WHEN 'ESCROW_LOCK'             THEN 'SYSTEM'
                        WHEN 'SUPPLIER_DISPATCH'       THEN 'SUPPLIER'
                        WHEN 'DELIVERY_CONFIRMATION'   THEN 'FOUNDER'
                        WHEN 'PAYMENT_RELEASE'         THEN 'SYSTEM'
                        ELSE 'SYSTEM'
                    END,
                    created_ts + ((j-1) || ' hours')::INTERVAL
                );
            END LOOP;
        END LOOP;
    END LOOP;
END $$;

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

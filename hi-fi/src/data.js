/* ============================================================
   trustC — Mock data
   ------------------------------------------------------------
   Realistic Iranian-context fixtures for the demo prototype.
   For Claude Code: replace these arrays with API responses
   from the corresponding microservice (see PRD §4).

   Currency: IRR (ریال). Amounts stored as plain numbers.
   ============================================================ */

window.trustcData = (function () {
  // ---------- VC (sole investor) ----------
  const vc = {
    id: "vc_001",
    name: "صندوق سرمایه‌گذاری trustC",
    aum: 4_200_000_000_000, // 4.2 هزار میلیارد ریال
    aumUsd: 10_000_000,
    portfolioCount: 10,
    activeCreditLines: 15,
  };

  // ---------- Portfolio: 10 Mostazafan-affiliated public companies ----------
  // IDs align 1:1 with backend UUIDs in db/seed/seed.sql
  //   st_001 .. st_010  ↔  11111111-…-0001 .. 11111111-…-000a
  const startups = [
    {
      id: "st_001", name: "صنایع غذایی سینا", code: "SINA",
      industry: "صنایع غذایی · لبنیات و بسته‌بندی",
      creditScore: 78, creditLine: 1_500_000_000_000,
      creditUsed: 920_000_000_000,
      escrowBalance: 318_000_000_000,
      burnRate: 56_000_000_000, runway: 16,
      monthlyRevenue: 102_000_000_000,
      risk: "medium", frozen: false,
    },
    {
      id: "st_002", name: "نفت بهران", code: "BEHRAN",
      industry: "روان‌کارها · مشتقات نفتی",
      creditScore: 84, creditLine: 2_400_000_000_000,
      creditUsed: 1_120_000_000_000,
      escrowBalance: 504_000_000_000,
      burnRate: 78_000_000_000, runway: 26,
      monthlyRevenue: 218_000_000_000,
      risk: "low", frozen: false,
    },
    {
      id: "st_003", name: "توسعه صنایع بهشهر", code: "BIDC",
      industry: "هلدینگ صنعتی · مواد مصرفی",
      creditScore: 80, creditLine: 2_100_000_000_000,
      creditUsed: 980_000_000_000,
      escrowBalance: 412_000_000_000,
      burnRate: 68_000_000_000, runway: 22,
      monthlyRevenue: 184_000_000_000,
      risk: "medium", frozen: false,
    },
    {
      id: "st_004", name: "کویر تایر", code: "KAVIR",
      industry: "لاستیک و پلیمر",
      creditScore: 71, creditLine: 1_400_000_000_000,
      creditUsed: 1_030_000_000_000,
      escrowBalance: 224_000_000_000,
      burnRate: 52_000_000_000, runway: 12,
      monthlyRevenue: 96_000_000_000,
      risk: "medium", frozen: false,
    },
    {
      id: "st_005", name: "سرمایه‌گذاری البرز", code: "ALBORZ",
      industry: "سرمایه‌گذاری دارویی",
      creditScore: 88, creditLine: 2_000_000_000_000,
      creditUsed: 720_000_000_000,
      escrowBalance: 624_000_000_000,
      burnRate: 60_000_000_000, runway: 30,
      monthlyRevenue: 168_000_000_000,
      risk: "low", frozen: false,
    },
    {
      id: "st_006", name: "آلومینیوم ایران (ایرالکو)", code: "IRALCO",
      industry: "فلزات اساسی · آلومینیوم",
      creditScore: 82, creditLine: 2_800_000_000_000,
      creditUsed: 1_540_000_000_000,
      escrowBalance: 566_000_000_000,
      burnRate: 96_000_000_000, runway: 19,
      monthlyRevenue: 246_000_000_000,
      risk: "low", frozen: false,
    },
    {
      id: "st_007", name: "سیمان فارس و خوزستان", code: "SIMAN",
      industry: "سیمان و مصالح ساختمانی",
      creditScore: 74, creditLine: 1_700_000_000_000,
      creditUsed: 1_220_000_000_000,
      escrowBalance: 368_000_000_000,
      burnRate: 72_000_000_000, runway: 14,
      monthlyRevenue: 142_000_000_000,
      risk: "medium", frozen: false,
    },
    {
      id: "st_008", name: "هتل‌های بین‌المللی پارسیان", code: "PARSIAN",
      industry: "هتل‌داری · گردشگری",
      creditScore: 58, creditLine: 900_000_000_000,
      creditUsed: 870_000_000_000,
      escrowBalance: 96_000_000_000,
      burnRate: 48_000_000_000, runway: 5,
      monthlyRevenue: 38_000_000_000,
      risk: "critical", frozen: true,
    },
    {
      id: "st_009", name: "کشتیرانی والفجر", code: "VALFAJR",
      industry: "حمل و نقل دریایی",
      creditScore: 69, creditLine: 1_100_000_000_000,
      creditUsed: 980_000_000_000,
      escrowBalance: 208_000_000_000,
      burnRate: 64_000_000_000, runway: 9,
      monthlyRevenue: 86_000_000_000,
      risk: "high", frozen: false,
    },
    {
      id: "st_010", name: "پاکسان", code: "PAXAN",
      industry: "شوینده و بهداشتی",
      creditScore: 77, creditLine: 1_300_000_000_000,
      creditUsed: 690_000_000_000,
      escrowBalance: 302_000_000_000,
      burnRate: 50_000_000_000, runway: 18,
      monthlyRevenue: 112_000_000_000,
      risk: "medium", frozen: false,
    },
  ];

  // ---------- Suppliers ----------
  const suppliers = [
    { id: "sup_001", name: "آراز سرور", category: "زیرساخت ابری" },
    { id: "sup_002", name: "بازرگانی پارسا", category: "بازرگانی" },
    { id: "sup_003", name: "خدمات فنی مهرگان", category: "خدمات فنی" },
    { id: "sup_004", name: "نوین تجارت ایرانیان", category: "بازرگانی" },
    { id: "sup_005", name: "تابان لجستیک", category: "حمل و نقل" },
    { id: "sup_006", name: "پویا انفورماتیک", category: "نرم‌افزار" },
  ];

  // ---------- Procurements (FSM-driven) ----------
  // States: DRAFT → MANAGER_REVIEW → FINANCIAL_VALIDATION →
  //         ESCROW_LOCK → SUPPLIER_DISPATCH → DELIVERY_CONFIRMATION →
  //         PAYMENT_RELEASE → ACCOUNTING_FINALIZATION
  const procurements = [
    {
      id: "proc_5521", startupId: "st_001",
      title: "تمدید زیرساخت ابری تولید",
      supplierId: "sup_001",
      invoiceNumber: "INV-2026-991",
      amount: 38_400_000_000,
      currency: "IRR",
      department: "مهندسی",
      category: "زیرساخت",
      priority: "HIGH",
      expectedDelivery: "1405/04/30",
      reason: "تجدید کلاستر مقیاس‌پذیر تولید برای پاسخ به ترافیک پیک تابستان",
      project: "زیرساخت ۱۴۰۵",
      state: "ESCROW_LOCK",
      createdAt: "1405/03/04",
      submittedBy: "بنیان‌گذار سینا",
      timeline: [
        { state: "DRAFT", at: "1405/03/04 09:14", actor: "اپراتور مالی" },
        { state: "MANAGER_REVIEW", at: "1405/03/04 11:02", actor: "مدیر پروژه" },
        { state: "FINANCIAL_VALIDATION", at: "1405/03/05 08:40", actor: "VC trustC" },
        { state: "ESCROW_LOCK", at: "1405/03/05 08:42", actor: "موتور اسکرو" },
      ],
    },
    {
      id: "proc_5497", startupId: "st_001",
      title: "خرید بسته ۵۰۰ تن مواد اولیه",
      supplierId: "sup_002",
      invoiceNumber: "INV-2026-984",
      amount: 124_000_000_000,
      currency: "IRR",
      department: "تأمین",
      category: "موجودی",
      priority: "MEDIUM",
      expectedDelivery: "1405/04/15",
      reason: "تجدید موجودی فصلی",
      state: "SUPPLIER_DISPATCH",
      createdAt: "1405/02/28",
      submittedBy: "بنیان‌گذار سینا",
      timeline: [
        { state: "DRAFT", at: "1405/02/28 14:01", actor: "اپراتور مالی" },
        { state: "MANAGER_REVIEW", at: "1405/02/29 09:30", actor: "مدیر پروژه" },
        { state: "FINANCIAL_VALIDATION", at: "1405/03/01 11:14", actor: "VC trustC" },
        { state: "ESCROW_LOCK", at: "1405/03/01 11:14", actor: "موتور اسکرو" },
        { state: "SUPPLIER_DISPATCH", at: "1405/03/03 16:22", actor: "بازرگانی پارسا" },
      ],
    },
    {
      id: "proc_5466", startupId: "st_001",
      title: "سرویس پشتیبانی فنی سه‌ماهه",
      supplierId: "sup_003",
      invoiceNumber: "INV-2026-961",
      amount: 14_800_000_000,
      currency: "IRR",
      department: "عملیات",
      category: "خدمات",
      priority: "LOW",
      expectedDelivery: "1405/03/30",
      state: "PAYMENT_RELEASE",
      createdAt: "1405/02/15",
      timeline: [
        { state: "DRAFT", at: "1405/02/15", actor: "اپراتور" },
        { state: "MANAGER_REVIEW", at: "1405/02/16", actor: "مدیر پروژه" },
        { state: "FINANCIAL_VALIDATION", at: "1405/02/16", actor: "VC trustC" },
        { state: "ESCROW_LOCK", at: "1405/02/16", actor: "موتور اسکرو" },
        { state: "SUPPLIER_DISPATCH", at: "1405/02/18", actor: "مهرگان" },
        { state: "DELIVERY_CONFIRMATION", at: "1405/02/27", actor: "بنیان‌گذار سینا" },
        { state: "PAYMENT_RELEASE", at: "1405/02/27", actor: "موتور اسکرو" },
      ],
    },
    {
      id: "proc_5388", startupId: "st_001",
      title: "تجهیزات تست QA",
      supplierId: "sup_006",
      invoiceNumber: "INV-2026-940",
      amount: 8_600_000_000,
      currency: "IRR",
      department: "مهندسی",
      category: "تجهیزات",
      priority: "MEDIUM",
      state: "ACCOUNTING_FINALIZATION",
      createdAt: "1405/01/28",
      timeline: [
        { state: "DRAFT", at: "1405/01/28", actor: "اپراتور" },
        { state: "MANAGER_REVIEW", at: "1405/01/29", actor: "مدیر پروژه" },
        { state: "FINANCIAL_VALIDATION", at: "1405/01/30", actor: "VC trustC" },
        { state: "ESCROW_LOCK", at: "1405/01/30", actor: "موتور اسکرو" },
        { state: "SUPPLIER_DISPATCH", at: "1405/02/02", actor: "پویا انفورماتیک" },
        { state: "DELIVERY_CONFIRMATION", at: "1405/02/09", actor: "بنیان‌گذار سینا" },
        { state: "PAYMENT_RELEASE", at: "1405/02/09", actor: "موتور اسکرو" },
        { state: "ACCOUNTING_FINALIZATION", at: "1405/02/09", actor: "موتور حسابداری" },
      ],
    },
    {
      id: "proc_5602", startupId: "st_001",
      title: "بسته بازاریابی دیجیتال Q2",
      supplierId: "sup_004",
      invoiceNumber: "INV-2026-1003",
      amount: 22_000_000_000,
      currency: "IRR",
      department: "بازاریابی",
      category: "خدمات",
      priority: "MEDIUM",
      state: "MANAGER_REVIEW",
      createdAt: "1405/03/12",
      timeline: [
        { state: "DRAFT", at: "1405/03/12 10:00", actor: "اپراتور مالی" },
        { state: "MANAGER_REVIEW", at: "1405/03/12 14:31", actor: "مدیر پروژه" },
      ],
    },
    {
      id: "proc_5615", startupId: "st_001",
      title: "خدمات حمل تخصصی",
      supplierId: "sup_005",
      invoiceNumber: "INV-2026-1019",
      amount: 5_400_000_000,
      currency: "IRR",
      department: "تأمین",
      category: "خدمات",
      priority: "HIGH",
      state: "DRAFT",
      createdAt: "1405/03/14",
      timeline: [
        { state: "DRAFT", at: "1405/03/14 09:00", actor: "اپراتور مالی" },
      ],
    },
  ];

  // ---------- Customer invoices (sales) ----------
  const customerInvoices = [
    { id: "cinv_001", startupId: "st_001", customer: "شرکت سپهر داده", amount: 48_000_000_000, mode: "ESCROW", status: "PAID",  issuedAt: "1405/02/20", paidAt: "1405/02/22" },
    { id: "cinv_002", startupId: "st_001", customer: "گروه صنعتی پایدار", amount: 92_500_000_000, mode: "DIRECT", status: "PAID",  issuedAt: "1405/02/26", paidAt: "1405/02/29" },
    { id: "cinv_003", startupId: "st_001", customer: "هلدینگ نوآفرین",   amount: 36_400_000_000, mode: "ESCROW", status: "OPEN",  issuedAt: "1405/03/08" },
    { id: "cinv_004", startupId: "st_001", customer: "تعاونی توسعه",     amount: 14_200_000_000, mode: "DIRECT", status: "OPEN",  issuedAt: "1405/03/10" },
    { id: "cinv_005", startupId: "st_001", customer: "شرکت کوشش راه",    amount: 7_800_000_000,  mode: "ESCROW", status: "PAID",  issuedAt: "1405/03/01", paidAt: "1405/03/03" },
  ];

  // ---------- Ledger seed entries ----------
  const ledger = [
    {
      txn: "txn_82931a", at: "1405/03/05 08:42:11",
      ref: "proc_5521", desc: "قفل اسکرو · proc_5521",
      entries: [
        { code: "2103", account: "وجوه امانی مأخوذه · اسکرو", debit: 38_400_000_000, credit: 0 },
        { code: "1104", account: "حساب پرداختنی تأمین‌کننده · پاکسازی", debit: 0, credit: 38_400_000_000 },
      ],
    },
    {
      txn: "txn_82930b", at: "1405/03/03 16:22:30",
      ref: "proc_5497", desc: "آزادسازی اسکرو · پرداخت تأمین‌کننده",
      entries: [
        { code: "1104", account: "حساب پرداختنی تأمین‌کننده · پاکسازی", debit: 124_000_000_000, credit: 0 },
        { code: "1001", account: "بانک · حساب عملیاتی", debit: 0, credit: 124_000_000_000 },
      ],
    },
    {
      txn: "txn_82928a", at: "1405/02/29 10:14:02",
      ref: "cinv_002", desc: "وصول فاکتور فروش · شرکت سپهر",
      entries: [
        { code: "1001", account: "بانک · حساب عملیاتی", debit: 92_500_000_000, credit: 0 },
        { code: "4001", account: "درآمد فروش", debit: 0, credit: 92_500_000_000 },
      ],
    },
    {
      txn: "txn_82922c", at: "1405/02/27 11:08:45",
      ref: "proc_5466", desc: "نهایی‌سازی حسابداری · proc_5466",
      entries: [
        { code: "1104", account: "حساب پرداختنی تأمین‌کننده · پاکسازی", debit: 14_800_000_000, credit: 0 },
        { code: "5002", account: "هزینه عملیاتی · خدمات", debit: 14_800_000_000, credit: 0 },
        { code: "2103", account: "وجوه امانی مأخوذه · اسکرو", debit: 0, credit: 14_800_000_000 },
        { code: "1001", account: "بانک · حساب عملیاتی", debit: 0, credit: 14_800_000_000 },
      ],
    },
  ];

  // ---------- Recycling queue (cross-portfolio) ----------
  const recyclingQueue = [
    { startupId: "st_007", score: 94, cycleDays: 18, queued: 412_000_000_000, reason: "چرخه نقدینگی کوتاه" },
    { startupId: "st_004", score: 89, cycleDays: 22, queued: 384_000_000_000, reason: "نرخ تسویه بالا" },
    { startupId: "st_001", score: 82, cycleDays: 28, queued: 220_000_000_000, reason: "اعتبار مستحکم" },
    { startupId: "st_006", score: 76, cycleDays: 35, queued: 168_000_000_000, reason: "ریسک متوسط" },
    { startupId: "st_002", score: 71, cycleDays: 41, queued: 142_000_000_000, reason: "تمرکز پیش‌فاکتور بالا" },
  ];

  // ---------- Audit log ----------
  const auditLog = [
    { id: "aud_9911", at: "1405/03/05 08:42:11", actor: "بنیان‌گذار سینا", actorRole: "FOUNDER", action: "FreezeOverride.Denied", target: "proc_5521", from: "FINANCIAL_VALIDATION", to: "ESCROW_LOCK", hash: "e3b0c44298…" },
    { id: "aud_9910", at: "1405/03/05 08:42:09", actor: "موتور اسکرو", actorRole: "SYSTEM", action: "EscrowLocked", target: "proc_5521", from: "FINANCIAL_VALIDATION", to: "ESCROW_LOCK", hash: "a1f4ce8b22…" },
    { id: "aud_9908", at: "1405/03/05 08:40:55", actor: "VC trustC", actorRole: "VC", action: "Approved", target: "proc_5521", from: "MANAGER_REVIEW", to: "FINANCIAL_VALIDATION", hash: "7c92ab44f1…" },
    { id: "aud_9905", at: "1405/03/04 11:02:14", actor: "مدیر پروژه", actorRole: "PM", action: "TechnicalApproved", target: "proc_5521", from: "DRAFT", to: "MANAGER_REVIEW", hash: "f44b88e213…" },
    { id: "aud_9903", at: "1405/03/04 09:14:33", actor: "اپراتور مالی", actorRole: "OPERATOR", action: "ProcurementSubmitted", target: "proc_5521", from: null, to: "DRAFT", hash: "5621e1b3c0…" },
    { id: "aud_9870", at: "1405/03/03 16:22:30", actor: "موتور اسکرو", actorRole: "SYSTEM", action: "PaymentReleased", target: "proc_5497", from: "DELIVERY_CONFIRMATION", to: "PAYMENT_RELEASE", hash: "bb214a90e2…" },
    { id: "aud_9865", at: "1405/03/03 16:21:50", actor: "بنیان‌گذار سینا", actorRole: "FOUNDER", action: "DeliveryConfirmed", target: "proc_5497", from: "SUPPLIER_DISPATCH", to: "DELIVERY_CONFIRMATION", hash: "9a02ff1213…" },
    { id: "aud_9820", at: "1405/03/01 11:14:22", actor: "VC trustC", actorRole: "VC", action: "FreezeActivated", target: "st_008", from: null, to: "FROZEN", hash: "12cc97ea88…" },
  ];

  // ---------- Burn-rate timeseries (last 12 months, IRR/month) ----------
  const burnSeries = [
    32, 36, 35, 41, 44, 42, 46, 48, 50, 48, 47, 48,
  ].map(b => b * 1_000_000_000);

  const revenueSeries = [
    61, 64, 68, 70, 75, 80, 82, 85, 88, 90, 92, 92,
  ].map(r => r * 1_000_000_000);

  /* ------------------------------------------------------------
     6-month synthetic history per company
     ------------------------------------------------------------
     Goal: every startup ends the loop with ~100 procurements +
     ~100 customer invoices spread over a 6-month Jalali window
     ending on 1405/03/14. Amounts are *derived* from each
     startup profile (monthlyRevenue, burnRate, risk) so the
     dashboard charts that aggregate them reflect realistic
     growth / decline trajectories.
     ------------------------------------------------------------ */
  const MONTH_BUCKETS = ["1404/10","1404/11","1404/12","1405/01","1405/02","1405/03"];
  const PROC_FSM_LIST = ["DRAFT","MANAGER_REVIEW","FINANCIAL_VALIDATION","ESCROW_LOCK","SUPPLIER_DISPATCH","DELIVERY_CONFIRMATION","PAYMENT_RELEASE","ACCOUNTING_FINALIZATION"];
  const RISK_TREND = { low: 1.045, medium: 1.012, high: 0.978, critical: 0.93 };
  const PROC_TITLES_BY_CODE = {
    SINA:    ["خرید شیر خام دامداری‌ها","سرویس پاستوریزاسیون","تجهیزات بسته‌بندی Tetra Pak","افزودنی کلسیم و ویتامین","حمل سرد محصول","قرارداد سردخانه ماهانه","تست میکروبی نمونه‌ها","خرید پنیر فله","نگه‌داری خط پرکنی"],
    BEHRAN:  ["خرید روغن پایه گروه II","افزودنی API SN","بسته‌بندی فلزی روغن موتور","سرویس راکتور تقطیر","تست آزمایشگاهی","حمل تانکر","کاتالیست مس","خرید بشکه ۲۰۰ لیتری"],
    BIDC:    ["مواد اولیه روغن خام","حمل کانتینری بندرعباس","صابون و بهداشت فله","سرویس خط تولید","تعمیر دستگاه پرکن","پلت‌سازی برند بهار","خرید موادبسته‌بندی"],
    KAVIR:   ["خرید لاستیک طبیعی NR-20","کربن بلک N330","سرویس قالب پخت","کابل فولادی تایر کامیون","بازرسی Vulc","افزودنی پلیمر بوتیل","حمل از بندر چابهار"],
    ALBORZ:  ["ماده مؤثره API","تجهیزات GMP استریل","بسته‌بندی آنتی‌بیوتیک","سرویس کنترل کیفی QC","کابینت ISO 5","تست BA/BE","خرید مواد جانبی"],
    IRALCO:  ["خرید آلومینا کلسینه","پودر کریولیت","الکترود کربنی پری‌بیک","نگه‌داری کوره ذوب","کنسانتره مس","آنود گرافیتی","سرویس برق صنعتی"],
    SIMAN:   ["سنگ آهک خشک","پتکوک سوخت کوره","تعمیر کوره دوار","حمل کلینکر","شارژ گلوله آسیاب","افزودنی PCE","خرید گاز طبیعی صنعتی"],
    PARSIAN: ["تجهیزات اتاق مهمان","سرویس آشپزخانه هتل","لباسشویی صنعتی","مواد شوینده هتل","رزرواسیون GDS","ست ملحفه و حوله","تعمیر آسانسور"],
    VALFAJR: ["تعمیر بدنه شناور","سوخت Bunker IFO","رنگ Antifouling","سرویس موتور MAN B&W","بازرسی ILO پرسنل","نوسازی لنگرگاه","قطعات یدکی موتور"],
    PAXAN:   ["سدیم لوریل سولفات","عطر و رایحه شوینده","بسته‌بندی پلاستیکی","تعمیر خط شوینده","تست QC مایع","افزودنی آنزیمی","خرید گلیسرین"],
  };
  const GENERIC_PROC_TITLES = ["تجدید زیرساخت ابری","سرویس پشتیبانی سرور","لپ‌تاپ تیم تولید","تجهیزات اداری","سرویس امنیت سایبری","تعمیر سامانه ERP","اشتراک نرم‌افزار","سرویس حمل لجستیکی","تجهیزات شبکه","خدمات حسابرسی"];
  const SALES_CUSTOMERS = ["شرکت سپهر داده","گروه صنعتی پایدار","هلدینگ نوآفرین","تعاونی توسعه","شرکت کوشش راه","بازرگانی نوین کاران","پخش سراسری ایران","تاژ تجارت","فروشگاه‌های زنجیره‌ای رفاه","شرکت آینده‌سازان","پخش پارسا","پاتیلا","گلستان طلایی","پویا پخش","مهرگان تجارت","پگاه فارس","تعاونی مصرف کارمندان","صنایع شیر ایران","شرکت کالای کشاورزی","بازرگانی ساحل","پخش زاگرس","سپید ماهور"];
  const DEPARTMENTS = ["مهندسی","تأمین","عملیات","بازاریابی","مالی","لجستیک","تولید","QC"];
  const CATEGORIES  = ["زیرساخت","موجودی","خدمات","تجهیزات","حمل","انرژی"];
  const PRIORITIES  = ["LOW","MEDIUM","HIGH"];
  const SUPPLIER_IDS = suppliers.map(s => s.id);

  // mulberry32 — deterministic per-startup randomness
  function mulberry32(seed) {
    let s = seed >>> 0;
    return function() {
      s = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function jdaysInMonth(jm) { return jm <= 6 ? 31 : jm <= 11 ? 30 : 29; }
  function pad2(n) { return String(n).padStart(2, "0"); }
  function pickDateInBucket(bucket, rng) {
    const [y, m] = bucket.split("/").map(Number);
    const d = Math.floor(rng() * jdaysInMonth(m)) + 1;
    return `${y}/${pad2(m)}/${pad2(d)}`;
  }
  function pickBucketWeighted(rng) {
    // Spread evenly across the 6 buckets with a mild recency bias —
    // pow(u, 0.85) keeps months 0..3 well populated while putting
    // slightly more procurements/invoices in the latest two months.
    const u = rng();
    return Math.min(5, Math.floor(Math.pow(u, 0.85) * 6));
  }

  startups.forEach((s, idx) => {
    const rng = mulberry32(idx * 7919 + 1031);
    const titlePool = (PROC_TITLES_BY_CODE[s.code] || GENERIC_PROC_TITLES).concat(GENERIC_PROC_TITLES.slice(0, 3));
    const trend = RISK_TREND[s.risk] || 1.0;

    const existingProcs = procurements.filter(p => p.startupId === s.id).length;
    const existingInvs  = customerInvoices.filter(i => i.startupId === s.id).length;
    const newProcs = Math.max(0, 100 - existingProcs);
    const newInvs  = Math.max(0, 100 - existingInvs);

    // ---- Procurements (purchases) ----
    for (let k = 0; k < newProcs; k++) {
      const bIdx  = pickBucketWeighted(rng);
      const month = MONTH_BUCKETS[bIdx];
      const date  = pickDateInBucket(month, rng);
      const age   = 5 - bIdx; // 0 = newest month, 5 = oldest
      const completedProb = 0.15 + age * 0.16;
      let state;
      if (rng() < completedProb) {
        state = rng() < 0.55 ? "ACCOUNTING_FINALIZATION" : "PAYMENT_RELEASE";
      } else {
        // Spread across in-flight states, with bias toward later FSM as item ages
        const ceiling = Math.min(6, 1 + Math.floor(age * 1.1 + rng() * 2));
        state = PROC_FSM_LIST[Math.floor(rng() * ceiling)];
      }
      const baseAvg = s.burnRate / 16;                 // ~16 procs/month target
      const variation = 0.35 + rng() * 1.9;            // 0.35..2.25
      const trendMult = Math.pow(trend, bIdx);
      const raw = baseAvg * variation * trendMult;
      const amount = Math.max(5e8, Math.round(raw / 1e8) * 1e8);

      const supplierId = SUPPLIER_IDS[Math.floor(rng() * SUPPLIER_IDS.length)];
      const title    = titlePool[Math.floor(rng() * titlePool.length)];
      const dept     = DEPARTMENTS[Math.floor(rng() * DEPARTMENTS.length)];
      const cat      = CATEGORIES[Math.floor(rng() * CATEGORIES.length)];
      const priority = PRIORITIES[Math.floor(rng() * PRIORITIES.length)];
      const seqLabel = `${s.code.toLowerCase()}-${String(k + 1).padStart(3, "0")}`;
      const invNum   = `INV-${month.replace("/","")}-${1000 + idx * 100 + k}`;

      // Minimal timeline truncated at current state
      const upTo = PROC_FSM_LIST.indexOf(state);
      const timeline = PROC_FSM_LIST.slice(0, upTo + 1).map((st, i) => ({
        state: st, at: i === 0 ? date : `${month}/${pad2(Math.min(jdaysInMonth(+month.split("/")[1]), +date.split("/")[2] + i))}`,
        actor: st === "DRAFT" ? "اپراتور مالی" :
               st === "MANAGER_REVIEW" ? "مدیر پروژه" :
               st === "FINANCIAL_VALIDATION" ? "VC trustC" :
               st === "ESCROW_LOCK" ? "موتور اسکرو" :
               st === "SUPPLIER_DISPATCH" ? (suppliers.find(x => x.id === supplierId)?.name || "تأمین‌کننده") :
               st === "DELIVERY_CONFIRMATION" ? `بنیان‌گذار ${s.code}` :
               st === "PAYMENT_RELEASE" ? "موتور اسکرو" : "موتور حسابداری",
      }));

      procurements.push({
        id: `proc_${seqLabel}`,
        startupId: s.id,
        title, supplierId, invoiceNumber: invNum,
        amount, currency: "IRR",
        department: dept, category: cat, priority,
        state, createdAt: date, timeline,
      });
    }

    // ---- Customer invoices (sales) ----
    for (let k = 0; k < newInvs; k++) {
      const bIdx  = pickBucketWeighted(rng);
      const month = MONTH_BUCKETS[bIdx];
      const date  = pickDateInBucket(month, rng);
      const age   = 5 - bIdx;
      const paidProb = 0.22 + age * 0.17;
      const status = rng() < paidProb ? "PAID" : "OPEN";
      const mode   = rng() < 0.55 ? "ESCROW" : "DIRECT";

      const baseAvg = s.monthlyRevenue / 16;
      const variation = 0.3 + rng() * 1.9;
      const trendMult = Math.pow(trend, bIdx);
      const raw = baseAvg * variation * trendMult;
      const amount = Math.max(5e8, Math.round(raw / 1e8) * 1e8);

      const customer = SALES_CUSTOMERS[Math.floor(rng() * SALES_CUSTOMERS.length)];
      const seqLabel = `${s.code.toLowerCase()}-${String(k + 1).padStart(3, "0")}`;

      customerInvoices.push({
        id: `cinv_${seqLabel}`,
        startupId: s.id,
        customer, amount, mode, status,
        issuedAt: date,
        ...(status === "PAID"
          ? { paidAt: `${month}/${pad2(Math.min(jdaysInMonth(+month.split("/")[1]), +date.split("/")[2] + 2 + Math.floor(rng() * 6)))}` }
          : {}),
      });
    }
  });

  // ---------- Users (Auth + RBAC) ----------
  // Status: PENDING (awaiting admin approval) | ACTIVE | DISABLED
  // Role:   ADMIN | FOUNDER | VC | AUDITOR
  //
  // Each portfolio founder has an exclusive email + password (see
  // db/seed/credentials.md). Password pattern: <code-lowercase>@trustc-2026.
  const users = [
    // platform-level accounts
    { id: "u_001", name: "مدیر سیستم",   email: "admin@trustc.io",   role: "ADMIN",   status: "ACTIVE",  company: "trustC",                       joinedAt: "1404/11/01", lastLogin: "1405/03/14 09:02" },
    { id: "u_002", name: "مدیر صندوق",   email: "vc@trustc.io",       role: "VC",      status: "ACTIVE",  company: "صندوق سرمایه‌گذاری trustC",   joinedAt: "1404/11/15", lastLogin: "1405/03/13 22:14" },
    { id: "u_003", name: "حسابرس مستقل", email: "auditor@trustc.io",  role: "AUDITOR", status: "ACTIVE",  company: "مؤسسه حسابرسی مفید راهبر",     joinedAt: "1405/01/12", lastLogin: "1405/03/12 14:30" },

    // 10 founders — one per Mostazafan-affiliated portfolio company
    { id: "u_011", name: "حسین کریمی",    email: "founder@sina.trustc.io",    role: "FOUNDER", status: "ACTIVE",  company: "صنایع غذایی سینا",              joinedAt: "1404/12/04", lastLogin: "1405/03/14 08:51", startupId: "st_001" },
    { id: "u_012", name: "رضا اسدی",       email: "founder@behran.trustc.io",  role: "FOUNDER", status: "ACTIVE",  company: "نفت بهران",                      joinedAt: "1404/12/10", lastLogin: "1405/03/13 17:22", startupId: "st_002" },
    { id: "u_013", name: "محمدرضا فلاح",   email: "founder@bidc.trustc.io",    role: "FOUNDER", status: "ACTIVE",  company: "توسعه صنایع بهشهر",              joinedAt: "1404/12/18", lastLogin: "1405/03/14 07:40", startupId: "st_003" },
    { id: "u_014", name: "علی اکبری",      email: "founder@kavir.trustc.io",   role: "FOUNDER", status: "ACTIVE",  company: "کویر تایر",                      joinedAt: "1405/01/05", lastLogin: "1405/03/12 19:18", startupId: "st_004" },
    { id: "u_015", name: "مریم نوروزی",    email: "founder@alborz.trustc.io",  role: "FOUNDER", status: "ACTIVE",  company: "سرمایه‌گذاری البرز",              joinedAt: "1405/01/22", lastLogin: "1405/03/13 11:05", startupId: "st_005" },
    { id: "u_016", name: "سعید قاسمی",     email: "founder@iralco.trustc.io",  role: "FOUNDER", status: "ACTIVE",  company: "آلومینیوم ایران (ایرالکو)",      joinedAt: "1405/02/03", lastLogin: "1405/03/14 06:30", startupId: "st_006" },
    { id: "u_017", name: "مهدی محمدی",     email: "founder@siman.trustc.io",   role: "FOUNDER", status: "ACTIVE",  company: "سیمان فارس و خوزستان",           joinedAt: "1405/02/14", lastLogin: "1405/03/13 14:50", startupId: "st_007" },
    { id: "u_018", name: "فاطمه صادقی",    email: "founder@parsian.trustc.io", role: "FOUNDER", status: "PENDING", company: "هتل‌های بین‌المللی پارسیان",      joinedAt: "1405/03/13", lastLogin: null,                startupId: "st_008" },
    { id: "u_019", name: "احمد حسینی",     email: "founder@valfajr.trustc.io", role: "FOUNDER", status: "ACTIVE",  company: "کشتیرانی والفجر",                joinedAt: "1405/02/27", lastLogin: "1405/03/12 22:11", startupId: "st_009" },
    { id: "u_020", name: "زهرا رحیمی",     email: "founder@paxan.trustc.io",   role: "FOUNDER", status: "PENDING", company: "پاکسان",                          joinedAt: "1405/03/14", lastLogin: null,                startupId: "st_010" },
  ];

  // ---------- System settings (admin-controlled) ----------
  const systemSettings = {
    registrationEnabled: true,
    requireApprovalForRoles: ["FOUNDER","VC","AUDITOR"],
    twoFactorRequired: false,
    auditRetentionDays: 365 * 7,
    maxFreezeOverrideHours: 72,
  };

  return {
    vc, startups, suppliers,
    procurements, customerInvoices,
    ledger, recyclingQueue, auditLog,
    burnSeries, revenueSeries,
    users, systemSettings,
    // FSM definition — single source of truth
    procurementFSM: [
      { state: "DRAFT",                  label: "پیش‌نویس" },
      { state: "MANAGER_REVIEW",         label: "بررسی مدیر" },
      { state: "FINANCIAL_VALIDATION",   label: "اعتبارسنجی مالی" },
      { state: "ESCROW_LOCK",            label: "قفل اسکرو" },
      { state: "SUPPLIER_DISPATCH",      label: "ارسال کالا" },
      { state: "DELIVERY_CONFIRMATION",  label: "تأیید تحویل" },
      { state: "PAYMENT_RELEASE",        label: "آزادسازی پرداخت" },
      { state: "ACCOUNTING_FINALIZATION",label: "نهایی‌سازی حسابداری" },
    ],
  };
})();

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
    portfolioCount: 7,
    activeCreditLines: 12,
  };

  // ---------- Portfolio (abstract names) ----------
  const startups = [
    {
      id: "st_001", name: "شرکت آلفا", code: "ALPHA",
      industry: "SaaS · مدیریت زنجیره تأمین",
      creditScore: 82, creditLine: 1_400_000_000_000,
      creditUsed: 920_000_000_000,
      escrowBalance: 386_500_000_000,
      burnRate: 48_000_000_000, runway: 18,
      monthlyRevenue: 92_000_000_000,
      risk: "low", frozen: false,
    },
    {
      id: "st_002", name: "شرکت بتا", code: "BETA",
      industry: "تجارت الکترونیک · کالامحور",
      creditScore: 71, creditLine: 1_800_000_000_000,
      creditUsed: 1_410_000_000_000,
      escrowBalance: 612_000_000_000,
      burnRate: 78_000_000_000, runway: 11,
      monthlyRevenue: 145_000_000_000,
      risk: "medium", frozen: false,
    },
    {
      id: "st_003", name: "شرکت گاما", code: "GAMMA",
      industry: "فین‌تک · پرداخت",
      creditScore: 65, creditLine: 800_000_000_000,
      creditUsed: 740_000_000_000,
      escrowBalance: 124_000_000_000,
      burnRate: 32_000_000_000, runway: 9,
      monthlyRevenue: 51_000_000_000,
      risk: "high", frozen: false,
    },
    {
      id: "st_004", name: "شرکت دلتا", code: "DELTA",
      industry: "لجستیک · انبارداری",
      creditScore: 88, creditLine: 2_400_000_000_000,
      creditUsed: 1_120_000_000_000,
      escrowBalance: 845_000_000_000,
      burnRate: 92_000_000_000, runway: 24,
      monthlyRevenue: 218_000_000_000,
      risk: "low", frozen: false,
    },
    {
      id: "st_005", name: "شرکت اپسیلون", code: "EPSILON",
      industry: "آموزش آنلاین",
      creditScore: 58, creditLine: 600_000_000_000,
      creditUsed: 580_000_000_000,
      escrowBalance: 42_000_000_000,
      burnRate: 41_000_000_000, runway: 4,
      monthlyRevenue: 18_000_000_000,
      risk: "critical", frozen: true,
    },
    {
      id: "st_006", name: "شرکت زتا", code: "ZETA",
      industry: "هوش مصنوعی · B2B",
      creditScore: 76, creditLine: 1_100_000_000_000,
      creditUsed: 690_000_000_000,
      escrowBalance: 230_000_000_000,
      burnRate: 56_000_000_000, runway: 14,
      monthlyRevenue: 88_000_000_000,
      risk: "medium", frozen: false,
    },
    {
      id: "st_007", name: "شرکت اتا", code: "ETA",
      industry: "سلامت دیجیتال",
      creditScore: 91, creditLine: 1_600_000_000_000,
      creditUsed: 540_000_000_000,
      escrowBalance: 412_000_000_000,
      burnRate: 38_000_000_000, runway: 32,
      monthlyRevenue: 124_000_000_000,
      risk: "low", frozen: false,
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
      submittedBy: "بنیان‌گذار آلفا",
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
      submittedBy: "بنیان‌گذار آلفا",
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
        { state: "DELIVERY_CONFIRMATION", at: "1405/02/27", actor: "بنیان‌گذار آلفا" },
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
        { state: "DELIVERY_CONFIRMATION", at: "1405/02/09", actor: "بنیان‌گذار آلفا" },
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
    { id: "aud_9911", at: "1405/03/05 08:42:11", actor: "بنیان‌گذار آلفا", actorRole: "FOUNDER", action: "FreezeOverride.Denied", target: "proc_5521", from: "FINANCIAL_VALIDATION", to: "ESCROW_LOCK", hash: "e3b0c44298…" },
    { id: "aud_9910", at: "1405/03/05 08:42:09", actor: "موتور اسکرو", actorRole: "SYSTEM", action: "EscrowLocked", target: "proc_5521", from: "FINANCIAL_VALIDATION", to: "ESCROW_LOCK", hash: "a1f4ce8b22…" },
    { id: "aud_9908", at: "1405/03/05 08:40:55", actor: "VC trustC", actorRole: "VC", action: "Approved", target: "proc_5521", from: "MANAGER_REVIEW", to: "FINANCIAL_VALIDATION", hash: "7c92ab44f1…" },
    { id: "aud_9905", at: "1405/03/04 11:02:14", actor: "مدیر پروژه", actorRole: "PM", action: "TechnicalApproved", target: "proc_5521", from: "DRAFT", to: "MANAGER_REVIEW", hash: "f44b88e213…" },
    { id: "aud_9903", at: "1405/03/04 09:14:33", actor: "اپراتور مالی", actorRole: "OPERATOR", action: "ProcurementSubmitted", target: "proc_5521", from: null, to: "DRAFT", hash: "5621e1b3c0…" },
    { id: "aud_9870", at: "1405/03/03 16:22:30", actor: "موتور اسکرو", actorRole: "SYSTEM", action: "PaymentReleased", target: "proc_5497", from: "DELIVERY_CONFIRMATION", to: "PAYMENT_RELEASE", hash: "bb214a90e2…" },
    { id: "aud_9865", at: "1405/03/03 16:21:50", actor: "بنیان‌گذار آلفا", actorRole: "FOUNDER", action: "DeliveryConfirmed", target: "proc_5497", from: "SUPPLIER_DISPATCH", to: "DELIVERY_CONFIRMATION", hash: "9a02ff1213…" },
    { id: "aud_9820", at: "1405/03/01 11:14:22", actor: "VC trustC", actorRole: "VC", action: "FreezeActivated", target: "st_005", from: null, to: "FROZEN", hash: "12cc97ea88…" },
  ];

  // ---------- Burn-rate timeseries (last 12 months, IRR/month) ----------
  const burnSeries = [
    32, 36, 35, 41, 44, 42, 46, 48, 50, 48, 47, 48,
  ].map(b => b * 1_000_000_000);

  const revenueSeries = [
    61, 64, 68, 70, 75, 80, 82, 85, 88, 90, 92, 92,
  ].map(r => r * 1_000_000_000);

  // ---------- Users (Auth + RBAC) ----------
  // Status: PENDING (awaiting admin approval) | ACTIVE | DISABLED
  // Role:   ADMIN | FOUNDER | VC | AUDITOR
  const users = [
    { id: "u_001", name: "مدیر سیستم",  email: "admin@trustc.io",   role: "ADMIN",   status: "ACTIVE",  company: "trustC",                 joinedAt: "1404/11/01", lastLogin: "1405/03/14 09:02" },
    { id: "u_002", name: "بنیان‌گذار آلفا", email: "founder@alpha.io",  role: "FOUNDER", status: "ACTIVE",  company: "شرکت آلفا",              joinedAt: "1404/12/04", lastLogin: "1405/03/14 08:51", startupId: "st_001" },
    { id: "u_003", name: "مدیر صندوق",   email: "vc@trustc.io",       role: "VC",      status: "ACTIVE",  company: "صندوق سرمایه‌گذاری trustC", joinedAt: "1404/11/15", lastLogin: "1405/03/13 22:14" },
    { id: "u_004", name: "حسابرس مستقل", email: "auditor@trustc.io",  role: "AUDITOR", status: "ACTIVE",  company: "مؤسسه حسابرسی مودیان",     joinedAt: "1405/01/12", lastLogin: "1405/03/12 14:30" },
    { id: "u_005", name: "بنیان‌گذار بتا",  email: "founder@beta.io",   role: "FOUNDER", status: "PENDING", company: "شرکت بتا",              joinedAt: "1405/03/13", lastLogin: null, startupId: "st_002" },
    { id: "u_006", name: "بنیان‌گذار گاما",  email: "founder@gamma.io",  role: "FOUNDER", status: "PENDING", company: "شرکت گاما",              joinedAt: "1405/03/14", lastLogin: null, startupId: "st_003" },
    { id: "u_007", name: "علی رضایی",      email: "ali@delta.io",       role: "FOUNDER", status: "DISABLED", company: "شرکت دلتا",             joinedAt: "1405/02/01", lastLogin: "1405/02/28 10:22", startupId: "st_004" },
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

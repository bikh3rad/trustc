/* ============================================================
   trustC — Utilities (formatting, i18n, helpers)
   ------------------------------------------------------------
   For Claude Code: this file is framework-agnostic. Export
   shape stays stable; the React app uses these via window.tc.
   ============================================================ */

window.tc = (function () {
  // ---------- Number formatting ----------
  // Default uses Latin digits with Persian thousands separator.
  // Set window.tc.config.numerals = "fa" for Eastern Arabic numerals.
  const config = { numerals: "fa-mixed", lang: "fa" };

  // Persian digit map
  const FA_DIGITS = ["۰","۱","۲","۳","۴","۵","۶","۷","۸","۹"];

  function toFaDigits(s) {
    return String(s).replace(/[0-9]/g, d => FA_DIGITS[+d]);
  }

  function formatNum(n, opts = {}) {
    if (n === null || n === undefined || isNaN(n)) return "—";
    const { compact = false, digits = 0 } = opts;
    let s;
    if (compact) {
      const abs = Math.abs(n);
      if (abs >= 1e12)      s = (n / 1e12).toFixed(2) + " T";
      else if (abs >= 1e9)  s = (n / 1e9).toFixed(2) + " B";
      else if (abs >= 1e6)  s = (n / 1e6).toFixed(2) + " M";
      else if (abs >= 1e3)  s = (n / 1e3).toFixed(1) + " K";
      else s = String(Math.round(n));
    } else {
      s = n.toLocaleString("en-US", {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      });
    }
    if (config.numerals === "fa") s = toFaDigits(s);
    return s;
  }

  // Persian-style "میلیارد ریال" rendering — collapses huge IRR numbers
  // into readable form. e.g. 38_400_000_000 → "۳۸٫۴ میلیارد"
  function formatIRR(n, opts = {}) {
    if (n === null || n === undefined || isNaN(n)) return "—";
    const { compact = true, withUnit = true, lang = "fa" } = opts;
    const abs = Math.abs(n);
    let value, unit;
    if (!compact) {
      value = formatNum(n);
      unit = "ریال";
    } else if (abs >= 1e12) {
      value = (n / 1e12).toFixed(2).replace(/\.?0+$/, "");
      unit = lang === "fa" ? "هزار میلیارد" : "T IRR";
    } else if (abs >= 1e9) {
      value = (n / 1e9).toFixed(1).replace(/\.0$/, "");
      unit = lang === "fa" ? "میلیارد" : "B IRR";
    } else if (abs >= 1e6) {
      value = (n / 1e6).toFixed(1).replace(/\.0$/, "");
      unit = lang === "fa" ? "میلیون" : "M IRR";
    } else {
      value = formatNum(n);
      unit = lang === "fa" ? "ریال" : "IRR";
    }
    if (config.numerals === "fa") value = toFaDigits(value);
    return withUnit ? `${value} ${unit}` : value;
  }

  // For tables where we want comma-separated raw IRR amounts
  function formatIRRPlain(n) {
    if (n === null || n === undefined) return "—";
    let s = n.toLocaleString("en-US");
    if (config.numerals === "fa") s = toFaDigits(s);
    return s;
  }

  function formatPercent(n) {
    let s = (n).toFixed(1).replace(/\.0$/, "") + "%";
    if (config.numerals === "fa") s = toFaDigits(s);
    return s;
  }

  // ---------- State helpers ----------
  function stateTone(state) {
    if (!state) return "neutral";
    switch (state) {
      case "DRAFT": case "PROPOSED": case "CANCELLED": return "neutral";
      case "MANAGER_REVIEW": case "FINANCIAL_VALIDATION": return "warn";
      case "ESCROW_LOCK": case "SUPPLIER_DISPATCH":
      case "DELIVERY_CONFIRMATION": case "PAYMENT_RELEASE": return "active";
      case "ACCOUNTING_FINALIZATION": case "COMPLETED": case "PAID": return "good";
      case "FROZEN": case "DISPUTED": case "FAIL": return "bad";
      case "OPEN": return "warn";
      default: return "neutral";
    }
  }

  function stateLabelFa(state) {
    const map = {
      DRAFT: "پیش‌نویس",
      MANAGER_REVIEW: "بررسی مدیر",
      FINANCIAL_VALIDATION: "اعتبارسنجی مالی",
      ESCROW_LOCK: "قفل اسکرو",
      SUPPLIER_DISPATCH: "ارسال کالا",
      DELIVERY_CONFIRMATION: "تأیید تحویل",
      PAYMENT_RELEASE: "آزادسازی پرداخت",
      ACCOUNTING_FINALIZATION: "نهایی حسابداری",
      FROZEN: "فریز شده",
      COMPLETED: "تکمیل شده",
      OPEN: "باز",
      PAID: "پرداخت شده",
      DISPUTED: "اختلاف",
    };
    return map[state] || state;
  }

  function riskLabelFa(r) {
    return ({ low: "پایین", medium: "متوسط", high: "بالا", critical: "بحرانی", frozen: "فریز شده" })[r] || r;
  }

  function priorityLabelFa(p) {
    return ({ LOW: "کم", MEDIUM: "متوسط", HIGH: "زیاد" })[p] || p;
  }

  // ---------- Helpers ----------
  function getStartup(id) {
    return window.trustcData.startups.find(s => s.id === id);
  }
  function getSupplier(id) {
    return window.trustcData.suppliers.find(s => s.id === id);
  }
  function stateIndex(state) {
    return window.trustcData.procurementFSM.findIndex(s => s.state === state);
  }

  // Persian/Arabic numeral parser for input fields
  function parsePersianNumber(s) {
    if (!s) return 0;
    return Number(String(s).replace(/[۰-۹]/g, d => "۰۱۲۳۴۵۶۷۸۹".indexOf(d))
                          .replace(/[٠-٩]/g, d => "٠١٢٣٤٥٦٧٨٩".indexOf(d))
                          .replace(/[,،\s]/g, "")) || 0;
  }

  /* ----------------------------------------------------------
     Monthly aggregator
     Buckets purchases, sales, escrow lock/release and credit
     utilization across the same 6 Jalali months that data.js
     uses to fan out the synthetic history. All series are
     derived from the actual procurement/invoice records, so
     swapping data → records propagates to the dashboard charts.
     ---------------------------------------------------------- */
  const MONTHS = ["1404/10","1404/11","1404/12","1405/01","1405/02","1405/03"];
  const MONTH_LABELS_FA = ["دی","بهمن","اسفند","فروردین","اردیبهشت","خرداد"];
  const ESCROW_LOCK_IDX  = 3; // ESCROW_LOCK position in FSM
  const PAYMENT_RELEASE_IDX = 6;

  function bucketOf(jalaliDate) {
    if (!jalaliDate) return -1;
    const ym = jalaliDate.slice(0, 7); // "YYYY/MM"
    return MONTHS.indexOf(ym);
  }

  function computeStartupMonthly(startupId) {
    const procs = window.trustcData.procurements.filter(p => p.startupId === startupId);
    const invs  = window.trustcData.customerInvoices.filter(i => i.startupId === startupId);
    const startup = getStartup(startupId);
    const fsmIndex = (st) => window.trustcData.procurementFSM.findIndex(x => x.state === st);

    const purchases     = new Array(MONTHS.length).fill(0);
    const sales         = new Array(MONTHS.length).fill(0);
    const escrowInflow  = new Array(MONTHS.length).fill(0); // amount locked in month
    const escrowOutflow = new Array(MONTHS.length).fill(0); // amount released in month
    const salesPaid     = new Array(MONTHS.length).fill(0); // PAID invoices by paidAt

    procs.forEach(p => {
      const b = bucketOf(p.createdAt);
      if (b >= 0) {
        purchases[b] += p.amount;
        const sIdx = fsmIndex(p.state);
        if (sIdx >= ESCROW_LOCK_IDX) escrowInflow[b] += p.amount;
        if (sIdx >= PAYMENT_RELEASE_IDX) {
          // Payment release lands ~1 month after lock (clamped to last bucket)
          const rel = Math.min(MONTHS.length - 1, b + 1);
          escrowOutflow[rel] += p.amount;
        }
      }
    });

    invs.forEach(i => {
      const b = bucketOf(i.issuedAt);
      if (b >= 0) sales[b] += i.amount;
      if (i.status === "PAID") {
        const pb = bucketOf(i.paidAt || i.issuedAt);
        if (pb >= 0) salesPaid[pb] += i.amount;
      }
    });

    // Escrow running balance: start from current escrowBalance and walk
    // backwards through inflows/outflows to estimate history.
    const escrow = new Array(MONTHS.length).fill(0);
    let balance = startup ? startup.escrowBalance : 0;
    escrow[MONTHS.length - 1] = balance;
    for (let m = MONTHS.length - 1; m > 0; m--) {
      balance = balance - escrowInflow[m] + escrowOutflow[m];
      escrow[m - 1] = Math.max(0, balance);
    }

    // Credit utilization per month — "still-locked" credit. A
    // procurement that reached ESCROW_LOCK contributes its amount
    // from its lock-month onward, and stops contributing once its
    // PAYMENT_RELEASE month passes (modeled as lockMonth + 1).
    const creditLine = startup ? startup.creditLine : 0;
    const stillLocked = new Array(MONTHS.length).fill(0);
    procs.forEach(p => {
      const b = bucketOf(p.createdAt);
      if (b < 0) return;
      const sIdx = fsmIndex(p.state);
      if (sIdx < ESCROW_LOCK_IDX) return;
      const releaseAt = sIdx >= PAYMENT_RELEASE_IDX
        ? Math.min(MONTHS.length, b + 2)  // released by the bucket after lock
        : MONTHS.length;
      for (let m = b; m < releaseAt; m++) stillLocked[m] += p.amount;
    });
    // Keep the chart anchored to the profile's current creditUsed
    // when the last bucket has a non-zero value, but cap to creditLine.
    const lastLocked = stillLocked[MONTHS.length - 1];
    const targetUsed = startup ? startup.creditUsed : lastLocked;
    const scale = lastLocked > 0
      ? Math.min(3, Math.max(0.3, targetUsed / lastLocked))
      : 1;
    const creditUsed = stillLocked.map(v =>
      Math.min(creditLine || Infinity, Math.round(v * scale))
    );

    // Composite "credit health" score: 0–100, derived from
    // (sales growth) + (escrow buffer) − (utilization). Drives the
    // اعتبار-over-time line. Not surfaced as plain numbers anywhere.
    const score = MONTHS.map((_, m) => {
      const growth = m === 0 ? 0 : (sales[m] - sales[0]) / Math.max(1, sales[0]);
      const buffer = escrow[m] / Math.max(1, creditLine);
      const util   = creditUsed[m] / Math.max(1, creditLine);
      const raw = 60 + growth * 18 + buffer * 35 - util * 30;
      return Math.max(20, Math.min(100, Math.round(raw)));
    });

    return {
      months: MONTHS, labels: MONTH_LABELS_FA,
      purchases, sales, salesPaid,
      escrowInflow, escrowOutflow, escrow,
      creditUsed, creditLine, score,
      totals: {
        purchases: purchases.reduce((a,b) => a+b, 0),
        sales: sales.reduce((a,b) => a+b, 0),
        salesPaid: salesPaid.reduce((a,b) => a+b, 0),
        salesOpen: sales.reduce((a,b) => a+b, 0) - salesPaid.reduce((a,b) => a+b, 0),
        procCount: procs.length,
        invCount: invs.length,
      },
    };
  }

  return {
    config,
    toFaDigits,
    formatNum, formatIRR, formatIRRPlain, formatPercent,
    stateTone, stateLabelFa, riskLabelFa, priorityLabelFa,
    getStartup, getSupplier, stateIndex,
    parsePersianNumber,
    computeStartupMonthly,
  };
})();

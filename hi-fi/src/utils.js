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

  return {
    config,
    toFaDigits,
    formatNum, formatIRR, formatIRRPlain, formatPercent,
    stateTone, stateLabelFa, riskLabelFa, priorityLabelFa,
    getStartup, getSupplier, stateIndex,
    parsePersianNumber,
  };
})();

// Number/string formatters and FSM helpers — Persian-aware.
// Direct TypeScript port of hi-fi/src/utils.js (window.tc).

export type Numerals = "fa" | "fa-mixed" | "latin";
export const config: { numerals: Numerals; lang: "fa" | "en" } = {
  numerals: "fa-mixed",
  lang: "fa",
};

const FA_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

export function toFaDigits(s: string | number): string {
  return String(s).replace(/[0-9]/g, (d) => FA_DIGITS[+d]);
}

export type FormatNumOpts = { compact?: boolean; digits?: number };
export function formatNum(n: number | null | undefined, opts: FormatNumOpts = {}): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  const { compact = false, digits = 0 } = opts;
  let s: string;
  if (compact) {
    const abs = Math.abs(n);
    if (abs >= 1e12) s = (n / 1e12).toFixed(2) + " T";
    else if (abs >= 1e9) s = (n / 1e9).toFixed(2) + " B";
    else if (abs >= 1e6) s = (n / 1e6).toFixed(2) + " M";
    else if (abs >= 1e3) s = (n / 1e3).toFixed(1) + " K";
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

export type FormatIRROpts = { compact?: boolean; withUnit?: boolean; lang?: "fa" | "en" };
export function formatIRR(n: number | null | undefined, opts: FormatIRROpts = {}): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  const { compact = true, withUnit = true, lang = "fa" } = opts;
  const abs = Math.abs(n);
  let value: string;
  let unit: string;
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

export function formatIRRPlain(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  let s = n.toLocaleString("en-US");
  if (config.numerals === "fa") s = toFaDigits(s);
  return s;
}

export function formatPercent(n: number): string {
  let s = n.toFixed(1).replace(/\.0$/, "") + "%";
  if (config.numerals === "fa") s = toFaDigits(s);
  return s;
}

export type Tone = "neutral" | "warn" | "active" | "good" | "bad";

export function stateTone(state: string | undefined | null): Tone {
  if (!state) return "neutral";
  switch (state) {
    case "DRAFT":
    case "PROPOSED":
    case "CANCELLED":
      return "neutral";
    case "MANAGER_REVIEW":
    case "FINANCIAL_VALIDATION":
      return "warn";
    case "ESCROW_LOCK":
    case "SUPPLIER_DISPATCH":
    case "DELIVERY_CONFIRMATION":
    case "PAYMENT_RELEASE":
      return "active";
    case "ACCOUNTING_FINALIZATION":
    case "COMPLETED":
    case "PAID":
      return "good";
    case "FROZEN":
    case "DISPUTED":
    case "FAIL":
      return "bad";
    case "OPEN":
      return "warn";
    default:
      return "neutral";
  }
}

export function stateLabelFa(state: string): string {
  const map: Record<string, string> = {
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
    CANCELLED: "لغو شده",
  };
  return map[state] ?? state;
}

export function riskLabelFa(r: string): string {
  const map: Record<string, string> = {
    LOW: "پایین",
    MEDIUM: "متوسط",
    HIGH: "بالا",
    CRITICAL: "بحرانی",
    FROZEN: "فریز شده",
    low: "پایین",
    medium: "متوسط",
    high: "بالا",
    critical: "بحرانی",
    frozen: "فریز شده",
  };
  return map[r] ?? r;
}

export function priorityLabelFa(p: string): string {
  return ({ LOW: "کم", MEDIUM: "متوسط", HIGH: "زیاد" } as Record<string, string>)[p] ?? p;
}

// Parse Persian/Arabic-Indic digits + commas/spaces into a plain number.
export function parsePersianNumber(s: string | number | null | undefined): number {
  if (s === null || s === undefined || s === "") return 0;
  const cleaned = String(s)
    .replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d).toString())
    .replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d).toString())
    .replace(/[,،\s]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

// FSM index lookup against the canonical 8-step procurement path.
export const PROCUREMENT_FSM = [
  { state: "DRAFT", label: "پیش‌نویس" },
  { state: "MANAGER_REVIEW", label: "بررسی مدیر" },
  { state: "FINANCIAL_VALIDATION", label: "اعتبارسنجی مالی" },
  { state: "ESCROW_LOCK", label: "قفل اسکرو" },
  { state: "SUPPLIER_DISPATCH", label: "ارسال کالا" },
  { state: "DELIVERY_CONFIRMATION", label: "تأیید تحویل" },
  { state: "PAYMENT_RELEASE", label: "آزادسازی پرداخت" },
  { state: "ACCOUNTING_FINALIZATION", label: "نهایی‌سازی حسابداری" },
] as const;

export function stateIndex(state: string): number {
  return PROCUREMENT_FSM.findIndex((s) => s.state === state);
}

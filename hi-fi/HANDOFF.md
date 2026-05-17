# trustC — Claude Code Handoff Document

این سند راهنمای پیاده‌سازی طراحی hi-fi به MVP موجود است.

## مرور سریع پروژه

- **سیستم طراحی:** TRADE Protocol Design System، با Vazirmatn به‌جای IBM Plex Sans برای فارسی RTL
- **پروتوتایپ HTML:** `index.html` در ریشه پروژه
- **پلتفرم هدف:** [`bikh3rad/trustc`](https://github.com/bikh3rad/trustc) (React + TypeScript + Vite + Go gRPC backend)

## نگاشت فایل به فایل

| فایل پروتوتایپ (طراحی) | معادل React+TS در ریپو هدف |
|---|---|
| `src/tokens.css` | `frontend/src/styles/tokens.css` (جدید) |
| `src/styles.css` | `frontend/src/styles/globals.css` (جدید) |
| `src/data.js` | داده‌ها از API می‌آیند — فقط نوع‌بندی TypeScript نیاز است |
| `src/utils.js` | `frontend/src/lib/format.ts` (تبدیل به TS) |
| `src/components.jsx` | `frontend/src/components/ui/` (هر کامپوننت یک فایل) |
| `src/Shell.jsx` | `frontend/src/layout/Sidebar.tsx` + `Topbar.tsx` + `PersonaContext.tsx` |
| `src/founder-screens.jsx` | `frontend/src/modules/Dashboard.tsx` + `Procurements.tsx` + `ProcurementDetail.tsx` + `NewProcurement.tsx` |
| `src/founder-screens-2.jsx` | `Invoices.tsx` + `Escrow.tsx` + `Ledger.tsx` |
| `src/vc-screens.jsx` | `frontend/src/modules/vc/Portfolio.tsx` + `Recycling.tsx` + `KillSwitch.tsx` |
| `src/auditor-screens.jsx` | `frontend/src/modules/auditor/Audit.tsx` + `Reports.tsx` (+ ۴ کامپوننت Doc برای انواع گزارش) |
| `src/App.jsx` | `frontend/src/App.tsx` + router + Context |

## توکن‌های CSS — منبع واحد حقیقت

تمام رنگ‌ها، فونت‌ها، فاصله‌ها در `src/tokens.css` تعریف شده‌اند. هر کامپوننت از `var(--*)` استفاده می‌کند، **هرگز** مقدار خام (مثل `#0E1B2C`). در پیاده‌سازی:

```css
/* tokens.css در head/styles ایمپورت شود */
@import url("./tokens.css");
```

تم تاریک از طریق `[data-theme="dark"]` روی `<html>` فعال می‌شود.
چگالی متراکم از طریق `[data-density="dense"]`.

## پرسوناها (Persona Context)

سه پرسونا:
- `FOUNDER` — بنیان‌گذار/اپراتور استارتاپ
- `VC` — مدیر صندوق سرمایه‌گذاری
- `AUDITOR` — حسابرس/ممیز

ساختار context پیشنهادی:

```tsx
// PersonaContext.tsx
type Persona = "FOUNDER" | "VC" | "AUDITOR";
const PersonaContext = createContext<{ persona: Persona; setPersona: (p: Persona) => void }>(...);
```

ناوبری بر اساس پرسونا تغییر می‌کند — منطق در `src/Shell.jsx` تابع `navFor(persona)` را ببینید.

## ماشین حالت خرید (FSM)

این هسته‌ی پلتفرم است. ۸ حالت با ترتیب دقیق:

```
DRAFT → MANAGER_REVIEW → FINANCIAL_VALIDATION → ESCROW_LOCK →
SUPPLIER_DISPATCH → DELIVERY_CONFIRMATION → PAYMENT_RELEASE →
ACCOUNTING_FINALIZATION
```

- منبع حقیقت: `src/data.js` → `procurementFSM`
- در بک‌اند: `services/procurement` (مسیر FSM آنجاست)
- در فرانت: کامپوننت `<FSM currentState={...} />` در `src/components.jsx`
- هر گذار باید:
  1. وضعیت در `services/procurement` آپدیت شود
  2. سند دفتر کل در `services/ledger` ثبت شود (برای ESCROW_LOCK و PAYMENT_RELEASE)
  3. رویداد audit در `services/audit` ثبت شود
  4. anim استامپ در UI نمایش داده شود (برای ESCROW_LOCK، PAYMENT_RELEASE، DELIVERY_CONFIRMATION، ACCOUNTING_FINALIZATION)

## قوانین غیرقابل‌مذاکره (از CLAUDE.md پروژه شما)

این قوانین باید در UI **و** بک‌اند رعایت شوند:

1. **Append-only ledger.** صفحه دفتر کل (`Ledger.tsx`) فقط نمایش می‌دهد، هرگز ویرایش نمی‌کند. هر اصلاح یک سند معکوس می‌خواهد.
2. **توازن** ∑ Debits = ∑ Credits. در UI، استت "تراز" را همیشه نمایش بدهید.
3. **Escrow-first.** دکمه «پرداخت مستقیم» وجود ندارد. فقط مسیر FSM.
4. **Audit everything.** هر کلیک روی دکمه‌های اقدام (تأیید، فریز، آزادسازی، …) رویداد audit می‌فرستد.

## Kill Switch — جریان

```
VC در KillSwitch.tsx کلیک می‌کند
  ↓
Modal تأیید + فرم دلیل/دامنه/مدت
  ↓
POST /gateway/v1/governance/freeze { startupId, scope, duration, reason }
  ↓
services/governance رویداد FreezeActivated را پابلیش می‌کند
  ↓
services/procurement همه requests این startup را به FROZEN منتقل می‌کند
  ↓
services/escrow پرداخت‌ها را معلق می‌کند
  ↓
UI استارتاپ تحت تأثیر: `.frozen-overlay` + `.frozen-banner` نمایش داده می‌شود
  + همه دکمه‌های اقدام `disabled` می‌شوند
```

CSS effects در `styles.css`:
- `.frozen-overlay` — لایه ضربدری روی کل صفحه
- `.frozen-banner` — بنر بالایی با نقطه چشمک‌زن

در React، یک hook `useFrozen(startupId)` بسازید که از وضعیت سرور می‌خواند.

## دو الگوی تسویه

PRD §3.3 / §6.3 — هر فاکتور فروش یکی از این دو است:

```ts
type SettlementMode = "ESCROW_DIRECT" | "SELF_FUNDED";
```

- `ESCROW_DIRECT` → پرداخت به حساب امانی پلتفرم، سرفصل `2103_FIDUCIARY_ESCROW`
- `SELF_FUNDED` → پرداخت به حساب شرکت، سپس شارژ خط اعتباری

هر دو در `Invoices.tsx` نمایش داده می‌شوند. نشانه رنگی متفاوت (آبی برای ESCROW، سبز برای SELF_FUNDED).

## گزارش‌های PDF-style

چهار سند رسمی در `auditor-screens.jsx`:
1. **ترازنامه** — `BalanceSheetDoc`
2. **سود و زیان** — `PnLDoc`
3. **اظهارنامه سامانه مودیان** — `TaxComplianceDoc` (با ساعت رسمی فارسی)
4. **گزارش وجوه امانی** — `EscrowReportDoc`

همه از کامپوننت `<Doc>` در `components.jsx` استفاده می‌کنند که corner-tick borders را اضافه می‌کند (سبک سند رسمی، نه کارت).

**برای PDF واقعی** از react-pdf یا puppeteer در سمت سرور استفاده کنید. کامپوننت‌های Doc کاملاً flat هستند، یعنی به‌راحتی به PDF تبدیل می‌شوند.

## محرک‌های Live (انیمیشن)

| موقعیت | انیمیشن |
|---|---|
| پیشروی FSM به ESCROW_LOCK | `.stamp` با متن "ESCROW LOCKED" |
| پیشروی FSM به PAYMENT_RELEASE | `.stamp` با متن "PAYMENT RELEASED" |
| ثبت سند دفتر کل | `.ledger-row.fresh` flash نارنجی ۴۸۰ms |
| ارتقای خط اعتباری | کارت navy در گوشه پایین، animation `fly` ۸۰۰ms |
| اجرای چرخه بازیافت | همه `.queue-item.flying` با animation `fly` |
| Kill Switch | `.frozen-overlay` fade-in + bash bar |

همه CSS easings از تم استفاده می‌کنند: `var(--ease-document)` یا `var(--ease-mech)`.

## فرمت‌بندی اعداد فارسی

`src/utils.js` → `window.tc.formatIRR()`:
- مقدارهای کوچک: کاما-جداشده، مثلاً `48,500,000,000`
- مقدارهای بزرگ: خلاصه، مثلاً `48.5 میلیارد`
- ارقام: لاتین (پیش‌فرض) یا فارسی (با `tc.config.numerals = "fa"`)

پیشنهاد برای React+TS:
```ts
// lib/format.ts
export function formatIRR(n: number, opts?: { compact?: boolean }): string { ... }
export function toFaDigits(s: string): string { ... }
```

## دامنه MVP فعلی شما (از README ریپو)

طبق README، MVP شما در فاز ۱ است (procurement vertical). با این طراحی:
- ✅ Procurements: کامل با FSM زنده
- ✅ Escrow: کامل با تفکیک مالیاتی
- ✅ Ledger: نمایش زنده + رنگ‌بندی sources
- ✅ Audit: append-only با hash chain visual
- ✅ Governance (Kill Switch): تأیید مدالی + overlay
- ⚠ Reports: حسابرس/PDF — backend شما هنوز ندارد، اما UI آماده است
- ⚠ Recycling Queue: backend `services/credit` در PRD هست ولی هنوز پیاده نشده
- ⚠ Invoices: backend `services/invoice` در PRD هست ولی هنوز پیاده نشده

برای اولویت‌بندی پیاده‌سازی، با Procurements + Escrow + Ledger شروع کنید (همه مسیر کامل MVP فاز ۱).

## نکات RTL در پیاده‌سازی

- روی `<html dir="rtl" lang="fa">` — مهم برای flex direction خودکار
- در CSS از `inset-inline-start/-end` به‌جای `left/right` استفاده کنید (همه‌جا در `styles.css` رعایت شده)
- در `.nav-item.active` border indicator هم در RTL هم LTR کار می‌کند (دو rule جدا)
- صبر کنید: بعضی charts (SVG) به RTL تأثیر می‌گیرند — یا transform `scaleX(-1)` کنید یا مختصاتشان را آینه کنید

## ساختار پوشه پیشنهادی برای فرانت

```
frontend/src/
  styles/
    tokens.css
    globals.css
  lib/
    format.ts
    api.ts          (موجود)
    auth.ts
  components/
    ui/
      Btn.tsx
      Chip.tsx
      Stat.tsx
      Modal.tsx
      FSM.tsx
      Spark.tsx
      Doc.tsx
      ProgressBar.tsx
    Icon.tsx
  layout/
    Sidebar.tsx
    Topbar.tsx
    AppShell.tsx
  context/
    PersonaContext.tsx
    FrozenContext.tsx
  modules/
    founder/
      Dashboard.tsx
      Procurements.tsx
      ProcurementDetail.tsx
      NewProcurement.tsx
      Invoices.tsx
      Escrow.tsx
      Ledger.tsx
    vc/
      Portfolio.tsx
      Recycling.tsx
      KillSwitch.tsx
    auditor/
      Audit.tsx
      Reports.tsx
      docs/
        BalanceSheet.tsx
        PnL.tsx
        TaxCompliance.tsx
        EscrowReport.tsx
  App.tsx
  main.tsx
```

## تست‌های پیشنهادی

1. **FSM gating:** تست کنید که نمی‌توان از DRAFT مستقیم به ESCROW_LOCK پرید
2. **Frozen blocks:** هر POST بعد از فریز باید 403 بدهد
3. **Ledger balance:** هر تراکنش آماده‌شده باید Σ Debits = Σ Credits
4. **Audit hash chain:** هر رویداد جدید باید `prev_hash` معتبر داشته باشد

## سوالات باز که باید پاسخ بدهید

- آیا multi-tenancy می‌خواهید؟ در طراحی، فرض شده هر کاربر یک شرکت می‌بیند. اگر یک بنیان‌گذار چندین شرکت داشته باشد، باید context selector اضافه شود.
- زبان: آیا i18n کامل می‌خواهید (انگلیسی هم)؟ در طراحی، dir/lang نوار بالا قابل سوییچ است ولی متن‌های UI هاردکدشده فارسی هستند.
- آیا برای حسابرس مستقل دسترسی read-only می‌خواهید روی کل سیستم، یا فقط audit log؟

---

طراحی پروژه آماده پیاده‌سازی است. هر سوال داشتی، در ایشوت‌های ریپو مطرح کن.

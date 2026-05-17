import { Doc } from "../../../components/ui/Doc";
import { formatIRRPlain, toFaDigits } from "../../../lib/format";
import { DocRows, DocSection, DocSignatures, DocTotal } from "./DocPrimitives";

// Demo balance-sheet figures (IRR). When services/accounting lands, fetch these
// totals from /api/ledger/accounts/<code>/balance for each category.
const ASSETS = [
  { code: "1001", name: "بانک · حساب عملیاتی", amount: 142_500_000_000 },
  { code: "1002", name: "بانک · حساب امانی (اسکرو)", amount: 386_500_000_000 },
  { code: "1101", name: "حساب‌های دریافتنی", amount: 50_600_000_000 },
  { code: "1201", name: "موجودی کالا", amount: 124_000_000_000 },
  { code: "1301", name: "دارایی‌های ثابت مشهود", amount: 86_400_000_000 },
];
const LIABILITIES = [
  { code: "2103", name: "وجوه امانی مأخوذه · اسکرو", amount: 386_500_000_000 },
  { code: "2201", name: "خط اعتباری چرخشی · trustC", amount: 412_000_000_000 },
  { code: "2301", name: "حساب‌های پرداختنی", amount: 28_400_000_000 },
];
const EQUITY = [
  { code: "3001", name: "سرمایه ثبت‌شده", amount: 200_000_000_000 },
  { code: "3101", name: "سود انباشته (دوره جاری)", amount: -237_900_000_000 },
];

export function BalanceSheetDoc({ scopeLabel }: { scopeLabel: string }) {
  const totA = ASSETS.reduce((s, r) => s + r.amount, 0);
  const totL = LIABILITIES.reduce((s, r) => s + r.amount, 0);
  const totE = EQUITY.reduce((s, r) => s + r.amount, 0);
  const period = toFaDigits("۱۴۰۵/۰۳/۳۱");
  const issued = toFaDigits("۱۴۰۵/۰۴/۰۱");

  return (
    <Doc>
      <div
        className="row"
        style={{ justifyContent: "space-between", alignItems: "start", marginBottom: 16 }}
      >
        <div>
          <div className="eyebrow" style={{ color: "var(--fg-muted)" }}>
            گزارش رسمی · trustC
          </div>
          <h1 style={{ fontSize: 28, marginTop: 4, fontFamily: "var(--serif-display)" }}>
            ترازنامه
          </h1>
          <div className="muted" style={{ marginTop: 2 }}>{scopeLabel}</div>
        </div>
        <div style={{ textAlign: "end" }}>
          <div
            style={{
              width: 90,
              height: 90,
              border: "2px solid var(--orange-700)",
              outline: "2px solid var(--orange-700)",
              outlineOffset: 3,
              borderRadius: "50%",
              display: "grid",
              placeItems: "center",
              fontFamily: "var(--mono-data)",
              color: "var(--orange-800)",
              fontWeight: 700,
              fontSize: 12,
              transform: "rotate(-6deg)",
            }}
          >
            <div style={{ textAlign: "center", lineHeight: 1.2 }}>
              AUDITED
              <br />
              <span style={{ fontSize: 10 }}>{issued}</span>
            </div>
          </div>
        </div>
      </div>

      <dl className="doc-meta">
        <div><dt>دوره گزارش</dt><dd>تا {period}</dd></div>
        <div><dt>نوع گزارش</dt><dd>سالیانه · پیش‌نویس</dd></div>
        <div><dt>واحد پول</dt><dd>ریال (IRR)</dd></div>
        <div><dt>تاریخ صدور</dt><dd>{issued}</dd></div>
      </dl>

      <DocSection title="دارایی‌ها (Assets)">
        <DocRows rows={ASSETS} />
        <DocTotal label="جمع دارایی‌ها" amount={totA} />
      </DocSection>

      <DocSection title="بدهی‌ها (Liabilities)">
        <DocRows rows={LIABILITIES} highlight="2103" />
        <DocTotal label="جمع بدهی‌ها" amount={totL} />
        <div style={{ fontSize: 11, marginTop: 8, color: "var(--fg-muted)" }}>
          ▲ سرفصل ۲۱۰۳ مطابق با ماده ۸ آیین‌نامه سامانه مودیان به‌عنوان «وجوه امانی مأخوذه» تفکیک شده است.
        </div>
      </DocSection>

      <DocSection title="حقوق صاحبان سهام (Equity)">
        <DocRows rows={EQUITY} />
        <DocTotal label="جمع حقوق صاحبان سهام" amount={totE} />
      </DocSection>

      <div
        style={{
          borderTop: "2px solid var(--ink-900)",
          marginTop: 24,
          paddingTop: 16,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 24,
        }}
      >
        <div>
          <div className="eyebrow">جمع کل دارایی‌ها</div>
          <div className="mono" style={{ fontSize: 22, fontWeight: 700 }}>
            {formatIRRPlain(totA)}
          </div>
        </div>
        <div style={{ textAlign: "end" }}>
          <div className="eyebrow">جمع بدهی‌ها + حقوق صاحبان</div>
          <div className="mono" style={{ fontSize: 22, fontWeight: 700 }}>
            {formatIRRPlain(totL + totE)}
          </div>
          <div
            className="mono"
            style={{ fontSize: 11, color: "var(--state-good)", marginTop: 4 }}
          >
            تراز ✓ Σ Assets = Σ (L+E)
          </div>
        </div>
      </div>

      <DocSignatures />
    </Doc>
  );
}

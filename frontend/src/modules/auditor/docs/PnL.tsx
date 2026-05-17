import { Doc } from "../../../components/ui/Doc";
import { formatIRRPlain, toFaDigits } from "../../../lib/format";
import { DocRows, DocSection, DocSignatures, DocTotal } from "./DocPrimitives";

const REVENUE = [
  { code: "4001", name: "درآمد فروش خدمات", amount: 542_300_000_000 },
  { code: "4002", name: "درآمد فروش کالا", amount: 124_000_000_000 },
  { code: "4101", name: "درآمدهای متفرقه", amount: 8_900_000_000 },
];
const COGS = [
  { code: "5001", name: "بهای تمام‌شده فروش", amount: -312_400_000_000 },
];
const OPEX = [
  { code: "5101", name: "حقوق و دستمزد", amount: -184_200_000_000 },
  { code: "5102", name: "خدمات زیرساخت", amount: -42_600_000_000 },
  { code: "5103", name: "بازاریابی", amount: -28_800_000_000 },
  { code: "5104", name: "اداری و دفتری", amount: -16_100_000_000 },
];

export function PnLDoc({ scopeLabel }: { scopeLabel: string }) {
  const totR = REVENUE.reduce((s, r) => s + r.amount, 0);
  const totC = COGS.reduce((s, r) => s + r.amount, 0);
  const gross = totR + totC;
  const totO = OPEX.reduce((s, r) => s + r.amount, 0);
  const opIncome = gross + totO;
  const issued = toFaDigits("۱۴۰۵/۰۴/۰۱");

  return (
    <Doc>
      <div className="eyebrow" style={{ color: "var(--fg-muted)" }}>
        گزارش رسمی · trustC
      </div>
      <h1 style={{ fontSize: 28, fontFamily: "var(--serif-display)" }}>
        صورت سود و زیان
      </h1>
      <div className="muted">
        {scopeLabel} · دوره منتهی به {toFaDigits("۱۴۰۵/۰۳/۳۱")}
      </div>

      <dl className="doc-meta">
        <div><dt>دوره</dt><dd>۹۰ روزه</dd></div>
        <div><dt>نوع</dt><dd>عملیاتی</dd></div>
        <div><dt>واحد</dt><dd>ریال (IRR)</dd></div>
        <div><dt>صدور</dt><dd>{issued}</dd></div>
      </dl>

      <DocSection title="درآمدها">
        <DocRows rows={REVENUE} />
        <DocTotal label="جمع درآمدها" amount={totR} tone="good" />
      </DocSection>
      <DocSection title="بهای تمام‌شده">
        <DocRows rows={COGS} />
        <DocTotal label="سود ناخالص" amount={gross} bold tone="good" />
      </DocSection>
      <DocSection title="هزینه‌های عملیاتی">
        <DocRows rows={OPEX} />
        <DocTotal
          label="سود (زیان) عملیاتی"
          amount={opIncome}
          bold
          tone={opIncome >= 0 ? "good" : "bad"}
        />
      </DocSection>

      <div
        style={{
          borderTop: "2px solid var(--ink-900)",
          marginTop: 24,
          paddingTop: 16,
          textAlign: "end",
        }}
      >
        <div className="eyebrow">سود/زیان دوره</div>
        <div
          className="mono"
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: opIncome >= 0 ? "var(--state-good)" : "var(--state-bad)",
          }}
        >
          {formatIRRPlain(opIncome)}
        </div>
      </div>
      <DocSignatures />
    </Doc>
  );
}

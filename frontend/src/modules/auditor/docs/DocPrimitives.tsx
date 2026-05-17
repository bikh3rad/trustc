import type { ReactNode } from "react";
import { formatIRRPlain } from "../../../lib/format";

export type DocRow = { code: string; name: string; amount: number };

export function DocSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ marginTop: 24 }}>
      <h3
        style={{
          fontSize: 16,
          fontFamily: "var(--sans-text)",
          fontWeight: 700,
          borderBottom: "1px solid var(--ink-300)",
          paddingBottom: 6,
          marginBottom: 8,
        }}
      >
        {title}
      </h3>
      {children}
    </section>
  );
}

export function DocRows({ rows, highlight }: { rows: DocRow[]; highlight?: string }) {
  return (
    <div>
      {rows.map((r) => (
        <div
          key={r.code}
          style={{
            display: "grid",
            gridTemplateColumns: "auto 1fr auto",
            gap: 12,
            padding: "8px 0",
            borderBottom: "1px dotted var(--ink-200)",
            fontSize: 14,
            background: r.code === highlight ? "rgba(210,105,30,0.06)" : "transparent",
          }}
        >
          <span className="mono muted" style={{ fontSize: 12, width: 48 }}>
            {r.code}
          </span>
          <span>{r.name}</span>
          <span className="mono" style={{ fontVariantNumeric: "tabular-nums" }}>
            {formatIRRPlain(r.amount)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function DocTotal({
  label,
  amount,
  bold,
  tone,
}: {
  label: string;
  amount: number;
  bold?: boolean;
  tone?: "good" | "bad" | "";
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr auto",
        gap: 12,
        padding: "10px 0",
        borderTop: "1px solid var(--ink-900)",
        marginTop: 4,
        fontSize: 14,
        fontWeight: bold ? 700 : 600,
        color:
          tone === "good"
            ? "var(--state-good)"
            : tone === "bad"
              ? "var(--state-bad)"
              : "var(--ink-900)",
      }}
    >
      <span>{label}</span>
      <span className="mono">{formatIRRPlain(amount)}</span>
    </div>
  );
}

export function DocSignatures() {
  const sigs = [
    { role: "مدیرعامل", name: "بنیان‌گذار شرکت" },
    { role: "مدیر مالی", name: "اپراتور مالی" },
    { role: "حسابرس مستقل", name: "—" },
  ];
  return (
    <div
      style={{
        marginTop: 48,
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        gap: 32,
      }}
    >
      {sigs.map((s) => (
        <div
          key={s.role}
          style={{ borderTop: "1px solid var(--ink-700)", paddingTop: 8, textAlign: "center" }}
        >
          <div className="eyebrow">{s.role}</div>
          <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>{s.name}</div>
        </div>
      ))}
    </div>
  );
}

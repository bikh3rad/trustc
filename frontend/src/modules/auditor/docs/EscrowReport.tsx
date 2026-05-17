import { useEffect, useState } from "react";
import { Procurements as ProcurementsApi, type Procurement } from "../../../api";
import { Doc } from "../../../components/ui/Doc";
import { Chip } from "../../../components/ui/Chip";
import { formatIRRPlain, toFaDigits } from "../../../lib/format";
import { isEscrowLocked } from "../../../lib/fsm";

export function EscrowReportDoc({
  scopeLabel,
  startupId,
}: {
  scopeLabel: string;
  startupId?: string | null;
}) {
  const [procs, setProcs] = useState<Procurement[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const r = await ProcurementsApi.list(startupId ?? undefined);
        setProcs(r.procurements.filter((p) => isEscrowLocked(p.state)));
      } catch {
        setProcs([]);
      }
    })();
  }, [startupId]);

  const tot = procs.reduce((s, p) => s + p.amount_cents, 0);

  return (
    <Doc>
      <div className="eyebrow" style={{ color: "var(--fg-muted)" }}>
        گزارش حسابرسی · trustC
      </div>
      <h1 style={{ fontSize: 28, fontFamily: "var(--serif-display)" }}>
        گردش وجوه امانی
      </h1>
      <div className="muted">{scopeLabel} · همه قفل‌های اسکرو</div>

      <dl className="doc-meta">
        <div>
          <dt>سرفصل</dt>
          <dd className="mono">2103_FIDUCIARY_ESCROW</dd>
        </div>
        <div>
          <dt>قفل‌ها</dt>
          <dd>{toFaDigits(procs.length)} مورد</dd>
        </div>
        <div>
          <dt>واحد</dt>
          <dd>ریال</dd>
        </div>
        <div>
          <dt>صدور</dt>
          <dd>{toFaDigits("۱۴۰۵/۰۴/۰۱")}</dd>
        </div>
      </dl>

      <div className="responsive-table-card" style={{ marginTop: 16 }}>
      <table
        className="table"
        style={{
          background: "transparent",
          border: "1px solid var(--ink-200)",
        }}
      >
        <thead>
          <tr>
            <th>شناسه</th>
            <th>شرح</th>
            <th>وضعیت</th>
            <th className="num">مبلغ (ریال)</th>
          </tr>
        </thead>
        <tbody>
          {procs.map((p) => (
            <tr key={p.id}>
              <td className="mono" style={{ fontSize: 11 }}>{p.id.slice(0, 8)}</td>
              <td>{p.title} · {p.supplier_name}</td>
              <td><Chip state={p.state} /></td>
              <td className="num">{formatIRRPlain(p.amount_cents)}</td>
            </tr>
          ))}
          {procs.length === 0 && (
            <tr>
              <td colSpan={4} style={{ textAlign: "center", color: "var(--fg-muted)", padding: 24 }}>
                هنوز قفلی ثبت نشده.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      </div>
      <div
        style={{
          borderTop: "2px solid var(--ink-900)",
          marginTop: 16,
          paddingTop: 12,
          textAlign: "end",
        }}
      >
        <span className="eyebrow">جمع کل وجوه امانی · </span>
        <span className="mono" style={{ fontSize: 20, fontWeight: 700, marginInlineStart: 8 }}>
          {formatIRRPlain(tot)} ریال
        </span>
      </div>
    </Doc>
  );
}

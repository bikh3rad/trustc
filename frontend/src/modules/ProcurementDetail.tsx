import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Procurements as ProcurementsApi,
  type Procurement,
  type WorkflowTransition,
} from "../api";
import { formatCents } from "../format";

const FSM_PATH = [
  "DRAFT",
  "MANAGER_REVIEW",
  "FINANCIAL_VALIDATION",
  "ESCROW_LOCK",
  "SUPPLIER_DISPATCH",
  "DELIVERY_CONFIRMATION",
  "PAYMENT_RELEASE",
  "ACCOUNTING_FINALIZATION",
];

const NEXT: Record<string, string[]> = {
  DRAFT: ["MANAGER_REVIEW", "CANCELLED"],
  MANAGER_REVIEW: ["FINANCIAL_VALIDATION", "CANCELLED"],
  FINANCIAL_VALIDATION: ["ESCROW_LOCK", "CANCELLED"],
  ESCROW_LOCK: ["SUPPLIER_DISPATCH"],
  SUPPLIER_DISPATCH: ["DELIVERY_CONFIRMATION"],
  DELIVERY_CONFIRMATION: ["PAYMENT_RELEASE"],
  PAYMENT_RELEASE: ["ACCOUNTING_FINALIZATION"],
};

export function ProcurementDetail() {
  const { id } = useParams<{ id: string }>();
  const [proc, setProc] = useState<Procurement | null>(null);
  const [history, setHistory] = useState<WorkflowTransition[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    if (!id) return;
    try {
      const p = await ProcurementsApi.get(id);
      const h = await ProcurementsApi.history(id);
      setProc(p);
      setHistory(h.history);
    } catch (e) {
      setErr((e as Error).message);
    }
  }
  useEffect(() => { void refresh(); /* eslint-disable-next-line */ }, [id]);

  async function transition(to: string) {
    if (!id) return;
    setBusy(true);
    setErr(null);
    try {
      await ProcurementsApi.transition(id, to);
      await refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!proc) return <div>Loading…</div>;
  const currentIdx = FSM_PATH.indexOf(proc.state);
  const next = NEXT[proc.state] ?? [];

  return (
    <div>
      <h1>{proc.title}</h1>
      <div className="sub">
        {proc.supplier_name} · {formatCents(proc.amount_cents)} {proc.currency} · <span className={`badge ${proc.state}`}>{proc.state}</span>
      </div>
      {err && <div className="error">{err}</div>}

      <div className="fsm-track">
        {FSM_PATH.map((s, i) => (
          <div key={s} className={`fsm-step ${i < currentIdx ? "done" : i === currentIdx ? "current" : ""}`}>
            {s.replace(/_/g, " ")}
          </div>
        ))}
      </div>

      <div className="actions">
        {next.map((to) => (
          <button key={to} className={to === "CANCELLED" ? "danger" : ""} disabled={busy} onClick={() => transition(to)}>
            {to === "CANCELLED" ? "Cancel" : `→ ${to.replace(/_/g, " ")}`}
          </button>
        ))}
        {!next.length && <span style={{ color: "var(--text-dim)" }}>Terminal state.</span>}
      </div>

      <h2>Transition history</h2>
      <div className="card" style={{ padding: 0 }}>
        <table>
          <thead>
            <tr><th>Time</th><th>From</th><th>To</th><th>Actor</th><th>Reason</th></tr>
          </thead>
          <tbody>
            {history.map((h, i) => (
              <tr key={i}>
                <td>{new Date(h.transitioned_at).toLocaleString()}</td>
                <td>{h.from_state ?? "—"}</td>
                <td><span className={`badge ${h.to_state}`}>{h.to_state}</span></td>
                <td>{h.actor_role ?? "—"}</td>
                <td>{h.reason ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

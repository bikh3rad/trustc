import { useEffect, useState } from "react";
import { Audit, Startups, type Startup, type AuditRecord } from "../api";
import { formatCents } from "../format";

export function Dashboard() {
  const [startups, setStartups] = useState<Startup[]>([]);
  const [audit, setAudit] = useState<AuditRecord[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const s = await Startups.list();
        setStartups(s.startups);
        const a = await Audit.list({ limit: 8 });
        setAudit(a.records);
      } catch (e) {
        setErr((e as Error).message);
      }
    })();
  }, []);

  const aggBurn = startups.reduce((acc, s) => acc + s.burn_rate_cents, 0);
  const avgScore = startups.length
    ? Math.round(startups.reduce((a, s) => a + s.credit_score, 0) / startups.length)
    : 0;
  const highRisk = startups.filter((s) => s.risk_level === "HIGH" || s.risk_level === "CRITICAL").length;

  return (
    <div>
      <h1>Portfolio</h1>
      <div className="sub">Live view across all portfolio startups.</div>
      {err && <div className="error">{err}</div>}

      <div className="grid cols-4">
        <div className="card metric">
          <div className="label">Startups</div>
          <div className="value">{startups.length}</div>
        </div>
        <div className="card metric">
          <div className="label">Aggregate burn (monthly)</div>
          <div className="value">{formatCents(aggBurn)}</div>
        </div>
        <div className="card metric">
          <div className="label">Avg credit score</div>
          <div className="value">{avgScore}</div>
        </div>
        <div className="card metric">
          <div className="label">High-risk startups</div>
          <div className="value">{highRisk}</div>
        </div>
      </div>

      <h2>Portfolio</h2>
      <div className="card" style={{ padding: 0 }}>
        <table>
          <thead>
            <tr>
              <th>Startup</th>
              <th>Industry</th>
              <th>Country</th>
              <th>Credit</th>
              <th>Burn / mo</th>
              <th>Risk</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {startups.map((s) => (
              <tr key={s.id}>
                <td>{s.startup_name}</td>
                <td>{s.industry}</td>
                <td>{s.country}</td>
                <td>{s.credit_score}</td>
                <td>{formatCents(s.burn_rate_cents)}</td>
                <td><span className={`badge ${s.risk_level}`}>{s.risk_level}</span></td>
                <td><span className="badge">{s.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Recent audit events</h2>
      <div className="card" style={{ padding: 0 }}>
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Service</th>
              <th>Event</th>
              <th>Subject</th>
              <th>Actor</th>
            </tr>
          </thead>
          <tbody>
            {audit.map((a) => (
              <tr key={a.event_id}>
                <td>{new Date(a.recorded_at).toLocaleString()}</td>
                <td>{a.service}</td>
                <td><code>{a.event_type}</code></td>
                <td><code>{a.subject_type ?? "-"}/{(a.subject_id ?? "").slice(0, 8)}</code></td>
                <td>{a.actor_role || "-"}</td>
              </tr>
            ))}
            {!audit.length && (
              <tr><td colSpan={5} style={{ textAlign: "center", color: "var(--text-dim)" }}>No events yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

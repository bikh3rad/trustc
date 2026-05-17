import { useEffect, useState } from "react";
import { Audit as AuditApi, type AuditRecord } from "../api";

export function Audit() {
  const [records, setRecords] = useState<AuditRecord[]>([]);
  const [filter, setFilter] = useState({ event_type: "", subject_type: "" });
  const [err, setErr] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  async function refresh() {
    try {
      const r = await AuditApi.list({ ...filter, limit: 200 });
      setRecords(r.records);
    } catch (e) {
      setErr((e as Error).message);
    }
  }
  useEffect(() => { void refresh(); /* eslint-disable-next-line */ }, [filter.event_type, filter.subject_type]);

  return (
    <div>
      <h1>Audit log</h1>
      <div className="sub">Append-only, SHA-256 chained. Every system event ends up here.</div>
      {err && <div className="error">{err}</div>}

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="grid cols-3">
          <div>
            <div style={{ color: "var(--text-dim)", fontSize: 12, marginBottom: 4 }}>Event type</div>
            <input placeholder="trustc.escrow.locked" value={filter.event_type}
                   onChange={(e) => setFilter({ ...filter, event_type: e.target.value })} />
          </div>
          <div>
            <div style={{ color: "var(--text-dim)", fontSize: 12, marginBottom: 4 }}>Subject type</div>
            <input placeholder="procurement_request" value={filter.subject_type}
                   onChange={(e) => setFilter({ ...filter, subject_type: e.target.value })} />
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <table>
          <thead>
            <tr>
              <th>Seq</th><th>Time</th><th>Service</th><th>Event</th><th>Subject</th><th>Actor</th><th></th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <>
                <tr key={r.event_id}>
                  <td><code>{r.seq}</code></td>
                  <td>{new Date(r.recorded_at).toLocaleString()}</td>
                  <td>{r.service}</td>
                  <td><code>{r.event_type}</code></td>
                  <td><code>{r.subject_type}/{(r.subject_id ?? "").slice(0, 8)}</code></td>
                  <td>{r.actor_role || "—"}</td>
                  <td>
                    <button className="secondary" onClick={() => setExpanded(expanded === r.event_id ? null : r.event_id)}>
                      {expanded === r.event_id ? "Hide" : "Details"}
                    </button>
                  </td>
                </tr>
                {expanded === r.event_id && (
                  <tr key={r.event_id + "-d"}>
                    <td colSpan={7}>
                      <pre>{JSON.stringify({
                        event_id: r.event_id,
                        request_id: r.request_id,
                        previous_hash: r.previous_hash,
                        signature: r.signature,
                        payload: r.payload,
                      }, null, 2)}</pre>
                    </td>
                  </tr>
                )}
              </>
            ))}
            {!records.length && (
              <tr><td colSpan={7} style={{ textAlign: "center", color: "var(--text-dim)" }}>No audit records.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

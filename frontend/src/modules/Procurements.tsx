import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Procurements as ProcurementsApi,
  Startups as StartupsApi,
  type Procurement,
  type Startup,
} from "../api";
import { formatCents } from "../format";

export function Procurements() {
  const [list, setList] = useState<Procurement[]>([]);
  const [startups, setStartups] = useState<Startup[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState({
    startup_id: "",
    title: "",
    supplier_name: "",
    amount_usd: "",
    category: "SERVICE",
    priority: "MEDIUM",
    description: "",
  });

  async function refresh() {
    try {
      const [p, s] = await Promise.all([ProcurementsApi.list(), StartupsApi.list()]);
      setList(p.procurements);
      setStartups(s.startups);
      if (!form.startup_id && s.startups.length) {
        setForm((f) => ({ ...f, startup_id: s.startups[0].id }));
      }
    } catch (e) {
      setErr((e as Error).message);
    }
  }
  useEffect(() => { void refresh(); /* eslint-disable-next-line */ }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      const amount_cents = Math.round(parseFloat(form.amount_usd) * 100);
      await ProcurementsApi.create({
        startup_id: form.startup_id,
        title: form.title,
        supplier_name: form.supplier_name,
        amount_cents,
        currency: "USD",
        category: form.category,
        priority: form.priority,
        description: form.description,
      });
      setForm({ ...form, title: "", supplier_name: "", amount_usd: "", description: "" });
      await refresh();
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  return (
    <div>
      <h1>Procurements</h1>
      <div className="sub">Create a procurement request. It will enter the FSM in DRAFT state.</div>
      {err && <div className="error">{err}</div>}

      <div className="grid cols-2">
        <div className="card">
          <h2 style={{ marginTop: 0 }}>New procurement</h2>
          <form onSubmit={submit}>
            <div className="row">
              <label>Startup</label>
              <select value={form.startup_id} onChange={(e) => setForm({ ...form, startup_id: e.target.value })}>
                {startups.map((s) => <option key={s.id} value={s.id}>{s.startup_name}</option>)}
              </select>
            </div>
            <Field label="Title" value={form.title} onChange={(v) => setForm({ ...form, title: v })} />
            <Field label="Supplier name" value={form.supplier_name} onChange={(v) => setForm({ ...form, supplier_name: v })} />
            <Field label="Amount (USD)" value={form.amount_usd} onChange={(v) => setForm({ ...form, amount_usd: v })} />
            <div className="row">
              <label>Category</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                <option value="SERVICE">SERVICE</option>
                <option value="GOOD">GOOD</option>
                <option value="INFRASTRUCTURE">INFRASTRUCTURE</option>
              </select>
            </div>
            <div className="row">
              <label>Priority</label>
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
              </select>
            </div>
            <Field label="Description" value={form.description} onChange={(v) => setForm({ ...form, description: v })} />
            <div className="actions"><button type="submit">Create</button></div>
          </form>
        </div>

        <div className="card" style={{ padding: 0 }}>
          <table>
            <thead>
              <tr><th>Title</th><th>Supplier</th><th>Amount</th><th>State</th></tr>
            </thead>
            <tbody>
              {list.map((p) => (
                <tr key={p.id}>
                  <td><Link to={`/procurements/${p.id}`}>{p.title}</Link></td>
                  <td>{p.supplier_name}</td>
                  <td>{formatCents(p.amount_cents)}</td>
                  <td><span className={`badge ${p.state}`}>{p.state}</span></td>
                </tr>
              ))}
              {!list.length && (
                <tr><td colSpan={4} style={{ textAlign: "center", color: "var(--text-dim)" }}>No procurements yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="row">
      <label>{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

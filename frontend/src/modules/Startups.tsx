import { FormEvent, useEffect, useState } from "react";
import { Startups as StartupsApi, type Startup } from "../api";

const VC_ID = "00000000-0000-0000-0000-000000000001";

export function Startups() {
  const [list, setList] = useState<Startup[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState({
    startup_name: "",
    legal_name: "",
    industry: "",
    country: "Iran",
    tax_id: "",
    founder_name: "",
    email: "",
    phone: "",
  });

  async function refresh() {
    try {
      const r = await StartupsApi.list();
      setList(r.startups);
    } catch (e) {
      setErr((e as Error).message);
    }
  }
  useEffect(() => { void refresh(); }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      await StartupsApi.create({
        vc_id: VC_ID,
        startup_name: form.startup_name,
        legal_name: form.legal_name,
        industry: form.industry,
        country: form.country,
        tax_id: form.tax_id,
        founder: { founder_name: form.founder_name, email: form.email, phone: form.phone },
        bank: { bank_account: "" },
      });
      setForm({ ...form, startup_name: "", legal_name: "", tax_id: "", founder_name: "", email: "", phone: "" });
      await refresh();
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  return (
    <div>
      <h1>Startups</h1>
      <div className="sub">Onboard a startup into the trustC portfolio.</div>
      {err && <div className="error">{err}</div>}

      <div className="grid cols-2">
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Register</h2>
          <form onSubmit={submit}>
            <Field label="Startup name" value={form.startup_name} onChange={(v) => setForm({ ...form, startup_name: v })} />
            <Field label="Legal name"   value={form.legal_name}   onChange={(v) => setForm({ ...form, legal_name: v })} />
            <Field label="Industry"     value={form.industry}     onChange={(v) => setForm({ ...form, industry: v })} />
            <Field label="Country"      value={form.country}      onChange={(v) => setForm({ ...form, country: v })} />
            <Field label="Tax ID"       value={form.tax_id}       onChange={(v) => setForm({ ...form, tax_id: v })} />
            <Field label="Founder name" value={form.founder_name} onChange={(v) => setForm({ ...form, founder_name: v })} />
            <Field label="Email"        value={form.email}        onChange={(v) => setForm({ ...form, email: v })} />
            <Field label="Phone"        value={form.phone}        onChange={(v) => setForm({ ...form, phone: v })} />
            <div className="actions"><button type="submit">Register startup</button></div>
          </form>
        </div>

        <div className="card" style={{ padding: 0 }}>
          <table>
            <thead>
              <tr><th>Name</th><th>Industry</th><th>Country</th><th>Risk</th></tr>
            </thead>
            <tbody>
              {list.map((s) => (
                <tr key={s.id}>
                  <td>{s.startup_name}</td>
                  <td>{s.industry}</td>
                  <td>{s.country}</td>
                  <td><span className={`badge ${s.risk_level}`}>{s.risk_level}</span></td>
                </tr>
              ))}
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

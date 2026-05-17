import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Escrow as EscrowApi,
  Procurements as ProcurementsApi,
  Startups as StartupsApi,
  type EscrowAccount,
  type Procurement,
  type Startup,
} from "../../api";
import { Btn } from "../../components/ui/Btn";
import { Chip } from "../../components/ui/Chip";
import { Icon } from "../../components/ui/Icon";
import { Modal } from "../../components/ui/Modal";
import { Stat } from "../../components/ui/Stat";
import { useFrozen } from "../../context/FrozenContext";
import { useToast } from "../../context/ToastContext";
import { Governance } from "../../api";
import { formatIRR, riskLabelFa, toFaDigits } from "../../lib/format";

function riskClass(r: string, isFrozen: boolean): string {
  if (isFrozen) return "frozen";
  switch (r) {
    case "LOW":
      return "low";
    case "MEDIUM":
      return "medium";
    case "HIGH":
      return "high";
    case "CRITICAL":
      return "critical";
    default:
      return "low";
  }
}

export function Portfolio() {
  const navigate = useNavigate();
  const { isFrozen, byStartup, refresh: refreshFrozen } = useFrozen();
  const { toast } = useToast();
  const [startups, setStartups] = useState<Startup[]>([]);
  const [accounts, setAccounts] = useState<Map<string, EscrowAccount>>(new Map());
  const [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState<Startup | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await StartupsApi.list();
        setStartups(r.startups);
        const pairs = await Promise.all(
          r.startups.map(async (s) => {
            try {
              const acc = await EscrowApi.account(s.id);
              return [s.id, acc] as const;
            } catch {
              return null;
            }
          })
        );
        const m = new Map<string, EscrowAccount>();
        for (const p of pairs) if (p) m.set(p[0], p[1]);
        setAccounts(m);
      } catch (e) {
        setErr((e as Error).message);
      }
    })();
  }, []);

  const totals = useMemo(() => {
    let escrow = 0;
    for (const s of startups) escrow += accounts.get(s.id)?.balance_cents ?? 0;
    const frozenCount = startups.filter((s) => isFrozen(s.id)).length;
    return { escrow, frozenCount };
  }, [startups, accounts, isFrozen]);

  async function unfreezeStartup(startupId: string) {
    const f = byStartup.get(startupId);
    if (!f) return;
    try {
      await Governance.lift(f.id, "رفع تعلیق توسط VC");
      toast({ tone: "good", msg: "فریز لغو شد · جریان‌های کاری مجدداً فعال شدند" });
      await refreshFrozen();
      setOpen(null);
    } catch (e) {
      toast({ tone: "bad", msg: (e as Error).message });
    }
  }

  return (
    <div className="stack" style={{ gap: "var(--s-6)" }}>
      <header
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 320px",
          gap: "var(--s-6)",
          alignItems: "end",
        }}
      >
        <div>
          <div className="eyebrow">پورتفولیو · کنترل زنده</div>
          <h1 style={{ fontSize: "var(--t-3xl)" }}>صندوق سرمایه‌گذاری trustC</h1>
          <p
            className="muted"
            style={{ fontSize: "var(--t-lg)", marginTop: 8, maxWidth: 640 }}
          >
            {toFaDigits(startups.length)} استارتاپ تحت پوشش
            {totals.frozenCount > 0 && (
              <>
                {" · "}
                <b style={{ color: "var(--state-bad)" }}>
                  {toFaDigits(totals.frozenCount)} فریز فعال
                </b>
              </>
            )}
          </p>
        </div>
      </header>

      {err && (
        <div
          className="card"
          style={{ background: "var(--state-bad-bg)", borderColor: "var(--state-bad)" }}
        >
          <span className="mono" style={{ color: "var(--state-bad)" }}>{err}</span>
        </div>
      )}

      <section className="grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        <Stat
          label="کل اسکرو فعال"
          value={formatIRR(totals.escrow, { withUnit: false })}
          unit="میلیارد ریال"
          hint={`در ${toFaDigits(accounts.size)} حساب`}
        />
        <Stat
          label="میانگین امتیاز اعتباری"
          value={
            startups.length
              ? toFaDigits(
                  Math.round(
                    startups.reduce((s, x) => s + x.credit_score, 0) / startups.length
                  )
                )
              : "—"
          }
          unit="از ۱۰۰"
        />
        <Stat
          label="ریسک بالا/بحرانی"
          value={toFaDigits(
            startups.filter((s) => s.risk_level === "HIGH" || s.risk_level === "CRITICAL").length
          )}
          unit={`از ${toFaDigits(startups.length)}`}
        />
        <Stat
          label="فریز فعال"
          value={toFaDigits(totals.frozenCount)}
          delta={
            totals.frozenCount > 0
              ? { text: "⚠ نیاز به مداخله", tone: "down" }
              : { text: "وضعیت پایدار", tone: "up" }
          }
        />
      </section>

      <div className="card">
        <div className="card-title">
          <div>
            <h3>ماتریس ریسک پورتفوی</h3>
            <div className="muted" style={{ fontSize: 13 }}>
              کلیک روی هر استارتاپ برای جزئیات و اقدام
            </div>
          </div>
          <div
            className="row"
            style={{ gap: 12, fontSize: 11, fontFamily: "var(--mono-data)" }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 8, height: 8, background: "var(--state-good)" }} />LOW
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 8, height: 8, background: "var(--state-warn)" }} />MED
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 8, height: 8, background: "var(--state-bad)" }} />HIGH
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 8, height: 8, background: "var(--state-bad-bg)" }} />CRIT
            </span>
          </div>
        </div>
        <div
          className="grid"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}
        >
          {startups.map((s) => {
            const frozen = isFrozen(s.id);
            const account = accounts.get(s.id);
            return (
              <div
                key={s.id}
                className="heat-cell"
                data-risk={riskClass(s.risk_level, frozen)}
                onClick={() => setOpen(s)}
              >
                <div>
                  <div
                    className="row"
                    style={{ justifyContent: "space-between", marginBottom: 4 }}
                  >
                    <span style={{ fontWeight: 600 }}>{s.startup_name}</span>
                    <span className="mono muted" style={{ fontSize: 11 }}>
                      {s.id.slice(0, 6)}
                    </span>
                  </div>
                  <div className="muted" style={{ fontSize: 12 }}>{s.industry}</div>
                  <div className="row" style={{ gap: 16, marginTop: 10, fontSize: 12 }}>
                    <span>
                      <div className="eyebrow" style={{ marginBottom: 2 }}>اعتبار</div>
                      <div className="mono" style={{ fontWeight: 600 }}>
                        {toFaDigits(s.credit_score)}
                      </div>
                    </span>
                    <span>
                      <div className="eyebrow" style={{ marginBottom: 2 }}>اسکرو</div>
                      <div className="mono" style={{ fontWeight: 600 }}>
                        {account ? formatIRR(account.balance_cents) : "—"}
                      </div>
                    </span>
                    <span>
                      <div className="eyebrow" style={{ marginBottom: 2 }}>سوخت</div>
                      <div className="mono" style={{ fontWeight: 600 }}>
                        {formatIRR(s.burn_rate_cents)}
                      </div>
                    </span>
                  </div>
                </div>
                <div>
                  {frozen ? (
                    <span className="chip" data-tone="bad">
                      <span className="mono">FROZEN</span>
                    </span>
                  ) : (
                    <span
                      className="chip"
                      data-tone={
                        s.risk_level === "LOW"
                          ? "good"
                          : s.risk_level === "MEDIUM"
                            ? "warn"
                            : "bad"
                      }
                    >
                      <span className="mono">{s.risk_level}</span>
                      <span className="fa">· {riskLabelFa(s.risk_level)}</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <StartupDetailModal
        startup={open}
        account={open ? accounts.get(open.id) : undefined}
        frozen={open ? isFrozen(open.id) : false}
        onClose={() => setOpen(null)}
        onGotoFreeze={() => {
          setOpen(null);
          navigate("/vc/killswitch");
        }}
        onUnfreeze={(id) => unfreezeStartup(id)}
      />
    </div>
  );
}

function StartupDetailModal({
  startup,
  account,
  frozen,
  onClose,
  onGotoFreeze,
  onUnfreeze,
}: {
  startup: Startup | null;
  account?: EscrowAccount;
  frozen: boolean;
  onClose: () => void;
  onGotoFreeze: () => void;
  onUnfreeze: (id: string) => void;
}) {
  const [pending, setPending] = useState<Procurement[]>([]);

  useEffect(() => {
    if (!startup) return;
    (async () => {
      try {
        const r = await ProcurementsApi.list(startup.id);
        setPending(r.procurements.filter((p) => p.state === "FINANCIAL_VALIDATION"));
      } catch {
        setPending([]);
      }
    })();
  }, [startup]);

  if (!startup) return null;

  return (
    <Modal
      open={!!startup}
      onClose={onClose}
      title={startup.startup_name}
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>بستن</Btn>
          {!frozen ? (
            <Btn variant="danger" icon={<Icon.freeze />} onClick={onGotoFreeze}>
              فعال‌سازی Kill Switch
            </Btn>
          ) : (
            <Btn variant="secondary" onClick={() => onUnfreeze(startup.id)}>
              لغو فریز
            </Btn>
          )}
        </>
      }
    >
      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Stat
          label="موجودی اسکرو"
          value={account ? formatIRR(account.balance_cents, { withUnit: false }) : "—"}
          unit={account ? "میلیارد ریال" : undefined}
        />
        <Stat
          label="نرخ سوخت"
          value={formatIRR(startup.burn_rate_cents, { withUnit: false })}
          unit="میلیارد ریال"
        />
        <Stat label="امتیاز اعتباری" value={toFaDigits(startup.credit_score)} unit="از ۱۰۰" />
        <Stat
          label="سطح ریسک"
          value={riskLabelFa(startup.risk_level)}
          delta={{ text: startup.risk_level, tone: "" }}
        />
      </div>
      {pending.length > 0 && (
        <>
          <div className="divider" />
          <div className="eyebrow" style={{ marginBottom: 8 }}>
            درخواست‌های نیازمند تأیید VC
          </div>
          <div className="stack" style={{ gap: 8 }}>
            {pending.map((p) => (
              <div
                key={p.id}
                className="row"
                style={{
                  justifyContent: "space-between",
                  padding: 12,
                  border: "1px solid var(--border-hairline)",
                  borderRadius: 4,
                }}
              >
                <div>
                  <div style={{ fontWeight: 500 }}>{p.title}</div>
                  <div className="muted mono" style={{ fontSize: 11 }}>
                    {p.id.slice(0, 8)} · {formatIRR(p.amount_cents)}
                  </div>
                </div>
                <Chip state={p.state} />
              </div>
            ))}
          </div>
        </>
      )}
    </Modal>
  );
}

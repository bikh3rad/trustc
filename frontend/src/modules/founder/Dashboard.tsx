import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Audit as AuditApi,
  Escrow as EscrowApi,
  Procurements as ProcurementsApi,
  type AuditRecord,
  type EscrowAccount,
  type Procurement,
} from "../../api";
import { Btn } from "../../components/ui/Btn";
import { Chip } from "../../components/ui/Chip";
import { Icon } from "../../components/ui/Icon";
import { Stat } from "../../components/ui/Stat";
import { BarPair, DualLine, ScoreLine } from "../../components/ui/Charts";
import { useCurrentStartup } from "../../context/CurrentStartupContext";
import { MobileCard } from "../../layout/mobile/MobileCard";
import { MobileList } from "../../layout/mobile/MobileList";
import { formatIRR, formatPercent, toFaDigits } from "../../lib/format";
import { useIsMobile } from "../../lib/useIsMobile";
import { isInflight } from "../../lib/fsm";
import { computeStartupMonthly } from "../../lib/monthly";
import { mockInvoicesFor } from "../../lib/mockInvoices";

function AlertRow({
  tone,
  title,
  body,
  hint,
}: {
  tone: "active" | "good" | "warn" | "bad";
  title: string;
  body: string;
  hint: string;
}) {
  const colors = {
    active: "var(--state-active)",
    good: "var(--state-good)",
    warn: "var(--state-warn)",
    bad: "var(--state-bad)",
  };
  return (
    <div style={{ display: "grid", gridTemplateColumns: "3px 1fr", gap: 12 }}>
      <div style={{ background: colors[tone], borderRadius: 2 }} />
      <div>
        <div style={{ fontWeight: 600, fontSize: 13 }}>{title}</div>
        <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>{body}</div>
        <div className="mono muted" style={{ fontSize: 10, marginTop: 4, letterSpacing: 0.5 }}>{hint}</div>
      </div>
    </div>
  );
}

function eventBody(r: AuditRecord): { tone: "active" | "good" | "warn"; title: string; body: string } {
  switch (r.event_type) {
    case "trustc.escrow.locked":
      return { tone: "active", title: "اسکرو قفل شد", body: "وجوه برای خرید در حساب امانی نشست." };
    case "trustc.escrow.released":
      return { tone: "good", title: "پرداخت آزاد شد", body: "وجه به ذی‌نفع نهایی پرداخت شد." };
    case "trustc.governance.freeze_activated":
      return { tone: "warn", title: "Kill Switch فعال شد", body: "استارتاپ تعلیق شده — تمام جریان‌ها متوقف." };
    case "trustc.procurement.transitioned":
      return { tone: "active", title: "تغییر وضعیت خرید", body: "یک خرید به مرحله بعد پیش رفت." };
    default:
      return { tone: "active", title: r.event_type, body: r.subject_type ?? "" };
  }
}

export function Dashboard() {
  const navigate = useNavigate();
  const { current, canSwitch } = useCurrentStartup();
  const isMobile = useIsMobile();
  const [procs, setProcs] = useState<Procurement[]>([]);
  const [account, setAccount] = useState<EscrowAccount | null>(null);
  const [audit, setAudit] = useState<AuditRecord[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!current) return;
    setProcs([]);
    setAccount(null);
    (async () => {
      try {
        const [p, a, ev] = await Promise.all([
          ProcurementsApi.list(current.id),
          EscrowApi.account(current.id).catch(() => null),
          AuditApi.list({ startup_id: current.id, limit: 8 }),
        ]);
        setProcs(p.procurements);
        setAccount(a);
        setAudit(ev.records);
      } catch (e) {
        setErr((e as Error).message);
      }
    })();
  }, [current]);

  // Mock invoices live entirely client-side until the invoice service ships.
  const invoices = useMemo(
    () => (current ? mockInvoicesFor(current) : []),
    [current],
  );

  // Aggregate monthly series — this is what feeds the three charts.
  const series = useMemo(() => {
    return computeStartupMonthly(
      current,
      procs,
      invoices,
      account?.balance_cents ?? 0,
    );
  }, [current, procs, invoices, account]);

  if (!current) {
    return (
      <div className="empty">
        <h3>حساب شما هنوز به استارتاپی متصل نشده</h3>
        <div style={{ marginTop: 8 }}>
          ثبت‌نام شما با موفقیت تأیید شده است، ولی هنوز هیچ شرکتی تحت پوشش
          حساب شما قرار نگرفته. سرمایه‌گذار باید استارتاپ شما را در پنل
          «شرکت‌ها» اضافه و حساب شما را به آن متصل کند.
        </div>
        <div className="muted" style={{ marginTop: 12, fontSize: 13 }}>
          راهنمای سرمایه‌گذار: ورود به سیستم با نقش VC → منوی «شرکت‌ها» →
          دکمه «افزودن استارتاپ» → ایمیل شما را به‌عنوان بنیان‌گذار وارد
          کند تا اتصال خودکار انجام شود.
        </div>
      </div>
    );
  }

  const inflight = procs.filter((p) => isInflight(p.state));
  const escrowLocked = procs
    .filter((p) =>
      ["ESCROW_LOCK", "SUPPLIER_DISPATCH", "DELIVERY_CONFIRMATION", "PAYMENT_RELEASE"].includes(
        p.state
      )
    )
    .reduce((s, p) => s + p.amount_cents, 0);

  const lastMonth = series.months.length - 1;
  const salesMoM =
    lastMonth > 0 && series.sales[lastMonth - 1] > 0
      ? ((series.sales[lastMonth] - series.sales[lastMonth - 1]) /
          series.sales[lastMonth - 1]) *
        100
      : 0;
  const scoreTrend = series.score[lastMonth] - series.score[0];

  return (
    <div className="stack" style={{ gap: "var(--s-6)" }}>
      <section className="dashboard-hero">
        <div>
          <div className="eyebrow" style={{ marginBottom: 12 }}>
            داشبورد · {toFaDigits(new Date().toLocaleDateString("fa-IR"))}
            {canSwitch && (
              <span
                className="mono"
                style={{ marginInlineStart: 8, color: "var(--orange-600)" }}
              >
                · حالت ادمین — مشاهده {current.startup_name}
              </span>
            )}
          </div>
          <h1 style={{ fontSize: "var(--t-3xl)", lineHeight: 1.15 }}>
            صبح بخیر، {current.startup_name}.
          </h1>
          <p
            className="muted"
            style={{ fontSize: "var(--t-lg)", marginTop: 8, maxWidth: 640 }}
          >
            امروز{" "}
            <b className="num" style={{ color: "var(--fg-default)" }}>
              {toFaDigits(inflight.length)}
            </b>{" "}
            خرید فعال در جریان است و{" "}
            <b className="num" style={{ color: "var(--fg-default)" }}>
              {formatIRR(escrowLocked)}
            </b>{" "}
            در اسکرو قفل شده.
          </p>
        </div>
        <div className="dashboard-hero-cta">
          <Btn
            variant="primary"
            icon={<Icon.plus />}
            onClick={() => navigate("/procurements/new")}
          >
            ثبت خرید جدید
          </Btn>
        </div>
      </section>

      {err && (
        <div
          className="card"
          style={{ background: "var(--state-bad-bg)", borderColor: "var(--state-bad)" }}
        >
          <span className="mono" style={{ color: "var(--state-bad)" }}>{err}</span>
        </div>
      )}

      <section className="grid stat-grid">
        <Stat
          label="موجودی اسکرو"
          value={
            account ? formatIRR(account.balance_cents, { withUnit: false }) : "—"
          }
          unit={account ? "میلیارد ریال" : undefined}
          hint={
            account
              ? `قفل‌شده ${formatIRR(account.locked_cents)}`
              : "حساب اسکرو هنوز ایجاد نشده"
          }
        />
        <Stat
          label="قفل‌شده برای خریدها"
          value={formatIRR(escrowLocked, { withUnit: false })}
          unit="میلیارد ریال"
          hint={`${toFaDigits(inflight.length)} خرید در جریان`}
        />
        <Stat
          label="نرخ سوخت ماهیانه"
          value={formatIRR(current.burn_rate_cents, { withUnit: false })}
          unit="میلیارد ریال"
        />
        <Stat
          label="درآمد ماه جاری"
          value={formatIRR(series.sales[lastMonth], { withUnit: false })}
          unit="میلیارد ریال"
          delta={{
            text: `${salesMoM >= 0 ? "↑" : "↓"} ${formatPercent(Math.abs(salesMoM))} ماه‌به‌ماه`,
            tone: salesMoM >= 0 ? "up" : "down",
          }}
        />
      </section>

      {/* CHART 1 — خرید vs فروش ماهانه */}
      <section className="card">
        <div
          className="card-title"
          style={{ flexWrap: "wrap", gap: 12 }}
        >
          <div style={{ minWidth: 0 }}>
            <h3>خرید و فروش ماهانه</h3>
            <div
              className="muted"
              style={{ fontSize: "var(--t-sm)", marginTop: 4 }}
            >
              مبتنی بر {toFaDigits(series.totals.procCount)} فاکتور خرید و{" "}
              {toFaDigits(series.totals.invCount)} فاکتور فروش · ۶ ماه گذشته
            </div>
          </div>
          <div className="row" style={{ gap: 16, fontSize: 12, flexShrink: 0 }}>
            <span className="row" style={{ gap: 6 }}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  background: "var(--orange-600)",
                  borderRadius: 2,
                }}
              />
              خرید
            </span>
            <span className="row" style={{ gap: 6 }}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  background: "var(--state-good)",
                  borderRadius: 2,
                }}
              />
              فروش
            </span>
          </div>
        </div>
        <BarPair
          labels={series.labels}
          a={series.purchases}
          b={series.sales}
          colorA="var(--orange-600)"
          colorB="var(--state-good)"
          height={210}
        />
      </section>

      {/* CHART 2 + 3 — Escrow & credit utilization + Credit health score */}
      <section className="grid two-col-shrink">
        <div className="card">
          <div
            className="card-title"
            style={{ flexWrap: "wrap", gap: 12 }}
          >
            <div>
              <h3>اسکرو و مصرف خط اعتباری</h3>
              <div
                className="muted"
                style={{ fontSize: "var(--t-sm)", marginTop: 4 }}
              >
                سقف اعتبار: {formatIRR(series.creditLine)}
              </div>
            </div>
            <div className="row" style={{ gap: 16, fontSize: 12 }}>
              <span className="row" style={{ gap: 6 }}>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    background: "var(--state-active)",
                    borderRadius: 2,
                  }}
                />
                موجودی اسکرو
              </span>
              <span className="row" style={{ gap: 6 }}>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    background: "var(--orange-600)",
                    borderRadius: 2,
                  }}
                />
                مصرف اعتبار
              </span>
            </div>
          </div>
          <DualLine
            labels={series.labels}
            a={series.escrow}
            b={series.creditUsed}
            colorA="var(--state-active)"
            colorB="var(--orange-600)"
            fillA="rgba(46,90,143,0.10)"
            fillB="rgba(210,105,30,0.10)"
            height={210}
            yMax={series.creditLine}
            yMaxLabel={`سقف اعتبار · ${formatIRR(series.creditLine)}`}
          />
        </div>

        <div className="card">
          <div
            className="card-title"
            style={{ flexWrap: "wrap", gap: 12 }}
          >
            <div>
              <h3>شاخص اعتبار شرکت در trustC</h3>
              <div
                className="muted"
                style={{ fontSize: "var(--t-sm)", marginTop: 4 }}
              >
                ترکیب رشد فروش، حاشیه اسکرو و مصرف خط اعتباری
              </div>
            </div>
            <span
              className="chip"
              data-tone={
                scoreTrend > 2 ? "good" : scoreTrend < -2 ? "bad" : "warn"
              }
            >
              <span className="mono">
                {scoreTrend >= 0 ? "+" : "−"}
                {toFaDigits(Math.abs(scoreTrend))}
              </span>
            </span>
          </div>
          <ScoreLine
            labels={series.labels}
            points={series.score}
            color={scoreTrend >= 0 ? "var(--state-good)" : "var(--state-bad)"}
            fill={
              scoreTrend >= 0 ? "rgba(47,125,79,0.10)" : "rgba(180,40,40,0.10)"
            }
            height={210}
          />
        </div>
      </section>

      <section className="grid two-col-shrink">
        <div className="card">
          <div className="card-title">
            <h3>خریدهای فعال در جریان</h3>
            <Btn variant="ghost" size="sm" onClick={() => navigate("/procurements")}>
              مشاهده همه ←
            </Btn>
          </div>
          {isMobile ? (
            <MobileList
              items={inflight.slice(0, 5)}
              emptyTitle="هیچ خرید فعالی نیست"
              emptyHint="برای شروع، خرید جدید ثبت کنید."
              renderItem={(p) => (
                <MobileCard
                  key={p.id}
                  onClick={() => navigate(`/procurements/${p.id}`)}
                  title={p.title}
                  subtitle={p.supplier_name}
                  right={<Chip state={p.state} />}
                  meta={
                    <span style={{ fontWeight: 600, color: "var(--fg-default)" }}>
                      {formatIRR(p.amount_cents)}
                    </span>
                  }
                />
              )}
            />
          ) : (
            <div className="responsive-table-card">
              <table className="table">
                <thead>
                  <tr>
                    <th>عنوان</th>
                    <th>تأمین‌کننده</th>
                    <th>وضعیت</th>
                    <th className="num">مبلغ</th>
                  </tr>
                </thead>
                <tbody>
                  {inflight.slice(0, 5).map((p) => (
                    <tr key={p.id} onClick={() => navigate(`/procurements/${p.id}`)}>
                      <td>
                        <div style={{ fontWeight: 500 }}>{p.title}</div>
                        <div className="muted mono" style={{ fontSize: 11 }}>
                          {p.id.slice(0, 8)}
                        </div>
                      </td>
                      <td>{p.supplier_name}</td>
                      <td>
                        <Chip state={p.state} />
                      </td>
                      <td className="num">{formatIRR(p.amount_cents)}</td>
                    </tr>
                  ))}
                  {inflight.length === 0 && (
                    <tr>
                      <td colSpan={4}>
                        <div className="empty">
                          <h3>هیچ خرید فعالی نیست</h3>
                          <div>برای شروع، خرید جدید ثبت کنید.</div>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-title">
            <h3>اعلان‌ها</h3>
          </div>
          <div className="stack" style={{ gap: 12 }}>
            {audit.length === 0 && (
              <div className="muted" style={{ fontSize: 13 }}>
                هنوز رویدادی ثبت نشده.
              </div>
            )}
            {audit.slice(0, 4).map((r) => {
              const b = eventBody(r);
              return (
                <AlertRow
                  key={r.event_id}
                  tone={b.tone}
                  title={b.title}
                  body={b.body}
                  hint={`${r.subject_id?.slice(0, 8) ?? ""} · ${toFaDigits(new Date(r.recorded_at).toLocaleString("fa-IR"))}`}
                />
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}

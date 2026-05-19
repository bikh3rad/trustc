// VC per-company dashboard.
//
// The VC opens this from the Companies list to see a startup's live status:
// the same charts the founder sees on their own dashboard (purchases vs
// sales, escrow + credit utilization, credit health score), plus two
// company-specific sections:
//   - درخواست‌های نیازمند تأیید (FINANCIAL_VALIDATION procurements) — the
//     VC can approve (→ ESCROW_LOCK) or reject (→ CANCELLED) inline.
//   - خریدهای پرداخت‌شده (PAYMENT_RELEASE / ACCOUNTING_FINALIZATION) — the
//     invoices already settled through this company's escrow, so the VC
//     can audit where capital went.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Audit as AuditApi,
  Escrow as EscrowApi,
  Procurements as ProcurementsApi,
  Startups as StartupsApi,
  type AuditRecord,
  type EscrowAccount,
  type Procurement,
  type Startup,
} from "../../api";
import { Btn } from "../../components/ui/Btn";
import { Chip } from "../../components/ui/Chip";
import { Icon } from "../../components/ui/Icon";
import { Modal } from "../../components/ui/Modal";
import { Stat } from "../../components/ui/Stat";
import { BarPair, DualLine, ScoreLine } from "../../components/ui/Charts";
import { useToast } from "../../context/ToastContext";
import {
  formatIRR,
  formatIRRPlain,
  formatPercent,
  riskLabelFa,
  toFaDigits,
} from "../../lib/format";
import { computeStartupMonthly } from "../../lib/monthly";
import { mockInvoicesFor } from "../../lib/mockInvoices";

const PAID_STATES = new Set(["PAYMENT_RELEASE", "ACCOUNTING_FINALIZATION"]);

export function CompanyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [startup, setStartup] = useState<Startup | null>(null);
  const [account, setAccount] = useState<EscrowAccount | null>(null);
  const [procs, setProcs] = useState<Procurement[]>([]);
  const [audit, setAudit] = useState<AuditRecord[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<{
    proc: Procurement;
    action: "approve" | "reject";
  } | null>(null);

  const refresh = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [s, p, a, ev] = await Promise.all([
        StartupsApi.get(id),
        ProcurementsApi.list(id),
        EscrowApi.account(id).catch(() => null),
        AuditApi.list({ subject_type: "startup", subject_id: id, limit: 12 }).catch(
          () => ({ records: [] as AuditRecord[] }),
        ),
      ]);
      setStartup(s);
      setProcs(p.procurements);
      setAccount(a);
      setAudit(ev.records);
      setErr(null);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const invoices = useMemo(
    () => (startup ? mockInvoicesFor(startup) : []),
    [startup],
  );

  const series = useMemo(() => {
    return computeStartupMonthly(
      startup,
      procs,
      invoices,
      account?.balance_cents ?? 0,
    );
  }, [startup, procs, invoices, account]);

  const pending = useMemo(
    () => procs.filter((p) => p.state === "FINANCIAL_VALIDATION"),
    [procs],
  );
  const paid = useMemo(
    () =>
      procs
        .filter((p) => PAID_STATES.has(p.state))
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() -
            new Date(a.created_at).getTime(),
        ),
    [procs],
  );
  const escrowLocked = useMemo(
    () =>
      procs
        .filter((p) =>
          [
            "ESCROW_LOCK",
            "SUPPLIER_DISPATCH",
            "DELIVERY_CONFIRMATION",
            "PAYMENT_RELEASE",
          ].includes(p.state),
        )
        .reduce((s, p) => s + p.amount_cents, 0),
    [procs],
  );

  async function decide(proc: Procurement, action: "approve" | "reject") {
    setBusyId(proc.id);
    try {
      const to = action === "approve" ? "ESCROW_LOCK" : "CANCELLED";
      await ProcurementsApi.transition(
        proc.id,
        to,
        action === "approve"
          ? "VC approved — escrow lock"
          : "VC rejected at financial validation",
      );
      toast({
        tone: action === "approve" ? "good" : "bad",
        msg:
          action === "approve"
            ? `قفل اسکرو برای «${proc.title}» انجام شد`
            : `درخواست «${proc.title}» رد شد`,
      });
      await refresh();
    } catch (e) {
      toast({ tone: "bad", msg: (e as Error).message });
    } finally {
      setBusyId(null);
      setConfirming(null);
    }
  }

  if (loading && !startup) {
    return (
      <div className="muted" style={{ padding: 24 }}>
        در حال بارگذاری…
      </div>
    );
  }

  if (err && !startup) {
    return (
      <div
        className="card"
        style={{
          background: "var(--state-bad-bg)",
          borderColor: "var(--state-bad)",
        }}
      >
        <span className="mono" style={{ color: "var(--state-bad)" }}>{err}</span>
      </div>
    );
  }

  if (!startup) return null;

  const lastMonth = series.months.length - 1;
  const salesMoM =
    lastMonth > 0 && series.sales[lastMonth - 1] > 0
      ? ((series.sales[lastMonth] - series.sales[lastMonth - 1]) /
          series.sales[lastMonth - 1]) *
        100
      : 0;
  const scoreTrend = series.score[lastMonth] - series.score[0];
  const paidTotal = paid.reduce((s, p) => s + p.amount_cents, 0);

  return (
    <div className="stack" style={{ gap: "var(--s-6)" }}>
      <header className="dashboard-hero">
        <div>
          <div className="eyebrow" style={{ marginBottom: 12 }}>
            پورتفولیو · داشبورد شرکت ·{" "}
            <span className="mono">{startup.id.slice(0, 8)}</span>
          </div>
          <h1 style={{ fontSize: "var(--t-3xl)", lineHeight: 1.15 }}>
            {startup.startup_name}
          </h1>
          <p
            className="muted"
            style={{ fontSize: "var(--t-lg)", marginTop: 8, maxWidth: 720 }}
          >
            {startup.industry} · {startup.country}
            {" · "}
            ریسک{" "}
            <b style={{ color: "var(--fg-default)" }}>
              {riskLabelFa(startup.risk_level)}
            </b>
            {pending.length > 0 && (
              <>
                {" · "}
                <b style={{ color: "var(--state-warn)" }}>
                  {toFaDigits(pending.length)} درخواست در انتظار تأیید
                </b>
              </>
            )}
          </p>
        </div>
        <div className="dashboard-hero-cta">
          <Btn
            variant="ghost"
            icon={<Icon.arrow />}
            onClick={() => navigate("/vc/companies")}
          >
            بازگشت به فهرست شرکت‌ها
          </Btn>
        </div>
      </header>

      {err && (
        <div
          className="card"
          style={{
            background: "var(--state-bad-bg)",
            borderColor: "var(--state-bad)",
          }}
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
          hint={`${toFaDigits(
            procs.filter((p) =>
              [
                "ESCROW_LOCK",
                "SUPPLIER_DISPATCH",
                "DELIVERY_CONFIRMATION",
                "PAYMENT_RELEASE",
              ].includes(p.state),
            ).length,
          )} خرید فعال`}
        />
        <Stat
          label="نرخ سوخت ماهیانه"
          value={formatIRR(startup.burn_rate_cents, { withUnit: false })}
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

      <section className="card">
        <div className="card-title" style={{ flexWrap: "wrap", gap: 12 }}>
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

      <section className="grid two-col-shrink">
        <div className="card">
          <div className="card-title" style={{ flexWrap: "wrap", gap: 12 }}>
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
          <div className="card-title" style={{ flexWrap: "wrap", gap: 12 }}>
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

      {/* درخواست‌های در انتظار تأیید VC */}
      <section className="card">
        <div className="card-title">
          <div>
            <h3>درخواست‌های نیازمند تأیید شما</h3>
            <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
              قبل از خروج هر ریال از اسکرو، یک VC باید این صف را رسیدگی کند.
            </div>
          </div>
          <span
            className="chip"
            data-tone={pending.length > 0 ? "warn" : "good"}
          >
            <span className="mono">{toFaDigits(pending.length)}</span>
          </span>
        </div>
        {pending.length === 0 ? (
          <div className="empty">
            <h3>صف خالی است</h3>
            <div className="muted">
              هیچ درخواستی از این شرکت در مرحلهٔ اعتبارسنجی مالی نیست.
            </div>
          </div>
        ) : (
          <div className="responsive-table-card">
            <table className="table">
              <thead>
                <tr>
                  <th>عنوان</th>
                  <th>تأمین‌کننده</th>
                  <th>اولویت</th>
                  <th className="num">مبلغ (ریال)</th>
                  <th>ثبت</th>
                  <th>اقدام</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{p.title}</div>
                      <div className="muted mono" style={{ fontSize: 11 }}>
                        {p.id.slice(0, 8)}
                      </div>
                    </td>
                    <td>{p.supplier_name}</td>
                    <td>
                      <span
                        className="chip"
                        data-tone={
                          p.priority === "HIGH"
                            ? "bad"
                            : p.priority === "MEDIUM"
                              ? "warn"
                              : "good"
                        }
                      >
                        <span className="mono">{p.priority}</span>
                      </span>
                    </td>
                    <td className="num">{formatIRRPlain(p.amount_cents)}</td>
                    <td className="mono muted" style={{ fontSize: 12 }}>
                      {toFaDigits(
                        new Date(p.created_at).toLocaleDateString("fa-IR"),
                      )}
                    </td>
                    <td>
                      <div className="row" style={{ gap: 6 }}>
                        <Btn
                          variant="primary"
                          size="sm"
                          icon={<Icon.check />}
                          disabled={busyId === p.id}
                          onClick={() =>
                            setConfirming({ proc: p, action: "approve" })
                          }
                        >
                          تأیید
                        </Btn>
                        <Btn
                          variant="ghost"
                          size="sm"
                          disabled={busyId === p.id}
                          onClick={() =>
                            setConfirming({ proc: p, action: "reject" })
                          }
                        >
                          رد
                        </Btn>
                        <Btn
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/procurements/${p.id}`)}
                        >
                          جزئیات
                        </Btn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* خریدهای پرداخت‌شده — فاکتورهای ست‌شده از اسکرو */}
      <section className="card">
        <div className="card-title">
          <div>
            <h3>خریدهای پرداخت‌شده از اسکرو</h3>
            <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
              فاکتورهایی که با تأیید VC از حساب اسکرو این شرکت تسویه شدند
            </div>
          </div>
          <div className="row" style={{ gap: 16 }}>
            <Stat
              label="تعداد"
              value={toFaDigits(paid.length)}
              unit="فاکتور"
            />
            <Stat
              label="مجموع پرداخت"
              value={formatIRR(paidTotal, { withUnit: false })}
              unit="میلیارد ریال"
            />
          </div>
        </div>
        {paid.length === 0 ? (
          <div className="empty">
            <h3>هنوز پرداختی از اسکرو این شرکت ثبت نشده</h3>
            <div className="muted">
              پس از تأیید VC و آزادسازی پرداخت، خریدها در این فهرست ظاهر می‌شوند.
            </div>
          </div>
        ) : (
          <div className="responsive-table-card">
            <table className="table">
              <thead>
                <tr>
                  <th>عنوان</th>
                  <th>تأمین‌کننده</th>
                  <th>وضعیت</th>
                  <th className="num">مبلغ (ریال)</th>
                  <th>ثبت</th>
                </tr>
              </thead>
              <tbody>
                {paid.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => navigate(`/procurements/${p.id}`)}
                    style={{ cursor: "pointer" }}
                  >
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
                    <td className="num">{formatIRRPlain(p.amount_cents)}</td>
                    <td className="mono muted" style={{ fontSize: 12 }}>
                      {toFaDigits(
                        new Date(p.created_at).toLocaleDateString("fa-IR"),
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {audit.length > 0 && (
        <section className="card">
          <div className="card-title">
            <h3>رویدادهای اخیر این شرکت</h3>
          </div>
          <div className="stack" style={{ gap: 10 }}>
            {audit.slice(0, 8).map((r) => (
              <div
                key={r.event_id}
                className="row"
                style={{
                  gap: 12,
                  alignItems: "flex-start",
                  borderInlineStart:
                    "3px solid var(--state-active)",
                  paddingInlineStart: 12,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="mono" style={{ fontSize: 12, fontWeight: 600 }}>
                    {r.event_type}
                  </div>
                  <div
                    className="muted mono"
                    style={{ fontSize: 11, marginTop: 2 }}
                  >
                    {toFaDigits(new Date(r.recorded_at).toLocaleString("fa-IR"))}
                    {r.actor_role && <> · {r.actor_role}</>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <Modal
        open={!!confirming}
        onClose={() => setConfirming(null)}
        title={
          confirming?.action === "approve"
            ? "تأیید قفل اسکرو"
            : "رد درخواست خرید"
        }
        footer={
          <>
            <Btn variant="ghost" onClick={() => setConfirming(null)}>
              انصراف
            </Btn>
            <Btn
              variant={confirming?.action === "approve" ? "primary" : "danger"}
              disabled={!!busyId}
              onClick={() =>
                confirming && decide(confirming.proc, confirming.action)
              }
            >
              {confirming?.action === "approve"
                ? "تأیید و قفل اسکرو"
                : "رد قطعی درخواست"}
            </Btn>
          </>
        }
      >
        {confirming && (
          <div className="stack" style={{ gap: 12 }}>
            <div>
              درخواست <b>«{confirming.proc.title}»</b> به مبلغ{" "}
              <b>{formatIRR(confirming.proc.amount_cents)}</b> از{" "}
              <b>{startup.startup_name}</b>.
            </div>
            <p className="muted" style={{ fontSize: 13, margin: 0 }}>
              {confirming.action === "approve" ? (
                <>
                  با تأیید این درخواست، مبلغ از موجودی اسکرو شرکت قفل می‌شود و
                  یک سند حسابداری از{" "}
                  <span className="mono">1103_ESCROW_BANK</span> به{" "}
                  <span className="mono">2103_FIDUCIARY_ESCROW_LIABILITY</span>{" "}
                  ثبت خواهد شد.
                </>
              ) : (
                <>
                  درخواست به وضعیت <span className="mono">CANCELLED</span>{" "}
                  منتقل می‌شود و بنیان‌گذار موظف است نسخه اصلاح‌شده‌ای ثبت کند.
                  این عمل قابل بازگشت نیست.
                </>
              )}
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}

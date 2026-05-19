// VC Approvals — the queue of procurements waiting for VC sign-off.
//
// Every procurement that has been pushed from MANAGER_REVIEW into
// FINANCIAL_VALIDATION sits here until the VC either:
//   - approves it (FINANCIAL_VALIDATION → ESCROW_LOCK), which actually
//     locks the capital in the company's escrow account; or
//   - rejects it (FINANCIAL_VALIDATION → CANCELLED).
//
// Once approved, the procurement disappears from this list because the
// founder takes back operational control of the remaining FSM steps.
//
// The "تأیید شده‌ها" tab shows the VC's recent decisions for traceability,
// reading the workflow_states history through /v1/procurements/{id}/history.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Procurements as ProcurementsApi,
  Startups as StartupsApi,
  type Procurement,
  type Startup,
} from "../../api";
import { Btn } from "../../components/ui/Btn";
import { Chip } from "../../components/ui/Chip";
import { Icon } from "../../components/ui/Icon";
import { Modal } from "../../components/ui/Modal";
import { Stat } from "../../components/ui/Stat";
import { useToast } from "../../context/ToastContext";
import { formatIRR, formatIRRPlain, toFaDigits } from "../../lib/format";

type Tab = "PENDING" | "RECENT";

export function Approvals() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("PENDING");
  const [pending, setPending] = useState<Procurement[]>([]);
  const [recent, setRecent] = useState<Procurement[]>([]);
  const [startups, setStartups] = useState<Map<string, Startup>>(new Map());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<{
    proc: Procurement;
    action: "approve" | "reject";
  } | null>(null);

  const refresh = useCallback(async () => {
    setErr(null);
    try {
      const [pendingRes, escrowRes, finalRes, sRes] = await Promise.all([
        ProcurementsApi.list(undefined, "FINANCIAL_VALIDATION"),
        ProcurementsApi.list(undefined, "ESCROW_LOCK"),
        ProcurementsApi.list(undefined, "ACCOUNTING_FINALIZATION"),
        StartupsApi.list(),
      ]);
      setPending(pendingRes.procurements);
      // RECENT shows things that have already moved past the VC gate so
      // the VC can confirm their own audit trail at a glance. Approved
      // requests sit in ESCROW_LOCK or downstream states; we lift the two
      // most relevant buckets and sort by created_at desc.
      const recentSorted = [...escrowRes.procurements, ...finalRes.procurements]
        .sort((a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        )
        .slice(0, 50);
      setRecent(recentSorted);
      const map = new Map<string, Startup>();
      sRes.startups.forEach((s) => map.set(s.id, s));
      setStartups(map);
    } catch (e) {
      setErr((e as Error).message);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const stats = useMemo(() => {
    const pendingAmount = pending.reduce((s, p) => s + p.amount_cents, 0);
    const highPriority = pending.filter((p) => p.priority === "HIGH").length;
    const uniqueStartups = new Set(pending.map((p) => p.startup_id)).size;
    return { pendingAmount, highPriority, uniqueStartups };
  }, [pending]);

  async function decide(proc: Procurement, action: "approve" | "reject") {
    setBusyId(proc.id);
    setErr(null);
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
      setErr((e as Error).message);
      toast({ tone: "bad", msg: (e as Error).message });
    } finally {
      setBusyId(null);
      setConfirming(null);
    }
  }

  const list = tab === "PENDING" ? pending : recent;

  return (
    <div className="stack" style={{ gap: "var(--s-6)" }}>
      <header className="dashboard-hero">
        <div>
          <div className="eyebrow">کنترل پورتفوی · تأیید خریدها</div>
          <h1>درخواست‌های در انتظار VC</h1>
          <p className="muted" style={{ marginTop: 4, maxWidth: 720 }}>
            هر درخواست خرید پس از تأیید مدیر شرکت در این صف می‌نشیند.
            هیچ وجهی از حساب اسکرو خارج نمی‌شود مگر اینکه شما تأیید کنید —
            حتی اگر شرکت موجودی کافی داشته باشد. تأیید این مرحله،
            سرفصل <span className="mono">2103_FIDUCIARY_ESCROW_LIABILITY</span>{" "}
            را به مبلغ درخواست بدهکار می‌کند.
          </p>
        </div>
      </header>

      {err && (
        <div
          className="card"
          style={{ background: "var(--state-bad-bg)", borderColor: "var(--state-bad)" }}
        >
          <span className="mono" style={{ color: "var(--state-bad)" }}>
            {err}
          </span>
        </div>
      )}

      <section className="grid stat-grid stat-grid--3">
        <Stat
          label="در انتظار تصمیم"
          value={toFaDigits(pending.length)}
          unit="درخواست"
          delta={
            pending.length > 0
              ? { text: "⚠ نیاز به اقدام", tone: "down" }
              : null
          }
        />
        <Stat
          label="مبلغ کل صف"
          value={formatIRR(stats.pendingAmount, { withUnit: false })}
          unit="میلیارد ریال"
        />
        <Stat
          label="شرکت‌های دخیل"
          value={toFaDigits(stats.uniqueStartups)}
          unit="شرکت"
          hint={`${toFaDigits(stats.highPriority)} مورد با اولویت بالا`}
        />
      </section>

      <div className="row wrap" style={{ gap: 8 }}>
        {(
          [
            { id: "PENDING", label: "در انتظار", count: pending.length },
            { id: "RECENT", label: "تصمیم‌های اخیر", count: recent.length },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={"btn btn--sm " + (tab === t.id ? "btn--secondary" : "btn--ghost")}
            style={{ border: "1px solid var(--border-hairline)" }}
          >
            {t.label}
            <span
              style={{
                marginInlineStart: 6,
                color: "var(--fg-muted)",
                fontFamily: "var(--mono-data)",
              }}
            >
              {toFaDigits(t.count)}
            </span>
          </button>
        ))}
      </div>

      <div className="card responsive-table-card" style={{ padding: 0 }}>
        <table className="table">
          <thead>
            <tr>
              <th>شرکت</th>
              <th>عنوان</th>
              <th>تأمین‌کننده</th>
              <th>اولویت</th>
              {tab === "PENDING" && <th>وضعیت</th>}
              {tab === "RECENT" && <th>نتیجه</th>}
              <th className="num">مبلغ (ریال)</th>
              <th>ثبت</th>
              <th>اقدام</th>
            </tr>
          </thead>
          <tbody>
            {list.map((p) => {
              const s = startups.get(p.startup_id);
              return (
                <tr key={p.id}>
                  <td>
                    <div style={{ fontWeight: 500 }}>
                      {s?.startup_name ?? p.startup_id.slice(0, 8)}
                    </div>
                    {s && (
                      <div className="muted" style={{ fontSize: 11 }}>
                        {s.industry}
                      </div>
                    )}
                  </td>
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
                  <td>
                    <Chip state={p.state} />
                  </td>
                  <td className="num">{formatIRRPlain(p.amount_cents)}</td>
                  <td className="mono muted" style={{ fontSize: 12 }}>
                    {toFaDigits(new Date(p.created_at).toLocaleDateString("fa-IR"))}
                  </td>
                  <td>
                    {tab === "PENDING" ? (
                      <div className="row" style={{ gap: 6 }}>
                        <Btn
                          variant="primary"
                          size="sm"
                          icon={<Icon.check />}
                          disabled={busyId === p.id}
                          onClick={() => setConfirming({ proc: p, action: "approve" })}
                        >
                          تأیید
                        </Btn>
                        <Btn
                          variant="ghost"
                          size="sm"
                          disabled={busyId === p.id}
                          onClick={() => setConfirming({ proc: p, action: "reject" })}
                        >
                          رد
                        </Btn>
                      </div>
                    ) : (
                      <Btn
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/procurements/${p.id}`)}
                      >
                        جزئیات
                      </Btn>
                    )}
                  </td>
                </tr>
              );
            })}
            {list.length === 0 && (
              <tr>
                <td colSpan={8}>
                  <div className="empty">
                    <h3>
                      {tab === "PENDING"
                        ? "هیچ درخواستی در صف نیست"
                        : "تصمیم اخیری ثبت نشده"}
                    </h3>
                    <div className="muted">
                      {tab === "PENDING"
                        ? "تمام درخواست‌های مالی رسیدگی شده‌اند."
                        : "وقتی یک درخواست را تأیید یا رد کنید اینجا نمایش داده می‌شود."}
                    </div>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

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
              <b>
                {startups.get(confirming.proc.startup_id)?.startup_name ??
                  confirming.proc.startup_id}
              </b>
              .
            </div>
            <p className="muted" style={{ fontSize: 13, margin: 0 }}>
              {confirming.action === "approve" ? (
                <>
                  با تأیید این درخواست، مبلغ از موجودی اسکرو شرکت قفل می‌شود
                  و یک سند حسابداری از{" "}
                  <span className="mono">1103_ESCROW_BANK</span> به{" "}
                  <span className="mono">2103_FIDUCIARY_ESCROW_LIABILITY</span>{" "}
                  ثبت خواهد شد. ادامه مراحل (ارسال، تأیید تحویل، آزادسازی)
                  به بنیان‌گذار شرکت بازمی‌گردد.
                </>
              ) : (
                <>
                  درخواست به وضعیت <span className="mono">CANCELLED</span>{" "}
                  منتقل می‌شود و بنیان‌گذار موظف است نسخه اصلاح‌شده‌ای ثبت
                  کند. این عمل قابل بازگشت نیست.
                </>
              )}
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}

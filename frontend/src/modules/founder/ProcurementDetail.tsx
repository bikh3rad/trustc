import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Procurements as ProcurementsApi,
  type Procurement,
  type Role,
  type WorkflowTransition,
} from "../../api";
import { useAuth } from "../../context/AuthContext";
import { Btn } from "../../components/ui/Btn";
import { Chip } from "../../components/ui/Chip";
import { FSM } from "../../components/ui/FSM";
import { Icon } from "../../components/ui/Icon";
import { useCurrentStartup } from "../../context/CurrentStartupContext";
import { useFrozen } from "../../context/FrozenContext";
import { useToast } from "../../context/ToastContext";
import { MobileFSMVertical } from "../../layout/mobile/MobileFSMVertical";
import {
  formatIRR,
  formatIRRPlain,
  priorityLabelFa,
  stateIndex,
  stateLabelFa,
  toFaDigits,
} from "../../lib/format";
import {
  NEXT_STATES,
  PROCUREMENT_STATES,
  STAMP_LABEL,
  awaitingRole,
  canTransition,
} from "../../lib/fsm";
import { useIsMobile } from "../../lib/useIsMobile";

const ROLE_LABEL_FA: Record<Role, string> = {
  ADMIN: "ادمین",
  FOUNDER: "بنیان‌گذار",
  VC: "سرمایه‌گذار (VC)",
  AUDITOR: "ممیز",
};

function FieldRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="eyebrow" style={{ marginBottom: 4 }}>
        {label}
      </div>
      <div className={mono ? "mono" : ""} style={{ fontSize: 14 }}>
        {value}
      </div>
    </div>
  );
}

export function ProcurementDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isFrozen } = useFrozen();
  const { current } = useCurrentStartup();
  const { user } = useAuth();
  const isMobile = useIsMobile();

  const [proc, setProc] = useState<Procurement | null>(null);
  const [history, setHistory] = useState<WorkflowTransition[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [stamp, setStamp] = useState<string | null>(null);

  async function refresh() {
    if (!id) return;
    try {
      const [p, h] = await Promise.all([
        ProcurementsApi.get(id),
        ProcurementsApi.history(id),
      ]);
      setProc(p);
      setHistory(h.history);
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!proc) {
    return (
      <div className="empty">
        <h3>در حال بارگذاری…</h3>
        {err && <div className="mono" style={{ color: "var(--state-bad)" }}>{err}</div>}
      </div>
    );
  }

  const startupFrozen = isFrozen(proc.startup_id);
  const next = NEXT_STATES[proc.state] ?? [];
  const advance = next.find((s) => s !== "CANCELLED");
  const ci = stateIndex(proc.state);

  // Role gates — these mirror services/procurement/internal/fsm/fsm.go
  // exactly. We compute them locally so the button only renders for
  // callers who are actually authorized to advance; the backend still
  // enforces the same rule and will 403 anyone who tries to bypass.
  const canAdvance = advance ? canTransition(user?.role, proc.state, advance) : false;
  const canCancel = next.includes("CANCELLED")
    ? canTransition(user?.role, proc.state, "CANCELLED")
    : false;
  const waitingOn = !canAdvance ? awaitingRole(proc.state) : null;

  async function transition(to: string) {
    if (!id) return;
    if (startupFrozen) {
      toast({ tone: "bad", msg: "این استارتاپ توسط VC فریز شده. هیچ گذری مجاز نیست." });
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await ProcurementsApi.transition(id, to);
      const label = STAMP_LABEL[to];
      if (label) {
        setStamp(label);
        window.setTimeout(() => setStamp(null), 1400);
      }
      await refresh();
    } catch (e) {
      setErr((e as Error).message);
      toast({ tone: "bad", msg: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack" style={{ gap: "var(--s-6)" }}>
      <header className="proc-detail-header">
        <div style={{ minWidth: 0 }}>
          <button
            className="btn btn--ghost btn--sm"
            onClick={() => navigate("/procurements")}
          >
            <Icon.arrow size={14} /> بازگشت به خریدها
          </button>
          <div className="eyebrow" style={{ marginTop: 12 }}>
            {proc.id.slice(0, 8)}
          </div>
          <h1 style={{ marginTop: 4 }}>{proc.title}</h1>
          <div className="row wrap" style={{ gap: 8, marginTop: 8 }}>
            <Chip state={proc.state} />
            <span className="muted mono" style={{ fontSize: 12 }}>
              {proc.supplier_name} · {proc.category}
            </span>
          </div>
        </div>
        <div className="row wrap proc-detail-actions" style={{ gap: 12 }}>
          {advance && canAdvance ? (
            <Btn
              variant="primary"
              icon={<Icon.stamp />}
              disabled={busy || startupFrozen}
              onClick={() => transition(advance)}
            >
              پیشروی به: {stateLabelFa(advance)}
            </Btn>
          ) : !advance ? (
            <Btn variant="ghost" disabled>
              وضعیت پایانی
            </Btn>
          ) : waitingOn ? (
            <div
              className="chip"
              data-tone="warn"
              title={`این مرحله توسط ${ROLE_LABEL_FA[waitingOn]} انجام می‌شود — از پنل خودش اقدام کند.`}
              style={{ padding: "8px 12px", fontSize: 13 }}
            >
              در انتظار تأیید {ROLE_LABEL_FA[waitingOn]}
            </div>
          ) : null}
          {next.includes("CANCELLED") && canCancel && (
            <Btn
              variant="danger"
              disabled={busy || startupFrozen}
              onClick={() => transition("CANCELLED")}
            >
              لغو
            </Btn>
          )}
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

      {isMobile ? (
        <MobileFSMVertical currentState={proc.state} />
      ) : (
        <FSM currentState={proc.state} />
      )}

      <section
        className="grid proc-detail-grid"
        style={{ gap: "var(--s-6)" }}
      >
        <div className="stack" style={{ gap: "var(--s-4)" }}>
          <div className="card">
            <div className="card-title">
              <h3>مشخصات خرید</h3>
            </div>
            <div
              className="grid form-row-2"
              style={{
                gridTemplateColumns: "1fr 1fr",
                gap: "var(--s-4) var(--s-6)",
              }}
            >
              <FieldRow label="مبلغ" value={formatIRR(proc.amount_cents)} />
              <FieldRow label="ارز" value={proc.currency} mono />
              <FieldRow
                label="اولویت"
                value={priorityLabelFa(proc.priority)}
              />
              <FieldRow label="دسته بودجه" value={proc.category} />
              <FieldRow
                label="ثبت شده"
                value={toFaDigits(new Date(proc.created_at).toLocaleDateString("fa-IR"))}
                mono
              />
              <FieldRow
                label="استارتاپ"
                value={current?.id === proc.startup_id ? (current?.startup_name ?? proc.startup_id) : proc.startup_id.slice(0, 8)}
              />
            </div>
          </div>

          {ci >= stateIndex("ESCROW_LOCK") && PROCUREMENT_STATES.includes(proc.state as never) && (
            <div
              className="card"
              style={{
                background: "var(--cream-100)",
                borderColor: "var(--orange-600)",
              }}
            >
              <div className="row" style={{ justifyContent: "space-between" }}>
                <div>
                  <div className="eyebrow" style={{ color: "var(--orange-800)" }}>
                    قفل JIT اسکرو
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--mono-data)",
                      fontWeight: 600,
                      fontSize: 20,
                      marginTop: 4,
                    }}
                  >
                    {formatIRRPlain(proc.amount_cents)}{" "}
                    <span className="muted">{proc.currency}</span>
                  </div>
                  <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
                    تحت سرفصل{" "}
                    <span className="mono">2103_FIDUCIARY_ESCROW_LIABILITY</span>
                  </div>
                </div>
                <div className="stamp" style={{ color: "var(--state-good)" }}>
                  ESCROW{"\n"}LOCKED
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-title">
            <h3>تایم‌لاین</h3>
          </div>
          <div className="stack" style={{ gap: 0 }}>
            {history.length === 0 && (
              <div className="muted" style={{ fontSize: 13 }}>
                هنوز رویدادی ثبت نشده.
              </div>
            )}
            {history.map((ev, i) => {
              const last = i === history.length - 1;
              return (
                <div
                  key={`${ev.to_state}-${i}`}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "12px 1fr",
                    gap: 12,
                    padding: "10px 0",
                    borderBottom: last ? 0 : "1px dashed var(--border-hairline)",
                  }}
                >
                  <div style={{ position: "relative" }}>
                    <div
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        background: last ? "var(--orange-600)" : "var(--state-good)",
                        marginTop: 6,
                      }}
                    />
                    {!last && (
                      <div
                        style={{
                          position: "absolute",
                          top: 16,
                          insetInlineStart: 4.5,
                          bottom: -10,
                          width: 1,
                          background: "var(--border-hairline)",
                        }}
                      />
                    )}
                  </div>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: 13 }}>
                      {stateLabelFa(ev.to_state)}
                    </div>
                    <div className="mono muted" style={{ fontSize: 11 }}>
                      {ev.from_state ? `${ev.from_state} → ` : ""}
                      {ev.to_state}
                    </div>
                    <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                      {toFaDigits(new Date(ev.transitioned_at).toLocaleString("fa-IR"))}
                      {ev.actor_role && ` · ${ev.actor_role}`}
                    </div>
                    {ev.reason && (
                      <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                        {ev.reason}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {stamp && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            pointerEvents: "none",
            display: "grid",
            placeItems: "center",
            zIndex: 80,
          }}
        >
          <div
            className="stamp action"
            style={{
              width: 160,
              height: 160,
              fontSize: 18,
              whiteSpace: "pre-line",
            }}
          >
            {stamp}
          </div>
        </div>
      )}
    </div>
  );
}

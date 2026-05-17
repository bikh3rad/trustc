import { useEffect, useMemo, useRef, useState } from "react";
import {
  Audit as AuditApi,
  Governance as GovernanceApi,
  Startups as StartupsApi,
  type AuditRecord,
  type Freeze,
  type FreezeDuration,
  type FreezeScope,
  type Startup,
} from "../api";
import "./governance.css";

const POLL_MS = 6000;
const HOLD_MS = 1400;

// Freeze action form per CLAUDE.md §8.5 (frz_form_005).
export function Governance() {
  const [startups, setStartups] = useState<Startup[]>([]);
  const [active, setActive] = useState<Freeze[]>([]);
  const [logs, setLogs] = useState<AuditRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [now, setNow] = useState<Date>(new Date());
  const [lastActionAt, setLastActionAt] = useState<Date | null>(null);

  const [scope, setScope] = useState<FreezeScope>("FULL");
  const [duration, setDuration] = useState<FreezeDuration>("TEMPORARY");
  const [reason, setReason] = useState<string>("");

  const refresh = async () => {
    try {
      const [s, f, l] = await Promise.all([
        StartupsApi.list(),
        GovernanceApi.listActive(),
        AuditApi.list({ limit: 200 }),
      ]);
      setStartups(s.startups);
      setActive(f.freezes);
      setLogs(
        l.records.filter(
          (r) =>
            r.event_type === "trustc.governance.freeze_activated" ||
            r.event_type === "trustc.governance.freeze_lifted"
        )
      );
      if (!selectedId && s.startups.length) setSelectedId(s.startups[0].id);
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  useEffect(() => {
    void refresh();
    const t = window.setInterval(refresh, POLL_MS);
    const clock = window.setInterval(() => setNow(new Date()), 1000);
    return () => {
      window.clearInterval(t);
      window.clearInterval(clock);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const byId = useMemo(() => {
    const m = new Map<string, Startup>();
    startups.forEach((s) => m.set(s.id, s));
    return m;
  }, [startups]);

  const activeBy = useMemo(() => {
    const m = new Map<string, Freeze>();
    active.forEach((f) => m.set(f.startup_id, f));
    return m;
  }, [active]);

  const selected = selectedId ? byId.get(selectedId) ?? null : null;
  const selectedFreeze = selectedId ? activeBy.get(selectedId) ?? null : null;

  const stats = {
    active: active.length,
    standby: Math.max(0, startups.length - active.length),
    last: lastActionAt ?? logs[0]?.recorded_at,
  };

  const onArm = async () => {
    if (!selected) return;
    setErr(null);
    try {
      await GovernanceApi.activate({
        startup_id: selected.id,
        scope,
        duration,
        reason: reason.trim() || `${scope} freeze`,
      });
      setReason("");
      setLastActionAt(new Date());
      await refresh();
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  const onLift = async () => {
    if (!selectedFreeze) return;
    setErr(null);
    try {
      await GovernanceApi.lift(selectedFreeze.id, "Resolved by operator");
      setLastActionAt(new Date());
      await refresh();
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  const canArm = !!selected && !selectedFreeze && reason.trim().length > 0;

  return (
    <div className="gov-shell">
      <Header now={now} stats={stats} />
      <div className="gov-body">
        <Roster
          startups={startups}
          activeBy={activeBy}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />

        <section className="gov-pane">
          <div className="gov-pane__head">
            <span className="gov-pane__title">
              <span className="lead">▣</span> Console
            </span>
            <span className="gov-pane__meta">Station 02 · Operator</span>
          </div>

          <div className="gov-console">
            {!selected ? (
              <div className="gov-empty">— No target selected —</div>
            ) : (
              <>
                <Target startup={selected} freeze={selectedFreeze} />

                {err && <div className="gov-error">⚠ {err}</div>}

                {selectedFreeze ? (
                  <ActiveFreezePanel
                    freeze={selectedFreeze}
                    onLift={onLift}
                  />
                ) : (
                  <ArmSequence
                    scope={scope}
                    duration={duration}
                    reason={reason}
                    canArm={canArm}
                    onScope={setScope}
                    onDuration={setDuration}
                    onReason={setReason}
                    onArm={onArm}
                  />
                )}
              </>
            )}
          </div>
        </section>

        <LogPane logs={logs} startups={byId} />
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------- */
/* Header                                                                  */
/* --------------------------------------------------------------------- */

function Header({
  now,
  stats,
}: {
  now: Date;
  stats: { active: number; standby: number; last: string | Date | undefined };
}) {
  const armed = stats.active > 0;
  return (
    <header className="gov-header">
      <div>
        <div className="gov-eyebrow">
          <span className="dot" />
          trustC <span className="sep">//</span> Governance
          <span className="sep">·</span> Phase 1
        </div>
        <h1 className="gov-title">
          Kill-switch <em>Console</em>
        </h1>
      </div>
      <div className="gov-stats">
        <Stat
          label="Active freezes"
          value={pad(stats.active, 3)}
          tone={armed ? "armed" : undefined}
        />
        <Stat label="Standby" value={pad(stats.standby, 3)} tone="steel" />
        <Stat
          label="UTC"
          value={now.toISOString().slice(11, 19)}
        />
        <Stat
          label="Δ Since action"
          value={
            stats.last ? sinceShort(stats.last, now) : "—"
          }
        />
      </div>
    </header>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "armed" | "steel";
}) {
  return (
    <div className="gov-stat">
      <span className="gov-stat__label">{label}</span>
      <span className={`gov-stat__value ${tone ?? ""}`}>{value}</span>
    </div>
  );
}

/* --------------------------------------------------------------------- */
/* Roster                                                                  */
/* --------------------------------------------------------------------- */

function Roster({
  startups,
  activeBy,
  selectedId,
  onSelect,
}: {
  startups: Startup[];
  activeBy: Map<string, Freeze>;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  // Sort so armed startups bubble to the top.
  const sorted = useMemo(() => {
    return [...startups].sort((a, b) => {
      const aA = activeBy.has(a.id) ? 0 : 1;
      const bA = activeBy.has(b.id) ? 0 : 1;
      if (aA !== bA) return aA - bA;
      return a.startup_name.localeCompare(b.startup_name);
    });
  }, [startups, activeBy]);

  return (
    <section className="gov-pane">
      <div className="gov-pane__head">
        <span className="gov-pane__title">
          <span className="lead">▢</span> Roster
        </span>
        <span className="gov-pane__meta">{pad(startups.length, 2)} units</span>
      </div>
      <div className="gov-roster">
        {sorted.map((s) => {
          const armed = activeBy.has(s.id);
          const isSel = selectedId === s.id;
          return (
            <div
              key={s.id}
              className={`gov-roster__row ${isSel ? "selected" : ""}`}
              onClick={() => onSelect(s.id)}
            >
              <span className={`gov-light ${armed ? "armed" : ""}`} />
              <span className="gov-roster__name">{s.startup_name}</span>
              <span
                className={`gov-roster__status ${armed ? "armed" : ""}`}
              >
                {armed ? "ARMED" : "STANDBY"}
              </span>
            </div>
          );
        })}
        {!sorted.length && (
          <div className="gov-empty">— No units in fleet —</div>
        )}
      </div>
    </section>
  );
}

/* --------------------------------------------------------------------- */
/* Target detail                                                           */
/* --------------------------------------------------------------------- */

function Target({
  startup,
  freeze,
}: {
  startup: Startup;
  freeze: Freeze | null;
}) {
  const armed = !!freeze;
  return (
    <header className="gov-target">
      <div>
        <div className="gov-target__id">
          unit · {startup.id.slice(0, 8)}
        </div>
        <h2 className="gov-target__name">{startup.startup_name}</h2>
        <div className="gov-target__meta">
          <span>{startup.industry || "—"}</span>
          <span>{startup.country || "—"}</span>
          <span>Risk · {startup.risk_level || "UNKNOWN"}</span>
          <span>Score · {startup.credit_score ?? "—"}</span>
        </div>
      </div>
      <div className={`gov-target__state ${armed ? "armed" : "standby"}`}>
        <span className="label">Status</span>
        <span className="value">
          {armed ? "● ARMED" : "○ STANDBY"}
        </span>
      </div>
    </header>
  );
}

/* --------------------------------------------------------------------- */
/* Arm sequence (when target is NOT frozen)                                */
/* --------------------------------------------------------------------- */

function ArmSequence({
  scope,
  duration,
  reason,
  canArm,
  onScope,
  onDuration,
  onReason,
  onArm,
}: {
  scope: FreezeScope;
  duration: FreezeDuration;
  reason: string;
  canArm: boolean;
  onScope: (s: FreezeScope) => void;
  onDuration: (d: FreezeDuration) => void;
  onReason: (r: string) => void;
  onArm: () => void;
}) {
  return (
    <div className="gov-arm-sequence">
      <div className="gov-section-label">Arm sequence</div>

      <div className="gov-field">
        <div className="gov-field__label">Scope</div>
        <div className="gov-toggle">
          <button
            className={scope === "FULL" ? "active" : ""}
            onClick={() => onScope("FULL")}
          >
            ▰ Full · halt all
          </button>
          <button
            className={`${scope === "PARTIAL" ? "active partial" : ""}`}
            onClick={() => onScope("PARTIAL")}
          >
            ▱ Partial · new only
          </button>
        </div>
      </div>

      <div className="gov-field">
        <div className="gov-field__label">Duration</div>
        <div className="gov-toggle">
          <button
            className={duration === "TEMPORARY" ? "active" : ""}
            onClick={() => onDuration("TEMPORARY")}
          >
            Temporary
          </button>
          <button
            className={duration === "PERMANENT" ? "active" : ""}
            onClick={() => onDuration("PERMANENT")}
          >
            Permanent
          </button>
        </div>
      </div>

      <div className="gov-field" style={{ alignItems: "start" }}>
        <div className="gov-field__label" style={{ paddingTop: 10 }}>
          Reason
        </div>
        <textarea
          className="gov-input"
          rows={3}
          placeholder="Required for compliance trail — e.g. late filing, anomalous burn, regulatory hold"
          value={reason}
          onChange={(e) => onReason(e.target.value)}
        />
      </div>

      <div className="gov-arm-zone">
        <span />
        <span className="gov-arm-zone__bl" />
        <span className="gov-arm-zone__br" />
        <HoldButton
          label={`▶ Hold to arm · ${scope}`}
          armedLabel="◉ ARMING…"
          variant="arm"
          enabled={canArm}
          onComplete={onArm}
        />
        <div
          style={{
            fontSize: 10,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "var(--bone-faint)",
            marginTop: 12,
            textAlign: "center",
          }}
        >
          Hold for {(HOLD_MS / 1000).toFixed(1)}s · escrow movement will be
          halted on commit
        </div>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------- */
/* Active-freeze panel (when target IS frozen)                             */
/* --------------------------------------------------------------------- */

function ActiveFreezePanel({
  freeze,
  onLift,
}: {
  freeze: Freeze;
  onLift: () => void;
}) {
  const since = useSince(freeze.activated_at);
  return (
    <div className="gov-active">
      <div className="gov-active__banner">
        <h2>Freeze active · {since}</h2>
        <span className="gov-active__id">
          FRZ-{shortId(freeze.id)}
        </span>
      </div>

      <div className="gov-active__grid">
        <Field label="Scope" value={freeze.scope} armed />
        <Field label="Duration" value={freeze.duration} />
        <Field
          label="Activated"
          value={new Date(freeze.activated_at).toUTCString().slice(5, 22)}
        />
      </div>

      <div className="gov-active__reason">{freeze.reason}</div>

      <HoldButton
        label="▲ Hold to lift"
        armedLabel="◌ LIFTING…"
        variant="lift"
        enabled
        onComplete={onLift}
      />
      <div
        style={{
          fontSize: 10,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "var(--bone-faint)",
          marginTop: 12,
          textAlign: "center",
        }}
      >
        Lifting restores procurement transitions · in-flight items auto-frozen
        by activation remain terminal
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  armed,
}: {
  label: string;
  value: string;
  armed?: boolean;
}) {
  return (
    <div className="gov-active__field">
      <span className="k">{label}</span>
      <span className={`v ${armed ? "armed" : ""}`}>{value}</span>
    </div>
  );
}

/* --------------------------------------------------------------------- */
/* Hold-to-confirm button                                                  */
/* --------------------------------------------------------------------- */

function HoldButton({
  label,
  armedLabel,
  variant,
  enabled,
  onComplete,
}: {
  label: string;
  armedLabel: string;
  variant: "arm" | "lift";
  enabled: boolean;
  onComplete: () => void;
}) {
  const [progress, setProgress] = useState(0);
  const [holding, setHolding] = useState(false);
  const raf = useRef<number | null>(null);
  const started = useRef<number>(0);

  const tick = () => {
    const elapsed = performance.now() - started.current;
    const p = Math.min(1, elapsed / HOLD_MS);
    setProgress(p);
    if (p >= 1) {
      cancel();
      onComplete();
      return;
    }
    raf.current = requestAnimationFrame(tick);
  };

  const start = () => {
    if (!enabled) return;
    setHolding(true);
    started.current = performance.now();
    raf.current = requestAnimationFrame(tick);
  };

  const cancel = () => {
    if (raf.current !== null) cancelAnimationFrame(raf.current);
    raf.current = null;
    setHolding(false);
    setProgress(0);
  };

  useEffect(() => () => cancel(), []);

  return (
    <button
      type="button"
      className={`gov-action ${holding ? "armed" : ""} ${
        variant === "arm" ? "gov-action--armed" : ""
      }`}
      onMouseDown={start}
      onMouseUp={cancel}
      onMouseLeave={cancel}
      onTouchStart={start}
      onTouchEnd={cancel}
      onTouchCancel={cancel}
      disabled={!enabled}
    >
      <span
        className="gov-action__fill"
        style={{ transform: `scaleX(${progress})` }}
      />
      <span className="gov-action__label">{holding ? armedLabel : label}</span>
      <span className="gov-action__hint">
        {holding ? `${(progress * 100).toFixed(0)}%` : "press & hold"}
      </span>
    </button>
  );
}

/* --------------------------------------------------------------------- */
/* Log                                                                     */
/* --------------------------------------------------------------------- */

function LogPane({
  logs,
  startups,
}: {
  logs: AuditRecord[];
  startups: Map<string, Startup>;
}) {
  return (
    <section className="gov-pane gov-log-pane">
      <div className="gov-pane__head">
        <span className="gov-pane__title">
          <span className="lead">▤</span> Event log
        </span>
        <span className="gov-log__live">
          <span className="dot" />
          Live · {pad(POLL_MS / 1000, 2)}s
        </span>
      </div>
      <div className="gov-log">
        <div className="gov-log__feed">
          {logs.length === 0 && (
            <div className="gov-empty">— No freeze activity yet —</div>
          )}
          {logs.map((r) => {
            const activate =
              r.event_type === "trustc.governance.freeze_activated";
            const payload = (r.payload as { startup_id?: string; scope?: string }) || {};
            const startup = payload.startup_id
              ? startups.get(payload.startup_id)
              : undefined;
            return (
              <div key={r.event_id} className="gov-log__row">
                <span className="gov-log__time">
                  {new Date(r.recorded_at).toISOString().slice(11, 19)}
                </span>
                <span
                  className={`gov-log__icon ${
                    activate ? "activate" : "lift"
                  }`}
                >
                  {activate ? "▼" : "▲"}
                </span>
                <span className="gov-log__body">
                  <strong>
                    {activate ? "Activated" : "Lifted"}
                  </strong>{" "}
                  <em>·</em>{" "}
                  {startup ? startup.startup_name : payload.startup_id ?? "—"}
                  {activate && payload.scope ? ` · ${payload.scope}` : ""}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* --------------------------------------------------------------------- */
/* Utilities                                                               */
/* --------------------------------------------------------------------- */

function pad(n: number, w: number): string {
  const s = String(Math.max(0, Math.floor(n)));
  return s.length >= w ? s : "0".repeat(w - s.length) + s;
}

function shortId(id: string): string {
  return id.replace(/-/g, "").slice(0, 8).toUpperCase();
}

function sinceShort(at: string | Date, now: Date): string {
  const t = typeof at === "string" ? new Date(at).getTime() : at.getTime();
  const sec = Math.max(0, Math.floor((now.getTime() - t) / 1000));
  if (sec < 60) return `${pad(sec, 2)}s`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `${pad(m, 2)}m ${pad(sec % 60, 2)}s`;
  const h = Math.floor(m / 60);
  return `${pad(h, 2)}h ${pad(m % 60, 2)}m`;
}

function useSince(at: string): string {
  const [s, setS] = useState(() => sinceShort(at, new Date()));
  useEffect(() => {
    const t = setInterval(() => setS(sinceShort(at, new Date())), 1000);
    return () => clearInterval(t);
  }, [at]);
  return s;
}

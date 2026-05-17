/* ============================================================
   trustC — Shared UI primitives
   ------------------------------------------------------------
   Components designed for direct port to React+TS in the
   bikh3rad/trustc frontend. Keep prop signatures stable.
   ============================================================ */

/* ---------------- Icons ----------------
   Minimal inline SVG icon set. Each icon is a function that
   returns an SVG element — pass size + className via props.
   We avoid icon-font dependencies so the design is fully
   self-contained. Stroke 2px, currentColor.
*/
const Icon = {
  dashboard: (p={}) => (
    <svg width={p.size||18} height={p.size||18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/>
      <rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/>
    </svg>
  ),
  package: (p={}) => (
    <svg width={p.size||18} height={p.size||18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M16.5 9.4 7.55 4.24"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
      <path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>
    </svg>
  ),
  invoice: (p={}) => (
    <svg width={p.size||18} height={p.size||18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/>
    </svg>
  ),
  escrow: (p={}) => (
    <svg width={p.size||18} height={p.size||18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  ),
  ledger: (p={}) => (
    <svg width={p.size||18} height={p.size||18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
    </svg>
  ),
  portfolio: (p={}) => (
    <svg width={p.size||18} height={p.size||18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M3 22h18"/><path d="M5 22V8l7-5 7 5v14"/><path d="M9 22V12h6v10"/>
    </svg>
  ),
  audit: (p={}) => (
    <svg width={p.size||18} height={p.size||18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/><circle cx="11.5" cy="14.5" r="2.5"/><line x1="13.5" y1="16.5" x2="15" y2="18"/>
    </svg>
  ),
  reports: (p={}) => (
    <svg width={p.size||18} height={p.size||18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/><line x1="3" y1="20" x2="21" y2="20"/>
    </svg>
  ),
  freeze: (p={}) => (
    <svg width={p.size||18} height={p.size||18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M12 2v20"/><path d="M2 12h20"/><path d="M5 5l14 14"/><path d="M19 5L5 19"/>
    </svg>
  ),
  recycle: (p={}) => (
    <svg width={p.size||18} height={p.size||18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M7 19H4a2 2 0 0 1-1.7-3l4-6"/><path d="M17 5h3a2 2 0 0 1 1.7 3l-4 6"/>
      <path d="M14 17.5 12 21l-3-3.5"/><path d="M21 11 19 7l-4 1"/><path d="M3 13l2 4 4-1"/>
    </svg>
  ),
  arrow: (p={}) => (
    <svg width={p.size||16} height={p.size||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
    </svg>
  ),
  check: (p={}) => (
    <svg width={p.size||16} height={p.size||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  x: (p={}) => (
    <svg width={p.size||16} height={p.size||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  plus: (p={}) => (
    <svg width={p.size||16} height={p.size||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
  download: (p={}) => (
    <svg width={p.size||16} height={p.size||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  ),
  stamp: (p={}) => (
    <svg width={p.size||16} height={p.size||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M5 22h14"/><path d="M19 14H5a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2Z"/>
      <path d="M15 14V8a3 3 0 0 0-6 0v6"/>
    </svg>
  ),
  alert: (p={}) => (
    <svg width={p.size||16} height={p.size||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/>
      <line x1="12" y1="9" x2="12" y2="13"/><circle cx="12" cy="17" r="0.5"/>
    </svg>
  ),
  hash: (p={}) => (
    <svg width={p.size||14} height={p.size||14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/>
      <line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/>
    </svg>
  ),
};

/* ---------------- Stat card ----------------
   Big-number tile used on dashboards. `unit` is appended muted.
*/
function Stat({ label, value, unit, delta, hint, accent }) {
  return (
    <div className="stat" style={accent ? { borderColor: accent } : null}>
      <div className="label">{label}</div>
      <div className="value">
        <span className="num">{value}</span>
        {unit && <span className="unit">{unit}</span>}
      </div>
      {(delta || hint) && (
        <div className={"delta " + (delta?.tone || "")}>{delta?.text || hint}</div>
      )}
    </div>
  );
}

/* ---------------- State chip ----------------
   Renders MONOSPACE state name + Persian translation.
   Pass `state` (the canonical FSM token) and we resolve tone.
*/
function Chip({ state, tone, children }) {
  const t = tone || window.tc.stateTone(state);
  return (
    <span className="chip" data-tone={t}>
      <span className="mono">{state}</span>
      {state && <span className="fa">· {window.tc.stateLabelFa(state)}</span>}
      {children}
    </span>
  );
}

/* ---------------- Button (semantic) ---------------- */
function Btn({ variant = "ghost", children, onClick, disabled, type, size, icon }) {
  const cls = ["btn", "btn--" + variant, size ? "btn--" + size : ""].filter(Boolean).join(" ");
  return (
    <button className={cls} onClick={onClick} disabled={disabled} type={type || "button"}>
      {icon}{children}
    </button>
  );
}

/* ---------------- Modal ----------------
   Body and Foot are passed as children. Pass `manifest` for
   dark variant (used for Kill Switch confirmation).
*/
function Modal({ open, onClose, title, children, footer, manifest }) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={"modal" + (manifest ? " manifest" : "")} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="btn btn--ghost btn--icon" onClick={onClose} aria-label="بستن">
            <Icon.x />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

/* ---------------- FSM diagram ----------------
   Renders the 8-step procurement state machine.
   `currentState` highlights the active step; everything before
   is `done`, everything after is `locked`.
*/
function FSM({ currentState }) {
  const fsm = window.trustcData.procurementFSM;
  const ci = window.tc.stateIndex(currentState);
  return (
    <div className="fsm">
      {fsm.map((s, i) => {
        const cls =
          i < ci ? "done" :
          i === ci ? "current" :
          "locked";
        return (
          <div className={"fsm-step " + cls} key={s.state}>
            <div className="step-num">۰{i+1}</div>
            <div className="step-state">{s.state}</div>
            <div className="step-label">{s.label}</div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- Sparkline (SVG) ----------------
   `points` array of numbers. Renders a single-color line +
   shaded area, with thinned dots on inflection. Used for burn.
*/
function Spark({ points, color = "var(--orange-600)", height = 64, fill = "rgba(210,105,30,0.12)" }) {
  if (!points || points.length === 0) return null;
  const w = 100;
  const h = height;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const step = w / (points.length - 1);
  const coords = points.map((p, i) => [i * step, h - ((p - min) / range) * (h - 8) - 4]);
  const linePath = "M " + coords.map(c => c[0].toFixed(2) + " " + c[1].toFixed(2)).join(" L ");
  const areaPath = linePath + ` L ${w} ${h} L 0 ${h} Z`;
  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
      <path d={areaPath} fill={fill} />
      <path d={linePath} stroke={color} strokeWidth="1.5" fill="none" vectorEffect="non-scaling-stroke" />
      <circle cx={coords[coords.length-1][0]} cy={coords[coords.length-1][1]} r="2.4" fill={color} />
    </svg>
  );
}

/* ---------------- Persian-aware progress bar ---------------- */
function ProgressBar({ value, max = 100, tone = "active" }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const colorMap = {
    active: "var(--state-active)",
    good:   "var(--state-good)",
    warn:   "var(--state-warn)",
    bad:    "var(--state-bad)",
  };
  return (
    <div style={{ height: 6, background: "var(--cream-100)", borderRadius: 2, overflow: "hidden" }}>
      <div style={{
        width: pct + "%",
        height: "100%",
        background: colorMap[tone] || colorMap.active,
        transition: "width 320ms var(--ease-document)",
      }} />
    </div>
  );
}

/* ---------------- Document chrome wrapper (PDF-style reports) ---------------- */
function Doc({ children }) {
  return (
    <div className="doc">
      {children}
      <span className="tick-1" />
      <span className="tick-2" />
    </div>
  );
}

/* ---------------- Export to window ---------------- */
Object.assign(window, {
  Icon, Stat, Chip, Btn, Modal, FSM, Spark, ProgressBar, Doc,
});

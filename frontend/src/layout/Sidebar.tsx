import { useState } from "react";
import { NavLink } from "react-router-dom";
import { Icon } from "../components/ui/Icon";
import { ProgressBar } from "../components/ui/ProgressBar";
import { usePersona } from "../context/PersonaContext";
import { useCurrentStartup } from "../context/CurrentStartupContext";
import { toFaDigits } from "../lib/format";
import { navFor, SECTION_TITLE } from "./nav";
import type { Startup } from "../api";

function Brand() {
  return (
    <div className="brand">
      <div className="brand-mark">tC</div>
      <div>
        <div className="brand-name">trustC</div>
        <div
          style={{
            fontSize: 10,
            color: "var(--fg-on-manifest-muted)",
            letterSpacing: "0.08em",
            marginTop: 2,
          }}
        >
          سیستم‌عامل مالی
        </div>
      </div>
    </div>
  );
}

export function Sidebar({
  open = false,
  onClose,
}: {
  open?: boolean;
  onClose?: () => void;
} = {}) {
  const { persona } = usePersona();
  const { current, startups, setCurrentId, canSwitch } = useCurrentStartup();
  const items = navFor(persona);
  // End-of-rail card only makes sense in the founder workspace.
  const showStartupCard = persona === "FOUNDER" && !!current;

  return (
    <>
      {open && <div className="sidebar-scrim" onClick={onClose} />}
      <aside className={"app-sidebar" + (open ? " open" : "")}>
        <Brand />
        <div className="nav-section">
          <div className="nav-section-title">{SECTION_TITLE[persona]}</div>
          <div className="stack" style={{ gap: 2 }}>
            {items.map((it) => {
              const IconCmp = Icon[it.icon];
              return (
                <NavLink
                  key={it.path}
                  to={it.path}
                  end={it.path === "/admin"}
                  onClick={onClose}
                  className={({ isActive }) =>
                    "nav-item" + (isActive ? " active" : "")
                  }
                >
                  <span className="ico">
                    <IconCmp size={18} />
                  </span>
                  {it.label}
                </NavLink>
              );
            })}
          </div>
        </div>

        {showStartupCard && current && (
          <div className="nav-section" style={{ marginTop: "auto", borderBottom: 0 }}>
            <div className="nav-section-title">
              {canSwitch ? "بنیان‌گذاران (ادمین)" : "شرکت فعال"}
            </div>

            {canSwitch ? (
              <StartupPicker
                startups={startups}
                activeId={current.id}
                onPick={(id) => {
                  setCurrentId(id);
                  onClose?.();
                }}
              />
            ) : (
              <div style={{ padding: "8px 12px 4px", fontSize: 13 }}>
                <div style={{ fontWeight: 600, color: "var(--cream-50)" }}>
                  {current.startup_name}
                </div>
                <div
                  style={{
                    color: "var(--fg-on-manifest-muted)",
                    fontSize: 11,
                    marginTop: 2,
                  }}
                >
                  {current.industry}
                </div>
              </div>
            )}

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "12px 12px 0",
                fontSize: 11,
                color: "var(--fg-on-manifest-muted)",
              }}
            >
              <span>امتیاز اعتباری</span>
              <span
                className="mono"
                style={{ color: "var(--orange-500)", fontWeight: 600 }}
              >
                {toFaDigits(current.credit_score)} / ۱۰۰
              </span>
            </div>
            <div style={{ padding: "6px 12px 0" }}>
              <ProgressBar
                value={current.credit_score}
                tone={
                  current.credit_score > 80
                    ? "good"
                    : current.credit_score > 60
                      ? "active"
                      : "warn"
                }
              />
            </div>
          </div>
        )}

        <div
          style={{
            marginTop: showStartupCard ? undefined : "auto",
            padding: "12px 16px",
            fontFamily: "var(--mono-data)",
            fontSize: 10,
            color: "var(--fg-on-manifest-muted)",
            letterSpacing: "0.08em",
            borderTop: "1px solid var(--navy-700)",
          }}
        >
          v۰.۹.۰ · MVP · {new Date().toLocaleDateString("fa-IR")}
        </div>
      </aside>
    </>
  );
}

/* Admin-only picker for impersonating any portfolio company's founder.
   A searchable, scrollable list of all startups returned by /v1/startups. */
function StartupPicker({
  startups,
  activeId,
  onPick,
}: {
  startups: Startup[];
  activeId: string;
  onPick: (id: string) => void;
}) {
  const [q, setQ] = useState("");
  const needle = q.trim().toLowerCase();
  const filtered = needle
    ? startups.filter(
        (s) =>
          s.startup_name.toLowerCase().includes(needle) ||
          s.legal_name?.toLowerCase().includes(needle) ||
          s.industry?.toLowerCase().includes(needle),
      )
    : startups;

  return (
    <div className="stack" style={{ gap: 6, padding: "4px 8px 0" }}>
      <input
        type="text"
        placeholder="جستجو نام شرکت…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        style={{
          width: "100%",
          padding: "6px 10px",
          fontSize: 12,
          background: "rgba(0,0,0,0.25)",
          border: "1px solid var(--navy-700)",
          borderRadius: 4,
          color: "var(--cream-50)",
          outline: "none",
        }}
      />
      <div className="stack" style={{ gap: 1, maxHeight: 240, overflowY: "auto" }}>
        {filtered.map((s) => {
          const active = s.id === activeId;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onPick(s.id)}
              title={`${s.startup_name} · ${s.industry}`}
              style={{
                textAlign: "right",
                padding: "8px 10px",
                fontSize: 12,
                background: active ? "var(--orange-600)" : "transparent",
                color: active ? "var(--cream-50)" : "var(--fg-on-manifest, #fff)",
                border: 0,
                borderRadius: 4,
                cursor: "pointer",
                display: "grid",
                gridTemplateColumns: "1fr auto",
                alignItems: "center",
                gap: 8,
                fontFamily: "inherit",
              }}
              onMouseEnter={(e) => {
                if (!active)
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "rgba(255,255,255,0.06)";
              }}
              onMouseLeave={(e) => {
                if (!active)
                  (e.currentTarget as HTMLButtonElement).style.background = "transparent";
              }}
            >
              <span
                style={{
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  fontWeight: active ? 600 : 500,
                }}
              >
                {s.startup_name}
              </span>
              <span
                className="mono"
                style={{ fontSize: 10, opacity: 0.7, letterSpacing: 0.5 }}
              >
                {s.credit_score}
              </span>
            </button>
          );
        })}
        {filtered.length === 0 && (
          <div
            style={{
              padding: 10,
              fontSize: 11,
              color: "var(--fg-on-manifest-muted)",
              textAlign: "center",
            }}
          >
            موردی یافت نشد
          </div>
        )}
      </div>
    </div>
  );
}

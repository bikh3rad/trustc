import { NavLink } from "react-router-dom";
import { Icon } from "../components/ui/Icon";
import { ProgressBar } from "../components/ui/ProgressBar";
import { usePersona } from "../context/PersonaContext";
import { useCurrentStartup } from "../context/CurrentStartupContext";
import { toFaDigits } from "../lib/format";
import { navFor, SECTION_TITLE } from "./nav";

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
  const { current } = useCurrentStartup();
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
            <div className="nav-section-title">شرکت فعال</div>
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

// AccountDrawer — right-side full-height panel opened from MobileTopbar.
//
// Shows: user identity card, the full role nav (mirrors desktop sidebar so
// routes not on the bottom tab bar are still reachable), an ADMIN-only
// persona switcher (parity with desktop topbar's seg), and a logout button.
import { useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { usePersona, type Persona } from "../../context/PersonaContext";
import { Icon } from "../../components/ui/Icon";
import { ROLE_HOME } from "../../routes/RoleGuard";
import { navFor } from "../nav";

const ROLE_TONE = {
  ADMIN:   "bad",
  VC:      "active",
  AUDITOR: "warn",
  FOUNDER: "good",
} as const;

const ADMIN_SWITCH_TARGETS: Array<{ persona: Persona; label: string }> = [
  { persona: "ADMIN",   label: "ادمین" },
  { persona: "FOUNDER", label: "بنیان" },
  { persona: "VC",      label: "VC" },
  { persona: "AUDITOR", label: "ممیز" },
];

type Props = {
  open: boolean;
  onClose: () => void;
};

export function AccountDrawer({ open, onClose }: Props) {
  const { user, logout } = useAuth();
  const { persona, setPersona } = usePersona();
  const navigate = useNavigate();
  const location = useLocation();

  // Auto-close on route change so tapping a nav item dismisses the drawer.
  useEffect(() => {
    if (open) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Esc to close.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !user) return null;

  const isAdmin = user.role === "ADMIN";
  const items = navFor(persona);

  function switchPersona(p: Persona) {
    setPersona(p);
    navigate(ROLE_HOME[p]);
    onClose();
  }

  return (
    <>
      <div className="mobile-scrim" onClick={onClose} />
      <aside className="mobile-drawer" role="dialog" aria-label="حساب کاربری">
        <div
          className="row"
          style={{
            justifyContent: "space-between",
            padding: "var(--s-5)",
            paddingTop: "calc(var(--s-5) + env(safe-area-inset-top))",
            borderBottom: "1px solid var(--border-hairline)",
          }}
        >
          <div>
            <div style={{ fontWeight: 600 }}>{user.name}</div>
            <div className="muted mono" style={{ fontSize: 11, marginTop: 2 }}>
              {user.email}
            </div>
            <div style={{ marginTop: 8 }}>
              <span className="chip" data-tone={ROLE_TONE[user.role]}>
                <span className="mono">{user.role}</span>
              </span>
            </div>
          </div>
          <button
            type="button"
            className="btn btn--ghost btn--icon"
            onClick={onClose}
            aria-label="بستن"
          >
            <Icon.x />
          </button>
        </div>

        <div className="nav-section" style={{ borderBottom: 0 }}>
          <div className="nav-section-title" style={{ color: "var(--fg-muted)" }}>
            دسترسی
          </div>
          <div className="stack" style={{ gap: 2 }}>
            {items.map((it) => {
              const IconCmp = Icon[it.icon];
              return (
                <NavLink
                  key={it.path}
                  to={it.path}
                  end={it.path === "/admin"}
                  className={({ isActive }) =>
                    "nav-item nav-item--paper" + (isActive ? " active" : "")
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

        {isAdmin && (
          <div className="nav-section" style={{ borderBottom: 0 }}>
            <div className="nav-section-title" style={{ color: "var(--fg-muted)" }}>
              تغییر نقش (ادمین)
            </div>
            <div className="seg" style={{ width: "100%" }}>
              {ADMIN_SWITCH_TARGETS.map((t) => (
                <button
                  key={t.persona}
                  type="button"
                  className={persona === t.persona ? "active" : ""}
                  style={{ flex: 1 }}
                  onClick={() => switchPersona(t.persona)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div
          style={{
            padding: "var(--s-5)",
            paddingBottom: "calc(var(--s-5) + env(safe-area-inset-bottom))",
            marginTop: "auto",
            borderTop: "1px solid var(--border-hairline)",
          }}
        >
          <button
            type="button"
            className="btn btn--secondary"
            style={{ width: "100%", justifyContent: "center" }}
            onClick={() => {
              onClose();
              void logout();
            }}
          >
            <Icon.logout size={14} /> خروج
          </button>
        </div>
      </aside>
    </>
  );
}

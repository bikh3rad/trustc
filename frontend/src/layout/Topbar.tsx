import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { usePersona, type Persona } from "../context/PersonaContext";
import { useCurrentStartup } from "../context/CurrentStartupContext";
import { useFrozen } from "../context/FrozenContext";
import { Icon } from "../components/ui/Icon";
import { UserMenu } from "./UserMenu";
import { ROLE_HOME } from "../routes/RoleGuard";

const PERSONA_LABEL: Record<Persona, { label: string; company: string }> = {
  ADMIN:   { label: "مدیر سیستم",  company: "trustC" },
  FOUNDER: { label: "بنیان‌گذار",  company: "شرکت فعال" },
  VC:      { label: "سرمایه‌گذار", company: "صندوق trustC" },
  AUDITOR: { label: "ممیز",        company: "مرکز حسابرسی" },
};

// Persona switcher targets — the routes admins land on when they
// "impersonate" a non-admin role for debugging.
const ADMIN_SWITCH_TARGETS: Array<{ persona: Persona; label: string }> = [
  { persona: "ADMIN",   label: "ادمین" },
  { persona: "FOUNDER", label: "بنیان‌گذار" },
  { persona: "VC",      label: "VC" },
  { persona: "AUDITOR", label: "ممیز" },
];

export function Topbar({ onMenu }: { onMenu?: () => void } = {}) {
  const { user } = useAuth();
  const { persona, setPersona } = usePersona();
  const { current } = useCurrentStartup();
  const { isFrozen } = useFrozen();
  const navigate = useNavigate();

  if (!user) return null;

  const label = PERSONA_LABEL[persona];
  // Frozen banner: only render the chip when the viewer is a founder of a
  // frozen startup. Admins impersonating a frozen founder will see it too.
  const frozen =
    persona === "FOUNDER" && current ? isFrozen(current.id) : false;
  const company =
    persona === "FOUNDER" && current ? current.startup_name : (user.company || label.company);

  const isAdmin = user.role === "ADMIN";

  function switchPersona(p: Persona) {
    setPersona(p);
    navigate(ROLE_HOME[p]);
  }

  return (
    <header className="app-topbar">
      <div className="topbar-meta">
        {onMenu && (
          <button
            type="button"
            className="hamburger"
            onClick={onMenu}
            aria-label="منو"
          >
            <Icon.menu size={18} />
          </button>
        )}
        <div className="row" style={{ gap: 6, minWidth: 0 }}>
          <span className="eyebrow desktop-only">پنل</span>
          <span style={{ fontWeight: 600 }}>{label.label}</span>
          <span className="faint mono desktop-only" style={{ fontSize: 11 }}>
            · {company}
          </span>
        </div>
        {frozen && current && (
          <span
            className="chip"
            data-tone="bad"
            title="استارتاپ توسط VC فریز شده"
          >
            <span className="mono">FROZEN</span>
            <span className="fa desktop-only">· {current.startup_name}</span>
          </span>
        )}
      </div>

      <div className="topbar-actions">
        {/* Persona switcher is ADMIN-ONLY. Even if a non-admin somehow had a
            ref to setPersona it would be a no-op (see PersonaContext). The
            visual switcher being hidden keeps the UI honest. */}
        {isAdmin && (
          <div
            className="seg"
            title="ادمین می‌تواند نقش‌های دیگر را برای اشکال‌زدایی مشاهده کند"
          >
            {ADMIN_SWITCH_TARGETS.map((t) => (
              <button
                key={t.persona}
                type="button"
                className={persona === t.persona ? "active" : ""}
                onClick={() => switchPersona(t.persona)}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}
        <UserMenu />
      </div>
    </header>
  );
}

// MobileTopbar — fixed 56px header with brand + role label + avatar button.
// Tapping the avatar opens the AccountDrawer (controlled by parent).
import { useAuth } from "../../context/AuthContext";
import { usePersona } from "../../context/PersonaContext";
import { personaColorFor, personaLabelFa } from "./mobileTabsFor";

export function MobileTopbar({ onOpenDrawer }: { onOpenDrawer: () => void }) {
  const { user } = useAuth();
  const { persona } = usePersona();
  if (!user) return null;

  // First letter of the user's name in the avatar circle.
  // Persian glyphs render as expected via Vazirmatn.
  const initial = (user.name.trim()[0] || "?").toUpperCase();

  return (
    <header className="mobile-topbar">
      <div className="row" style={{ gap: 10, minWidth: 0 }}>
        <div className="mobile-mark">tC</div>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontWeight: 700,
              fontSize: 14,
              fontFamily: "var(--mono-data)",
              letterSpacing: "0.06em",
            }}
          >
            trustC
          </div>
          <div className="muted" style={{ fontSize: 10, marginTop: 1, lineHeight: 1 }}>
            {personaLabelFa(persona)}
          </div>
        </div>
      </div>
      <button
        type="button"
        className="mobile-avatar-btn"
        onClick={onOpenDrawer}
        aria-label="حساب کاربری"
        aria-haspopup="menu"
      >
        <span className="dot" style={{ background: personaColorFor(persona) }} />
        {initial}
      </button>
    </header>
  );
}

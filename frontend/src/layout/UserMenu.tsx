// UserMenu — top-right pill that opens a dropdown with email + logout.
//
// Closes on outside click + Escape. The role badge color matches the persona
// the user is CURRENTLY viewing (not their JWT role), so admins see ADMIN red
// even while impersonating other roles.
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Icon } from "../components/ui/Icon";
import type { Role } from "../api";

const ROLE_COLOR: Record<Role, string> = {
  ADMIN: "var(--state-bad)",
  FOUNDER: "var(--state-good)",
  VC: "var(--state-active)",
  AUDITOR: "var(--state-warn)",
};

export function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  if (!user) return null;
  const color = ROLE_COLOR[user.role];

  return (
    <div ref={rootRef} className="user-menu" style={{ position: "relative" }}>
      <button
        type="button"
        className="persona-pill"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="dot" style={{ background: color }} />
        <span>{user.name}</span>
        <span className="role-label">{user.role}</span>
      </button>

      {open && (
        <div
          role="menu"
          style={{
            position: "absolute",
            insetInlineEnd: 0,
            top: "calc(100% + 6px)",
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-hairline)",
            borderRadius: "var(--r-2)",
            boxShadow: "var(--shadow-2)",
            minWidth: 240,
            zIndex: 50,
            padding: 6,
          }}
        >
          <div
            style={{
              padding: "10px 12px",
              borderBottom: "1px solid var(--border-hairline)",
            }}
          >
            <div style={{ fontWeight: 500, fontSize: 13 }}>{user.name}</div>
            <div className="muted mono" style={{ fontSize: 11, marginTop: 2 }}>
              {user.email}
            </div>
            {user.company && (
              <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>
                {user.company}
              </div>
            )}
          </div>
          <button
            type="button"
            role="menuitem"
            className="btn btn--ghost btn--sm"
            style={{
              width: "100%",
              justifyContent: "flex-start",
              padding: "10px 12px",
              borderRadius: 4,
            }}
            onClick={() => {
              setOpen(false);
              void logout();
            }}
          >
            <Icon.logout size={14} /> خروج
          </button>
        </div>
      )}
    </div>
  );
}

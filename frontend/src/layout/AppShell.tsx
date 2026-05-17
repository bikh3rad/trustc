// AppShell decides which shell renders based on viewport width.
//   ≤760px → MobileShell  (compact top bar + bottom tabs + account drawer)
//   >760px → DesktopShell (sidebar + topbar, with drawer collapse at ≤1000px)
//
// useIsMobile() is called BEFORE any conditional return (Rules of Hooks).
// On resize the swap happens live — context (auth, persona, frozen, startup)
// lives above this component, so state survives the swap.
import { useEffect, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { MobileShell } from "./mobile/MobileShell";
import { useCurrentStartup } from "../context/CurrentStartupContext";
import { useFrozen } from "../context/FrozenContext";
import { usePersona } from "../context/PersonaContext";
import { useIsMobile } from "../lib/useIsMobile";

export function AppShell({ children }: { children: ReactNode }) {
  // Rules of Hooks: ALL hooks must be called before any conditional return.
  const isMobile = useIsMobile();
  const { persona } = usePersona();
  const { current } = useCurrentStartup();
  const { isFrozen } = useFrozen();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!sidebarOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setSidebarOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [sidebarOpen]);

  if (isMobile) {
    return <MobileShell>{children}</MobileShell>;
  }

  const founderFrozen =
    persona === "FOUNDER" && current ? isFrozen(current.id) : false;

  return (
    <div className="app-shell">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="app-main">
        <Topbar onMenu={() => setSidebarOpen((s) => !s)} />
        <main className="app-content">{children}</main>
      </div>

      {founderFrozen && current && (
        <>
          <div className="frozen-overlay" />
          <div className="frozen-banner">
            <span className="dot" />
            FROZEN · {current.startup_name} توسط VC تعلیق شده · تمام پرداخت‌ها متوقف
          </div>
        </>
      )}
    </div>
  );
}

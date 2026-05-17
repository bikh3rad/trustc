import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { useCurrentStartup } from "../context/CurrentStartupContext";
import { useFrozen } from "../context/FrozenContext";
import { usePersona } from "../context/PersonaContext";

export function AppShell({ children }: { children: ReactNode }) {
  const { persona } = usePersona();
  const { current } = useCurrentStartup();
  const { isFrozen } = useFrozen();
  const founderFrozen = persona === "FOUNDER" && current ? isFrozen(current.id) : false;

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <Topbar />
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

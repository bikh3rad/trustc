// MobileShell — the entire shell when useIsMobile() === true.
// Composes MobileTopbar (fixed top) + content area + BottomTabs (fixed bottom)
// + AccountDrawer (slides in from the start side when avatar is tapped).
import { useState, type ReactNode } from "react";
import { useCurrentStartup } from "../../context/CurrentStartupContext";
import { useFrozen } from "../../context/FrozenContext";
import { usePersona } from "../../context/PersonaContext";
import { AccountDrawer } from "./AccountDrawer";
import { BottomTabs } from "./BottomTabs";
import { MobileTopbar } from "./MobileTopbar";

export function MobileShell({ children }: { children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { persona } = usePersona();
  const { current } = useCurrentStartup();
  const { isFrozen } = useFrozen();

  const founderFrozen =
    persona === "FOUNDER" && current ? isFrozen(current.id) : false;

  return (
    <div className="mobile-shell">
      <MobileTopbar onOpenDrawer={() => setDrawerOpen(true)} />

      <main className="mobile-content">{children}</main>

      <BottomTabs />

      <AccountDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {/* Frozen overlay survives the mobile shell unchanged — it's
          position:fixed inset:0 and just needs to render after the
          content. The banner uses position:fixed so it stays at the top. */}
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

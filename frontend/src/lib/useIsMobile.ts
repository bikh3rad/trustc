// useIsMobile is the canonical viewport check for switching shells.
//
// The breakpoint is 760px by default — matches the CSS @media in globals.css.
// Detection is viewport-based (not UA-sniffing) so a desktop user dragging
// their window narrow gets the mobile experience and snaps back when they
// widen again. The shell swap is driven by this hook in AppShell.
//
// SSR-safe: defaults to `false` when there's no window.
import { useEffect, useState } from "react";

export function useIsMobile(breakpoint = 760): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= breakpoint;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    function onResize() {
      setIsMobile(window.innerWidth <= breakpoint);
    }
    // Re-sync on mount in case SSR returned a different value.
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [breakpoint]);

  return isMobile;
}

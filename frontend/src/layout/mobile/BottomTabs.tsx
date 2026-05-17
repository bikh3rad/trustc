// BottomTabs — fixed bottom navigation bar.
//
// Each tab is a real <NavLink> (not a state toggle), so browser back/forward
// and deep-linking work the way users expect on mobile.
import { NavLink, useLocation } from "react-router-dom";
import { Icon } from "../../components/ui/Icon";
import { usePersona } from "../../context/PersonaContext";
import { mobileTabsFor } from "./mobileTabsFor";

export function BottomTabs() {
  const { persona } = usePersona();
  const tabs = mobileTabsFor(persona);
  const loc = useLocation();

  return (
    <nav className="mobile-tabs">
      {tabs.map((t) => {
        const IconCmp = Icon[t.icon];
        // /admin needs `end` so it doesn't stay active on /admin/users.
        // For all other tabs, the "startsWith" match better reflects sub-routes
        // (e.g. /procurements/:id keeps the خریدها tab active).
        const isActive =
          t.path === "/admin"
            ? loc.pathname === "/admin"
            : loc.pathname === t.path ||
              loc.pathname.startsWith(t.path + "/");
        return (
          <NavLink
            key={t.path}
            to={t.path}
            end={t.path === "/admin"}
            className={"mobile-tab" + (isActive ? " active" : "")}
          >
            <span className="tab-icon">
              <IconCmp size={22} />
            </span>
            <span className="tab-label">{t.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}

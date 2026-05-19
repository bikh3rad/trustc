// mobileTabsFor — the bottom tab bar's 3-4 most-used routes per persona.
//
// Kept as a pure function so any sub-component (and tests) can derive the
// same list without prop-drilling. Each tab is a real route, not a state
// toggle: BottomTabs uses <NavLink> to drive react-router.
import type { IconName } from "../../components/ui/Icon";
import type { Persona } from "../../context/PersonaContext";

export type MobileTab = {
  path: string;
  label: string;
  icon: IconName;
};

const FOUNDER: MobileTab[] = [
  { path: "/dashboard",    label: "خانه",    icon: "dashboard" },
  { path: "/procurements", label: "خریدها",  icon: "package" },
  { path: "/invoices",     label: "فاکتور",  icon: "invoice" },
  { path: "/escrow",       label: "اسکرو",   icon: "escrow" },
];

const VC: MobileTab[] = [
  { path: "/vc/portfolio",  label: "پورتفو",  icon: "portfolio" },
  { path: "/vc/approvals",  label: "تأییدها", icon: "package" },
  { path: "/vc/companies",  label: "شرکت‌ها", icon: "users" },
  { path: "/vc/killswitch", label: "Kill",    icon: "freeze" },
];

const AUDITOR: MobileTab[] = [
  { path: "/auditor/audit",   label: "حسابرسی", icon: "audit" },
  { path: "/auditor/reports", label: "گزارش",   icon: "reports" },
];

const ADMIN: MobileTab[] = [
  { path: "/admin",          label: "خانه",    icon: "dashboard" },
  { path: "/admin/users",    label: "کاربران", icon: "users" },
  { path: "/admin/settings", label: "تنظیمات", icon: "settings" },
];

export function mobileTabsFor(persona: Persona): MobileTab[] {
  switch (persona) {
    case "ADMIN":   return ADMIN;
    case "VC":      return VC;
    case "AUDITOR": return AUDITOR;
    case "FOUNDER": return FOUNDER;
  }
}

export function personaLabelFa(p: Persona): string {
  return ({
    ADMIN:   "مدیر سیستم",
    FOUNDER: "بنیان‌گذار",
    VC:      "سرمایه‌گذار",
    AUDITOR: "ممیز",
  } as const)[p];
}

export function personaColorFor(p: Persona): string {
  return ({
    ADMIN:   "var(--state-bad)",
    FOUNDER: "var(--state-good)",
    VC:      "var(--state-active)",
    AUDITOR: "var(--state-warn)",
  } as const)[p];
}

// Single source of truth for which routes appear in nav lists for each role.
// Used by both the desktop Sidebar and the mobile AccountDrawer (which mirrors
// the full role nav since the bottom tabs only show the 3-4 most-used routes).
import type { IconName } from "../components/ui/Icon";
import type { Persona } from "../context/PersonaContext";

export type NavEntry = { path: string; label: string; icon: IconName };

export const NAV_FOUNDER: NavEntry[] = [
  { path: "/dashboard",    label: "داشبورد",         icon: "dashboard" },
  { path: "/procurements", label: "خریدها",          icon: "package" },
  { path: "/invoices",     label: "فاکتورهای فروش", icon: "invoice" },
  { path: "/escrow",       label: "اسکرو",           icon: "escrow" },
  { path: "/ledger",       label: "دفتر کل",          icon: "ledger" },
];

export const NAV_VC: NavEntry[] = [
  { path: "/vc/portfolio",  label: "پورتفولیو",         icon: "portfolio" },
  { path: "/vc/approvals",  label: "تأیید خریدها",       icon: "package" },
  { path: "/vc/companies",  label: "شرکت‌ها",            icon: "users" },
  { path: "/vc/recycling",  label: "بازیافت سرمایه",    icon: "recycle" },
  { path: "/vc/killswitch", label: "تعلیق (Kill Switch)", icon: "freeze" },
];

export const NAV_AUDITOR: NavEntry[] = [
  { path: "/auditor/audit",   label: "ردپای حسابرسی", icon: "audit" },
  { path: "/auditor/reports", label: "گزارش‌های مالی", icon: "reports" },
];

export const NAV_ADMIN: NavEntry[] = [
  { path: "/admin",          label: "نمای کلی",      icon: "dashboard" },
  { path: "/admin/users",    label: "کاربران",       icon: "users" },
  { path: "/admin/settings", label: "تنظیمات سیستم", icon: "settings" },
];

export function navFor(persona: Persona): NavEntry[] {
  switch (persona) {
    case "ADMIN":   return NAV_ADMIN;
    case "VC":      return NAV_VC;
    case "AUDITOR": return NAV_AUDITOR;
    case "FOUNDER": return NAV_FOUNDER;
  }
}

export const SECTION_TITLE: Record<Persona, string> = {
  ADMIN:   "مدیریت سیستم",
  FOUNDER: "ورک‌اسپیس استارتاپ",
  VC:      "کنترل پورتفوی",
  AUDITOR: "حسابرسی",
};

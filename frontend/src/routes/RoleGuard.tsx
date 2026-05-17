// RoleGuard restricts a route to a set of roles. If the current user's role
// isn't allowed, redirect them to their role's home rather than rendering a
// "forbidden" page — the gateway is the real authority (Phase 1), this guard
// is just so the UI never shows pages they couldn't use anyway.
import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useUser } from "../context/AuthContext";
import { type Role } from "../api";

// Default landing route per role. Imported by Topbar/Login too eventually.
export const ROLE_HOME: Record<Role, string> = {
  ADMIN: "/admin",
  FOUNDER: "/dashboard",
  VC: "/vc/portfolio",
  AUDITOR: "/auditor/audit",
};

export function RoleGuard({
  allow,
  children,
}: {
  allow: Role[];
  children: ReactNode;
}) {
  const user = useUser();
  if (!allow.includes(user.role)) {
    return <Navigate to={ROLE_HOME[user.role]} replace />;
  }
  return <>{children}</>;
}

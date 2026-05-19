// Mirrors services/procurement/internal/fsm/fsm.go. The backend is the source
// of truth — these tables exist only to drive the UI (button visibility,
// progress %, FSM diagram). Any divergence will surface as a 422 / 403 from
// the gateway.

import type { Role } from "../api";

export const PROCUREMENT_STATES = [
  "DRAFT",
  "MANAGER_REVIEW",
  "FINANCIAL_VALIDATION",
  "ESCROW_LOCK",
  "SUPPLIER_DISPATCH",
  "DELIVERY_CONFIRMATION",
  "PAYMENT_RELEASE",
  "ACCOUNTING_FINALIZATION",
] as const;

export type ProcurementState = (typeof PROCUREMENT_STATES)[number] | "CANCELLED" | "FROZEN";

export const NEXT_STATES: Record<string, ProcurementState[]> = {
  DRAFT: ["MANAGER_REVIEW", "CANCELLED"],
  MANAGER_REVIEW: ["FINANCIAL_VALIDATION", "CANCELLED"],
  FINANCIAL_VALIDATION: ["ESCROW_LOCK", "CANCELLED"],
  ESCROW_LOCK: ["SUPPLIER_DISPATCH"],
  SUPPLIER_DISPATCH: ["DELIVERY_CONFIRMATION"],
  DELIVERY_CONFIRMATION: ["PAYMENT_RELEASE"],
  PAYMENT_RELEASE: ["ACCOUNTING_FINALIZATION"],
};

export const STAMP_LABEL: Record<string, string> = {
  ESCROW_LOCK: "ESCROW\nLOCKED",
  PAYMENT_RELEASE: "PAYMENT\nRELEASED",
  DELIVERY_CONFIRMATION: "DELIVERY\nOK",
  ACCOUNTING_FINALIZATION: "FINALIZED",
};

// Role authorization per transition. Mirrors transitionRoles in
// services/procurement/internal/fsm/fsm.go. ADMIN is implicitly allowed
// everywhere — see canTransition() below.
//
// The key insight from the workflow design: VC owns the
// FINANCIAL_VALIDATION → ESCROW_LOCK boundary so capital can never be
// locked without an explicit VC sign-off, even when the startup has
// enough escrow balance to cover the request.
export const TRANSITION_ROLES: Record<string, Partial<Record<ProcurementState, Role[]>>> = {
  DRAFT: {
    MANAGER_REVIEW: ["FOUNDER"],
    CANCELLED: ["FOUNDER"],
  },
  MANAGER_REVIEW: {
    FINANCIAL_VALIDATION: ["FOUNDER"],
    CANCELLED: ["FOUNDER"],
  },
  FINANCIAL_VALIDATION: {
    ESCROW_LOCK: ["VC"],
    CANCELLED: ["VC"],
  },
  ESCROW_LOCK: {
    SUPPLIER_DISPATCH: ["FOUNDER"],
  },
  SUPPLIER_DISPATCH: {
    DELIVERY_CONFIRMATION: ["FOUNDER"],
  },
  DELIVERY_CONFIRMATION: {
    PAYMENT_RELEASE: ["FOUNDER"],
  },
  PAYMENT_RELEASE: {
    ACCOUNTING_FINALIZATION: ["FOUNDER"],
  },
};

export function canTransition(role: Role | undefined, from: string, to: string): boolean {
  if (!role) return false;
  if (role === "ADMIN") return true;
  const allowed = TRANSITION_ROLES[from]?.[to as ProcurementState];
  return allowed?.includes(role) ?? false;
}

// awaitingRole returns the role that owns the next transition out of `from`,
// or null if the procurement is terminal. Used by the founder UI to show a
// "در انتظار تأیید VC" hint when the caller can't advance.
export function awaitingRole(from: string): Role | null {
  const next = NEXT_STATES[from] ?? [];
  const advance = next.find((s) => s !== "CANCELLED");
  if (!advance) return null;
  const roles = TRANSITION_ROLES[from]?.[advance] ?? [];
  return (roles[0] as Role | undefined) ?? null;
}

export function isInflight(state: string): boolean {
  return (
    state !== "ACCOUNTING_FINALIZATION" &&
    state !== "CANCELLED" &&
    state !== "FROZEN"
  );
}

export function isEscrowLocked(state: string): boolean {
  return (
    state === "ESCROW_LOCK" ||
    state === "SUPPLIER_DISPATCH" ||
    state === "DELIVERY_CONFIRMATION" ||
    state === "PAYMENT_RELEASE"
  );
}

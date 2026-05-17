// Mirrors services/procurement/internal/fsm/fsm.go. The backend is the source
// of truth — these tables exist only to drive the UI (button visibility,
// progress %, FSM diagram). Any divergence will surface as a 422 from the
// gateway.

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

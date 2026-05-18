// Per-startup monthly aggregator.
//
// Buckets procurement + invoice records into the same 6 calendar months
// that the DB seed (db/seed/seed.sql §8) emits, then derives escrow
// inflow/outflow, credit utilization and a composite "credit health"
// score from those buckets. Everything downstream of the dashboard charts
// is computed from real API records — no random data per render.

import type { Procurement, Startup } from "../api";
import type { Inv } from "./mockInvoices";

// Six Gregorian buckets matching seed.sql. Order: oldest → newest.
export const MONTHS = [
  "2025-12",
  "2026-01",
  "2026-02",
  "2026-03",
  "2026-04",
  "2026-05",
] as const;

// Persian month labels for chart x-axes (Jalali equivalents).
export const MONTH_LABELS_FA = [
  "دی",
  "بهمن",
  "اسفند",
  "فروردین",
  "اردیبهشت",
  "خرداد",
] as const;

const FSM = [
  "DRAFT",
  "MANAGER_REVIEW",
  "FINANCIAL_VALIDATION",
  "ESCROW_LOCK",
  "SUPPLIER_DISPATCH",
  "DELIVERY_CONFIRMATION",
  "PAYMENT_RELEASE",
  "ACCOUNTING_FINALIZATION",
] as const;

const ESCROW_LOCK_IDX = 3;
const PAYMENT_RELEASE_IDX = 6;

function bucketOf(iso?: string): number {
  if (!iso) return -1;
  const ym = iso.slice(0, 7); // "YYYY-MM"
  return MONTHS.indexOf(ym as (typeof MONTHS)[number]);
}

export type MonthlySeries = {
  months: readonly string[];
  labels: readonly string[];
  purchases: number[];
  sales: number[];
  salesPaid: number[];
  escrow: number[];
  creditUsed: number[];
  creditLine: number;
  score: number[];
  totals: {
    purchases: number;
    sales: number;
    salesPaid: number;
    salesOpen: number;
    procCount: number;
    invCount: number;
  };
};

export function computeStartupMonthly(
  startup: Startup | null,
  procs: Procurement[],
  invs: Inv[],
  escrowBalanceCents: number,
): MonthlySeries {
  const purchases = new Array(MONTHS.length).fill(0);
  const sales = new Array(MONTHS.length).fill(0);
  const salesPaid = new Array(MONTHS.length).fill(0);
  const escrowInflow = new Array(MONTHS.length).fill(0);
  const escrowOutflow = new Array(MONTHS.length).fill(0);

  procs.forEach((p) => {
    const b = bucketOf(p.created_at);
    if (b < 0) return;
    purchases[b] += p.amount_cents;
    const sIdx = FSM.indexOf(p.state as (typeof FSM)[number]);
    if (sIdx >= ESCROW_LOCK_IDX) escrowInflow[b] += p.amount_cents;
    if (sIdx >= PAYMENT_RELEASE_IDX) {
      const rel = Math.min(MONTHS.length - 1, b + 1);
      escrowOutflow[rel] += p.amount_cents;
    }
  });

  invs.forEach((i) => {
    const b = bucketOf(i.issued_at);
    if (b >= 0) sales[b] += i.amount_cents;
    if (i.status === "PAID") {
      const pb = bucketOf(i.paid_at || i.issued_at);
      if (pb >= 0) salesPaid[pb] += i.amount_cents;
    }
  });

  // Walk the escrow balance backwards from the live API balance.
  const escrow = new Array(MONTHS.length).fill(0);
  let balance = escrowBalanceCents;
  escrow[MONTHS.length - 1] = balance;
  for (let m = MONTHS.length - 1; m > 0; m--) {
    balance = balance - escrowInflow[m] + escrowOutflow[m];
    escrow[m - 1] = Math.max(0, balance);
  }

  // Credit line is not on the DB record — derive a heuristic from burn rate
  // and credit score so the ceiling line on the chart is meaningful.
  const creditLine = startup
    ? Math.round(startup.burn_rate_cents * 20 * (startup.credit_score / 70))
    : 0;

  // Credit utilization per month = "still-locked" procurement amounts at
  // each bucket end. A procurement starts locking at its createdAt month
  // (if state ≥ ESCROW_LOCK) and stops locking one month after that if
  // state ≥ PAYMENT_RELEASE.
  const stillLocked = new Array(MONTHS.length).fill(0);
  procs.forEach((p) => {
    const b = bucketOf(p.created_at);
    if (b < 0) return;
    const sIdx = FSM.indexOf(p.state as (typeof FSM)[number]);
    if (sIdx < ESCROW_LOCK_IDX) return;
    const releaseAt =
      sIdx >= PAYMENT_RELEASE_IDX ? Math.min(MONTHS.length, b + 2) : MONTHS.length;
    for (let m = b; m < releaseAt; m++) stillLocked[m] += p.amount_cents;
  });

  // Anchor the last bucket to a reasonable utilization figure if the
  // raw still-locked value blows past the credit line.
  const lastLocked = stillLocked[MONTHS.length - 1];
  let creditUsed = stillLocked.slice();
  if (creditLine > 0 && lastLocked > creditLine) {
    const scale = creditLine / lastLocked;
    creditUsed = stillLocked.map((v) => Math.round(v * scale));
  }
  creditUsed = creditUsed.map((v) =>
    Math.min(creditLine > 0 ? creditLine : v, Math.max(0, v)),
  );

  // Composite credit-health score (0..100). Captures growth in sales,
  // escrow buffer vs credit line, and utilization headroom.
  const score = MONTHS.map((_, m) => {
    const growth = m === 0 ? 0 : (sales[m] - sales[0]) / Math.max(1, sales[0]);
    const buffer = escrow[m] / Math.max(1, creditLine);
    const util = creditUsed[m] / Math.max(1, creditLine);
    const raw = 60 + growth * 18 + buffer * 35 - util * 30;
    return Math.max(20, Math.min(100, Math.round(raw)));
  });

  const totalSales = sales.reduce((a, b) => a + b, 0);
  const totalSalesPaid = salesPaid.reduce((a, b) => a + b, 0);

  return {
    months: MONTHS,
    labels: MONTH_LABELS_FA,
    purchases,
    sales,
    salesPaid,
    escrow,
    creditUsed,
    creditLine,
    score,
    totals: {
      purchases: purchases.reduce((a, b) => a + b, 0),
      sales: totalSales,
      salesPaid: totalSalesPaid,
      salesOpen: totalSales - totalSalesPaid,
      procCount: procs.length,
      invCount: invs.length,
    },
  };
}

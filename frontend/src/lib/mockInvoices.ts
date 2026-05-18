// Per-startup mock customer invoices.
//
// The platform's invoice microservice isn't implemented yet (PRD §3.3),
// so the UI generates a deterministic ~100-record history per startup
// client-side. Numbers are seeded from the startup id so reloads give
// the same list; amounts scale with the company's burn rate; the date
// range mirrors db/seed/seed.sql §8 (Dec 2025 → May 2026).

import type { Startup } from "../api";

export type SettlementMode = "ESCROW_DIRECT" | "SELF_FUNDED";
export type InvStatus = "OPEN" | "PAID";

export type Inv = {
  id: string;
  startup_id: string;
  customer: string;
  amount_cents: number;
  mode: SettlementMode;
  status: InvStatus;
  issued_at: string;
  paid_at?: string;
};

const MONTHS = [
  "2025-12",
  "2026-01",
  "2026-02",
  "2026-03",
  "2026-04",
  "2026-05",
] as const;

const CUSTOMERS = [
  "شرکت سپهر داده",
  "گروه صنعتی پایدار",
  "هلدینگ نوآفرین",
  "تعاونی توسعه",
  "شرکت کوشش راه",
  "بازرگانی نوین کاران",
  "پخش سراسری ایران",
  "تاژ تجارت",
  "فروشگاه‌های زنجیره‌ای رفاه",
  "شرکت آینده‌سازان",
  "پخش پارسا",
  "پاتیلا",
  "گلستان طلایی",
  "پویا پخش",
  "مهرگان تجارت",
  "پگاه فارس",
  "تعاونی مصرف کارمندان",
  "صنایع شیر ایران",
  "شرکت کالای کشاورزی",
  "بازرگانی ساحل",
  "پخش زاگرس",
  "سپید ماهور",
];

const RISK_TREND: Record<string, number> = {
  LOW: 1.045,
  MEDIUM: 1.012,
  HIGH: 0.978,
  CRITICAL: 0.93,
};

// mulberry32: deterministic per-startup PRNG so the list is stable.
function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFor(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

const cache = new Map<string, Inv[]>();

export function mockInvoicesFor(startup: Startup, target = 100): Inv[] {
  const cached = cache.get(startup.id);
  if (cached) return cached;

  const r = rng(seedFor(startup.id));
  const trend = RISK_TREND[startup.risk_level] || 1.0;
  // Sales target ≈ burn × 1.6 so most companies are net positive on paper.
  const baseAvg = Math.max(50000, Math.round((startup.burn_rate_cents * 1.6) / 16));

  const out: Inv[] = [];
  for (let i = 0; i < target; i++) {
    const bIdx = Math.min(5, Math.floor(Math.pow(r(), 0.85) * 6));
    const month = MONTHS[bIdx];
    const day = Math.floor(r() * 27) + 1;
    const issued = `${month}-${pad2(day)}`;
    const age = 5 - bIdx;
    const paidProb = 0.22 + age * 0.17;
    const isPaid = r() < paidProb;
    const mode: SettlementMode = r() < 0.55 ? "ESCROW_DIRECT" : "SELF_FUNDED";
    const variation = 0.3 + r() * 1.9;
    const trendMult = Math.pow(trend, bIdx);
    const amount = Math.max(50000, Math.round(baseAvg * variation * trendMult));
    const paidDay = isPaid ? Math.min(28, day + 2 + Math.floor(r() * 6)) : 0;

    out.push({
      id: `cinv-${startup.id.slice(-4)}-${pad2(i + 1)}${pad2(Math.floor(r() * 99))}`,
      startup_id: startup.id,
      customer: CUSTOMERS[Math.floor(r() * CUSTOMERS.length)],
      amount_cents: amount,
      mode,
      status: isPaid ? "PAID" : "OPEN",
      issued_at: issued,
      ...(isPaid ? { paid_at: `${month}-${pad2(paidDay)}` } : {}),
    });
  }

  // Most-recent first so the list page lands on fresh activity.
  out.sort((a, b) => (a.issued_at < b.issued_at ? 1 : -1));
  cache.set(startup.id, out);
  return out;
}

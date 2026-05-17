// Thin REST client for the trustC API gateway.
// Auth: dev mode auto-mints a JWT via /auth/dev-token on first load.

const BASE = "";  // vite proxy forwards /api and /auth to :8080

let token: string | null = localStorage.getItem("trustc.token");

export async function ensureDevToken(): Promise<string> {
  if (token) return token;
  const r = await fetch(`${BASE}/auth/dev-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sub: "vc-admin@trustc.dev", role: "VC_ADMIN" }),
  });
  if (!r.ok) throw new Error(`auth failed: ${r.status}`);
  const j = (await r.json()) as { token: string };
  token = j.token;
  localStorage.setItem("trustc.token", token);
  return token;
}

function idempotencyKey(): string {
  return (
    Math.random().toString(36).slice(2) +
    "-" +
    Date.now().toString(36)
  );
}

export type ApiError = { error: string; message: string };

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const t = await ensureDevToken();
  const h = new Headers(init.headers);
  h.set("Authorization", `Bearer ${t}`);
  if (init.body && !h.has("Content-Type")) h.set("Content-Type", "application/json");
  if (init.method && init.method !== "GET" && init.method !== "HEAD") {
    if (!h.has("Idempotency-Key")) h.set("Idempotency-Key", idempotencyKey());
  }
  const r = await fetch(`${BASE}${path}`, { ...init, headers: h });
  if (!r.ok) {
    const body = (await r.json().catch(() => ({}))) as Partial<ApiError>;
    const msg = body.message || body.error || `HTTP ${r.status}`;
    throw new Error(msg);
  }
  if (r.status === 204) return undefined as T;
  return (await r.json()) as T;
}

// ---- Startups ----
export type Startup = {
  id: string;
  vc_id: string;
  startup_name: string;
  legal_name: string;
  industry: string;
  country: string;
  tax_id: string;
  status: string;
  credit_score: number;
  burn_rate_cents: number;
  risk_level: string;
};

export const Startups = {
  list: (vc_id?: string) =>
    call<{ startups: Startup[] }>(`/api/startups${vc_id ? `?vc_id=${vc_id}` : ""}`),
  get: (id: string) => call<Startup>(`/api/startups/${id}`),
  create: (body: object) =>
    call<Startup>(`/api/startups`, { method: "POST", body: JSON.stringify(body) }),
};

// ---- Procurements ----
export type Procurement = {
  id: string;
  startup_id: string;
  title: string;
  supplier_name: string;
  amount_cents: number;
  currency: string;
  category: string;
  priority: string;
  state: string;
  created_at: string;
};

export type WorkflowTransition = {
  from_state?: string;
  to_state: string;
  actor_id?: string;
  actor_role?: string;
  reason?: string;
  transitioned_at: string;
};

export const Procurements = {
  list: (startup_id?: string) => {
    const q = new URLSearchParams();
    if (startup_id) q.set("startup_id", startup_id);
    return call<{ procurements: Procurement[] }>(
      `/api/procurements${q.size ? `?${q.toString()}` : ""}`
    );
  },
  get: (id: string) => call<Procurement>(`/api/procurements/${id}`),
  history: (id: string) =>
    call<{ history: WorkflowTransition[] }>(`/api/procurements/${id}/history`),
  create: (body: object) =>
    call<Procurement>(`/api/procurements`, { method: "POST", body: JSON.stringify(body) }),
  transition: (id: string, to_state: string, reason?: string) =>
    call<Procurement>(`/api/procurements/${id}/transition`, {
      method: "POST",
      body: JSON.stringify({ to_state, reason }),
    }),
};

// ---- Escrow ----
export type EscrowAccount = {
  id: string;
  startup_id: string;
  balance_cents: number;
  locked_cents: number;
  available_cents: number;
  currency: string;
};

export const Escrow = {
  account: (startup_id: string) =>
    call<EscrowAccount>(`/api/escrow/accounts/${startup_id}`),
  topup: (startup_id: string, amount_cents: number) =>
    call<EscrowAccount>(`/api/escrow/accounts/${startup_id}/topup`, {
      method: "POST",
      body: JSON.stringify({ amount_cents }),
    }),
};

// ---- Ledger ----
// EntrySummary shape returned by services/ledger GET /entries
export type LedgerEntry = {
  id: string;
  transaction_id: string;
  workflow_reference_id?: string;
  description?: string;
  posted_at: string;
  total_cents: number;
};

export const Ledger = {
  list: (params: { workflow_reference_id?: string } = {}) => {
    const q = new URLSearchParams();
    if (params.workflow_reference_id) q.set("workflow_reference_id", params.workflow_reference_id);
    return call<{ entries: LedgerEntry[] }>(
      `/api/ledger/entries${q.size ? `?${q.toString()}` : ""}`
    );
  },
  balance: (code: string) =>
    call<{ account_code: string; balance_cents: number }>(
      `/api/ledger/accounts/${encodeURIComponent(code)}/balance`
    ),
};

// ---- Audit ----
export type AuditRecord = {
  event_id: string;
  service: string;
  event_type: string;
  actor_id?: string;
  actor_role?: string;
  subject_type?: string;
  subject_id?: string;
  request_id?: string;
  signature: string;
  previous_hash?: string;
  payload: unknown;
  recorded_at: string;
  seq: number;
};

export const Audit = {
  list: (filter: { subject_type?: string; subject_id?: string; event_type?: string; limit?: number } = {}) => {
    const q = new URLSearchParams();
    Object.entries(filter).forEach(([k, v]) => {
      if (v !== undefined && v !== "") q.set(k, String(v));
    });
    return call<{ records: AuditRecord[] }>(
      `/api/audit${q.size ? `?${q.toString()}` : ""}`
    );
  },
};

// ---- Governance (freeze / kill-switch) ----
export type FreezeScope = "FULL" | "PARTIAL";
export type FreezeDuration = "TEMPORARY" | "PERMANENT";

export type Freeze = {
  id: string;
  startup_id: string;
  scope: FreezeScope;
  duration: FreezeDuration;
  reason: string;
  actor_id?: string;
  actor_role?: string;
  request_id?: string;
  activated_at: string;
  lifted_at?: string | null;
  lift_reason?: string;
  lifted_by?: string;
};

export const Governance = {
  listActive: () =>
    call<{ freezes: Freeze[] }>(`/api/governance/freezes`),
  activeForStartup: (startup_id: string) =>
    call<{ frozen: boolean; freeze: Freeze | null }>(
      `/api/governance/freezes/startup/${startup_id}`
    ),
  history: (startup_id: string) =>
    call<{ freezes: Freeze[] }>(
      `/api/governance/freezes/startup/${startup_id}/history`
    ),
  activate: (body: {
    startup_id: string;
    scope: FreezeScope;
    duration: FreezeDuration;
    reason: string;
  }) =>
    call<Freeze>(`/api/governance/freezes`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  lift: (id: string, reason: string) =>
    call<Freeze>(`/api/governance/freezes/${id}/lift`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),
};

# trustC — Venture Financial Operating System

Programmable, escrow-first financial OS for venture-backed startups and their investors.
See `PRD.md` for product spec and `CLAUDE.md` for architectural constraints.

> **Status:** Phase 1 — vertical procurement slice (Startup → Procurement → Escrow → Ledger → Audit) with Governance kill-switch enforcement.

---

## Architecture (Phase 1)

```
                            ┌──────────────────┐
                            │   React Frontend │  :5173
                            └────────┬─────────┘
                                     │ REST
                            ┌────────▼─────────┐
                            │   API Gateway    │  :8080
                            │ JWT, idempotency │
                            └────────┬─────────┘
                                     │ gRPC
        ┌────────────┬───────────────┼───────────────┬────────────┬────────────┐
        ▼            ▼               ▼               ▼            ▼            ▼
  ┌──────────┐ ┌────────────┐  ┌──────────┐    ┌─────────┐  ┌────────┐  ┌────────────┐
  │ Startup  │ │Procurement │  │  Escrow  │    │ Ledger  │  │ Audit  │  │ Governance │
  │  :7001   │ │   :7002    │  │  :7003   │    │  :7004  │  │ :7005  │  │   :7006    │
  └────┬─────┘ └─────┬──────┘  └────┬─────┘    └────┬────┘  └───┬────┘  └─────┬──────┘
       │             │              │               │           │             │
       └─────────────┴──────────────┴───────────────┴───────────┴─────────────┘
                              │ NATS JetStream :4222
                              │ (event bus, every state transition)
                              ▼
                       ┌──────────────┐
                       │  PostgreSQL  │  :5432  one cluster, schema-per-service
                       └──────────────┘
```

Procurement gates every non-terminal transition on a synchronous governance
check; FROZEN/CANCELLED are always allowed (kill-switch override). On
`FreezeActivated` for a startup with `scope = FULL`, procurement walks every
in-flight request for that startup into the terminal `FROZEN` state.

---

## Quickstart

Prerequisites: Docker + docker compose, Go 1.22+, Node 20+.

```bash
make up              # Postgres + NATS + Redis + run migrations
make seed            # Load 1 VC + 10 startups

# In separate terminals:
make run-ledger
make run-audit
make run-governance
make run-startup
make run-procurement
make run-escrow
make run-gateway

make frontend-install
make frontend-dev    # http://localhost:5173
```

End-to-end smoke test (drives the full procurement FSM through the gateway):

```bash
make e2e
```

---

## Repository Layout

```
/services         Go microservices (one go.mod each, joined by go.work)
  /gateway        REST entry, JWT, idempotency, request tracing
  /startup        Startup registration + profile
  /procurement    8-state procurement FSM (PRD §10.1)
  /escrow         JIT lock / release engine
  /ledger         Immutable double-entry ledger (financial integrity core)
  /audit          Append-only, SHA-256 chained audit log
  /governance     Freeze / kill-switch enforcement (PRD §13, CLAUDE.md §6, §8.5)
  /shared         Common Go libs (events, ids, auth, errors, logging)
/proto            gRPC contracts (.proto + generated stubs)
/db
  /migrations     Per-service SQL migrations
  /seed           MVP fixtures: VC + 10 startups
/frontend         React + TypeScript + Vite
/deploy           docker-compose support files
```

---

## Non-Negotiable Invariants (from CLAUDE.md §6)

1. **Ledger is append-only.** No `UPDATE` or `DELETE` on `ledger.journal_entries` — enforced by trigger.
2. **Every transaction balances.** `SUM(debits) = SUM(credits)` — enforced inside the ledger service's posting transaction.
3. **Escrow-first execution.** Procurement → Escrow Lock → Delivery → Release. No payouts without a validated procurement step.
4. **Audit everything.** Every state transition emits an audit event with `actor_id`, `role`, `timestamp`, `service`, `request_id`, `event_id`.
5. **No cross-schema DB access.** Services talk via gRPC or events, never read another service's tables.

---

## License

Proprietary — trustC. All rights reserved.

# CLAUDE.md

# trustC — Microservice Financial Operating System (MVP)

---

## 1. Purpose

This file defines how **Claude operates as the system architect + execution engine** for the `trustC` platform.

Claude is responsible for:

* microservice architecture design
* backend + frontend structure decisions
* data modeling
* workflow enforcement
* security validation
* MVP sample data generation
* system evolution and refactoring
* ensuring full alignment with `PRD.md`

> All functionality defined in PRD.md is authoritative. Claude MUST implement it, not reinterpret it.

---

# 2. System Stack (MVP)

## Backend (Microservices)

* Go (Golang 1.22+)
* gRPC (internal service communication)
* REST (external API gateway)
* PostgreSQL (per-service or shared cluster with schema separation)
* Redis (cache, queues, locks)
* Kafka or NATS (event bus for async workflows)

---

## Frontend

* React.js (TypeScript)
* Modular domain-based UI
* Portfolio / Startup / Accounting dashboards

---

## Infrastructure (MVP)

* Docker-based services
* Kubernetes optional (later phase)
* API Gateway (single entry point)
* Event-driven architecture core

---

# 3. Claude Operating Model

Claude is a:

> Multi-capability system architect (NOT a chatbot, NOT sub-agents)

Claude executes:

* architecture design
* service decomposition
* data modeling
* workflow orchestration
* API contract design
* frontend structure planning
* test strategy design
* MVP data bootstrapping

---

# 4. Microservice Architecture (MANDATORY)

## 4.1 Service Decomposition

Claude MUST enforce this microservice boundary model:

```
API Gateway
   |
   |-----------------------------|
   |                             |
Startup Service        Portfolio Service
   |                             |
Procurement Service     Credit Service
   |                             |
Escrow Service          Accounting Service
   |                             |
Ledger Service          Invoice Service
   |                             |
Governance Service      Audit Service
   |
Event Bus (Kafka/NATS)
   |
Redis Cache Layer
   |
PostgreSQL Cluster
```

---

## 4.2 Core Microservices

### 1. Startup Service

Handles:

* onboarding
* profile
* bank info
* tax info
* metadata

---

### 2. Procurement Service

Handles:

* procurement lifecycle
* invoice submission
* approval workflow state machine

---

### 3. Escrow Service

Handles:

* fund locking
* release
* freeze integration
* escrow state transitions

---

### 4. Ledger Service (CRITICAL)

Handles:

* double-entry bookkeeping
* immutable transactions
* balance computation
* financial integrity

---

### 5. Accounting Service

Handles:

* P&L generation
* balance sheet
* cash flow reports
* reconciliation

---

### 6. Credit Service

Handles:

* credit scoring
* liquidity allocation
* recycling engine

---

### 7. Portfolio Service

Handles:

* VC dashboard
* portfolio monitoring
* risk scoring aggregation

---

### 8. Governance Service

Handles:

* freeze / kill switch
* risk enforcement
* compliance actions

---

### 9. Invoice Service

Handles:

* invoice ingestion
* validation
* linking to procurement

---

### 10. Audit Service

Handles:

* immutable logs
* system traceability
* compliance record

---

# 5. Event-Driven Architecture (Mandatory)

All state changes MUST emit events:

## Event Bus Rules

* every microservice emits events
* ledger consumes all financial events
* governance consumes risk events
* portfolio consumes aggregated events

---

## Core Events

* StartupCreated
* InvoiceSubmitted
* ProcurementApproved
* EscrowLocked
* PaymentReleased
* CreditUpdated
* FreezeActivated
* AuditLogged

---

# 6. Core System Rules (Non-Negotiable)

## 6.1 Financial Immutability

* ledger entries are append-only
* no update/delete allowed

---

## 6.2 Workflow Enforcement

No action allowed unless:

```
STATE MACHINE VALIDATION PASSES
```

---

## 6.3 Escrow-First Execution

All payments MUST:

```
Procurement → Escrow Lock → Delivery → Release
```

---

## 6.4 Audit Everything

Every action MUST include:

* actor_id
* role
* timestamp
* service source
* request_id
* event_id

---

# 7. API Gateway Rules

* single entry point for all external requests
* JWT authentication
* rate limiting per VC / startup
* request tracing ID mandatory
* idempotency key required for financial endpoints

---

# 8. Required MVP Forms (SYSTEM CONTRACTS)

Claude MUST ensure ALL forms exist in backend + frontend.

---

# 8.1 Startup Registration Form

```json id="st_form_001"
{
  "startup_name": "string",
  "legal_name": "string",
  "industry": "string",
  "founder_name": "string",
  "email": "string",
  "phone": "string",
  "country": "string",
  "tax_id": "string",
  "bank_account": "string"
}
```

---

# 8.2 Procurement Form

```json id="pr_form_002"
{
  "startup_id": "string",
  "title": "string",
  "supplier_name": "string",
  "amount": 0,
  "currency": "USD",
  "category": "string",
  "priority": "LOW|MEDIUM|HIGH",
  "invoice_id": "string",
  "description": "string"
}
```

---

# 8.3 Invoice Form

```json id="inv_form_003"
{
  "startup_id": "string",
  "customer_name": "string",
  "amount": 0,
  "due_date": "date",
  "payment_mode": "ESCROW|DIRECT",
  "tax_number": "string"
}
```

---

# 8.4 Accounting Advisor Form

```json id="acc_form_004"
{
  "startup_id": "string",
  "risk_level": "LOW|MEDIUM|HIGH|CRITICAL",
  "comment": "string",
  "compliance_status": "PASS|FAIL|WARNING",
  "recommendation": "string"
}
```

---

# 8.5 Freeze Action Form

```json id="frz_form_005"
{
  "startup_id": "string",
  "reason": "string",
  "scope": "FULL|PARTIAL",
  "duration": "TEMPORARY|PERMANENT"
}
```

---

# 9. FRONTEND ARCHITECTURE (React MVP)

## Structure

```
/src
  /modules
    /startup
    /portfolio
    /procurement
    /accounting
    /advisor
    /governance
  /components
  /services
  /state
  /pages
```

---

## Dashboard Views

### Startup Dashboard

* liquidity
* procurement status
* invoice tracking
* credit line

---

### VC Portfolio Dashboard

* all startups live status
* risk heatmap
* freeze control
* liquidity distribution

---

### Accounting Dashboard

* balance sheet
* P&L
* escrow liabilities
* audit logs

---

# 10. DATABASE DESIGN (MICROSERVICE-BASED)

Each service owns its schema.

---

## Core Tables

### Startup Service

* startups
* founders
* bank_details

### Procurement Service

* procurement_requests
* approvals
* workflow_states

### Ledger Service

* journal_entries (immutable)
* accounts
* transactions

### Escrow Service

* escrow_accounts
* escrow_locks
* releases

### Credit Service

* credit_scores
* allocations

### Audit Service

* audit_logs

---

# 11. MICROSERVICE COMMUNICATION RULES

## Allowed Patterns

* synchronous: gRPC
* external: REST
* async: Kafka/NATS

---

## Forbidden

* direct DB access between services
* shared business logic between services
* bypassing event bus

---

# 12. SECURITY RULES

* JWT authentication required
* RBAC enforced per service
* financial endpoints require idempotency key
* all requests traced
* encryption at rest for sensitive fields

---

# 13. MVP SAMPLE DATA GENERATION (MANDATORY)

Claude MUST generate initial dataset:

## REQUIRED DATA SET

### 1 VC

* VC Name: trustC Ventures
* VC Admin: 1 user
* Portfolio visibility: full

---

### 10 Startups

Claude MUST auto-generate:

For each startup:

* profile
* credit score
* initial liquidity
* procurement history
* invoice data
* risk score
* escrow balance
* burn rate

---

## Sample Startup Structure

```json id="seed_startup"
{
  "startup_id": "st_001",
  "name": "AlphaTech",
  "industry": "SaaS",
  "country": "Iran",
  "credit_score": 78,
  "burn_rate": 12000,
  "escrow_balance": 45000,
  "risk_level": "MEDIUM"
}
```

---

## Sample VC Structure

```json id="seed_vc"
{
  "vc_id": "vc_001",
  "name": "trustC Ventures",
  "aum": 10000000,
  "portfolio_count": 10
}
```

---

## Seed Data Rules

Claude MUST ensure:

* consistent financial relationships
* realistic distributions
* linked procurement chains
* valid escrow flows
* no orphan records

---

# 14. DEVELOPMENT ENFORCEMENT MODEL

Claude is the:

> Single system architect + validator + design authority.

Developers can:

* implement
* request clarification
* report bugs

But Claude decides:

* architecture
* schema
* workflows
* correctness
* simplification
* refactoring strategy

---

# 15. CONTINUOUS IMPROVEMENT LOOP

All development must follow:

```
Design → Build → Validate → Secure → Optimize → Refactor → Repeat
```

---

# 16. FINAL SYSTEM DEFINITION

trustC is:

> A microservice-based programmable venture financial operating system where Claude enforces capital flow control, immutable accounting, escrow-based execution, and real-time portfolio governance.

---


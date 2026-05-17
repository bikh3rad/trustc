-- trustC bootstrap: one cluster, schema-per-service.
-- Per CLAUDE.md §4.2 each service owns its schema; cross-schema reads are forbidden
-- and must go through the event bus / gRPC.

CREATE SCHEMA IF NOT EXISTS startup;
CREATE SCHEMA IF NOT EXISTS procurement;
CREATE SCHEMA IF NOT EXISTS escrow;
CREATE SCHEMA IF NOT EXISTS ledger;
CREATE SCHEMA IF NOT EXISTS audit;
CREATE SCHEMA IF NOT EXISTS governance;
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS admin;

-- pgcrypto for gen_random_uuid + digest()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

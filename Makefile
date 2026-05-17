# trustC — developer entry points
.PHONY: help up down logs migrate seed reset \
        build run-gateway run-startup run-procurement run-escrow run-ledger run-audit run-governance run-auth run-admin \
        frontend-install frontend-dev test e2e fmt vet tidy

help:
	@echo "trustC make targets:"
	@echo ""
	@echo "  Infrastructure:"
	@echo "    up                 Start Postgres + NATS + Redis (docker compose)"
	@echo "    down               Stop infra"
	@echo "    migrate            Apply DB migrations"
	@echo "    seed               Load MVP seed data (1 VC + 10 startups)"
	@echo "    reset              Drop volumes and re-init from scratch"
	@echo ""
	@echo "  Services (run locally against docker infra):"
	@echo "    run-gateway        :8080  REST entry point"
	@echo "    run-startup        :7001  gRPC startup service"
	@echo "    run-procurement    :7002  gRPC procurement service"
	@echo "    run-escrow         :7003  gRPC escrow service"
	@echo "    run-ledger         :7004  gRPC ledger service"
	@echo "    run-audit          :7005  gRPC audit service"
	@echo "    run-governance     :7006  gRPC governance (freeze) service"
	@echo "    run-admin          :7007  admin (users + system settings)"
	@echo "    run-auth           :7008  auth (login/register/me)"
	@echo ""
	@echo "  Frontend:"
	@echo "    frontend-install   npm install"
	@echo "    frontend-dev       vite dev server :5173"
	@echo ""
	@echo "  Quality:"
	@echo "    fmt vet tidy test  Go hygiene"
	@echo "    e2e                Full smoke test through the stack"

up:
	docker compose up -d postgres nats redis
	docker compose run --rm migrate

down:
	docker compose down

logs:
	docker compose logs -f

migrate:
	docker compose run --rm migrate

seed:
	docker compose run --rm seed

reset:
	docker compose down -v
	rm -rf deploy/data
	$(MAKE) up
	$(MAKE) seed

# --- Services ---
run-gateway:
	cd services/gateway && go run ./cmd/gateway

run-startup:
	cd services/startup && go run ./cmd/startup

run-procurement:
	cd services/procurement && go run ./cmd/procurement

run-escrow:
	cd services/escrow && go run ./cmd/escrow

run-ledger:
	cd services/ledger && go run ./cmd/ledger

run-audit:
	cd services/audit && go run ./cmd/audit

run-governance:
	cd services/governance && go run ./cmd/governance

run-admin:
	cd services/admin && go run ./cmd/admin

run-auth:
	cd services/auth && go run ./cmd/auth

# --- Frontend ---
frontend-install:
	cd frontend && npm install

frontend-dev:
	cd frontend && npm run dev

# --- Quality ---
fmt:
	gofmt -w services/

vet:
	cd services && for d in */; do (cd "$$d" && go vet ./... || true); done

tidy:
	cd services && for d in */; do (cd "$$d" && go mod tidy || true); done

test:
	cd services && for d in */; do (cd "$$d" && go test ./... || true); done

e2e:
	bash scripts/e2e.sh

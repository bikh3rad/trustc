package main

import (
	"context"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/trustc/trustc/services/shared/httpx"
	"github.com/trustc/trustc/services/shared/logx"

	"github.com/trustc/trustc/services/gateway/internal/proxy"
)

const serviceName = "gateway"

// Gateway routes:
//
//   /api/startups*         -> startup     :7001
//   /api/procurements*     -> procurement :7002
//   /api/escrow*           -> escrow      :7003
//   /api/ledger*           -> ledger      :7004  (entries, balances)
//   /api/audit*            -> audit       :7005
//   /api/governance*       -> governance  :7006
//
// JWT is REQUIRED on every /api/* request except auth health. Financial endpoints
// (procurement create, transition; escrow lock/release; ledger entries; topup)
// require an Idempotency-Key header.
func main() {
	log := logx.New(serviceName)
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	jwtSecret := []byte(envOr("TRUSTC_JWT_SECRET", "dev-secret-change-me"))

	startupURL := envOr("TRUSTC_STARTUP_URL", "http://localhost:7001")
	procurementURL := envOr("TRUSTC_PROCUREMENT_URL", "http://localhost:7002")
	escrowURL := envOr("TRUSTC_ESCROW_URL", "http://localhost:7003")
	ledgerURL := envOr("TRUSTC_LEDGER_URL", "http://localhost:7004")
	auditURL := envOr("TRUSTC_AUDIT_URL", "http://localhost:7005")
	governanceURL := envOr("TRUSTC_GOVERNANCE_URL", "http://localhost:7006")

	// Shared cache so retries with the same Idempotency-Key replay across endpoints.
	idemp := httpx.NewIdempotencyCache(24 * time.Hour)
	idempotent := idempotencyForWrites(idemp)

	r := chi.NewRouter()
	r.Use(httpx.RequestID)
	r.Use(httpx.CORS)
	r.Use(httpx.Logger(func(method, path, rid string, status int, dur time.Duration) {
		log.Info("http", "method", method, "path", path, "status", status,
			"duration_ms", dur.Milliseconds(), "request_id", rid)
	}))

	r.Get("/health", func(w http.ResponseWriter, _ *http.Request) {
		httpx.JSON(w, http.StatusOK, map[string]string{"status": "ok", "service": "gateway"})
	})

	// Dev auth endpoint: issues a JWT for any sub+role. Helpful for the seed/E2E.
	r.Post("/auth/dev-token", func(w http.ResponseWriter, req *http.Request) {
		var body struct{ Sub, Role string }
		if err := httpx.DecodeJSON(req, &body); err != nil {
			httpx.Error(w, err)
			return
		}
		if body.Sub == "" || body.Role == "" {
			body.Sub = "dev-user"
			body.Role = "VC_ADMIN"
		}
		tok := devToken(jwtSecret, body.Sub, body.Role)
		httpx.JSON(w, http.StatusOK, map[string]string{"token": tok})
	})

	// All /api/* requires JWT.
	r.Route("/api", func(r chi.Router) {
		r.Use(httpx.JWTAuth(jwtSecret, false))

		// Startup (no idempotency-key requirement on POST /startups for Phase 1).
		r.Mount("/startups", proxy.Reverse(startupURL, "/api"))

		// Procurement: POST /procurements + POST /procurements/{id}/transition are financial.
		r.With(idempotent).Mount("/procurements", proxy.Reverse(procurementURL, "/api"))

		// Escrow: all writes are financial.
		r.With(idempotent).Mount("/escrow", proxy.Reverse(escrowURL, "/api"))

		// Ledger entries are financial.
		r.With(idempotent).Mount("/ledger", proxy.Reverse(ledgerURL, "/api/ledger"))

		// Audit is read-only.
		r.Mount("/audit", proxy.Reverse(auditURL, "/api"))

		// Governance: freeze activation + lift are financial-grade actions
		// (they halt money movement), so they require Idempotency-Key.
		r.With(idempotent).Mount("/governance", proxy.Reverse(governanceURL, "/api"))
	})

	addr := envOr("TRUSTC_GATEWAY_ADDR", ":8080")
	srv := &http.Server{Addr: addr, Handler: r, ReadHeaderTimeout: 5 * time.Second}
	log.Info("gateway listening", "addr", addr)
	if err := httpx.Serve(ctx, srv); err != nil {
		log.Error("server error", "err", err)
		os.Exit(1)
	}
}

// idempotencyForWrites returns a middleware that demands Idempotency-Key on
// POST/PUT/PATCH/DELETE and replays cached responses on retries.
func idempotencyForWrites(cache interface {
	Required() func(http.Handler) http.Handler
}) func(http.Handler) http.Handler {
	required := cache.Required()
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			m := r.Method
			if m == http.MethodPost || m == http.MethodPut || m == http.MethodPatch || m == http.MethodDelete {
				required(next).ServeHTTP(w, r)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

// devToken creates a short HS256 JWT for local development.
func devToken(secret []byte, sub, role string) string {
	// Build a JWT without bringing the JWT library into the gateway main pkg —
	// shared/httpx already imports it transitively. Manual issuance below:
	return issueHS256(secret, sub, role)
}

// We import golang-jwt locally to mint dev tokens.
//
// Keeping it tiny — no exp claim, fine for development.
func issueHS256(secret []byte, sub, role string) string {
	tok := strings.Builder{}
	tok.WriteString(jwtIssue(secret, sub, role))
	return tok.String()
}

func envOr(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}

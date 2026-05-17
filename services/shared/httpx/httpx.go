// Package httpx provides shared HTTP utilities: middleware (request ID,
// JWT auth, idempotency, CORS, logging) and response helpers.
package httpx

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/trustc/trustc/services/shared/authtoken"
	"github.com/trustc/trustc/services/shared/errs"
	"github.com/trustc/trustc/services/shared/ids"
	"github.com/trustc/trustc/services/shared/logx"
)

const (
	HeaderRequestID     = "X-Request-Id"
	HeaderIdempotency   = "Idempotency-Key"
	HeaderAuthorization = "Authorization"

	// Identity headers the gateway forwards to downstream services after JWT
	// verification, so they don't re-verify the token themselves but still
	// know who is making the call. Set by JWTAuth; trusted only inside the
	// cluster (do NOT accept these from external clients — the gateway is
	// the only ingress).
	HeaderActorID      = "X-Trustc-User"
	HeaderActorRole    = "X-Trustc-Role"
	HeaderActorStatus  = "X-Trustc-Status"
	HeaderActorStartup = "X-Trustc-Startup"
	HeaderActorEmail   = "X-Trustc-Email"
)

// JSON writes v as JSON with the given status, falling back to a generic
// error envelope on marshal failure.
func JSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

// Error renders a trustC domain error as a JSON envelope.
func Error(w http.ResponseWriter, err error) {
	var e *errs.Error
	if errors.As(err, &e) {
		JSON(w, errs.HTTPStatus(err), map[string]any{
			"error":   e.Code,
			"message": e.Message,
		})
		return
	}
	JSON(w, http.StatusInternalServerError, map[string]any{
		"error":   "INTERNAL",
		"message": err.Error(),
	})
}

// RequestID middleware: assigns/propagates X-Request-Id.
func RequestID(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		rid := r.Header.Get(HeaderRequestID)
		if rid == "" {
			rid = ids.RequestID()
		}
		w.Header().Set(HeaderRequestID, rid)
		ctx := logx.WithRequestID(r.Context(), rid)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// CORS for local dev (frontend at :5173 -> gateway at :8080).
func CORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Request-Id, Idempotency-Key")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

// JWTAuth verifies a Bearer token signed by the dev HMAC secret in TRUSTC_JWT_SECRET.
// On success it attaches actor_id, role, status, email, and startup_id to the
// request context AND forwards them as X-Trustc-* headers so reverse-proxied
// services can read the same identity without re-verifying the JWT.
//
// Tokens whose status != ACTIVE are rejected with 401 — this catches the case
// where an admin disables a user but the user's JWT is still within its TTL.
func JWTAuth(secret []byte, optional bool) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			h := r.Header.Get(HeaderAuthorization)
			if h == "" {
				if optional {
					next.ServeHTTP(w, r)
					return
				}
				Error(w, errs.New(errs.KindUnauthorized, "unauthenticated", "Authorization header required"))
				return
			}
			parts := strings.SplitN(h, " ", 2)
			if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
				Error(w, errs.New(errs.KindUnauthorized, "unauthenticated", "expected Bearer token"))
				return
			}
			claims, err := authtoken.Parse(secret, parts[1])
			if err != nil || claims == nil {
				Error(w, errs.New(errs.KindUnauthorized, "unauthenticated", "JWT invalid"))
				return
			}
			if claims.Status != "" && claims.Status != "ACTIVE" {
				Error(w, errs.New(errs.KindUnauthorized, "unauthenticated", "account is "+claims.Status))
				return
			}
			ctx := logx.WithActorAuth(r.Context(), claims.Subject, claims.Role,
				claims.Status, claims.StartupID, claims.Email)

			// Stamp the trusted identity headers for downstream services.
			// We always overwrite — clients are not allowed to set these.
			r.Header.Set(HeaderActorID, claims.Subject)
			r.Header.Set(HeaderActorRole, claims.Role)
			r.Header.Set(HeaderActorStatus, claims.Status)
			if claims.StartupID != "" {
				r.Header.Set(HeaderActorStartup, claims.StartupID)
			} else {
				r.Header.Del(HeaderActorStartup)
			}
			if claims.Email != "" {
				r.Header.Set(HeaderActorEmail, claims.Email)
			} else {
				r.Header.Del(HeaderActorEmail)
			}
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// IdentityFromHeaders extracts the X-Trustc-* identity that the gateway
// stamped, and lifts it into the request context. Backend services mount
// this so handler code can use logx.ActorRole(ctx) etc. as before.
//
// This is INTRA-CLUSTER ONLY. Never enable this on a service exposed to the
// public internet — clients could spoof the headers.
func IdentityFromHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		id := r.Header.Get(HeaderActorID)
		role := r.Header.Get(HeaderActorRole)
		status := r.Header.Get(HeaderActorStatus)
		startup := r.Header.Get(HeaderActorStartup)
		email := r.Header.Get(HeaderActorEmail)
		if id != "" || role != "" {
			ctx := logx.WithActorAuth(r.Context(), id, role, status, startup, email)
			r = r.WithContext(ctx)
		}
		next.ServeHTTP(w, r)
	})
}

// RequireRoles returns a middleware that rejects requests whose actor role
// is not in `allow`. Use it on /v1/admin/* (allow: ADMIN) and other gated
// endpoints. AUDITOR read-only enforcement uses RequireWriteRoles below.
func RequireRoles(allow ...string) func(http.Handler) http.Handler {
	set := make(map[string]struct{}, len(allow))
	for _, r := range allow {
		set[r] = struct{}{}
	}
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			role := logx.ActorRole(r.Context())
			if role == "" {
				role = r.Header.Get(HeaderActorRole)
			}
			if _, ok := set[role]; !ok {
				Error(w, errs.New(errs.KindForbidden, "forbidden",
					"role "+role+" not permitted for this resource"))
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

// RequireWriteRoles rejects mutating verbs (POST/PUT/PATCH/DELETE) if the
// actor role is not in `allowWrites`. GET/HEAD/OPTIONS always pass through.
// This implements AUDITOR's read-only constraint at the gateway layer.
func RequireWriteRoles(allowWrites ...string) func(http.Handler) http.Handler {
	set := make(map[string]struct{}, len(allowWrites))
	for _, r := range allowWrites {
		set[r] = struct{}{}
	}
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.Method == http.MethodGet || r.Method == http.MethodHead || r.Method == http.MethodOptions {
				next.ServeHTTP(w, r)
				return
			}
			role := logx.ActorRole(r.Context())
			if role == "" {
				role = r.Header.Get(HeaderActorRole)
			}
			if _, ok := set[role]; !ok {
				Error(w, errs.New(errs.KindForbidden, "forbidden",
					"role "+role+" is read-only for this resource"))
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

// Idempotency middleware: for financial endpoints (POST that mutate money),
// the gateway requires an Idempotency-Key header (CLAUDE.md §7). This is an
// in-memory dev cache keyed by (key, path); production would use Redis.
type idempotencyCache struct {
	mu      sync.Mutex
	entries map[string]idempotentEntry
	ttl     time.Duration
}

type idempotentEntry struct {
	body      []byte
	status    int
	createdAt time.Time
}

func NewIdempotencyCache(ttl time.Duration) *idempotencyCache {
	return &idempotencyCache{entries: map[string]idempotentEntry{}, ttl: ttl}
}

// Required wraps a handler so it requires Idempotency-Key and replays prior responses
// for the same key/path within ttl.
func (c *idempotencyCache) Required() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			key := r.Header.Get(HeaderIdempotency)
			if key == "" {
				Error(w, errs.New(errs.KindBadRequest, "MISSING_IDEMPOTENCY_KEY",
					"financial endpoints require Idempotency-Key header"))
				return
			}
			ck := key + " " + r.URL.Path
			c.mu.Lock()
			if e, ok := c.entries[ck]; ok && time.Since(e.createdAt) < c.ttl {
				c.mu.Unlock()
				w.Header().Set("Content-Type", "application/json")
				w.Header().Set("X-Idempotent-Replay", "true")
				w.WriteHeader(e.status)
				_, _ = w.Write(e.body)
				return
			}
			c.mu.Unlock()
			rec := &recordingWriter{ResponseWriter: w, status: 200}
			next.ServeHTTP(rec, r)
			c.mu.Lock()
			c.entries[ck] = idempotentEntry{body: rec.buf, status: rec.status, createdAt: time.Now()}
			c.mu.Unlock()
		})
	}
}

type recordingWriter struct {
	http.ResponseWriter
	buf    []byte
	status int
}

func (r *recordingWriter) WriteHeader(s int) {
	r.status = s
	r.ResponseWriter.WriteHeader(s)
}
func (r *recordingWriter) Write(b []byte) (int, error) {
	r.buf = append(r.buf, b...)
	return r.ResponseWriter.Write(b)
}

// Logger logs each request with method, path, status, duration.
func Logger(log func(method, path, rid string, status int, dur time.Duration)) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()
			rec := &recordingWriter{ResponseWriter: w, status: 200}
			next.ServeHTTP(rec, r)
			log(r.Method, r.URL.Path, logx.RequestID(r.Context()), rec.status, time.Since(start))
		})
	}
}

// DecodeJSON decodes the request body into v.
func DecodeJSON(r *http.Request, v any) error {
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(v); err != nil {
		return errs.Wrap(errs.KindBadRequest, "BAD_JSON", "could not decode request body", err)
	}
	return nil
}

// Serve runs srv until ctx is cancelled, then performs a graceful shutdown.
func Serve(ctx context.Context, srv *http.Server) error {
	errCh := make(chan error, 1)
	go func() {
		err := srv.ListenAndServe()
		if errors.Is(err, http.ErrServerClosed) {
			err = nil
		}
		errCh <- err
	}()
	select {
	case <-ctx.Done():
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		_ = srv.Shutdown(shutdownCtx)
		return nil
	case err := <-errCh:
		return err
	}
}

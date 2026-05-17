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

	"github.com/golang-jwt/jwt/v5"

	"github.com/trustc/trustc/services/shared/errs"
	"github.com/trustc/trustc/services/shared/ids"
	"github.com/trustc/trustc/services/shared/logx"
)

const (
	HeaderRequestID     = "X-Request-Id"
	HeaderIdempotency   = "Idempotency-Key"
	HeaderAuthorization = "Authorization"
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
// On success, attaches actor_id + role to context.
func JWTAuth(secret []byte, optional bool) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			h := r.Header.Get(HeaderAuthorization)
			if h == "" {
				if optional {
					next.ServeHTTP(w, r)
					return
				}
				Error(w, errs.New(errs.KindUnauthorized, "MISSING_AUTH", "Authorization header required"))
				return
			}
			parts := strings.SplitN(h, " ", 2)
			if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
				Error(w, errs.New(errs.KindUnauthorized, "BAD_AUTH_FORMAT", "expected Bearer token"))
				return
			}
			tok, err := jwt.Parse(parts[1], func(t *jwt.Token) (any, error) {
				if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
					return nil, errors.New("unexpected signing method")
				}
				return secret, nil
			})
			if err != nil || !tok.Valid {
				Error(w, errs.New(errs.KindUnauthorized, "INVALID_TOKEN", "JWT invalid"))
				return
			}
			claims, _ := tok.Claims.(jwt.MapClaims)
			sub, _ := claims["sub"].(string)
			role, _ := claims["role"].(string)
			ctx := logx.WithActor(r.Context(), sub, role)
			next.ServeHTTP(w, r.WithContext(ctx))
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

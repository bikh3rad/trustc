// Package api exposes the Procurement service over REST.
package api

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/trustc/trustc/services/shared/auditemit"
	"github.com/trustc/trustc/services/shared/errs"
	"github.com/trustc/trustc/services/shared/events"
	"github.com/trustc/trustc/services/shared/httpx"
	"github.com/trustc/trustc/services/shared/logx"

	"github.com/trustc/trustc/services/procurement/internal/fsm"
	"github.com/trustc/trustc/services/procurement/internal/govclient"
	"github.com/trustc/trustc/services/procurement/internal/store"
)

type Handler struct {
	store     *store.Store
	emitter   *auditemit.Emitter
	gov       *govclient.Client
	escrowURL string
}

func New(s *store.Store, e *auditemit.Emitter, gov *govclient.Client) *Handler {
	return &Handler{
		store:     s,
		emitter:   e,
		gov:       gov,
		escrowURL: envOr("TRUSTC_ESCROW_URL", "http://localhost:7003"),
	}
}

func (h *Handler) Routes() http.Handler {
	r := chi.NewRouter()
	r.Get("/health", h.health)
	r.Post("/procurements", h.create)
	r.Get("/procurements", h.list)
	r.Get("/procurements/{id}", h.get)
	r.Get("/procurements/{id}/history", h.history)
	r.Post("/procurements/{id}/transition", h.transition)
	return r
}

func (h *Handler) health(w http.ResponseWriter, _ *http.Request) {
	httpx.JSON(w, http.StatusOK, map[string]string{"status": "ok", "service": "procurement"})
}

func (h *Handler) create(w http.ResponseWriter, r *http.Request) {
	var req store.Request
	if err := httpx.DecodeJSON(r, &req); err != nil {
		httpx.Error(w, err)
		return
	}
	if err := validateCreate(&req); err != nil {
		httpx.Error(w, err)
		return
	}
	out, err := h.store.Create(r.Context(), req,
		logx.ActorID(r.Context()), logx.ActorRole(r.Context()), logx.RequestID(r.Context()))
	if err != nil {
		httpx.Error(w, err)
		return
	}
	_ = h.emitter.Emit(r.Context(), events.ProcurementCreated, "procurement_request", out.ID, out)
	httpx.JSON(w, http.StatusCreated, out)
}

func (h *Handler) get(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	out, err := h.store.Get(r.Context(), id)
	if err != nil {
		httpx.Error(w, err)
		return
	}
	httpx.JSON(w, http.StatusOK, out)
}

func (h *Handler) list(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	startupID := q.Get("startup_id")

	// RBAC scope: FOUNDER may only see procurements for their own startup.
	// We honor the X-Trustc-Startup header the gateway stamps after JWT auth
	// (and force-overwrite any caller-supplied startup_id query param).
	role := logx.ActorRole(r.Context())
	if role == "FOUNDER" {
		if scope := logx.ActorStartupID(r.Context()); scope != "" {
			startupID = scope
		}
	}

	out, err := h.store.List(r.Context(), startupID, q.Get("state"))
	if err != nil {
		httpx.Error(w, err)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"procurements": out})
}

func (h *Handler) history(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	out, err := h.store.History(r.Context(), id)
	if err != nil {
		httpx.Error(w, err)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"history": out})
}

type transitionRequest struct {
	To     fsm.State `json:"to_state"`
	Reason string    `json:"reason,omitempty"`
}

func (h *Handler) transition(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var req transitionRequest
	if err := httpx.DecodeJSON(r, &req); err != nil {
		httpx.Error(w, err)
		return
	}

	// Fetch current state first so we can drive side-effects on specific transitions.
	cur, err := h.store.Get(r.Context(), id)
	if err != nil {
		httpx.Error(w, err)
		return
	}

	// Freeze enforcement (CLAUDE.md §6, PRD §13): the kill switch is itself
	// always allowed; cancellation is also always allowed. Every other
	// transition is gated on the startup not being under a FULL freeze.
	if req.To != fsm.Frozen && req.To != fsm.Cancelled {
		status, gerr := h.gov.Status(r.Context(), cur.StartupID)
		if gerr != nil {
			httpx.Error(w, gerr)
			return
		}
		if status.Frozen && status.Freeze != nil && status.Freeze.Scope == "FULL" {
			httpx.Error(w, errs.New(errs.KindForbidden, "STARTUP_FROZEN",
				"startup "+cur.StartupID+" is under a FULL freeze ("+status.Freeze.Reason+")"))
			return
		}
	}

	// Side-effect: when entering ESCROW_LOCK, ask the Escrow service to lock funds
	// BEFORE we commit the state change. If the lock fails, surface the error and
	// leave the procurement in FINANCIAL_VALIDATION.
	if req.To == fsm.EscrowLock {
		if err := h.callEscrowLock(r.Context(), cur); err != nil {
			httpx.Error(w, err)
			return
		}
	}
	if req.To == fsm.PaymentRelease {
		if err := h.callEscrowRelease(r.Context(), cur); err != nil {
			httpx.Error(w, err)
			return
		}
	}

	out, err := h.store.Transition(r.Context(), id, req.To,
		logx.ActorID(r.Context()), logx.ActorRole(r.Context()),
		req.Reason, logx.RequestID(r.Context()))
	if err != nil {
		httpx.Error(w, err)
		return
	}

	_ = h.emitter.Emit(r.Context(), events.ProcurementStateChng, "procurement_request", out.ID, map[string]any{
		"procurement_id": out.ID,
		"from_state":     cur.State,
		"to_state":       out.State,
		"reason":         req.Reason,
	})
	httpx.JSON(w, http.StatusOK, out)
}

type lockRequest struct {
	ProcurementID string `json:"procurement_id"`
	StartupID     string `json:"startup_id"`
	AmountCents   int64  `json:"amount_cents"`
	Currency      string `json:"currency"`
	SupplierName  string `json:"supplier_name"`
}

func (h *Handler) callEscrowLock(ctx context.Context, r *store.Request) error {
	body, _ := json.Marshal(lockRequest{
		ProcurementID: r.ID, StartupID: r.StartupID,
		AmountCents: r.AmountCents, Currency: r.Currency,
		SupplierName: r.SupplierName,
	})
	return postJSON(ctx, h.escrowURL+"/escrow/locks", body)
}

func (h *Handler) callEscrowRelease(ctx context.Context, r *store.Request) error {
	body, _ := json.Marshal(map[string]any{
		"procurement_id": r.ID,
		"supplier_name":  r.SupplierName,
	})
	return postJSON(ctx, h.escrowURL+"/escrow/releases", body)
}

func postJSON(ctx context.Context, url string, body []byte) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, strings.NewReader(string(body)))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Idempotency-Key", "proc-"+time.Now().Format("20060102150405.000000000"))
	if rid := logx.RequestID(ctx); rid != "" {
		req.Header.Set(httpx.HeaderRequestID, rid)
	}
	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return errs.Wrap(errs.KindInternal, "ESCROW_CALL_FAILED",
			"escrow service unreachable", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 400 {
		var e struct {
			Error   string `json:"error"`
			Message string `json:"message"`
		}
		_ = json.NewDecoder(resp.Body).Decode(&e)
		code := e.Error
		if code == "" {
			code = fmt.Sprintf("ESCROW_HTTP_%d", resp.StatusCode)
		}
		return errs.New(errs.KindInvariantViolation, code,
			"escrow rejected: "+e.Message)
	}
	return nil
}

func validateCreate(r *store.Request) error {
	if r.StartupID == "" {
		return errs.New(errs.KindBadRequest, "MISSING_STARTUP_ID", "startup_id required")
	}
	if r.Title == "" {
		return errs.New(errs.KindBadRequest, "MISSING_TITLE", "title required")
	}
	if r.SupplierName == "" {
		return errs.New(errs.KindBadRequest, "MISSING_SUPPLIER", "supplier_name required")
	}
	if r.AmountCents <= 0 {
		return errs.New(errs.KindBadRequest, "BAD_AMOUNT", "amount_cents must be > 0")
	}
	if r.Currency == "" {
		r.Currency = "USD"
	}
	if r.Priority == "" {
		r.Priority = "MEDIUM"
	}
	return nil
}

func envOr(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}

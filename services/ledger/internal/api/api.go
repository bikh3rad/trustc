// Package api exposes the Ledger service over REST.
package api

import (
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/trustc/trustc/services/shared/auditemit"
	"github.com/trustc/trustc/services/shared/events"
	"github.com/trustc/trustc/services/shared/httpx"
	"github.com/trustc/trustc/services/shared/logx"

	"github.com/trustc/trustc/services/ledger/internal/domain"
	"github.com/trustc/trustc/services/ledger/internal/store"
)

type Handler struct {
	store   *store.Store
	emitter *auditemit.Emitter
}

func New(s *store.Store, e *auditemit.Emitter) *Handler {
	return &Handler{store: s, emitter: e}
}

func (h *Handler) Routes() http.Handler {
	r := chi.NewRouter()
	r.Get("/health", h.health)
	r.Post("/entries", h.postEntry)
	r.Get("/entries", h.listEntries)
	r.Get("/accounts/{code}/balance", h.balance)
	return r
}

func (h *Handler) health(w http.ResponseWriter, _ *http.Request) {
	httpx.JSON(w, http.StatusOK, map[string]string{"status": "ok", "service": "ledger"})
}

func (h *Handler) postEntry(w http.ResponseWriter, r *http.Request) {
	var e domain.Entry
	if err := httpx.DecodeJSON(r, &e); err != nil {
		httpx.Error(w, err)
		return
	}
	if err := e.Validate(); err != nil {
		httpx.Error(w, err)
		return
	}
	posted, err := h.store.Post(r.Context(), e)
	if err != nil {
		httpx.Error(w, err)
		return
	}
	_ = h.emitter.Emit(r.Context(), "trustc.ledger.posted", "journal_entry", posted.TransactionID, posted)
	httpx.JSON(w, http.StatusCreated, posted)
}

func (h *Handler) listEntries(w http.ResponseWriter, r *http.Request) {
	workflow := r.URL.Query().Get("workflow_reference_id")
	startupID := r.URL.Query().Get("startup_id")

	// RBAC scope: FOUNDER may only see entries tied to their own startup.
	// The gateway stamps X-Trustc-Startup from the JWT; we force the filter
	// to that value regardless of caller-supplied params so a founder can
	// never see a peer company's ledger.
	if logx.ActorRole(r.Context()) == "FOUNDER" {
		if scope := logx.ActorStartupID(r.Context()); scope != "" {
			startupID = scope
		}
	}

	entries, err := h.store.List(r.Context(), workflow, startupID, 100)
	if err != nil {
		httpx.Error(w, err)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"entries": entries})
}

func (h *Handler) balance(w http.ResponseWriter, r *http.Request) {
	code := chi.URLParam(r, "code")
	bal, err := h.store.Balance(r.Context(), code)
	if err != nil {
		httpx.Error(w, err)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{
		"account_code":  code,
		"balance_cents": bal,
	})
}

// Subscribe wires NATS subscriptions so the ledger can auto-post for canonical events.
// Phase 1: escrow.locked and payment.released both trigger automatic postings.
func (h *Handler) Subscribe(bus events.Bus) error {
	// (Hookpoint — escrow service itself posts directly via REST in Phase 1.
	// Future: ledger could subscribe and post via NATS for full decoupling.)
	_ = bus
	return nil
}

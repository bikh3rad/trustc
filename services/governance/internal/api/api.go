// Package api exposes the Governance service over REST.
// Freeze form contract: CLAUDE.md §8.5 (frz_form_005).
package api

import (
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/trustc/trustc/services/shared/auditemit"
	"github.com/trustc/trustc/services/shared/errs"
	"github.com/trustc/trustc/services/shared/events"
	"github.com/trustc/trustc/services/shared/httpx"
	"github.com/trustc/trustc/services/shared/logx"

	"github.com/trustc/trustc/services/governance/internal/store"
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
	r.Post("/governance/freezes", h.activate)
	r.Get("/governance/freezes", h.listActive)
	r.Post("/governance/freezes/{id}/lift", h.lift)
	r.Get("/governance/freezes/startup/{startup_id}", h.activeForStartup)
	r.Get("/governance/freezes/startup/{startup_id}/history", h.historyForStartup)
	return r
}

func (h *Handler) health(w http.ResponseWriter, _ *http.Request) {
	httpx.JSON(w, http.StatusOK, map[string]string{"status": "ok", "service": "governance"})
}

type activateReq struct {
	StartupID string         `json:"startup_id"`
	Scope     store.Scope    `json:"scope"`
	Duration  store.Duration `json:"duration"`
	Reason    string         `json:"reason"`
}

func (h *Handler) activate(w http.ResponseWriter, r *http.Request) {
	var req activateReq
	if err := httpx.DecodeJSON(r, &req); err != nil {
		httpx.Error(w, err)
		return
	}
	f, err := h.store.Activate(r.Context(), store.Freeze{
		StartupID: req.StartupID,
		Scope:     req.Scope,
		Duration:  req.Duration,
		Reason:    req.Reason,
		ActorID:   logx.ActorID(r.Context()),
		ActorRole: logx.ActorRole(r.Context()),
		RequestID: logx.RequestID(r.Context()),
	})
	if err != nil {
		httpx.Error(w, err)
		return
	}
	_ = h.emitter.Emit(r.Context(), events.FreezeActivated, "freeze", f.ID, f)
	httpx.JSON(w, http.StatusCreated, f)
}

type liftReq struct {
	Reason string `json:"reason"`
}

func (h *Handler) lift(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var req liftReq
	if err := httpx.DecodeJSON(r, &req); err != nil {
		httpx.Error(w, err)
		return
	}
	if req.Reason == "" {
		httpx.Error(w, errs.New(errs.KindBadRequest, "MISSING_REASON",
			"reason required for compliance trail"))
		return
	}
	f, err := h.store.Lift(r.Context(), id, req.Reason, logx.ActorID(r.Context()))
	if err != nil {
		httpx.Error(w, err)
		return
	}
	_ = h.emitter.Emit(r.Context(), events.FreezeLifted, "freeze", f.ID, f)
	httpx.JSON(w, http.StatusOK, f)
}

func (h *Handler) listActive(w http.ResponseWriter, r *http.Request) {
	out, err := h.store.ListActive(r.Context())
	if err != nil {
		httpx.Error(w, err)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"freezes": out})
}

func (h *Handler) activeForStartup(w http.ResponseWriter, r *http.Request) {
	startupID := chi.URLParam(r, "startup_id")
	f, err := h.store.ActiveForStartup(r.Context(), startupID)
	if err != nil {
		httpx.Error(w, err)
		return
	}
	// Always return a wrapper object so the procurement service can rely on
	// shape rather than a 404 to mean "not frozen".
	httpx.JSON(w, http.StatusOK, map[string]any{
		"frozen": f != nil,
		"freeze": f,
	})
}

func (h *Handler) historyForStartup(w http.ResponseWriter, r *http.Request) {
	startupID := chi.URLParam(r, "startup_id")
	out, err := h.store.History(r.Context(), startupID)
	if err != nil {
		httpx.Error(w, err)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"freezes": out})
}

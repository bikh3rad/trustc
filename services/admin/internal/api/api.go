// Package api exposes the Admin service over REST.
//
// External endpoints (gateway proxies as /v1/admin/*), all gated to ADMIN role
// by the gateway middleware. Every mutation emits an audit event with
// actorRole=ADMIN.
//
// Internal endpoint /internal/settings is unauth, used by auth service
// during /register to gate the flow.
package api

import (
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"

	"github.com/trustc/trustc/services/shared/auditemit"
	"github.com/trustc/trustc/services/shared/errs"
	"github.com/trustc/trustc/services/shared/httpx"
	"github.com/trustc/trustc/services/shared/logx"

	"github.com/trustc/trustc/services/admin/internal/authclient"
	"github.com/trustc/trustc/services/admin/internal/store"
)

// Event types emitted by admin actions (CLAUDE.md §5 — domain events).
const (
	EvtUserApproved    = "trustc.admin.user_approved"
	EvtUserDisabled    = "trustc.admin.user_disabled"
	EvtUserEnabled     = "trustc.admin.user_enabled"
	EvtSettingsUpdated = "trustc.admin.settings_updated"
)

type Handler struct {
	store *store.Store
	auth  *authclient.Client
	emit  *auditemit.Emitter
}

func New(s *store.Store, a *authclient.Client, e *auditemit.Emitter) *Handler {
	return &Handler{store: s, auth: a, emit: e}
}

func (h *Handler) Routes() http.Handler {
	r := chi.NewRouter()
	r.Use(httpx.IdentityFromHeaders)

	r.Get("/health", h.health)

	// Internal — service-to-service. Auth calls this on every /register hit.
	r.Get("/internal/settings", h.internalSettings)

	// External — proxied as /v1/admin/* by the gateway, which has already
	// enforced ADMIN role. We re-check here as defense-in-depth.
	r.Route("/admin", func(r chi.Router) {
		r.Use(httpx.RequireRoles("ADMIN"))

		r.Get("/users", h.listUsers)
		r.Post("/users/{id}/approve", h.approveUser)
		r.Post("/users/{id}/disable", h.disableUser)
		r.Post("/users/{id}/enable", h.enableUser)

		r.Get("/settings", h.getSettings)
		r.Patch("/settings", h.patchSettings)
	})
	return r
}

func (h *Handler) health(w http.ResponseWriter, _ *http.Request) {
	httpx.JSON(w, http.StatusOK, map[string]string{"status": "ok", "service": "admin"})
}

/* ---------------- internal ---------------- */

func (h *Handler) internalSettings(w http.ResponseWriter, r *http.Request) {
	s, err := h.store.Get(r.Context())
	if err != nil {
		httpx.Error(w, err)
		return
	}
	httpx.JSON(w, http.StatusOK, s)
}

/* ---------------- users ---------------- */

func (h *Handler) listUsers(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	users, err := h.auth.ListUsers(r.Context(),
		strings.ToUpper(q.Get("status")),
		strings.ToUpper(q.Get("role")))
	if err != nil {
		httpx.Error(w, err)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"users": users})
}

func (h *Handler) setUserStatus(w http.ResponseWriter, r *http.Request, target, eventType string) {
	id := chi.URLParam(r, "id")
	prior, err := h.auth.GetUser(r.Context(), id)
	if err != nil {
		httpx.Error(w, err)
		return
	}
	u, err := h.auth.SetStatus(r.Context(), id, target)
	if err != nil {
		httpx.Error(w, err)
		return
	}
	_ = h.emit.Emit(r.Context(), eventType, "user", u.ID, map[string]any{
		"user_id":     u.ID,
		"email":       u.Email,
		"role":        u.Role,
		"from_status": prior.Status,
		"to_status":   u.Status,
	})
	httpx.JSON(w, http.StatusOK, map[string]any{"user": u})
}

func (h *Handler) approveUser(w http.ResponseWriter, r *http.Request) {
	h.setUserStatus(w, r, "ACTIVE", EvtUserApproved)
}
func (h *Handler) disableUser(w http.ResponseWriter, r *http.Request) {
	h.setUserStatus(w, r, "DISABLED", EvtUserDisabled)
}
func (h *Handler) enableUser(w http.ResponseWriter, r *http.Request) {
	h.setUserStatus(w, r, "ACTIVE", EvtUserEnabled)
}

/* ---------------- settings ---------------- */

func (h *Handler) getSettings(w http.ResponseWriter, r *http.Request) {
	s, err := h.store.Get(r.Context())
	if err != nil {
		httpx.Error(w, err)
		return
	}
	httpx.JSON(w, http.StatusOK, s)
}

func (h *Handler) patchSettings(w http.ResponseWriter, r *http.Request) {
	var patch store.Patch
	if err := httpx.DecodeJSON(r, &patch); err != nil {
		httpx.Error(w, err)
		return
	}
	if patch.AuditRetentionDays != nil && *patch.AuditRetentionDays < 30 {
		httpx.Error(w, errs.New(errs.KindBadRequest, "RETENTION_TOO_SHORT",
			"audit retention must be at least 30 days"))
		return
	}
	if patch.RequireApprovalForRoles != nil {
		for _, role := range *patch.RequireApprovalForRoles {
			switch role {
			case "FOUNDER", "VC", "AUDITOR", "ADMIN":
			default:
				httpx.Error(w, errs.New(errs.KindBadRequest, "BAD_ROLE",
					"unknown role in require_approval_for_roles: "+role))
				return
			}
		}
	}
	actor := logx.ActorID(r.Context())
	out, err := h.store.Patch(r.Context(), patch, actor)
	if err != nil {
		httpx.Error(w, err)
		return
	}
	_ = h.emit.Emit(r.Context(), EvtSettingsUpdated, "system_settings", "1", out)
	httpx.JSON(w, http.StatusOK, out)
}

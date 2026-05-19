// Package api exposes the Startup service over REST.
package api

import (
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"

	"github.com/trustc/trustc/services/shared/auditemit"
	"github.com/trustc/trustc/services/shared/errs"
	"github.com/trustc/trustc/services/shared/events"
	"github.com/trustc/trustc/services/shared/httpx"

	"github.com/trustc/trustc/services/startup/internal/authclient"
	"github.com/trustc/trustc/services/startup/internal/store"
)

type Handler struct {
	store   *store.Store
	auth    *authclient.Client
	emitter *auditemit.Emitter
}

func New(s *store.Store, a *authclient.Client, e *auditemit.Emitter) *Handler {
	return &Handler{store: s, auth: a, emitter: e}
}

func (h *Handler) Routes() http.Handler {
	r := chi.NewRouter()
	r.Get("/health", h.health)
	r.Post("/startups", h.create)
	r.Get("/startups", h.list)
	r.Get("/startups/{id}", h.get)
	r.Post("/startups/{id}/link-founder", h.linkFounder)
	r.Get("/founders/unlinked", h.listUnlinkedFounders)
	r.Get("/vcs", h.listVCs)
	return r
}

func (h *Handler) health(w http.ResponseWriter, _ *http.Request) {
	httpx.JSON(w, http.StatusOK, map[string]string{"status": "ok", "service": "startup"})
}

// createResponse wraps the new startup row with a `linked_founder` field that
// tells the VC frontend whether the founder email was matched to an existing
// auth user (in which case startup_id was set automatically) or whether a
// manual link step is still needed.
type createResponse struct {
	*store.Startup
	LinkedFounder *authclient.User `json:"linked_founder,omitempty"`
}

func (h *Handler) create(w http.ResponseWriter, r *http.Request) {
	var in store.CreateInput
	if err := httpx.DecodeJSON(r, &in); err != nil {
		httpx.Error(w, err)
		return
	}
	// Single-VC MVP convenience: if the caller did not specify a vc_id, fall
	// back to the only VC in the system. Multiple-VC setups still need the
	// explicit value.
	if in.VCID == "" {
		def, err := h.store.DefaultVCID(r.Context())
		if err != nil {
			httpx.Error(w, err)
			return
		}
		in.VCID = def
	}
	if err := validateCreate(in); err != nil {
		httpx.Error(w, err)
		return
	}
	s, err := h.store.Create(r.Context(), in)
	if err != nil {
		httpx.Error(w, err)
		return
	}
	_ = h.emitter.Emit(r.Context(), events.StartupCreated, "startup", s.ID, s)

	resp := createResponse{Startup: s}

	// Auto-link the founder if their email already corresponds to an auth user
	// with role=FOUNDER. Skipped silently on any lookup error — the VC can
	// always do this manually via POST /startups/{id}/link-founder.
	if in.Founder.Email != "" {
		u, err := h.auth.GetByEmail(r.Context(), in.Founder.Email)
		if err == nil && u.Role == "FOUNDER" && u.StartupID == "" {
			linked, err := h.auth.SetStartupID(r.Context(), u.ID, s.ID)
			if err == nil {
				resp.LinkedFounder = linked
			}
		}
	}

	httpx.JSON(w, http.StatusCreated, resp)
}

// linkFounderRequest accepts either a user_id (precise) or an email (looked
// up server-side). The endpoint backs the "اتصال بنیان‌گذار" flow on the
// VC panel.
type linkFounderRequest struct {
	UserID string `json:"user_id,omitempty"`
	Email  string `json:"email,omitempty"`
}

func (h *Handler) linkFounder(w http.ResponseWriter, r *http.Request) {
	startupID := chi.URLParam(r, "id")
	var req linkFounderRequest
	if err := httpx.DecodeJSON(r, &req); err != nil {
		httpx.Error(w, err)
		return
	}
	req.UserID = strings.TrimSpace(req.UserID)
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))
	if req.UserID == "" && req.Email == "" {
		httpx.Error(w, errs.New(errs.KindBadRequest, "MISSING_TARGET",
			"either user_id or email is required"))
		return
	}

	// Verify the target startup exists before we update the user row, so we
	// return a clean 404 instead of leaving a dangling startup_id.
	if _, err := h.store.Get(r.Context(), startupID); err != nil {
		httpx.Error(w, err)
		return
	}

	// Resolve user.
	var target *authclient.User
	if req.UserID != "" {
		target = &authclient.User{ID: req.UserID}
	} else {
		u, err := h.auth.GetByEmail(r.Context(), req.Email)
		if err != nil {
			httpx.Error(w, err)
			return
		}
		target = u
	}
	if target.Role != "" && target.Role != "FOUNDER" {
		httpx.Error(w, errs.New(errs.KindBadRequest, "NOT_A_FOUNDER",
			"only FOUNDER accounts can be linked to a startup"))
		return
	}

	linked, err := h.auth.SetStartupID(r.Context(), target.ID, startupID)
	if err != nil {
		httpx.Error(w, err)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"user": linked})
}

func (h *Handler) listUnlinkedFounders(w http.ResponseWriter, r *http.Request) {
	out, err := h.auth.ListUnlinkedFounders(r.Context())
	if err != nil {
		httpx.Error(w, err)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"founders": out})
}

func (h *Handler) listVCs(w http.ResponseWriter, r *http.Request) {
	out, err := h.store.ListVCs(r.Context())
	if err != nil {
		httpx.Error(w, err)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"vcs": out})
}

func (h *Handler) get(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	s, err := h.store.Get(r.Context(), id)
	if err != nil {
		httpx.Error(w, err)
		return
	}
	httpx.JSON(w, http.StatusOK, s)
}

func (h *Handler) list(w http.ResponseWriter, r *http.Request) {
	vc := r.URL.Query().Get("vc_id")
	out, err := h.store.List(r.Context(), vc)
	if err != nil {
		httpx.Error(w, err)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"startups": out})
}

func validateCreate(in store.CreateInput) error {
	if in.VCID == "" {
		return errs.New(errs.KindBadRequest, "MISSING_VC_ID", "vc_id required")
	}
	if in.StartupName == "" {
		return errs.New(errs.KindBadRequest, "MISSING_STARTUP_NAME", "startup_name required")
	}
	if in.LegalName == "" {
		return errs.New(errs.KindBadRequest, "MISSING_LEGAL_NAME", "legal_name required")
	}
	if in.Industry == "" {
		return errs.New(errs.KindBadRequest, "MISSING_INDUSTRY", "industry required")
	}
	if in.Country == "" {
		return errs.New(errs.KindBadRequest, "MISSING_COUNTRY", "country required")
	}
	if in.TaxID == "" {
		return errs.New(errs.KindBadRequest, "MISSING_TAX_ID", "tax_id required")
	}
	if in.Founder.FounderName == "" || in.Founder.Email == "" {
		return errs.New(errs.KindBadRequest, "MISSING_FOUNDER", "founder_name and email required")
	}
	return nil
}

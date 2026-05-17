// Package api exposes the Startup service over REST.
package api

import (
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/trustc/trustc/services/shared/auditemit"
	"github.com/trustc/trustc/services/shared/errs"
	"github.com/trustc/trustc/services/shared/events"
	"github.com/trustc/trustc/services/shared/httpx"

	"github.com/trustc/trustc/services/startup/internal/store"
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
	r.Post("/startups", h.create)
	r.Get("/startups", h.list)
	r.Get("/startups/{id}", h.get)
	return r
}

func (h *Handler) health(w http.ResponseWriter, _ *http.Request) {
	httpx.JSON(w, http.StatusOK, map[string]string{"status": "ok", "service": "startup"})
}

func (h *Handler) create(w http.ResponseWriter, r *http.Request) {
	var in store.CreateInput
	if err := httpx.DecodeJSON(r, &in); err != nil {
		httpx.Error(w, err)
		return
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
	httpx.JSON(w, http.StatusCreated, s)
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

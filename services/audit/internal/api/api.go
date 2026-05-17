// Package api exposes the Audit service over REST and wires the NATS
// subscriber that fans in every event.
package api

import (
	"context"
	"log/slog"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"

	"github.com/trustc/trustc/services/shared/events"
	"github.com/trustc/trustc/services/shared/httpx"

	"github.com/trustc/trustc/services/audit/internal/store"
)

type Handler struct {
	store *store.Store
	log   *slog.Logger
}

func New(s *store.Store, log *slog.Logger) *Handler {
	return &Handler{store: s, log: log}
}

func (h *Handler) Routes() http.Handler {
	r := chi.NewRouter()
	r.Get("/health", h.health)
	r.Get("/audit", h.list)
	return r
}

func (h *Handler) health(w http.ResponseWriter, _ *http.Request) {
	httpx.JSON(w, http.StatusOK, map[string]string{"status": "ok", "service": "audit"})
}

func (h *Handler) list(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	limit, _ := strconv.Atoi(q.Get("limit"))
	records, err := h.store.List(r.Context(), store.ListFilter{
		SubjectType: q.Get("subject_type"),
		SubjectID:   q.Get("subject_id"),
		EventType:   q.Get("event_type"),
		Limit:       limit,
	})
	if err != nil {
		httpx.Error(w, err)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"records": records})
}

// Subscribe attaches a wildcard subscriber to the bus that persists every
// trustc.* event. Note we DO NOT subscribe to "trustc.audit.logged" itself
// (would loop) — instead we emit nothing from the audit service.
func (h *Handler) Subscribe(bus events.Bus) error {
	_, err := bus.Subscribe("trustc.>", func(env events.Envelope) {
		if env.EventType == events.AuditLogged {
			return // never recursively re-record audit-of-audit
		}
		rec := store.Record{
			EventID:     env.EventID,
			ActorID:     env.ActorID,
			ActorRole:   env.ActorRole,
			Service:     env.Service,
			EventType:   env.EventType,
			RequestID:   env.RequestID,
			SubjectType: env.SubjectType,
			SubjectID:   env.SubjectID,
			Payload:     env.Payload,
		}
		if _, err := h.store.Append(context.Background(), rec); err != nil {
			h.log.Error("audit append failed",
				"err", err, "event_type", env.EventType, "event_id", env.EventID)
		}
	})
	return err
}

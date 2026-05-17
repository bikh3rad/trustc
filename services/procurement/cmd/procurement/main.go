package main

import (
	"context"
	"encoding/json"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/trustc/trustc/services/shared/auditemit"
	"github.com/trustc/trustc/services/shared/events"
	"github.com/trustc/trustc/services/shared/httpx"
	"github.com/trustc/trustc/services/shared/logx"
	"github.com/trustc/trustc/services/shared/pg"

	"github.com/trustc/trustc/services/procurement/internal/api"
	"github.com/trustc/trustc/services/procurement/internal/fsm"
	"github.com/trustc/trustc/services/procurement/internal/govclient"
	"github.com/trustc/trustc/services/procurement/internal/store"
)

const serviceName = "procurement"

func main() {
	log := logx.New(serviceName)
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	db, err := pg.Connect(ctx, "procurement")
	if err != nil {
		log.Error("postgres connect failed", "err", err)
		os.Exit(1)
	}
	defer db.Close()

	bus, err := events.Connect(serviceName)
	if err != nil {
		log.Error("nats connect failed", "err", err)
		os.Exit(1)
	}
	defer bus.Close()

	st := store.New(db)
	h := api.New(st, auditemit.New(bus, serviceName), govclient.New())

	// Async freeze enforcement: when governance activates a freeze, walk every
	// in-flight procurement for the affected startup into the terminal FROZEN
	// state. This is the cleanup half of the freeze design — the sync gate in
	// the transition handler keeps NEW transitions out.
	unsub, err := bus.Subscribe(events.FreezeActivated, func(env events.Envelope) {
		var f struct {
			ID        string `json:"id"`
			StartupID string `json:"startup_id"`
			Scope     string `json:"scope"`
		}
		if err := json.Unmarshal(env.Payload, &f); err != nil {
			log.Error("freeze payload decode", "err", err)
			return
		}
		if f.Scope != "FULL" {
			return // PARTIAL freezes do not auto-kill in-flight items
		}
		bgCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()
		bgCtx = logx.WithRequestID(bgCtx, env.RequestID)
		bgCtx = logx.WithActor(bgCtx, env.ActorID, env.ActorRole)

		ids, err := st.InFlightIDsForStartup(bgCtx, f.StartupID)
		if err != nil {
			log.Error("in-flight lookup failed", "startup_id", f.StartupID, "err", err)
			return
		}
		reason := "auto-frozen by governance freeze " + f.ID
		for _, id := range ids {
			if _, err := st.Transition(bgCtx, id, fsm.Frozen, env.ActorID, env.ActorRole, reason, env.RequestID); err != nil {
				log.Error("auto-freeze transition failed", "procurement_id", id, "err", err)
				continue
			}
			log.Info("procurement auto-frozen", "procurement_id", id, "freeze_id", f.ID)
		}
	})
	if err != nil {
		log.Error("freeze subscription failed", "err", err)
		os.Exit(1)
	}
	defer func() { _ = unsub() }()

	root := chi.NewRouter()
	root.Use(httpx.RequestID)
	root.Use(httpx.Logger(func(method, path, rid string, status int, dur time.Duration) {
		log.Info("http", "method", method, "path", path, "status", status,
			"duration_ms", dur.Milliseconds(), "request_id", rid)
	}))
	root.Mount("/", h.Routes())

	addr := envOr("TRUSTC_PROCUREMENT_ADDR", ":7002")
	srv := &http.Server{Addr: addr, Handler: root, ReadHeaderTimeout: 5 * time.Second}
	log.Info("procurement listening", "addr", addr)
	if err := httpx.Serve(ctx, srv); err != nil {
		log.Error("server error", "err", err)
		os.Exit(1)
	}
}

func envOr(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}

package main

import (
	"context"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/trustc/trustc/services/shared/events"
	"github.com/trustc/trustc/services/shared/httpx"
	"github.com/trustc/trustc/services/shared/logx"
	"github.com/trustc/trustc/services/shared/pg"

	"github.com/trustc/trustc/services/audit/internal/api"
	"github.com/trustc/trustc/services/audit/internal/store"
)

const serviceName = "audit"

func main() {
	log := logx.New(serviceName)
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	db, err := pg.Connect(ctx, "audit")
	if err != nil {
		log.Error("postgres connect failed", "err", err)
		os.Exit(1)
	}
	defer db.Close()
	log.Info("postgres connected")

	st, err := store.New(db)
	if err != nil {
		log.Error("audit store init failed", "err", err)
		os.Exit(1)
	}

	bus, err := events.Connect(serviceName)
	if err != nil {
		log.Error("nats connect failed", "err", err)
		os.Exit(1)
	}
	defer bus.Close()
	log.Info("nats connected")

	h := api.New(st, log)
	if err := h.Subscribe(bus); err != nil {
		log.Error("audit subscribe failed", "err", err)
		os.Exit(1)
	}
	log.Info("subscribed to trustc.>")

	root := chi.NewRouter()
	root.Use(httpx.RequestID)
	root.Use(httpx.Logger(func(method, path, rid string, status int, dur time.Duration) {
		log.Info("http", "method", method, "path", path, "status", status,
			"duration_ms", dur.Milliseconds(), "request_id", rid)
	}))
	root.Mount("/", h.Routes())

	addr := envOr("TRUSTC_AUDIT_ADDR", ":7005")
	srv := &http.Server{Addr: addr, Handler: root, ReadHeaderTimeout: 5 * time.Second}
	log.Info("audit listening", "addr", addr)
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

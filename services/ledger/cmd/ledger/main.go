package main

import (
	"context"
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

	"github.com/trustc/trustc/services/ledger/internal/api"
	"github.com/trustc/trustc/services/ledger/internal/store"
)

const serviceName = "ledger"

func main() {
	log := logx.New(serviceName)
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	db, err := pg.Connect(ctx, "ledger")
	if err != nil {
		log.Error("postgres connect failed", "err", err)
		os.Exit(1)
	}
	defer db.Close()
	log.Info("postgres connected")

	bus, err := events.Connect(serviceName)
	if err != nil {
		log.Error("nats connect failed", "err", err)
		os.Exit(1)
	}
	defer bus.Close()
	log.Info("nats connected")

	emitter := auditemit.New(bus, serviceName)
	h := api.New(store.New(db), emitter)
	if err := h.Subscribe(bus); err != nil {
		log.Error("subscribe failed", "err", err)
		os.Exit(1)
	}

	root := chi.NewRouter()
	root.Use(httpx.RequestID)
	root.Use(httpx.Logger(func(method, path, rid string, status int, dur time.Duration) {
		log.Info("http", "method", method, "path", path, "status", status,
			"duration_ms", dur.Milliseconds(), "request_id", rid)
	}))
	root.Mount("/", h.Routes())

	addr := envOr("TRUSTC_LEDGER_ADDR", ":7004")
	srv := &http.Server{
		Addr:              addr,
		Handler:           root,
		ReadHeaderTimeout: 5 * time.Second,
	}
	log.Info("ledger listening", "addr", addr)
	if err := httpx.Serve(ctx, srv); err != nil {
		log.Error("server error", "err", err)
		os.Exit(1)
	}
	log.Info("ledger stopped")
}

func envOr(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}

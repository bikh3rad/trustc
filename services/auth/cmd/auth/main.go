package main

import (
	"context"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/trustc/trustc/services/shared/authtoken"
	"github.com/trustc/trustc/services/shared/httpx"
	"github.com/trustc/trustc/services/shared/logx"
	"github.com/trustc/trustc/services/shared/pg"

	"github.com/trustc/trustc/services/auth/internal/adminclient"
	"github.com/trustc/trustc/services/auth/internal/api"
	"github.com/trustc/trustc/services/auth/internal/store"
)

const serviceName = "auth"

func main() {
	log := logx.New(serviceName)
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	db, err := pg.Connect(ctx, "auth")
	if err != nil {
		log.Error("postgres connect failed", "err", err)
		os.Exit(1)
	}
	defer db.Close()

	h := api.New(store.New(db), adminclient.New(), authtoken.Secret())

	root := chi.NewRouter()
	root.Use(httpx.RequestID)
	root.Use(httpx.Logger(func(method, path, rid string, status int, dur time.Duration) {
		log.Info("http", "method", method, "path", path, "status", status,
			"duration_ms", dur.Milliseconds(), "request_id", rid)
	}))
	root.Mount("/", h.Routes())

	addr := envOr("TRUSTC_AUTH_ADDR", ":7008")
	srv := &http.Server{Addr: addr, Handler: root, ReadHeaderTimeout: 5 * time.Second}
	log.Info("auth listening", "addr", addr)
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

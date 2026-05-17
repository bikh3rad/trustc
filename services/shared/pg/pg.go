// Package pg standardizes Postgres connection setup for all trustC services.
package pg

import (
	"context"
	"fmt"
	"os"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Connect opens a pgxpool to the trustC cluster, scoped to the given search_path
// (one schema per service per CLAUDE.md §4.2).
func Connect(ctx context.Context, schema string) (*pgxpool.Pool, error) {
	dsn := os.Getenv("TRUSTC_PG_DSN")
	if dsn == "" {
		dsn = "postgres://trustc:trustc_dev@localhost:5432/trustc?sslmode=disable"
	}
	cfg, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		return nil, fmt.Errorf("pg: parse dsn: %w", err)
	}
	if schema != "" {
		cfg.ConnConfig.RuntimeParams["search_path"] = schema + ",public"
	}
	cfg.MaxConns = 16
	cfg.MinConns = 2
	cfg.MaxConnLifetime = 30 * time.Minute

	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		return nil, fmt.Errorf("pg: connect: %w", err)
	}
	pingCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	if err := pool.Ping(pingCtx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("pg: ping: %w", err)
	}
	return pool, nil
}

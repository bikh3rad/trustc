// Package logx wires up a structured slog logger with consistent fields.
package logx

import (
	"context"
	"log/slog"
	"os"
)

type ctxKey int

const (
	keyRequestID ctxKey = iota
	keyActorID
	keyActorRole
)

// New returns a slog.Logger writing JSON to stderr, tagged with the service name.
func New(service string) *slog.Logger {
	h := slog.NewJSONHandler(os.Stderr, &slog.HandlerOptions{Level: slog.LevelInfo})
	return slog.New(h).With("service", service)
}

func WithRequestID(ctx context.Context, id string) context.Context {
	return context.WithValue(ctx, keyRequestID, id)
}

func RequestID(ctx context.Context) string {
	if v, ok := ctx.Value(keyRequestID).(string); ok {
		return v
	}
	return ""
}

func WithActor(ctx context.Context, id, role string) context.Context {
	ctx = context.WithValue(ctx, keyActorID, id)
	ctx = context.WithValue(ctx, keyActorRole, role)
	return ctx
}

func ActorID(ctx context.Context) string {
	if v, ok := ctx.Value(keyActorID).(string); ok {
		return v
	}
	return ""
}

func ActorRole(ctx context.Context) string {
	if v, ok := ctx.Value(keyActorRole).(string); ok {
		return v
	}
	return ""
}

// FromContext returns a logger pre-decorated with whatever context fields are set.
func FromContext(ctx context.Context, base *slog.Logger) *slog.Logger {
	l := base
	if v := RequestID(ctx); v != "" {
		l = l.With("request_id", v)
	}
	if v := ActorID(ctx); v != "" {
		l = l.With("actor_id", v)
	}
	if v := ActorRole(ctx); v != "" {
		l = l.With("actor_role", v)
	}
	return l
}

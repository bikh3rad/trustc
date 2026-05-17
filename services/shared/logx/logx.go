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
	keyActorStatus
	keyActorStartup
	keyActorEmail
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

// WithActorAuth attaches the full set of authenticated-user fields from a JWT
// claim set (status, startup scope, email). Callers may still use WithActor
// when only id+role are known (e.g. system actors emitting audit events).
func WithActorAuth(ctx context.Context, id, role, status, startupID, email string) context.Context {
	ctx = context.WithValue(ctx, keyActorID, id)
	ctx = context.WithValue(ctx, keyActorRole, role)
	ctx = context.WithValue(ctx, keyActorStatus, status)
	ctx = context.WithValue(ctx, keyActorStartup, startupID)
	ctx = context.WithValue(ctx, keyActorEmail, email)
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

func ActorStatus(ctx context.Context) string {
	if v, ok := ctx.Value(keyActorStatus).(string); ok {
		return v
	}
	return ""
}

func ActorStartupID(ctx context.Context) string {
	if v, ok := ctx.Value(keyActorStartup).(string); ok {
		return v
	}
	return ""
}

func ActorEmail(ctx context.Context) string {
	if v, ok := ctx.Value(keyActorEmail).(string); ok {
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

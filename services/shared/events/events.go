// Package events defines the NATS-backed event bus and the canonical event
// type names (CLAUDE.md §5).
package events

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"time"

	"github.com/nats-io/nats.go"

	"github.com/trustc/trustc/services/shared/ids"
)

// Canonical event names (CLAUDE.md §5).
const (
	StartupCreated       = "trustc.startup.created"
	InvoiceSubmitted     = "trustc.invoice.submitted"
	ProcurementCreated   = "trustc.procurement.created"
	ProcurementApproved  = "trustc.procurement.approved"
	ProcurementStateChng = "trustc.procurement.state_changed"
	EscrowLocked         = "trustc.escrow.locked"
	PaymentReleased      = "trustc.payment.released"
	CreditUpdated        = "trustc.credit.updated"
	FreezeActivated      = "trustc.governance.freeze_activated"
	FreezeLifted         = "trustc.governance.freeze_lifted"
	AuditLogged          = "trustc.audit.logged"
)

// Envelope wraps every published event with consistent metadata.
type Envelope struct {
	EventID     string          `json:"event_id"`
	EventType   string          `json:"event_type"`
	Service     string          `json:"service"`
	ActorID     string          `json:"actor_id,omitempty"`
	ActorRole   string          `json:"actor_role,omitempty"`
	RequestID   string          `json:"request_id,omitempty"`
	SubjectType string          `json:"subject_type,omitempty"`
	SubjectID   string          `json:"subject_id,omitempty"`
	OccurredAt  time.Time       `json:"occurred_at"`
	Payload     json.RawMessage `json:"payload"`
}

// Bus is the trustC event bus interface.
type Bus interface {
	Publish(ctx context.Context, env Envelope) error
	Subscribe(subject string, handler func(Envelope)) (Unsubscribe, error)
	Close() error
}

type Unsubscribe func() error

type natsBus struct {
	nc      *nats.Conn
	service string
}

// Connect dials NATS (TRUSTC_NATS_URL or default :4222) and returns a Bus.
func Connect(service string) (Bus, error) {
	url := os.Getenv("TRUSTC_NATS_URL")
	if url == "" {
		url = nats.DefaultURL
	}
	nc, err := nats.Connect(url,
		nats.Name("trustc-"+service),
		nats.MaxReconnects(-1),
		nats.ReconnectWait(2*time.Second),
	)
	if err != nil {
		return nil, fmt.Errorf("events: connect nats %s: %w", url, err)
	}
	return &natsBus{nc: nc, service: service}, nil
}

func (b *natsBus) Publish(ctx context.Context, env Envelope) error {
	if env.EventID == "" {
		env.EventID = ids.EventID()
	}
	if env.Service == "" {
		env.Service = b.service
	}
	if env.OccurredAt.IsZero() {
		env.OccurredAt = time.Now().UTC()
	}
	data, err := json.Marshal(env)
	if err != nil {
		return fmt.Errorf("events: marshal envelope: %w", err)
	}
	if err := b.nc.Publish(env.EventType, data); err != nil {
		return fmt.Errorf("events: publish %s: %w", env.EventType, err)
	}
	return nil
}

func (b *natsBus) Subscribe(subject string, handler func(Envelope)) (Unsubscribe, error) {
	sub, err := b.nc.Subscribe(subject, func(msg *nats.Msg) {
		var env Envelope
		if err := json.Unmarshal(msg.Data, &env); err != nil {
			return
		}
		handler(env)
	})
	if err != nil {
		return nil, fmt.Errorf("events: subscribe %s: %w", subject, err)
	}
	return func() error { return sub.Unsubscribe() }, nil
}

func (b *natsBus) Close() error {
	b.nc.Close()
	return nil
}

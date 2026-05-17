// Package auditemit is the convenience emitter every service uses to push
// an event onto the bus AND ensure the audit service captures it.
//
// The Audit service subscribes to "trustc.>" and chains every event into an
// immutable log; callers should not write to the audit DB directly.
package auditemit

import (
	"context"
	"encoding/json"

	"github.com/trustc/trustc/services/shared/events"
	"github.com/trustc/trustc/services/shared/ids"
	"github.com/trustc/trustc/services/shared/logx"
)

type Emitter struct {
	bus     events.Bus
	service string
}

func New(bus events.Bus, service string) *Emitter {
	return &Emitter{bus: bus, service: service}
}

// Emit publishes an event of the given type and payload. Context fields
// (request_id, actor_id, actor_role) are auto-attached.
func (e *Emitter) Emit(ctx context.Context, eventType, subjectType, subjectID string, payload any) error {
	raw, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	env := events.Envelope{
		EventID:     ids.EventID(),
		EventType:   eventType,
		Service:     e.service,
		ActorID:     logx.ActorID(ctx),
		ActorRole:   logx.ActorRole(ctx),
		RequestID:   logx.RequestID(ctx),
		SubjectType: subjectType,
		SubjectID:   subjectID,
		Payload:     raw,
	}
	return e.bus.Publish(ctx, env)
}

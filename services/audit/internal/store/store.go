// Package store handles append-only audit log persistence + signature chaining.
package store

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Record struct {
	EventID             string          `json:"event_id"`
	ActorID             string          `json:"actor_id,omitempty"`
	ActorRole           string          `json:"actor_role,omitempty"`
	Service             string          `json:"service"`
	EventType           string          `json:"event_type"`
	RequestID           string          `json:"request_id,omitempty"`
	SubjectType         string          `json:"subject_type,omitempty"`
	SubjectID           string          `json:"subject_id,omitempty"`
	PreviousState       string          `json:"previous_state,omitempty"`
	NewState            string          `json:"new_state,omitempty"`
	LinkedTransactionID string          `json:"linked_transaction_id,omitempty"`
	NetworkIP           string          `json:"network_ip,omitempty"`
	NetworkUserAgent    string          `json:"network_user_agent,omitempty"`
	Payload             json.RawMessage `json:"payload"`
}

type StoredRecord struct {
	Record
	PreviousHash string    `json:"previous_hash,omitempty"`
	Signature    string    `json:"signature"`
	RecordedAt   time.Time `json:"recorded_at"`
	Seq          int64     `json:"seq"`
}

type Store struct {
	db *pgxpool.Pool

	// chainMu serializes appends so signature chain ordering is deterministic
	// even under concurrent producers. The DB's seq column is the canonical order;
	// this mutex just guards the read-prev-then-write cycle.
	chainMu  sync.Mutex
	lastHash string
}

func New(db *pgxpool.Pool) (*Store, error) {
	s := &Store{db: db}
	if err := s.loadLastHash(context.Background()); err != nil {
		return nil, err
	}
	return s, nil
}

func (s *Store) loadLastHash(ctx context.Context) error {
	var h *string
	err := s.db.QueryRow(ctx, `
		SELECT signature FROM audit.audit_logs ORDER BY seq DESC LIMIT 1
	`).Scan(&h)
	if err != nil {
		// likely no rows yet — that is OK; lastHash stays empty (genesis).
		s.lastHash = ""
		return nil
	}
	if h != nil {
		s.lastHash = *h
	}
	return nil
}

// Append writes a record with signature = sha256(prev_hash || canonical(record)).
func (s *Store) Append(ctx context.Context, r Record) (*StoredRecord, error) {
	s.chainMu.Lock()
	defer s.chainMu.Unlock()

	canonical, err := canonicalize(r)
	if err != nil {
		return nil, fmt.Errorf("audit: canonicalize: %w", err)
	}
	h := sha256.New()
	h.Write([]byte(s.lastHash))
	h.Write(canonical)
	sig := "sha256:" + hex.EncodeToString(h.Sum(nil))

	var (
		id         string
		recordedAt time.Time
		seq        int64
	)
	err = s.db.QueryRow(ctx, `
		INSERT INTO audit.audit_logs (
		    event_id, actor_id, actor_role, service, event_type,
		    request_id, subject_type, subject_id,
		    previous_state, new_state, linked_transaction_id,
		    network_ip, network_user_agent,
		    payload, previous_hash, signature
		) VALUES (
		    $1, NULLIF($2,'')::uuid, NULLIF($3,''), $4, $5,
		    NULLIF($6,''), NULLIF($7,''), NULLIF($8,''),
		    NULLIF($9,''), NULLIF($10,''), NULLIF($11,''),
		    NULLIF($12,'')::inet, NULLIF($13,''),
		    $14, NULLIF($15,''), $16
		)
		RETURNING id, recorded_at, seq
	`,
		r.EventID, r.ActorID, r.ActorRole, r.Service, r.EventType,
		r.RequestID, r.SubjectType, r.SubjectID,
		r.PreviousState, r.NewState, r.LinkedTransactionID,
		r.NetworkIP, r.NetworkUserAgent,
		[]byte(r.Payload), s.lastHash, sig,
	).Scan(&id, &recordedAt, &seq)
	if err != nil {
		return nil, fmt.Errorf("audit: insert: %w", err)
	}

	out := &StoredRecord{
		Record:       r,
		PreviousHash: s.lastHash,
		Signature:    sig,
		RecordedAt:   recordedAt,
		Seq:          seq,
	}
	s.lastHash = sig
	return out, nil
}

func canonicalize(r Record) ([]byte, error) {
	// json.Marshal sorts struct fields by declaration order; for chain
	// determinism we want a stable representation. We re-marshal into a map.
	intermediate, err := json.Marshal(r)
	if err != nil {
		return nil, err
	}
	var m map[string]any
	if err := json.Unmarshal(intermediate, &m); err != nil {
		return nil, err
	}
	return json.Marshal(m) // map keys are sorted by encoding/json
}

type ListFilter struct {
	SubjectType string
	SubjectID   string
	EventType   string
	StartupID   string
	Limit       int
}

func (s *Store) List(ctx context.Context, f ListFilter) ([]StoredRecord, error) {
	if f.Limit <= 0 || f.Limit > 500 {
		f.Limit = 100
	}
	// startup_id scope: an audit record is "in scope" for a startup when
	// the subject can be traced back to it. We cover three cases:
	//   - subject_id IS the startup itself (escrow account / freeze events)
	//   - subject_type='procurement_request' and the procurement belongs
	//     to this startup
	//   - subject_type='escrow_lock' or 'escrow_release' linked via lock row
	rows, err := s.db.Query(ctx, `
		SELECT event_id,
		       COALESCE(actor_id::text,''), COALESCE(actor_role,''),
		       service, event_type, COALESCE(request_id,''),
		       COALESCE(subject_type,''), COALESCE(subject_id,''),
		       COALESCE(previous_state,''), COALESCE(new_state,''),
		       COALESCE(linked_transaction_id,''),
		       COALESCE(network_ip::text,''), COALESCE(network_user_agent,''),
		       payload, COALESCE(previous_hash,''), signature, recorded_at, seq
		FROM audit.audit_logs al
		WHERE ($1 = '' OR subject_type = $1)
		  AND ($2 = '' OR subject_id   = $2)
		  AND ($3 = '' OR event_type   = $3)
		  AND (
		    $4 = ''
		    OR subject_id = $4
		    OR (subject_type = 'procurement_request' AND subject_id IN (
		          SELECT id::text FROM procurement.procurement_requests WHERE startup_id::text = $4))
		    OR (subject_type IN ('escrow_lock','escrow_release') AND subject_id IN (
		          SELECT el.id::text FROM escrow.escrow_locks el
		          JOIN escrow.escrow_accounts ea ON ea.id = el.account_id
		          WHERE ea.startup_id::text = $4))
		  )
		ORDER BY seq DESC
		LIMIT $5
	`, f.SubjectType, f.SubjectID, f.EventType, f.StartupID, f.Limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []StoredRecord{}
	for rows.Next() {
		var r StoredRecord
		var payload []byte
		if err := rows.Scan(
			&r.EventID, &r.ActorID, &r.ActorRole, &r.Service, &r.EventType, &r.RequestID,
			&r.SubjectType, &r.SubjectID, &r.PreviousState, &r.NewState, &r.LinkedTransactionID,
			&r.NetworkIP, &r.NetworkUserAgent, &payload, &r.PreviousHash, &r.Signature,
			&r.RecordedAt, &r.Seq,
		); err != nil {
			return nil, err
		}
		r.Payload = payload
		out = append(out, r)
	}
	return out, rows.Err()
}

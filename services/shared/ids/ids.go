// Package ids centralizes identifier generation for trustC.
package ids

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"time"

	"github.com/google/uuid"
)

// New returns a fresh v4 UUID as a string.
func New() string { return uuid.NewString() }

// MustParse panics if s is not a valid UUID. Use only for static inputs.
func MustParse(s string) uuid.UUID { return uuid.MustParse(s) }

// TxnID returns a transaction ID of the form txn_<unix-ns>_<rand-hex>.
// Matches the PRD §7.3 transaction_id naming convention.
func TxnID() string {
	var b [8]byte
	_, _ = rand.Read(b[:])
	return fmt.Sprintf("txn_%d_%s", time.Now().UnixNano(), hex.EncodeToString(b[:]))
}

// EventID returns an event ID of the form evt_<unix-ns>_<rand-hex>.
func EventID() string {
	var b [6]byte
	_, _ = rand.Read(b[:])
	return fmt.Sprintf("evt_%d_%s", time.Now().UnixNano(), hex.EncodeToString(b[:]))
}

// RequestID returns a request/trace ID of the form req_<rand-hex>.
func RequestID() string {
	var b [12]byte
	_, _ = rand.Read(b[:])
	return "req_" + hex.EncodeToString(b[:])
}

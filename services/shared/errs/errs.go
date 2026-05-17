// Package errs defines trustC domain errors with HTTP status mapping.
package errs

import (
	"errors"
	"fmt"
	"net/http"
)

type Kind int

const (
	KindInternal Kind = iota
	KindBadRequest
	KindUnauthorized
	KindForbidden
	KindNotFound
	KindConflict
	KindInvariantViolation // e.g. ledger imbalance, FSM violation
)

type Error struct {
	Kind    Kind
	Code    string // machine code, e.g. "FSM_INVALID_TRANSITION"
	Message string
	Cause   error
}

func (e *Error) Error() string {
	if e.Cause != nil {
		return fmt.Sprintf("%s: %s: %v", e.Code, e.Message, e.Cause)
	}
	return fmt.Sprintf("%s: %s", e.Code, e.Message)
}

func (e *Error) Unwrap() error { return e.Cause }

func New(kind Kind, code, msg string) *Error { return &Error{Kind: kind, Code: code, Message: msg} }

func Wrap(kind Kind, code, msg string, cause error) *Error {
	return &Error{Kind: kind, Code: code, Message: msg, Cause: cause}
}

// HTTPStatus maps an error to an HTTP status code; returns 500 for non-domain errors.
func HTTPStatus(err error) int {
	var e *Error
	if !errors.As(err, &e) {
		return http.StatusInternalServerError
	}
	switch e.Kind {
	case KindBadRequest:
		return http.StatusBadRequest
	case KindUnauthorized:
		return http.StatusUnauthorized
	case KindForbidden:
		return http.StatusForbidden
	case KindNotFound:
		return http.StatusNotFound
	case KindConflict, KindInvariantViolation:
		return http.StatusConflict
	default:
		return http.StatusInternalServerError
	}
}

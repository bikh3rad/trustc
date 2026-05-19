// Package fsm encodes the procurement state machine from PRD §10.1.
//
//   DRAFT                          ┐
//     → MANAGER_REVIEW             │ founder workspace (company-internal)
//     → FINANCIAL_VALIDATION       ┘ submits the request to the VC queue
//     → ESCROW_LOCK                ┐ VC ONLY — the actual capital lock
//     → SUPPLIER_DISPATCH          ┐
//     → DELIVERY_CONFIRMATION      │ founder operations resume
//     → PAYMENT_RELEASE            │
//     → ACCOUNTING_FINALIZATION    ┘
//
// Two additional terminal states exist:
//   CANCELLED — withdrawn before ESCROW_LOCK. Allowed actors depend on the
//               current state (the company can withdraw its own draft; the
//               VC rejects a request that lives in FINANCIAL_VALIDATION).
//   FROZEN    — set by Governance kill switch (CLAUDE.md §6, PRD §9.2).
//
// Per CLAUDE.md §6.2 every transition must pass BOTH the structural FSM rule
// (CanTransition) and the role authorization rule (RoleCanTransition). The
// frontend mirrors these tables in src/lib/fsm.ts so it can hide buttons the
// caller isn't allowed to press — but the procurement service is the source
// of truth.
package fsm

import (
	"fmt"

	"github.com/trustc/trustc/services/shared/errs"
)

type State string

const (
	Draft                  State = "DRAFT"
	ManagerReview          State = "MANAGER_REVIEW"
	FinancialValidation    State = "FINANCIAL_VALIDATION"
	EscrowLock             State = "ESCROW_LOCK"
	SupplierDispatch       State = "SUPPLIER_DISPATCH"
	DeliveryConfirmation   State = "DELIVERY_CONFIRMATION"
	PaymentRelease         State = "PAYMENT_RELEASE"
	AccountingFinalization State = "ACCOUNTING_FINALIZATION"
	Cancelled              State = "CANCELLED"
	Frozen                 State = "FROZEN"
)

// allowed maps each from-state to the set of legal next states.
var allowed = map[State]map[State]bool{
	Draft:                {ManagerReview: true, Cancelled: true},
	ManagerReview:        {FinancialValidation: true, Cancelled: true},
	FinancialValidation:  {EscrowLock: true, Cancelled: true},
	EscrowLock:           {SupplierDispatch: true},
	SupplierDispatch:     {DeliveryConfirmation: true},
	DeliveryConfirmation: {PaymentRelease: true},
	PaymentRelease:       {AccountingFinalization: true},
	// AccountingFinalization, Cancelled, Frozen are terminal.
}

// CanTransition returns nil if from→to is allowed. Freeze is always allowed
// from any non-terminal state (kill-switch override per PRD §13).
func CanTransition(from, to State) error {
	if to == Frozen && from != AccountingFinalization && from != Cancelled {
		return nil
	}
	next, ok := allowed[from]
	if !ok {
		return errs.New(errs.KindInvariantViolation, "FSM_TERMINAL",
			"cannot transition from terminal state "+string(from))
	}
	if !next[to] {
		return errs.New(errs.KindInvariantViolation, "FSM_INVALID_TRANSITION",
			"transition "+string(from)+" → "+string(to)+" is not allowed")
	}
	return nil
}

// Valid reports whether s is a known state.
func Valid(s State) bool {
	switch s {
	case Draft, ManagerReview, FinancialValidation, EscrowLock, SupplierDispatch,
		DeliveryConfirmation, PaymentRelease, AccountingFinalization, Cancelled, Frozen:
		return true
	}
	return false
}

// transitionRoles maps each (from, to) pair to the roles allowed to perform
// it. ADMIN is granted everywhere unconditionally (see RoleCanTransition).
//
//	DRAFT → MANAGER_REVIEW:                       FOUNDER  (company submits)
//	MANAGER_REVIEW → FINANCIAL_VALIDATION:        FOUNDER  (submits to VC queue)
//	FINANCIAL_VALIDATION → ESCROW_LOCK:           VC       (the actual lock)
//	ESCROW_LOCK → SUPPLIER_DISPATCH:              FOUNDER  (operations resume)
//	SUPPLIER_DISPATCH → DELIVERY_CONFIRMATION:    FOUNDER
//	DELIVERY_CONFIRMATION → PAYMENT_RELEASE:      FOUNDER
//	PAYMENT_RELEASE → ACCOUNTING_FINALIZATION:    FOUNDER
//
// Cancellation:
//
//	DRAFT/MANAGER_REVIEW → CANCELLED:             FOUNDER  (withdraw own draft)
//	FINANCIAL_VALIDATION → CANCELLED:             VC       (VC rejects review)
var transitionRoles = map[State]map[State][]string{
	Draft: {
		ManagerReview: {"FOUNDER"},
		Cancelled:     {"FOUNDER"},
	},
	ManagerReview: {
		FinancialValidation: {"FOUNDER"},
		Cancelled:           {"FOUNDER"},
	},
	FinancialValidation: {
		EscrowLock: {"VC"},
		Cancelled:  {"VC"},
	},
	EscrowLock: {
		SupplierDispatch: {"FOUNDER"},
	},
	SupplierDispatch: {
		DeliveryConfirmation: {"FOUNDER"},
	},
	DeliveryConfirmation: {
		PaymentRelease: {"FOUNDER"},
	},
	PaymentRelease: {
		AccountingFinalization: {"FOUNDER"},
	},
}

// RoleCanTransition returns nil if a caller with the given role is authorized
// to perform from→to. ADMIN is always permitted (impersonation / debugging).
// The kill-switch transition (any → FROZEN) is handled by the governance
// service via its own event channel and is not enforced here.
//
// Returning KindForbidden lets the gateway turn this into a 403.
func RoleCanTransition(role string, from, to State) error {
	if role == "ADMIN" {
		return nil
	}
	if to == Frozen {
		// Freeze is driven by governance, not the procurement HTTP path.
		// Letting the actor through here keeps the freeze subscriber path
		// usable; the gateway already rejects FROZEN posts from end users.
		return nil
	}
	next, ok := transitionRoles[from]
	if !ok {
		return errs.New(errs.KindForbidden, "FSM_TERMINAL",
			"transitions from "+string(from)+" are not allowed")
	}
	allowed, ok := next[to]
	if !ok {
		return errs.New(errs.KindForbidden, "FSM_FORBIDDEN_TRANSITION",
			"transition "+string(from)+" → "+string(to)+" is not configured for any role")
	}
	for _, r := range allowed {
		if r == role {
			return nil
		}
	}
	return errs.New(errs.KindForbidden, "FSM_ROLE_NOT_ALLOWED",
		fmt.Sprintf("role %q cannot perform %s → %s — allowed roles: %v", role, from, to, allowed))
}

// AllowedRoles exposes the role list for a given transition (read-only; the
// returned slice is a fresh copy so callers cannot mutate the table). Used by
// the VC Approvals page and by tests.
func AllowedRoles(from, to State) []string {
	next, ok := transitionRoles[from]
	if !ok {
		return nil
	}
	roles, ok := next[to]
	if !ok {
		return nil
	}
	out := make([]string, len(roles))
	copy(out, roles)
	return out
}

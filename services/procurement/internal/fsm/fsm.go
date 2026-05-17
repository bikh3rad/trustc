// Package fsm encodes the procurement state machine from PRD §10.1.
//
//   DRAFT
//     → MANAGER_REVIEW
//     → FINANCIAL_VALIDATION
//     → ESCROW_LOCK
//     → SUPPLIER_DISPATCH
//     → DELIVERY_CONFIRMATION
//     → PAYMENT_RELEASE
//     → ACCOUNTING_FINALIZATION
//
// Two additional terminal states exist:
//   CANCELLED — operator-initiated, allowed only before ESCROW_LOCK.
//   FROZEN    — set by Governance kill switch (CLAUDE.md §6, PRD §9.2).
//
// Per CLAUDE.md §6.2 every transition must pass FSM validation; that is the
// single source of truth this package enforces.
package fsm

import "github.com/trustc/trustc/services/shared/errs"

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

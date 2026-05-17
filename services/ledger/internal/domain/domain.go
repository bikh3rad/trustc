// Package domain defines the Ledger service value types.
package domain

import "github.com/trustc/trustc/services/shared/errs"

type Side string

const (
	Debit  Side = "DEBIT"
	Credit Side = "CREDIT"
)

func (s Side) Valid() bool { return s == Debit || s == Credit }

// Line is a single posting (debit OR credit).
type Line struct {
	AccountCode string `json:"account_code"`
	Side        Side   `json:"side"`
	AmountCents int64  `json:"amount_cents"`
}

// Entry is a balanced journal entry: one header + N lines.
type Entry struct {
	TransactionID       string `json:"transaction_id"`
	WorkflowReferenceID string `json:"workflow_reference_id,omitempty"`
	Description         string `json:"description,omitempty"`
	Lines               []Line `json:"entries"`
}

// Validate enforces structural rules. The actual debit=credit balance is
// enforced inside the DB CHECK and the store layer.
func (e *Entry) Validate() error {
	if e.TransactionID == "" {
		return errs.New(errs.KindBadRequest, "MISSING_TXN_ID", "transaction_id is required")
	}
	if len(e.Lines) < 2 {
		return errs.New(errs.KindBadRequest, "TOO_FEW_LINES", "an entry needs at least 2 lines")
	}
	var debits, credits int64
	for i, l := range e.Lines {
		if !l.Side.Valid() {
			return errs.New(errs.KindBadRequest, "BAD_SIDE",
				"line "+itos(i)+": side must be DEBIT or CREDIT")
		}
		if l.AmountCents <= 0 {
			return errs.New(errs.KindBadRequest, "NONPOSITIVE_AMOUNT",
				"line "+itos(i)+": amount_cents must be > 0")
		}
		if l.AccountCode == "" {
			return errs.New(errs.KindBadRequest, "MISSING_ACCOUNT",
				"line "+itos(i)+": account_code required")
		}
		if l.Side == Debit {
			debits += l.AmountCents
		} else {
			credits += l.AmountCents
		}
	}
	if debits != credits {
		return errs.New(errs.KindInvariantViolation, "UNBALANCED_ENTRY",
			"sum(debits) must equal sum(credits)")
	}
	return nil
}

func itos(i int) string {
	if i == 0 {
		return "0"
	}
	s := ""
	for i > 0 {
		s = string(rune('0'+i%10)) + s
		i /= 10
	}
	return s
}

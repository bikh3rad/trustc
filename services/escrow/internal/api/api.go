// Package api exposes the Escrow service over REST. It also calls the
// Ledger service to post the canonical double-entry rows for each lock/release.
package api

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"os"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/trustc/trustc/services/shared/auditemit"
	"github.com/trustc/trustc/services/shared/errs"
	"github.com/trustc/trustc/services/shared/events"
	"github.com/trustc/trustc/services/shared/httpx"
	"github.com/trustc/trustc/services/shared/ids"
	"github.com/trustc/trustc/services/shared/logx"

	"github.com/trustc/trustc/services/escrow/internal/store"
)

type Handler struct {
	store     *store.Store
	emitter   *auditemit.Emitter
	ledgerURL string
}

func New(s *store.Store, e *auditemit.Emitter) *Handler {
	return &Handler{
		store:     s,
		emitter:   e,
		ledgerURL: envOr("TRUSTC_LEDGER_URL", "http://localhost:7004"),
	}
}

func (h *Handler) Routes() http.Handler {
	r := chi.NewRouter()
	r.Get("/health", h.health)
	r.Post("/escrow/locks", h.lock)
	r.Post("/escrow/releases", h.release)
	r.Get("/escrow/accounts/{startup_id}", h.account)
	r.Post("/escrow/accounts/{startup_id}/topup", h.topup) // dev convenience
	return r
}

func (h *Handler) health(w http.ResponseWriter, _ *http.Request) {
	httpx.JSON(w, http.StatusOK, map[string]string{"status": "ok", "service": "escrow"})
}

type lockReq struct {
	ProcurementID string `json:"procurement_id"`
	StartupID     string `json:"startup_id"`
	AmountCents   int64  `json:"amount_cents"`
	Currency      string `json:"currency"`
	SupplierName  string `json:"supplier_name"`
}

func (h *Handler) lock(w http.ResponseWriter, r *http.Request) {
	var req lockReq
	if err := httpx.DecodeJSON(r, &req); err != nil {
		httpx.Error(w, err)
		return
	}
	if req.ProcurementID == "" || req.StartupID == "" || req.AmountCents <= 0 {
		httpx.Error(w, errs.New(errs.KindBadRequest, "BAD_LOCK_REQUEST",
			"procurement_id, startup_id, amount_cents > 0 required"))
		return
	}
	if req.Currency == "" {
		req.Currency = "USD"
	}

	lock, err := h.store.Lock(r.Context(), req.ProcurementID, req.StartupID, req.Currency, req.SupplierName, req.AmountCents)
	if err != nil {
		httpx.Error(w, err)
		return
	}

	// Ledger posting for ESCROW_LOCK:
	//   DR 1103_ESCROW_BANK              (escrow bank cash moves under platform fiduciary control)
	//   CR 2103_FIDUCIARY_ESCROW_LIABILITY (we owe these funds back to the startup)
	txnID := ids.TxnID()
	if err := h.postLedger(r.Context(), txnID, lock.ProcurementID, "escrow lock", []ledgerLine{
		{"1103_ESCROW_BANK", "DEBIT", lock.AmountCents},
		{"2103_FIDUCIARY_ESCROW_LIABILITY", "CREDIT", lock.AmountCents},
	}); err != nil {
		httpx.Error(w, err)
		return
	}

	_ = h.emitter.Emit(r.Context(), events.EscrowLocked, "escrow_lock", lock.ID, map[string]any{
		"lock":           lock,
		"transaction_id": txnID,
	})
	httpx.JSON(w, http.StatusCreated, lock)
}

type releaseReq struct {
	ProcurementID string `json:"procurement_id"`
	SupplierName  string `json:"supplier_name"`
}

func (h *Handler) release(w http.ResponseWriter, r *http.Request) {
	var req releaseReq
	if err := httpx.DecodeJSON(r, &req); err != nil {
		httpx.Error(w, err)
		return
	}
	if req.ProcurementID == "" {
		httpx.Error(w, errs.New(errs.KindBadRequest, "BAD_RELEASE_REQUEST",
			"procurement_id required"))
		return
	}
	rel, lock, err := h.store.Release(r.Context(), req.ProcurementID, req.SupplierName)
	if err != nil {
		httpx.Error(w, err)
		return
	}

	// Ledger posting for PAYMENT_RELEASE:
	//   DR 2103_FIDUCIARY_ESCROW_LIABILITY  (extinguish our liability)
	//   CR 1103_ESCROW_BANK                 (cash leaves escrow to vendor)
	txnID := ids.TxnID()
	if err := h.postLedger(r.Context(), txnID, lock.ProcurementID, "escrow release to supplier "+rel.SupplierName, []ledgerLine{
		{"2103_FIDUCIARY_ESCROW_LIABILITY", "DEBIT", rel.AmountCents},
		{"1103_ESCROW_BANK", "CREDIT", rel.AmountCents},
	}); err != nil {
		httpx.Error(w, err)
		return
	}

	_ = h.emitter.Emit(r.Context(), events.PaymentReleased, "escrow_release", rel.ID, map[string]any{
		"release":        rel,
		"transaction_id": txnID,
	})
	httpx.JSON(w, http.StatusCreated, rel)
}

func (h *Handler) account(w http.ResponseWriter, r *http.Request) {
	startupID := chi.URLParam(r, "startup_id")

	// RBAC scope: a FOUNDER may only read their own escrow account.
	// VC + ADMIN + AUDITOR roles see whatever URL they ask for.
	if logx.ActorRole(r.Context()) == "FOUNDER" {
		scope := logx.ActorStartupID(r.Context())
		if scope == "" || scope != startupID {
			httpx.Error(w, errs.New(errs.KindForbidden, "OUT_OF_SCOPE",
				"founder may only read their own escrow account"))
			return
		}
	}

	a, err := h.store.AccountFor(r.Context(), startupID)
	if err != nil {
		httpx.Error(w, err)
		return
	}
	httpx.JSON(w, http.StatusOK, a)
}

type topupReq struct {
	AmountCents int64 `json:"amount_cents"`
}

// topup is a dev convenience: in production this would be triggered by an
// incoming customer payment event, not by a direct REST call.
func (h *Handler) topup(w http.ResponseWriter, r *http.Request) {
	startupID := chi.URLParam(r, "startup_id")
	var req topupReq
	if err := httpx.DecodeJSON(r, &req); err != nil {
		httpx.Error(w, err)
		return
	}
	if req.AmountCents <= 0 {
		httpx.Error(w, errs.New(errs.KindBadRequest, "BAD_AMOUNT", "amount_cents must be > 0"))
		return
	}
	if _, err := h.store.GetOrCreateAccount(r.Context(), startupID, "USD"); err != nil {
		httpx.Error(w, err)
		return
	}
	if err := h.store.AdjustBalance(r.Context(), startupID, req.AmountCents); err != nil {
		httpx.Error(w, err)
		return
	}

	// Ledger: cash arrives into escrow bank, liability owed back to startup.
	txnID := ids.TxnID()
	if err := h.postLedger(r.Context(), txnID, "topup:"+startupID, "escrow topup", []ledgerLine{
		{"1103_ESCROW_BANK", "DEBIT", req.AmountCents},
		{"2103_FIDUCIARY_ESCROW_LIABILITY", "CREDIT", req.AmountCents},
	}); err != nil {
		httpx.Error(w, err)
		return
	}
	a, _ := h.store.AccountFor(r.Context(), startupID)
	httpx.JSON(w, http.StatusOK, a)
}

type ledgerLine struct {
	AccountCode string `json:"account_code"`
	Side        string `json:"side"`
	AmountCents int64  `json:"amount_cents"`
}

func (h *Handler) postLedger(ctx context.Context, txnID, workflowRef, desc string, lines []ledgerLine) error {
	body, _ := json.Marshal(map[string]any{
		"transaction_id":         txnID,
		"workflow_reference_id":  workflowRef,
		"description":            desc,
		"entries":                lines,
	})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, h.ledgerURL+"/entries", bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	if rid := logx.RequestID(ctx); rid != "" {
		req.Header.Set(httpx.HeaderRequestID, rid)
	}
	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return errs.Wrap(errs.KindInternal, "LEDGER_UNREACHABLE", "ledger service unreachable", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 400 {
		var e struct{ Error, Message string }
		_ = json.NewDecoder(resp.Body).Decode(&e)
		return errs.New(errs.KindInvariantViolation, e.Error, "ledger rejected: "+e.Message)
	}
	return nil
}

func envOr(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}

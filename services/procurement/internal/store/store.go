// Package store handles procurement persistence and FSM-aware updates.
package store

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	sharederrs "github.com/trustc/trustc/services/shared/errs"

	"github.com/trustc/trustc/services/procurement/internal/fsm"
)

type Request struct {
	ID                   string    `json:"id"`
	StartupID            string    `json:"startup_id"`
	Title                string    `json:"title"`
	SupplierName         string    `json:"supplier_name"`
	SupplierID           string    `json:"supplier_id,omitempty"`
	AmountCents          int64     `json:"amount_cents"`
	Currency             string    `json:"currency"`
	Category             string    `json:"category"`
	Priority             string    `json:"priority"`
	InvoiceID            string    `json:"invoice_id,omitempty"`
	InvoiceNumber        string    `json:"invoice_number,omitempty"`
	Description          string    `json:"description,omitempty"`
	OperationalReason    string    `json:"operational_reason,omitempty"`
	Department           string    `json:"department,omitempty"`
	BudgetCategory       string    `json:"budget_category,omitempty"`
	ProjectReference     string    `json:"project_reference,omitempty"`
	ExpectedDeliveryDate string    `json:"expected_delivery_date,omitempty"`
	State                fsm.State `json:"state"`
	CreatedAt            time.Time `json:"created_at"`
}

type WorkflowTransition struct {
	From    fsm.State `json:"from_state,omitempty"`
	To      fsm.State `json:"to_state"`
	ActorID string    `json:"actor_id,omitempty"`
	Role    string    `json:"actor_role,omitempty"`
	Reason  string    `json:"reason,omitempty"`
	At      time.Time `json:"transitioned_at"`
}

type Store struct{ db *pgxpool.Pool }

func New(db *pgxpool.Pool) *Store { return &Store{db: db} }

func (s *Store) Create(ctx context.Context, r Request, actorID, role, reqID string) (*Request, error) {
	tx, err := s.db.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var out Request
	err = tx.QueryRow(ctx, `
		INSERT INTO procurement.procurement_requests (
		  startup_id, title, supplier_name, supplier_id,
		  amount_cents, currency, category, priority,
		  invoice_id, invoice_number, description, operational_reason,
		  department, budget_category, project_reference, expected_delivery_date,
		  state
		) VALUES (
		  $1, $2, $3, NULLIF($4,'')::uuid,
		  $5, $6, $7, $8,
		  NULLIF($9,'')::uuid, NULLIF($10,''), NULLIF($11,''), NULLIF($12,''),
		  NULLIF($13,''), NULLIF($14,''), NULLIF($15,'')::uuid, NULLIF($16,'')::date,
		  'DRAFT'
		)
		RETURNING id, startup_id, title, supplier_name, COALESCE(supplier_id::text,''),
		          amount_cents, currency, category, priority,
		          COALESCE(invoice_id::text,''), COALESCE(invoice_number,''),
		          COALESCE(description,''), COALESCE(operational_reason,''),
		          COALESCE(department,''), COALESCE(budget_category,''),
		          COALESCE(project_reference::text,''), COALESCE(expected_delivery_date::text,''),
		          state, created_at
	`,
		r.StartupID, r.Title, r.SupplierName, r.SupplierID,
		r.AmountCents, r.Currency, r.Category, r.Priority,
		r.InvoiceID, r.InvoiceNumber, r.Description, r.OperationalReason,
		r.Department, r.BudgetCategory, r.ProjectReference, r.ExpectedDeliveryDate,
	).Scan(&out.ID, &out.StartupID, &out.Title, &out.SupplierName, &out.SupplierID,
		&out.AmountCents, &out.Currency, &out.Category, &out.Priority,
		&out.InvoiceID, &out.InvoiceNumber, &out.Description, &out.OperationalReason,
		&out.Department, &out.BudgetCategory, &out.ProjectReference, &out.ExpectedDeliveryDate,
		&out.State, &out.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("procurement: insert: %w", err)
	}

	_, err = tx.Exec(ctx, `
		INSERT INTO procurement.workflow_states (procurement_id, from_state, to_state, actor_id, actor_role, request_id)
		VALUES ($1, NULL, 'DRAFT', NULLIF($2,'')::uuid, NULLIF($3,''), NULLIF($4,''))
	`, out.ID, actorID, role, reqID)
	if err != nil {
		return nil, fmt.Errorf("procurement: insert workflow row: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return &out, nil
}

func (s *Store) Get(ctx context.Context, id string) (*Request, error) {
	var out Request
	err := s.db.QueryRow(ctx, `
		SELECT id, startup_id, title, supplier_name, COALESCE(supplier_id::text,''),
		       amount_cents, currency, category, priority,
		       COALESCE(invoice_id::text,''), COALESCE(invoice_number,''),
		       COALESCE(description,''), COALESCE(operational_reason,''),
		       COALESCE(department,''), COALESCE(budget_category,''),
		       COALESCE(project_reference::text,''), COALESCE(expected_delivery_date::text,''),
		       state, created_at
		FROM procurement.procurement_requests WHERE id = $1
	`, id).Scan(&out.ID, &out.StartupID, &out.Title, &out.SupplierName, &out.SupplierID,
		&out.AmountCents, &out.Currency, &out.Category, &out.Priority,
		&out.InvoiceID, &out.InvoiceNumber, &out.Description, &out.OperationalReason,
		&out.Department, &out.BudgetCategory, &out.ProjectReference, &out.ExpectedDeliveryDate,
		&out.State, &out.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, sharederrs.New(sharederrs.KindNotFound, "PROCUREMENT_NOT_FOUND", "no such procurement")
	}
	if err != nil {
		return nil, err
	}
	return &out, nil
}

func (s *Store) List(ctx context.Context, startupID string, state string) ([]Request, error) {
	rows, err := s.db.Query(ctx, `
		SELECT id, startup_id, title, supplier_name, COALESCE(supplier_id::text,''),
		       amount_cents, currency, category, priority,
		       COALESCE(invoice_id::text,''), COALESCE(invoice_number,''),
		       COALESCE(description,''), COALESCE(operational_reason,''),
		       COALESCE(department,''), COALESCE(budget_category,''),
		       COALESCE(project_reference::text,''), COALESCE(expected_delivery_date::text,''),
		       state, created_at
		FROM procurement.procurement_requests
		WHERE ($1 = '' OR startup_id::text = $1)
		  AND ($2 = '' OR state = $2)
		ORDER BY created_at DESC
		LIMIT 500
	`, startupID, state)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Request{}
	for rows.Next() {
		var r Request
		if err := rows.Scan(&r.ID, &r.StartupID, &r.Title, &r.SupplierName, &r.SupplierID,
			&r.AmountCents, &r.Currency, &r.Category, &r.Priority,
			&r.InvoiceID, &r.InvoiceNumber, &r.Description, &r.OperationalReason,
			&r.Department, &r.BudgetCategory, &r.ProjectReference, &r.ExpectedDeliveryDate,
			&r.State, &r.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, r)
	}
	return out, rows.Err()
}

// Transition validates the FSM rule then atomically updates state + appends
// a workflow_states row. Returns the new state.
func (s *Store) Transition(ctx context.Context, id string, to fsm.State,
	actorID, role, reason, reqID string,
) (*Request, error) {
	if !fsm.Valid(to) {
		return nil, sharederrs.New(sharederrs.KindBadRequest, "BAD_TARGET_STATE",
			"unknown target state: "+string(to))
	}
	tx, err := s.db.BeginTx(ctx, pgx.TxOptions{IsoLevel: pgx.Serializable})
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var fromState fsm.State
	err = tx.QueryRow(ctx, `
		SELECT state FROM procurement.procurement_requests WHERE id = $1 FOR UPDATE
	`, id).Scan(&fromState)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, sharederrs.New(sharederrs.KindNotFound, "PROCUREMENT_NOT_FOUND", "no such procurement")
	}
	if err != nil {
		return nil, err
	}

	if err := fsm.CanTransition(fromState, to); err != nil {
		return nil, err
	}

	_, err = tx.Exec(ctx, `
		UPDATE procurement.procurement_requests SET state = $2, updated_at = NOW() WHERE id = $1
	`, id, string(to))
	if err != nil {
		return nil, fmt.Errorf("procurement: update state: %w", err)
	}
	_, err = tx.Exec(ctx, `
		INSERT INTO procurement.workflow_states
		    (procurement_id, from_state, to_state, actor_id, actor_role, reason, request_id)
		VALUES ($1, $2, $3, NULLIF($4,'')::uuid, NULLIF($5,''), NULLIF($6,''), NULLIF($7,''))
	`, id, string(fromState), string(to), actorID, role, reason, reqID)
	if err != nil {
		return nil, fmt.Errorf("procurement: insert workflow row: %w", err)
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return s.Get(ctx, id)
}

// InFlightIDsForStartup returns the IDs of every procurement request for the
// startup that is still in a non-terminal state. Used by the freeze event
// subscriber to walk in-flight items to FROZEN.
func (s *Store) InFlightIDsForStartup(ctx context.Context, startupID string) ([]string, error) {
	rows, err := s.db.Query(ctx, `
		SELECT id::text FROM procurement.procurement_requests
		WHERE startup_id = $1
		  AND state NOT IN ('ACCOUNTING_FINALIZATION','CANCELLED','FROZEN')
	`, startupID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []string{}
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		out = append(out, id)
	}
	return out, rows.Err()
}

func (s *Store) History(ctx context.Context, id string) ([]WorkflowTransition, error) {
	rows, err := s.db.Query(ctx, `
		SELECT COALESCE(from_state,''), to_state, COALESCE(actor_id::text,''),
		       COALESCE(actor_role,''), COALESCE(reason,''), transitioned_at
		FROM procurement.workflow_states
		WHERE procurement_id = $1
		ORDER BY transitioned_at ASC
	`, id)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []WorkflowTransition{}
	for rows.Next() {
		var t WorkflowTransition
		if err := rows.Scan(&t.From, &t.To, &t.ActorID, &t.Role, &t.Reason, &t.At); err != nil {
			return nil, err
		}
		out = append(out, t)
	}
	return out, rows.Err()
}

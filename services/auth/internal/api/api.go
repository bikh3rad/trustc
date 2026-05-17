// Package api exposes the Auth service over REST.
//
// External endpoints (proxied by gateway as /v1/auth/*):
//   POST /auth/register                — public, gated by admin settings
//   POST /auth/login                   — public
//   POST /auth/logout                  — authed (stateless JWT, mostly a hook for clients)
//   GET  /auth/me                      — authed, identity comes from gateway headers
//   GET  /auth/registration-status     — public, just exposes the on/off flag
package api

import (
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"golang.org/x/crypto/bcrypt"

	"github.com/trustc/trustc/services/shared/authtoken"
	"github.com/trustc/trustc/services/shared/errs"
	"github.com/trustc/trustc/services/shared/httpx"
	"github.com/trustc/trustc/services/shared/logx"

	"github.com/trustc/trustc/services/auth/internal/adminclient"
	"github.com/trustc/trustc/services/auth/internal/store"
)

// BcryptCost is fixed at 12 per HANDOFF spec.
const BcryptCost = 12

// HashPassword is exported so the seed bootstrap can produce matching hashes.
func HashPassword(plain string) (string, error) {
	b, err := bcrypt.GenerateFromPassword([]byte(plain), BcryptCost)
	if err != nil {
		return "", err
	}
	return string(b), nil
}

type Handler struct {
	store  *store.Store
	admin  *adminclient.Client
	secret []byte
}

func New(s *store.Store, admin *adminclient.Client, secret []byte) *Handler {
	return &Handler{store: s, admin: admin, secret: secret}
}

func (h *Handler) Routes() http.Handler {
	r := chi.NewRouter()
	// Lift X-Trustc-* headers (set by the gateway) into context for /me + /logout.
	r.Use(httpx.IdentityFromHeaders)

	r.Get("/health", h.health)

	r.Get("/auth/registration-status", h.registrationStatus)
	r.Post("/auth/register", h.register)
	r.Post("/auth/login", h.login)
	r.Post("/auth/logout", h.logout)
	r.Get("/auth/me", h.me)

	// Internal endpoints — service-to-service only. Admin uses these to
	// manage the users table without crossing schema ownership.
	r.Get("/internal/users", h.internalListUsers)
	r.Get("/internal/users/{id}", h.internalGetUser)
	r.Post("/internal/users/{id}/status", h.internalSetStatus)
	return r
}

func (h *Handler) health(w http.ResponseWriter, _ *http.Request) {
	httpx.JSON(w, http.StatusOK, map[string]string{"status": "ok", "service": "auth"})
}

func (h *Handler) registrationStatus(w http.ResponseWriter, r *http.Request) {
	s, err := h.admin.Settings(r.Context())
	if err != nil {
		httpx.Error(w, err)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]bool{"enabled": s.RegistrationEnabled})
}

/* ---------------- register ---------------- */

type registerRequest struct {
	Name     string `json:"name"`
	Email    string `json:"email"`
	Password string `json:"password"`
	Role     string `json:"role"`
	Company  string `json:"company"`
}

type registerResponse struct {
	User store.User `json:"user"`
}

var emailRe = regexp.MustCompile(`^[^@\s]+@[^@\s]+\.[^@\s]+$`)

func (h *Handler) register(w http.ResponseWriter, r *http.Request) {
	var req registerRequest
	if err := httpx.DecodeJSON(r, &req); err != nil {
		httpx.Error(w, err)
		return
	}
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))
	req.Role = strings.ToUpper(strings.TrimSpace(req.Role))
	req.Name = strings.TrimSpace(req.Name)
	req.Company = strings.TrimSpace(req.Company)

	if len(req.Name) < 3 {
		httpx.Error(w, errs.New(errs.KindBadRequest, "BAD_NAME", "name must be at least 3 characters"))
		return
	}
	if !emailRe.MatchString(req.Email) {
		httpx.Error(w, errs.New(errs.KindBadRequest, "BAD_EMAIL", "invalid email format"))
		return
	}
	if len(req.Password) < 6 {
		httpx.Error(w, errs.New(errs.KindBadRequest, "BAD_PASSWORD", "password must be at least 6 characters"))
		return
	}
	switch req.Role {
	case "FOUNDER", "VC", "AUDITOR":
		// self-service roles are allowed
	case "ADMIN":
		// ADMIN is never self-served — must be created via DB/admin tooling.
		httpx.Error(w, errs.New(errs.KindForbidden, "ROLE_NOT_SELF_SERVE",
			"ADMIN accounts cannot be created via /register"))
		return
	default:
		httpx.Error(w, errs.New(errs.KindBadRequest, "BAD_ROLE", "unknown role"))
		return
	}
	if req.Company == "" {
		httpx.Error(w, errs.New(errs.KindBadRequest, "BAD_COMPANY", "company required"))
		return
	}

	settings, err := h.admin.Settings(r.Context())
	if err != nil {
		httpx.Error(w, err)
		return
	}
	if !settings.RegistrationEnabled {
		httpx.Error(w, errs.New(errs.KindForbidden, "REGISTRATION_DISABLED",
			"public registration is currently closed"))
		return
	}

	hash, err := HashPassword(req.Password)
	if err != nil {
		httpx.Error(w, errs.Wrap(errs.KindInternal, "HASH_FAILED", "could not hash password", err))
		return
	}

	// Approval policy: require approval if role is in the configured list.
	status := "ACTIVE"
	if settings.RequiresApproval(req.Role) {
		status = "PENDING"
	}

	u, err := h.store.Create(r.Context(), store.CreateInput{
		Email:        req.Email,
		PasswordHash: hash,
		Role:         req.Role,
		Status:       status,
		Name:         req.Name,
		Company:      req.Company,
	})
	if err != nil {
		httpx.Error(w, err)
		return
	}

	httpx.JSON(w, http.StatusCreated, registerResponse{User: *u})
}

/* ---------------- login ---------------- */

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type loginResponse struct {
	Token string     `json:"token"`
	User  store.User `json:"user"`
}

func (h *Handler) login(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if err := httpx.DecodeJSON(r, &req); err != nil {
		httpx.Error(w, err)
		return
	}
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))
	if req.Email == "" || req.Password == "" {
		httpx.Error(w, errs.New(errs.KindBadRequest, "MISSING_CREDENTIALS",
			"email and password are required"))
		return
	}

	u, err := h.store.GetByEmail(r.Context(), req.Email)
	if err != nil {
		// Don't leak which specific reason failed for unknown emails.
		var e *errs.Error
		if asErr(err, &e) && e.Code == "USER_NOT_FOUND" {
			httpx.Error(w, errs.New(errs.KindUnauthorized, "INVALID_CREDENTIALS",
				"email or password is incorrect"))
			return
		}
		httpx.Error(w, err)
		return
	}

	// Status gate — we verify password regardless to avoid leaking a user-existence
	// oracle via timing, but only an ACTIVE user gets a token back.
	if err := bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(req.Password)); err != nil {
		httpx.Error(w, errs.New(errs.KindUnauthorized, "INVALID_CREDENTIALS",
			"email or password is incorrect"))
		return
	}
	switch u.Status {
	case "PENDING":
		httpx.Error(w, errs.New(errs.KindForbidden, "ACCOUNT_PENDING",
			"account is awaiting admin approval"))
		return
	case "DISABLED":
		httpx.Error(w, errs.New(errs.KindForbidden, "ACCOUNT_DISABLED",
			"account has been disabled"))
		return
	case "ACTIVE":
		// proceed
	default:
		httpx.Error(w, errs.New(errs.KindForbidden, "ACCOUNT_UNKNOWN_STATUS",
			"account is in an unknown state"))
		return
	}

	tok, err := authtoken.Issue(h.secret, u.ID, u.Role, u.Status, u.Email, u.StartupID, authtoken.DefaultTTL)
	if err != nil {
		httpx.Error(w, errs.Wrap(errs.KindInternal, "TOKEN_ISSUE_FAILED",
			"could not issue token", err))
		return
	}
	_ = h.store.TouchLogin(r.Context(), u.ID)
	// Reflect last_login on the response object too.
	now := time.Now().UTC()
	u.LastLogin = &now
	httpx.JSON(w, http.StatusOK, loginResponse{Token: tok, User: *u})
}

/* ---------------- logout ---------------- */

// logout is intentionally a no-op server-side: JWTs are stateless. The client
// drops its stored token. We expose the endpoint so the frontend has a real
// audit point and so future refresh-token revocation has a place to land.
func (h *Handler) logout(w http.ResponseWriter, _ *http.Request) {
	w.WriteHeader(http.StatusNoContent)
}

/* ---------------- me ---------------- */

func (h *Handler) me(w http.ResponseWriter, r *http.Request) {
	id := logx.ActorID(r.Context())
	if id == "" {
		httpx.Error(w, errs.New(errs.KindUnauthorized, "unauthenticated", "no actor in context"))
		return
	}
	u, err := h.store.GetByID(r.Context(), id)
	if err != nil {
		httpx.Error(w, err)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"user": u})
}

/* ---------------- internal (service-to-service) ---------------- */

func (h *Handler) internalListUsers(w http.ResponseWriter, r *http.Request) {
	status := strings.ToUpper(r.URL.Query().Get("status"))
	role := strings.ToUpper(r.URL.Query().Get("role"))
	out, err := h.store.List(r.Context(), status, role)
	if err != nil {
		httpx.Error(w, err)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"users": out})
}

func (h *Handler) internalGetUser(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	u, err := h.store.GetByID(r.Context(), id)
	if err != nil {
		httpx.Error(w, err)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"user": u})
}

type setStatusRequest struct {
	Status string `json:"status"`
}

func (h *Handler) internalSetStatus(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var req setStatusRequest
	if err := httpx.DecodeJSON(r, &req); err != nil {
		httpx.Error(w, err)
		return
	}
	req.Status = strings.ToUpper(strings.TrimSpace(req.Status))
	switch req.Status {
	case "PENDING", "ACTIVE", "DISABLED":
	default:
		httpx.Error(w, errs.New(errs.KindBadRequest, "BAD_STATUS",
			"status must be PENDING|ACTIVE|DISABLED"))
		return
	}
	u, err := h.store.SetStatus(r.Context(), id, req.Status)
	if err != nil {
		httpx.Error(w, err)
		return
	}
	httpx.JSON(w, http.StatusOK, map[string]any{"user": u})
}

// asErr is a tiny errors.As wrapper that avoids dragging the errors package
// into the import for one usage; it's just `errors.As`.
func asErr(err error, target **errs.Error) bool {
	for e := err; e != nil; {
		if v, ok := e.(*errs.Error); ok {
			*target = v
			return true
		}
		type unwrapper interface{ Unwrap() error }
		if u, ok := e.(unwrapper); ok {
			e = u.Unwrap()
			continue
		}
		break
	}
	return false
}

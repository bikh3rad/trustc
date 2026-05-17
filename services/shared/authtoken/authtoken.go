// Package authtoken centralizes JWT issuance + parsing for the trustC platform.
//
// Every service uses these helpers so the claim shape stays consistent:
// the gateway middleware (httpx.JWTAuth), the auth service (login/me), and
// the admin service (RBAC checks) all read the same fields.
//
// Tokens are signed HS256 with the secret in TRUSTC_JWT_SECRET (CLAUDE.md §12).
package authtoken

import (
	"errors"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// Claims are the trustC-specific fields embedded alongside the standard jwt.RegisteredClaims.
// Status lets the gateway reject a token whose user has since been disabled
// without round-tripping to the auth service on every request.
type Claims struct {
	Role      string `json:"role"`
	Status    string `json:"status"`
	Email     string `json:"email,omitempty"`
	StartupID string `json:"startup_id,omitempty"`
	jwt.RegisteredClaims
}

// DefaultTTL is the access token lifetime. Refresh flows are out of MVP scope.
const DefaultTTL = 24 * time.Hour

// Secret returns the HMAC signing key from env (matches the gateway helper).
func Secret() []byte {
	if v := os.Getenv("TRUSTC_JWT_SECRET"); v != "" {
		return []byte(v)
	}
	return []byte("dev-secret-change-me")
}

// Issue signs a JWT for the given user. role + status are echoed back into the
// claims; the gateway uses both for authorization (status must be ACTIVE).
func Issue(secret []byte, userID, role, status, email, startupID string, ttl time.Duration) (string, error) {
	if ttl <= 0 {
		ttl = DefaultTTL
	}
	now := time.Now()
	tok := jwt.NewWithClaims(jwt.SigningMethodHS256, &Claims{
		Role:      role,
		Status:    status,
		Email:     email,
		StartupID: startupID,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   userID,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(ttl)),
		},
	})
	return tok.SignedString(secret)
}

// Parse validates the token's signature + expiry and returns its trustC claims.
func Parse(secret []byte, token string) (*Claims, error) {
	c := &Claims{}
	t, err := jwt.ParseWithClaims(token, c, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("authtoken: unexpected signing method")
		}
		return secret, nil
	})
	if err != nil {
		return nil, err
	}
	if !t.Valid {
		return nil, errors.New("authtoken: invalid")
	}
	return c, nil
}

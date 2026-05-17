package main

import (
	"github.com/trustc/trustc/services/shared/authtoken"
)

// jwtIssue mints a developer JWT compatible with the gateway's JWTAuth +
// the shared authtoken parser. Used by /auth/dev-token and any local tooling
// that needs a token without going through /v1/auth/login.
func jwtIssue(secret []byte, sub, role string) string {
	tok, err := authtoken.Issue(secret, sub, role, "ACTIVE", "", "", 0)
	if err != nil {
		return ""
	}
	return tok
}

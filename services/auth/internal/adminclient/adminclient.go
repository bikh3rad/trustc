// Package adminclient is a thin HTTP client the auth service uses to read
// admin.system_settings without crossing schema boundaries (CLAUDE.md §11
// forbids direct cross-service DB access).
//
// The auth service needs settings for two reasons:
//  1. /register checks registration_enabled
//  2. /register decides PENDING vs ACTIVE for each role via require_approval_for_roles
package adminclient

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"time"

	"github.com/trustc/trustc/services/shared/errs"
)

type Settings struct {
	RegistrationEnabled       bool     `json:"registration_enabled"`
	RequireApprovalForRoles   []string `json:"require_approval_for_roles"`
	TwoFactorRequired         bool     `json:"two_factor_required"`
	AuditRetentionDays        int      `json:"audit_retention_days"`
	MaxFreezeOverrideHours    int      `json:"max_freeze_override_hours"`
}

// RequiresApproval reports whether a new account in the given role should
// start as PENDING (true) or ACTIVE (false).
func (s Settings) RequiresApproval(role string) bool {
	for _, r := range s.RequireApprovalForRoles {
		if r == role {
			return true
		}
	}
	return false
}

type Client struct {
	baseURL string
	http    *http.Client
}

func New() *Client {
	url := os.Getenv("TRUSTC_ADMIN_URL")
	if url == "" {
		url = "http://localhost:7007"
	}
	return &Client{
		baseURL: url,
		http:    &http.Client{Timeout: 4 * time.Second},
	}
}

// Settings fetches the singleton settings row. Uses the service-internal
// route (no auth) — admin's external /v1/admin/settings is ADMIN-only.
func (c *Client) Settings(ctx context.Context) (*Settings, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.baseURL+"/internal/settings", nil)
	if err != nil {
		return nil, err
	}
	resp, err := c.http.Do(req)
	if err != nil {
		return nil, errs.Wrap(errs.KindInternal, "ADMIN_UNREACHABLE",
			"admin service unreachable", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 400 {
		return nil, errs.New(errs.KindInternal, "ADMIN_HTTP_"+fmt.Sprint(resp.StatusCode),
			"admin returned non-2xx for settings")
	}
	var s Settings
	if err := json.NewDecoder(resp.Body).Decode(&s); err != nil {
		return nil, errs.Wrap(errs.KindInternal, "BAD_ADMIN_RESPONSE",
			"could not decode admin settings", err)
	}
	return &s, nil
}

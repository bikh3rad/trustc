// Package authclient is the startup service's tiny HTTP client to the auth
// service. The startup service uses it to auto-link a newly-created startup
// to an existing FOUNDER auth.users row (matched by email) and to back the
// explicit "link founder to startup" endpoint.
//
// Same boundary discipline as services/admin/internal/authclient: no shared
// DB, no shared business logic — talk over HTTP only (CLAUDE.md §11).
package authclient

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"time"

	"github.com/trustc/trustc/services/shared/errs"
)

type User struct {
	ID        string `json:"id"`
	Email     string `json:"email"`
	Role      string `json:"role"`
	Status    string `json:"status"`
	Name      string `json:"name"`
	Company   string `json:"company,omitempty"`
	StartupID string `json:"startup_id,omitempty"`
}

type Client struct {
	baseURL string
	http    *http.Client
}

func New() *Client {
	u := os.Getenv("TRUSTC_AUTH_URL")
	if u == "" {
		u = "http://localhost:7008"
	}
	return &Client{baseURL: u, http: &http.Client{Timeout: 5 * time.Second}}
}

// GetByEmail returns the auth user with that email, or a NotFound error.
func (c *Client) GetByEmail(ctx context.Context, email string) (*User, error) {
	q := url.Values{}
	q.Set("email", email)
	req, _ := http.NewRequestWithContext(ctx, http.MethodGet,
		c.baseURL+"/internal/users/by-email?"+q.Encode(), nil)
	resp, err := c.http.Do(req)
	if err != nil {
		return nil, errs.Wrap(errs.KindInternal, "AUTH_UNREACHABLE",
			"auth service unreachable", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode == http.StatusNotFound {
		return nil, errs.New(errs.KindNotFound, "USER_NOT_FOUND", "no user with that email")
	}
	if resp.StatusCode >= 400 {
		return nil, errs.New(errs.KindInternal, fmt.Sprintf("AUTH_HTTP_%d", resp.StatusCode),
			"auth returned non-2xx on get-by-email")
	}
	var body struct {
		User User `json:"user"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		return nil, err
	}
	return &body.User, nil
}

// ListUnlinkedFounders returns active FOUNDER users with no startup_id —
// candidates the VC panel can pick from when assigning them to a startup.
func (c *Client) ListUnlinkedFounders(ctx context.Context) ([]User, error) {
	q := url.Values{}
	q.Set("role", "FOUNDER")
	req, _ := http.NewRequestWithContext(ctx, http.MethodGet,
		c.baseURL+"/internal/users?"+q.Encode(), nil)
	resp, err := c.http.Do(req)
	if err != nil {
		return nil, errs.Wrap(errs.KindInternal, "AUTH_UNREACHABLE",
			"auth service unreachable", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 400 {
		return nil, errs.New(errs.KindInternal, fmt.Sprintf("AUTH_HTTP_%d", resp.StatusCode),
			"auth returned non-2xx on list users")
	}
	var body struct {
		Users []User `json:"users"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		return nil, err
	}
	out := body.Users[:0]
	for _, u := range body.Users {
		if u.StartupID == "" {
			out = append(out, u)
		}
	}
	return out, nil
}

// SetStartupID links (or clears, when startupID == "") a user to a startup.
func (c *Client) SetStartupID(ctx context.Context, id, startupID string) (*User, error) {
	payload, _ := json.Marshal(map[string]string{"startup_id": startupID})
	req, _ := http.NewRequestWithContext(ctx, http.MethodPost,
		c.baseURL+"/internal/users/"+id+"/startup", bytes.NewReader(payload))
	req.Header.Set("Content-Type", "application/json")
	resp, err := c.http.Do(req)
	if err != nil {
		return nil, errs.Wrap(errs.KindInternal, "AUTH_UNREACHABLE",
			"auth service unreachable", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode == http.StatusNotFound {
		return nil, errs.New(errs.KindNotFound, "USER_NOT_FOUND", "no such user")
	}
	if resp.StatusCode >= 400 {
		return nil, errs.New(errs.KindInternal, fmt.Sprintf("AUTH_HTTP_%d", resp.StatusCode),
			"auth rejected startup link")
	}
	var body struct {
		User User `json:"user"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		return nil, err
	}
	return &body.User, nil
}

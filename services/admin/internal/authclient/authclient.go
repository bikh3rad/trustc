// Package authclient is the admin service's HTTP client to the auth service.
// Admin owns the system_settings schema; auth owns the users schema. Going
// through HTTP keeps the boundary clean (CLAUDE.md §11).
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
	ID        string     `json:"id"`
	Email     string     `json:"email"`
	Role      string     `json:"role"`
	Status    string     `json:"status"`
	Name      string     `json:"name"`
	Company   string     `json:"company,omitempty"`
	StartupID string     `json:"startup_id,omitempty"`
	JoinedAt  time.Time  `json:"joined_at"`
	LastLogin *time.Time `json:"last_login,omitempty"`
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

func (c *Client) ListUsers(ctx context.Context, status, role string) ([]User, error) {
	q := url.Values{}
	if status != "" {
		q.Set("status", status)
	}
	if role != "" {
		q.Set("role", role)
	}
	req, _ := http.NewRequestWithContext(ctx, http.MethodGet,
		c.baseURL+"/internal/users?"+q.Encode(), nil)
	resp, err := c.http.Do(req)
	if err != nil {
		return nil, errs.Wrap(errs.KindInternal, "AUTH_UNREACHABLE", "auth service unreachable", err)
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
	return body.Users, nil
}

func (c *Client) GetUser(ctx context.Context, id string) (*User, error) {
	req, _ := http.NewRequestWithContext(ctx, http.MethodGet,
		c.baseURL+"/internal/users/"+id, nil)
	resp, err := c.http.Do(req)
	if err != nil {
		return nil, errs.Wrap(errs.KindInternal, "AUTH_UNREACHABLE", "auth service unreachable", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode == http.StatusNotFound {
		return nil, errs.New(errs.KindNotFound, "USER_NOT_FOUND", "no such user")
	}
	if resp.StatusCode >= 400 {
		return nil, errs.New(errs.KindInternal, fmt.Sprintf("AUTH_HTTP_%d", resp.StatusCode),
			"auth returned non-2xx on get user")
	}
	var body struct {
		User User `json:"user"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		return nil, err
	}
	return &body.User, nil
}

func (c *Client) SetStatus(ctx context.Context, id, status string) (*User, error) {
	payload, _ := json.Marshal(map[string]string{"status": status})
	req, _ := http.NewRequestWithContext(ctx, http.MethodPost,
		c.baseURL+"/internal/users/"+id+"/status", bytes.NewReader(payload))
	req.Header.Set("Content-Type", "application/json")
	resp, err := c.http.Do(req)
	if err != nil {
		return nil, errs.Wrap(errs.KindInternal, "AUTH_UNREACHABLE", "auth service unreachable", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode == http.StatusNotFound {
		return nil, errs.New(errs.KindNotFound, "USER_NOT_FOUND", "no such user")
	}
	if resp.StatusCode >= 400 {
		return nil, errs.New(errs.KindInternal, fmt.Sprintf("AUTH_HTTP_%d", resp.StatusCode),
			"auth rejected status change")
	}
	var body struct {
		User User `json:"user"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		return nil, err
	}
	return &body.User, nil
}

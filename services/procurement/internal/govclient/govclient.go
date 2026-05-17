// Package govclient is a thin HTTP client procurement uses to ask the
// governance service whether a startup is currently frozen.
//
// This is the synchronous half of the freeze enforcement design — the async
// half lives in cmd/procurement/main.go, which subscribes to FreezeActivated
// events and walks in-flight requests into the FROZEN state.
package govclient

import (
	"context"
	"encoding/json"
	"net/http"
	"os"
	"time"

	"github.com/trustc/trustc/services/shared/errs"
	"github.com/trustc/trustc/services/shared/httpx"
	"github.com/trustc/trustc/services/shared/logx"
)

type Client struct {
	baseURL string
	http    *http.Client
}

func New() *Client {
	base := os.Getenv("TRUSTC_GOVERNANCE_URL")
	if base == "" {
		base = "http://localhost:7006"
	}
	return &Client{
		baseURL: base,
		http:    &http.Client{Timeout: 5 * time.Second},
	}
}

type FreezeStatus struct {
	Frozen bool `json:"frozen"`
	Freeze *struct {
		ID       string `json:"id"`
		Scope    string `json:"scope"`
		Duration string `json:"duration"`
		Reason   string `json:"reason"`
	} `json:"freeze"`
}

// Status returns the current freeze state for startupID. A nil error with
// Frozen=false means the startup is not frozen.
func (c *Client) Status(ctx context.Context, startupID string) (*FreezeStatus, error) {
	url := c.baseURL + "/governance/freezes/startup/" + startupID
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	if rid := logx.RequestID(ctx); rid != "" {
		req.Header.Set(httpx.HeaderRequestID, rid)
	}
	resp, err := c.http.Do(req)
	if err != nil {
		return nil, errs.Wrap(errs.KindInternal, "GOVERNANCE_UNREACHABLE",
			"governance service unreachable", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 400 {
		return nil, errs.New(errs.KindInternal, "GOVERNANCE_HTTP_ERROR",
			"governance returned "+resp.Status)
	}
	var s FreezeStatus
	if err := json.NewDecoder(resp.Body).Decode(&s); err != nil {
		return nil, err
	}
	return &s, nil
}

// Package proxy provides a thin reverse-proxy helper that forwards an
// incoming HTTP request to a backend service. It preserves trustC headers
// (X-Request-Id, Idempotency-Key, Authorization) and the request body.
package proxy

import (
	"io"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strings"
)

// Reverse returns an http.Handler that strips `prefix` from the incoming URL
// and reverse-proxies the remainder to `target`. Required headers flow through.
func Reverse(target string, prefix string) http.Handler {
	u, err := url.Parse(target)
	if err != nil {
		panic("proxy: bad target url " + target + ": " + err.Error())
	}
	rp := httputil.NewSingleHostReverseProxy(u)
	defaultDirector := rp.Director
	rp.Director = func(r *http.Request) {
		defaultDirector(r)
		if prefix != "" {
			r.URL.Path = strings.TrimPrefix(r.URL.Path, prefix)
			if r.URL.Path == "" {
				r.URL.Path = "/"
			}
		}
		// Host header should match the target backend.
		r.Host = u.Host
	}
	return rp
}

// drain is a tiny helper for tests/dev: consume an io.Reader body fully.
func drain(r io.ReadCloser) { _, _ = io.Copy(io.Discard, r); _ = r.Close() }

module github.com/trustc/trustc/services/gateway

go 1.22

require (
	github.com/go-chi/chi/v5 v5.2.5
	github.com/golang-jwt/jwt/v5 v5.2.1
	github.com/trustc/trustc/services/shared v0.0.0-00010101000000-000000000000
)

require github.com/google/uuid v1.6.0 // indirect

replace github.com/trustc/trustc/services/shared => ../shared

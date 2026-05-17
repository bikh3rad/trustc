package main

import (
	"time"

	"github.com/golang-jwt/jwt/v5"
)

func jwtIssue(secret []byte, sub, role string) string {
	tok := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub":  sub,
		"role": role,
		"iat":  time.Now().Unix(),
		"exp":  time.Now().Add(24 * time.Hour).Unix(),
	})
	s, err := tok.SignedString(secret)
	if err != nil {
		return ""
	}
	return s
}

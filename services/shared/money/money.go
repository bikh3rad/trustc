// Package money represents currency amounts as integer minor units (cents)
// to avoid floating-point drift in financial calculations.
package money

import (
	"errors"
	"fmt"
	"strconv"
	"strings"
)

type Cents int64

func FromMajorUnits(amount float64) Cents { return Cents(amount * 100) }

func (c Cents) MajorUnits() float64 { return float64(c) / 100 }

func (c Cents) String() string {
	sign := ""
	v := int64(c)
	if v < 0 {
		sign = "-"
		v = -v
	}
	return fmt.Sprintf("%s%d.%02d", sign, v/100, v%100)
}

func Parse(s string) (Cents, error) {
	s = strings.TrimSpace(s)
	if s == "" {
		return 0, errors.New("empty money string")
	}
	neg := false
	if s[0] == '-' {
		neg = true
		s = s[1:]
	}
	parts := strings.SplitN(s, ".", 2)
	whole, err := strconv.ParseInt(parts[0], 10, 64)
	if err != nil {
		return 0, fmt.Errorf("parse money: %w", err)
	}
	frac := int64(0)
	if len(parts) == 2 {
		f := parts[1]
		if len(f) > 2 {
			return 0, errors.New("money has more than 2 decimal places")
		}
		for len(f) < 2 {
			f += "0"
		}
		frac, err = strconv.ParseInt(f, 10, 64)
		if err != nil {
			return 0, fmt.Errorf("parse money fraction: %w", err)
		}
	}
	v := whole*100 + frac
	if neg {
		v = -v
	}
	return Cents(v), nil
}

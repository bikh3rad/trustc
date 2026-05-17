#!/bin/bash
# trustC Phase 7 verification smoke test — runs each manual scenario
# against the live gateway. Mirrors the checklist in HANDOFF-v3 §Phase 7.
set -uo pipefail

GW=http://localhost:8080
pass=0; fail=0
PASS()  { echo "  ✅ PASS"; pass=$((pass+1)); }
FAIL()  { echo "  ❌ FAIL: $*"; fail=$((fail+1)); }

login() {
  curl -s -X POST $GW/v1/auth/login \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"$1\",\"password\":\"$2\"}"
}

token_from() {
  python3 -c 'import json,sys;d=json.load(sys.stdin);print(d.get("token",""))' <<< "$1"
}

role_from() {
  python3 -c 'import json,sys;d=json.load(sys.stdin);print(d.get("user",{}).get("role",""))' <<< "$1"
}

idem() { echo "phase7-$RANDOM-$RANDOM"; }

# -----------------------------------------------------------------
echo "=== Scenario 1: Login founder@alpha.io/demo1234 returns FOUNDER token ==="
R=$(login founder@alpha.io demo1234)
F_TOKEN=$(token_from "$R")
if [ -n "$F_TOKEN" ] && [ "$(role_from "$R")" = "FOUNDER" ]; then PASS
else FAIL "no founder token: $R"; fi

echo "=== Scenario 2: Login admin@trustc.io returns ADMIN token ==="
R=$(login admin@trustc.io demo1234)
A_TOKEN=$(token_from "$R")
if [ -n "$A_TOKEN" ] && [ "$(role_from "$R")" = "ADMIN" ]; then PASS
else FAIL "no admin token: $R"; fi

# (frontend would route ADMIN to /admin and FOUNDER to /dashboard — see App.tsx
# HomeRedirect(); we can't drive react-router from curl but the routing is
# wired off these JWT roles which we've just confirmed.)

echo "=== Scenario 3: PENDING user login returns ACCOUNT_PENDING error ==="
# Re-pend founder@gamma.io (always pending in seed; founder@beta was approved
# in Phase 1 smoke, but gamma is still PENDING).
R=$(login founder@gamma.io demo1234)
CODE=$(python3 -c 'import json,sys;d=json.load(sys.stdin);print(d.get("error",""))' <<< "$R")
if [ "$CODE" = "ACCOUNT_PENDING" ]; then PASS
else FAIL "expected ACCOUNT_PENDING, got: $R"; fi

echo "=== Scenario 4: Register new user → status PENDING ==="
TS=$(date +%s)
NEW_EMAIL="newuser-phase7-${TS}@test.io"
R=$(curl -s -X POST $GW/v1/auth/register \
  -H 'Content-Type: application/json' \
  -d "{\"name\":\"کاربر فاز هفت\",\"email\":\"$NEW_EMAIL\",\"password\":\"demo1234\",\"role\":\"FOUNDER\",\"company\":\"تست\"}")
STATUS=$(python3 -c 'import json,sys;d=json.load(sys.stdin);print(d.get("user",{}).get("status",""))' <<< "$R")
NEW_ID=$(python3 -c 'import json,sys;d=json.load(sys.stdin);print(d.get("user",{}).get("id",""))' <<< "$R")
if [ "$STATUS" = "PENDING" ] && [ -n "$NEW_ID" ]; then PASS
else FAIL "expected PENDING user, got: $R"; fi

echo "=== Scenario 4b: admin sees new user in PENDING list ==="
R=$(curl -s -H "Authorization: Bearer $A_TOKEN" "$GW/v1/admin/users?status=PENDING")
if echo "$R" | python3 -c "import json,sys;u=json.load(sys.stdin)['users'];sys.exit(0 if any(x['id']=='$NEW_ID' for x in u) else 1)"; then PASS
else FAIL "new user not in PENDING list: $R"; fi

echo "=== Scenario 5: Admin approves new user → they can log in ==="
curl -s -X POST -H "Authorization: Bearer $A_TOKEN" -H "Idempotency-Key: $(idem)" \
  "$GW/v1/admin/users/$NEW_ID/approve" > /dev/null
# Pre-approval pending check already passed; now verify login succeeds.
R=$(login "$NEW_EMAIL" demo1234)
NEW_TOKEN=$(token_from "$R")
NEW_STATUS=$(python3 -c 'import json,sys;d=json.load(sys.stdin);print(d.get("user",{}).get("status",""))' <<< "$R")
if [ -n "$NEW_TOKEN" ] && [ "$NEW_STATUS" = "ACTIVE" ]; then PASS
else FAIL "approved user cannot log in: $R"; fi

echo "=== Scenario 6: Admin disables registration → /register returns 403 ==="
curl -s -X PATCH -H "Authorization: Bearer $A_TOKEN" -H 'Content-Type: application/json' \
  -H "Idempotency-Key: $(idem)" "$GW/v1/admin/settings" \
  -d '{"registration_enabled":false}' > /dev/null
# /v1/auth/registration-status should report enabled=false
ENABLED=$(curl -s "$GW/v1/auth/registration-status" | python3 -c 'import json,sys;print(json.load(sys.stdin).get("enabled"))')
# /v1/auth/register should now return 403 with REGISTRATION_DISABLED
HTTP=$(curl -s -o /tmp/reg_resp.json -w "%{http_code}" -X POST "$GW/v1/auth/register" \
  -H 'Content-Type: application/json' \
  -d '{"name":"rejected","email":"rejected-phase7@test.io","password":"demo1234","role":"FOUNDER","company":"x"}')
REG_CODE=$(python3 -c 'import json;print(json.load(open("/tmp/reg_resp.json")).get("error",""))')
if [ "$ENABLED" = "False" ] && [ "$HTTP" = "403" ] && [ "$REG_CODE" = "REGISTRATION_DISABLED" ]; then PASS
else FAIL "registration not properly closed (enabled=$ENABLED http=$HTTP code=$REG_CODE)"; fi
# Re-enable so subsequent runs aren't polluted
curl -s -X PATCH -H "Authorization: Bearer $A_TOKEN" -H 'Content-Type: application/json' \
  -H "Idempotency-Key: $(idem)" "$GW/v1/admin/settings" \
  -d '{"registration_enabled":true}' > /dev/null

echo "=== Scenario 7: FOUNDER /v1/admin/* → 403 (cannot impersonate admin via API) ==="
HTTP=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $F_TOKEN" "$GW/v1/admin/users")
if [ "$HTTP" = "403" ]; then PASS
else FAIL "founder reached admin: HTTP $HTTP"; fi

echo "=== Scenario 7b: FOUNDER procurement scope check ==="
# FOUNDER's JWT carries startup_id=alpha; query cross-tenant startup → still scoped.
R=$(curl -s -H "Authorization: Bearer $F_TOKEN" "$GW/v1/procurements?startup_id=11111111-0000-0000-0000-000000000002")
STARTUP_IDS=$(python3 -c 'import json,sys;d=json.load(sys.stdin);ids=set(p["startup_id"] for p in d["procurements"]);print(",".join(sorted(ids)))' <<< "$R")
# Only alpha (...0001), never beta (...0002)
if [ "$STARTUP_IDS" = "11111111-0000-0000-0000-000000000001" ] || [ -z "$STARTUP_IDS" ]; then PASS
else FAIL "cross-tenant leak: $STARTUP_IDS"; fi

echo "=== Scenario 8: AUDITOR POST /v1/procurements → 403 ==="
R=$(login auditor@trustc.io demo1234)
AUD_TOKEN=$(token_from "$R")
HTTP=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Authorization: Bearer $AUD_TOKEN" \
  -H 'Content-Type: application/json' -H "Idempotency-Key: $(idem)" \
  "$GW/v1/procurements" -d '{}')
if [ "$HTTP" = "403" ]; then PASS
else FAIL "auditor reached POST: HTTP $HTTP"; fi

echo "=== Scenario 9: VC Kill Switch freezes startup → freeze visible to founder ==="
# Login as VC
R=$(login vc@trustc.io demo1234)
VC_TOKEN=$(token_from "$R")
# Activate FULL freeze on AlphaTech (the founder's startup)
ALPHA="11111111-0000-0000-0000-000000000001"
FREEZE_RESP=$(curl -s -X POST -H "Authorization: Bearer $VC_TOKEN" \
  -H 'Content-Type: application/json' -H "Idempotency-Key: $(idem)" \
  "$GW/v1/governance/freezes" \
  -d "{\"startup_id\":\"$ALPHA\",\"scope\":\"FULL\",\"duration\":\"TEMPORARY\",\"reason\":\"phase 7 smoke test\"}")
FREEZE_ID=$(python3 -c 'import json,sys;d=json.load(sys.stdin);print(d.get("id",""))' <<< "$FREEZE_RESP")
sleep 1
# As founder, check the freeze is visible (frontend useFrozen polls this same endpoint)
FROZEN=$(curl -s -H "Authorization: Bearer $F_TOKEN" "$GW/v1/governance/freezes/startup/$ALPHA" | python3 -c 'import json,sys;d=json.load(sys.stdin);print(d.get("frozen"))')
if [ "$FROZEN" = "True" ]; then PASS
else FAIL "freeze not visible to founder: FROZEN=$FROZEN, freeze_resp=$FREEZE_RESP"; fi
# Lift the freeze
if [ -n "$FREEZE_ID" ]; then
  curl -s -X POST -H "Authorization: Bearer $VC_TOKEN" \
    -H 'Content-Type: application/json' -H "Idempotency-Key: $(idem)" \
    "$GW/v1/governance/freezes/$FREEZE_ID/lift" -d '{"reason":"phase 7 cleanup"}' > /dev/null
fi

echo ""
echo "=== summary: pass=$pass  fail=$fail ==="
[ "$fail" -eq 0 ]

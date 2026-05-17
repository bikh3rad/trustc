# trustC v2 — Auth, Admin Panel, RBAC, Responsive

This is **the v2 prompt** to pass to Claude Code. It updates the existing `bikh3rad/trustc` repo with:

1. Login + Register screens (pre-app gate)
2. Admin panel (4th role) with user approval + system settings
3. Real RBAC — three non-admin roles cannot see each other's modules
4. Responsive UI for mobile / tablet
5. Backend changes required to support the above

The new design files are in `hi-fi/src/` (alongside `hi-fi/HANDOFF.md` from v1). The key new files:
- `hi-fi/src/auth-screens.jsx` — Login + Register
- `hi-fi/src/admin-screens.jsx` — Admin Overview + Users + Settings
- `hi-fi/src/Shell.jsx` (updated) — hamburger menu, user menu, admin-only persona switcher
- `hi-fi/src/App.jsx` (updated) — auth state + responsive routing
- `hi-fi/src/styles.css` (updated) — responsive @media queries, auth-shell, mobile drawer
- `hi-fi/src/data.js` (updated) — `users[]` and `systemSettings` mock data

---

## THE PROMPT (paste into Claude Code)

```
We are doing v2 of trustC, adding auth + admin panel + RBAC + responsive UI. The updated hi-fi design is in ./hi-fi/. Five new design files exist there.

Read these first, in order:
1. hi-fi/src/data.js — see the new `users` array and `systemSettings` object
2. hi-fi/src/auth-screens.jsx — Login + Register screen components
3. hi-fi/src/admin-screens.jsx — Admin panel (Overview, Users, Settings)
4. hi-fi/src/Shell.jsx — updated sidebar + topbar (now responsive, with user menu)
5. hi-fi/src/App.jsx — root with auth state machine
6. hi-fi/src/styles.css — new auth-shell, mobile drawer, setting-row, responsive @media rules

After reading, execute these phases.

==================================================================
PHASE 1 — BACKEND CHANGES (services/)
==================================================================

You'll need to implement an Auth service and an Admin service. Here is the contract.

1.1 New service: services/auth (Go, gRPC + REST via gateway)
   Endpoints (exposed via the gateway):
     POST /v1/auth/register   { name, email, password, role, company } → 201 { user (PENDING) }
     POST /v1/auth/login      { email, password }                       → 200 { token, user }
     POST /v1/auth/logout                                                → 204
     GET  /v1/auth/me                                                    → 200 { user }
     POST /v1/auth/refresh                                               → 200 { token }

   Rules:
   - On register: status = PENDING for non-admin roles (configurable in admin settings).
   - On login: refuse if status != ACTIVE; return reason ("PENDING" or "DISABLED").
   - When system settings.registration_enabled = false, /register returns 403.
   - JWT must include: user_id, role, status. Gateway verifies role on every request.
   - Passwords bcrypt-hashed (cost 12). Use services/shared/auth for token signing.

1.2 New service: services/admin (Go, gRPC + REST via gateway)
   Endpoints (ADMIN role required):
     GET    /v1/admin/users                          → list all users
     GET    /v1/admin/users?status=PENDING           → filter
     POST   /v1/admin/users/:id/approve              → status PENDING→ACTIVE, emit UserApproved event
     POST   /v1/admin/users/:id/disable              → status →DISABLED, emit UserDisabled event
     POST   /v1/admin/users/:id/enable               → status →ACTIVE, emit UserEnabled event
     GET    /v1/admin/settings                       → current system settings
     PATCH  /v1/admin/settings                       → update (registrationEnabled, requireApprovalForRoles, twoFactorRequired, auditRetentionDays, maxFreezeOverrideHours)

   Every admin action must emit an audit event to services/audit with actorRole=ADMIN.

1.3 Database migrations (db/migrations/)
   Add to auth schema:
     - users (id, email, password_hash, role, status, name, company, joined_at, last_login, startup_id?)
     - status enum: PENDING | ACTIVE | DISABLED
     - role enum:   ADMIN | FOUNDER | VC | AUDITOR
   Add to admin schema:
     - system_settings (singleton row: id=1, registration_enabled, require_approval_for_roles JSONB, two_factor_required, audit_retention_days, max_freeze_override_hours)

1.4 Gateway changes (services/gateway)
   - Add /v1/auth/* and /v1/admin/* routes
   - Add JWT middleware that:
     a) Allows /v1/auth/login, /v1/auth/register without auth
     b) Verifies JWT on all other routes
     c) Enforces role-based gates on /v1/admin/* (ADMIN only)
   - Role-based filtering on existing endpoints — a FOUNDER must only see their own startup's data:
     - GET /v1/procurements should filter by user.startup_id when role=FOUNDER
     - VC can see all startups
     - AUDITOR has read-only on all endpoints (no POST/PATCH)
     - ADMIN sees everything everywhere

1.5 Seed update (db/seed/)
   Add 4 demo users matching hi-fi/src/data.js seeding (admin@trustc.io, founder@alpha.io, vc@trustc.io, auditor@trustc.io), all with status ACTIVE and password "demo1234" (bcrypt-hashed).
   Add 2 more PENDING founders to demonstrate the approval flow.

1.6 Frontend api.ts updates
   Add typed clients for: auth (login, register, me, logout), admin (listUsers, approveUser, disableUser, getSettings, patchSettings).
   In each module's data fetch, send the JWT in Authorization header.

==================================================================
PHASE 2 — FRONTEND: AUTH GATE
==================================================================

2.1 Create context/AuthContext.tsx:
   - state: { user, status: 'loading'|'unauthenticated'|'authenticated' }
   - On mount: fetch /v1/auth/me with stored token; if 401, clear token
   - actions: login(email, password), register(form), logout()
   - Persist token in localStorage as 'trustc_token'

2.2 Create routes/AuthGate.tsx:
   - Wraps the entire app
   - If status === 'loading': render <FullScreenSpinner />
   - If status === 'unauthenticated': render <Login /> or <Register /> (based on local state)
   - Else: render children (the main app)

2.3 Create modules/auth/Login.tsx and modules/auth/Register.tsx from hi-fi/src/auth-screens.jsx.
   - Convert to TS, type the form state
   - On submit, call AuthContext.login() / register()
   - Use the AuthLayout component (also convert from hi-fi)
   - Show field errors from server (form.email, form.password)
   - Register checks /v1/admin/settings to know if registration is enabled (use a public sub-endpoint /v1/auth/registration-status)
   - After successful registration, show the "in PENDING, awaiting admin approval" screen

2.4 Move main.tsx / App.tsx to use AuthGate:
   <AuthProvider><AuthGate><AppShell><Routes/></AppShell></AuthGate></AuthProvider>

==================================================================
PHASE 3 — FRONTEND: ADMIN PANEL
==================================================================

3.1 Create modules/admin/Overview.tsx from hi-fi/src/admin-screens.jsx → AdminOverview
3.2 Create modules/admin/Users.tsx       from AdminUsers
3.3 Create modules/admin/Settings.tsx    from AdminSettings + SettingRow + Toggle helpers
3.4 Add routes:
     /admin           → Overview
     /admin/users     → Users
     /admin/settings  → Settings
   Guard each with: if user.role !== 'ADMIN' → redirect to '/' (their own role's default)

==================================================================
PHASE 4 — FRONTEND: REAL RBAC ON THE SHELL
==================================================================

Currently the Topbar has a free persona switcher (a leftover from the demo). In production:

4.1 Sidebar nav items are derived from user.role:
   - FOUNDER → dashboard, procurements, invoices, escrow, ledger
   - VC      → portfolio, recycling, killswitch
   - AUDITOR → audit, reports
   - ADMIN   → admin/overview, admin/users, admin/settings

4.2 Persona switcher in Topbar ONLY shown when user.role === 'ADMIN' (impersonation/debugging). When admin clicks a non-admin persona button, they navigate to that section but the JWT role stays ADMIN — backend trusts the JWT, frontend just changes the rendered shell.

4.3 Add route guards: trying to navigate to /portfolio as a FOUNDER must redirect to /dashboard. Use a single <RoleGuard allow={['VC','ADMIN']}> wrapper component.

4.4 User menu in Topbar (top right):
   - Shows user.name + role badge
   - Click → dropdown with "خروج" (logout) button
   - See hi-fi/src/Shell.jsx → UserMenu component for the exact pattern

==================================================================
PHASE 5 — FRONTEND: RESPONSIVE
==================================================================

5.1 Copy the responsive @media blocks from hi-fi/src/styles.css to your frontend/src/styles/globals.css:
   - .app-shell collapses to 1-column at max-width: 1000px
   - .app-sidebar becomes a slide-in drawer with .sidebar-scrim
   - .hamburger button appears in topbar
   - .stat-grid: 4 cols → 2 cols (1100px) → 1 col (640px)
   - .two-col-shrink: 2-col → 1-col on tablet
   - .fsm grid wraps to 4-col / 2-col
   - .responsive-table-card → horizontal scroll, min-width 720px
   - .auth-shell collapses from two-pane to single column on mobile

5.2 In Shell.tsx, add sidebar state:
   - useState<boolean>(false) for sidebarOpen
   - Hamburger button toggles it (visible only on mobile via CSS)
   - Clicking nav-item, clicking scrim, or pressing Esc closes it
   - On route change, auto-close

5.3 Form layouts:
   - Every "two-column form" (grid with grid-template-columns: 1fr 1fr) needs a class .form-row-2 that collapses to 1 column on mobile (see globals.css)
   - Inputs are already full-width

5.4 Tables: wrap every <table> in <div class="responsive-table-card"> so they scroll horizontally on narrow screens without breaking layout.

==================================================================
PHASE 6 — INTEGRATION CHECKS
==================================================================

After each phase, run:
   make e2e             # backend tests still pass
   make frontend-dev    # visually inspect at 1440px, 768px, and 375px widths

Specific scenarios to test manually:
- [ ] Login as founder@alpha.io / demo1234 → lands on /dashboard
- [ ] Login as admin@trustc.io → lands on /admin
- [ ] Login as a PENDING user → shown "awaiting approval" error
- [ ] Register a new user → goes into PENDING list
- [ ] As admin, approve the new user → they can now log in
- [ ] As admin, disable registration → /register page shows "closed"
- [ ] As founder, try to navigate to /portfolio → redirected to /dashboard
- [ ] Resize browser to 375px → sidebar becomes drawer, hamburger works, tables scroll horizontally
- [ ] Kill Switch from VC still freezes the founder's UI

==================================================================
CONSTRAINTS (re-stating)
==================================================================

- Persian RTL only. No Latin labels except canonical state names (ESCROW_LOCK etc.) and ADMIN/VC/FOUNDER/AUDITOR role badges (mono uppercase).
- Use Vazirmatn from tokens.css.
- No new UI library. Match the existing component patterns.
- Append-only ledger rule still holds.
- Every admin action emits an audit event.
- Frontend never blindly trusts user.role — always re-verify via gateway, which re-verifies the JWT.

Start with PHASE 1 (backend). Give me a summary after each phase before moving to the next.
```

---

## Notes for you (not the prompt)

- **Cherry-pick which phases:** if you want frontend-only first to see it working, tell Claude Code to do PHASE 2-5 first with mock data, then PHASE 1 backend. The mock data already lives in `hi-fi/src/data.js`.
- **Two-factor auth, OAuth, password reset:** intentionally omitted from v2 scope — add to a v3 prompt later.
- **Multi-tenant founders (one founder owning multiple startups):** still not addressed; if you need it, ask Claude Code to add a `tenant_id` and a context-switcher in the topbar.
- **i18n:** if you need English UI later, ask Claude Code to extract all Persian strings to `frontend/src/i18n/fa.ts` and add an English file.

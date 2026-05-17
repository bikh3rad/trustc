# trustC — Combined Apply Prompt (v2 + v3 in one)

Single prompt covering everything new since the v1 merge:
- Auth (Login + Register)
- Admin panel (4th role) with user approval + system settings
- Real RBAC (3 non-admin roles cannot see each other's modules)
- Responsive UI
- **Mobile-native UI** (bottom tabs, card lists, vertical FSM)
- Backend services to support all of the above

## THE PROMPT (paste into Claude Code)

```
We are doing a major upgrade of trustC: auth screens, admin panel, real RBAC, responsive UI, and a native mobile experience. The updated hi-fi design lives in ./hi-fi/. Backend services need to be added/extended to support the new frontend.

PREREQ — read these design files first, in order:

Reference & overview:
  hi-fi/HANDOFF.md       (v1 file/folder mapping — still valid)
  hi-fi/HANDOFF-v2.md    (auth + admin + RBAC + responsive)
  hi-fi/HANDOFF-v3.md    (mobile-native UI)

Source code:
  hi-fi/src/data.js              — new `users[]` and `systemSettings`
  hi-fi/src/auth-screens.jsx     — Login + Register
  hi-fi/src/admin-screens.jsx    — Admin Overview, Users, Settings
  hi-fi/src/Shell.jsx            — desktop sidebar/topbar with hamburger + user menu
  hi-fi/src/mobile.jsx           — MobileShell, MobileList, MobileCard, MobileFSMVertical
  hi-fi/src/components.jsx       — `useIsMobile()` hook at the bottom
  hi-fi/src/App.jsx              — auth state machine + mobile branch
  hi-fi/src/styles.css           — responsive @media, auth-shell, mobile shell, vertical FSM

Then execute the 7 phases below. After EACH phase, summarize what changed and wait for me to say "continue".

═══════════════════════════════════════════════════════════════
PHASE 1 — BACKEND (services/)
═══════════════════════════════════════════════════════════════

1.1 New service: services/auth (Go, gRPC + REST via gateway)
    POST /v1/auth/register   { name,email,password,role,company } → 201 (user PENDING)
    POST /v1/auth/login      { email,password }                    → 200 { token, user }
    POST /v1/auth/logout                                            → 204
    GET  /v1/auth/me                                                → 200 { user }
    GET  /v1/auth/registration-status                               → 200 { enabled }
    Rules:
      • status enum: PENDING | ACTIVE | DISABLED
      • role enum:   ADMIN | FOUNDER | VC | AUDITOR
      • New registrations land in PENDING for roles in system_settings.require_approval_for_roles
      • Login refuses non-ACTIVE users with a clear reason
      • When system_settings.registration_enabled = false, /register returns 403
      • Passwords bcrypt cost 12. JWT signed by services/shared/auth, embeds {user_id, role, status, exp}

1.2 New service: services/admin
    GET    /v1/admin/users[?status=PENDING|ACTIVE|DISABLED&role=…]
    POST   /v1/admin/users/:id/approve
    POST   /v1/admin/users/:id/disable
    POST   /v1/admin/users/:id/enable
    GET    /v1/admin/settings
    PATCH  /v1/admin/settings
    Every action emits an audit event with actorRole=ADMIN.

1.3 DB migrations (db/migrations/)
    • auth.users (id, email UNIQUE, password_hash, role, status, name, company, joined_at, last_login, startup_id NULL)
    • admin.system_settings (singleton id=1: registration_enabled BOOL, require_approval_for_roles JSONB, two_factor_required BOOL, audit_retention_days INT, max_freeze_override_hours INT)

1.4 Gateway (services/gateway)
    • Add /v1/auth/* (login + register + registration-status = public; rest require JWT)
    • Add /v1/admin/* (ADMIN only)
    • JWT middleware on every other route. On 401 return JSON {error:"unauthenticated"}
    • Role-based filtering on existing endpoints:
        - FOUNDER: GET /v1/procurements filters by user.startup_id
        - VC:      sees all startups
        - AUDITOR: read-only across all endpoints (refuse POST/PATCH/DELETE)
        - ADMIN:   bypasses all filters

1.5 Seed (db/seed/)
    4 demo users from hi-fi/src/data.js: admin@trustc.io, founder@alpha.io, vc@trustc.io, auditor@trustc.io — all ACTIVE, password "demo1234". Plus 2 PENDING founders (beta, gamma) to demonstrate the approval flow.

═══════════════════════════════════════════════════════════════
PHASE 2 — FRONTEND AUTH GATE
═══════════════════════════════════════════════════════════════

2.1 context/AuthContext.tsx — { user, status:'loading'|'unauthenticated'|'authenticated', login(), register(), logout() }. Persist JWT in localStorage["trustc_token"]. On mount call /v1/auth/me; on 401 clear token.

2.2 routes/AuthGate.tsx — wraps app. loading→spinner, unauthenticated→<Login> or <Register>, else→children.

2.3 modules/auth/Login.tsx + Register.tsx — port from hi-fi/src/auth-screens.jsx. Convert JSX→TSX. Wire onSubmit to AuthContext. Use AuthLayout. Show field-level server errors. Register calls /v1/auth/registration-status and shows the "closed" variant when false. Post-register shows the PENDING confirmation panel.

2.4 main.tsx: <AuthProvider><AuthGate><AppShell/></AuthGate></AuthProvider>

═══════════════════════════════════════════════════════════════
PHASE 3 — FRONTEND ADMIN PANEL
═══════════════════════════════════════════════════════════════

Port from hi-fi/src/admin-screens.jsx:
  modules/admin/Overview.tsx  (AdminOverview)
  modules/admin/Users.tsx     (AdminUsers + confirm modals)
  modules/admin/Settings.tsx  (AdminSettings + SettingRow + Toggle helpers)

Routes:
  /admin           → Overview
  /admin/users     → Users
  /admin/settings  → Settings

Guard each: if user.role !== 'ADMIN' → redirect to that user's role default.

═══════════════════════════════════════════════════════════════
PHASE 4 — REAL RBAC ON THE SHELL
═══════════════════════════════════════════════════════════════

4.1 Sidebar nav items derived from user.role (see navFor() in hi-fi/src/Shell.jsx).

4.2 Topbar persona switcher ONLY rendered when user.role === 'ADMIN'. Admin clicking a non-admin persona button navigates to that section but JWT role stays ADMIN. Non-admin users never see this switcher.

4.3 <RoleGuard allow={['VC','ADMIN']}>…</RoleGuard> on every route — trying to access /portfolio as FOUNDER redirects to /dashboard.

4.4 UserMenu (top right): user name + role badge → dropdown with logout. Port from hi-fi/src/Shell.jsx → UserMenu component.

═══════════════════════════════════════════════════════════════
PHASE 5 — RESPONSIVE
═══════════════════════════════════════════════════════════════

Copy these CSS blocks from hi-fi/src/styles.css verbatim into frontend/src/styles/globals.css:
  • "RESPONSIVE — Mobile / tablet" section (max-width: 1100px / 1000px / 760px / 640px)
  • "AUTH SHELL" section
  • "SETTING ROW" section
  • .hamburger styles

In Shell.tsx:
  • useState sidebarOpen
  • <button className="hamburger" onClick={...} />
  • <Sidebar open={sidebarOpen} onClose={...} /> + <div className="sidebar-scrim" /> backdrop
  • Auto-close on route change

Wrap every <table> in <div className="card responsive-table-card"> — handles narrow screens via min-width:720px + overflow-x:auto.

Every two-column form-grid needs className="form-row-2" so it collapses on mobile.

═══════════════════════════════════════════════════════════════
PHASE 6 — MOBILE-NATIVE UI
═══════════════════════════════════════════════════════════════

When viewport ≤760px, the app uses a different shell — bottom tabs + card lists + vertical FSM. Not just responsive shrinking — a real mobile layout.

6.1 lib/useIsMobile.ts — port from hi-fi/src/components.jsx (the useIsMobile hook). Returns boolean based on window.innerWidth ≤ 760, with resize listener.

6.2 Port hi-fi/src/mobile.jsx into layout/mobile/:
    MobileShell.tsx        (compact top bar + bottom tabs + account drawer)
    MobileTopbar.tsx
    BottomTabs.tsx
    AccountDrawer.tsx
    MobileList.tsx         (generic card list)
    MobileCard.tsx
    MobileFSMVertical.tsx  (vertical timeline FSM)
    mobileTabsFor.ts

6.3 Copy mobile CSS sections from hi-fi/src/styles.css:
    "MOBILE SHELL — bottom tab bar + compact top bar"
    "MOBILE LIST + CARD"
    "MOBILE FSM"
    .nav-item--paper variant
    .show-on-mobile / .hide-on-mobile utilities

6.4 In AppShell, branch on useIsMobile (BEFORE any conditional return — Rules of Hooks):

```tsx
function AppShell({ children }) {
  const isMobile = useIsMobile();
  if (isMobile) return <MobileShell>{children}</MobileShell>;
  return <DesktopShell>{children}</DesktopShell>;
}
```

6.5 Screen-level branches — these screens render data differently on mobile:
    modules/founder/Procurements.tsx    — table → MobileList<MobileCard>
    modules/founder/ProcurementDetail.tsx — horizontal FSM → MobileFSMVertical
    modules/founder/Ledger.tsx           — grid rows → card per transaction
    modules/founder/Invoices.tsx         — table → MobileList
    modules/admin/Users.tsx              — table → MobileList

Pattern: `const isMobile = useIsMobile(); return <>{header}{isMobile ? <MobileList/> : <DesktopTable/>}</>;`

Do NOT branch entire screens (`{isMobile && <FullMobileScreen/>}`). Only branch the data presentation. Headers/filters/forms are shared.

6.6 Mobile ergonomics:
    • Tap targets ≥44×44px (.btn padding becomes 14px on mobile)
    • Inputs ≥16px font (prevents iOS zoom-on-focus)
    • Safe-area-inset for iPhone notch + home indicator (already in hi-fi CSS)
    • Pull-to-refresh and swipe: NOT in scope for this phase

═══════════════════════════════════════════════════════════════
PHASE 7 — VERIFICATION
═══════════════════════════════════════════════════════════════

After phase 1: `make e2e` — backend tests pass.
After phase 6: `make frontend-dev`, test at three widths in DevTools device emulation:
  • 375 × 812 (iPhone 13 Pro)
  • 414 × 896 (iPhone 11 Pro Max)
  • 768 × 1024 (iPad portrait — desktop shell)
  • 1440 × 900 (desktop)

Manual scenarios (ALL must pass):
  [ ] Login founder@alpha.io/demo1234 → /dashboard
  [ ] Login admin@trustc.io → /admin
  [ ] PENDING user login → "awaiting approval" error
  [ ] Register new user → lands in admin PENDING list
  [ ] Admin approves user → user can log in
  [ ] Admin disables registration → /register page shows "closed"
  [ ] Founder navigates to /portfolio → redirected to /dashboard
  [ ] AUDITOR tries POST /v1/procurements → 403
  [ ] At 375px: MobileShell renders, bottom tabs work
  [ ] Tap avatar → drawer slides in with role nav + logout
  [ ] Procurement detail at 375px: vertical FSM with pulse animation
  [ ] Ledger at 375px: card per transaction with debit/credit lines
  [ ] Resize 375px ↔ 1440px → layout swaps live without state loss
  [ ] VC Kill Switch freezes the founder UI on both desktop AND mobile

═══════════════════════════════════════════════════════════════
CONSTRAINTS
═══════════════════════════════════════════════════════════════

• Persian RTL only. No Latin labels except canonical state names (ESCROW_LOCK etc.) and ADMIN/VC/FOUNDER/AUDITOR role badges (mono uppercase).
• Vazirmatn font, already imported in tokens.css.
• No new UI library (no antd, no chakra, no mui). Match existing component patterns.
• Append-only ledger invariant still holds.
• Every admin action emits an audit event.
• Frontend never trusts user.role locally — gateway re-verifies JWT on every request.
• Mobile detection is VIEWPORT-based via useIsMobile(), not UA sniffing.
• Bottom tabs are a real navigation primitive (route changes), not a state toggle.

Start with PHASE 1 and report back when complete. Wait for "continue" before moving to PHASE 2.
```

---

## How to use

```bash
# 1. Replace your hi-fi folder with the latest design
rm -rf hi-fi && unzip ~/Downloads/trustc-v3.zip

# 2. In Claude Code (in repo root), paste the prompt above
```

After each phase Claude Code completes, review what changed before saying "continue".

If you want to test the frontend BEFORE building the backend, tell Claude Code:
> Start with PHASES 2-6 using mock data from hi-fi/src/data.js. Implement PHASE 1 backend afterwards.

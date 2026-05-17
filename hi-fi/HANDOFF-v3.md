# trustC v3 — Mobile-Native UI

Adds a **dedicated mobile experience** on top of v2 (auth + admin + responsive). When the viewport is ≤760px, the app switches from a sidebar+table layout to a bottom-tab + card-list layout — a true mobile UI, not just shrunk desktop.

The new design files in `hi-fi/`:
- `hi-fi/src/components.jsx` — adds `useIsMobile()` hook
- `hi-fi/src/mobile.jsx` (NEW) — `<MobileShell>`, `<MobileList>`, `<MobileCard>`, `<MobileFSMVertical>`, `mobileTabsFor()`
- `hi-fi/src/styles.css` — adds mobile shell + bottom tabs + mobile card list + vertical FSM styles
- Updated screens: ProcurementsList, ProcurementDetail, LedgerScreen — branch on `useIsMobile()`

---

## THE PROMPT (paste into Claude Code)

```
We're doing v3 of trustC: a native mobile experience. The mobile breakpoint replaces the desktop layout, it doesn't just collapse it.

PREREQ — read these design files in order, in addition to v2 files you've already seen:
1. hi-fi/src/components.jsx  — see the new `useIsMobile()` hook at the bottom
2. hi-fi/src/mobile.jsx      — the mobile shell + card primitives (NEW FILE)
3. hi-fi/src/styles.css      — search for "MOBILE SHELL", "MOBILE LIST + CARD", "MOBILE FSM"
4. hi-fi/src/founder-screens.jsx       — see how ProcurementsList + ProcurementDetail branch on isMobile
5. hi-fi/src/founder-screens-2.jsx     — see how LedgerScreen branches
6. hi-fi/src/App.jsx         — see how App branches to MobileShell at the top level

After reading, execute these phases. After EACH phase summarize and wait for me to say "continue".

═══════════════════════════════════════════════════════════════
PHASE 1 — UI INFRASTRUCTURE
═══════════════════════════════════════════════════════════════

1.1 Add hook: frontend/src/lib/useIsMobile.ts
    export function useIsMobile(breakpoint = 760): boolean {
      const [m, setM] = useState(() => window.innerWidth <= breakpoint);
      useEffect(() => {
        const onResize = () => setM(window.innerWidth <= breakpoint);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
      }, [breakpoint]);
      return m;
    }

1.2 Port hi-fi/src/mobile.jsx to a folder frontend/src/layout/mobile/:
    - MobileShell.tsx        (top bar + bottom tabs + slide-in account drawer)
    - MobileTopbar.tsx       (extracted from MobileShell for clarity)
    - BottomTabs.tsx         (extracted; reads tabs from mobileTabsFor(role))
    - AccountDrawer.tsx      (extracted; the right-side panel with full nav + role switcher)
    - MobileList.tsx         (generic <MobileList items renderItem emptyTitle emptyHint>)
    - MobileCard.tsx         (generic touchable card with title/subtitle/right/meta)
    - MobileFSMVertical.tsx  (vertical timeline replacement for the desktop FSM)
    - mobileTabsFor.ts       (pure function returning the 3-4 bottom tabs per role)

    Type props in TypeScript. Use the same className conventions as the hi-fi.
    Persona color + icon mapping is in mobileTabsFor.ts.

1.3 Copy the new CSS sections from hi-fi/src/styles.css to frontend/src/styles/globals.css verbatim:
    - "MOBILE SHELL — bottom tab bar + compact top bar"
    - "MOBILE LIST + CARD"
    - "MOBILE FSM"
    - The .nav-item--paper variant (used in the account drawer)
    - The .show-on-mobile / .hide-on-mobile utility classes

═══════════════════════════════════════════════════════════════
PHASE 2 — TOP-LEVEL SHELL BRANCH
═══════════════════════════════════════════════════════════════

In your AppShell.tsx (or root layout):

```tsx
function AppShell({ children }: { children: ReactNode }) {
  const isMobile = useIsMobile();
  const { user, logout } = useAuth();
  const { persona, setPersona } = usePersona();   // from PersonaContext

  if (isMobile) {
    return (
      <MobileShell
        user={user}
        persona={persona}
        setPersona={setPersona}
        isAdmin={user.role === 'ADMIN'}
        route={currentRoute}
        setRoute={(r) => navigate(r)}
        onLogout={logout}
      >
        {children}
      </MobileShell>
    );
  }
  // existing desktop sidebar + topbar layout
  return <DesktopShell>{children}</DesktopShell>;
}
```

IMPORTANT: useIsMobile() must be called BEFORE any conditional return (Rules of Hooks).

═══════════════════════════════════════════════════════════════
PHASE 3 — SCREEN-LEVEL BRANCHES
═══════════════════════════════════════════════════════════════

These screens should render differently when isMobile is true:

3.1 modules/founder/Procurements.tsx — table → MobileList of MobileCards
3.2 modules/founder/ProcurementDetail.tsx — horizontal FSM → MobileFSMVertical
3.3 modules/founder/Ledger.tsx — grid rows → card per transaction with debit/credit lines
3.4 modules/founder/Invoices.tsx — table → MobileList with mode chip + amount
3.5 modules/admin/Users.tsx — table → MobileList with status chip + role chip + actions

Pattern in each:
```tsx
const isMobile = useIsMobile();
// ...
return (
  <>
    {/* shared header + filters */}
    {isMobile ? (
      <MobileList items={filtered} renderItem={...} />
    ) : (
      <DesktopTable items={filtered} />
    )}
  </>
);
```

Do NOT branch inside the JSX with `{isMobile && ...}` for entire screens — only for the data presentation. Headers, filters, search inputs work the same on both.

3.6 Dashboard (founder) — desktop hero is two-column with the "ثبت خرید جدید" CTA on the right. On mobile, stack everything and make the CTA full-width. Use Tailwind/CSS Grid + media queries; you don't need a separate component, just collapse to single column at ≤640px.

═══════════════════════════════════════════════════════════════
PHASE 4 — TOUCH ERGONOMICS
═══════════════════════════════════════════════════════════════

4.1 Tap targets: every interactive element must be ≥44×44px on mobile.
    Current buttons use 10px padding on a 14px line — that's 34px tall. On mobile (≤760px):
    - .btn { padding: 14px 16px; } (gives ~46px)
    - .btn--sm { padding: 10px 12px; } (gives ~36px — only for inline filter chips)

4.2 Inputs: at 16px font-size minimum to prevent iOS zoom-on-focus.

4.3 Safe-area for iPhone notch + bottom bar:
    - .mobile-topbar { padding-top: env(safe-area-inset-top); }
    - .mobile-tabs { padding-bottom: env(safe-area-inset-bottom); }
    (Already in hi-fi/src/styles.css.)

4.4 Long-press / swipe: NOT in scope. v3 stays tap-only.

4.5 Pull-to-refresh: NOT in scope. The data ticks live via useQuery refetchInterval.

═══════════════════════════════════════════════════════════════
PHASE 5 — TESTING
═══════════════════════════════════════════════════════════════

Test in DevTools device emulation at three widths:
  • 375 × 812 (iPhone 13 Pro)
  • 414 × 896 (iPhone 11 Pro Max)
  • 768 × 1024 (iPad portrait) — should still show DESKTOP shell

Scenarios:
  [ ] At 375px, login screen is single-column (the navy aside becomes a thin strip on top)
  [ ] After login, MobileShell renders: 56px top bar, content, 64px bottom tabs
  [ ] Tap avatar → account drawer slides in from the start side (RTL = right)
  [ ] Drawer shows full role nav + (for admin) role switcher + logout
  [ ] Bottom tabs are 4 max for each role (founder: dashboard/procurements/invoices/escrow)
  [ ] Tap a procurement → mobile detail screen with vertical FSM
  [ ] Vertical FSM: completed steps green, current step has pulse animation, locked dimmed
  [ ] Pull a procurement from MANAGER_REVIEW → ESCROW_LOCK via "پیشروی" button → stamp animation still works
  [ ] Ledger entries render as cards (one per transaction) with debit/credit lines
  [ ] Resize browser back to ≥760px → desktop shell takes over without page reload
  [ ] Kill Switch from VC still freezes the founder UI; .frozen-overlay covers mobile shell too

═══════════════════════════════════════════════════════════════
NO BACKEND CHANGES IN v3
═══════════════════════════════════════════════════════════════

v3 is frontend-only. No new endpoints. No DB changes. The mobile UI uses the same APIs as desktop.

Notify the user: if they want device-specific features later (push notifications, native app, offline mode with service workers), that's v4.

═══════════════════════════════════════════════════════════════
CONSTRAINTS (re-stating)
═══════════════════════════════════════════════════════════════

• Persian RTL only.
• Vazirmatn font.
• No new UI library.
• Mobile detection is VIEWPORT-based via useIsMobile(), not UA sniffing. The app is responsive within the same render tree — same components, conditional rendering.
• Bottom tabs MUST be a navigation primitive (real route changes), not a fake state toggle.
• When user resizes from mobile→desktop or back, the layout swaps live without state loss (because route + auth + persona live in context above the shell).

Start with PHASE 1. Report back when done.
```

---

## Use this v3 prompt ON TOP of v2

The mobile work assumes v2 is done. If you haven't fully applied v2 yet, paste both prompts sequentially. Don't merge them — Claude Code does better with focused phases.

```bash
# Re-extract latest hi-fi/ alongside repo
rm -rf hi-fi && unzip ~/Downloads/trustc-v3.zip
# In Claude Code:
# (if v2 not done yet) paste HANDOFF-v2.md prompt → wait → paste HANDOFF-v3.md prompt
# (if v2 done already) paste HANDOFF-v3.md prompt only
```

/* ============================================================
   trustC — Mobile-first components
   ------------------------------------------------------------
   When useIsMobile() returns true, the App swaps:
   - <Sidebar> + <Topbar> → <MobileShell> (compact header +
     bottom tab bar)
   - <table>-based lists → <MobileCardList> (each row is a
     touchable card)
   - Horizontal <FSM> → <MobileFSMVertical> (timeline)

   For Claude Code:
   - Mirror this split in React+TS as separate Mobile* files
   - Or use a single component with internal `isMobile` branch
   - The Mobile shell uses position:fixed for top + bottom bars
     and gives the content a calc(100vh - 56px - 64px) area.
   ============================================================ */

const { useState: useStateM, useEffect: useEffectM } = React;

/* ---------------- Mobile shell (top + bottom tabs) ---------------- */
function MobileShell({ user, persona, setPersona, isAdmin, route, setRoute, onLogout, children }) {
  const [menuOpen, setMenuOpen] = useStateM(false);

  // Bottom tabs: pick the 4 most-used items for current persona
  const tabs = mobileTabsFor(persona);

  return (
    <div className="mobile-shell">
      <header className="mobile-topbar">
        <div className="row" style={{ gap: 10, minWidth: 0 }}>
          <div className="mobile-mark">tC</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 14, fontFamily: "var(--mono-data)", letterSpacing: "0.06em" }}>trustC</div>
            <div className="muted" style={{ fontSize: 10, marginTop: 1, lineHeight: 1 }}>
              {personaLabelFa(persona)}
            </div>
          </div>
        </div>
        <button className="mobile-avatar-btn" onClick={() => setMenuOpen(true)} aria-label="حساب کاربری">
          <span className="dot" style={{ background: personaColorFor(persona) }} />
          {user?.name?.[0] || "?"}
        </button>
      </header>

      <main className="mobile-content">
        {children}
      </main>

      <nav className="mobile-tabs">
        {tabs.map(t => (
          <button key={t.id}
            className={"mobile-tab" + (route === t.id ? " active" : "")}
            onClick={() => setRoute(t.id)}>
            <span className="tab-icon">{Icon[t.icon]({ size: 22 })}</span>
            <span className="tab-label">{t.label}</span>
          </button>
        ))}
      </nav>

      {/* Account drawer (right-side full-height) */}
      {menuOpen && (
        <>
          <div className="mobile-scrim" onClick={() => setMenuOpen(false)} />
          <aside className="mobile-drawer">
            <div className="row" style={{ justifyContent: "space-between", padding: "var(--s-5)", borderBottom: "1px solid var(--border-hairline)" }}>
              <div>
                <div style={{ fontWeight: 600 }}>{user?.name}</div>
                <div className="muted mono" style={{ fontSize: 11, marginTop: 2 }}>{user?.email}</div>
                <div style={{ marginTop: 8 }}>
                  <span className="chip" data-tone={user?.role === "ADMIN" ? "bad" : user?.role === "VC" ? "active" : user?.role === "AUDITOR" ? "warn" : "good"}>
                    <span className="mono">{user?.role}</span>
                  </span>
                </div>
              </div>
              <button className="btn btn--ghost btn--icon" onClick={() => setMenuOpen(false)}><Icon.x /></button>
            </div>

            {/* Full nav (all role's screens, including those not on the bottom bar) */}
            <div className="nav-section" style={{ borderBottom: 0 }}>
              <div className="nav-section-title" style={{ color: "var(--fg-muted)" }}>دسترسی</div>
              <div className="stack" style={{ gap: 2 }}>
                {navFor(persona).map(it => (
                  <div key={it.id}
                    className={"nav-item nav-item--paper" + (route === it.id ? " active" : "")}
                    onClick={() => { setRoute(it.id); setMenuOpen(false); }}>
                    <span className="ico">{Icon[it.icon]({ size: 18 })}</span>
                    {it.label}
                  </div>
                ))}
              </div>
            </div>

            {isAdmin && (
              <div className="nav-section" style={{ borderBottom: 0 }}>
                <div className="nav-section-title" style={{ color: "var(--fg-muted)" }}>تغییر نقش (ادمین)</div>
                <div className="seg" style={{ width: "100%" }}>
                  <button className={persona === "ADMIN" ? "active" : ""} style={{ flex: 1 }} onClick={() => { setPersona("ADMIN"); setMenuOpen(false); }}>ادمین</button>
                  <button className={persona === "FOUNDER" ? "active" : ""} style={{ flex: 1 }} onClick={() => { setPersona("FOUNDER"); setMenuOpen(false); }}>بنیان</button>
                  <button className={persona === "VC" ? "active" : ""} style={{ flex: 1 }} onClick={() => { setPersona("VC"); setMenuOpen(false); }}>VC</button>
                  <button className={persona === "AUDITOR" ? "active" : ""} style={{ flex: 1 }} onClick={() => { setPersona("AUDITOR"); setMenuOpen(false); }}>ممیز</button>
                </div>
              </div>
            )}

            <div style={{ padding: "var(--s-5)", marginTop: "auto", borderTop: "1px solid var(--border-hairline)" }}>
              <button className="btn btn--secondary" style={{ width: "100%", justifyContent: "center" }} onClick={onLogout}>
                <Icon.logout size={14} /> خروج
              </button>
            </div>
          </aside>
        </>
      )}
    </div>
  );
}

function personaLabelFa(p) {
  return ({ FOUNDER: "بنیان‌گذار", VC: "سرمایه‌گذار", AUDITOR: "ممیز", ADMIN: "مدیر سیستم" })[p];
}
function personaColorFor(p) {
  return ({ FOUNDER: "var(--state-good)", VC: "var(--state-active)", AUDITOR: "var(--state-warn)", ADMIN: "var(--state-bad)" })[p];
}

function mobileTabsFor(persona) {
  if (persona === "ADMIN") return [
    { id: "admin-overview", label: "خانه",    icon: "dashboard" },
    { id: "admin-users",    label: "کاربران", icon: "users" },
    { id: "admin-settings", label: "تنظیمات", icon: "settings" },
  ];
  if (persona === "VC") return [
    { id: "portfolio",  label: "پورتفو",     icon: "portfolio" },
    { id: "recycling",  label: "بازیافت",    icon: "recycle" },
    { id: "killswitch", label: "Kill",       icon: "freeze" },
  ];
  if (persona === "AUDITOR") return [
    { id: "audit",   label: "حسابرسی",   icon: "audit" },
    { id: "reports", label: "گزارش",     icon: "reports" },
  ];
  // FOUNDER (default)
  return [
    { id: "dashboard",    label: "خانه",     icon: "dashboard" },
    { id: "procurements", label: "خریدها",   icon: "package" },
    { id: "invoices",     label: "فاکتور",   icon: "invoice" },
    { id: "escrow",       label: "اسکرو",    icon: "escrow" },
  ];
}

/* ---------------- Mobile-friendly card list (replaces tables) ---------------- */
function MobileList({ items, renderItem, emptyTitle, emptyHint }) {
  if (!items || items.length === 0) {
    return <div className="empty"><h3>{emptyTitle || "موردی یافت نشد"}</h3><div>{emptyHint}</div></div>;
  }
  return (
    <div className="mobile-list">
      {items.map((it, i) => renderItem(it, i))}
    </div>
  );
}

/* ---------------- Single mobile card (semantic) ---------------- */
function MobileCard({ title, subtitle, right, meta, onClick, accent }) {
  return (
    <button className="mobile-card" onClick={onClick} type="button"
      style={accent ? { borderInlineStartColor: accent, borderInlineStartWidth: 3 } : null}>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "start", gap: 12 }}>
        <div style={{ minWidth: 0, textAlign: "start" }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{title}</div>
          {subtitle && <div className="muted" style={{ fontSize: 12, marginTop: 3 }}>{subtitle}</div>}
        </div>
        {right && <div style={{ flexShrink: 0, textAlign: "end" }}>{right}</div>}
      </div>
      {meta && <div className="mobile-card-meta">{meta}</div>}
    </button>
  );
}

/* ---------------- Vertical FSM for mobile ---------------- */
function MobileFSMVertical({ currentState }) {
  const fsm = window.trustcData.procurementFSM;
  const ci = window.tc.stateIndex(currentState);
  return (
    <div className="mobile-fsm">
      {fsm.map((s, i) => {
        const cls =
          i < ci  ? "done" :
          i === ci ? "current" :
          "locked";
        return (
          <div key={s.state} className={"mobile-fsm-step " + cls}>
            <div className="step-dot">
              {i < ci && <Icon.check size={11} />}
              {i === ci && <span className="ping" />}
            </div>
            <div className="step-body">
              <div className="step-num mono">۰{i+1}</div>
              <div className="step-label">{s.label}</div>
              <div className="step-state mono">{s.state}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

Object.assign(window, {
  MobileShell, MobileList, MobileCard, MobileFSMVertical, mobileTabsFor, personaLabelFa,
});

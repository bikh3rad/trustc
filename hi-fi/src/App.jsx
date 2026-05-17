/* ============================================================
   trustC — App root
   ------------------------------------------------------------
   Top-level state:
   - authUser  — currently authenticated user (null = show login)
   - authView  — "login" | "register" (used pre-auth)
   - persona   — derived from authUser.role; admin can impersonate
   - route     — nav id (per-persona)
   - frozenIds — Set of startup IDs frozen by VC
   - ledger    — live ledger stream
   - tweaks    — persistence via __edit_mode_set_keys protocol
   - sidebarOpen — mobile drawer state

   For Claude Code:
   - In real app, swap the in-memory authUser for a token-based
     React Query / Zustand store with refresh tokens.
   - The persona switcher in <Topbar> is only rendered when
     authUser.role === "ADMIN" — true RBAC for non-admins.
   ============================================================ */

const { useState: useStateApp, useEffect: useEffectApp } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "density": "comfortable",
  "theme": "light",
  "showLegalTerms": true,
  "numerals": "fa-mixed"
}/*EDITMODE-END*/;

function App() {
  // ---- Tweaks ----
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  // ---- Auth ----
  // In real app, restore from localStorage / refresh token.
  const [authUser, setAuthUser] = useStateApp(null);
  const [authView, setAuthView] = useStateApp("login"); // "login" | "register"
  const [registrationEnabled, setRegistrationEnabled] = useStateApp(window.trustcData.systemSettings.registrationEnabled);

  // ---- Routing ----
  // Active persona — initial = authUser.role, ADMIN can switch (impersonate)
  const [persona, setPersona] = useStateApp("FOUNDER");
  const [route, setRouteState] = useStateApp("dashboard");
  const [nav, setNav] = useStateApp(null);

  // ---- Mobile drawer ----
  const [sidebarOpen, setSidebarOpen] = useStateApp(false);

  // ---- VC-side ----
  const [frozenIds, setFrozenIds] = useStateApp(() => {
    const seed = new Set();
    window.trustcData.startups.forEach(s => { if (s.frozen) seed.add(s.id); });
    return seed;
  });
  const [openStartup, setOpenStartup] = useStateApp(null);

  // ---- Live ledger stream ----
  const [ledger, setLedger] = useStateApp(window.trustcData.ledger);

  // ---- Toasts ----
  const [toasts, setToasts] = useStateApp([]);

  // ---- Force-refresh counter (admin actions mutate window.trustcData) ----
  const [refreshTick, setRefreshTick] = useStateApp(0);
  function forceRefresh() { setRefreshTick(n => n + 1); }

  // ---- Viewport detection (hooks MUST run before any conditional return) ----
  const isMobile = useIsMobile();

  // ---- Current startup (for FOUNDER persona) ----
  const currentStartup = window.trustcData.startups[0];

  // ---- Apply tweaks to root element ----
  useEffectApp(() => {
    const root = document.documentElement;
    root.setAttribute("data-density", t.density);
    root.setAttribute("data-theme", t.theme);
    root.setAttribute("data-numerals", t.numerals);
    document.body.classList.toggle("hide-legal", !t.showLegalTerms);
    window.tc.config.numerals = t.numerals === "fa" ? "fa" : "latin";
  }, [t.density, t.theme, t.numerals, t.showLegalTerms]);

  // ---- On auth, sync persona + default route to user's role ----
  useEffectApp(() => {
    if (!authUser) return;
    setPersona(authUser.role);
  }, [authUser]);

  useEffectApp(() => {
    const defaults = {
      FOUNDER: "dashboard",
      VC: "portfolio",
      AUDITOR: "audit",
      ADMIN: "admin-overview",
    };
    setRouteState(defaults[persona]);
    setNav(null);
    setSidebarOpen(false);
  }, [persona]);

  // ---- Helpers ----
  function toast({ tone = "neutral", msg }) {
    const id = Math.random();
    setToasts(list => [...list, { id, tone, msg }]);
    setTimeout(() => setToasts(list => list.filter(t => t.id !== id)), 3200);
  }

  function emitLedger(entry) {
    setLedger(list => [{ ...entry, _fresh: true }, ...list]);
    setTimeout(() => setLedger(list => list.map(e => ({ ...e, _fresh: false }))), 600);
  }

  function freeze(startupId, payload) {
    setFrozenIds(s => new Set([...s, startupId]));
    toast({ tone: "bad", msg: `Kill Switch فعال شد · ${window.tc.getStartup(startupId)?.name}` });
    window.trustcData.auditLog.unshift({
      id: "aud_" + Math.random().toString(36).slice(2,5),
      at: new Date().toLocaleString("fa-IR"),
      actor: authUser?.name || "VC trustC", actorRole: "VC", action: "FreezeActivated",
      target: startupId, from: null, to: "FROZEN",
      hash: "live_" + Math.random().toString(16).slice(2,12) + "…",
    });
  }
  function unfreeze(startupId) {
    setFrozenIds(s => { const n = new Set(s); n.delete(startupId); return n; });
    toast({ tone: "good", msg: "فریز لغو شد · جریان‌های کاری مجدداً فعال شدند" });
  }
  function bumpCreditLine(amount) {
    currentStartup.creditLine += amount;
    currentStartup.creditUsed = Math.max(0, currentStartup.creditUsed - amount * 0.4);
  }

  // ---- Register tweaks-panel-triggered actions ----
  useEffectApp(() => {
    window.__trustcActions = {
      recycle: () => {
        setRouteState("recycling");
        setPersona("VC");
        toast({ tone: "good", msg: "به پنل بازیافت سرمایه منتقل شدید — دکمه «اجرای چرخه» را فشار دهید." });
      },
      freezeAlpha: () => {
        const alpha = window.trustcData.startups[0];
        freeze(alpha.id, { reason: "اقدام نمایشی از پنل Tweaks", scope: "FULL", duration: "TEMPORARY" });
      },
    };
  }, []);

  // ---- Auth handlers ----
  function handleLogin(user) {
    setAuthUser(user);
    toast({ tone: "good", msg: `خوش آمدید، ${user.name}` });
  }
  function handleRegister(form) {
    const newUser = {
      id: "u_" + Math.random().toString(36).slice(2,5),
      name: form.name, email: form.email, role: form.role,
      status: "PENDING",
      company: form.company,
      joinedAt: new Date().toLocaleDateString("fa-IR"),
      lastLogin: null,
    };
    window.trustcData.users.push(newUser);
  }
  function handleLogout() {
    setAuthUser(null);
    setAuthView("login");
    setPersona("FOUNDER");
    toast({ tone: "neutral", msg: "خروج موفق" });
  }

  // ---- Pre-auth: show login / register ----
  if (!authUser) {
    if (authView === "register") {
      return (
        <>
          <Register
            registrationEnabled={registrationEnabled}
            onRegister={handleRegister}
            onGoLogin={() => setAuthView("login")} />
          <Toasts toasts={toasts} />
        </>
      );
    }
    return (
      <>
        <Login
          registrationEnabled={registrationEnabled}
          onAuth={handleLogin}
          onGoRegister={() => setAuthView("register")} />
        <Toasts toasts={toasts} />
      </>
    );
  }

  // ---- Context for screens ----
  const founderFrozen = frozenIds.has(currentStartup.id);
  const ctx = {
    persona, currentStartup,
    user: authUser,
    setRoute: (r, n = null) => { setRouteState(r); setNav(n); setSidebarOpen(false); },
    nav, setNav,
    frozen: founderFrozen,
    frozenIds, freeze, unfreeze,
    openStartupModal: setOpenStartup,
    openFreezeFor: () => {},
    emitLedger, ledger,
    bumpCreditLine,
    toast, forceRefresh,
  };

  // ---- Screen routing ----
  function CurrentScreen() {
    if (persona === "FOUNDER") {
      if (route === "dashboard")    return <FounderDashboard ctx={ctx} />;
      if (route === "procurements") {
        if (nav === "new") return <NewProcurement ctx={ctx} setNav={setNav} />;
        if (nav)           return <ProcurementDetail ctx={ctx} procId={nav} setNav={setNav} />;
        return <ProcurementsList ctx={ctx} setNav={setNav} />;
      }
      if (route === "invoices")  return <InvoicesScreen ctx={ctx} />;
      if (route === "escrow")    return <EscrowScreen ctx={ctx} />;
      if (route === "ledger")    return <LedgerScreen ctx={ctx} />;
    }
    if (persona === "VC") {
      if (route === "portfolio")  return <PortfolioScreen ctx={ctx} />;
      if (route === "recycling")  return <RecyclingScreen ctx={ctx} />;
      if (route === "killswitch") return <KillSwitchScreen ctx={ctx} />;
    }
    if (persona === "AUDITOR") {
      if (route === "audit")   return <AuditScreen ctx={ctx} />;
      if (route === "reports") return <ReportsScreen ctx={ctx} />;
    }
    if (persona === "ADMIN") {
      if (route === "admin-overview") return <AdminOverview ctx={ctx} />;
      if (route === "admin-users")    return <AdminUsers ctx={ctx} />;
      if (route === "admin-settings") return <AdminSettings ctx={ctx} />;
    }
    // Fallback
    return persona === "ADMIN" ? <AdminOverview ctx={ctx} /> : <FounderDashboard ctx={ctx} />;
  }

  const frozenStartupForBanner = founderFrozen && persona === "FOUNDER" ? currentStartup : null;
  const isRealAdmin = authUser.role === "ADMIN";

  // ---- Mobile shell branch ----
  if (isMobile) {
    return (
      <>
        <MobileShell
          user={authUser}
          persona={persona}
          setPersona={setPersona}
          isAdmin={isRealAdmin}
          route={route}
          setRoute={(r) => { setRouteState(r); setNav(null); }}
          onLogout={handleLogout}>
          <CurrentScreen key={refreshTick} />
        </MobileShell>
        <StartupModal startup={openStartup}
          onClose={() => setOpenStartup(null)}
          ctx={{ ...ctx, openFreezeFor: () => { setOpenStartup(null); setRouteState("killswitch"); }, unfreeze }} />
        {founderFrozen && persona === "FOUNDER" && (
          <>
            <div className="frozen-overlay" />
            <div className="frozen-banner">
              <span className="dot" />
              FROZEN · تعلیق شده
            </div>
          </>
        )}
        <Toasts toasts={toasts} />
      </>
    );
  }

  return (
    <div className="app-shell">
      <Sidebar persona={persona} route={route}
        setRoute={(r) => { setRouteState(r); setNav(null); }}
        currentStartup={persona === "FOUNDER" ? currentStartup : null}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)} />
      <div className="app-main">
        <Topbar
          user={authUser}
          persona={persona}
          setPersona={setPersona}
          isAdmin={isRealAdmin}
          frozenStartup={frozenStartupForBanner}
          onMenu={() => setSidebarOpen(o => !o)}
          onLogout={handleLogout} />
        <main className="app-content">
          <CurrentScreen key={refreshTick} />
        </main>
      </div>

      <StartupModal startup={openStartup}
        onClose={() => setOpenStartup(null)}
        ctx={{ ...ctx, openFreezeFor: () => { setOpenStartup(null); setRouteState("killswitch"); }, unfreeze }} />

      {founderFrozen && persona === "FOUNDER" && (
        <>
          <div className="frozen-overlay" />
          <div className="frozen-banner">
            <span className="dot" />
            FROZEN · توسط VC تعلیق شده · تمام پرداخت‌ها متوقف
          </div>
        </>
      )}

      <Toasts toasts={toasts} />

      {/* Tweaks panel (visible to all logged-in users) */}
      <TweaksPanel title="Tweaks · trustC">
        <TweakSection label="ظاهر" />
        <TweakRadio
          label="تم"
          value={t.theme}
          onChange={(v) => setTweak("theme", v)}
          options={[
            { value: "light", label: "Paper" },
            { value: "dark",  label: "Manifest" },
          ]}
        />
        <TweakRadio
          label="چگالی"
          value={t.density}
          onChange={(v) => setTweak("density", v)}
          options={[
            { value: "comfortable", label: "راحت" },
            { value: "dense",       label: "متراکم" },
          ]}
        />
        <TweakRadio
          label="اعداد"
          value={t.numerals}
          onChange={(v) => setTweak("numerals", v)}
          options={[
            { value: "fa-mixed", label: "ترکیبی" },
            { value: "fa",       label: "فارسی" },
            { value: "latin",    label: "لاتین" },
          ]}
        />

        <TweakSection label="رفتار" />
        <TweakToggle
          label="اصطلاحات حقوقی"
          value={t.showLegalTerms}
          onChange={(v) => setTweak("showLegalTerms", v)}
        />

        <TweakSection label="اقدامات نمایشی" />
        <TweakButton label="اجرای چرخه بازیافت" onClick={() => window.__trustcActions?.recycle?.()} />
        <TweakButton label="فریز شرکت آلفا" onClick={() => window.__trustcActions?.freezeAlpha?.()} />
      </TweaksPanel>
    </div>
  );
}

/* ---------------- Toasts (extracted for reuse pre-auth) ---------------- */
function Toasts({ toasts }) {
  return (
    <div style={{ position: "fixed", bottom: 16, insetInlineEnd: 16, display: "flex", flexDirection: "column", gap: 8, zIndex: 200 }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          background: t.tone === "bad" ? "var(--state-bad)" : t.tone === "good" ? "var(--state-good)" : "var(--navy-900)",
          color: "#fff",
          padding: "10px 16px",
          borderRadius: 4,
          fontSize: 13,
          boxShadow: "var(--shadow-2)",
          maxWidth: 360,
          animation: "fly 320ms var(--ease-document)",
        }}>{t.msg}</div>
      ))}
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);

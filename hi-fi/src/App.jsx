/* ============================================================
   trustC — App root
   ------------------------------------------------------------
   Top-level state:
   - persona ('FOUNDER' | 'VC' | 'AUDITOR')
   - route   (string id matching nav items)
   - nav     (sub-route within a module, e.g. selected proc id)
   - frozenIds (Set of startup IDs frozen by VC)
   - ledger  (live ledger stream — gets prepended on FSM events)
   - tweaks  (persistence via __edit_mode_set_keys protocol)

   Context object `ctx` is passed to every screen with the
   currentStartup, helpers, toast(), and event emitters.
   ============================================================ */

const { useState: useStateApp, useEffect: useEffectApp, useMemo: useMemoApp } = React;

/* ============================================================
   TWEAK DEFAULTS — written to disk via host edit-mode protocol
   ============================================================ */
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "persona": "FOUNDER",
  "density": "comfortable",
  "theme": "light",
  "showLegalTerms": true,
  "numerals": "fa-mixed"
}/*EDITMODE-END*/;

function App() {
  // ---- Tweaks (sync to root data attrs) ----
  // useTweaks returns [values, setTweak]
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  // ---- Routing ----
  const [persona, setPersona] = useStateApp(t.persona);
  const [route, setRouteState] = useStateApp("dashboard");
  const [nav, setNav] = useStateApp(null);

  // ---- VC-side state ----
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

  // ---- Founder current startup (always st_001 in this demo) ----
  const currentStartup = window.trustcData.startups[0];

  // ---- Persona <-> route sync ----
  // When persona changes, jump to default screen for that persona.
  useEffectApp(() => {
    const defaults = { FOUNDER: "dashboard", VC: "portfolio", AUDITOR: "audit" };
    setRouteState(defaults[persona]);
    setNav(null);
  }, [persona]);

  // ---- Apply tweaks to root element ----
  useEffectApp(() => {
    const root = document.documentElement;
    root.setAttribute("data-density", t.density);
    root.setAttribute("data-theme", t.theme);
    root.setAttribute("data-numerals", t.numerals);
    document.body.classList.toggle("hide-legal", !t.showLegalTerms);
    window.tc.config.numerals = t.numerals === "fa" ? "fa" : "latin";
  }, [t.density, t.theme, t.numerals, t.showLegalTerms]);

  // When the host posts the persona tweak, mirror it into local state
  useEffectApp(() => { if (t.persona !== persona) setPersona(t.persona); }, [t.persona]);

  // ---- Helpers passed via ctx ----
  function toast({ tone = "neutral", msg }) {
    const id = Math.random();
    setToasts(list => [...list, { id, tone, msg }]);
    setTimeout(() => setToasts(list => list.filter(t => t.id !== id)), 3200);
  }

  function emitLedger(entry) {
    setLedger(list => [{ ...entry, _fresh: true }, ...list]);
    setTimeout(() => {
      setLedger(list => list.map(e => ({ ...e, _fresh: false })));
    }, 600);
  }

  function freeze(startupId, payload) {
    setFrozenIds(s => new Set([...s, startupId]));
    toast({ tone: "bad", msg: `Kill Switch فعال شد · ${window.tc.getStartup(startupId)?.name}` });
    // emit audit (in-memory only)
    window.trustcData.auditLog.unshift({
      id: "aud_" + Math.random().toString(36).slice(2,5),
      at: new Date().toLocaleString("fa-IR"),
      actor: "VC trustC", actorRole: "VC", action: "FreezeActivated",
      target: startupId, from: null, to: "FROZEN",
      hash: "live_" + Math.random().toString(16).slice(2,12) + "…",
    });
  }
  function unfreeze(startupId) {
    setFrozenIds(s => { const n = new Set(s); n.delete(startupId); return n; });
    toast({ tone: "good", msg: "فریز لغو شد · جریان‌های کاری مجدداً فعال شدند" });
  }

  // Founder's startup is the "current" one for founder context;
  // it can be frozen by the VC, which affects the entire UI.
  const founderFrozen = frozenIds.has(currentStartup.id);

  // For the credit-line bump animation
  function bumpCreditLine(amount) {
    currentStartup.creditLine += amount;
    currentStartup.creditUsed = Math.max(0, currentStartup.creditUsed - amount * 0.4);
  }

  // Register tweaks-panel-triggered actions
  useEffectApp(() => {
    window.__trustcActions = {
      recycle: () => {
        setRouteState("recycling");
        setPersona("VC");
        setTweak("persona", "VC");
        toast({ tone: "good", msg: "به پنل بازیافت سرمایه منتقل شدید — دکمه «اجرای چرخه» را فشار دهید." });
      },
      freezeAlpha: () => {
        const alpha = window.trustcData.startups[0];
        freeze(alpha.id, { reason: "اقدام نمایشی از پنل Tweaks", scope: "FULL", duration: "TEMPORARY" });
      },
    };
  }, []);

  const ctx = {
    persona, currentStartup,
    setRoute: (r, n = null) => { setRouteState(r); setNav(n); },
    nav, setNav,
    frozen: founderFrozen,
    frozenIds, freeze, unfreeze,
    openStartupModal: setOpenStartup,
    openFreezeFor: (s) => { /* opens confirm dialog via KillSwitchScreen — see there */ },
    emitLedger, ledger,
    bumpCreditLine,
    toast,
  };

  // ---- Screen routing ----
  function CurrentScreen() {
    // Founder
    if (persona === "FOUNDER") {
      if (route === "dashboard")    return <FounderDashboard ctx={ctx} />;
      if (route === "procurements") {
        if (nav === "new") return <NewProcurement ctx={ctx} setNav={setNav} />;
        if (nav)           return <ProcurementDetail ctx={ctx} procId={nav} setNav={setNav} />;
        return <ProcurementsList ctx={ctx} setNav={setNav} />;
      }
      if (route === "invoices")    return <InvoicesScreen ctx={ctx} />;
      if (route === "escrow")      return <EscrowScreen ctx={ctx} />;
      if (route === "ledger")      return <LedgerScreen ctx={ctx} />;
    }
    // VC
    if (persona === "VC") {
      if (route === "portfolio")  return <PortfolioScreen ctx={ctx} />;
      if (route === "recycling")  return <RecyclingScreen ctx={ctx} />;
      if (route === "killswitch") return <KillSwitchScreen ctx={ctx} />;
    }
    // Auditor
    if (persona === "AUDITOR") {
      if (route === "audit")   return <AuditScreen ctx={ctx} />;
      if (route === "reports") return <ReportsScreen ctx={ctx} />;
    }
    return <FounderDashboard ctx={ctx} />;
  }

  const frozenStartupForBanner = founderFrozen && persona === "FOUNDER" ? currentStartup : null;

  return (
    <div className="app-shell">
      <Sidebar persona={persona} route={route}
        setRoute={(r) => { setRouteState(r); setNav(null); }}
        currentStartup={persona === "FOUNDER" ? currentStartup : null} />
      <div className="app-main">
        <Topbar persona={persona} setPersona={(p) => { setPersona(p); setTweak("persona", p); }}
          frozenStartup={frozenStartupForBanner} />
        <main className="app-content">
          <CurrentScreen />
        </main>
      </div>

      {/* VC startup-detail modal */}
      <StartupModal startup={openStartup}
        onClose={() => setOpenStartup(null)}
        ctx={{ ...ctx, openFreezeFor: (s) => { setOpenStartup(null); setRouteState("killswitch"); }, unfreeze }} />

      {/* Frozen UI overlay (Founder view, when startup is frozen) */}
      {founderFrozen && persona === "FOUNDER" && (
        <>
          <div className="frozen-overlay" />
          <div className="frozen-banner">
            <span className="dot" />
            FROZEN · توسط VC تعلیق شده · تمام پرداخت‌ها متوقف
          </div>
        </>
      )}

      {/* Toasts */}
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

      {/* Tweaks panel */}
      <TweaksPanel title="Tweaks · trustC">
        <TweakSection label="پرسونا" />
        <TweakRadio
          label="نقش فعال"
          value={t.persona}
          onChange={(v) => setTweak("persona", v)}
          options={[
            { value: "FOUNDER", label: "بنیان‌گذار" },
            { value: "VC",      label: "VC" },
            { value: "AUDITOR", label: "ممیز" },
          ]}
        />

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
        <TweakButton label="اجرای چرخه بازیافت" onClick={() => triggerRecycleDemo()} />
        <TweakButton label="فریز شرکت آلفا" onClick={() => triggerFreezeDemo()} />
      </TweaksPanel>
    </div>
  );
}

// Hooks for the demo actions on the tweaks panel.
// We use a global hook here so external triggers (incl. Tweaks panel)
// can run actions inside the App's React state. The handlers are
// registered by App via window.__trustcActions.
function triggerRecycleDemo() {
  window.__trustcActions?.recycle?.();
}
function triggerFreezeDemo() {
  window.__trustcActions?.freezeAlpha?.();
}

/* ============================================================
   Mount
   ============================================================ */
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);

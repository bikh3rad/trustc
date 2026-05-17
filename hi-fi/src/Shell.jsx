/* ============================================================
   trustC — App shell (sidebar, topbar, persona switcher)
   ------------------------------------------------------------
   The Shell owns navigation state. Pass `route` and
   `setRoute` from App. The sidebar items change with persona.
   ============================================================ */

const NAV_FOUNDER = [
  { id: "dashboard",   label: "داشبورد",          icon: "dashboard" },
  { id: "procurements",label: "خریدها",           icon: "package" },
  { id: "invoices",    label: "فاکتورهای فروش",   icon: "invoice" },
  { id: "escrow",      label: "اسکرو",            icon: "escrow" },
  { id: "ledger",      label: "دفتر کل",           icon: "ledger" },
];

const NAV_VC = [
  { id: "portfolio",   label: "پورتفولیو",         icon: "portfolio" },
  { id: "recycling",   label: "بازیافت سرمایه",    icon: "recycle" },
  { id: "killswitch",  label: "تعلیق (Kill Switch)", icon: "freeze" },
];

const NAV_AUDITOR = [
  { id: "audit",       label: "ردپای حسابرسی",     icon: "audit" },
  { id: "reports",     label: "گزارش‌های مالی",    icon: "reports" },
];

function navFor(persona) {
  if (persona === "VC") return NAV_VC;
  if (persona === "AUDITOR") return NAV_AUDITOR;
  return NAV_FOUNDER;
}

/* Brand block — orange stencil "T" inside a tinted square */
function Brand() {
  return (
    <div className="brand">
      <div className="brand-mark">tC</div>
      <div>
        <div className="brand-name">trustC</div>
        <div style={{ fontSize: 10, color: "var(--fg-on-manifest-muted)", letterSpacing: "0.08em", marginTop: 2 }}>
          سیستم‌عامل مالی
        </div>
      </div>
    </div>
  );
}

/* Sidebar */
function Sidebar({ persona, route, setRoute, currentStartup }) {
  const items = navFor(persona);
  return (
    <aside className="app-sidebar">
      <Brand />
      <div className="nav-section">
        <div className="nav-section-title">
          {persona === "FOUNDER" ? "ورک‌اسپیس استارتاپ" :
           persona === "VC" ? "کنترل پورتفوی" :
           "حسابرسی"}
        </div>
        <div className="stack" style={{ gap: 2 }}>
          {items.map(it => (
            <div
              key={it.id}
              className={"nav-item" + (route === it.id ? " active" : "")}
              onClick={() => setRoute(it.id)}
            >
              <span className="ico">{Icon[it.icon]({ size: 18 })}</span>
              {it.label}
            </div>
          ))}
        </div>
      </div>

      {persona === "FOUNDER" && currentStartup && (
        <div className="nav-section" style={{ marginTop: "auto", borderBottom: 0 }}>
          <div className="nav-section-title">شرکت فعال</div>
          <div style={{ padding: "8px 12px 4px", fontSize: 13 }}>
            <div style={{ fontWeight: 600, color: "var(--cream-50)" }}>{currentStartup.name}</div>
            <div style={{ color: "var(--fg-on-manifest-muted)", fontSize: 11, marginTop: 2 }}>
              {currentStartup.industry}
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 12px 0", fontSize: 11, color: "var(--fg-on-manifest-muted)" }}>
            <span>امتیاز اعتباری</span>
            <span className="mono" style={{ color: "var(--orange-500)", fontWeight: 600 }}>{window.tc.toFaDigits(currentStartup.creditScore)} / ۱۰۰</span>
          </div>
          <div style={{ padding: "6px 12px 0" }}>
            <ProgressBar value={currentStartup.creditScore} tone={currentStartup.creditScore > 80 ? "good" : currentStartup.creditScore > 60 ? "active" : "warn"} />
          </div>
        </div>
      )}

      <div style={{ marginTop: "auto", padding: "12px 16px", fontFamily: "var(--mono-data)", fontSize: 10, color: "var(--fg-on-manifest-muted)", letterSpacing: "0.08em", borderTop: "1px solid var(--navy-700)" }}>
        v۰.۹.۰ · MVP · {new Date().toLocaleDateString("fa-IR")}
      </div>
    </aside>
  );
}

/* Topbar with persona switcher + frozen indicator */
function Topbar({ persona, setPersona, frozenStartup, onTriggerFreeze, onUnfreeze }) {
  const personaLabel = {
    FOUNDER: { label: "بنیان‌گذار", role: "FOUNDER", company: "شرکت آلفا" },
    VC:      { label: "سرمایه‌گذار", role: "VC ADMIN", company: "صندوق trustC" },
    AUDITOR: { label: "ممیز",     role: "AUDITOR", company: "مرکز حسابرسی" },
  }[persona];

  return (
    <header className="app-topbar">
      <div style={{ display: "flex", alignItems: "center", gap: "var(--s-4)" }}>
        <div className="row" style={{ gap: 6 }}>
          <span className="eyebrow">پنل</span>
          <span style={{ fontWeight: 600 }}>{personaLabel.label}</span>
          <span className="faint mono" style={{ fontSize: 11 }}>· {personaLabel.company}</span>
        </div>
        {frozenStartup && (
          <span className="chip" data-tone="bad" title="استارتاپ توسط VC فریز شده">
            <span className="mono">FROZEN</span>
            <span className="fa">· {frozenStartup.name}</span>
          </span>
        )}
      </div>

      <div className="row" style={{ gap: "var(--s-3)" }}>
        <div className="seg">
          <button className={persona === "FOUNDER" ? "active" : ""} onClick={() => setPersona("FOUNDER")}>بنیان‌گذار</button>
          <button className={persona === "VC" ? "active" : ""} onClick={() => setPersona("VC")}>سرمایه‌گذار</button>
          <button className={persona === "AUDITOR" ? "active" : ""} onClick={() => setPersona("AUDITOR")}>ممیز</button>
        </div>
        <div className="persona-pill">
          <span className="dot" />
          <span>{personaLabel.label}</span>
          <span className="role-label">{personaLabel.role}</span>
        </div>
      </div>
    </header>
  );
}

Object.assign(window, { Sidebar, Topbar, navFor });

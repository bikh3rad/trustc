/* ============================================================
   trustC — App shell (sidebar, topbar, persona-aware nav)
   ------------------------------------------------------------
   Owns navigation state. Nav items change with the active
   user's role. In real RBAC, role is set by the server JWT;
   here it's the user.role coming from auth.

   For Claude Code:
   - Sidebar collapses to drawer on mobile (max-width: 1000px)
   - Hamburger button in topbar toggles it
   - Persona switcher in topbar is DEV-ONLY (visible only when
     the auth user.role === "ADMIN"). Regular users never see
     it — their nav is fixed to their role.
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

const NAV_ADMIN = [
  { id: "admin-overview", label: "نمای کلی",       icon: "dashboard" },
  { id: "admin-users",    label: "کاربران",        icon: "users" },
  { id: "admin-settings", label: "تنظیمات سیستم",  icon: "settings" },
];

function navFor(persona) {
  if (persona === "ADMIN")   return NAV_ADMIN;
  if (persona === "VC")      return NAV_VC;
  if (persona === "AUDITOR") return NAV_AUDITOR;
  return NAV_FOUNDER;
}

/* ---------------- Brand block ---------------- */
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

/* ---------------- Sidebar ---------------- */
function Sidebar({ persona, route, setRoute, currentStartup, open, onClose }) {
  const items = navFor(persona);

  const sectionTitle =
    persona === "FOUNDER" ? "ورک‌اسپیس استارتاپ" :
    persona === "VC"      ? "کنترل پورتفوی" :
    persona === "AUDITOR" ? "حسابرسی" :
    "مدیریت سیستم";

  function handleNav(id) {
    setRoute(id);
    if (onClose) onClose();
  }

  return (
    <>
      {open && <div className="sidebar-scrim" onClick={onClose} />}
      <aside className={"app-sidebar" + (open ? " open" : "")}>
        <Brand />
        <div className="nav-section">
          <div className="nav-section-title">{sectionTitle}</div>
          <div className="stack" style={{ gap: 2 }}>
            {items.map(it => (
              <div
                key={it.id}
                className={"nav-item" + (route === it.id ? " active" : "")}
                onClick={() => handleNav(it.id)}
              >
                <span className="ico">{Icon[it.icon]({ size: 18 })}</span>
                {it.label}
              </div>
            ))}
          </div>
        </div>

        {persona === "FOUNDER" && currentStartup && (
          <div className="nav-section" style={{ borderBottom: 0 }}>
            <div className="nav-section-title">شرکت فعال</div>
            <div style={{ padding: "8px 12px 4px", fontSize: 13 }}>
              <div style={{ fontWeight: 600, color: "var(--cream-50)" }}>{currentStartup.name}</div>
              <div style={{ color: "var(--fg-on-manifest-muted)", fontSize: 11, marginTop: 2 }}>
                {currentStartup.industry}
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 12px 0", fontSize: 11, color: "var(--fg-on-manifest-muted)" }}>
              <span>امتیاز اعتباری</span>
              <span className="mono" style={{ color: "var(--orange-500)", fontWeight: 600 }}>
                {window.tc.toFaDigits(currentStartup.creditScore)} / ۱۰۰
              </span>
            </div>
            <div style={{ padding: "6px 12px 0" }}>
              <ProgressBar value={currentStartup.creditScore}
                tone={currentStartup.creditScore > 80 ? "good" : currentStartup.creditScore > 60 ? "active" : "warn"} />
            </div>
          </div>
        )}

        <div style={{ marginTop: "auto", padding: "12px 16px", fontFamily: "var(--mono-data)", fontSize: 10, color: "var(--fg-on-manifest-muted)", letterSpacing: "0.08em", borderTop: "1px solid var(--navy-700)" }}>
          v۰.۹.۰ · MVP · {new Date().toLocaleDateString("fa-IR")}
        </div>
      </aside>
    </>
  );
}

/* ---------------- Topbar (with hamburger + user menu) ---------------- */
function Topbar({ user, persona, setPersona, frozenStartup, onMenu, onLogout, isAdmin }) {
  const personaLabel = {
    FOUNDER: { label: "بنیان‌گذار", role: "FOUNDER",   color: "var(--state-good)" },
    VC:      { label: "سرمایه‌گذار", role: "VC ADMIN",  color: "var(--state-active)" },
    AUDITOR: { label: "ممیز",     role: "AUDITOR",    color: "var(--state-warn)" },
    ADMIN:   { label: "مدیر سیستم", role: "ADMIN",      color: "var(--state-bad)" },
  }[persona];

  return (
    <header className="app-topbar">
      <div className="topbar-meta">
        <button className="hamburger" onClick={onMenu} aria-label="منو">
          <Icon.menu size={18} />
        </button>
        <div className="row" style={{ gap: 6, minWidth: 0 }}>
          <span className="eyebrow desktop-only">پنل</span>
          <span style={{ fontWeight: 600 }}>{personaLabel.label}</span>
          <span className="faint mono desktop-only" style={{ fontSize: 11 }}>· {user?.company}</span>
        </div>
        {frozenStartup && (
          <span className="chip" data-tone="bad" title="استارتاپ توسط VC فریز شده">
            <span className="mono">FROZEN</span>
            <span className="fa desktop-only">· {frozenStartup.name}</span>
          </span>
        )}
      </div>

      <div className="topbar-actions">
        {/* Persona switcher — ONLY visible for ADMIN (dev/impersonate flow) */}
        {isAdmin && (
          <div className="seg" title="ادمین می‌تواند نقش‌های دیگر را برای تست مشاهده کند">
            <button className={persona === "ADMIN" ? "active" : ""} onClick={() => setPersona("ADMIN")}>ادمین</button>
            <button className={persona === "FOUNDER" ? "active" : ""} onClick={() => setPersona("FOUNDER")}>بنیان‌گذار</button>
            <button className={persona === "VC" ? "active" : ""} onClick={() => setPersona("VC")}>VC</button>
            <button className={persona === "AUDITOR" ? "active" : ""} onClick={() => setPersona("AUDITOR")}>ممیز</button>
          </div>
        )}
        <UserMenu user={user} personaColor={personaLabel.color} role={personaLabel.role} onLogout={onLogout} />
      </div>
    </header>
  );
}

/* ---------------- User menu ---------------- */
function UserMenu({ user, personaColor, role, onLogout }) {
  const [open, setOpen] = React.useState(false);
  React.useEffect(() => {
    if (!open) return;
    const close = (e) => { if (!e.target.closest(".user-menu")) setOpen(false); };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [open]);

  return (
    <div className="user-menu" style={{ position: "relative" }}>
      <button className="persona-pill" onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}>
        <span className="dot" style={{ background: personaColor }} />
        <span>{user?.name}</span>
        <span className="role-label">{role}</span>
      </button>
      {open && (
        <div style={{
          position: "absolute", insetInlineEnd: 0, top: "calc(100% + 6px)",
          background: "var(--bg-elevated)", border: "1px solid var(--border-hairline)",
          borderRadius: "var(--r-2)", boxShadow: "var(--shadow-2)",
          minWidth: 220, zIndex: 50, padding: 6,
        }}>
          <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--border-hairline)" }}>
            <div style={{ fontWeight: 500, fontSize: 13 }}>{user?.name}</div>
            <div className="muted mono" style={{ fontSize: 11, marginTop: 2 }}>{user?.email}</div>
          </div>
          <button className="btn btn--ghost btn--sm" style={{ width: "100%", justifyContent: "flex-start", padding: "10px 12px", borderRadius: 4 }}
            onClick={onLogout}>
            <Icon.logout size={14} /> خروج
          </button>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { Sidebar, Topbar, navFor });

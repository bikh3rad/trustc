/* ============================================================
   trustC — Admin panel
   ------------------------------------------------------------
   Admin sees:
   1. Users management — list all users, approve PENDING ones,
      enable/disable existing ones
   2. System settings — toggle platform registration, RBAC opts
   3. Overview — cross-persona summary (all startups + all VC
      data + all audit data in one place)
   ============================================================ */

const { useState: useStateAdmin } = React;

/* ============================================================
   SCREEN: مدیریت کاربران
   ============================================================ */
function AdminUsers({ ctx }) {
  const [users, setUsers] = useStateAdmin(window.trustcData.users);
  const [filter, setFilter] = useStateAdmin("ALL");
  const [confirming, setConfirming] = useStateAdmin(null); // {action, user}

  const filtered = filter === "ALL" ? users
    : filter === "PENDING" ? users.filter(u => u.status === "PENDING")
    : filter === "ACTIVE"  ? users.filter(u => u.status === "ACTIVE")
    : filter === "DISABLED"? users.filter(u => u.status === "DISABLED")
    : users.filter(u => u.role === filter);

  function setStatus(u, status) {
    setUsers(list => list.map(x => x.id === u.id ? { ...x, status } : x));
    window.trustcData.users = window.trustcData.users.map(x => x.id === u.id ? { ...x, status } : x);
    ctx.toast({
      tone: status === "ACTIVE" ? "good" : status === "DISABLED" ? "bad" : "neutral",
      msg: `وضعیت ${u.name} به ${status === "ACTIVE" ? "فعال" : status === "DISABLED" ? "غیرفعال" : "در انتظار"} تغییر کرد`
    });
    setConfirming(null);
  }

  const stats = {
    pending: users.filter(u => u.status === "PENDING").length,
    active:  users.filter(u => u.status === "ACTIVE").length,
    disabled:users.filter(u => u.status === "DISABLED").length,
  };

  return (
    <div className="stack" style={{ gap: "var(--s-6)" }}>
      <header>
        <div className="eyebrow">مدیریت سیستم · کاربران</div>
        <h1>کاربران پلتفرم</h1>
        <p className="muted" style={{ marginTop: 4 }}>
          تأیید ثبت‌نام‌های جدید و کنترل دسترسی کاربران موجود
        </p>
      </header>

      <section className="grid stat-grid">
        <Stat label="کل کاربران" value={window.tc.toFaDigits(users.length)} unit="حساب" />
        <Stat label="در انتظار تأیید" value={window.tc.toFaDigits(stats.pending)} unit="مورد"
          delta={stats.pending > 0 ? { text: "⚠ نیاز به اقدام", tone: "down" } : null} />
        <Stat label="فعال" value={window.tc.toFaDigits(stats.active)} unit="حساب" />
        <Stat label="غیرفعال" value={window.tc.toFaDigits(stats.disabled)} unit="حساب" />
      </section>

      <div className="row wrap" style={{ gap: 8 }}>
        {[
          ["ALL", "همه"],
          ["PENDING", "در انتظار"],
          ["ACTIVE", "فعال"],
          ["DISABLED", "غیرفعال"],
          ["FOUNDER", "بنیان‌گذار"],
          ["VC", "VC"],
          ["AUDITOR", "ممیز"],
          ["ADMIN", "ادمین"],
        ].map(([k,l]) => (
          <button key={k} onClick={() => setFilter(k)}
            className={"btn btn--sm " + (filter === k ? "btn--secondary" : "btn--ghost")}
            style={{ border: "1px solid var(--border-hairline)" }}>
            {l}
          </button>
        ))}
      </div>

      <div className="card responsive-table-card" style={{ padding: 0 }}>
        <table className="table">
          <thead>
            <tr>
              <th>کاربر</th>
              <th>شرکت</th>
              <th>نقش</th>
              <th>وضعیت</th>
              <th>عضویت</th>
              <th>آخرین ورود</th>
              <th>اقدام</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u.id} style={{ cursor: "default" }}>
                <td>
                  <div style={{ fontWeight: 500 }}>{u.name}</div>
                  <div className="muted mono" style={{ fontSize: 11 }}>{u.email}</div>
                </td>
                <td>{u.company}</td>
                <td>
                  <span className="chip" data-tone={
                    u.role === "ADMIN" ? "bad" :
                    u.role === "VC" ? "active" :
                    u.role === "AUDITOR" ? "warn" : "good"
                  }><span className="mono">{u.role}</span></span>
                </td>
                <td>
                  <span className="chip" data-tone={
                    u.status === "ACTIVE" ? "good" :
                    u.status === "PENDING" ? "warn" : "bad"
                  }><span className="mono">{u.status}</span></span>
                </td>
                <td className="mono muted" style={{ fontSize: 12 }}>{window.tc.toFaDigits(u.joinedAt)}</td>
                <td className="mono muted" style={{ fontSize: 11 }}>{u.lastLogin ? window.tc.toFaDigits(u.lastLogin) : "—"}</td>
                <td>
                  <div className="row" style={{ gap: 4 }}>
                    {u.status === "PENDING" && (
                      <>
                        <Btn variant="secondary" size="sm" icon={<Icon.check />}
                          onClick={() => setConfirming({ action: "approve", user: u })}>تأیید</Btn>
                        <Btn variant="ghost" size="sm" icon={<Icon.x />}
                          onClick={() => setConfirming({ action: "reject", user: u })}>رد</Btn>
                      </>
                    )}
                    {u.status === "ACTIVE" && u.role !== "ADMIN" && (
                      <Btn variant="ghost" size="sm"
                        onClick={() => setConfirming({ action: "disable", user: u })}>غیرفعال</Btn>
                    )}
                    {u.status === "DISABLED" && (
                      <Btn variant="secondary" size="sm" icon={<Icon.check />}
                        onClick={() => setStatus(u, "ACTIVE")}>فعال‌سازی</Btn>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7}><div className="empty"><h3>کاربری یافت نشد</h3><div>فیلتر را تغییر دهید.</div></div></td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={!!confirming} onClose={() => setConfirming(null)}
        title={
          confirming?.action === "approve" ? "تأیید نهایی کاربر" :
          confirming?.action === "reject"  ? "رد درخواست" :
          "غیرفعال‌سازی حساب"
        }
        footer={
          <>
            <Btn variant="ghost" onClick={() => setConfirming(null)}>انصراف</Btn>
            <Btn variant={confirming?.action === "approve" ? "primary" : "danger"}
              onClick={() => setStatus(
                confirming.user,
                confirming.action === "approve" ? "ACTIVE" :
                confirming.action === "reject"  ? "DISABLED" : "DISABLED"
              )}>
              {confirming?.action === "approve" ? "تأیید و فعال‌سازی" :
               confirming?.action === "reject"  ? "رد درخواست" : "غیرفعال‌سازی"}
            </Btn>
          </>
        }>
        {confirming && (
          <div>
            <p style={{ marginBottom: 12 }}>
              کاربر <b>{confirming.user.name}</b> ({confirming.user.email}) با نقش{" "}
              <span className="mono">{confirming.user.role}</span>:
            </p>
            <p className="muted" style={{ fontSize: 13 }}>
              {confirming.action === "approve" && "پس از تأیید، کاربر می‌تواند به سیستم وارد شود و به ماژول‌های مربوط به نقش خود دسترسی داشته باشد."}
              {confirming.action === "reject"  && "درخواست ثبت‌نام رد می‌شود و حساب در وضعیت DISABLED قرار می‌گیرد."}
              {confirming.action === "disable" && "تمام دسترسی‌های کاربر به سیستم متوقف می‌شود."}
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}

/* ============================================================
   SCREEN: تنظیمات سیستم
   ============================================================ */
function AdminSettings({ ctx }) {
  const [settings, setSettings] = useStateAdmin(window.trustcData.systemSettings);

  function update(k, v) {
    const next = { ...settings, [k]: v };
    setSettings(next);
    window.trustcData.systemSettings = next;
    ctx.toast({ tone: "good", msg: "تنظیمات سیستم به‌روز شد" });
  }

  return (
    <div className="stack" style={{ gap: "var(--s-6)" }}>
      <header>
        <div className="eyebrow">مدیریت سیستم · تنظیمات</div>
        <h1>تنظیمات پلتفرم</h1>
        <p className="muted" style={{ marginTop: 4 }}>
          کنترل دسترسی عمومی و قواعد امنیتی پلتفرم
        </p>
      </header>

      <div className="card">
        <h3 style={{ marginBottom: 16 }}>دسترسی عمومی</h3>
        <SettingRow
          title="ثبت‌نام عمومی"
          desc="در صورت غیرفعال بودن، صفحه ثبت‌نام برای کاربران جدید نمایش داده نمی‌شود. حساب‌های جدید فقط توسط ادمین قابل ایجاد هستند."
          control={
            <Toggle value={settings.registrationEnabled}
              onChange={v => update("registrationEnabled", v)} />
          }
        />
        <SettingRow
          title="احراز هویت دومرحله‌ای"
          desc="تمام کاربران در ورود ملزم به استفاده از کد یک‌بارمصرف می‌شوند."
          control={
            <Toggle value={settings.twoFactorRequired}
              onChange={v => update("twoFactorRequired", v)} />
          }
        />
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 16 }}>تأیید کاربران</h3>
        <SettingRow
          title="نقش‌های نیازمند تأیید ادمین"
          desc="انتخاب کنید که کدام نقش‌ها در ثبت‌نام نیاز به تأیید ادمین دارند. ADMIN همیشه دستی ایجاد می‌شود."
          control={
            <div className="row wrap" style={{ gap: 8, justifyContent: "flex-end" }}>
              {["FOUNDER","VC","AUDITOR"].map(role => {
                const checked = settings.requireApprovalForRoles.includes(role);
                return (
                  <button key={role}
                    className={"btn btn--sm " + (checked ? "btn--secondary" : "btn--ghost")}
                    style={{ border: "1px solid var(--border-hairline)" }}
                    onClick={() => {
                      const next = checked
                        ? settings.requireApprovalForRoles.filter(r => r !== role)
                        : [...settings.requireApprovalForRoles, role];
                      update("requireApprovalForRoles", next);
                    }}>
                    <span className="mono">{role}</span>
                    {checked && <Icon.check size={12} />}
                  </button>
                );
              })}
            </div>
          }
        />
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 16 }}>حسابرسی و انطباق</h3>
        <SettingRow
          title="مدت نگهداری لاگ‌های حسابرسی"
          desc="کمترین مدت زمان نگهداری رویدادها در سیستم. مطابق با الزامات مقررات داخلی."
          control={
            <select className="select" style={{ width: 180 }}
              value={settings.auditRetentionDays}
              onChange={e => update("auditRetentionDays", Number(e.target.value))}>
              <option value={365}>۱ سال</option>
              <option value={365 * 3}>۳ سال</option>
              <option value={365 * 7}>۷ سال</option>
              <option value={365 * 10}>۱۰ سال</option>
            </select>
          }
        />
        <SettingRow
          title="حداکثر مهلت لغو فریز"
          desc="پس از این مدت، Kill Switch به‌صورت دستی توسط ادمین قابل لغو نیست و نیاز به سند پشتیبان دارد."
          control={
            <div className="row" style={{ gap: 8 }}>
              <input className="input mono" type="number" min={0} max={720} style={{ width: 100 }}
                value={settings.maxFreezeOverrideHours}
                onChange={e => update("maxFreezeOverrideHours", Number(e.target.value))} />
              <span className="muted">ساعت</span>
            </div>
          }
        />
      </div>

      <div className="card flat" style={{ background: "var(--cream-100)", border: "1px dashed var(--cream-300)" }}>
        <div className="eyebrow" style={{ marginBottom: 6 }}>یادداشت</div>
        <p style={{ margin: 0, fontSize: 14 }}>
          تمام تغییرات در این صفحه در ردپای حسابرسی با نقش <span className="mono">ADMIN</span> ثبت می‌شوند و قابل بازگشت نیستند.
        </p>
      </div>
    </div>
  );
}

function SettingRow({ title, desc, control }) {
  return (
    <div className="setting-row">
      <div className="setting-text">
        <div style={{ fontWeight: 600 }}>{title}</div>
        <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>{desc}</div>
      </div>
      <div className="setting-control">{control}</div>
    </div>
  );
}

function Toggle({ value, onChange }) {
  return (
    <button onClick={() => onChange(!value)}
      style={{
        width: 44, height: 24, border: 0, padding: 0, cursor: "pointer",
        borderRadius: 999,
        background: value ? "var(--state-good)" : "var(--ink-300)",
        position: "relative", transition: "background var(--dur-2) var(--ease-document)",
      }}>
      <span style={{
        position: "absolute", top: 2,
        insetInlineStart: value ? 22 : 2,
        width: 20, height: 20, background: "#fff", borderRadius: "50%",
        transition: "inset-inline-start var(--dur-2) var(--ease-document)",
        boxShadow: "var(--shadow-1)",
      }} />
    </button>
  );
}

/* ============================================================
   SCREEN: نمای کلی ادمین
   ------------------------------------------------------------
   Cross-persona summary. Shows everything: portfolio + users +
   recent activity + system health.
   ============================================================ */
function AdminOverview({ ctx }) {
  const users = window.trustcData.users;
  const startups = window.trustcData.startups;
  const audit = window.trustcData.auditLog;
  const settings = window.trustcData.systemSettings;
  const pendingCount = users.filter(u => u.status === "PENDING").length;
  const frozenCount = startups.filter(s => s.frozen || ctx.frozenIds.has(s.id)).length;

  return (
    <div className="stack" style={{ gap: "var(--s-6)" }}>
      <header style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "var(--s-6)", alignItems: "end" }}>
        <div>
          <div className="eyebrow">مدیریت سیستم · نمای کلی</div>
          <h1>کنسول ادمین</h1>
          <p className="muted" style={{ marginTop: 4, maxWidth: 640 }}>
            دید کلی به وضعیت پلتفرم. کاربران، صندوق‌ها، استارتاپ‌ها و فعالیت‌های اخیر در یک نگاه.
          </p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          {pendingCount > 0 && (
            <Btn variant="primary" icon={<Icon.alert />} onClick={() => ctx.setRoute("admin-users")}>
              {window.tc.toFaDigits(pendingCount)} درخواست در انتظار
            </Btn>
          )}
        </div>
      </header>

      <section className="grid stat-grid">
        <Stat label="کاربران فعال" value={window.tc.toFaDigits(users.filter(u => u.status === "ACTIVE").length)} unit="حساب"
          delta={pendingCount > 0 ? { text: `+${window.tc.toFaDigits(pendingCount)} در انتظار`, tone: "" } : null} />
        <Stat label="استارتاپ‌ها" value={window.tc.toFaDigits(startups.length)} unit="شرکت"
          delta={{ text: `${window.tc.toFaDigits(frozenCount)} فریزشده`, tone: frozenCount > 0 ? "down" : "up" }} />
        <Stat label="رویدادهای ۲۴ ساعته" value={window.tc.toFaDigits(audit.length)} unit="مورد" />
        <Stat label="وضعیت ثبت‌نام عمومی" value={settings.registrationEnabled ? "باز" : "بسته"}
          delta={{ text: settings.registrationEnabled ? "کاربران جدید مجاز" : "فقط با ادمین", tone: settings.registrationEnabled ? "up" : "" }} />
      </section>

      <section className="grid two-col-shrink">
        {/* Pending registrations preview */}
        <div className="card">
          <div className="card-title">
            <h3>درخواست‌های ثبت‌نام در انتظار</h3>
            <Btn variant="ghost" size="sm" onClick={() => ctx.setRoute("admin-users")}>مشاهده همه ←</Btn>
          </div>
          {pendingCount === 0 ? (
            <div className="empty"><h3>درخواست بازی نیست</h3><div className="muted">همه ثبت‌نام‌ها رسیدگی شده‌اند.</div></div>
          ) : (
            <div className="stack" style={{ gap: 8 }}>
              {users.filter(u => u.status === "PENDING").map(u => (
                <div key={u.id} className="row" style={{ justifyContent: "space-between", padding: 12, border: "1px solid var(--border-hairline)", borderRadius: 4, flexWrap: "wrap", gap: 12 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 500 }}>{u.name}</div>
                    <div className="muted" style={{ fontSize: 12 }}>{u.email} · {u.company}</div>
                  </div>
                  <div className="row" style={{ gap: 8 }}>
                    <span className="chip" data-tone={u.role === "VC" ? "active" : u.role === "AUDITOR" ? "warn" : "good"}>
                      <span className="mono">{u.role}</span>
                    </span>
                    <Btn variant="secondary" size="sm" icon={<Icon.check />} onClick={() => {
                      window.trustcData.users = window.trustcData.users.map(x => x.id === u.id ? { ...x, status: "ACTIVE" } : x);
                      ctx.forceRefresh();
                      ctx.toast({ tone: "good", msg: `${u.name} تأیید شد` });
                    }}>تأیید</Btn>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent audit activity */}
        <div className="card">
          <div className="card-title">
            <h3>فعالیت‌های اخیر</h3>
            <span className="muted mono" style={{ fontSize: 11 }}>دیده زنده</span>
          </div>
          <div className="stack" style={{ gap: 10 }}>
            {audit.slice(0, 6).map(l => (
              <div key={l.id} style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 12, paddingBottom: 10, borderBottom: "1px dashed var(--border-hairline)" }}>
                <span className="chip" data-tone={
                  l.actorRole === "VC" ? "active" :
                  l.actorRole === "SYSTEM" ? "neutral" :
                  l.actorRole === "FOUNDER" ? "good" : "warn"
                } style={{ alignSelf: "start" }}>
                  <span className="mono">{l.actorRole}</span>
                </span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 500, fontSize: 13 }} className="mono">{l.action}</div>
                  <div className="muted" style={{ fontSize: 12 }}>{l.actor} · {l.target || "—"}</div>
                  <div className="mono muted" style={{ fontSize: 10, marginTop: 2 }}>{window.tc.toFaDigits(l.at)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Portfolio shortcuts — admin sees everyone's data */}
      <div className="card">
        <div className="card-title">
          <h3>پورتفولیو کامل (دیدگاه ادمین)</h3>
          <div className="muted" style={{ fontSize: 12 }}>{window.tc.toFaDigits(startups.length)} استارتاپ</div>
        </div>
        <div className="grid heat-grid">
          {startups.map(s => {
            const isFrozen = s.frozen || ctx.frozenIds.has(s.id);
            return (
              <div key={s.id} className="heat-cell" data-risk={isFrozen ? "frozen" : s.risk}>
                <div>
                  <div className="row" style={{ justifyContent: "space-between" }}>
                    <span style={{ fontWeight: 600 }}>{s.name}</span>
                    <span className="muted mono" style={{ fontSize: 11 }}>{s.code}</span>
                  </div>
                  <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{s.industry}</div>
                  <div className="muted mono" style={{ fontSize: 11, marginTop: 6 }}>
                    اعتبار {window.tc.toFaDigits(s.creditScore)} · runway {window.tc.toFaDigits(s.runway)} ماه
                  </div>
                </div>
                <span className="chip" data-tone={
                  isFrozen ? "bad" : s.risk === "low" ? "good" : s.risk === "medium" ? "warn" : "bad"
                }>
                  <span className="mono">{isFrozen ? "FROZEN" : s.risk.toUpperCase()}</span>
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { AdminOverview, AdminUsers, AdminSettings });

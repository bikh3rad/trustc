/* ============================================================
   trustC — Auth screens (Login + Register)
   ------------------------------------------------------------
   Pre-app screens that wrap the entire application. When the
   user is not authenticated, App renders <Login> or <Register>
   instead of the main shell.

   For Claude Code:
   - In real backend: POST /auth/login → { token, user }
   - POST /auth/register → { user: { ..., status: "PENDING" } }
   - System settings.registrationEnabled gates the register page.
   ============================================================ */

const { useState: useStateAuth } = React;

/* ---------------- Shared full-screen layout ---------------- */
function AuthLayout({ children, tagline }) {
  return (
    <div className="auth-shell">
      {/* Editorial left panel */}
      <aside className="auth-aside">
        <div className="auth-brand">
          <div className="brand-mark">tC</div>
          <div>
            <div className="brand-name">trustC</div>
            <div style={{ fontSize: 11, color: "var(--fg-on-manifest-muted)", letterSpacing: "0.08em", marginTop: 2 }}>
              سیستم‌عامل مالی استارتاپ‌ها
            </div>
          </div>
        </div>

        <div className="auth-editorial">
          <div className="eyebrow" style={{ color: "var(--orange-500)", marginBottom: 16 }}>FINANCIAL OPERATING SYSTEM</div>
          <h1 style={{ fontSize: "var(--t-3xl)", lineHeight: 1.15, color: "var(--cream-50)", marginBottom: 16 }}>
            سرمایه‌ای که نمی‌خوابد.
          </h1>
          <p style={{ color: "var(--fg-on-manifest-muted)", fontSize: 15, lineHeight: 1.8, marginBottom: 24 }}>
            {tagline || "trustC نقدینگی پراکنده پورتفوی شما را به سرمایه‌ای در گردش، قابل‌اهرم‌گیری و قابل‌حسابرسی تبدیل می‌کند."}
          </p>
          <div className="row" style={{ gap: 24, marginTop: 32 }}>
            <Stat2 label="ضریب اهرم" value="۴.۲×" />
            <Stat2 label="استارتاپ تحت پوشش" value="۷" />
            <Stat2 label="در اسکرو" value="۲٫۸ هزار میلیارد ریال" />
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--mono-data)", fontSize: 11, color: "var(--fg-on-manifest-muted)", letterSpacing: "0.06em" }}>
          <span>v۰.۹.۰ · MVP</span>
          <span>{new Date().toLocaleDateString("fa-IR")}</span>
        </div>
      </aside>

      <main className="auth-main">
        {children}
      </main>
    </div>
  );
}

function Stat2({ label, value }) {
  return (
    <div>
      <div className="eyebrow" style={{ color: "var(--orange-500)", marginBottom: 4 }}>{label}</div>
      <div className="mono" style={{ fontWeight: 700, fontSize: 18, color: "var(--cream-50)" }}>{value}</div>
    </div>
  );
}

/* ---------------- Login screen ---------------- */
function Login({ onAuth, onGoRegister, registrationEnabled }) {
  const [form, setForm] = useStateAuth({ email: "founder@alpha.io", password: "demo1234" });
  const [errors, setErrors] = useStateAuth({});
  const [submitting, setSubmitting] = useStateAuth(false);

  function submit(e) {
    e?.preventDefault();
    const err = {};
    if (!form.email || !form.email.includes("@")) err.email = "ایمیل معتبر وارد کنید";
    if (!form.password || form.password.length < 6) err.password = "رمز عبور حداقل ۶ نویسه";
    setErrors(err);
    if (Object.keys(err).length) return;

    setSubmitting(true);
    setTimeout(() => {
      // Match against mock users by email
      const user = window.trustcData.users.find(u => u.email === form.email);
      if (!user) {
        setErrors({ email: "کاربری با این ایمیل یافت نشد" });
        setSubmitting(false);
        return;
      }
      if (user.status === "PENDING") {
        setErrors({ email: "حساب شما در انتظار تأیید مدیر سیستم است" });
        setSubmitting(false);
        return;
      }
      if (user.status === "DISABLED") {
        setErrors({ email: "حساب شما غیرفعال شده است" });
        setSubmitting(false);
        return;
      }
      onAuth(user);
    }, 650);
  }

  return (
    <AuthLayout tagline="trustC نقدینگی پراکنده پورتفوی شما را به سرمایه‌ای در گردش، قابل‌اهرم‌گیری و قابل‌حسابرسی تبدیل می‌کند.">
      <div className="auth-card">
        <div className="eyebrow">ورود به سیستم</div>
        <h2 style={{ fontSize: "var(--t-2xl)", marginTop: 8, marginBottom: 4 }}>خوش آمدید</h2>
        <p className="muted" style={{ marginBottom: 24 }}>برای ورود اطلاعات حساب خود را وارد کنید.</p>

        <form onSubmit={submit} className="stack" style={{ gap: 16 }}>
          <div className="field">
            <label className="field-label">ایمیل</label>
            <input className="input" type="email" autoFocus
              aria-invalid={!!errors.email}
              value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            {errors.email && <div className="field-error">{errors.email}</div>}
          </div>
          <div className="field">
            <label className="field-label">رمز عبور</label>
            <input className="input" type="password"
              aria-invalid={!!errors.password}
              value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
            {errors.password && <div className="field-error">{errors.password}</div>}
          </div>

          <button type="submit" className="btn btn--primary" disabled={submitting}
            style={{ justifyContent: "center", padding: "12px 16px", marginTop: 8 }}>
            {submitting ? "در حال ورود…" : "ورود به سیستم"}
          </button>

          {registrationEnabled && (
            <div style={{ textAlign: "center", marginTop: 8, fontSize: 13, color: "var(--fg-muted)" }}>
              حساب ندارید؟{" "}
              <a href="#" onClick={e => { e.preventDefault(); onGoRegister(); }}>ثبت‌نام</a>
            </div>
          )}
        </form>

        <div className="divider" />

        <div className="eyebrow" style={{ marginBottom: 8 }}>حساب‌های دموی این پروتوتایپ</div>
        <div className="stack" style={{ gap: 6, fontSize: 12 }}>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <span className="mono muted">founder@alpha.io</span>
            <span className="chip" data-tone="good"><span className="mono">FOUNDER</span></span>
          </div>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <span className="mono muted">vc@trustc.io</span>
            <span className="chip" data-tone="active"><span className="mono">VC</span></span>
          </div>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <span className="mono muted">auditor@trustc.io</span>
            <span className="chip" data-tone="warn"><span className="mono">AUDITOR</span></span>
          </div>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <span className="mono muted">admin@trustc.io</span>
            <span className="chip" data-tone="bad"><span className="mono">ADMIN</span></span>
          </div>
          <div className="muted faint" style={{ marginTop: 8 }}>رمز عبور همه: <span className="mono">demo1234</span></div>
        </div>
      </div>
    </AuthLayout>
  );
}

/* ---------------- Register screen ---------------- */
function Register({ onRegister, onGoLogin, registrationEnabled }) {
  const [form, setForm] = useStateAuth({
    name: "", email: "", password: "", confirm: "",
    company: "", role: "FOUNDER",
  });
  const [errors, setErrors] = useStateAuth({});
  const [submitted, setSubmitted] = useStateAuth(false);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  function submit(e) {
    e?.preventDefault();
    const err = {};
    if (!form.name || form.name.length < 3) err.name = "نام معتبر وارد کنید";
    if (!form.email || !form.email.includes("@")) err.email = "ایمیل معتبر وارد کنید";
    if (window.trustcData.users.some(u => u.email === form.email)) err.email = "این ایمیل قبلاً ثبت شده";
    if (!form.password || form.password.length < 6) err.password = "رمز عبور حداقل ۶ نویسه";
    if (form.password !== form.confirm) err.confirm = "تکرار رمز مطابقت ندارد";
    if (!form.company) err.company = "نام شرکت الزامی است";
    setErrors(err);
    if (Object.keys(err).length) return;
    onRegister({ ...form, status: "PENDING" });
    setSubmitted(true);
  }

  if (!registrationEnabled) {
    return (
      <AuthLayout tagline="ثبت‌نام عمومی پلتفرم در حال حاضر بسته است.">
        <div className="auth-card">
          <div className="eyebrow">ثبت‌نام</div>
          <h2 style={{ fontSize: "var(--t-2xl)", marginTop: 8, marginBottom: 4 }}>ثبت‌نام در حال حاضر بسته است</h2>
          <p className="muted" style={{ marginBottom: 16 }}>
            مدیر سیستم ثبت‌نام عمومی را موقتاً غیرفعال کرده است. برای دسترسی به پلتفرم با مدیر تماس بگیرید.
          </p>
          <button className="btn btn--secondary" onClick={onGoLogin} style={{ width: "100%", justifyContent: "center" }}>
            بازگشت به صفحه ورود
          </button>
        </div>
      </AuthLayout>
    );
  }

  if (submitted) {
    return (
      <AuthLayout>
        <div className="auth-card">
          <div className="eyebrow" style={{ color: "var(--state-good)" }}>ثبت‌نام موفق</div>
          <h2 style={{ fontSize: "var(--t-2xl)", marginTop: 8, marginBottom: 16 }}>درخواست شما ثبت شد</h2>
          <div className="card flat" style={{ background: "var(--state-warn-bg)", borderColor: "var(--state-warn)", marginBottom: 16 }}>
            <div className="row" style={{ gap: 12, alignItems: "start" }}>
              <Icon.alert size={20} style={{ color: "var(--state-warn)", flexShrink: 0, marginTop: 2 }} />
              <div>
                <div style={{ fontWeight: 600 }}>در انتظار تأیید مدیر سیستم</div>
                <p style={{ fontSize: 13, marginTop: 4, color: "var(--fg-default)" }}>
                  حساب شما با وضعیت <span className="chip" data-tone="warn"><span className="mono">PENDING</span></span> ساخته شد.
                  پس از تأیید مدیر، ایمیل فعال‌سازی برای شما ارسال خواهد شد.
                </p>
              </div>
            </div>
          </div>
          <button className="btn btn--primary" onClick={onGoLogin} style={{ width: "100%", justifyContent: "center" }}>
            بازگشت به صفحه ورود
          </button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="auth-card" style={{ maxWidth: 480 }}>
        <div className="eyebrow">ثبت‌نام در trustC</div>
        <h2 style={{ fontSize: "var(--t-2xl)", marginTop: 8, marginBottom: 4 }}>ساخت حساب جدید</h2>
        <p className="muted" style={{ marginBottom: 20, fontSize: 13 }}>
          پس از ثبت، حساب شما تا تأیید مدیر در وضعیت PENDING می‌ماند.
        </p>

        <form onSubmit={submit} className="stack" style={{ gap: 14 }}>
          <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div className="field">
              <label className="field-label">نام و نام خانوادگی</label>
              <input className="input" aria-invalid={!!errors.name}
                value={form.name} onChange={e => set("name", e.target.value)} />
              {errors.name && <div className="field-error">{errors.name}</div>}
            </div>
            <div className="field">
              <label className="field-label">نام شرکت</label>
              <input className="input" aria-invalid={!!errors.company}
                value={form.company} onChange={e => set("company", e.target.value)} />
              {errors.company && <div className="field-error">{errors.company}</div>}
            </div>
          </div>

          <div className="field">
            <label className="field-label">ایمیل</label>
            <input className="input" type="email" aria-invalid={!!errors.email}
              value={form.email} onChange={e => set("email", e.target.value)} />
            {errors.email && <div className="field-error">{errors.email}</div>}
          </div>

          <div className="field">
            <label className="field-label">نقش</label>
            <div className="seg" style={{ width: "100%" }}>
              {[["FOUNDER","بنیان‌گذار"],["VC","سرمایه‌گذار"],["AUDITOR","ممیز"]].map(([k,l]) => (
                <button key={k} type="button" className={form.role === k ? "active" : ""}
                  style={{ flex: 1 }}
                  onClick={() => set("role", k)}>{l}</button>
              ))}
            </div>
            <div className="field-hint">برای دسترسی ADMIN با مدیر سیستم تماس بگیرید.</div>
          </div>

          <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div className="field">
              <label className="field-label">رمز عبور</label>
              <input className="input" type="password" aria-invalid={!!errors.password}
                value={form.password} onChange={e => set("password", e.target.value)} />
              {errors.password && <div className="field-error">{errors.password}</div>}
            </div>
            <div className="field">
              <label className="field-label">تکرار رمز</label>
              <input className="input" type="password" aria-invalid={!!errors.confirm}
                value={form.confirm} onChange={e => set("confirm", e.target.value)} />
              {errors.confirm && <div className="field-error">{errors.confirm}</div>}
            </div>
          </div>

          <button type="submit" className="btn btn--primary"
            style={{ justifyContent: "center", padding: "12px 16px", marginTop: 8 }}>
            ساخت حساب
          </button>

          <div style={{ textAlign: "center", marginTop: 4, fontSize: 13, color: "var(--fg-muted)" }}>
            قبلاً ثبت‌نام کرده‌اید؟{" "}
            <a href="#" onClick={e => { e.preventDefault(); onGoLogin(); }}>ورود</a>
          </div>
        </form>
      </div>
    </AuthLayout>
  );
}

Object.assign(window, { Login, Register, AuthLayout });

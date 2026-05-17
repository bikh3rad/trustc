// Login screen — ported from hi-fi/src/auth-screens.jsx → Login.
// Calls AuthContext.login(); shows server-side errors (e.g. ACCOUNT_PENDING,
// INVALID_CREDENTIALS) inline on the email field as the prototype does.
import { useEffect, useState } from "react";
import { Auth, ApiHttpError } from "../../api";
import { useAuth } from "../../context/AuthContext";
import { AuthLayout } from "./AuthLayout";

type Props = {
  onGoRegister: () => void;
};

type FormState = { email: string; password: string };
type ErrorState = Partial<Record<keyof FormState, string>>;

export function Login({ onGoRegister }: Props) {
  // Defaults match the prototype so demo flows still work in one click.
  const [form, setForm] = useState<FormState>({
    email: "founder@alpha.io",
    password: "demo1234",
  });
  const [errors, setErrors] = useState<ErrorState>({});
  const [submitting, setSubmitting] = useState(false);
  const [registrationEnabled, setRegistrationEnabled] = useState<boolean>(true);
  const { login } = useAuth();

  // We don't render the "ثبت‌نام" link if registration is disabled, so the
  // user isn't dropped onto a closed-signup page from this screen.
  useEffect(() => {
    Auth.registrationStatus()
      .then((s) => setRegistrationEnabled(s.enabled))
      .catch(() => setRegistrationEnabled(true));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const err: ErrorState = {};
    if (!form.email || !form.email.includes("@")) err.email = "ایمیل معتبر وارد کنید";
    if (!form.password || form.password.length < 6)
      err.password = "رمز عبور حداقل ۶ نویسه";
    setErrors(err);
    if (Object.keys(err).length) return;

    setSubmitting(true);
    try {
      await login(form.email, form.password);
      // AuthGate will unmount this component once status flips to authenticated.
    } catch (e) {
      const code = e instanceof ApiHttpError ? e.code : "";
      const msg = e instanceof Error ? e.message : "ورود ناموفق";
      if (code === "ACCOUNT_PENDING") {
        setErrors({ email: "حساب شما در انتظار تأیید مدیر سیستم است" });
      } else if (code === "ACCOUNT_DISABLED") {
        setErrors({ email: "حساب شما غیرفعال شده است" });
      } else {
        setErrors({ email: msg });
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout tagline="trustC نقدینگی پراکنده پورتفوی شما را به سرمایه‌ای در گردش، قابل‌اهرم‌گیری و قابل‌حسابرسی تبدیل می‌کند.">
      <div className="auth-card">
        <div className="eyebrow">ورود به سیستم</div>
        <h2 style={{ fontSize: "var(--t-2xl)", marginTop: 8, marginBottom: 4 }}>
          خوش آمدید
        </h2>
        <p className="muted" style={{ marginBottom: 24 }}>
          برای ورود اطلاعات حساب خود را وارد کنید.
        </p>

        <form onSubmit={submit} className="stack" style={{ gap: 16 }}>
          <div className="field">
            <label className="field-label">ایمیل</label>
            <input
              className="input"
              type="email"
              autoFocus
              aria-invalid={!!errors.email}
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
            {errors.email && <div className="field-error">{errors.email}</div>}
          </div>
          <div className="field">
            <label className="field-label">رمز عبور</label>
            <input
              className="input"
              type="password"
              aria-invalid={!!errors.password}
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            />
            {errors.password && <div className="field-error">{errors.password}</div>}
          </div>

          <button
            type="submit"
            className="btn btn--primary"
            disabled={submitting}
            style={{ justifyContent: "center", padding: "12px 16px", marginTop: 8 }}
          >
            {submitting ? "در حال ورود…" : "ورود به سیستم"}
          </button>

          {registrationEnabled && (
            <div
              style={{
                textAlign: "center",
                marginTop: 8,
                fontSize: 13,
                color: "var(--fg-muted)",
              }}
            >
              حساب ندارید؟{" "}
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  onGoRegister();
                }}
              >
                ثبت‌نام
              </a>
            </div>
          )}
        </form>

        <div className="divider" />

        <div className="eyebrow" style={{ marginBottom: 8 }}>
          حساب‌های دموی این پروتوتایپ
        </div>
        <div className="stack" style={{ gap: 6, fontSize: 12 }}>
          <DemoRow email="founder@alpha.io" role="FOUNDER" tone="good" />
          <DemoRow email="vc@trustc.io" role="VC" tone="active" />
          <DemoRow email="auditor@trustc.io" role="AUDITOR" tone="warn" />
          <DemoRow email="admin@trustc.io" role="ADMIN" tone="bad" />
          <div className="muted faint" style={{ marginTop: 8 }}>
            رمز عبور همه: <span className="mono">demo1234</span>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}

function DemoRow({
  email,
  role,
  tone,
}: {
  email: string;
  role: string;
  tone: "good" | "active" | "warn" | "bad";
}) {
  return (
    <div className="row" style={{ justifyContent: "space-between" }}>
      <span className="mono muted">{email}</span>
      <span className="chip" data-tone={tone}>
        <span className="mono">{role}</span>
      </span>
    </div>
  );
}

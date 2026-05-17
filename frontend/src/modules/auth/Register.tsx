// Register screen — ported from hi-fi/src/auth-screens.jsx → Register.
//
// Three terminal states this screen can render:
//   1. registration_enabled = false → "closed" panel
//   2. submitted successfully → PENDING confirmation panel
//   3. normal form
//
// We check registration-status on mount; the server is the source of truth.
import { useEffect, useState } from "react";
import { Auth, ApiHttpError, type Role } from "../../api";
import { useAuth } from "../../context/AuthContext";
import { Icon } from "../../components/ui/Icon";
import { AuthLayout } from "./AuthLayout";

type RegisterableRole = Exclude<Role, "ADMIN">;

type FormState = {
  name: string;
  email: string;
  password: string;
  confirm: string;
  company: string;
  role: RegisterableRole;
};

type ErrorState = Partial<Record<keyof FormState | "_form", string>>;

type Props = {
  onGoLogin: () => void;
};

export function Register({ onGoLogin }: Props) {
  const { register } = useAuth();
  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    password: "",
    confirm: "",
    company: "",
    role: "FOUNDER",
  });
  const [errors, setErrors] = useState<ErrorState>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [registrationEnabled, setRegistrationEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    Auth.registrationStatus()
      .then((s) => setRegistrationEnabled(s.enabled))
      .catch(() => setRegistrationEnabled(true));
  }, []);

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const err: ErrorState = {};
    if (!form.name || form.name.length < 3) err.name = "نام معتبر وارد کنید";
    if (!form.email || !form.email.includes("@")) err.email = "ایمیل معتبر وارد کنید";
    if (!form.password || form.password.length < 6)
      err.password = "رمز عبور حداقل ۶ نویسه";
    if (form.password !== form.confirm) err.confirm = "تکرار رمز مطابقت ندارد";
    if (!form.company) err.company = "نام شرکت الزامی است";
    setErrors(err);
    if (Object.keys(err).length) return;

    setSubmitting(true);
    try {
      await register({
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role,
        company: form.company,
      });
      setSubmitted(true);
    } catch (e) {
      const code = e instanceof ApiHttpError ? e.code : "";
      const msg = e instanceof Error ? e.message : "ثبت‌نام ناموفق";
      if (code === "EMAIL_TAKEN") {
        setErrors({ email: "این ایمیل قبلاً ثبت شده" });
      } else if (code === "REGISTRATION_DISABLED") {
        setRegistrationEnabled(false);
      } else {
        setErrors({ _form: msg });
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (registrationEnabled === false) {
    return (
      <AuthLayout tagline="ثبت‌نام عمومی پلتفرم در حال حاضر بسته است.">
        <div className="auth-card">
          <div className="eyebrow">ثبت‌نام</div>
          <h2 style={{ fontSize: "var(--t-2xl)", marginTop: 8, marginBottom: 4 }}>
            ثبت‌نام در حال حاضر بسته است
          </h2>
          <p className="muted" style={{ marginBottom: 16 }}>
            مدیر سیستم ثبت‌نام عمومی را موقتاً غیرفعال کرده است. برای دسترسی به
            پلتفرم با مدیر تماس بگیرید.
          </p>
          <button
            className="btn btn--secondary"
            onClick={onGoLogin}
            style={{ width: "100%", justifyContent: "center" }}
          >
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
          <div className="eyebrow" style={{ color: "var(--state-good)" }}>
            ثبت‌نام موفق
          </div>
          <h2 style={{ fontSize: "var(--t-2xl)", marginTop: 8, marginBottom: 16 }}>
            درخواست شما ثبت شد
          </h2>
          <div
            className="card flat"
            style={{
              background: "var(--state-warn-bg)",
              borderColor: "var(--state-warn)",
              marginBottom: 16,
            }}
          >
            <div className="row" style={{ gap: 12, alignItems: "start" }}>
              <Icon.alert
                size={20}
                style={{ color: "var(--state-warn)", flexShrink: 0, marginTop: 2 }}
              />
              <div>
                <div style={{ fontWeight: 600 }}>در انتظار تأیید مدیر سیستم</div>
                <p
                  style={{
                    fontSize: 13,
                    marginTop: 4,
                    color: "var(--fg-default)",
                  }}
                >
                  حساب شما با وضعیت{" "}
                  <span className="chip" data-tone="warn">
                    <span className="mono">PENDING</span>
                  </span>{" "}
                  ساخته شد. پس از تأیید مدیر، می‌توانید وارد سیستم شوید.
                </p>
              </div>
            </div>
          </div>
          <button
            className="btn btn--primary"
            onClick={onGoLogin}
            style={{ width: "100%", justifyContent: "center" }}
          >
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
        <h2 style={{ fontSize: "var(--t-2xl)", marginTop: 8, marginBottom: 4 }}>
          ساخت حساب جدید
        </h2>
        <p className="muted" style={{ marginBottom: 20, fontSize: 13 }}>
          پس از ثبت، حساب شما تا تأیید مدیر در وضعیت PENDING می‌ماند.
        </p>

        <form onSubmit={submit} className="stack" style={{ gap: 14 }}>
          <div className="form-row-2 grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div className="field">
              <label className="field-label">نام و نام خانوادگی</label>
              <input
                className="input"
                aria-invalid={!!errors.name}
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
              />
              {errors.name && <div className="field-error">{errors.name}</div>}
            </div>
            <div className="field">
              <label className="field-label">نام شرکت</label>
              <input
                className="input"
                aria-invalid={!!errors.company}
                value={form.company}
                onChange={(e) => set("company", e.target.value)}
              />
              {errors.company && <div className="field-error">{errors.company}</div>}
            </div>
          </div>

          <div className="field">
            <label className="field-label">ایمیل</label>
            <input
              className="input"
              type="email"
              aria-invalid={!!errors.email}
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
            />
            {errors.email && <div className="field-error">{errors.email}</div>}
          </div>

          <div className="field">
            <label className="field-label">نقش</label>
            <div className="seg" style={{ width: "100%" }}>
              {(
                [
                  ["FOUNDER", "بنیان‌گذار"],
                  ["VC", "سرمایه‌گذار"],
                  ["AUDITOR", "ممیز"],
                ] as Array<[RegisterableRole, string]>
              ).map(([k, l]) => (
                <button
                  key={k}
                  type="button"
                  className={form.role === k ? "active" : ""}
                  style={{ flex: 1 }}
                  onClick={() => set("role", k)}
                >
                  {l}
                </button>
              ))}
            </div>
            <div className="field-hint">
              برای دسترسی ADMIN با مدیر سیستم تماس بگیرید.
            </div>
          </div>

          <div className="form-row-2 grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div className="field">
              <label className="field-label">رمز عبور</label>
              <input
                className="input"
                type="password"
                aria-invalid={!!errors.password}
                value={form.password}
                onChange={(e) => set("password", e.target.value)}
              />
              {errors.password && <div className="field-error">{errors.password}</div>}
            </div>
            <div className="field">
              <label className="field-label">تکرار رمز</label>
              <input
                className="input"
                type="password"
                aria-invalid={!!errors.confirm}
                value={form.confirm}
                onChange={(e) => set("confirm", e.target.value)}
              />
              {errors.confirm && <div className="field-error">{errors.confirm}</div>}
            </div>
          </div>

          {errors._form && (
            <div className="field-error" role="alert">
              {errors._form}
            </div>
          )}

          <button
            type="submit"
            className="btn btn--primary"
            disabled={submitting}
            style={{ justifyContent: "center", padding: "12px 16px", marginTop: 8 }}
          >
            {submitting ? "در حال ثبت…" : "ساخت حساب"}
          </button>

          <div
            style={{
              textAlign: "center",
              marginTop: 4,
              fontSize: 13,
              color: "var(--fg-muted)",
            }}
          >
            قبلاً ثبت‌نام کرده‌اید؟{" "}
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                onGoLogin();
              }}
            >
              ورود
            </a>
          </div>
        </form>
      </div>
    </AuthLayout>
  );
}

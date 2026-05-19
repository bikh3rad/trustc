// Login screen — ported from hi-fi/src/auth-screens.jsx → Login.
// Calls AuthContext.login(); shows server-side errors (e.g. ACCOUNT_PENDING,
// INVALID_CREDENTIALS) inline on the email field as the prototype does.
import { useEffect, useState } from "react";
import { Auth, ApiHttpError, type AuthUser, type Role } from "../../api";
import { useAuth } from "../../context/AuthContext";
import { AuthLayout } from "./AuthLayout";

type Props = {
  onGoRegister: () => void;
};

type FormState = { email: string; password: string };
type ErrorState = Partial<Record<keyof FormState, string>>;

const DEMO_PASSWORD = "demo1234";

const ROLE_TONE: Record<Role, "good" | "active" | "warn" | "bad"> = {
  FOUNDER: "good",
  VC: "active",
  AUDITOR: "warn",
  ADMIN: "bad",
};

export function Login({ onGoRegister }: Props) {
  // Defaults match the prototype so demo flows still work in one click.
  const [form, setForm] = useState<FormState>({
    email: "admin@trustc.io",
    password: DEMO_PASSWORD,
  });
  const [errors, setErrors] = useState<ErrorState>({});
  const [submitting, setSubmitting] = useState(false);
  const [registrationEnabled, setRegistrationEnabled] = useState<boolean>(true);
  const [demoUsers, setDemoUsers] = useState<AuthUser[] | null>(null);
  const { login } = useAuth();

  // We don't render the "ثبت‌نام" link if registration is disabled, so the
  // user isn't dropped onto a closed-signup page from this screen.
  useEffect(() => {
    Auth.registrationStatus()
      .then((s) => setRegistrationEnabled(s.enabled))
      .catch(() => setRegistrationEnabled(true));
    Auth.demoUsers()
      .then((r) => setDemoUsers(r.users))
      .catch(() => setDemoUsers([]));
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

  // Group by role so the long demo roster reads cleanly in RTL.
  const grouped: Record<Role, AuthUser[]> = {
    ADMIN: [],
    VC: [],
    AUDITOR: [],
    FOUNDER: [],
  };
  (demoUsers ?? []).forEach((u) => {
    if (grouped[u.role]) grouped[u.role].push(u);
  });

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
        <div
          className="muted"
          style={{ fontSize: 12, marginBottom: 10 }}
        >
          رمز عبور همه حساب‌ها:{" "}
          <b className="mono" style={{ color: "var(--fg-default)" }}>
            {DEMO_PASSWORD}
          </b>
          {" "}— برای ورود سریع روی نام هر حساب کلیک کنید.
        </div>

        {demoUsers === null && (
          <div className="muted" style={{ fontSize: 12 }}>
            در حال بارگذاری فهرست حساب‌ها…
          </div>
        )}
        {demoUsers !== null && demoUsers.length === 0 && (
          <div className="muted" style={{ fontSize: 12 }}>
            هیچ حسابی پیدا نشد.
          </div>
        )}

        <div
          className="stack"
          style={{ gap: 10, fontSize: 12, maxHeight: 320, overflow: "auto" }}
        >
          {(["ADMIN", "VC", "AUDITOR", "FOUNDER"] as Role[]).map((role) => {
            const list = grouped[role];
            if (!list.length) return null;
            return (
              <div key={role} className="stack" style={{ gap: 4 }}>
                <div
                  className="eyebrow"
                  style={{ fontSize: 10, color: "var(--fg-muted)" }}
                >
                  {labelForRole(role)} ({list.length})
                </div>
                {list.map((u) => (
                  <DemoRow
                    key={u.id}
                    user={u}
                    tone={ROLE_TONE[u.role]}
                    onPick={() =>
                      setForm({ email: u.email, password: DEMO_PASSWORD })
                    }
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </AuthLayout>
  );
}

function labelForRole(r: Role): string {
  switch (r) {
    case "ADMIN":
      return "ادمین";
    case "VC":
      return "سرمایه‌گذار";
    case "AUDITOR":
      return "ممیز";
    case "FOUNDER":
      return "بنیان‌گذار";
  }
}

function DemoRow({
  user,
  tone,
  onPick,
}: {
  user: AuthUser;
  tone: "good" | "active" | "warn" | "bad";
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      className="row"
      style={{
        justifyContent: "space-between",
        alignItems: "center",
        gap: 8,
        padding: "6px 8px",
        border: "1px solid var(--border-hairline)",
        borderRadius: 6,
        background: "transparent",
        cursor: "pointer",
        textAlign: "inherit",
        width: "100%",
      }}
      title="کلیک: پر کردن فرم ورود"
    >
      <div style={{ minWidth: 0 }}>
        <div
          className="mono"
          style={{
            fontSize: 12,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {user.email}
        </div>
        {user.company && (
          <div
            className="muted"
            style={{ fontSize: 11, marginTop: 2 }}
          >
            {user.company}
          </div>
        )}
      </div>
      <div className="row" style={{ gap: 4, flexShrink: 0 }}>
        {user.status !== "ACTIVE" && (
          <span
            className="chip"
            data-tone={user.status === "PENDING" ? "warn" : "bad"}
          >
            <span className="mono">{user.status}</span>
          </span>
        )}
        <span className="chip" data-tone={tone}>
          <span className="mono">{user.role}</span>
        </span>
      </div>
    </button>
  );
}

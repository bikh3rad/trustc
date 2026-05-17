// Admin settings screen — ported from hi-fi/src/admin-screens.jsx → AdminSettings.
//
// Every change calls PATCH /v1/admin/settings, which emits an audit event
// (services/admin → settings_updated). We optimistically update local state
// from the server response so the UI reflects backend-validated values
// (e.g. server caps retention >= 30 days).
import { useEffect, useState } from "react";
import { Admin, type Role, type SystemSettings } from "../../api";
import { Btn } from "../../components/ui/Btn";
import { Icon } from "../../components/ui/Icon";
import { useToast } from "../../context/ToastContext";

const APPROVAL_ROLES: Array<Exclude<Role, "ADMIN">> = ["FOUNDER", "VC", "AUDITOR"];

const RETENTION_OPTIONS = [
  [365, "۱ سال"],
  [365 * 3, "۳ سال"],
  [365 * 7, "۷ سال"],
  [365 * 10, "۱۰ سال"],
] as const;

export function AdminSettings() {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  async function load() {
    try {
      setSettings(await Admin.getSettings());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطای ناشناخته");
    }
  }
  useEffect(() => {
    void load();
  }, []);

  async function update<K extends keyof SystemSettings>(
    key: K,
    value: SystemSettings[K],
  ) {
    if (!settings) return;
    const prior = settings;
    // optimistic
    setSettings({ ...settings, [key]: value });
    setBusy(true);
    try {
      const next = await Admin.patchSettings({ [key]: value } as Partial<SystemSettings>);
      setSettings(next);
      toast({ tone: "good", msg: "تنظیمات سیستم به‌روز شد" });
    } catch (e) {
      setSettings(prior); // rollback
      toast({
        tone: "bad",
        msg: e instanceof Error ? e.message : "خطا در ذخیره تنظیمات",
      });
    } finally {
      setBusy(false);
    }
  }

  if (error) {
    return (
      <div className="card" style={{ borderColor: "var(--state-bad)" }}>
        <h3>خطا در بارگذاری</h3>
        <p className="muted">{error}</p>
        <Btn variant="secondary" onClick={() => void load()}>
          تلاش مجدد
        </Btn>
      </div>
    );
  }
  if (!settings) return <div className="muted">در حال بارگذاری…</div>;

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
            <Toggle
              value={settings.registration_enabled}
              disabled={busy}
              onChange={(v) => void update("registration_enabled", v)}
            />
          }
        />
        <SettingRow
          title="احراز هویت دومرحله‌ای"
          desc="تمام کاربران در ورود ملزم به استفاده از کد یک‌بارمصرف می‌شوند."
          control={
            <Toggle
              value={settings.two_factor_required}
              disabled={busy}
              onChange={(v) => void update("two_factor_required", v)}
            />
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
              {APPROVAL_ROLES.map((role) => {
                const checked = settings.require_approval_for_roles.includes(role);
                return (
                  <button
                    key={role}
                    disabled={busy}
                    className={
                      "btn btn--sm " + (checked ? "btn--secondary" : "btn--ghost")
                    }
                    style={{ border: "1px solid var(--border-hairline)" }}
                    onClick={() => {
                      const next = checked
                        ? settings.require_approval_for_roles.filter(
                            (r) => r !== role,
                          )
                        : [...settings.require_approval_for_roles, role];
                      void update("require_approval_for_roles", next);
                    }}
                  >
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
            <select
              className="select"
              style={{ width: 180 }}
              disabled={busy}
              value={settings.audit_retention_days}
              onChange={(e) =>
                void update("audit_retention_days", Number(e.target.value))
              }
            >
              {RETENTION_OPTIONS.map(([days, label]) => (
                <option key={days} value={days}>
                  {label}
                </option>
              ))}
            </select>
          }
        />
        <SettingRow
          title="حداکثر مهلت لغو فریز"
          desc="پس از این مدت، Kill Switch به‌صورت دستی توسط ادمین قابل لغو نیست و نیاز به سند پشتیبان دارد."
          control={
            <NumberInput
              value={settings.max_freeze_override_hours}
              min={0}
              max={720}
              unit="ساعت"
              disabled={busy}
              onCommit={(v) => void update("max_freeze_override_hours", v)}
            />
          }
        />
      </div>

      <div
        className="card flat"
        style={{
          background: "var(--cream-100)",
          border: "1px dashed var(--cream-300)",
        }}
      >
        <div className="eyebrow" style={{ marginBottom: 6 }}>
          یادداشت
        </div>
        <p style={{ margin: 0, fontSize: 14 }}>
          تمام تغییرات در این صفحه در ردپای حسابرسی با نقش{" "}
          <span className="mono">ADMIN</span> ثبت می‌شوند و قابل بازگشت نیستند.
        </p>
      </div>
    </div>
  );
}

function SettingRow({
  title,
  desc,
  control,
}: {
  title: string;
  desc: string;
  control: React.ReactNode;
}) {
  return (
    <div className="setting-row">
      <div className="setting-text">
        <div style={{ fontWeight: 600 }}>{title}</div>
        <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
          {desc}
        </div>
      </div>
      <div className="setting-control">{control}</div>
    </div>
  );
}

function Toggle({
  value,
  onChange,
  disabled,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={value}
      disabled={disabled}
      onClick={() => onChange(!value)}
      style={{
        width: 44,
        height: 24,
        border: 0,
        padding: 0,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
        borderRadius: 999,
        background: value ? "var(--state-good)" : "var(--ink-300)",
        position: "relative",
        transition: "background var(--dur-2) var(--ease-document)",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 2,
          insetInlineStart: value ? 22 : 2,
          width: 20,
          height: 20,
          background: "#fff",
          borderRadius: "50%",
          transition: "inset-inline-start var(--dur-2) var(--ease-document)",
          boxShadow: "var(--shadow-1)",
        }}
      />
    </button>
  );
}

// Commits only on blur or Enter to avoid hammering PATCH on every keystroke.
function NumberInput({
  value,
  min,
  max,
  unit,
  disabled,
  onCommit,
}: {
  value: number;
  min: number;
  max: number;
  unit: string;
  disabled?: boolean;
  onCommit: (v: number) => void;
}) {
  const [local, setLocal] = useState(String(value));
  useEffect(() => setLocal(String(value)), [value]);

  function commit() {
    const n = Number(local);
    if (!Number.isFinite(n) || n < min || n > max) {
      setLocal(String(value));
      return;
    }
    if (n !== value) onCommit(n);
  }

  return (
    <div className="row" style={{ gap: 8 }}>
      <input
        className="input mono"
        type="number"
        min={min}
        max={max}
        disabled={disabled}
        style={{ width: 100 }}
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
      />
      <span className="muted">{unit}</span>
    </div>
  );
}

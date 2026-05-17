// AuthLayout is the editorial two-pane wrapper shared by Login + Register.
// Ported from hi-fi/src/auth-screens.jsx → AuthLayout.
import type { ReactNode } from "react";
import { toFaDigits } from "../../lib/format";

type Props = {
  children: ReactNode;
  tagline?: string;
};

export function AuthLayout({ children, tagline }: Props) {
  return (
    <div className="auth-shell">
      <aside className="auth-aside">
        <div className="auth-brand">
          <div className="brand-mark">tC</div>
          <div>
            <div className="brand-name">trustC</div>
            <div
              style={{
                fontSize: 11,
                color: "var(--fg-on-manifest-muted)",
                letterSpacing: "0.08em",
                marginTop: 2,
              }}
            >
              سیستم‌عامل مالی استارتاپ‌ها
            </div>
          </div>
        </div>

        <div className="auth-editorial">
          <div
            className="eyebrow"
            style={{ color: "var(--orange-500)", marginBottom: 16 }}
          >
            FINANCIAL OPERATING SYSTEM
          </div>
          <h1
            style={{
              fontSize: "var(--t-3xl)",
              lineHeight: 1.15,
              color: "var(--cream-50)",
              marginBottom: 16,
            }}
          >
            سرمایه‌ای که نمی‌خوابد.
          </h1>
          <p
            style={{
              color: "var(--fg-on-manifest-muted)",
              fontSize: 15,
              lineHeight: 1.8,
              marginBottom: 24,
            }}
          >
            {tagline ||
              "trustC نقدینگی پراکنده پورتفوی شما را به سرمایه‌ای در گردش، قابل‌اهرم‌گیری و قابل‌حسابرسی تبدیل می‌کند."}
          </p>
          <div className="row" style={{ gap: 24, marginTop: 32 }}>
            <Stat2 label="ضریب اهرم" value="۴.۲×" />
            <Stat2 label="استارتاپ تحت پوشش" value="۷" />
            <Stat2 label="در اسکرو" value="۲٫۸ هزار میلیارد ریال" />
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontFamily: "var(--mono-data)",
            fontSize: 11,
            color: "var(--fg-on-manifest-muted)",
            letterSpacing: "0.06em",
          }}
        >
          <span>v۰.۹.۰ · MVP</span>
          <span>{toFaDigits(new Date().toLocaleDateString("fa-IR"))}</span>
        </div>
      </aside>

      <main className="auth-main">{children}</main>
    </div>
  );
}

function Stat2({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div
        className="eyebrow"
        style={{ color: "var(--orange-500)", marginBottom: 4 }}
      >
        {label}
      </div>
      <div
        className="mono"
        style={{ fontWeight: 700, fontSize: 18, color: "var(--cream-50)" }}
      >
        {value}
      </div>
    </div>
  );
}

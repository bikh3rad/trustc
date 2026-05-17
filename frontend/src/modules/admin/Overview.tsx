// Admin overview screen — ported from hi-fi/src/admin-screens.jsx → AdminOverview.
//
// Aggregates the three things an admin most-often opens the panel for:
//   1. Outstanding PENDING approvals (with inline approve from the preview)
//   2. Recent audit activity across the platform
//   3. Cross-portfolio heatmap (every startup the platform knows about)
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Admin,
  Audit as AuditApi,
  Startups,
  type AuditRecord,
  type AuthUser,
  type Startup,
  type SystemSettings,
} from "../../api";
import { Btn } from "../../components/ui/Btn";
import { Icon } from "../../components/ui/Icon";
import { Stat } from "../../components/ui/Stat";
import { useToast } from "../../context/ToastContext";
import { toFaDigits } from "../../lib/format";

type LoadState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | {
      kind: "ready";
      users: AuthUser[];
      startups: Startup[];
      audit: AuditRecord[];
      settings: SystemSettings;
    };

export function AdminOverview() {
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const navigate = useNavigate();
  const { toast } = useToast();

  async function load() {
    setState({ kind: "loading" });
    try {
      const [usersRes, startupsRes, auditRes, settings] = await Promise.all([
        Admin.listUsers(),
        Startups.list().catch(() => ({ startups: [] as Startup[] })),
        AuditApi.list({ limit: 12 }).catch(() => ({ records: [] as AuditRecord[] })),
        Admin.getSettings(),
      ]);
      setState({
        kind: "ready",
        users: usersRes.users,
        startups: startupsRes.startups,
        audit: auditRes.records,
        settings,
      });
    } catch (e) {
      setState({
        kind: "error",
        message: e instanceof Error ? e.message : "خطای ناشناخته",
      });
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function approve(u: AuthUser) {
    try {
      await Admin.approveUser(u.id);
      toast({ tone: "good", msg: `${u.name} تأیید شد` });
      void load();
    } catch (e) {
      toast({ tone: "bad", msg: e instanceof Error ? e.message : "خطا" });
    }
  }

  if (state.kind === "loading") {
    return <div className="muted">در حال بارگذاری…</div>;
  }
  if (state.kind === "error") {
    return (
      <div className="card" style={{ borderColor: "var(--state-bad)" }}>
        <h3>خطا در بارگذاری</h3>
        <p className="muted">{state.message}</p>
        <Btn variant="secondary" onClick={() => void load()}>
          تلاش مجدد
        </Btn>
      </div>
    );
  }

  const { users, startups, audit, settings } = state;
  const pending = users.filter((u) => u.status === "PENDING");
  const activeCount = users.filter((u) => u.status === "ACTIVE").length;
  const frozenCount = startups.filter(
    (s) => s.status === "FROZEN" || s.status === "SUSPENDED",
  ).length;

  return (
    <div className="stack" style={{ gap: "var(--s-6)" }}>
      <header className="dashboard-hero">
        <div>
          <div className="eyebrow">مدیریت سیستم · نمای کلی</div>
          <h1>کنسول ادمین</h1>
          <p className="muted" style={{ marginTop: 4, maxWidth: 640 }}>
            دید کلی به وضعیت پلتفرم. کاربران، استارتاپ‌ها و فعالیت‌های اخیر در یک نگاه.
          </p>
        </div>
        <div className="dashboard-hero-cta">
          {pending.length > 0 && (
            <Btn
              variant="primary"
              icon={<Icon.alert />}
              onClick={() => navigate("/admin/users")}
            >
              {toFaDigits(pending.length)} درخواست در انتظار
            </Btn>
          )}
        </div>
      </header>

      <section className="grid stat-grid">
        <Stat
          label="کاربران فعال"
          value={toFaDigits(activeCount)}
          unit="حساب"
          delta={
            pending.length > 0
              ? { text: `+${toFaDigits(pending.length)} در انتظار`, tone: "" }
              : null
          }
        />
        <Stat
          label="استارتاپ‌ها"
          value={toFaDigits(startups.length)}
          unit="شرکت"
          delta={{
            text: `${toFaDigits(frozenCount)} فریزشده`,
            tone: frozenCount > 0 ? "down" : "up",
          }}
        />
        <Stat
          label="رویدادهای اخیر"
          value={toFaDigits(audit.length)}
          unit="مورد"
        />
        <Stat
          label="ثبت‌نام عمومی"
          value={settings.registration_enabled ? "باز" : "بسته"}
          delta={{
            text: settings.registration_enabled
              ? "کاربران جدید مجاز"
              : "فقط با ادمین",
            tone: settings.registration_enabled ? "up" : "",
          }}
        />
      </section>

      <section className="grid two-col-shrink">
        {/* Pending registrations preview */}
        <div className="card">
          <div className="card-title">
            <h3>درخواست‌های ثبت‌نام در انتظار</h3>
            <Btn variant="ghost" size="sm" onClick={() => navigate("/admin/users")}>
              مشاهده همه ←
            </Btn>
          </div>
          {pending.length === 0 ? (
            <div className="empty">
              <h3>درخواست بازی نیست</h3>
              <div className="muted">همه ثبت‌نام‌ها رسیدگی شده‌اند.</div>
            </div>
          ) : (
            <div className="stack" style={{ gap: 8 }}>
              {pending.map((u) => (
                <PendingRow key={u.id} u={u} onApprove={() => approve(u)} />
              ))}
            </div>
          )}
        </div>

        {/* Recent audit activity */}
        <div className="card">
          <div className="card-title">
            <h3>فعالیت‌های اخیر</h3>
            <span className="muted mono" style={{ fontSize: 11 }}>
              دیده زنده
            </span>
          </div>
          <div className="stack" style={{ gap: 10 }}>
            {audit.length === 0 ? (
              <div className="muted" style={{ fontSize: 13 }}>
                هیچ رویدادی ثبت نشده است.
              </div>
            ) : (
              audit.slice(0, 6).map((l) => <AuditRow key={l.event_id} record={l} />)
            )}
          </div>
        </div>
      </section>

      {/* Portfolio shortcuts — admin sees everyone's data */}
      <div className="card">
        <div className="card-title">
          <h3>پورتفولیو کامل (دیدگاه ادمین)</h3>
          <div className="muted" style={{ fontSize: 12 }}>
            {toFaDigits(startups.length)} استارتاپ
          </div>
        </div>
        {startups.length === 0 ? (
          <div className="empty">
            <h3>استارتاپی ثبت نشده است</h3>
          </div>
        ) : (
          <div className="grid heat-grid">
            {startups.map((s) => (
              <HeatCell key={s.id} s={s} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PendingRow({ u, onApprove }: { u: AuthUser; onApprove: () => void }) {
  return (
    <div
      className="row"
      style={{
        justifyContent: "space-between",
        padding: 12,
        border: "1px solid var(--border-hairline)",
        borderRadius: 4,
        flexWrap: "wrap",
        gap: 12,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 500 }}>{u.name}</div>
        <div className="muted" style={{ fontSize: 12 }}>
          {u.email}
          {u.company ? ` · ${u.company}` : ""}
        </div>
      </div>
      <div className="row" style={{ gap: 8 }}>
        <span
          className="chip"
          data-tone={
            u.role === "VC" ? "active" : u.role === "AUDITOR" ? "warn" : "good"
          }
        >
          <span className="mono">{u.role}</span>
        </span>
        <Btn
          variant="secondary"
          size="sm"
          icon={<Icon.check />}
          onClick={onApprove}
        >
          تأیید
        </Btn>
      </div>
    </div>
  );
}

function AuditRow({ record }: { record: AuditRecord }) {
  const tone =
    record.actor_role === "VC"
      ? "active"
      : record.actor_role === "FOUNDER"
        ? "good"
        : record.actor_role === "ADMIN"
          ? "bad"
          : record.actor_role === "AUDITOR"
            ? "warn"
            : "neutral";
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "auto 1fr",
        gap: 12,
        paddingBottom: 10,
        borderBottom: "1px dashed var(--border-hairline)",
      }}
    >
      <span className="chip" data-tone={tone} style={{ alignSelf: "start" }}>
        <span className="mono">{record.actor_role || "SYSTEM"}</span>
      </span>
      <div style={{ minWidth: 0 }}>
        <div className="mono" style={{ fontWeight: 500, fontSize: 13 }}>
          {record.event_type}
        </div>
        <div className="muted" style={{ fontSize: 12 }}>
          {record.actor_id || "—"} · {record.subject_id || record.subject_type || "—"}
        </div>
        <div className="mono muted" style={{ fontSize: 10, marginTop: 2 }}>
          {toFaDigits(new Date(record.recorded_at).toLocaleString("fa-IR"))}
        </div>
      </div>
    </div>
  );
}

function HeatCell({ s }: { s: Startup }) {
  const isFrozen = s.status === "FROZEN" || s.status === "SUSPENDED";
  const risk = s.risk_level?.toLowerCase() || "medium";
  const tone =
    isFrozen
      ? "bad"
      : risk === "low"
        ? "good"
        : risk === "medium"
          ? "warn"
          : "bad";
  return (
    <div className="heat-cell" data-risk={isFrozen ? "frozen" : risk}>
      <div>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <span style={{ fontWeight: 600 }}>{s.startup_name}</span>
          <span className="muted mono" style={{ fontSize: 11 }}>
            {s.tax_id}
          </span>
        </div>
        <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
          {s.industry}
        </div>
        <div className="muted mono" style={{ fontSize: 11, marginTop: 6 }}>
          اعتبار {toFaDigits(s.credit_score)} · {s.country}
        </div>
      </div>
      <span className="chip" data-tone={tone}>
        <span className="mono">
          {isFrozen ? "FROZEN" : (s.risk_level || "MEDIUM").toUpperCase()}
        </span>
      </span>
    </div>
  );
}

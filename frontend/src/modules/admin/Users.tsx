// Admin users screen — ported from hi-fi/src/admin-screens.jsx → AdminUsers.
//
// Lists every user the auth service knows about, filtered by status or role.
// Approve/disable/enable are confirmed through a modal because they take
// effect immediately (and emit audit events on the backend).
import { useEffect, useState } from "react";
import {
  Admin,
  ApiHttpError,
  type AccountStatus,
  type AuthUser,
  type Role,
} from "../../api";
import { Btn } from "../../components/ui/Btn";
import { Icon } from "../../components/ui/Icon";
import { Modal } from "../../components/ui/Modal";
import { Stat } from "../../components/ui/Stat";
import { useToast } from "../../context/ToastContext";
import { MobileCard } from "../../layout/mobile/MobileCard";
import { MobileList } from "../../layout/mobile/MobileList";
import { toFaDigits } from "../../lib/format";
import { useIsMobile } from "../../lib/useIsMobile";

type Filter = "ALL" | AccountStatus | Role;
type PendingAction = "approve" | "reject" | "disable" | "enable";
type Confirm = { action: PendingAction; user: AuthUser } | null;

const FILTERS: Array<[Filter, string]> = [
  ["ALL", "همه"],
  ["PENDING", "در انتظار"],
  ["ACTIVE", "فعال"],
  ["DISABLED", "غیرفعال"],
  ["FOUNDER", "بنیان‌گذار"],
  ["VC", "VC"],
  ["AUDITOR", "ممیز"],
  ["ADMIN", "ادمین"],
];

const ROLE_TONE: Record<Role, "good" | "active" | "warn" | "bad"> = {
  FOUNDER: "good",
  VC: "active",
  AUDITOR: "warn",
  ADMIN: "bad",
};

const STATUS_TONE: Record<AccountStatus, "good" | "warn" | "bad"> = {
  ACTIVE: "good",
  PENDING: "warn",
  DISABLED: "bad",
};

export function AdminUsers() {
  const isMobile = useIsMobile();
  const [users, setUsers] = useState<AuthUser[] | null>(null);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [confirming, setConfirming] = useState<Confirm>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  async function load() {
    try {
      const { users } = await Admin.listUsers();
      setUsers(users);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطای ناشناخته");
    }
  }
  useEffect(() => {
    void load();
  }, []);

  async function apply(c: Exclude<Confirm, null>) {
    setBusyId(c.user.id);
    try {
      let updated: AuthUser;
      switch (c.action) {
        case "approve":
        case "enable":
          updated = (await Admin.approveUser(c.user.id)).user;
          break;
        case "reject":
        case "disable":
          updated = (await Admin.disableUser(c.user.id)).user;
          break;
      }
      setUsers((list) =>
        list ? list.map((u) => (u.id === updated.id ? updated : u)) : list,
      );
      toast({
        tone:
          c.action === "approve" || c.action === "enable"
            ? "good"
            : c.action === "reject"
              ? "warn"
              : "bad",
        msg: msgFor(c.action, c.user.name),
      });
      setConfirming(null);
    } catch (e) {
      const msg =
        e instanceof ApiHttpError
          ? e.message
          : e instanceof Error
            ? e.message
            : "خطا در عملیات";
      toast({ tone: "bad", msg });
    } finally {
      setBusyId(null);
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
  if (users === null) {
    return <div className="muted">در حال بارگذاری…</div>;
  }

  const filtered =
    filter === "ALL"
      ? users
      : filter === "PENDING" || filter === "ACTIVE" || filter === "DISABLED"
        ? users.filter((u) => u.status === filter)
        : users.filter((u) => u.role === filter);

  const stats = {
    pending: users.filter((u) => u.status === "PENDING").length,
    active: users.filter((u) => u.status === "ACTIVE").length,
    disabled: users.filter((u) => u.status === "DISABLED").length,
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
        <Stat label="کل کاربران" value={toFaDigits(users.length)} unit="حساب" />
        <Stat
          label="در انتظار تأیید"
          value={toFaDigits(stats.pending)}
          unit="مورد"
          delta={
            stats.pending > 0 ? { text: "⚠ نیاز به اقدام", tone: "down" } : null
          }
        />
        <Stat label="فعال" value={toFaDigits(stats.active)} unit="حساب" />
        <Stat label="غیرفعال" value={toFaDigits(stats.disabled)} unit="حساب" />
      </section>

      <div className="row wrap" style={{ gap: 8 }}>
        {FILTERS.map(([k, l]) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={"btn btn--sm " + (filter === k ? "btn--secondary" : "btn--ghost")}
            style={{ border: "1px solid var(--border-hairline)" }}
          >
            {l}
          </button>
        ))}
      </div>

      {isMobile ? (
        <MobileList
          items={filtered}
          emptyTitle="کاربری یافت نشد"
          emptyHint="فیلتر را تغییر دهید."
          renderItem={(u) => (
            <MobileCard
              key={u.id}
              title={u.name}
              subtitle={
                <span className="mono" style={{ fontSize: 11 }}>
                  {u.email}
                </span>
              }
              right={
                <div className="stack" style={{ gap: 4, alignItems: "flex-end" }}>
                  <span className="chip" data-tone={ROLE_TONE[u.role]}>
                    <span className="mono">{u.role}</span>
                  </span>
                  <span className="chip" data-tone={STATUS_TONE[u.status]}>
                    <span className="mono">{u.status}</span>
                  </span>
                </div>
              }
              meta={
                <div
                  className="row wrap"
                  style={{ gap: 8, width: "100%", justifyContent: "space-between" }}
                >
                  <span>{u.company || "—"}</span>
                  <span style={{ fontFamily: "var(--mono-data)" }}>
                    {u.last_login ? toFaDigits(formatDate(u.last_login)) : "—"}
                  </span>
                  <div className="row" style={{ gap: 4, width: "100%" }}>
                    {u.status === "PENDING" && (
                      <>
                        <Btn
                          variant="secondary"
                          size="sm"
                          icon={<Icon.check />}
                          disabled={busyId === u.id}
                          onClick={() => setConfirming({ action: "approve", user: u })}
                        >
                          تأیید
                        </Btn>
                        <Btn
                          variant="ghost"
                          size="sm"
                          icon={<Icon.x />}
                          disabled={busyId === u.id}
                          onClick={() => setConfirming({ action: "reject", user: u })}
                        >
                          رد
                        </Btn>
                      </>
                    )}
                    {u.status === "ACTIVE" && u.role !== "ADMIN" && (
                      <Btn
                        variant="ghost"
                        size="sm"
                        disabled={busyId === u.id}
                        onClick={() => setConfirming({ action: "disable", user: u })}
                      >
                        غیرفعال
                      </Btn>
                    )}
                    {u.status === "DISABLED" && (
                      <Btn
                        variant="secondary"
                        size="sm"
                        icon={<Icon.check />}
                        disabled={busyId === u.id}
                        onClick={() => setConfirming({ action: "enable", user: u })}
                      >
                        فعال‌سازی
                      </Btn>
                    )}
                  </div>
                </div>
              }
            />
          )}
        />
      ) : (
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
            {filtered.map((u) => (
              <tr key={u.id} style={{ cursor: "default" }}>
                <td>
                  <div style={{ fontWeight: 500 }}>{u.name}</div>
                  <div className="muted mono" style={{ fontSize: 11 }}>
                    {u.email}
                  </div>
                </td>
                <td>{u.company || "—"}</td>
                <td>
                  <span className="chip" data-tone={ROLE_TONE[u.role]}>
                    <span className="mono">{u.role}</span>
                  </span>
                </td>
                <td>
                  <span className="chip" data-tone={STATUS_TONE[u.status]}>
                    <span className="mono">{u.status}</span>
                  </span>
                </td>
                <td className="mono muted" style={{ fontSize: 12 }}>
                  {toFaDigits(formatDate(u.joined_at))}
                </td>
                <td className="mono muted" style={{ fontSize: 11 }}>
                  {u.last_login ? toFaDigits(formatDate(u.last_login)) : "—"}
                </td>
                <td>
                  <div className="row" style={{ gap: 4 }}>
                    {u.status === "PENDING" && (
                      <>
                        <Btn
                          variant="secondary"
                          size="sm"
                          icon={<Icon.check />}
                          disabled={busyId === u.id}
                          onClick={() => setConfirming({ action: "approve", user: u })}
                        >
                          تأیید
                        </Btn>
                        <Btn
                          variant="ghost"
                          size="sm"
                          icon={<Icon.x />}
                          disabled={busyId === u.id}
                          onClick={() => setConfirming({ action: "reject", user: u })}
                        >
                          رد
                        </Btn>
                      </>
                    )}
                    {u.status === "ACTIVE" && u.role !== "ADMIN" && (
                      <Btn
                        variant="ghost"
                        size="sm"
                        disabled={busyId === u.id}
                        onClick={() => setConfirming({ action: "disable", user: u })}
                      >
                        غیرفعال
                      </Btn>
                    )}
                    {u.status === "DISABLED" && (
                      <Btn
                        variant="secondary"
                        size="sm"
                        icon={<Icon.check />}
                        disabled={busyId === u.id}
                        onClick={() => setConfirming({ action: "enable", user: u })}
                      >
                        فعال‌سازی
                      </Btn>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7}>
                  <div className="empty">
                    <h3>کاربری یافت نشد</h3>
                    <div>فیلتر را تغییر دهید.</div>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      )}

      <Modal
        open={!!confirming}
        onClose={() => setConfirming(null)}
        title={titleFor(confirming?.action)}
        footer={
          confirming && (
            <>
              <Btn variant="ghost" onClick={() => setConfirming(null)}>
                انصراف
              </Btn>
              <Btn
                variant={
                  confirming.action === "approve" || confirming.action === "enable"
                    ? "primary"
                    : "danger"
                }
                disabled={busyId === confirming.user.id}
                onClick={() => void apply(confirming)}
              >
                {primaryLabelFor(confirming.action)}
              </Btn>
            </>
          )
        }
      >
        {confirming && (
          <div>
            <p style={{ marginBottom: 12 }}>
              کاربر <b>{confirming.user.name}</b> ({confirming.user.email}) با نقش{" "}
              <span className="mono">{confirming.user.role}</span>:
            </p>
            <p className="muted" style={{ fontSize: 13 }}>
              {bodyFor(confirming.action)}
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("fa-IR");
  } catch {
    return iso;
  }
}

function titleFor(a?: PendingAction): string {
  switch (a) {
    case "approve":
      return "تأیید نهایی کاربر";
    case "reject":
      return "رد درخواست";
    case "disable":
      return "غیرفعال‌سازی حساب";
    case "enable":
      return "فعال‌سازی مجدد";
    default:
      return "";
  }
}

function primaryLabelFor(a: PendingAction): string {
  switch (a) {
    case "approve":
      return "تأیید و فعال‌سازی";
    case "reject":
      return "رد درخواست";
    case "disable":
      return "غیرفعال‌سازی";
    case "enable":
      return "فعال‌سازی";
  }
}

function bodyFor(a: PendingAction): string {
  switch (a) {
    case "approve":
      return "پس از تأیید، کاربر می‌تواند به سیستم وارد شود و به ماژول‌های مربوط به نقش خود دسترسی داشته باشد.";
    case "reject":
      return "درخواست ثبت‌نام رد می‌شود و حساب در وضعیت DISABLED قرار می‌گیرد.";
    case "disable":
      return "تمام دسترسی‌های کاربر به سیستم متوقف می‌شود.";
    case "enable":
      return "دسترسی کاربر مجدداً برقرار می‌شود.";
  }
}

function msgFor(a: PendingAction, name: string): string {
  switch (a) {
    case "approve":
      return `${name} تأیید شد`;
    case "reject":
      return `درخواست ${name} رد شد`;
    case "disable":
      return `${name} غیرفعال شد`;
    case "enable":
      return `${name} مجدداً فعال شد`;
  }
}

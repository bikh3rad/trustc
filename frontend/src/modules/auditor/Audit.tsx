import { Fragment, useEffect, useMemo, useState } from "react";
import { Audit as AuditApi, type AuditRecord } from "../../api";
import { Chip } from "../../components/ui/Chip";
import { Icon } from "../../components/ui/Icon";
import { Stat } from "../../components/ui/Stat";
import { toFaDigits } from "../../lib/format";

const ROLE_FILTERS: [string, string][] = [
  ["ALL", "همه"],
  ["VC_ADMIN", "VC"],
  ["FOUNDER", "بنیان‌گذار"],
  ["OPERATOR", "اپراتور"],
  ["SYSTEM", "سیستم"],
];

function actionLabelEn(eventType: string): string {
  // strip "trustc." prefix for compact display
  return eventType.replace(/^trustc\./, "");
}

function roleTone(role: string | undefined): "active" | "neutral" | "good" | "warn" {
  if (role === "VC_ADMIN" || role === "VC") return "active";
  if (role === "SYSTEM") return "neutral";
  if (role === "FOUNDER") return "good";
  return "warn";
}

export function Audit() {
  const [records, setRecords] = useState<AuditRecord[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [err, setErr] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  async function refresh() {
    try {
      const r = await AuditApi.list({ limit: 200 });
      setRecords(r.records);
    } catch (e) {
      setErr((e as Error).message);
    }
  }
  useEffect(() => {
    void refresh();
  }, []);

  const filtered = useMemo(() => {
    return records.filter((r) => {
      if (roleFilter !== "ALL" && r.actor_role !== roleFilter) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        r.event_type.toLowerCase().includes(q) ||
        (r.subject_id ?? "").toLowerCase().includes(q) ||
        (r.actor_role ?? "").toLowerCase().includes(q)
      );
    });
  }, [records, search, roleFilter]);

  const stats = useMemo(() => {
    const total = records.length;
    const last24 = records.filter(
      (r) => Date.now() - new Date(r.recorded_at).getTime() < 24 * 60 * 60 * 1000
    ).length;
    const system = records.filter((r) => r.actor_role === "SYSTEM").length;
    const vc = records.filter((r) => r.actor_role === "VC_ADMIN").length;
    return { total, last24, system, vc };
  }, [records]);

  return (
    <div className="stack" style={{ gap: "var(--s-6)" }}>
      <header>
        <div className="eyebrow">حسابرسی · لاگ غیرقابل تغییر</div>
        <h1>ردپای حسابرسی</h1>
        <p className="muted" style={{ marginTop: 4, maxWidth: 720 }}>
          هر گذار حالت در سیستم به‌صورت append-only با امضای SHA-256 ذخیره می‌شود.
          حذف یا تغییر سوابق در هیچ سطحی مجاز نیست.
        </p>
      </header>

      {err && (
        <div
          className="card"
          style={{ background: "var(--state-bad-bg)", borderColor: "var(--state-bad)" }}
        >
          <span className="mono" style={{ color: "var(--state-bad)" }}>{err}</span>
        </div>
      )}

      <section className="grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        <Stat label="کل رویدادها" value={toFaDigits(stats.total)} unit="مورد" />
        <Stat
          label="در ۲۴ ساعت اخیر"
          value={toFaDigits(stats.last24)}
          unit="مورد"
          delta={{ text: "زنجیره معتبر", tone: "up" }}
        />
        <Stat label="رویدادهای سیستمی" value={toFaDigits(stats.system)} unit="مورد" />
        <Stat label="مداخلات VC" value={toFaDigits(stats.vc)} unit="مورد" />
      </section>

      <div className="row" style={{ gap: 12 }}>
        <input
          className="input"
          style={{ maxWidth: 320 }}
          placeholder="جست‌وجو در رویدادها…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="seg">
          {ROLE_FILTERS.map(([k, l]) => (
            <button
              key={k}
              className={roleFilter === k ? "active" : ""}
              onClick={() => setRoleFilter(k)}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <table className="table">
          <thead>
            <tr>
              <th>زمان</th>
              <th>سرویس</th>
              <th>نقش</th>
              <th>اقدام</th>
              <th>هدف</th>
              <th>هش امضا</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <Fragment key={r.event_id}>
                <tr>
                  <td className="mono muted" style={{ fontSize: 12 }}>
                    {toFaDigits(new Date(r.recorded_at).toLocaleString("fa-IR"))}
                  </td>
                  <td className="mono" style={{ fontSize: 12 }}>{r.service}</td>
                  <td>
                    <Chip tone={roleTone(r.actor_role)}>
                      <span className="mono">{r.actor_role ?? "—"}</span>
                    </Chip>
                  </td>
                  <td className="mono" style={{ fontSize: 12 }}>
                    {actionLabelEn(r.event_type)}
                  </td>
                  <td className="mono muted" style={{ fontSize: 12 }}>
                    {r.subject_type
                      ? `${r.subject_type}/${(r.subject_id ?? "").slice(0, 8)}`
                      : "—"}
                  </td>
                  <td className="mono" style={{ fontSize: 11, color: "var(--fg-muted)" }}>
                    <Icon.hash
                      size={12}
                      style={{ verticalAlign: "middle", marginInlineEnd: 4 }}
                    />
                    {r.signature.slice(0, 12)}…
                  </td>
                  <td>
                    <button
                      className="btn btn--ghost btn--sm"
                      onClick={() =>
                        setExpanded(expanded === r.event_id ? null : r.event_id)
                      }
                    >
                      {expanded === r.event_id ? "بستن" : "جزئیات"}
                    </button>
                  </td>
                </tr>
                {expanded === r.event_id && (
                  <tr>
                    <td colSpan={7}>
                      <pre
                        style={{
                          background: "var(--bg-paper)",
                          padding: 12,
                          margin: 0,
                          fontFamily: "var(--mono-data)",
                          fontSize: 11,
                          overflowX: "auto",
                        }}
                      >
                        {JSON.stringify(
                          {
                            event_id: r.event_id,
                            seq: r.seq,
                            request_id: r.request_id,
                            previous_hash: r.previous_hash,
                            signature: r.signature,
                            payload: r.payload,
                          },
                          null,
                          2
                        )}
                      </pre>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7}>
                  <div className="empty">
                    <h3>چیزی پیدا نشد</h3>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div
        className="card flat"
        style={{
          background: "var(--cream-100)",
          border: "1px dashed var(--cream-300)",
        }}
      >
        <div className="eyebrow" style={{ marginBottom: 6 }}>
          قاعده زنجیره
        </div>
        <p style={{ margin: 0, fontSize: 14 }}>
          هر رکورد جدید با هش رکورد قبلی امضا می‌شود؛ بنابراین تشخیص دستکاری در هر نقطه از زنجیره
          با اعتبارسنجی مجدد قابل انجام است.
        </p>
      </div>
    </div>
  );
}

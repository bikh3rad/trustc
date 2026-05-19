import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Procurements as ProcurementsApi, type Procurement } from "../../api";
import { Btn } from "../../components/ui/Btn";
import { Chip } from "../../components/ui/Chip";
import { Icon } from "../../components/ui/Icon";
import { useCurrentStartup } from "../../context/CurrentStartupContext";
import { MobileCard } from "../../layout/mobile/MobileCard";
import { MobileList } from "../../layout/mobile/MobileList";
import { formatIRRPlain, toFaDigits } from "../../lib/format";
import { useIsMobile } from "../../lib/useIsMobile";

const FILTERS = [
  "ALL",
  "DRAFT",
  "MANAGER_REVIEW",
  "FINANCIAL_VALIDATION",
  "ESCROW_LOCK",
  "SUPPLIER_DISPATCH",
  "DELIVERY_CONFIRMATION",
  "PAYMENT_RELEASE",
] as const;

export function Procurements() {
  const navigate = useNavigate();
  const { current } = useCurrentStartup();
  const isMobile = useIsMobile();
  const [items, setItems] = useState<Procurement[]>([]);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("ALL");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!current) return;
    (async () => {
      try {
        const r = await ProcurementsApi.list(current.id);
        setItems(r.procurements);
      } catch (e) {
        setErr((e as Error).message);
      }
    })();
  }, [current]);

  const filtered = useMemo(
    () => (filter === "ALL" ? items : items.filter((p) => p.state === filter)),
    [items, filter]
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    items.forEach((p) => (c[p.state] = (c[p.state] ?? 0) + 1));
    return c;
  }, [items]);

  return (
    <div className="stack" style={{ gap: "var(--s-6)" }}>
      <header className="dashboard-hero">
        <div>
          <div className="eyebrow">عملیات · خرید</div>
          <h1>خریدها</h1>
          <p className="muted" style={{ marginTop: 4 }}>
            {toFaDigits(items.length)} درخواست در ۹۰ روز گذشته
          </p>
        </div>
        <div className="dashboard-hero-cta">
          <Btn
            variant="primary"
            icon={<Icon.plus />}
            onClick={() => navigate("/procurements/new")}
          >
            ثبت خرید جدید
          </Btn>
        </div>
      </header>

      {err && (
        <div className="card" style={{ background: "var(--state-bad-bg)", borderColor: "var(--state-bad)" }}>
          <span className="mono" style={{ color: "var(--state-bad)" }}>{err}</span>
        </div>
      )}

      <div className="row wrap" style={{ gap: 8 }}>
        {FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={"btn btn--" + (filter === s ? "secondary" : "ghost") + " btn--sm"}
            style={{ border: "1px solid var(--border-hairline)" }}
          >
            {s === "ALL" ? "همه" : <Chip state={s} />}
            <span
              style={{
                marginInlineStart: 6,
                color: "var(--fg-muted)",
                fontFamily: "var(--mono-data)",
              }}
            >
              {toFaDigits(s === "ALL" ? items.length : counts[s] ?? 0)}
            </span>
          </button>
        ))}
      </div>

      {isMobile ? (
        <MobileList
          items={filtered}
          emptyTitle="چیزی یافت نشد"
          emptyHint={items.length === 0 ? "هنوز خریدی ثبت نشده." : "فیلتر را تغییر دهید."}
          renderItem={(p) => (
            <MobileCard
              key={p.id}
              onClick={() => navigate(`/procurements/${p.id}`)}
              title={p.title}
              subtitle={`${p.supplier_name} · ${p.category}`}
              right={<Chip state={p.state} />}
              meta={
                <>
                  <span>{formatIRRPlain(p.amount_cents)} ریال</span>
                  <span style={{ marginInlineStart: "auto" }}>
                    {toFaDigits(new Date(p.created_at).toLocaleDateString("fa-IR"))}
                  </span>
                </>
              }
            />
          )}
        />
      ) : (
        <div className="card responsive-table-card" style={{ padding: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>شناسه</th>
                <th>عنوان</th>
                <th>تأمین‌کننده</th>
                <th>دسته</th>
                <th>وضعیت</th>
                <th className="num">مبلغ (ریال)</th>
                <th>تاریخ</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} onClick={() => navigate(`/procurements/${p.id}`)}>
                  <td className="mono" style={{ fontSize: 12, color: "var(--fg-muted)" }}>
                    {p.id.slice(0, 8)}
                  </td>
                  <td style={{ fontWeight: 500 }}>{p.title}</td>
                  <td>{p.supplier_name}</td>
                  <td>{p.category}</td>
                  <td>
                    <Chip state={p.state} />
                  </td>
                  <td className="num">{formatIRRPlain(p.amount_cents)}</td>
                  <td className="mono muted" style={{ fontSize: 12 }}>
                    {toFaDigits(new Date(p.created_at).toLocaleDateString("fa-IR"))}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    <div className="empty">
                      <h3>چیزی یافت نشد</h3>
                      <div>{items.length === 0 ? "هنوز خریدی ثبت نشده." : "فیلتر را تغییر دهید."}</div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

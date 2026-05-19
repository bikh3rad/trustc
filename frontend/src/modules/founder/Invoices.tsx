// Invoices service (services/invoice) is not yet implemented per PRD §3.3.
// Until that lands, this screen shows the dual-pathway design + a
// deterministic per-startup mock history from lib/mockInvoices.

import { useEffect, useState } from "react";
import { Btn } from "../../components/ui/Btn";
import { Chip } from "../../components/ui/Chip";
import { Icon } from "../../components/ui/Icon";
import { Modal } from "../../components/ui/Modal";
import { Stat } from "../../components/ui/Stat";
import { useFrozen } from "../../context/FrozenContext";
import { useToast } from "../../context/ToastContext";
import { useCurrentStartup } from "../../context/CurrentStartupContext";
import { MobileCard } from "../../layout/mobile/MobileCard";
import { MobileList } from "../../layout/mobile/MobileList";
import { formatIRR, formatIRRPlain, parsePersianNumber, toFaDigits } from "../../lib/format";
import { useIsMobile } from "../../lib/useIsMobile";
import { mockInvoicesFor, type Inv, type SettlementMode } from "../../lib/mockInvoices";

export function Invoices() {
  const { current } = useCurrentStartup();
  const { isFrozen } = useFrozen();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const frozen = current ? isFrozen(current.id) : false;
  const [invoices, setInvoices] = useState<Inv[]>(() =>
    current ? mockInvoicesFor(current) : [],
  );
  const [showNew, setShowNew] = useState(false);
  const [bump, setBump] = useState<{ amount: number; mode: SettlementMode } | null>(null);

  // Re-seed the list when the admin switches companies in the sidebar.
  useEffect(() => {
    setInvoices(current ? mockInvoicesFor(current) : []);
  }, [current]);

  function settle(inv: Inv) {
    if (frozen) {
      toast({ tone: "bad", msg: "وصول فاکتور مسدود — استارتاپ فریز شده." });
      return;
    }
    setInvoices((list) =>
      list.map((i) =>
        i.id === inv.id
          ? { ...i, status: "PAID", paid_at: new Date().toLocaleDateString("fa-IR") }
          : i
      )
    );
    setBump({ amount: inv.amount_cents, mode: inv.mode });
    window.setTimeout(() => setBump(null), 2200);
    toast({ tone: "good", msg: `+${formatIRR(inv.amount_cents)} به خط اعتباری اضافه شد` });
  }

  const open = invoices.filter((i) => i.status === "OPEN");
  const paid = invoices.filter((i) => i.status === "PAID");
  const totalOpen = open.reduce((s, i) => s + i.amount_cents, 0);
  const totalPaid = paid.reduce((s, i) => s + i.amount_cents, 0);

  return (
    <div className="stack" style={{ gap: "var(--s-6)" }}>
      <header className="dashboard-hero">
        <div>
          <div className="eyebrow">عملیات · فروش</div>
          <h1>فاکتورهای فروش</h1>
          <p className="muted" style={{ marginTop: 4 }}>
            وصول هر فاکتور به‌صورت خودکار سقف خط اعتباری شما را افزایش می‌دهد.
          </p>
          <p
            className="mono"
            style={{ fontSize: 11, marginTop: 6, color: "var(--state-warn)" }}
          >
            ⚠ سرویس backend برای فاکتورها هنوز پیاده‌سازی نشده — داده نمایشی است.
          </p>
        </div>
        <div className="dashboard-hero-cta">
          <Btn variant="primary" icon={<Icon.plus />} onClick={() => setShowNew(true)}>
            صدور فاکتور جدید
          </Btn>
        </div>
      </header>

      <section className="grid stat-grid stat-grid--3">
        <Stat
          label="مطالبات باز"
          value={formatIRR(totalOpen, { withUnit: false })}
          unit="میلیارد ریال"
          hint={`${toFaDigits(open.length)} فاکتور`}
        />
        <Stat
          label="وصول این ماه"
          value={formatIRR(totalPaid, { withUnit: false })}
          unit="میلیارد ریال"
          hint={`${toFaDigits(paid.length)} فاکتور`}
        />
        <Stat
          label="سقف اعتباری فعلی"
          value={formatIRR(800_000_000_000, { withUnit: false })}
          unit="میلیارد ریال"
          delta={
            bump
              ? { text: `+${formatIRR(bump.amount, { withUnit: false })}`, tone: "up" }
              : null
          }
        />
      </section>

      <div className="card">
        <div className="card-title">
          <h3>دو الگوی تسویه</h3>
        </div>
        <div
          className="grid form-row-2"
          style={{ gridTemplateColumns: "1fr 1fr", gap: "var(--s-5)" }}
        >
          <div
            style={{
              padding: "var(--s-4)",
              border: "1px solid var(--state-active)",
              borderRadius: "var(--r-2)",
              background: "var(--state-active-bg)",
            }}
          >
            <div className="row" style={{ justifyContent: "space-between" }}>
              <div className="mono" style={{ fontWeight: 600, color: "var(--state-active)" }}>
                ESCROW_DIRECT
              </div>
              <span className="chip" data-tone="active">الگوی الف</span>
            </div>
            <p style={{ fontSize: 13, marginTop: 8 }}>
              وجه مشتری مستقیماً به حساب امانی پلتفرم. وثیقه چرخشی فوری. مالیات صفر در لایه اسکرو.
            </p>
          </div>
          <div
            style={{
              padding: "var(--s-4)",
              border: "1px solid var(--state-good)",
              borderRadius: "var(--r-2)",
              background: "var(--state-good-bg)",
            }}
          >
            <div className="row" style={{ justifyContent: "space-between" }}>
              <div className="mono" style={{ fontWeight: 600, color: "var(--state-good)" }}>
                SELF_FUNDED
              </div>
              <span className="chip" data-tone="good">الگوی ب</span>
            </div>
            <p style={{ fontSize: 13, marginTop: 8 }}>
              وجه به حساب بانکی شرکت. مالیات منطبق با سامانه مودیان. شارژ خودکار خط اعتباری به‌محض ورود نقدینگی.
            </p>
          </div>
        </div>
      </div>

      {isMobile ? (
        <MobileList
          items={invoices}
          emptyTitle="فاکتوری ثبت نشده"
          renderItem={(inv) => (
            <MobileCard
              key={inv.id}
              onClick={inv.status === "OPEN" ? () => settle(inv) : undefined}
              title={inv.customer}
              subtitle={
                <span className="mono" style={{ fontSize: 11 }}>
                  {inv.id}
                </span>
              }
              right={
                <div className="stack" style={{ gap: 4, alignItems: "flex-end" }}>
                  <span
                    className="chip"
                    data-tone={inv.mode === "ESCROW_DIRECT" ? "active" : "good"}
                  >
                    <span className="mono">{inv.mode}</span>
                  </span>
                  <Chip state={inv.status} />
                </div>
              }
              meta={
                <>
                  <span style={{ fontWeight: 600, color: "var(--fg-default)" }}>
                    {formatIRRPlain(inv.amount_cents)} ریال
                  </span>
                  <span style={{ marginInlineStart: "auto" }}>
                    {inv.status === "OPEN"
                      ? `صدور ${toFaDigits(inv.issued_at)}`
                      : `وصول ${toFaDigits(inv.paid_at ?? "")}`}
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
                <th>مشتری</th>
                <th>الگو</th>
                <th>وضعیت</th>
                <th className="num">مبلغ (ریال)</th>
                <th>صدور</th>
                <th>اقدام</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id}>
                  <td className="mono" style={{ fontSize: 12 }}>{inv.id}</td>
                  <td>{inv.customer}</td>
                  <td>
                    <span
                      className="chip"
                      data-tone={inv.mode === "ESCROW_DIRECT" ? "active" : "good"}
                    >
                      <span className="mono">{inv.mode}</span>
                    </span>
                  </td>
                  <td><Chip state={inv.status} /></td>
                  <td className="num">{formatIRRPlain(inv.amount_cents)}</td>
                  <td className="mono muted" style={{ fontSize: 12 }}>{toFaDigits(inv.issued_at)}</td>
                  <td>
                    {inv.status === "OPEN" ? (
                      <Btn variant="secondary" size="sm" onClick={() => settle(inv)}>
                        ثبت وصول
                      </Btn>
                    ) : (
                      <span className="muted mono" style={{ fontSize: 11 }}>
                        {toFaDigits(inv.paid_at ?? "")}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {bump && (
        <div style={{ position: "fixed", bottom: 32, insetInlineStart: 32, zIndex: 90 }}>
          <div
            className="card"
            style={{
              background: "var(--navy-900)",
              color: "var(--cream-50)",
              borderColor: "var(--orange-600)",
              boxShadow: "var(--shadow-2)",
              minWidth: 320,
              animation: "fly 800ms var(--ease-document)",
            }}
          >
            <div className="eyebrow" style={{ color: "var(--orange-500)" }}>
              ارتقای خط اعتباری
            </div>
            <div className="mono" style={{ fontSize: 22, fontWeight: 700, marginTop: 8 }}>
              +{formatIRR(bump.amount)}
            </div>
            <div
              style={{ fontSize: 12, marginTop: 6, color: "var(--fg-on-manifest-muted)" }}
            >
              الگوی {bump.mode} · فعال در همین لحظه
            </div>
          </div>
        </div>
      )}

      <NewInvoiceModal
        open={showNew}
        onClose={() => setShowNew(false)}
        onCreate={(inv) => {
          if (!current) return;
          setInvoices((list) => [
            {
              ...inv,
              id: "cinv_" + Math.random().toString(36).slice(2, 6),
              startup_id: current.id,
              status: "OPEN",
              issued_at: new Date().toLocaleDateString("fa-IR"),
            },
            ...list,
          ]);
          setShowNew(false);
          toast({ tone: "good", msg: "فاکتور جدید صادر شد." });
        }}
      />
    </div>
  );
}

function NewInvoiceModal({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (inv: { customer: string; amount_cents: number; mode: SettlementMode }) => void;
}) {
  const [customer, setCustomer] = useState("");
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<SettlementMode>("ESCROW_DIRECT");

  function submit() {
    const amt = parsePersianNumber(amount);
    if (!customer.trim() || amt <= 0) return;
    onCreate({ customer: customer.trim(), amount_cents: amt, mode });
    setCustomer("");
    setAmount("");
    setMode("ESCROW_DIRECT");
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="صدور فاکتور فروش جدید"
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>انصراف</Btn>
          <Btn variant="primary" onClick={submit}>صدور و ساخت لینک</Btn>
        </>
      }
    >
      <div className="stack" style={{ gap: 16 }}>
        <div className="field">
          <label className="field-label">نام مشتری</label>
          <input
            className="input"
            value={customer}
            onChange={(e) => setCustomer(e.target.value)}
          />
        </div>
        <div className="field">
          <label className="field-label">مبلغ (ریال)</label>
          <input
            className="input mono"
            placeholder="48,000,000,000"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            dir="ltr"
          />
        </div>
        <div className="field">
          <label className="field-label">الگوی تسویه</label>
          <div className="seg">
            <button
              className={mode === "ESCROW_DIRECT" ? "active" : ""}
              onClick={() => setMode("ESCROW_DIRECT")}
            >
              ESCROW_DIRECT
            </button>
            <button
              className={mode === "SELF_FUNDED" ? "active" : ""}
              onClick={() => setMode("SELF_FUNDED")}
            >
              SELF_FUNDED
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

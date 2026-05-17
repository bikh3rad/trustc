import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Escrow as EscrowApi,
  Procurements as ProcurementsApi,
  type EscrowAccount,
  type Procurement,
} from "../../api";
import { Chip } from "../../components/ui/Chip";
import { ProgressBar } from "../../components/ui/ProgressBar";
import { Stat } from "../../components/ui/Stat";
import { useCurrentStartup } from "../../context/CurrentStartupContext";
import { formatIRR, formatIRRPlain, stateIndex, toFaDigits } from "../../lib/format";
import { isEscrowLocked, PROCUREMENT_STATES } from "../../lib/fsm";

function Pillar({
  title,
  subtitle,
  mono,
  highlight,
}: {
  title: string;
  subtitle: string;
  mono: string;
  highlight?: boolean;
}) {
  return (
    <div
      style={{
        padding: 16,
        border: "1px solid " + (highlight ? "var(--orange-600)" : "var(--navy-700)"),
        borderRadius: 4,
        background: highlight ? "rgba(210,105,30,0.08)" : "transparent",
        textAlign: "center",
      }}
    >
      <div
        className="mono"
        style={{
          fontSize: 10,
          color: highlight ? "var(--orange-500)" : "var(--fg-on-manifest-muted)",
          letterSpacing: "0.14em",
        }}
      >
        {mono}
      </div>
      <div style={{ fontWeight: 700, fontSize: 16, marginTop: 6 }}>{title}</div>
      <div className="muted" style={{ fontSize: 12, color: "var(--fg-on-manifest-muted)", marginTop: 2 }}>
        {subtitle}
      </div>
    </div>
  );
}

export function Escrow() {
  const navigate = useNavigate();
  const { current } = useCurrentStartup();
  const [account, setAccount] = useState<EscrowAccount | null>(null);
  const [procs, setProcs] = useState<Procurement[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!current) return;
    (async () => {
      try {
        const [acc, p] = await Promise.all([
          EscrowApi.account(current.id).catch(() => null),
          ProcurementsApi.list(current.id),
        ]);
        setAccount(acc);
        setProcs(p.procurements.filter((x) => isEscrowLocked(x.state)));
      } catch (e) {
        setErr((e as Error).message);
      }
    })();
  }, [current]);

  const totalLocked = procs.reduce((s, p) => s + p.amount_cents, 0);

  return (
    <div className="stack" style={{ gap: "var(--s-6)" }}>
      <header
        className="row"
        style={{ justifyContent: "space-between", alignItems: "end" }}
      >
        <div>
          <div className="eyebrow">عملیات · اسکرو</div>
          <h1>حساب امانی (اسکرو)</h1>
          <p className="muted" style={{ marginTop: 4, maxWidth: 720 }}>
            وجوه به‌صورت <b>Just-in-Time</b> تنها زمانی قفل می‌شوند که خرید به مرحله ESCROW_LOCK
            برسد و پس از تأیید تحویل، فوراً به ذی‌نفع آزاد می‌شوند.
          </p>
        </div>
      </header>

      {err && (
        <div
          className="card"
          style={{ background: "var(--state-bad-bg)", borderColor: "var(--state-bad)" }}
        >
          <span className="mono" style={{ color: "var(--state-bad)" }}>{err}</span>
        </div>
      )}

      <section className="grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        <Stat
          label="قفل‌شده در خریدها"
          value={formatIRR(totalLocked, { withUnit: false })}
          unit="میلیارد ریال"
          hint={`${toFaDigits(procs.length)} خرید`}
        />
        <Stat
          label="موجودی حساب اسکرو"
          value={
            account
              ? formatIRR(account.balance_cents, { withUnit: false })
              : "—"
          }
          unit={account ? "میلیارد ریال" : undefined}
          hint={
            account
              ? `قفل‌شده ${formatIRR(account.locked_cents)} · در دسترس ${formatIRR(account.available_cents)}`
              : "حساب اسکرو هنوز ایجاد نشده"
          }
        />
        <Stat
          label="میانگین چرخه آزادسازی"
          value={toFaDigits(7)}
          unit="روز"
          delta={{ text: "↓ ۱٫۲ روز نسبت به ماه قبل", tone: "up" }}
        />
      </section>

      <div
        className="card"
        style={{
          background: "var(--navy-900)",
          color: "var(--cream-50)",
          borderColor: "var(--navy-700)",
        }}
      >
        <div className="eyebrow" style={{ color: "var(--orange-500)", marginBottom: 16 }}>
          تفکیک حقوقی-مالیاتی
        </div>
        <div
          className="grid"
          style={{
            gridTemplateColumns: "1fr auto 1fr auto 1fr",
            alignItems: "center",
            gap: 16,
          }}
        >
          <Pillar title="مشتری" subtitle="پرداخت‌کننده" mono="CUSTOMER" />
          <div style={{ fontFamily: "var(--mono-data)", color: "var(--orange-500)", textAlign: "center", fontSize: 24 }}>←</div>
          <Pillar
            title="حساب امانی"
            subtitle="وجوه امانی مأخوذه"
            mono="2103_FIDUCIARY_ESCROW"
            highlight
          />
          <div style={{ fontFamily: "var(--mono-data)", color: "var(--orange-500)", textAlign: "center", fontSize: 24 }}>←</div>
          <Pillar title="تأمین‌کننده" subtitle="ذی‌نفع نهایی" mono="SUPPLIER" />
        </div>
        <p style={{ color: "var(--fg-on-manifest-muted)", fontSize: 13, marginTop: 16 }}>
          مطابق با سامانه مودیان: تراکنش اسکرو ماهیت{" "}
          <b style={{ color: "var(--cream-50)" }}>کارگزاری</b> دارد و در درآمد لایه پلتفرم نمی‌نشیند.
          تکلیف صدور فاکتور رسمی همچنان با شرکت فروشنده (استارتاپ) است.
        </p>
      </div>

      <div className="card responsive-table-card" style={{ padding: 0 }}>
        <div
          className="card-title"
          style={{ padding: "var(--s-5)", marginBottom: 0 }}
        >
          <h3>قفل‌های فعال اسکرو</h3>
          <div className="row" style={{ gap: 8, fontSize: 12 }}>
            <span className="row" style={{ gap: 6 }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  background: "var(--state-active)",
                  borderRadius: 2,
                }}
              />{" "}
              در حال انجام
            </span>
            <span className="row" style={{ gap: 6 }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  background: "var(--state-good)",
                  borderRadius: 2,
                }}
              />{" "}
              آزاد شده
            </span>
          </div>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>خرید</th>
              <th>تأمین‌کننده</th>
              <th>وضعیت</th>
              <th className="num">مبلغ قفل</th>
              <th>پیشرفت</th>
            </tr>
          </thead>
          <tbody>
            {procs.map((p) => {
              const ci = stateIndex(p.state);
              const total = PROCUREMENT_STATES.length;
              const pct = ((ci - 2) / (total - 3)) * 100;
              return (
                <tr key={p.id} onClick={() => navigate(`/procurements/${p.id}`)}>
                  <td>
                    <div style={{ fontWeight: 500 }}>{p.title}</div>
                    <div className="muted mono" style={{ fontSize: 11 }}>
                      {p.id.slice(0, 8)}
                    </div>
                  </td>
                  <td>{p.supplier_name}</td>
                  <td>
                    <Chip state={p.state} />
                  </td>
                  <td className="num">{formatIRRPlain(p.amount_cents)}</td>
                  <td style={{ minWidth: 180 }}>
                    <ProgressBar
                      value={pct}
                      tone={p.state === "PAYMENT_RELEASE" ? "good" : "active"}
                    />
                  </td>
                </tr>
              );
            })}
            {procs.length === 0 && (
              <tr>
                <td colSpan={5}>
                  <div className="empty">
                    <h3>هیچ قفلی فعال نیست</h3>
                    <div>زمانی که خریدی به مرحله ESCROW_LOCK برسد، اینجا نمایش داده می‌شود.</div>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

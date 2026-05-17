// Capital recycling queue. services/credit is not yet implemented; until then
// the queue is computed locally from credit_score / risk_level.
import { useEffect, useMemo, useState } from "react";
import { Startups as StartupsApi, type Startup } from "../../api";
import { Btn } from "../../components/ui/Btn";
import { Icon } from "../../components/ui/Icon";
import { Stat } from "../../components/ui/Stat";
import { useToast } from "../../context/ToastContext";
import { formatIRR, toFaDigits } from "../../lib/format";

type QueueItem = {
  startup: Startup;
  score: number;
  cycleDays: number;
  queued: number;
  reason: string;
};

function reasonFor(s: Startup): string {
  if (s.risk_level === "LOW") return "اعتبار مستحکم";
  if (s.risk_level === "MEDIUM") return "ریسک متوسط";
  if (s.risk_level === "HIGH") return "نیاز به نظارت";
  return "اولویت پایین";
}

function buildQueue(startups: Startup[]): QueueItem[] {
  return startups
    .map((s) => ({
      startup: s,
      score: Math.max(50, Math.min(99, s.credit_score)),
      cycleDays: Math.max(14, 50 - Math.round(s.credit_score / 3)),
      queued: Math.max(0, Math.round(s.credit_score) * 5_000_000_000),
      reason: reasonFor(s),
    }))
    .sort((a, b) => b.score - a.score);
}

function Explain({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div>
      <div
        className="mono"
        style={{ color: "var(--orange-600)", fontWeight: 700, letterSpacing: "0.06em" }}
      >
        {n}
      </div>
      <div style={{ fontWeight: 600, fontSize: 16, marginTop: 6 }}>{title}</div>
      <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>{body}</div>
    </div>
  );
}

export function Recycling() {
  const { toast } = useToast();
  const [startups, setStartups] = useState<Startup[]>([]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [flying, setFlying] = useState<Set<string>>(new Set());
  const [cycle, setCycle] = useState(0);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await StartupsApi.list();
        setStartups(r.startups);
        setQueue(buildQueue(r.startups));
      } catch (e) {
        setErr((e as Error).message);
      }
    })();
  }, []);

  function runCycle() {
    const next = queue
      .map((q) => ({
        ...q,
        score: Math.max(50, Math.min(99, q.score + Math.floor(Math.random() * 10 - 5))),
      }))
      .sort((a, b) => b.score - a.score);
    setFlying(new Set(next.map((q) => q.startup.id)));
    setQueue(next);
    setCycle((c) => c + 1);
    window.setTimeout(() => setFlying(new Set()), 900);
    toast({
      tone: "good",
      msg: "چرخه بازیافت اجرا شد. سرمایه به اولویت‌های جدید تخصیص یافت.",
    });
  }

  const totalQueued = useMemo(() => queue.reduce((s, q) => s + q.queued, 0), [queue]);

  return (
    <div className="stack" style={{ gap: "var(--s-6)" }}>
      <header
        className="row"
        style={{ justifyContent: "space-between", alignItems: "end" }}
      >
        <div>
          <div className="eyebrow">پورتفولیو · موتور اهرم‌سازی</div>
          <h1>صف بازیافت سرمایه</h1>
          <p className="muted" style={{ marginTop: 4, maxWidth: 720 }}>
            به‌محض بازگشت پول به اسکرو، سرمایه مطابق امتیاز نقدینگی به استارتاپ بعدی در صف تخصیص می‌یابد.
          </p>
          <p
            className="mono"
            style={{ fontSize: 11, marginTop: 6, color: "var(--state-warn)" }}
          >
            ⚠ سرویس backend برای موتور اعتبار/بازیافت هنوز پیاده‌سازی نشده — امتیاز نمایشی.
          </p>
        </div>
        <Btn variant="primary" icon={<Icon.recycle />} onClick={runCycle}>
          اجرای چرخه بازیافت
        </Btn>
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
          label="کل در صف"
          value={formatIRR(totalQueued, { withUnit: false })}
          unit="میلیارد ریال"
        />
        <Stat
          label="چرخه‌های اجراشده"
          value={toFaDigits(cycle)}
          unit="در این جلسه"
        />
        <Stat
          label="استارتاپ‌ها"
          value={toFaDigits(startups.length)}
          unit="در صف"
        />
      </section>

      <div className="card">
        <div className="card-title">
          <h3>اولویت تخصیص فعلی</h3>
          <div className="muted mono" style={{ fontSize: 11 }}>
            SCORING: velocity × reliability × turnover
          </div>
        </div>
        <div className="queue">
          {queue.map((q, i) => (
            <div
              key={q.startup.id}
              className={"queue-item" + (flying.has(q.startup.id) ? " flying" : "")}
            >
              <div className="pos">#{toFaDigits(i + 1)}</div>
              <div>
                <div className="name">{q.startup.startup_name}</div>
                <div className="muted" style={{ fontSize: 12 }}>
                  {q.reason} · چرخه نقدینگی {toFaDigits(q.cycleDays)} روز
                </div>
              </div>
              <div className="row" style={{ gap: 4 }}>
                <span className="eyebrow">امتیاز</span>
                <span
                  className="mono"
                  style={{ fontWeight: 700, color: "var(--state-good)" }}
                >
                  {toFaDigits(q.score)}
                </span>
              </div>
              <div
                className="mono"
                style={{ fontWeight: 600, minWidth: 130, textAlign: "end" }}
              >
                {formatIRR(q.queued)}
              </div>
            </div>
          ))}
          {queue.length === 0 && (
            <div className="empty">
              <h3>صف خالی است</h3>
            </div>
          )}
        </div>
      </div>

      <div className="card flat">
        <div className="eyebrow">نحوه عملکرد</div>
        <div
          className="grid"
          style={{
            gridTemplateColumns: "repeat(3, 1fr)",
            marginTop: 12,
            gap: 24,
          }}
        >
          <Explain
            n="۰۱"
            title="درآمد ورودی"
            body="پرداخت مشتری به اسکرو یا حساب شرکت + شارژ خودکار خط اعتباری."
          />
          <Explain
            n="۰۲"
            title="موتور بازیافت"
            body="پول بلافاصله وارد صف ادغام‌شده‌ی پورتفوی می‌شود."
          />
          <Explain
            n="۰۳"
            title="تخصیص پویا"
            body="بر اساس امتیاز نقدینگی، خرید استارتاپ بعدی تأیید می‌شود."
          />
        </div>
      </div>
    </div>
  );
}

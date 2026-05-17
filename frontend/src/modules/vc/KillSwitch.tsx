import { useEffect, useState } from "react";
import {
  Governance as GovernanceApi,
  Startups as StartupsApi,
  type FreezeDuration,
  type FreezeScope,
  type Startup,
} from "../../api";
import { Btn } from "../../components/ui/Btn";
import { Icon } from "../../components/ui/Icon";
import { Modal } from "../../components/ui/Modal";
import { useFrozen } from "../../context/FrozenContext";
import { useToast } from "../../context/ToastContext";
import { riskLabelFa, toFaDigits } from "../../lib/format";

function riskClass(r: string): string {
  switch (r) {
    case "LOW":
      return "low";
    case "MEDIUM":
      return "medium";
    case "HIGH":
      return "high";
    case "CRITICAL":
      return "critical";
    default:
      return "low";
  }
}

export function KillSwitch() {
  const { isFrozen, byStartup, refresh: refreshFrozen } = useFrozen();
  const { toast } = useToast();
  const [startups, setStartups] = useState<Startup[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<Startup | null>(null);
  const [scope, setScope] = useState<FreezeScope>("FULL");
  const [duration, setDuration] = useState<FreezeDuration>("TEMPORARY");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function refresh() {
    try {
      const r = await StartupsApi.list();
      setStartups(r.startups);
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function execute() {
    if (!confirming) return;
    if (!reason.trim()) {
      toast({ tone: "bad", msg: "دلیل فریز الزامی است." });
      return;
    }
    setBusy(true);
    try {
      await GovernanceApi.activate({
        startup_id: confirming.id,
        scope,
        duration,
        reason: reason.trim(),
      });
      toast({ tone: "bad", msg: `Kill Switch فعال شد · ${confirming.startup_name}` });
      setConfirming(null);
      setReason("");
      await refreshFrozen();
    } catch (e) {
      toast({ tone: "bad", msg: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function unfreeze(startupId: string) {
    const f = byStartup.get(startupId);
    if (!f) return;
    setBusy(true);
    try {
      await GovernanceApi.lift(f.id, "رفع تعلیق توسط VC");
      toast({ tone: "good", msg: "فریز لغو شد · جریان‌های کاری مجدداً فعال شدند" });
      await refreshFrozen();
    } catch (e) {
      toast({ tone: "bad", msg: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  const eligible = startups.filter((s) => !isFrozen(s.id));
  const frozen = startups.filter((s) => isFrozen(s.id));

  return (
    <div className="stack" style={{ gap: "var(--s-6)" }}>
      <header>
        <div className="eyebrow">حاکمیت · کنترل اضطراری</div>
        <h1>تعلیق آنی پرداخت‌ها (Kill Switch)</h1>
        <p className="muted" style={{ marginTop: 4, maxWidth: 720 }}>
          در صورت مشاهده انحراف، Kill Switch تمام پرداخت‌های خروجی و ارتقای خودکار خط اعتباری
          را برای استارتاپ هدف متوقف می‌کند. این اقدام بلافاصله بر کل سیستم تأثیر می‌گذارد.
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

      <div
        className="card"
        style={{ background: "var(--state-bad-bg)", borderColor: "var(--state-bad)" }}
      >
        <div className="row" style={{ gap: 12 }}>
          <Icon.alert size={24} style={{ color: "var(--state-bad)" }} />
          <div>
            <div style={{ fontWeight: 700, color: "var(--state-bad)" }}>
              اقدام بازگشت‌ناپذیر
            </div>
            <div style={{ fontSize: 13, marginTop: 2 }}>
              تمام جریان‌های کاری در حال انجام به وضعیت <span className="mono">FROZEN</span>{" "}
              منتقل می‌شوند. لغو فریز نیازمند یک سند رسمی پشتیبان است.
            </div>
          </div>
        </div>
      </div>

      <div className="grid two-col-shrink" style={{ gridTemplateColumns: "1fr 1fr", gap: "var(--s-6)" }}>
        <div className="card">
          <div className="card-title">
            <h3>استارتاپ‌های فعال</h3>
            <span className="muted mono" style={{ fontSize: 11 }}>
              {toFaDigits(eligible.length)} مورد
            </span>
          </div>
          <div className="stack" style={{ gap: 8 }}>
            {eligible.map((s) => (
              <div
                key={s.id}
                className="heat-cell"
                data-risk={riskClass(s.risk_level)}
                style={{ cursor: "default" }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>{s.startup_name}</div>
                  <div className="muted" style={{ fontSize: 12 }}>
                    اعتبار {toFaDigits(s.credit_score)} · ریسک {riskLabelFa(s.risk_level)}
                  </div>
                </div>
                <Btn
                  variant="danger"
                  size="sm"
                  icon={<Icon.freeze />}
                  onClick={() => setConfirming(s)}
                  disabled={busy}
                >
                  فریز
                </Btn>
              </div>
            ))}
            {eligible.length === 0 && (
              <div className="empty">
                <h3>هیچ استارتاپی برای فریز موجود نیست</h3>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-title">
            <h3>در حال تعلیق</h3>
            <span className="muted mono" style={{ fontSize: 11 }}>
              {toFaDigits(frozen.length)} مورد
            </span>
          </div>
          {frozen.length === 0 ? (
            <div className="empty">
              <h3>هیچ استارتاپی فریز نیست</h3>
              <div>وضعیت پورتفوی پایدار است.</div>
            </div>
          ) : (
            <div className="stack" style={{ gap: 8 }}>
              {frozen.map((s) => {
                const f = byStartup.get(s.id);
                return (
                  <div
                    key={s.id}
                    className="heat-cell"
                    data-risk="frozen"
                    style={{ cursor: "default" }}
                  >
                    <div>
                      <div style={{ fontWeight: 600 }}>{s.startup_name}</div>
                      <div className="muted mono" style={{ fontSize: 11 }}>
                        FROZEN · {f?.scope === "PARTIAL" ? "بخشی" : "کامل"}{" "}
                        {f?.duration === "PERMANENT" ? "(دائمی)" : ""}
                      </div>
                      {f?.reason && (
                        <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>
                          {f.reason}
                        </div>
                      )}
                    </div>
                    <Btn
                      variant="secondary"
                      size="sm"
                      onClick={() => unfreeze(s.id)}
                      disabled={busy}
                    >
                      لغو فریز
                    </Btn>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Modal
        open={!!confirming}
        onClose={() => setConfirming(null)}
        title={`تأیید فریز · ${confirming?.startup_name ?? ""}`}
        manifest
        footer={
          <>
            <Btn variant="ghost" onClick={() => setConfirming(null)} disabled={busy}>
              انصراف
            </Btn>
            <Btn variant="danger" onClick={execute} disabled={busy}>
              تأیید نهایی و اجرا
            </Btn>
          </>
        }
      >
        <div className="stack" style={{ gap: 16 }}>
          <div
            style={{
              padding: 12,
              background: "rgba(168,49,42,0.15)",
              border: "1px solid var(--state-bad)",
              borderRadius: 4,
            }}
          >
            <div
              className="mono"
              style={{
                fontSize: 11,
                color: "var(--orange-500)",
                letterSpacing: "0.08em",
              }}
            >
              WARNING · IRREVERSIBLE
            </div>
            <div style={{ fontSize: 13, marginTop: 4 }}>
              این اقدام تمام پرداخت‌های در جریان{" "}
              <b>{confirming?.startup_name}</b> را در همین لحظه متوقف می‌کند.
            </div>
          </div>
          <div className="field">
            <label className="field-label">دامنه فریز</label>
            <div className="seg">
              <button
                className={scope === "FULL" ? "active" : ""}
                onClick={() => setScope("FULL")}
              >
                FULL
              </button>
              <button
                className={scope === "PARTIAL" ? "active" : ""}
                onClick={() => setScope("PARTIAL")}
              >
                PARTIAL
              </button>
            </div>
          </div>
          <div className="field">
            <label className="field-label">مدت زمان</label>
            <div className="seg">
              <button
                className={duration === "TEMPORARY" ? "active" : ""}
                onClick={() => setDuration("TEMPORARY")}
              >
                TEMPORARY
              </button>
              <button
                className={duration === "PERMANENT" ? "active" : ""}
                onClick={() => setDuration("PERMANENT")}
              >
                PERMANENT
              </button>
            </div>
          </div>
          <div className="field">
            <label className="field-label">دلیل (مستندسازی الزامی)</label>
            <textarea
              className="textarea"
              placeholder="مثال: تمرکز غیرعادی پیش‌فاکتورهای تأیید‌نشده در ۲۴ ساعت گذشته."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}

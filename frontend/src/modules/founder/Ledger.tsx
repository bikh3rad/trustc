import { useEffect, useRef, useState } from "react";
import { Ledger as LedgerApi, type LedgerEntry } from "../../api";
import { Stat } from "../../components/ui/Stat";
import { formatIRR, formatIRRPlain, toFaDigits } from "../../lib/format";
import { useIsMobile } from "../../lib/useIsMobile";

const POLL_MS = 4000;

export function Ledger() {
  const isMobile = useIsMobile();
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [freshIds, setFreshIds] = useState<Set<string>>(new Set());
  const [err, setErr] = useState<string | null>(null);
  const knownIds = useRef<Set<string>>(new Set());

  async function refresh() {
    try {
      const r = await LedgerApi.list();
      const incoming = r.entries;
      const newlyAdded = new Set<string>();
      for (const e of incoming) {
        if (!knownIds.current.has(e.id)) newlyAdded.add(e.id);
      }
      // First load — don't flash everything.
      if (knownIds.current.size > 0 && newlyAdded.size > 0) {
        setFreshIds(newlyAdded);
        window.setTimeout(() => setFreshIds(new Set()), 600);
      }
      incoming.forEach((e) => knownIds.current.add(e.id));
      setEntries(incoming);
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  useEffect(() => {
    void refresh();
    const t = window.setInterval(refresh, POLL_MS);
    return () => window.clearInterval(t);
  }, []);

  const totalDebit = entries.reduce((s, e) => s + e.total_cents, 0);
  const totalCredit = totalDebit; // ledger invariant: Σ debits = Σ credits per transaction
  const balanced = totalDebit === totalCredit;

  return (
    <div className="stack" style={{ gap: "var(--s-6)" }}>
      <header>
        <div className="eyebrow">حسابداری · لایو</div>
        <h1>دفتر کل (Double-Entry)</h1>
        <p className="muted" style={{ marginTop: 4, maxWidth: 720 }}>
          هر تراکنش به‌صورت همزمان با وقوع عملیات در دفتر کل ثبت می‌شود.
          سرفصل‌ها فقط افزودنی (append-only) هستند — برای اصلاح، باید سند معکوس صادر کنید.
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

      <section className="grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        <Stat
          label="جمع بدهکار"
          value={formatIRR(totalDebit, { withUnit: false })}
          unit="میلیارد ریال"
        />
        <Stat
          label="جمع بستانکار"
          value={formatIRR(totalCredit, { withUnit: false })}
          unit="میلیارد ریال"
        />
        <Stat
          label="تراز"
          value={balanced ? "متوازن ✓" : "نامتوازن"}
          delta={{
            text: "Σ Debits = Σ Credits",
            tone: balanced ? "up" : "down",
          }}
        />
      </section>

      <div className="card" style={{ padding: 0 }}>
        <div
          style={{
            padding: "var(--s-4) var(--s-5)",
            borderBottom: "1px solid var(--border-hairline)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h3>اسناد اخیر</h3>
          <div className="muted mono" style={{ fontSize: 11 }}>
            تازه‌ترین رویداد:{" "}
            {entries[0]
              ? toFaDigits(new Date(entries[0].posted_at).toLocaleString("fa-IR"))
              : "—"}
          </div>
        </div>
        {isMobile ? (
          <div style={{ padding: "var(--s-4)" }}>
            {entries.length === 0 ? (
              <div className="empty">
                <h3>هنوز سندی ثبت نشده</h3>
                <div>
                  به‌محض رخداد قفل اسکرو یا آزادسازی پرداخت، اینجا نمایش داده می‌شود.
                </div>
              </div>
            ) : (
              <div className="mobile-list">
                {entries.map((e) => (
                  <div
                    key={e.id}
                    className={
                      "mobile-card" + (freshIds.has(e.id) ? " fresh" : "")
                    }
                    style={{ cursor: "default" }}
                  >
                    <div
                      className="row"
                      style={{
                        justifyContent: "space-between",
                        alignItems: "start",
                        gap: 12,
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div
                          className="mono"
                          style={{ fontSize: 12, fontWeight: 600 }}
                        >
                          {e.transaction_id}
                        </div>
                        <div
                          className="muted"
                          style={{ fontSize: 12, marginTop: 2 }}
                        >
                          {e.description ?? ""}
                        </div>
                      </div>
                      <div
                        className="muted mono"
                        style={{ fontSize: 10, flexShrink: 0 }}
                      >
                        {toFaDigits(
                          new Date(e.posted_at).toLocaleString("fa-IR"),
                        )}
                      </div>
                    </div>
                    <div className="mobile-card-meta" style={{ gap: 16 }}>
                      <span style={{ color: "var(--state-good)" }}>
                        بدهکار: {formatIRRPlain(e.total_cents)}
                      </span>
                      <span style={{ color: "var(--state-bad)" }}>
                        بستانکار: {formatIRRPlain(e.total_cents)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="ledger-row head">
              <span>تاریخ</span>
              <span>شناسه سند</span>
              <span>شرح</span>
              <span className="debit">بدهکار</span>
              <span className="credit">بستانکار</span>
            </div>
            {entries.map((e) => (
              <div
                key={e.id}
                className={"ledger-row" + (freshIds.has(e.id) ? " fresh" : "")}
              >
                <span className="muted">
                  {toFaDigits(new Date(e.posted_at).toLocaleString("fa-IR"))}
                </span>
                <span>
                  <div className="mono" style={{ fontSize: 11 }}>
                    {e.transaction_id}
                  </div>
                  {e.workflow_reference_id && (
                    <span
                      className="mono"
                      style={{ color: "var(--fg-muted)", fontSize: 11 }}
                    >
                      → {e.workflow_reference_id.slice(0, 8)}
                    </span>
                  )}
                </span>
                <span className="muted" style={{ fontSize: 12 }}>
                  {e.description ?? ""}
                </span>
                <span className="debit">{formatIRRPlain(e.total_cents)}</span>
                <span className="credit">{formatIRRPlain(e.total_cents)}</span>
              </div>
            ))}
            {entries.length === 0 && (
              <div className="empty">
                <h3>هنوز سندی ثبت نشده</h3>
                <div>
                  به‌محض رخداد قفل اسکرو یا آزادسازی پرداخت، اینجا نمایش داده می‌شود.
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div
        className="card flat"
        style={{
          background: "var(--cream-100)",
          border: "1px dashed var(--cream-300)",
        }}
      >
        <div className="eyebrow" style={{ marginBottom: 8 }}>
          قاعده ثابت · غیرقابل تغییر
        </div>
        <p className="mono" style={{ fontSize: 14 }}>
          ∑ Debits = ∑ Credits · هیچ UPDATE یا DELETE روی{" "}
          <span style={{ color: "var(--state-bad)" }}>journal_entries</span> مجاز نیست.
        </p>
      </div>
    </div>
  );
}

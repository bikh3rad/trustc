/* ============================================================
   trustC — Invoices · Escrow · Ledger (founder side)
   ============================================================ */

const { useState: useStateB, useEffect: useEffectB } = React;

/* ============================================================
   SCREEN: فاکتورهای فروش · ارتقای خط اعتباری
   ------------------------------------------------------------
   Shows customer invoices + the dual-pathway (ESCROW_DIRECT
   vs SELF_FUNDED). Triggering "وصول" on an OPEN invoice
   immediately bumps the credit line — the Wealth Management
   mechanism described in PRD §3.3 / §11.
   ============================================================ */
function InvoicesScreen({ ctx }) {
  const startup = ctx.currentStartup;
  const [invoices, setInvoices] = useStateB(
    window.trustcData.customerInvoices.filter(i => i.startupId === startup.id)
  );
  const [creditBumpVisual, setCreditBumpVisual] = useStateB(null);
  const [showNew, setShowNew] = useStateB(false);

  function settle(inv) {
    if (ctx.frozen) {
      ctx.toast({ tone: "bad", msg: "وصول فاکتور مسدود — استارتاپ فریز شده." });
      return;
    }
    setInvoices(list => list.map(i => i.id === inv.id ? { ...i, status: "PAID", paidAt: new Date().toLocaleDateString("fa-IR") } : i));
    setCreditBumpVisual({ id: inv.id, amount: inv.amount, mode: inv.mode });
    setTimeout(() => setCreditBumpVisual(null), 2200);
    ctx.bumpCreditLine(inv.amount);
    ctx.emitLedger({
      txn: "txn_" + Math.random().toString(36).slice(2,8),
      at: new Date().toLocaleString("fa-IR"),
      ref: inv.id,
      desc: `وصول فاکتور · ${inv.customer}`,
      entries: [
        { code: inv.mode === "ESCROW" ? "2103" : "1001",
          account: inv.mode === "ESCROW" ? "وجوه امانی مأخوذه · اسکرو" : "بانک · حساب عملیاتی",
          debit: inv.amount, credit: 0 },
        { code: "4001", account: "درآمد فروش", debit: 0, credit: inv.amount },
      ],
    });
    ctx.toast({ tone: "good", msg: `+${window.tc.formatIRR(inv.amount)} به خط اعتباری اضافه شد` });
  }

  const open = invoices.filter(i => i.status === "OPEN");
  const paid = invoices.filter(i => i.status === "PAID");
  const totalOpen = open.reduce((s,i) => s + i.amount, 0);
  const totalPaid = paid.reduce((s,i) => s + i.amount, 0);

  return (
    <div className="stack" style={{ gap: "var(--s-6)" }}>
      <header className="row" style={{ justifyContent: "space-between", alignItems: "end" }}>
        <div>
          <div className="eyebrow">عملیات · فروش</div>
          <h1>فاکتورهای فروش</h1>
          <p className="muted" style={{ marginTop: 4 }}>
            وصول هر فاکتور به‌صورت خودکار سقف خط اعتباری شما را افزایش می‌دهد.
          </p>
        </div>
        <Btn variant="primary" icon={<Icon.plus />} onClick={() => setShowNew(true)}>صدور فاکتور جدید</Btn>
      </header>

      <section className="grid stat-grid stat-grid--3">
        <Stat label="مطالبات باز" value={window.tc.formatIRR(totalOpen, { withUnit: false })} unit="میلیارد ریال" hint={`${window.tc.toFaDigits(open.length)} فاکتور`} />
        <Stat label="وصول این ماه"   value={window.tc.formatIRR(totalPaid, { withUnit: false })} unit="میلیارد ریال" hint={`${window.tc.toFaDigits(paid.length)} فاکتور`} />
        <Stat label="سقف اعتباری فعلی" value={window.tc.formatIRR(startup.creditLine, { withUnit: false })} unit="میلیارد ریال" delta={creditBumpVisual ? { text: `+${window.tc.formatIRR(creditBumpVisual.amount, {withUnit:false})}`, tone: "up" } : null} />
      </section>

      {/* Dual-pathway explainer */}
      <div className="card">
        <div className="card-title"><h3>دو الگوی تسویه</h3></div>
        <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: "var(--s-5)" }}>
          <div style={{ padding: "var(--s-4)", border: "1px solid var(--state-active)", borderRadius: "var(--r-2)", background: "var(--state-active-bg)" }}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <div className="mono" style={{ fontWeight: 600, color: "var(--state-active)" }}>ESCROW_DIRECT</div>
              <span className="chip" data-tone="active">الگوی الف</span>
            </div>
            <p style={{ fontSize: 13, marginTop: 8 }}>وجه مشتری مستقیماً به حساب امانی پلتفرم. وثیقه چرخشی فوری. مالیات صفر در لایه اسکرو.</p>
          </div>
          <div style={{ padding: "var(--s-4)", border: "1px solid var(--state-good)", borderRadius: "var(--r-2)", background: "var(--state-good-bg)" }}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <div className="mono" style={{ fontWeight: 600, color: "var(--state-good)" }}>SELF_FUNDED</div>
              <span className="chip" data-tone="good">الگوی ب</span>
            </div>
            <p style={{ fontSize: 13, marginTop: 8 }}>وجه به حساب بانکی شرکت. مالیات منطبق با سامانه مودیان. شارژ خودکار خط اعتباری به‌محض ورود نقدینگی.</p>
          </div>
        </div>
      </div>

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
            {invoices.map(inv => (
              <tr key={inv.id}>
                <td className="mono" style={{ fontSize: 12 }}>{inv.id}</td>
                <td>{inv.customer}</td>
                <td>
                  <span className={"chip"} data-tone={inv.mode === "ESCROW" ? "active" : "good"}>
                    <span className="mono">{inv.mode === "ESCROW" ? "ESCROW_DIRECT" : "SELF_FUNDED"}</span>
                  </span>
                </td>
                <td><Chip state={inv.status} /></td>
                <td className="num">{window.tc.formatIRRPlain(inv.amount)}</td>
                <td className="mono muted" style={{ fontSize: 12 }}>{window.tc.toFaDigits(inv.issuedAt)}</td>
                <td>
                  {inv.status === "OPEN" ? (
                    <Btn variant="secondary" size="sm" onClick={() => settle(inv)}>ثبت وصول</Btn>
                  ) : (
                    <span className="muted mono" style={{ fontSize: 11 }}>{window.tc.toFaDigits(inv.paidAt || "")}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Credit-bump celebratory overlay */}
      {creditBumpVisual && (
        <div style={{ position: "fixed", bottom: 32, insetInlineStart: 32, zIndex: 90 }}>
          <div className="card" style={{ background: "var(--navy-900)", color: "var(--cream-50)", borderColor: "var(--orange-600)", boxShadow: "var(--shadow-2)", minWidth: 320, animation: "fly 800ms var(--ease-document)" }}>
            <div className="eyebrow" style={{ color: "var(--orange-500)" }}>ارتقای خط اعتباری</div>
            <div className="mono" style={{ fontSize: 22, fontWeight: 700, marginTop: 8 }}>
              +{window.tc.formatIRR(creditBumpVisual.amount)}
            </div>
            <div style={{ fontSize: 12, marginTop: 6, color: "var(--fg-on-manifest-muted)" }}>
              الگوی {creditBumpVisual.mode === "ESCROW" ? "ESCROW_DIRECT" : "SELF_FUNDED"} · فعال در همین لحظه
            </div>
          </div>
        </div>
      )}

      <NewInvoiceModal open={showNew} onClose={() => setShowNew(false)} onCreate={(inv) => {
        setInvoices(list => [{ ...inv, id: "cinv_" + Math.random().toString(36).slice(2,5), startupId: startup.id, status: "OPEN", issuedAt: new Date().toLocaleDateString("fa-IR") }, ...list]);
        setShowNew(false);
        ctx.toast({ tone: "good", msg: "فاکتور جدید صادر شد و لینک پرداخت ساخته شد." });
      }} />
    </div>
  );
}

function NewInvoiceModal({ open, onClose, onCreate }) {
  const [form, setForm] = useStateB({ customer: "", amount: "", mode: "ESCROW" });
  function submit() {
    if (!form.customer || !form.amount) return;
    onCreate({ customer: form.customer, amount: window.tc.parsePersianNumber(form.amount), mode: form.mode });
    setForm({ customer: "", amount: "", mode: "ESCROW" });
  }
  return (
    <Modal open={open} onClose={onClose} title="صدور فاکتور فروش جدید"
      footer={<><Btn variant="ghost" onClick={onClose}>انصراف</Btn><Btn variant="primary" onClick={submit}>صدور و ساخت لینک</Btn></>}>
      <div className="stack" style={{ gap: 16 }}>
        <FormField label="نام مشتری"><input className="input" value={form.customer} onChange={e => setForm(f => ({ ...f, customer: e.target.value }))} /></FormField>
        <FormField label="مبلغ (ریال)"><input className="input mono" placeholder="48,000,000,000" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} /></FormField>
        <FormField label="الگوی تسویه">
          <div className="seg">
            <button className={form.mode === "ESCROW" ? "active" : ""} onClick={() => setForm(f => ({ ...f, mode: "ESCROW" }))}>ESCROW_DIRECT</button>
            <button className={form.mode === "DIRECT" ? "active" : ""} onClick={() => setForm(f => ({ ...f, mode: "DIRECT" }))}>SELF_FUNDED</button>
          </div>
        </FormField>
      </div>
    </Modal>
  );
}

/* ============================================================
   SCREEN: اسکرو · لحظه قفل JIT
   ------------------------------------------------------------
   Visualizes all escrow-locked procurements + the JIT
   capacity. Clicking on one triggers the lock-animation
   stamp (re-used from procurement detail).
   ============================================================ */
function EscrowScreen({ ctx }) {
  const startup = ctx.currentStartup;
  const procs = window.trustcData.procurements
    .filter(p => p.startupId === startup.id)
    .filter(p => ["ESCROW_LOCK","SUPPLIER_DISPATCH","DELIVERY_CONFIRMATION","PAYMENT_RELEASE"].includes(p.state));
  const totalLocked = procs.reduce((s,p) => s + p.amount, 0);

  return (
    <div className="stack" style={{ gap: "var(--s-6)" }}>
      <header className="row" style={{ justifyContent: "space-between", alignItems: "end" }}>
        <div>
          <div className="eyebrow">عملیات · اسکرو</div>
          <h1>حساب امانی (اسکرو)</h1>
          <p className="muted" style={{ marginTop: 4 }}>
            وجوه به‌صورت <b>Just-in-Time</b> تنها زمانی قفل می‌شوند که خرید به مرحله ESCROW_LOCK برسد و پس از تأیید تحویل، فوراً به ذی‌نفع آزاد می‌شوند.
          </p>
        </div>
      </header>

      <section className="grid stat-grid stat-grid--3">
        <Stat label="کل قفل‌شده در اسکرو" value={window.tc.formatIRR(totalLocked, { withUnit: false })} unit="میلیارد ریال" />
        <Stat label="ظرفیت قفل JIT"      value={window.tc.formatIRR(startup.creditLine - startup.creditUsed + totalLocked, { withUnit: false })} unit="میلیارد ریال" hint="بر اساس سقف اعتباری" />
        <Stat label="میانگین چرخه آزادسازی" value={window.tc.toFaDigits(7)} unit="روز" delta={{ text: "↓ ۱٫۲ روز نسبت به ماه قبل", tone: "up" }} />
      </section>

      {/* Stencil-style mini diagram */}
      <div className="card" style={{ background: "var(--navy-900)", color: "var(--cream-50)", borderColor: "var(--navy-700)" }}>
        <div className="eyebrow" style={{ color: "var(--orange-500)", marginBottom: 16 }}>تفکیک حقوقی-مالیاتی</div>
        <div className="grid" style={{ gridTemplateColumns: "1fr auto 1fr auto 1fr", alignItems: "center", gap: 16 }}>
          <Pillar title="مشتری" subtitle="پرداخت‌کننده" mono="CUSTOMER" />
          <Arrow />
          <Pillar title="حساب امانی" subtitle="وجوه امانی مأخوذه" mono="2103_FIDUCIARY_ESCROW" highlight />
          <Arrow />
          <Pillar title="تأمین‌کننده" subtitle="ذی‌نفع نهایی" mono="SUPPLIER" />
        </div>
        <p style={{ color: "var(--fg-on-manifest-muted)", fontSize: 13, marginTop: 16 }}>
          مطابق با سامانه مودیان: تراکنش اسکرو ماهیت <b style={{ color: "var(--cream-50)" }}>کارگزاری</b> دارد و در درآمد لایه پلتفرم نمی‌نشیند.
          تکلیف صدور فاکتور رسمی همچنان با شرکت فروشنده (استارتاپ) است.
        </p>
      </div>

      <div className="card responsive-table-card" style={{ padding: 0 }}>
        <div className="card-title" style={{ padding: "var(--s-5)", marginBottom: 0 }}>
          <h3>قفل‌های فعال اسکرو</h3>
          <div className="row" style={{ gap: 8, fontSize: 12 }}>
            <span className="row" style={{ gap: 6 }}><span style={{ width: 8, height: 8, background: "var(--state-active)", borderRadius: 2 }} /> در حال انجام</span>
            <span className="row" style={{ gap: 6 }}><span style={{ width: 8, height: 8, background: "var(--state-good)", borderRadius: 2 }} /> آزاد شده</span>
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
            {procs.map(p => {
              const fsm = window.trustcData.procurementFSM;
              const ci = window.tc.stateIndex(p.state);
              const pct = ((ci - 2) / (fsm.length - 3)) * 100;
              return (
                <tr key={p.id} onClick={() => ctx.setRoute("procurements", p.id)}>
                  <td>
                    <div style={{ fontWeight: 500 }}>{p.title}</div>
                    <div className="muted mono" style={{ fontSize: 11 }}>{p.id}</div>
                  </td>
                  <td>{window.tc.getSupplier(p.supplierId)?.name}</td>
                  <td><Chip state={p.state} /></td>
                  <td className="num">{window.tc.formatIRRPlain(p.amount)}</td>
                  <td style={{ minWidth: 180 }}>
                    <ProgressBar value={pct} tone={p.state === "PAYMENT_RELEASE" ? "good" : "active"} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Pillar({ title, subtitle, mono, highlight }) {
  return (
    <div style={{
      padding: 16, border: "1px solid " + (highlight ? "var(--orange-600)" : "var(--navy-700)"),
      borderRadius: 4, background: highlight ? "rgba(210,105,30,0.08)" : "transparent", textAlign: "center"
    }}>
      <div className="mono" style={{ fontSize: 10, color: highlight ? "var(--orange-500)" : "var(--fg-on-manifest-muted)", letterSpacing: "0.14em" }}>{mono}</div>
      <div style={{ fontWeight: 700, fontSize: 16, marginTop: 6 }}>{title}</div>
      <div className="muted" style={{ fontSize: 12, color: "var(--fg-on-manifest-muted)", marginTop: 2 }}>{subtitle}</div>
    </div>
  );
}
function Arrow() {
  return <div style={{ fontFamily: "var(--mono-data)", color: "var(--orange-500)", textAlign: "center", fontSize: 24 }}>←</div>;
}

/* ============================================================
   SCREEN: دفتر کل · ثبت زنده دوبل آنتری
   ------------------------------------------------------------
   Watches ctx.ledgerStream. Newest entry flashes orange briefly.
   ============================================================ */
function LedgerScreen({ ctx }) {
  const entries = ctx.ledger;
  const isMobile = useIsMobile();
  const totals = entries.reduce((acc, t) => {
    t.entries.forEach(e => { acc.debit += e.debit; acc.credit += e.credit; });
    return acc;
  }, { debit: 0, credit: 0 });

  return (
    <div className="stack" style={{ gap: "var(--s-6)" }}>
      <header>
        <div className="eyebrow">حسابداری · لایو</div>
        <h1>دفتر کل (Double-Entry)</h1>
        <p className="muted" style={{ marginTop: 4, maxWidth: 720 }}>
          هر تراکنش به‌صورت همزمان با وقوع عملیات در دفتر کل ثبت می‌شود. سرفصل‌ها فقط افزودنی (append-only) هستند — برای اصلاح، باید سند معکوس صادر کنید.
        </p>
      </header>

      <section className="grid stat-grid stat-grid--3">
        <Stat label="جمع بدهکار" value={window.tc.formatIRR(totals.debit, { withUnit: false })} unit="میلیارد ریال" />
        <Stat label="جمع بستانکار" value={window.tc.formatIRR(totals.credit, { withUnit: false })} unit="میلیارد ریال" />
        <Stat label="تراز" value={totals.debit === totals.credit ? "متوازن ✓" : "نامتوازن"} delta={{ text: "Σ Debits = Σ Credits", tone: totals.debit === totals.credit ? "up" : "down" }} />
      </section>

      {isMobile ? (
        <div className="mobile-list">
          {entries.map(t => (
            <div key={t.txn} className={"mobile-card" + (t._fresh ? " fresh" : "")} style={{ cursor: "default", animation: t._fresh ? "fresh 480ms var(--ease-document)" : null }}>
              <div className="row" style={{ justifyContent: "space-between", marginBottom: 8 }}>
                <div>
                  <div className="mono" style={{ fontSize: 11, color: "var(--fg-muted)" }}>{t.txn}</div>
                  <div style={{ fontWeight: 600, marginTop: 2 }}>{t.desc}</div>
                </div>
                <div className="mono muted" style={{ fontSize: 11, textAlign: "end" }}>{window.tc.toFaDigits(t.at)}</div>
              </div>
              <div className="stack" style={{ gap: 6, marginTop: 8, paddingTop: 8, borderTop: "1px dashed var(--border-hairline)" }}>
                {t.entries.map((e, i) => (
                  <div key={i} className="row" style={{ justifyContent: "space-between", fontFamily: "var(--mono-data)", fontSize: 12, fontVariantNumeric: "tabular-nums" }}>
                    <span style={{ minWidth: 0 }}>
                      <span className="muted" style={{ fontSize: 10 }}>{e.code}</span>{" "}
                      <span>{e.account}</span>
                    </span>
                    <span style={{ flexShrink: 0, color: e.debit ? "var(--state-bad)" : "var(--state-good)", fontWeight: 600 }}>
                      {e.debit ? "بد · " + window.tc.formatIRRPlain(e.debit) : "بس · " + window.tc.formatIRRPlain(e.credit)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card responsive-table-card" style={{ padding: 0 }}>
          <div style={{ padding: "var(--s-4) var(--s-5)", borderBottom: "1px solid var(--border-hairline)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3>اسناد اخیر</h3>
            <div className="muted mono" style={{ fontSize: 11 }}>
              تازه‌ترین رویداد: {entries[0] ? window.tc.toFaDigits(entries[0].at) : "—"}
            </div>
          </div>
          <div className="ledger-row head">
            <span>تاریخ</span>
            <span>شناسه سند</span>
            <span>شرح</span>
            <span className="debit">بدهکار</span>
            <span className="credit">بستانکار</span>
          </div>
          {entries.flatMap((t, ti) =>
            t.entries.map((e, ei) => (
              <div key={t.txn + "-" + ei} className={"ledger-row" + (ti === 0 && t._fresh ? " fresh" : "")}>
                <span className="muted">{ei === 0 ? window.tc.toFaDigits(t.at) : ""}</span>
                <span>
                  {ei === 0 && <div className="mono" style={{ fontSize: 11 }}>{t.txn}</div>}
                  <span className="mono" style={{ color: "var(--fg-muted)", fontSize: 11 }}>{e.code}</span> {e.account}
                </span>
                <span className="muted" style={{ fontSize: 12 }}>{ei === 0 ? t.desc : ""}</span>
                <span className="debit">{e.debit ? window.tc.formatIRRPlain(e.debit) : "—"}</span>
                <span className="credit">{e.credit ? window.tc.formatIRRPlain(e.credit) : "—"}</span>
              </div>
            ))
          )}
        </div>
      )}

      <div className="card flat" style={{ background: "var(--cream-100)", border: "1px dashed var(--cream-300)" }}>
        <div className="eyebrow" style={{ marginBottom: 8 }}>قاعده ثابت · غیرقابل تغییر</div>
        <p className="mono" style={{ fontSize: 14 }}>
          ∑ Debits = ∑ Credits · هیچ UPDATE یا DELETE روی <span style={{ color: "var(--state-bad)" }}>journal_entries</span> مجاز نیست.
        </p>
      </div>
    </div>
  );
}

Object.assign(window, { InvoicesScreen, EscrowScreen, LedgerScreen });

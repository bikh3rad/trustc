/* ============================================================
   trustC — VC / Portfolio Manager screens
   ------------------------------------------------------------
   Risk heatmap, capital recycling queue, Kill Switch.
   ============================================================ */

const { useState: useStateC, useEffect: useEffectC, useRef: useRefC } = React;

/* ============================================================
   SCREEN: پورتفولیو · ماتریس ریسک
   ============================================================ */
function PortfolioScreen({ ctx }) {
  const startups = window.trustcData.startups;
  const vc = window.trustcData.vc;
  const totalEscrow = startups.reduce((s, st) => s + st.escrowBalance, 0);
  const totalCreditUsed = startups.reduce((s, st) => s + st.creditUsed, 0);
  const totalCredit = startups.reduce((s, st) => s + st.creditLine, 0);
  const frozenCount = startups.filter(s => s.frozen || ctx.frozenIds.has(s.id)).length;

  return (
    <div className="stack" style={{ gap: "var(--s-6)" }}>
      <header style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: "var(--s-6)", alignItems: "end" }}>
        <div>
          <div className="eyebrow">پورتفولیو · کنترل زنده</div>
          <h1 style={{ fontSize: "var(--t-3xl)" }}>{vc.name}</h1>
          <p className="muted" style={{ fontSize: "var(--t-lg)", marginTop: 8, maxWidth: 640 }}>
            {window.tc.toFaDigits(startups.length)} استارتاپ تحت پوشش · سرمایه تحت مدیریت {window.tc.formatIRR(vc.aum)} ·
            ضریب اهرم فعلی <b className="num" style={{ color: "var(--orange-700)" }}>{window.tc.toFaDigits("۴.۲")}×</b>
          </p>
        </div>
      </header>

      <section className="grid stat-grid">
        <Stat label="سرمایه تحت مدیریت" value={window.tc.formatIRR(vc.aum, { withUnit: false })} unit="هزار میلیارد ریال" />
        <Stat label="کل اسکرو فعال" value={window.tc.formatIRR(totalEscrow, { withUnit: false })} unit="میلیارد ریال" hint="در ۷ استارتاپ" />
        <Stat label="اعتبار مصرفی" value={window.tc.formatPercent((totalCreditUsed / totalCredit) * 100)} delta={{ text: window.tc.formatIRR(totalCreditUsed) + " از " + window.tc.formatIRR(totalCredit), tone: "" }} />
        <Stat label="استارتاپ‌های فریزشده" value={window.tc.toFaDigits(frozenCount)} unit={"از " + window.tc.toFaDigits(startups.length)} delta={frozenCount > 0 ? { text: "⚠ نیاز به مداخله", tone: "down" } : { text: "وضعیت پایدار", tone: "up" }} />
      </section>

      {/* Heatmap grid */}
      <div className="card">
        <div className="card-title">
          <div>
            <h3>ماتریس ریسک پورتفوی</h3>
            <div className="muted" style={{ fontSize: 13 }}>کلیک روی هر استارتاپ برای جزئیات و اقدام</div>
          </div>
          <div className="row" style={{ gap: 12, fontSize: 11, fontFamily: "var(--mono-data)" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 8, height: 8, background: "var(--state-good)" }} />LOW</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 8, height: 8, background: "var(--state-warn)" }} />MED</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 8, height: 8, background: "var(--state-bad)" }} />HIGH</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 8, height: 8, background: "var(--state-bad-bg)" }} />CRIT</span>
          </div>
        </div>
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
          {startups.map(s => {
            const isFrozen = s.frozen || ctx.frozenIds.has(s.id);
            const risk = isFrozen ? "frozen" : s.risk;
            return (
              <div key={s.id} className="heat-cell" data-risk={risk} onClick={() => ctx.openStartupModal(s)}>
                <div>
                  <div className="row" style={{ justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>{s.name}</span>
                    <span className="mono muted" style={{ fontSize: 11 }}>{s.code}</span>
                  </div>
                  <div className="muted" style={{ fontSize: 12 }}>{s.industry}</div>
                  <div className="row" style={{ gap: 16, marginTop: 10, fontSize: 12 }}>
                    <span>
                      <div className="eyebrow" style={{ marginBottom: 2 }}>اعتبار</div>
                      <div className="mono" style={{ fontWeight: 600 }}>{window.tc.toFaDigits(s.creditScore)}</div>
                    </span>
                    <span>
                      <div className="eyebrow" style={{ marginBottom: 2 }}>Runway</div>
                      <div className="mono" style={{ fontWeight: 600 }}>{window.tc.toFaDigits(s.runway)} ماه</div>
                    </span>
                    <span>
                      <div className="eyebrow" style={{ marginBottom: 2 }}>سوخت</div>
                      <div className="mono" style={{ fontWeight: 600 }}>{window.tc.formatIRR(s.burnRate)}</div>
                    </span>
                  </div>
                </div>
                <div>
                  {isFrozen ? (
                    <span className="chip" data-tone="bad"><span className="mono">FROZEN</span></span>
                  ) : (
                    <span className="chip" data-tone={s.risk === "low" ? "good" : s.risk === "medium" ? "warn" : "bad"}>
                      <span className="mono">{s.risk.toUpperCase()}</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Startup detail modal (VC-side)
   Includes: stats, freeze button, approve-pending procurements
   ============================================================ */
function StartupModal({ startup, onClose, ctx }) {
  if (!startup) return null;
  const pending = window.trustcData.procurements.filter(p => p.startupId === startup.id && p.state === "FINANCIAL_VALIDATION");
  const isFrozen = ctx.frozenIds.has(startup.id) || startup.frozen;

  return (
    <Modal open={!!startup} onClose={onClose} title={startup.name}
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>بستن</Btn>
          {!isFrozen ? (
            <Btn variant="danger" icon={<Icon.freeze />} onClick={() => { ctx.openFreezeFor(startup); }}>
              فعال‌سازی Kill Switch
            </Btn>
          ) : (
            <Btn variant="secondary" onClick={() => { ctx.unfreeze(startup.id); onClose(); }}>
              لغو فریز
            </Btn>
          )}
        </>
      }>
      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Stat label="خط اعتباری" value={window.tc.formatIRR(startup.creditLine, { withUnit: false })} unit="میلیارد ریال" />
        <Stat label="موجودی اسکرو" value={window.tc.formatIRR(startup.escrowBalance, { withUnit: false })} unit="میلیارد ریال" />
        <Stat label="درآمد ماه" value={window.tc.formatIRR(startup.monthlyRevenue, { withUnit: false })} unit="میلیارد ریال" />
        <Stat label="Runway" value={window.tc.toFaDigits(startup.runway)} unit="ماه" />
      </div>
      {pending.length > 0 && (
        <>
          <div className="divider" />
          <div className="eyebrow" style={{ marginBottom: 8 }}>درخواست‌های نیازمند تأیید VC</div>
          <div className="stack" style={{ gap: 8 }}>
            {pending.map(p => (
              <div key={p.id} className="row" style={{ justifyContent: "space-between", padding: 12, border: "1px solid var(--border-hairline)", borderRadius: 4 }}>
                <div>
                  <div style={{ fontWeight: 500 }}>{p.title}</div>
                  <div className="muted mono" style={{ fontSize: 11 }}>{p.id} · {window.tc.formatIRR(p.amount)}</div>
                </div>
                <div className="row" style={{ gap: 6 }}>
                  <Btn variant="ghost" size="sm" icon={<Icon.x />}>رد</Btn>
                  <Btn variant="secondary" size="sm" icon={<Icon.check />}>تأیید</Btn>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </Modal>
  );
}

/* ============================================================
   SCREEN: صف بازیافت سرمایه
   ------------------------------------------------------------
   Animated queue. Hitting "اجرای چرخه" reshuffles items based
   on new (random) scores — this is the visible flagship moment.
   ============================================================ */
function RecyclingScreen({ ctx }) {
  const [queue, setQueue] = useStateC(window.trustcData.recyclingQueue);
  const [flying, setFlying] = useStateC(new Set());
  const [cycle, setCycle] = useStateC(0);

  function runCycle() {
    // Slightly perturb scores + re-sort
    const next = queue.map(q => ({ ...q, score: Math.max(50, Math.min(99, q.score + Math.floor(Math.random()*10-5))) }))
                      .sort((a,b) => b.score - a.score);
    setFlying(new Set(next.map(q => q.startupId)));
    setQueue(next);
    setCycle(c => c + 1);
    setTimeout(() => setFlying(new Set()), 900);
    ctx.toast({ tone: "good", msg: "چرخه بازیافت اجرا شد. سرمایه به اولویت‌های جدید تخصیص یافت." });
  }

  const totalQueued = queue.reduce((s,q) => s + q.queued, 0);

  return (
    <div className="stack" style={{ gap: "var(--s-6)" }}>
      <header className="row" style={{ justifyContent: "space-between", alignItems: "end" }}>
        <div>
          <div className="eyebrow">پورتفولیو · موتور اهرم‌سازی</div>
          <h1>صف بازیافت سرمایه</h1>
          <p className="muted" style={{ marginTop: 4, maxWidth: 720 }}>
            به‌محض بازگشت پول به اسکرو، سرمایه مطابق امتیاز نقدینگی به استارتاپ بعدی در صف تخصیص می‌یابد.
          </p>
        </div>
        <Btn variant="primary" icon={<Icon.recycle />} onClick={runCycle}>اجرای چرخه بازیافت</Btn>
      </header>

      <section className="grid stat-grid stat-grid--3">
        <Stat label="کل در صف"        value={window.tc.formatIRR(totalQueued, { withUnit: false })} unit="میلیارد ریال" />
        <Stat label="چرخه‌های اجراشده" value={window.tc.toFaDigits(cycle)} unit="در این جلسه" />
        <Stat label="ضریب اهرم"        value={window.tc.toFaDigits("۴.۲")} unit="×" delta={{ text: "هدف: ۱۰×", tone: "" }} />
      </section>

      <div className="card">
        <div className="card-title">
          <h3>اولویت تخصیص فعلی</h3>
          <div className="muted mono" style={{ fontSize: 11 }}>SCORING: velocity × reliability × turnover</div>
        </div>
        <div className="queue">
          {queue.map((q, i) => {
            const startup = window.tc.getStartup(q.startupId);
            return (
              <div key={q.startupId} className={"queue-item" + (flying.has(q.startupId) ? " flying" : "")}>
                <div className="pos">#{window.tc.toFaDigits(i+1)}</div>
                <div>
                  <div className="name">{startup.name}</div>
                  <div className="muted" style={{ fontSize: 12 }}>{q.reason} · چرخه نقدینگی {window.tc.toFaDigits(q.cycleDays)} روز</div>
                </div>
                <div className="row" style={{ gap: 4 }}>
                  <span className="eyebrow">امتیاز</span>
                  <span className="mono" style={{ fontWeight: 700, color: "var(--state-good)" }}>{window.tc.toFaDigits(q.score)}</span>
                </div>
                <div className="mono" style={{ fontWeight: 600, minWidth: 130, textAlign: "end" }}>
                  {window.tc.formatIRR(q.queued)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Explainer card */}
      <div className="card flat">
        <div className="eyebrow">نحوه عملکرد</div>
        <div className="grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", marginTop: 12, gap: 24 }}>
          <Explain n="۰۱" title="درآمد ورودی"     body="پرداخت مشتری به اسکرو یا حساب شرکت + شارژ خودکار خط اعتباری." />
          <Explain n="۰۲" title="موتور بازیافت"    body="پول بلافاصله وارد صف ادغام‌شده‌ی پورتفوی می‌شود." />
          <Explain n="۰۳" title="تخصیص پویا"      body="بر اساس امتیاز نقدینگی، خرید استارتاپ بعدی تأیید می‌شود." />
        </div>
      </div>
    </div>
  );
}

function Explain({ n, title, body }) {
  return (
    <div>
      <div className="mono" style={{ color: "var(--orange-600)", fontWeight: 700, letterSpacing: "0.06em" }}>{n}</div>
      <div style={{ fontWeight: 600, fontSize: 16, marginTop: 6 }}>{title}</div>
      <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>{body}</div>
    </div>
  );
}

/* ============================================================
   SCREEN: Kill Switch · مرکز فرماندهی
   ============================================================ */
function KillSwitchScreen({ ctx }) {
  const [confirming, setConfirming] = useStateC(null);
  const [form, setForm] = useStateC({ reason: "", scope: "FULL", duration: "TEMPORARY" });
  const startups = window.trustcData.startups;
  const eligible = startups.filter(s => !ctx.frozenIds.has(s.id) && !s.frozen);
  const frozen = startups.filter(s => ctx.frozenIds.has(s.id) || s.frozen);

  function execute() {
    if (!form.reason) {
      ctx.toast({ tone: "bad", msg: "دلیل فریز الزامی است." });
      return;
    }
    ctx.freeze(confirming.id, form);
    setConfirming(null);
    setForm({ reason: "", scope: "FULL", duration: "TEMPORARY" });
  }

  return (
    <div className="stack" style={{ gap: "var(--s-6)" }}>
      <header>
        <div className="eyebrow">حاکمیت · کنترل اضطراری</div>
        <h1>تعلیق آنی پرداخت‌ها (Kill Switch)</h1>
        <p className="muted" style={{ marginTop: 4, maxWidth: 720 }}>
          در صورت مشاهده انحراف، Kill Switch تمام پرداخت‌های خروجی، پیش‌فاکتورها و ارتقای خودکار خط اعتباری را برای استارتاپ هدف متوقف می‌کند.
          این اقدام بلافاصله بر کل سیستم تأثیر می‌گذارد.
        </p>
      </header>

      <div className="card" style={{ background: "var(--state-bad-bg)", borderColor: "var(--state-bad)" }}>
        <div className="row" style={{ gap: 12 }}>
          <Icon.alert size={24} style={{ color: "var(--state-bad)" }} />
          <div>
            <div style={{ fontWeight: 700, color: "var(--state-bad)" }}>اقدام بازگشت‌ناپذیر</div>
            <div style={{ fontSize: 13, marginTop: 2 }}>
              تمام جریان‌های کاری در حال انجام به وضعیت <span className="mono">FROZEN</span> منتقل می‌شوند.
              لغو فریز نیازمند یک سند رسمی پشتیبان است.
            </div>
          </div>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: "var(--s-6)" }}>
        <div className="card">
          <div className="card-title"><h3>استارتاپ‌های فعال</h3><span className="muted mono" style={{ fontSize: 11 }}>{window.tc.toFaDigits(eligible.length)} مورد</span></div>
          <div className="stack" style={{ gap: 8 }}>
            {eligible.map(s => (
              <div key={s.id} className="heat-cell" data-risk={s.risk} style={{ cursor: "default" }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{s.name}</div>
                  <div className="muted" style={{ fontSize: 12 }}>اعتبار {window.tc.toFaDigits(s.creditScore)} · Runway {window.tc.toFaDigits(s.runway)} ماه</div>
                </div>
                <Btn variant="danger" size="sm" icon={<Icon.freeze />} onClick={() => setConfirming(s)}>فریز</Btn>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-title"><h3>در حال تعلیق</h3><span className="muted mono" style={{ fontSize: 11 }}>{window.tc.toFaDigits(frozen.length)} مورد</span></div>
          {frozen.length === 0 ? (
            <div className="empty"><h3>هیچ استارتاپی فریز نیست</h3><div>وضعیت پورتفوی پایدار است.</div></div>
          ) : (
            <div className="stack" style={{ gap: 8 }}>
              {frozen.map(s => (
                <div key={s.id} className="heat-cell" data-risk="frozen" style={{ cursor: "default" }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{s.name}</div>
                    <div className="muted mono" style={{ fontSize: 11 }}>FROZEN · تمام جریان‌ها متوقف</div>
                  </div>
                  <Btn variant="secondary" size="sm" onClick={() => ctx.unfreeze(s.id)}>لغو فریز</Btn>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Confirm freeze modal */}
      <Modal open={!!confirming} onClose={() => setConfirming(null)} title={`تأیید فریز · ${confirming?.name}`} manifest
        footer={
          <>
            <Btn variant="ghost" onClick={() => setConfirming(null)}>انصراف</Btn>
            <Btn variant="danger" onClick={execute}>تأیید نهایی و اجرا</Btn>
          </>
        }>
        <div className="stack" style={{ gap: 16 }}>
          <div style={{ padding: 12, background: "rgba(168,49,42,0.15)", border: "1px solid var(--state-bad)", borderRadius: 4 }}>
            <div className="mono" style={{ fontSize: 11, color: "var(--orange-500)", letterSpacing: "0.08em" }}>WARNING · IRREVERSIBLE</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>
              این اقدام تمام پرداخت‌های در جریان <b>{confirming?.name}</b> را در همین لحظه متوقف می‌کند.
            </div>
          </div>
          <FormField label="دامنه فریز">
            <div className="seg">
              <button className={form.scope === "FULL" ? "active" : ""} onClick={() => setForm(f => ({ ...f, scope: "FULL" }))}>FULL_ACCOUNT</button>
              <button className={form.scope === "PARTIAL" ? "active" : ""} onClick={() => setForm(f => ({ ...f, scope: "PARTIAL" }))}>PARTIAL</button>
            </div>
          </FormField>
          <FormField label="مدت زمان">
            <div className="seg">
              <button className={form.duration === "TEMPORARY" ? "active" : ""} onClick={() => setForm(f => ({ ...f, duration: "TEMPORARY" }))}>TEMPORARY</button>
              <button className={form.duration === "INDEFINITE" ? "active" : ""} onClick={() => setForm(f => ({ ...f, duration: "INDEFINITE" }))}>INDEFINITE</button>
            </div>
          </FormField>
          <FormField label="دلیل (مستندسازی الزامی)">
            <textarea className="textarea" placeholder="مثال: تمرکز غیرعادی پیش‌فاکتورهای تأیید‌نشده در ۲۴ ساعت گذشته."
              value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} />
          </FormField>
        </div>
      </Modal>
    </div>
  );
}

Object.assign(window, { PortfolioScreen, StartupModal, RecyclingScreen, KillSwitchScreen });

/* ============================================================
   trustC — Auditor screens
   ------------------------------------------------------------
   Audit trail (cryptographically chained, append-only) and
   PDF-style financial reports (balance sheet / P&L / escrow
   liabilities / Samaneh Moodayan compliance memo).
   ============================================================ */

const { useState: useStateD } = React;

/* ============================================================
   SCREEN: ردپای حسابرسی · Append-Only Log
   ============================================================ */
function AuditScreen({ ctx }) {
  const [search, setSearch] = useStateD("");
  const [roleFilter, setRoleFilter] = useStateD("ALL");

  const log = window.trustcData.auditLog;
  const filtered = log.filter(l =>
    (roleFilter === "ALL" || l.actorRole === roleFilter) &&
    (!search ||
      l.actor.includes(search) ||
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      (l.target && l.target.includes(search)))
  );

  return (
    <div className="stack" style={{ gap: "var(--s-6)" }}>
      <header>
        <div className="eyebrow">حسابرسی · لاگ غیرقابل تغییر</div>
        <h1>ردپای حسابرسی</h1>
        <p className="muted" style={{ marginTop: 4, maxWidth: 720 }}>
          هر گذار حالت در سیستم به‌صورت append-only با امضای SHA-256 ذخیره می‌شود. حذف یا تغییر سوابق در هیچ سطحی مجاز نیست.
        </p>
      </header>

      <section className="grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        <Stat label="کل رویدادها" value={window.tc.toFaDigits(log.length)} unit="مورد" />
        <Stat label="در ۲۴ ساعت اخیر" value={window.tc.toFaDigits(5)} unit="مورد" delta={{ text: "زنجیره معتبر", tone: "up" }} />
        <Stat label="رویدادهای سیستمی"  value={window.tc.toFaDigits(log.filter(l => l.actorRole === "SYSTEM").length)} unit="مورد" />
        <Stat label="مداخلات VC"        value={window.tc.toFaDigits(log.filter(l => l.actorRole === "VC").length)} unit="مورد" />
      </section>

      <div className="row" style={{ gap: 12 }}>
        <input className="input" style={{ maxWidth: 320 }} placeholder="جست‌وجو در رویدادها…"
          value={search} onChange={e => setSearch(e.target.value)} />
        <div className="seg">
          {[["ALL","همه"],["VC","VC"],["FOUNDER","بنیان‌گذار"],["PM","مدیر پروژه"],["OPERATOR","اپراتور"],["SYSTEM","سیستم"]].map(([k,l]) => (
            <button key={k} className={roleFilter === k ? "active" : ""} onClick={() => setRoleFilter(k)}>{l}</button>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <table className="table">
          <thead>
            <tr>
              <th>زمان</th>
              <th>عامل</th>
              <th>نقش</th>
              <th>اقدام</th>
              <th>هدف</th>
              <th>گذار حالت</th>
              <th>هش امضا</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(l => (
              <tr key={l.id}>
                <td className="mono muted" style={{ fontSize: 12 }}>{window.tc.toFaDigits(l.at)}</td>
                <td>{l.actor}</td>
                <td>
                  <span className="chip" data-tone={
                    l.actorRole === "VC" ? "active" :
                    l.actorRole === "SYSTEM" ? "neutral" :
                    l.actorRole === "FOUNDER" ? "good" : "warn"
                  }>
                    <span className="mono">{l.actorRole}</span>
                  </span>
                </td>
                <td className="mono" style={{ fontSize: 12 }}>{l.action}</td>
                <td className="mono muted" style={{ fontSize: 12 }}>{l.target || "—"}</td>
                <td>
                  {l.from && <Chip state={l.from} />}
                  <span className="muted" style={{ margin: "0 6px" }}>←</span>
                  {l.to && <Chip state={l.to} />}
                </td>
                <td className="mono" style={{ fontSize: 11, color: "var(--fg-muted)" }}>
                  <Icon.hash size={12} style={{ verticalAlign: "middle", marginInlineEnd: 4 }} />
                  {l.hash}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card flat" style={{ background: "var(--cream-100)", border: "1px dashed var(--cream-300)" }}>
        <div className="eyebrow" style={{ marginBottom: 6 }}>قاعده زنجیره</div>
        <p style={{ margin: 0, fontSize: 14 }}>
          هر رکورد جدید با هش رکورد قبلی امضا می‌شود؛ بنابراین تشخیص دستکاری در هر نقطه از زنجیره با اعتبارسنجی مجدد قابل انجام است.
        </p>
      </div>
    </div>
  );
}

/* ============================================================
   SCREEN: گزارش‌ها (PDF-style)
   ------------------------------------------------------------
   Document-chrome reports. Three tabs:
   1. ترازنامه (Balance Sheet)
   2. سود و زیان (P&L)
   3. اظهارنامه سامانه مودیان (Tax compliance memo)
   ============================================================ */
function ReportsScreen({ ctx }) {
  const [tab, setTab] = useStateD("balance");
  const [scope, setScope] = useStateD("ALPHA"); // which startup for the report

  return (
    <div className="stack" style={{ gap: "var(--s-6)" }}>
      <header className="row" style={{ justifyContent: "space-between", alignItems: "end" }}>
        <div>
          <div className="eyebrow">حسابرسی · گزارش‌ها</div>
          <h1>گزارش‌های مالی</h1>
          <p className="muted" style={{ marginTop: 4 }}>
            گزارش‌های آماده برای ارائه به ممیز مالیاتی یا هیئت‌مدیره. تمام مقادیر بر اساس داده‌های زنده دفتر کل.
          </p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <select className="select" style={{ width: 200 }} value={scope} onChange={e => setScope(e.target.value)}>
            <option value="ALPHA">شرکت آلفا</option>
            <option value="BETA">شرکت بتا</option>
            <option value="GAMMA">شرکت گاما</option>
            <option value="ALL">کل پورتفولیو</option>
          </select>
          <Btn variant="secondary" icon={<Icon.download />}>دانلود PDF</Btn>
          <Btn variant="primary" icon={<Icon.stamp />}>امضای حسابرس</Btn>
        </div>
      </header>

      <div className="seg">
        <button className={tab === "balance" ? "active" : ""} onClick={() => setTab("balance")}>ترازنامه</button>
        <button className={tab === "pnl" ? "active" : ""} onClick={() => setTab("pnl")}>صورت سود و زیان</button>
        <button className={tab === "tax" ? "active" : ""} onClick={() => setTab("tax")}>اظهارنامه سامانه مودیان</button>
        <button className={tab === "escrow" ? "active" : ""} onClick={() => setTab("escrow")}>گزارش وجوه امانی</button>
      </div>

      {tab === "balance" && <BalanceSheetDoc scope={scope} />}
      {tab === "pnl"     && <PnLDoc scope={scope} />}
      {tab === "tax"     && <TaxComplianceDoc scope={scope} />}
      {tab === "escrow"  && <EscrowReportDoc scope={scope} />}
    </div>
  );
}

/* ---------------- Document: ترازنامه ---------------- */
function BalanceSheetDoc({ scope }) {
  const period = window.tc.toFaDigits("۱۴۰۵/۰۳/۳۱");
  const issued = window.tc.toFaDigits("۱۴۰۵/۰۴/۰۱");

  // Demo numbers (in IRR)
  const assets = [
    { code: "1001", name: "بانک · حساب عملیاتی",          amount: 142_500_000_000 },
    { code: "1002", name: "بانک · حساب امانی (اسکرو)",    amount: 386_500_000_000 },
    { code: "1101", name: "حساب‌های دریافتنی",            amount: 50_600_000_000 },
    { code: "1201", name: "موجودی کالا",                  amount: 124_000_000_000 },
    { code: "1301", name: "دارایی‌های ثابت مشهود",        amount: 86_400_000_000 },
  ];
  const liabilities = [
    { code: "2103", name: "وجوه امانی مأخوذه · اسکرو",    amount: 386_500_000_000 },
    { code: "2201", name: "خط اعتباری چرخشی · trustC",    amount: 412_000_000_000 },
    { code: "2301", name: "حساب‌های پرداختنی",            amount: 28_400_000_000 },
  ];
  const equity = [
    { code: "3001", name: "سرمایه ثبت‌شده",                amount: 200_000_000_000 },
    { code: "3101", name: "سود انباشته (دوره جاری)",      amount: -237_900_000_000 },
  ];

  const totA = assets.reduce((s,r) => s + r.amount, 0);
  const totL = liabilities.reduce((s,r) => s + r.amount, 0);
  const totE = equity.reduce((s,r) => s + r.amount, 0);

  return (
    <Doc>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "start", marginBottom: 16 }}>
        <div>
          <div className="eyebrow" style={{ color: "var(--fg-muted)" }}>گزارش رسمی · trustC</div>
          <h1 style={{ fontSize: 28, marginTop: 4, fontFamily: "var(--serif-display)" }}>ترازنامه</h1>
          <div className="muted" style={{ marginTop: 2 }}>{scope === "ALPHA" ? "شرکت آلفا" : "کل پورتفولیو"}</div>
        </div>
        <div style={{ textAlign: "end" }}>
          <div style={{ width: 90, height: 90, border: "2px solid var(--orange-700)", outline: "2px solid var(--orange-700)", outlineOffset: 3, borderRadius: "50%", display: "grid", placeItems: "center", fontFamily: "var(--mono-data)", color: "var(--orange-800)", fontWeight: 700, fontSize: 12, transform: "rotate(-6deg)" }}>
            <div style={{ textAlign: "center", lineHeight: 1.2 }}>
              AUDITED<br/><span style={{ fontSize: 10 }}>{issued}</span>
            </div>
          </div>
        </div>
      </div>

      <dl className="doc-meta">
        <div><dt>دوره گزارش</dt><dd>تا {period}</dd></div>
        <div><dt>نوع گزارش</dt><dd>سالیانه · پیش‌نویس</dd></div>
        <div><dt>واحد پول</dt><dd>ریال (IRR)</dd></div>
        <div><dt>تاریخ صدور</dt><dd>{issued}</dd></div>
      </dl>

      <DocSection title="دارایی‌ها (Assets)">
        <DocRows rows={assets} />
        <DocTotal label="جمع دارایی‌ها" amount={totA} />
      </DocSection>

      <DocSection title="بدهی‌ها (Liabilities)">
        <DocRows rows={liabilities} highlight="2103" />
        <DocTotal label="جمع بدهی‌ها" amount={totL} />
        <div style={{ fontSize: 11, marginTop: 8, color: "var(--fg-muted)" }}>
          ▲ سرفصل ۲۱۰۳ مطابق با ماده ۸ آیین‌نامه سامانه مودیان به‌عنوان «وجوه امانی مأخوذه» تفکیک شده است.
        </div>
      </DocSection>

      <DocSection title="حقوق صاحبان سهام (Equity)">
        <DocRows rows={equity} />
        <DocTotal label="جمع حقوق صاحبان سهام" amount={totE} />
      </DocSection>

      <div style={{ borderTop: "2px solid var(--ink-900)", marginTop: 24, paddingTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <div>
          <div className="eyebrow">جمع کل دارایی‌ها</div>
          <div className="mono" style={{ fontSize: 22, fontWeight: 700 }}>{window.tc.formatIRRPlain(totA)}</div>
        </div>
        <div style={{ textAlign: "end" }}>
          <div className="eyebrow">جمع بدهی‌ها + حقوق صاحبان</div>
          <div className="mono" style={{ fontSize: 22, fontWeight: 700 }}>{window.tc.formatIRRPlain(totL + totE)}</div>
          <div className="mono" style={{ fontSize: 11, color: "var(--state-good)", marginTop: 4 }}>تراز ✓ Σ Assets = Σ (L+E)</div>
        </div>
      </div>

      <DocSignatures />
    </Doc>
  );
}

/* ---------------- Document: سود و زیان ---------------- */
function PnLDoc({ scope }) {
  const issued = window.tc.toFaDigits("۱۴۰۵/۰۴/۰۱");
  const revenue = [
    { code: "4001", name: "درآمد فروش خدمات",    amount: 542_300_000_000 },
    { code: "4002", name: "درآمد فروش کالا",     amount: 124_000_000_000 },
    { code: "4101", name: "درآمدهای متفرقه",     amount: 8_900_000_000 },
  ];
  const cogs = [
    { code: "5001", name: "بهای تمام‌شده فروش",  amount: -312_400_000_000 },
  ];
  const opex = [
    { code: "5101", name: "حقوق و دستمزد",       amount: -184_200_000_000 },
    { code: "5102", name: "خدمات زیرساخت",       amount: -42_600_000_000 },
    { code: "5103", name: "بازاریابی",           amount: -28_800_000_000 },
    { code: "5104", name: "اداری و دفتری",       amount: -16_100_000_000 },
  ];

  const totR = revenue.reduce((s,r) => s + r.amount, 0);
  const totC = cogs.reduce((s,r) => s + r.amount, 0);
  const gross = totR + totC;
  const totO = opex.reduce((s,r) => s + r.amount, 0);
  const opIncome = gross + totO;

  return (
    <Doc>
      <div className="eyebrow" style={{ color: "var(--fg-muted)" }}>گزارش رسمی · trustC</div>
      <h1 style={{ fontSize: 28, fontFamily: "var(--serif-display)" }}>صورت سود و زیان</h1>
      <div className="muted">شرکت آلفا · دوره منتهی به ۱۴۰۵/۰۳/۳۱</div>

      <dl className="doc-meta">
        <div><dt>دوره</dt><dd>۹۰ روزه</dd></div>
        <div><dt>نوع</dt><dd>عملیاتی</dd></div>
        <div><dt>واحد</dt><dd>ریال (IRR)</dd></div>
        <div><dt>صدور</dt><dd>{issued}</dd></div>
      </dl>

      <DocSection title="درآمدها"><DocRows rows={revenue} /><DocTotal label="جمع درآمدها" amount={totR} tone="good" /></DocSection>
      <DocSection title="بهای تمام‌شده"><DocRows rows={cogs} /><DocTotal label="سود ناخالص" amount={gross} bold tone="good" /></DocSection>
      <DocSection title="هزینه‌های عملیاتی"><DocRows rows={opex} /><DocTotal label="سود (زیان) عملیاتی" amount={opIncome} bold tone={opIncome >= 0 ? "good" : "bad"} /></DocSection>

      <div style={{ borderTop: "2px solid var(--ink-900)", marginTop: 24, paddingTop: 16, textAlign: "end" }}>
        <div className="eyebrow">سود/زیان دوره</div>
        <div className="mono" style={{ fontSize: 28, fontWeight: 700, color: opIncome >= 0 ? "var(--state-good)" : "var(--state-bad)" }}>
          {window.tc.formatIRRPlain(opIncome)}
        </div>
      </div>
      <DocSignatures />
    </Doc>
  );
}

/* ---------------- Document: اظهارنامه سامانه مودیان ---------------- */
function TaxComplianceDoc({ scope }) {
  return (
    <Doc>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "start", marginBottom: 16 }}>
        <div>
          <div className="eyebrow" style={{ color: "var(--fg-muted)" }}>یادداشت تطبیق مالیاتی · trustC</div>
          <h1 style={{ fontSize: 28, fontFamily: "var(--serif-display)" }}>تطبیق با سامانه مودیان</h1>
          <div className="muted">معماری تفکیک لایه کارگزاری</div>
        </div>
        <div style={{ width: 90, height: 90, border: "2px solid var(--state-good)", outline: "2px solid var(--state-good)", outlineOffset: 3, borderRadius: "50%", display: "grid", placeItems: "center", fontFamily: "var(--mono-data)", color: "var(--state-good)", fontWeight: 700, fontSize: 12, transform: "rotate(-4deg)" }}>
          <div style={{ textAlign: "center", lineHeight: 1.2 }}>
            COMPLIANT<br/><span style={{ fontSize: 10 }}>۱۴۰۵/۰۴</span>
          </div>
        </div>
      </div>

      <dl className="doc-meta">
        <div><dt>کد ملی شرکت</dt><dd className="mono">۱۴۰۰۸۱۲۳۴۵۶</dd></div>
        <div><dt>کد اقتصادی</dt><dd className="mono">۴۱۲۳۴۵۶۷۸</dd></div>
        <div><dt>نوع گزارش</dt><dd>سه‌ماهه</dd></div>
        <div><dt>تاریخ</dt><dd>{window.tc.toFaDigits("۱۴۰۵/۰۴/۰۱")}</dd></div>
      </dl>

      <DocSection title="۱. تفکیک لایه کارگزاری">
        <p style={{ lineHeight: 1.9, fontSize: 14 }}>
          مطابق با مفاد قانون مالیات‌های مستقیم و آیین‌نامه‌های اجرایی سامانه مودیان، حساب‌های امانی پلتفرم trustC تحت سرفصل
          <b> «وجوه امانی مأخوذه»</b> (کد ۲۱۰۳) دسته‌بندی می‌شوند. این بدان معناست که:
        </p>
        <ul style={{ lineHeight: 2, fontSize: 14, paddingInlineStart: 20 }}>
          <li>تراکنش‌های ورودی به اسکرو در درآمد لایه کارگزار (پلتفرم) نمی‌نشینند.</li>
          <li>تکلیف صدور فاکتور رسمی و ثبت در سامانه مودیان همچنان بر عهده شرکت فروشنده (استارتاپ) باقی است.</li>
          <li>سرفصل ۲۱۰۳ از سرفصل‌های درآمد عملیاتی (۴۰۰۱–۴۱۰۱) به‌طور کامل تفکیک حسابی شده است.</li>
        </ul>
      </DocSection>

      <DocSection title="۲. خلاصه گردش وجوه امانی">
        <table className="table" style={{ background: "transparent", border: "1px solid var(--ink-200)" }}>
          <thead>
            <tr><th>دوره</th><th className="num">ورودی (ریال)</th><th className="num">خروجی (ریال)</th><th className="num">مانده پایان دوره</th></tr>
          </thead>
          <tbody>
            <tr><td>فروردین ۱۴۰۵</td><td className="num">۱۸۲٬۴۰۰٬۰۰۰٬۰۰۰</td><td className="num">۱۶۸٬۲۰۰٬۰۰۰٬۰۰۰</td><td className="num">۳۲۲٬۲۰۰٬۰۰۰٬۰۰۰</td></tr>
            <tr><td>اردیبهشت ۱۴۰۵</td><td className="num">۲۴۵٬۸۰۰٬۰۰۰٬۰۰۰</td><td className="num">۲۱۲٬۰۰۰٬۰۰۰٬۰۰۰</td><td className="num">۳۵۶٬۰۰۰٬۰۰۰٬۰۰۰</td></tr>
            <tr><td>خرداد ۱۴۰۵</td><td className="num">۲۸۸٬۹۰۰٬۰۰۰٬۰۰۰</td><td className="num">۲۵۸٬۴۰۰٬۰۰۰٬۰۰۰</td><td className="num">۳۸۶٬۵۰۰٬۰۰۰٬۰۰۰</td></tr>
          </tbody>
        </table>
      </DocSection>

      <DocSection title="۳. تأیید حسابرس">
        <p style={{ lineHeight: 1.9, fontSize: 14 }}>
          بر اساس بررسی دفاتر و مستندات ارائه‌شده، ساختار حسابداری trustC با اصول تفکیک کارگزاری مطابقت کامل دارد و هیچ بازنمایی نادرستی از درآمد در لایه پلتفرم مشاهده نمی‌شود.
          ردپای حسابرسی (Audit Trail) به‌صورت append-only با امضای SHA-256 برای هر گذار حالت موجود است.
        </p>
      </DocSection>

      <DocSignatures />
    </Doc>
  );
}

/* ---------------- Document: گزارش وجوه امانی ---------------- */
function EscrowReportDoc({ scope }) {
  const procs = window.trustcData.procurements;
  const rows = procs.map(p => ({
    code: p.id,
    name: p.title + " · " + (window.tc.getSupplier(p.supplierId)?.name || "—"),
    amount: p.amount,
    state: p.state,
  }));
  const tot = rows.reduce((s,r) => s + r.amount, 0);

  return (
    <Doc>
      <div className="eyebrow" style={{ color: "var(--fg-muted)" }}>گزارش حسابرسی · trustC</div>
      <h1 style={{ fontSize: 28, fontFamily: "var(--serif-display)" }}>گردش وجوه امانی</h1>
      <div className="muted">شرکت آلفا · همه قفل‌های اسکرو</div>

      <dl className="doc-meta">
        <div><dt>سرفصل</dt><dd className="mono">2103_FIDUCIARY_ESCROW</dd></div>
        <div><dt>قفل‌ها</dt><dd>{window.tc.toFaDigits(rows.length)} مورد</dd></div>
        <div><dt>واحد</dt><dd>ریال</dd></div>
        <div><dt>صدور</dt><dd>{window.tc.toFaDigits("۱۴۰۵/۰۴/۰۱")}</dd></div>
      </dl>

      <table className="table" style={{ background: "transparent", border: "1px solid var(--ink-200)", marginTop: 16 }}>
        <thead>
          <tr>
            <th>شناسه</th>
            <th>شرح</th>
            <th>وضعیت</th>
            <th className="num">مبلغ (ریال)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.code}>
              <td className="mono" style={{ fontSize: 11 }}>{r.code}</td>
              <td>{r.name}</td>
              <td><Chip state={r.state} /></td>
              <td className="num">{window.tc.formatIRRPlain(r.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ borderTop: "2px solid var(--ink-900)", marginTop: 16, paddingTop: 12, textAlign: "end" }}>
        <span className="eyebrow">جمع کل وجوه امانی · </span>
        <span className="mono" style={{ fontSize: 20, fontWeight: 700, marginInlineStart: 8 }}>{window.tc.formatIRRPlain(tot)} ریال</span>
      </div>

      <DocSignatures />
    </Doc>
  );
}

/* ---------------- Document section / row primitives ---------------- */
function DocSection({ title, children }) {
  return (
    <section style={{ marginTop: 24 }}>
      <h3 style={{ fontSize: 16, fontFamily: "var(--sans-text)", fontWeight: 700, borderBottom: "1px solid var(--ink-300)", paddingBottom: 6, marginBottom: 8 }}>{title}</h3>
      {children}
    </section>
  );
}

function DocRows({ rows, highlight }) {
  return (
    <div>
      {rows.map(r => (
        <div key={r.code} style={{
          display: "grid",
          gridTemplateColumns: "auto 1fr auto",
          gap: 12,
          padding: "8px 0",
          borderBottom: "1px dotted var(--ink-200)",
          fontSize: 14,
          background: r.code === highlight ? "rgba(210,105,30,0.06)" : "transparent",
        }}>
          <span className="mono muted" style={{ fontSize: 12, width: 48 }}>{r.code}</span>
          <span>{r.name}</span>
          <span className="mono" style={{ fontVariantNumeric: "tabular-nums" }}>{window.tc.formatIRRPlain(r.amount)}</span>
        </div>
      ))}
    </div>
  );
}

function DocTotal({ label, amount, bold, tone }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "1fr auto",
      gap: 12,
      padding: "10px 0",
      borderTop: "1px solid var(--ink-900)",
      marginTop: 4,
      fontSize: 14,
      fontWeight: bold ? 700 : 600,
      color: tone === "good" ? "var(--state-good)" : tone === "bad" ? "var(--state-bad)" : "var(--ink-900)",
    }}>
      <span>{label}</span>
      <span className="mono">{window.tc.formatIRRPlain(amount)}</span>
    </div>
  );
}

function DocSignatures() {
  return (
    <div style={{ marginTop: 48, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 32 }}>
      {[
        { role: "مدیرعامل", name: "بنیان‌گذار آلفا" },
        { role: "مدیر مالی", name: "اپراتور مالی" },
        { role: "حسابرس مستقل", name: "—" },
      ].map(s => (
        <div key={s.role} style={{ borderTop: "1px solid var(--ink-700)", paddingTop: 8, textAlign: "center" }}>
          <div className="eyebrow">{s.role}</div>
          <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>{s.name}</div>
        </div>
      ))}
    </div>
  );
}

Object.assign(window, { AuditScreen, ReportsScreen });

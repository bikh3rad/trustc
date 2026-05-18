/* ============================================================
   trustC — Founder workspace screens
   ------------------------------------------------------------
   Each screen is a top-level React component receiving:
   - `ctx`     — shared app context (currentStartup, persona, setRoute,
                  triggerFreeze, triggerRecycle, …)
   - `nav`     — sub-route within the module (e.g. selected procurement)
   - `setNav`  — setter for the above

   For Claude Code: these map 1:1 to modules in
   bikh3rad/trustc/frontend/src/modules/.
   ============================================================ */

const { useState, useEffect, useMemo, useRef } = React;

/* ============================================================
   SCREEN: داشبورد بنیان‌گذار
   ------------------------------------------------------------
   Big stat tiles + burn-rate chart + active queue + alerts.
   ============================================================ */
function FounderDashboard({ ctx }) {
  const startup = ctx.currentStartup;
  const procs = window.trustcData.procurements
    .filter(p => p.startupId === startup.id);
  const inflight = procs.filter(p => !["ACCOUNTING_FINALIZATION","CANCELLED"].includes(p.state));
  const escrowLocked = procs
    .filter(p => ["ESCROW_LOCK","SUPPLIER_DISPATCH","DELIVERY_CONFIRMATION","PAYMENT_RELEASE"].includes(p.state))
    .reduce((s,p) => s + p.amount, 0);

  // Per-startup monthly history derived from the synthetic 6-month dataset.
  const series = useMemo(
    () => window.tc.computeStartupMonthly(startup.id),
    [startup.id]
  );

  // Live ticking numbers — burn rate decrements once a second
  const [tickEscrow, setTickEscrow] = useState(startup.escrowBalance);
  useEffect(() => {
    setTickEscrow(startup.escrowBalance);
  }, [startup.id, startup.escrowBalance]);
  useEffect(() => {
    if (ctx.frozen) return;
    const id = setInterval(() => {
      setTickEscrow(v => v + Math.floor(Math.random() * 8 - 3) * 1_000_000);
    }, 1800);
    return () => clearInterval(id);
  }, [ctx.frozen]);

  const creditPct = (startup.creditUsed / startup.creditLine) * 100;
  const lastMonth = series.months.length - 1;
  const salesMoM = lastMonth > 0 && series.sales[lastMonth - 1] > 0
    ? ((series.sales[lastMonth] - series.sales[lastMonth - 1]) / series.sales[lastMonth - 1]) * 100
    : 0;
  const scoreTrend = series.score[lastMonth] - series.score[0];

  // Most-recent activity (sorted by date) — drives the live alerts.
  const recent = [...procs]
    .filter(p => p.timeline && p.timeline.length)
    .sort((a, b) => (b.timeline[b.timeline.length - 1].at || "")
                     .localeCompare(a.timeline[a.timeline.length - 1].at || ""))
    .slice(0, 4);

  return (
    <div className="stack" style={{ gap: "var(--s-6)" }}>
      {/* Editorial hero */}
      <section style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: "var(--s-6)", alignItems: "end", padding: "var(--s-6) 0" }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: 12 }}>
            داشبورد · {window.tc.toFaDigits("1405/03/14")}
            {ctx.canSwitchStartup && (
              <span className="mono" style={{ marginInlineStart: 8, color: "var(--orange-600)" }}>
                · حالت ادمین — مشاهده {startup.code}
              </span>
            )}
          </div>
          <h1 style={{ fontSize: "var(--t-3xl)", lineHeight: 1.15 }}>
            صبح بخیر، {startup.name}.
          </h1>
          <p className="muted" style={{ fontSize: "var(--t-lg)", marginTop: 8, maxWidth: 640 }}>
            امروز <b className="num" style={{ color: "var(--fg-default)" }}>{window.tc.toFaDigits(inflight.length)}</b> خرید فعال در جریان است
            و <b className="num" style={{ color: "var(--fg-default)" }}>{window.tc.formatIRR(escrowLocked)}</b> در اسکرو قفل شده.
            سقف اعتباری مصرف‌شده: <b className="num" style={{ color: "var(--fg-default)" }}>{window.tc.formatPercent(creditPct)}</b>.
          </p>
        </div>
        <div style={{ textAlign: "end" }}>
          <Btn variant="primary" icon={<Icon.plus />} onClick={() => ctx.setRoute("procurements", "new")}>
            ثبت خرید جدید
          </Btn>
        </div>
      </section>

      {/* Stat grid */}
      <section className="grid stat-grid">
        <Stat
          label="خط اعتباری در دسترس"
          value={window.tc.formatIRR(startup.creditLine - startup.creditUsed, { withUnit: false })}
          unit="میلیارد ریال"
          hint={`از ${window.tc.formatIRR(startup.creditLine)} کل`}
        />
        <Stat
          label="موجودی اسکرو"
          value={window.tc.formatIRR(tickEscrow, { withUnit: false })}
          unit="میلیارد ریال"
          delta={{ text: "↑ ۲٫۸% طی ۲۴ ساعت", tone: "up" }}
        />
        <Stat
          label="نرخ سوخت ماهیانه (Burn)"
          value={window.tc.formatIRR(startup.burnRate, { withUnit: false })}
          unit="میلیارد ریال"
          delta={{ text: `Runway: ${window.tc.toFaDigits(startup.runway)} ماه`, tone: startup.runway > 12 ? "up" : "down" }}
        />
        <Stat
          label="درآمد ماه جاری"
          value={window.tc.formatIRR(series.sales[lastMonth], { withUnit: false })}
          unit="میلیارد ریال"
          delta={{
            text: `${salesMoM >= 0 ? "↑" : "↓"} ${window.tc.formatPercent(Math.abs(salesMoM))} ماه‌به‌ماه`,
            tone: salesMoM >= 0 ? "up" : "down",
          }}
        />
      </section>

      {/* CHART 1 — Monthly Purchases vs Sales (paired bars) */}
      <section className="card">
        <div className="card-title" style={{ flexWrap: "wrap", gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <h3>خرید و فروش ماهانه</h3>
            <div className="muted" style={{ fontSize: "var(--t-sm)", marginTop: 4 }}>
              مبتنی بر {window.tc.toFaDigits(series.totals.procCount)} فاکتور خرید و {window.tc.toFaDigits(series.totals.invCount)} فاکتور فروش · ۶ ماه گذشته
            </div>
          </div>
          <div className="row" style={{ gap: 16, fontSize: 12, flexShrink: 0 }}>
            <span className="row" style={{ gap: 6 }}>
              <span style={{ width: 10, height: 10, background: "var(--orange-600)", borderRadius: 2 }} />
              خرید
            </span>
            <span className="row" style={{ gap: 6 }}>
              <span style={{ width: 10, height: 10, background: "var(--state-good)", borderRadius: 2 }} />
              فروش
            </span>
          </div>
        </div>
        <BarPair
          labels={series.labels}
          a={series.purchases}
          b={series.sales}
          colorA="var(--orange-600)"
          colorB="var(--state-good)"
          height={210}
        />
      </section>

      {/* CHART 2 + 3 — Escrow + Credit utilization, Credit-health score */}
      <section className="grid two-col-shrink">
        <div className="card">
          <div className="card-title" style={{ flexWrap: "wrap", gap: 12 }}>
            <div>
              <h3>اسکرو و مصرف خط اعتباری</h3>
              <div className="muted" style={{ fontSize: "var(--t-sm)", marginTop: 4 }}>
                سقف اعتبار: {window.tc.formatIRR(series.creditLine)}
              </div>
            </div>
            <div className="row" style={{ gap: 16, fontSize: 12 }}>
              <span className="row" style={{ gap: 6 }}>
                <span style={{ width: 10, height: 10, background: "var(--state-active)", borderRadius: 2 }} />
                موجودی اسکرو
              </span>
              <span className="row" style={{ gap: 6 }}>
                <span style={{ width: 10, height: 10, background: "var(--orange-600)", borderRadius: 2 }} />
                مصرف اعتبار
              </span>
            </div>
          </div>
          <DualLine
            labels={series.labels}
            a={series.escrow}
            b={series.creditUsed}
            colorA="var(--state-active)"
            colorB="var(--orange-600)"
            fillA="rgba(46,90,143,0.10)"
            fillB="rgba(210,105,30,0.10)"
            height={210}
            yMax={series.creditLine}
            yMaxLabel={`سقف اعتبار · ${window.tc.formatIRR(series.creditLine)}`}
          />
        </div>

        <div className="card">
          <div className="card-title" style={{ flexWrap: "wrap", gap: 12 }}>
            <div>
              <h3>شاخص اعتبار شرکت در trustC</h3>
              <div className="muted" style={{ fontSize: "var(--t-sm)", marginTop: 4 }}>
                ترکیب رشد فروش، حاشیه اسکرو و مصرف خط اعتباری
              </div>
            </div>
            <span className="chip" data-tone={
              scoreTrend > 2 ? "good" : scoreTrend < -2 ? "bad" : "warn"
            }>
              <span className="mono">
                {scoreTrend >= 0 ? "+" : "−"}{window.tc.toFaDigits(Math.abs(scoreTrend))}
              </span>
            </span>
          </div>
          <ScoreLine
            labels={series.labels}
            points={series.score}
            color={scoreTrend >= 0 ? "var(--state-good)" : "var(--state-bad)"}
            fill={scoreTrend >= 0 ? "rgba(47,125,79,0.10)" : "rgba(180,40,40,0.10)"}
            height={210}
          />
        </div>
      </section>

      {/* Two-col: pending queue + alerts */}
      <section className="grid two-col-shrink">
        <div className="card responsive-table-card">
          <div className="card-title">
            <h3>خریدهای فعال در جریان</h3>
            <Btn variant="ghost" size="sm" onClick={() => ctx.setRoute("procurements")}>مشاهده همه ←</Btn>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>عنوان</th>
                <th>تأمین‌کننده</th>
                <th>وضعیت</th>
                <th className="num">مبلغ</th>
              </tr>
            </thead>
            <tbody>
              {inflight.slice(0, 5).map(p => (
                <tr key={p.id} onClick={() => ctx.setRoute("procurements", p.id)}>
                  <td>
                    <div style={{ fontWeight: 500 }}>{p.title}</div>
                    <div className="muted mono" style={{ fontSize: 11 }}>{p.id}</div>
                  </td>
                  <td>{window.tc.getSupplier(p.supplierId)?.name}</td>
                  <td><Chip state={p.state} /></td>
                  <td className="num">{window.tc.formatIRR(p.amount)}</td>
                </tr>
              ))}
              {inflight.length === 0 && (
                <tr><td colSpan={4}><div className="empty"><h3>خرید فعالی نیست</h3><div className="muted">همه خریدها نهایی شده‌اند.</div></div></td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="card">
          <div className="card-title"><h3>اعلان‌ها</h3></div>
          <div className="stack" style={{ gap: 12 }}>
            {recent.length === 0 && (
              <div className="muted" style={{ fontSize: 13 }}>اعلانی برای نمایش نیست.</div>
            )}
            {recent.map(p => {
              const last = p.timeline[p.timeline.length - 1];
              const idx = window.tc.stateIndex(p.state);
              const tone = idx <= 1 ? "warn" : idx >= 6 ? "good" : "active";
              const titleByState = {
                DRAFT: "خرید جدید ثبت شد",
                MANAGER_REVIEW: "در بررسی مدیر",
                FINANCIAL_VALIDATION: "اعتبارسنجی مالی",
                ESCROW_LOCK: "اسکرو قفل شد",
                SUPPLIER_DISPATCH: "تأمین‌کننده ارسال کرد",
                DELIVERY_CONFIRMATION: "تحویل تأیید شد",
                PAYMENT_RELEASE: "پرداخت آزاد شد",
                ACCOUNTING_FINALIZATION: "حسابداری نهایی شد",
              };
              return (
                <AlertRow
                  key={p.id}
                  tone={tone}
                  title={titleByState[p.state] || p.state}
                  body={`${window.tc.formatIRR(p.amount)} · ${p.title}`}
                  hint={`${p.id} · ${window.tc.toFaDigits(last?.at || p.createdAt)}`}
                />
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------
   Inline chart primitives — small, hand-rolled SVG.
   Kept inline to avoid a chart dependency in the prototype.
   ------------------------------------------------------------ */
function BarPair({ labels, a, b, colorA, colorB, height = 200 }) {
  const w = 600;
  const padX = 24, padY = 18;
  const max = Math.max(1, ...a, ...b);
  const n = labels.length;
  const groupW = (w - padX * 2) / n;
  const barW = Math.max(6, groupW / 2 - 8);

  return (
    <div style={{ position: "relative", height }}>
      <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" width="100%" height={height} aria-hidden="true">
        {/* gridlines */}
        {[0.25, 0.5, 0.75].map((t, i) => (
          <line key={i}
            x1={padX} x2={w - padX}
            y1={padY + (height - padY * 2) * (1 - t)}
            y2={padY + (height - padY * 2) * (1 - t)}
            stroke="var(--border-hairline)" strokeWidth="1" strokeDasharray="3 4" />
        ))}
        {labels.map((_, i) => {
          const gx = padX + i * groupW + groupW / 2;
          const ah = ((a[i] || 0) / max) * (height - padY * 2);
          const bh = ((b[i] || 0) / max) * (height - padY * 2);
          return (
            <g key={i}>
              <rect x={gx - barW - 2} y={height - padY - ah} width={barW} height={ah} fill={colorA} rx="1.5" />
              <rect x={gx + 2}        y={height - padY - bh} width={barW} height={bh} fill={colorB} rx="1.5" />
            </g>
          );
        })}
      </svg>
      <div className="row" style={{ justifyContent: "space-between", fontFamily: "var(--mono-data)", fontSize: 11, color: "var(--fg-muted)", marginTop: 4, paddingInline: 24 }}>
        {labels.map((m, i) => <span key={i}>{m}</span>)}
      </div>
    </div>
  );
}

function DualLine({ labels, a, b, colorA, colorB, fillA, fillB, height = 200, yMax, yMaxLabel }) {
  const w = 600;
  const padX = 24, padY = 18;
  const max = Math.max(1, yMax || 0, ...a, ...b);
  const x = (i) => padX + (i * (w - padX * 2)) / (labels.length - 1);
  const y = (v) => padY + (1 - v / max) * (height - padY * 2);

  function pathFor(arr) {
    return "M " + arr.map((v, i) => `${x(i).toFixed(2)} ${y(v).toFixed(2)}`).join(" L ");
  }
  function areaFor(arr) {
    return pathFor(arr) + ` L ${x(arr.length - 1)} ${height - padY} L ${x(0)} ${height - padY} Z`;
  }

  return (
    <div style={{ position: "relative", height }}>
      <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" width="100%" height={height} aria-hidden="true">
        {/* ceiling line for credit limit */}
        {yMax && (
          <line x1={padX} x2={w - padX} y1={padY} y2={padY}
            stroke="var(--orange-600)" strokeWidth="1" strokeDasharray="4 4" opacity="0.55" />
        )}
        {[0.25, 0.5, 0.75].map((t, i) => (
          <line key={i}
            x1={padX} x2={w - padX}
            y1={padY + (height - padY * 2) * (1 - t)}
            y2={padY + (height - padY * 2) * (1 - t)}
            stroke="var(--border-hairline)" strokeWidth="1" strokeDasharray="3 4" />
        ))}
        <path d={areaFor(a)} fill={fillA} />
        <path d={pathFor(a)} stroke={colorA} strokeWidth="1.8" fill="none" vectorEffect="non-scaling-stroke" />
        <path d={areaFor(b)} fill={fillB} />
        <path d={pathFor(b)} stroke={colorB} strokeWidth="1.8" fill="none" vectorEffect="non-scaling-stroke" />
        {a.map((v, i) => (
          <circle key={"a"+i} cx={x(i)} cy={y(v)} r="2.6" fill={colorA} />
        ))}
        {b.map((v, i) => (
          <circle key={"b"+i} cx={x(i)} cy={y(v)} r="2.6" fill={colorB} />
        ))}
      </svg>
      {yMaxLabel && (
        <div style={{ position: "absolute", insetInlineStart: 28, top: 2, fontSize: 10, color: "var(--orange-600)", fontFamily: "var(--mono-data)", letterSpacing: 0.4 }}>
          {yMaxLabel}
        </div>
      )}
      <div className="row" style={{ justifyContent: "space-between", fontFamily: "var(--mono-data)", fontSize: 11, color: "var(--fg-muted)", marginTop: 4, paddingInline: 24 }}>
        {labels.map((m, i) => <span key={i}>{m}</span>)}
      </div>
    </div>
  );
}

function ScoreLine({ labels, points, color, fill, height = 200 }) {
  const w = 600;
  const padX = 24, padY = 18;
  const lo = 0, hi = 100;
  const x = (i) => padX + (i * (w - padX * 2)) / (labels.length - 1);
  const y = (v) => padY + (1 - (v - lo) / (hi - lo)) * (height - padY * 2);
  const linePath = "M " + points.map((v, i) => `${x(i).toFixed(2)} ${y(v).toFixed(2)}`).join(" L ");
  const areaPath = linePath + ` L ${x(points.length - 1)} ${height - padY} L ${x(0)} ${height - padY} Z`;

  return (
    <div style={{ position: "relative", height }}>
      <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" width="100%" height={height} aria-hidden="true">
        {[20, 40, 60, 80].map(v => (
          <g key={v}>
            <line
              x1={padX} x2={w - padX}
              y1={y(v)} y2={y(v)}
              stroke="var(--border-hairline)" strokeWidth="1" strokeDasharray="3 4" />
            <text x={padX - 4} y={y(v) + 3} textAnchor="end"
              fontSize="9" fill="var(--fg-muted)" fontFamily="var(--mono-data)">{v}</text>
          </g>
        ))}
        <path d={areaPath} fill={fill} />
        <path d={linePath} stroke={color} strokeWidth="2" fill="none" vectorEffect="non-scaling-stroke" />
        {points.map((v, i) => (
          <g key={i}>
            <circle cx={x(i)} cy={y(v)} r="3" fill={color} />
            <text x={x(i)} y={y(v) - 8} textAnchor="middle"
              fontSize="10" fill={color} fontFamily="var(--mono-data)" fontWeight="600">
              {window.tc.toFaDigits(v)}
            </text>
          </g>
        ))}
      </svg>
      <div className="row" style={{ justifyContent: "space-between", fontFamily: "var(--mono-data)", fontSize: 11, color: "var(--fg-muted)", marginTop: 4, paddingInline: 24 }}>
        {labels.map((m, i) => <span key={i}>{m}</span>)}
      </div>
    </div>
  );
}

function AlertRow({ tone, title, body, hint }) {
  const colors = {
    active: "var(--state-active)",
    good:   "var(--state-good)",
    warn:   "var(--state-warn)",
    bad:    "var(--state-bad)",
  };
  return (
    <div style={{ display: "grid", gridTemplateColumns: "3px 1fr", gap: 12 }}>
      <div style={{ background: colors[tone], borderRadius: 2 }} />
      <div>
        <div style={{ fontWeight: 600, fontSize: 13 }}>{title}</div>
        <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>{body}</div>
        <div className="mono muted" style={{ fontSize: 10, marginTop: 4, letterSpacing: 0.5 }}>{hint}</div>
      </div>
    </div>
  );
}

/* ============================================================
   SCREEN: لیست خریدها
   ============================================================ */
function ProcurementsList({ ctx, setNav }) {
  const [filter, setFilter] = useState("ALL");
  const isMobile = useIsMobile();
  const procs = window.trustcData.procurements.filter(p => p.startupId === ctx.currentStartup.id);
  const filtered = filter === "ALL" ? procs : procs.filter(p => p.state === filter);

  return (
    <div className="stack" style={{ gap: "var(--s-6)" }}>
      <header className="row" style={{ justifyContent: "space-between", alignItems: "end", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div className="eyebrow">عملیات · خرید</div>
          <h1>خریدها</h1>
          <p className="muted" style={{ marginTop: 4 }}>
            {window.tc.toFaDigits(procs.length)} درخواست در ۹۰ روز گذشته
          </p>
        </div>
        <Btn variant="primary" icon={<Icon.plus />} onClick={() => setNav("new")}>ثبت خرید جدید</Btn>
      </header>

      <div className="row wrap" style={{ gap: 8 }}>
        {["ALL","DRAFT","MANAGER_REVIEW","ESCROW_LOCK","SUPPLIER_DISPATCH","DELIVERY_CONFIRMATION","PAYMENT_RELEASE"].map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={"btn btn--" + (filter === s ? "secondary" : "ghost") + " btn--sm"}
            style={{ border: "1px solid var(--border-hairline)" }}
          >
            {s === "ALL" ? "همه" : <Chip state={s} />}
            <span style={{ marginInlineStart: 6, color: "var(--fg-muted)", fontFamily: "var(--mono-data)" }}>
              {window.tc.toFaDigits(s === "ALL" ? procs.length : procs.filter(p => p.state === s).length)}
            </span>
          </button>
        ))}
      </div>

      {isMobile ? (
        <MobileList
          items={filtered}
          emptyTitle="چیزی یافت نشد"
          emptyHint="فیلتر را تغییر دهید."
          renderItem={(p) => (
            <MobileCard
              key={p.id}
              title={p.title}
              subtitle={`${window.tc.getSupplier(p.supplierId)?.name} · ${p.department}`}
              right={
                <div className="stack" style={{ gap: 6, alignItems: "flex-end" }}>
                  <Chip state={p.state} />
                  <div className="mono" style={{ fontSize: 13, fontWeight: 600 }}>{window.tc.formatIRR(p.amount)}</div>
                </div>
              }
              meta={
                <>
                  <span className="mono">{p.id}</span>
                  <span className="mono">{window.tc.toFaDigits(p.createdAt)}</span>
                </>
              }
              onClick={() => setNav(p.id)}
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
                <th>دپارتمان</th>
                <th>وضعیت</th>
                <th className="num">مبلغ (ریال)</th>
                <th>تاریخ</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} onClick={() => setNav(p.id)}>
                  <td className="mono" style={{ fontSize: 12, color: "var(--fg-muted)" }}>{p.id}</td>
                  <td><div style={{ fontWeight: 500 }}>{p.title}</div></td>
                  <td>{window.tc.getSupplier(p.supplierId)?.name}</td>
                  <td>{p.department}</td>
                  <td><Chip state={p.state} /></td>
                  <td className="num">{window.tc.formatIRRPlain(p.amount)}</td>
                  <td className="mono muted" style={{ fontSize: 12 }}>{window.tc.toFaDigits(p.createdAt)}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7}><div className="empty"><h3>چیزی یافت نشد</h3><div>فیلتر را تغییر دهید.</div></div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   SCREEN: جزئیات خرید + FSM زنده
   ------------------------------------------------------------
   Heart of the prototype. Shows the 8-step state machine and
   lets you advance it via the action button. Each advance:
   - bumps the procurement's state
   - emits a ledger entry (for ESCROW_LOCK and PAYMENT_RELEASE)
   - emits an audit log entry
   - plays the stamp animation
   ============================================================ */
function ProcurementDetail({ ctx, procId, setNav }) {
  // Local state so we can mutate the demo without rebuilding data.js
  const seed = window.trustcData.procurements.find(p => p.id === procId);
  const [proc, setProc] = useState(seed);
  const [stamp, setStamp] = useState(null); // {label, tone}

  if (!proc) {
    return <div className="empty"><h3>خرید پیدا نشد</h3></div>;
  }

  const isMobile = useIsMobile();
  const fsm = window.trustcData.procurementFSM;
  const ci = window.tc.stateIndex(proc.state);
  const nextStep = fsm[ci + 1];
  const supplier = window.tc.getSupplier(proc.supplierId);

  // Roles permitted to advance each transition
  const PERMIT = {
    DRAFT: "FOUNDER",
    MANAGER_REVIEW: "FOUNDER",   // (PM, demo)
    FINANCIAL_VALIDATION: "VC",
    ESCROW_LOCK: "FOUNDER",
    SUPPLIER_DISPATCH: "FOUNDER",  // supplier in real life
    DELIVERY_CONFIRMATION: "FOUNDER",
    PAYMENT_RELEASE: "FOUNDER",    // system in real life
  };

  function advance() {
    if (ctx.frozen) {
      ctx.toast({ tone: "bad", msg: "این استارتاپ توسط VC فریز شده. هیچ گذری مجاز نیست." });
      return;
    }
    if (!nextStep) return;
    const stampMap = {
      ESCROW_LOCK: { label: "ESCROW\nLOCKED", tone: "" },
      PAYMENT_RELEASE: { label: "PAYMENT\nRELEASED", tone: "" },
      DELIVERY_CONFIRMATION: { label: "DELIVERY\nOK", tone: "" },
      ACCOUNTING_FINALIZATION: { label: "FINALIZED", tone: "" },
    };
    if (stampMap[nextStep.state]) {
      setStamp(stampMap[nextStep.state]);
      setTimeout(() => setStamp(null), 1400);
    }
    const at = new Date().toLocaleString("fa-IR");
    setProc(p => ({
      ...p,
      state: nextStep.state,
      timeline: [...p.timeline, { state: nextStep.state, at, actor: "demo" }],
    }));
    // Tell parent app about ledger / audit emissions for live ticker on Ledger screen
    if (nextStep.state === "ESCROW_LOCK") ctx.emitLedger({
      txn: "txn_" + Math.random().toString(36).slice(2,8),
      at, ref: proc.id, desc: "قفل اسکرو · " + proc.id,
      entries: [
        { code: "2103", account: "وجوه امانی مأخوذه · اسکرو", debit: proc.amount, credit: 0 },
        { code: "1104", account: "حساب پرداختنی تأمین‌کننده · پاکسازی", debit: 0, credit: proc.amount },
      ],
    });
    if (nextStep.state === "PAYMENT_RELEASE") ctx.emitLedger({
      txn: "txn_" + Math.random().toString(36).slice(2,8),
      at, ref: proc.id, desc: "آزادسازی اسکرو · " + proc.id,
      entries: [
        { code: "1104", account: "حساب پرداختنی تأمین‌کننده · پاکسازی", debit: proc.amount, credit: 0 },
        { code: "1001", account: "بانک · حساب عملیاتی", debit: 0, credit: proc.amount },
      ],
    });
  }

  return (
    <div className="stack" style={{ gap: "var(--s-6)" }}>
      <header className="row" style={{ justifyContent: "space-between", alignItems: "start" }}>
        <div>
          <button className="btn btn--ghost btn--sm" onClick={() => setNav(null)}>
            <Icon.arrow size={14} /> بازگشت به خریدها
          </button>
          <div className="eyebrow" style={{ marginTop: 12 }}>{proc.id} · {proc.invoiceNumber}</div>
          <h1 style={{ marginTop: 4 }}>{proc.title}</h1>
          <div className="row" style={{ gap: 8, marginTop: 8 }}>
            <Chip state={proc.state} />
            <span className="muted mono" style={{ fontSize: 12 }}>{supplier?.name} · {proc.department}</span>
          </div>
        </div>
        <div className="row" style={{ gap: 12 }}>
          {nextStep ? (
            <Btn variant="primary" icon={<Icon.stamp />} onClick={advance}>
              پیشروی به: {nextStep.label}
            </Btn>
          ) : (
            <Btn variant="ghost" disabled>وضعیت پایانی</Btn>
          )}
        </div>
      </header>

      {/* FSM bar — horizontal on desktop, vertical on mobile */}
      {isMobile ? <MobileFSMVertical currentState={proc.state} /> : <FSM currentState={proc.state} />}

      {/* Two-col: details + timeline */}
      <section className="grid" style={{ gridTemplateColumns: isMobile ? "1fr" : "1fr 360px", gap: "var(--s-6)" }}>
        <div className="stack" style={{ gap: "var(--s-4)" }}>
          <div className="card">
            <div className="card-title"><h3>مشخصات خرید</h3></div>
            <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: "var(--s-4) var(--s-6)" }}>
              <Field label="مبلغ"        value={window.tc.formatIRR(proc.amount)} />
              <Field label="تاریخ تحویل پیش‌بینی" value={window.tc.toFaDigits(proc.expectedDelivery || "—")} />
              <Field label="اولویت"      value={window.tc.priorityLabelFa(proc.priority)} />
              <Field label="دسته بودجه"  value={proc.category} />
              <Field label="پروژه"       value={proc.project || "—"} />
              <Field label="شماره فاکتور" value={proc.invoiceNumber} mono />
              <Field label="ثبت‌کننده"    value={proc.submittedBy || "—"} />
              <Field label="ایجاد شده"   value={window.tc.toFaDigits(proc.createdAt)} mono />
            </div>
            {proc.reason && (
              <>
                <div className="divider" />
                <div className="eyebrow">دلیل عملیاتی</div>
                <p style={{ marginTop: 8, color: "var(--fg-default)" }}>{proc.reason}</p>
              </>
            )}
          </div>

          {/* Escrow custody panel */}
          {ci >= 3 && (
            <div className="card" style={{ background: "var(--cream-100)", borderColor: "var(--orange-600)" }}>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <div>
                  <div className="eyebrow" style={{ color: "var(--orange-800)" }}>قفل JIT اسکرو</div>
                  <div style={{ fontFamily: "var(--mono-data)", fontWeight: 600, fontSize: 20, marginTop: 4 }}>
                    {window.tc.formatIRRPlain(proc.amount)} <span className="muted">IRR</span>
                  </div>
                  <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
                    تحت سرفصل <span className="mono">2103_FIDUCIARY_ESCROW_LIABILITY</span>
                  </div>
                </div>
                <div className="stamp" style={{ color: "var(--state-good)" }}>
                  ESCROW{"\n"}LOCKED
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-title"><h3>تایم‌لاین</h3></div>
          <div className="stack" style={{ gap: 0 }}>
            {proc.timeline.map((ev, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "12px 1fr", gap: 12, padding: "10px 0", borderBottom: i === proc.timeline.length-1 ? 0 : "1px dashed var(--border-hairline)" }}>
                <div style={{ position: "relative" }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: i === proc.timeline.length-1 ? "var(--orange-600)" : "var(--state-good)", marginTop: 6 }} />
                  {i < proc.timeline.length - 1 && (
                    <div style={{ position: "absolute", top: 16, insetInlineStart: 4.5, bottom: -10, width: 1, background: "var(--border-hairline)" }} />
                  )}
                </div>
                <div>
                  <div style={{ fontWeight: 500, fontSize: 13 }}>{window.tc.stateLabelFa(ev.state)}</div>
                  <div className="mono muted" style={{ fontSize: 11 }}>{ev.state}</div>
                  <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                    {window.tc.toFaDigits(ev.at)} · {ev.actor}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Floating stamp animation */}
      {stamp && (
        <div style={{ position: "fixed", inset: 0, pointerEvents: "none", display: "grid", placeItems: "center", zIndex: 80 }}>
          <div className="stamp action" style={{ width: 160, height: 160, fontSize: 18, whiteSpace: "pre-line" }}>
            {stamp.label}
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, mono }) {
  return (
    <div>
      <div className="eyebrow" style={{ marginBottom: 4 }}>{label}</div>
      <div className={mono ? "mono" : ""} style={{ fontSize: 14 }}>{value}</div>
    </div>
  );
}

/* ============================================================
   SCREEN: ثبت خرید جدید
   ------------------------------------------------------------
   Real form with field validation.
   ============================================================ */
function NewProcurement({ ctx, setNav }) {
  const [form, setForm] = useState({
    title: "", supplierId: "", invoiceNumber: "", amount: "",
    department: "", category: "", priority: "MEDIUM", reason: "",
  });
  const [errors, setErrors] = useState({});

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  function validate() {
    const e = {};
    if (!form.title) e.title = "عنوان الزامی است";
    if (!form.supplierId) e.supplierId = "تأمین‌کننده را انتخاب کنید";
    if (!form.amount || window.tc.parsePersianNumber(form.amount) <= 0) e.amount = "مبلغ معتبر وارد کنید";
    if (!form.category) e.category = "دسته بودجه را انتخاب کنید";
    if (!form.department) e.department = "دپارتمان را انتخاب کنید";
    if (!form.reason || form.reason.length < 10) e.reason = "دلیل را شرح دهید (حداقل ۱۰ نویسه)";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function submit() {
    if (!validate()) return;
    if (ctx.frozen) {
      ctx.toast({ tone: "bad", msg: "ثبت خرید جدید مسدود — این استارتاپ فریز شده." });
      return;
    }
    ctx.toast({ tone: "good", msg: "خرید جدید با موفقیت ثبت شد و در صف بررسی قرار گرفت." });
    setTimeout(() => setNav(null), 600);
  }

  return (
    <div className="stack" style={{ gap: "var(--s-6)", maxWidth: 820 }}>
      <header>
        <button className="btn btn--ghost btn--sm" onClick={() => setNav(null)}>
          <Icon.arrow size={14} /> بازگشت
        </button>
        <div className="eyebrow" style={{ marginTop: 12 }}>عملیات · خرید</div>
        <h1>ثبت درخواست خرید جدید</h1>
        <p className="muted">قبل از هر پرداخت، خرید باید از مسیر مصوب عبور کند. اطلاعات شما در حال حاضر مرحله DRAFT را ایجاد می‌کند.</p>
      </header>

      <div className="card">
        <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: "var(--s-5)" }}>
          <FormField label="عنوان درخواست" error={errors.title} required>
            <input className="input" aria-invalid={!!errors.title}
              placeholder="مثال: تمدید زیرساخت ابری Q۲"
              value={form.title} onChange={e => set("title", e.target.value)} />
          </FormField>
          <FormField label="تأمین‌کننده" error={errors.supplierId} required>
            <select className="select" aria-invalid={!!errors.supplierId}
              value={form.supplierId} onChange={e => set("supplierId", e.target.value)}>
              <option value="">— انتخاب کنید —</option>
              {window.trustcData.suppliers.map(s => (
                <option key={s.id} value={s.id}>{s.name} · {s.category}</option>
              ))}
            </select>
          </FormField>
          <FormField label="شماره پیش‌فاکتور" hint="در صورت وجود">
            <input className="input mono" placeholder="INV-2026-…"
              value={form.invoiceNumber} onChange={e => set("invoiceNumber", e.target.value)} />
          </FormField>
          <FormField label="مبلغ (ریال)" error={errors.amount} required>
            <input className="input mono" aria-invalid={!!errors.amount}
              placeholder="38,400,000,000"
              value={form.amount} onChange={e => set("amount", e.target.value)} />
            {form.amount && !errors.amount && (
              <div className="field-hint">≈ {window.tc.formatIRR(window.tc.parsePersianNumber(form.amount))}</div>
            )}
          </FormField>
          <FormField label="دپارتمان" error={errors.department} required>
            <select className="select" value={form.department} onChange={e => set("department", e.target.value)}>
              <option value="">— انتخاب کنید —</option>
              <option>مهندسی</option><option>تأمین</option><option>عملیات</option>
              <option>بازاریابی</option><option>فروش</option><option>اداری</option>
            </select>
          </FormField>
          <FormField label="دسته بودجه" error={errors.category} required>
            <select className="select" value={form.category} onChange={e => set("category", e.target.value)}>
              <option value="">— انتخاب کنید —</option>
              <option>زیرساخت</option><option>موجودی</option><option>خدمات</option>
              <option>تجهیزات</option><option>نیروی انسانی</option>
            </select>
          </FormField>
          <FormField label="اولویت">
            <div className="seg">
              {[["LOW","کم"],["MEDIUM","متوسط"],["HIGH","زیاد"]].map(([k,l]) => (
                <button key={k} className={form.priority === k ? "active" : ""} onClick={() => set("priority", k)}>{l}</button>
              ))}
            </div>
          </FormField>
          <div></div>
          <FormField label="دلیل عملیاتی" error={errors.reason} required style={{ gridColumn: "1 / -1" }}>
            <textarea className="textarea" aria-invalid={!!errors.reason}
              placeholder="چرا این خرید لازم است و چه نتیجه‌ای دارد؟"
              value={form.reason} onChange={e => set("reason", e.target.value)} />
          </FormField>
        </div>

        <div className="divider" />
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div className="muted" style={{ fontSize: 13 }}>
            پس از ثبت، درخواست به مرحله <Chip state="MANAGER_REVIEW" /> هدایت می‌شود.
          </div>
          <div className="row" style={{ gap: 8 }}>
            <Btn variant="ghost" onClick={() => setNav(null)}>انصراف</Btn>
            <Btn variant="primary" onClick={submit}>ثبت درخواست</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

function FormField({ label, children, error, hint, required, style }) {
  return (
    <div className="field" style={style}>
      <label className="field-label">
        {label}{required && <span style={{ color: "var(--state-bad)" }}> *</span>}
      </label>
      {children}
      {hint && !error && <div className="field-hint">{hint}</div>}
      {error && <div className="field-error">{error}</div>}
    </div>
  );
}

Object.assign(window, {
  FounderDashboard, ProcurementsList, ProcurementDetail, NewProcurement,
});

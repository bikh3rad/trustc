// VC Companies page — the "افزودن استارتاپ" + founder-linking surface that
// the user reported missing. Lists existing portfolio companies, opens a
// modal form to register a new one (PRD §8.1), and shows founders whose
// auth account exists but is not yet linked to any startup so the VC can
// attach them.
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  ApiHttpError,
  Startups as StartupsApi,
  type CreateStartupInput,
  type CreateStartupResult,
  type Startup,
  type UnlinkedFounder,
  type VC,
} from "../../api";
import { Btn } from "../../components/ui/Btn";
import { Icon } from "../../components/ui/Icon";
import { Modal } from "../../components/ui/Modal";
import { Stat } from "../../components/ui/Stat";
import { useToast } from "../../context/ToastContext";
import { useCurrentStartup } from "../../context/CurrentStartupContext";
import { formatIRR, parsePersianNumber, riskLabelFa, toFaDigits } from "../../lib/format";

type FormState = {
  startup_name: string;
  legal_name: string;
  industry: string;
  country: string;
  tax_id: string;
  founder_name: string;
  founder_email: string;
  founder_phone: string;
  bank_account: string;
  bank_name: string;
  burn_rate: string;
  risk_level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
};

type Errors = Partial<Record<keyof FormState, string>>;

const EMPTY: FormState = {
  startup_name: "",
  legal_name: "",
  industry: "",
  country: "Iran",
  tax_id: "",
  founder_name: "",
  founder_email: "",
  founder_phone: "",
  bank_account: "",
  bank_name: "",
  burn_rate: "",
  risk_level: "MEDIUM",
};

const RISK_TONE: Record<FormState["risk_level"], "good" | "warn" | "bad"> = {
  LOW: "good",
  MEDIUM: "warn",
  HIGH: "bad",
  CRITICAL: "bad",
};

function Field({
  label,
  required,
  hint,
  error,
  children,
  style,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div className="field" style={style}>
      <label className="field-label">
        {label}
        {required && <span style={{ color: "var(--state-bad)" }}> *</span>}
      </label>
      {children}
      {hint && !error && <div className="field-hint">{hint}</div>}
      {error && <div className="field-error">{error}</div>}
    </div>
  );
}

export function Companies() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { refresh: refreshCurrent } = useCurrentStartup();

  const [startups, setStartups] = useState<Startup[]>([]);
  const [vcs, setVCs] = useState<VC[]>([]);
  const [unlinked, setUnlinked] = useState<UnlinkedFounder[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);

  const [linkingFounder, setLinkingFounder] = useState<UnlinkedFounder | null>(null);
  const [linkTargetStartupId, setLinkTargetStartupId] = useState<string>("");
  const [linkBusy, setLinkBusy] = useState(false);

  // Search/filter for the portfolio table — name, industry, country, tax id.
  const [query, setQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState<"" | FormState["risk_level"]>(
    "",
  );

  async function refresh() {
    setLoading(true);
    try {
      const [s, v, f] = await Promise.all([
        StartupsApi.list(),
        StartupsApi.listVCs().catch(() => ({ vcs: [] as VC[] })),
        StartupsApi.unlinkedFounders().catch(() => ({ founders: [] as UnlinkedFounder[] })),
      ]);
      setStartups(s.startups);
      setVCs(v.vcs);
      setUnlinked(f.founders);
      setErr(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "خطای ناشناخته");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void refresh();
  }, []);

  function openCreate() {
    setForm(EMPTY);
    setErrors({});
    setOpen(true);
  }

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  }

  function validate(): boolean {
    const e: Errors = {};
    if (!form.startup_name.trim()) e.startup_name = "نام شرکت الزامی است";
    if (!form.legal_name.trim()) e.legal_name = "نام حقوقی الزامی است";
    if (!form.industry.trim()) e.industry = "صنعت را وارد کنید";
    if (!form.country.trim()) e.country = "کشور را وارد کنید";
    if (!form.tax_id.trim()) e.tax_id = "شناسه مالیاتی الزامی است";
    if (!form.founder_name.trim()) e.founder_name = "نام بنیان‌گذار الزامی است";
    if (!form.founder_email.trim() || !form.founder_email.includes("@"))
      e.founder_email = "ایمیل معتبر وارد کنید";
    if (form.burn_rate && parsePersianNumber(form.burn_rate) < 0)
      e.burn_rate = "نرخ سوخت نمی‌تواند منفی باشد";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit() {
    if (!validate()) return;
    setSubmitting(true);
    const burnTomans = parsePersianNumber(form.burn_rate);
    // The DB stores burn_rate as "cents-equivalent" (the same scale used by
    // formatIRR — 1 unit = 1000 rial = 1/10 toman). The form lets the VC
    // type tomans for readability; persist as toman * 100 to match seed.
    const burnRateCents = burnTomans > 0 ? Math.round(burnTomans * 100) : 0;
    const body: CreateStartupInput = {
      startup_name: form.startup_name.trim(),
      legal_name: form.legal_name.trim(),
      industry: form.industry.trim(),
      country: form.country.trim(),
      tax_id: form.tax_id.trim(),
      burn_rate_cents: burnRateCents,
      risk_level: form.risk_level,
      founder: {
        founder_name: form.founder_name.trim(),
        email: form.founder_email.trim().toLowerCase(),
        phone: form.founder_phone.trim() || undefined,
      },
      bank: form.bank_account.trim()
        ? {
            bank_account: form.bank_account.trim(),
            bank_name: form.bank_name.trim() || undefined,
          }
        : undefined,
    };
    try {
      const created: CreateStartupResult = await StartupsApi.create(body);
      if (created.linked_founder) {
        toast({
          tone: "good",
          msg: `«${created.startup_name}» اضافه شد · بنیان‌گذار ${created.linked_founder.name} متصل شد`,
        });
      } else {
        toast({
          tone: "good",
          msg: `«${created.startup_name}» اضافه شد · بنیان‌گذار هنوز ثبت‌نام نکرده — پس از ثبت‌نام، اتصال دستی انجام دهید`,
        });
      }
      setOpen(false);
      await refresh();
      await refreshCurrent();
    } catch (e) {
      const msg =
        e instanceof ApiHttpError
          ? e.message
          : e instanceof Error
            ? e.message
            : "ثبت ناموفق بود";
      toast({ tone: "bad", msg });
    } finally {
      setSubmitting(false);
    }
  }

  async function applyLink() {
    if (!linkingFounder || !linkTargetStartupId) return;
    setLinkBusy(true);
    try {
      await StartupsApi.linkFounder(linkTargetStartupId, {
        user_id: linkingFounder.id,
      });
      toast({
        tone: "good",
        msg: `${linkingFounder.name} به استارتاپ متصل شد`,
      });
      setLinkingFounder(null);
      setLinkTargetStartupId("");
      await refresh();
      await refreshCurrent();
    } catch (e) {
      const msg =
        e instanceof ApiHttpError
          ? e.message
          : e instanceof Error
            ? e.message
            : "خطا در اتصال";
      toast({ tone: "bad", msg });
    } finally {
      setLinkBusy(false);
    }
  }

  const vcLabel = useMemo(() => {
    if (vcs.length === 1) return vcs[0].name;
    return "—";
  }, [vcs]);

  const filteredStartups = useMemo(() => {
    const q = query.trim().toLowerCase();
    return startups.filter((s) => {
      if (riskFilter && s.risk_level !== riskFilter) return false;
      if (!q) return true;
      const hay = `${s.startup_name} ${s.legal_name} ${s.industry} ${s.country} ${s.tax_id}`.toLowerCase();
      return hay.includes(q);
    });
  }, [startups, query, riskFilter]);

  return (
    <div className="stack" style={{ gap: "var(--s-6)" }}>
      <header className="dashboard-hero">
        <div>
          <div className="eyebrow">پورتفولیو · مدیریت شرکت‌ها</div>
          <h1 style={{ fontSize: "var(--t-3xl)" }}>شرکت‌های تحت پوشش</h1>
          <p
            className="muted"
            style={{ fontSize: "var(--t-lg)", marginTop: 8, maxWidth: 640 }}
          >
            افزودن استارتاپ جدید به پورتفوی{" "}
            <b style={{ color: "var(--fg-default)" }}>{vcLabel}</b> و اتصال
            بنیان‌گذاران بدون شرکت
          </p>
        </div>
        <div className="dashboard-hero-cta">
          <Btn variant="primary" icon={<Icon.plus />} onClick={openCreate}>
            افزودن استارتاپ
          </Btn>
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

      <section className="grid stat-grid">
        <Stat
          label="تعداد شرکت‌ها"
          value={toFaDigits(startups.length)}
          unit="استارتاپ"
        />
        <Stat
          label="بنیان‌گذاران بدون شرکت"
          value={toFaDigits(unlinked.length)}
          unit="حساب"
          delta={
            unlinked.length > 0
              ? { text: "⚠ نیاز به اتصال", tone: "down" }
              : { text: "همه متصل", tone: "up" }
          }
        />
        <Stat
          label="میانگین اعتبار"
          value={
            startups.length
              ? toFaDigits(
                  Math.round(
                    startups.reduce((s, x) => s + x.credit_score, 0) /
                      startups.length,
                  ),
                )
              : "—"
          }
          unit="از ۱۰۰"
        />
        <Stat
          label="ریسک بالا/بحرانی"
          value={toFaDigits(
            startups.filter(
              (s) => s.risk_level === "HIGH" || s.risk_level === "CRITICAL",
            ).length,
          )}
          unit={`از ${toFaDigits(startups.length)}`}
        />
      </section>

      {unlinked.length > 0 && (
        <section className="card">
          <div className="card-title">
            <div>
              <h3>بنیان‌گذاران بدون شرکت</h3>
              <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
                این کاربران ثبت‌نام کرده‌اند ولی هنوز به هیچ استارتاپی متصل
                نیستند. تا زمانی که آن‌ها را به یک شرکت متصل نکنید، در داشبورد
                خود فقط پیام «هنوز استارتاپی ثبت نشده» را می‌بینند.
              </div>
            </div>
          </div>
          <div className="responsive-table-card">
            <table className="table">
              <thead>
                <tr>
                  <th>نام</th>
                  <th>ایمیل</th>
                  <th>شرکت اعلام‌شده</th>
                  <th>وضعیت</th>
                  <th>اقدام</th>
                </tr>
              </thead>
              <tbody>
                {unlinked.map((u) => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 500 }}>{u.name}</td>
                    <td className="mono" style={{ fontSize: 12 }}>
                      {u.email}
                    </td>
                    <td>{u.company || "—"}</td>
                    <td>
                      <span
                        className="chip"
                        data-tone={u.status === "ACTIVE" ? "good" : "warn"}
                      >
                        <span className="mono">{u.status}</span>
                      </span>
                    </td>
                    <td>
                      <Btn
                        variant="secondary"
                        size="sm"
                        icon={<Icon.plus />}
                        onClick={() => {
                          setLinkingFounder(u);
                          setLinkTargetStartupId(startups[0]?.id ?? "");
                        }}
                        disabled={startups.length === 0}
                      >
                        اتصال به استارتاپ
                      </Btn>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="card">
        <div className="card-title" style={{ flexWrap: "wrap", gap: 12 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <h3>فهرست شرکت‌های پورتفوی</h3>
            <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
              کلیک روی هر ردیف — باز کردن داشبورد آنلاین آن شرکت
            </div>
          </div>
          <div className="row wrap" style={{ gap: 8, alignItems: "center" }}>
            <input
              className="input"
              placeholder="جستجو در شرکت‌ها…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ minWidth: 220 }}
            />
            <div className="row" style={{ gap: 4, flexWrap: "wrap" }}>
              {(
                [
                  { v: "", label: "همه" },
                  { v: "LOW", label: "کم" },
                  { v: "MEDIUM", label: "متوسط" },
                  { v: "HIGH", label: "بالا" },
                  { v: "CRITICAL", label: "بحرانی" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.v}
                  type="button"
                  onClick={() => setRiskFilter(opt.v as typeof riskFilter)}
                  className={
                    "btn btn--sm " +
                    (riskFilter === opt.v ? "btn--secondary" : "btn--ghost")
                  }
                  style={{ border: "1px solid var(--border-hairline)" }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {loading ? (
          <div className="muted">در حال بارگذاری…</div>
        ) : startups.length === 0 ? (
          <div className="empty">
            <h3>هنوز استارتاپی به پورتفوی اضافه نشده</h3>
            <div>برای شروع، روی «افزودن استارتاپ» در بالا کلیک کنید.</div>
          </div>
        ) : filteredStartups.length === 0 ? (
          <div className="empty">
            <h3>نتیجه‌ای پیدا نشد</h3>
            <div className="muted">فیلتر یا عبارت جستجو را تغییر دهید.</div>
          </div>
        ) : (
          <div className="responsive-table-card">
            <table className="table">
              <thead>
                <tr>
                  <th>نام</th>
                  <th>صنعت</th>
                  <th>کشور</th>
                  <th>اعتبار</th>
                  <th>ریسک</th>
                  <th>نرخ سوخت</th>
                </tr>
              </thead>
              <tbody>
                {filteredStartups.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => navigate(`/vc/companies/${s.id}`)}
                    style={{ cursor: "pointer" }}
                  >
                    <td>
                      <div style={{ fontWeight: 500 }}>{s.startup_name}</div>
                      <div className="muted mono" style={{ fontSize: 11 }}>
                        {s.id.slice(0, 8)} · {s.tax_id}
                      </div>
                    </td>
                    <td>{s.industry}</td>
                    <td>{s.country}</td>
                    <td className="mono">{toFaDigits(s.credit_score)}</td>
                    <td>
                      <span
                        className="chip"
                        data-tone={
                          s.risk_level === "LOW"
                            ? "good"
                            : s.risk_level === "MEDIUM"
                              ? "warn"
                              : "bad"
                        }
                      >
                        <span className="mono">{s.risk_level}</span>
                        <span className="fa">· {riskLabelFa(s.risk_level)}</span>
                      </span>
                    </td>
                    <td className="num">{formatIRR(s.burn_rate_cents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="افزودن استارتاپ به پورتفوی"
        footer={
          <>
            <Btn variant="ghost" onClick={() => setOpen(false)}>
              انصراف
            </Btn>
            <Btn
              variant="primary"
              disabled={submitting}
              onClick={() => void submit()}
            >
              {submitting ? "در حال ثبت…" : "ثبت استارتاپ"}
            </Btn>
          </>
        }
      >
        <div className="stack" style={{ gap: 16 }}>
          <div className="eyebrow">اطلاعات شرکت</div>
          <div className="grid form-row-2" style={{ gap: 12 }}>
            <Field
              label="نام شرکت (نمایشی)"
              required
              error={errors.startup_name}
            >
              <input
                className="input"
                value={form.startup_name}
                onChange={(e) => set("startup_name", e.target.value)}
                placeholder="مثلاً صنایع غذایی سینا"
              />
            </Field>
            <Field label="نام حقوقی" required error={errors.legal_name}>
              <input
                className="input"
                value={form.legal_name}
                onChange={(e) => set("legal_name", e.target.value)}
                placeholder="شرکت صنایع غذایی سینا (سهامی عام)"
              />
            </Field>
            <Field label="صنعت" required error={errors.industry}>
              <input
                className="input"
                value={form.industry}
                onChange={(e) => set("industry", e.target.value)}
                placeholder="صنایع غذایی"
              />
            </Field>
            <Field label="کشور" required error={errors.country}>
              <input
                className="input"
                value={form.country}
                onChange={(e) => set("country", e.target.value)}
              />
            </Field>
            <Field label="شناسه مالیاتی" required error={errors.tax_id}>
              <input
                className="input mono"
                value={form.tax_id}
                onChange={(e) => set("tax_id", e.target.value)}
                placeholder="IR-XXXX-0000"
              />
            </Field>
            <Field
              label="نرخ سوخت ماهیانه (تومان)"
              hint="اختیاری · پیش‌فرض ۰"
              error={errors.burn_rate}
            >
              <input
                className="input num"
                value={form.burn_rate}
                onChange={(e) => set("burn_rate", e.target.value)}
                placeholder="۱۸۰۰۰۰۰"
              />
            </Field>
            <Field label="سطح ریسک اولیه">
              <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
                {(["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    className={
                      "chip " + (form.risk_level === lvl ? "chip--active" : "")
                    }
                    data-tone={RISK_TONE[lvl]}
                    onClick={() => set("risk_level", lvl)}
                    style={{
                      cursor: "pointer",
                      border: "1px solid var(--border-hairline)",
                      background:
                        form.risk_level === lvl
                          ? "var(--bg-elevated)"
                          : "transparent",
                    }}
                  >
                    <span className="mono">{lvl}</span>
                    <span className="fa"> · {riskLabelFa(lvl)}</span>
                  </button>
                ))}
              </div>
            </Field>
          </div>

          <div className="divider" />

          <div className="eyebrow">بنیان‌گذار</div>
          <div
            className="muted"
            style={{ fontSize: 12, marginTop: -8, marginBottom: 4 }}
          >
            اگر کاربری با این ایمیل قبلاً در سیستم ثبت‌نام کرده باشد، به‌صورت
            خودکار به این استارتاپ متصل می‌شود.
          </div>
          <div className="grid form-row-2" style={{ gap: 12 }}>
            <Field label="نام بنیان‌گذار" required error={errors.founder_name}>
              <input
                className="input"
                value={form.founder_name}
                onChange={(e) => set("founder_name", e.target.value)}
              />
            </Field>
            <Field
              label="ایمیل بنیان‌گذار"
              required
              error={errors.founder_email}
            >
              <input
                className="input mono"
                type="email"
                value={form.founder_email}
                onChange={(e) => set("founder_email", e.target.value)}
                placeholder="founder@example.com"
                dir="ltr"
              />
            </Field>
            <Field label="شماره تماس">
              <input
                className="input mono"
                value={form.founder_phone}
                onChange={(e) => set("founder_phone", e.target.value)}
                placeholder="+98-21-555-0000"
                dir="ltr"
              />
            </Field>
          </div>

          <div className="divider" />

          <div className="eyebrow">حساب بانکی (اختیاری)</div>
          <div className="grid form-row-2" style={{ gap: 12 }}>
            <Field label="شماره حساب / شبا">
              <input
                className="input mono"
                value={form.bank_account}
                onChange={(e) => set("bank_account", e.target.value)}
                dir="ltr"
              />
            </Field>
            <Field label="نام بانک">
              <input
                className="input"
                value={form.bank_name}
                onChange={(e) => set("bank_name", e.target.value)}
              />
            </Field>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!linkingFounder}
        onClose={() => setLinkingFounder(null)}
        title="اتصال بنیان‌گذار به استارتاپ"
        footer={
          linkingFounder && (
            <>
              <Btn variant="ghost" onClick={() => setLinkingFounder(null)}>
                انصراف
              </Btn>
              <Btn
                variant="primary"
                disabled={linkBusy || !linkTargetStartupId}
                onClick={() => void applyLink()}
              >
                ذخیره اتصال
              </Btn>
            </>
          )
        }
      >
        {linkingFounder && (
          <div className="stack" style={{ gap: 12 }}>
            <p style={{ marginBottom: 0 }}>
              کاربر <b>{linkingFounder.name}</b>{" "}
              <span className="mono muted" style={{ fontSize: 12 }}>
                ({linkingFounder.email})
              </span>{" "}
              به کدام استارتاپ متصل شود؟
            </p>
            <Field label="استارتاپ مقصد" required>
              <select
                className="input"
                value={linkTargetStartupId}
                onChange={(e) => setLinkTargetStartupId(e.target.value)}
              >
                {startups.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.startup_name} ({s.id.slice(0, 8)})
                  </option>
                ))}
              </select>
            </Field>
            <div className="muted" style={{ fontSize: 12 }}>
              پس از اتصال، کاربر می‌تواند با ورود به سیستم داشبورد استارتاپ
              خود را ببیند.
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

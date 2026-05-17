import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Procurements as ProcurementsApi } from "../../api";
import { Btn } from "../../components/ui/Btn";
import { Chip } from "../../components/ui/Chip";
import { Icon } from "../../components/ui/Icon";
import { useCurrentStartup } from "../../context/CurrentStartupContext";
import { useFrozen } from "../../context/FrozenContext";
import { useToast } from "../../context/ToastContext";
import { formatIRR, parsePersianNumber } from "../../lib/format";

type FormState = {
  title: string;
  supplier_name: string;
  amount: string;
  category: string;
  priority: "LOW" | "MEDIUM" | "HIGH";
  description: string;
};

type Errors = Partial<Record<keyof FormState, string>>;

function FormField({
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

export function NewProcurement() {
  const navigate = useNavigate();
  const { current } = useCurrentStartup();
  const { isFrozen } = useFrozen();
  const { toast } = useToast();
  const frozen = current ? isFrozen(current.id) : false;

  const [form, setForm] = useState<FormState>({
    title: "",
    supplier_name: "",
    amount: "",
    category: "",
    priority: "MEDIUM",
    description: "",
  });
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function validate(): boolean {
    const e: Errors = {};
    if (!form.title.trim()) e.title = "عنوان الزامی است";
    if (!form.supplier_name.trim()) e.supplier_name = "تأمین‌کننده را وارد کنید";
    const amount = parsePersianNumber(form.amount);
    if (!form.amount || amount <= 0) e.amount = "مبلغ معتبر وارد کنید";
    if (!form.category) e.category = "دسته بودجه را انتخاب کنید";
    if (!form.description.trim() || form.description.trim().length < 10) {
      e.description = "توضیح را شرح دهید (حداقل ۱۰ نویسه)";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit() {
    if (!current) {
      toast({ tone: "bad", msg: "ابتدا یک استارتاپ انتخاب کنید." });
      return;
    }
    if (frozen) {
      toast({ tone: "bad", msg: "ثبت خرید جدید مسدود — این استارتاپ فریز شده." });
      return;
    }
    if (!validate()) return;
    setBusy(true);
    try {
      const created = await ProcurementsApi.create({
        startup_id: current.id,
        title: form.title.trim(),
        supplier_name: form.supplier_name.trim(),
        amount_cents: parsePersianNumber(form.amount),
        currency: "IRR",
        category: form.category,
        priority: form.priority,
        description: form.description.trim(),
      });
      toast({ tone: "good", msg: "خرید جدید با موفقیت ثبت شد." });
      navigate(`/procurements/${created.id}`);
    } catch (e) {
      toast({ tone: "bad", msg: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack" style={{ gap: "var(--s-6)", maxWidth: 820 }}>
      <header>
        <button className="btn btn--ghost btn--sm" onClick={() => navigate("/procurements")}>
          <Icon.arrow size={14} /> بازگشت
        </button>
        <div className="eyebrow" style={{ marginTop: 12 }}>
          عملیات · خرید
        </div>
        <h1>ثبت درخواست خرید جدید</h1>
        <p className="muted">
          قبل از هر پرداخت، خرید باید از مسیر مصوب عبور کند. اطلاعات شما در حال حاضر مرحله DRAFT را ایجاد می‌کند.
        </p>
      </header>

      <div className="card">
        <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: "var(--s-5)" }}>
          <FormField label="عنوان درخواست" required error={errors.title}>
            <input
              className="input"
              aria-invalid={!!errors.title}
              placeholder="مثال: تمدید زیرساخت ابری Q۲"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
            />
          </FormField>
          <FormField label="نام تأمین‌کننده" required error={errors.supplier_name}>
            <input
              className="input"
              aria-invalid={!!errors.supplier_name}
              placeholder="مثال: آراز سرور"
              value={form.supplier_name}
              onChange={(e) => set("supplier_name", e.target.value)}
            />
          </FormField>
          <FormField label="مبلغ (ریال)" required error={errors.amount}>
            <input
              className="input mono"
              aria-invalid={!!errors.amount}
              placeholder="38,400,000,000"
              value={form.amount}
              onChange={(e) => set("amount", e.target.value)}
              dir="ltr"
            />
            {form.amount && !errors.amount && (
              <div className="field-hint">
                ≈ {formatIRR(parsePersianNumber(form.amount))}
              </div>
            )}
          </FormField>
          <FormField label="دسته بودجه" required error={errors.category}>
            <select
              className="select"
              value={form.category}
              onChange={(e) => set("category", e.target.value)}
              aria-invalid={!!errors.category}
            >
              <option value="">— انتخاب کنید —</option>
              <option value="INFRASTRUCTURE">زیرساخت</option>
              <option value="INVENTORY">موجودی</option>
              <option value="SERVICE">خدمات</option>
              <option value="EQUIPMENT">تجهیزات</option>
              <option value="HR">نیروی انسانی</option>
            </select>
          </FormField>
          <FormField label="اولویت">
            <div className="seg">
              {([
                ["LOW", "کم"],
                ["MEDIUM", "متوسط"],
                ["HIGH", "زیاد"],
              ] as const).map(([k, l]) => (
                <button
                  key={k}
                  className={form.priority === k ? "active" : ""}
                  onClick={() => set("priority", k)}
                >
                  {l}
                </button>
              ))}
            </div>
          </FormField>
          <div />
          <FormField
            label="توضیح عملیاتی"
            required
            error={errors.description}
            style={{ gridColumn: "1 / -1" }}
          >
            <textarea
              className="textarea"
              aria-invalid={!!errors.description}
              placeholder="چرا این خرید لازم است و چه نتیجه‌ای دارد؟"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </FormField>
        </div>

        <div className="divider" />
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div className="muted" style={{ fontSize: 13 }}>
            پس از ثبت، درخواست با وضعیت <Chip state="DRAFT" /> ایجاد می‌شود.
          </div>
          <div className="row" style={{ gap: 8 }}>
            <Btn variant="ghost" onClick={() => navigate("/procurements")}>
              انصراف
            </Btn>
            <Btn variant="primary" onClick={submit} disabled={busy || frozen}>
              ثبت درخواست
            </Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

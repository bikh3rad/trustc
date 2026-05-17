import { Doc } from "../../../components/ui/Doc";
import { toFaDigits } from "../../../lib/format";
import { DocSection, DocSignatures } from "./DocPrimitives";

export function TaxComplianceDoc({ scopeLabel }: { scopeLabel: string }) {
  return (
    <Doc>
      <div
        className="row"
        style={{ justifyContent: "space-between", alignItems: "start", marginBottom: 16 }}
      >
        <div>
          <div className="eyebrow" style={{ color: "var(--fg-muted)" }}>
            یادداشت تطبیق مالیاتی · trustC
          </div>
          <h1 style={{ fontSize: 28, fontFamily: "var(--serif-display)" }}>
            تطبیق با سامانه مودیان
          </h1>
          <div className="muted">{scopeLabel} · معماری تفکیک لایه کارگزاری</div>
        </div>
        <div
          style={{
            width: 90,
            height: 90,
            border: "2px solid var(--state-good)",
            outline: "2px solid var(--state-good)",
            outlineOffset: 3,
            borderRadius: "50%",
            display: "grid",
            placeItems: "center",
            fontFamily: "var(--mono-data)",
            color: "var(--state-good)",
            fontWeight: 700,
            fontSize: 12,
            transform: "rotate(-4deg)",
          }}
        >
          <div style={{ textAlign: "center", lineHeight: 1.2 }}>
            COMPLIANT
            <br />
            <span style={{ fontSize: 10 }}>۱۴۰۵/۰۴</span>
          </div>
        </div>
      </div>

      <dl className="doc-meta">
        <div>
          <dt>کد ملی شرکت</dt>
          <dd className="mono">{toFaDigits("۱۴۰۰۸۱۲۳۴۵۶")}</dd>
        </div>
        <div>
          <dt>کد اقتصادی</dt>
          <dd className="mono">{toFaDigits("۴۱۲۳۴۵۶۷۸")}</dd>
        </div>
        <div>
          <dt>نوع گزارش</dt>
          <dd>سه‌ماهه</dd>
        </div>
        <div>
          <dt>تاریخ</dt>
          <dd>{toFaDigits("۱۴۰۵/۰۴/۰۱")}</dd>
        </div>
      </dl>

      <DocSection title="۱. تفکیک لایه کارگزاری">
        <p style={{ lineHeight: 1.9, fontSize: 14 }}>
          مطابق با مفاد قانون مالیات‌های مستقیم و آیین‌نامه‌های اجرایی سامانه مودیان، حساب‌های امانی پلتفرم
          trustC تحت سرفصل <b> «وجوه امانی مأخوذه»</b> (کد ۲۱۰۳) دسته‌بندی می‌شوند. این بدان معناست که:
        </p>
        <ul style={{ lineHeight: 2, fontSize: 14, paddingInlineStart: 20 }}>
          <li>تراکنش‌های ورودی به اسکرو در درآمد لایه کارگزار (پلتفرم) نمی‌نشینند.</li>
          <li>تکلیف صدور فاکتور رسمی و ثبت در سامانه مودیان همچنان بر عهده شرکت فروشنده (استارتاپ) باقی است.</li>
          <li>سرفصل ۲۱۰۳ از سرفصل‌های درآمد عملیاتی (۴۰۰۱–۴۱۰۱) به‌طور کامل تفکیک حسابی شده است.</li>
        </ul>
      </DocSection>

      <DocSection title="۲. خلاصه گردش وجوه امانی">
        <table
          className="table"
          style={{ background: "transparent", border: "1px solid var(--ink-200)" }}
        >
          <thead>
            <tr>
              <th>دوره</th>
              <th className="num">ورودی (ریال)</th>
              <th className="num">خروجی (ریال)</th>
              <th className="num">مانده پایان دوره</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>فروردین ۱۴۰۵</td>
              <td className="num">۱۸۲٬۴۰۰٬۰۰۰٬۰۰۰</td>
              <td className="num">۱۶۸٬۲۰۰٬۰۰۰٬۰۰۰</td>
              <td className="num">۳۲۲٬۲۰۰٬۰۰۰٬۰۰۰</td>
            </tr>
            <tr>
              <td>اردیبهشت ۱۴۰۵</td>
              <td className="num">۲۴۵٬۸۰۰٬۰۰۰٬۰۰۰</td>
              <td className="num">۲۱۲٬۰۰۰٬۰۰۰٬۰۰۰</td>
              <td className="num">۳۵۶٬۰۰۰٬۰۰۰٬۰۰۰</td>
            </tr>
            <tr>
              <td>خرداد ۱۴۰۵</td>
              <td className="num">۲۸۸٬۹۰۰٬۰۰۰٬۰۰۰</td>
              <td className="num">۲۵۸٬۴۰۰٬۰۰۰٬۰۰۰</td>
              <td className="num">۳۸۶٬۵۰۰٬۰۰۰٬۰۰۰</td>
            </tr>
          </tbody>
        </table>
      </DocSection>

      <DocSection title="۳. تأیید حسابرس">
        <p style={{ lineHeight: 1.9, fontSize: 14 }}>
          بر اساس بررسی دفاتر و مستندات ارائه‌شده، ساختار حسابداری trustC با اصول تفکیک کارگزاری مطابقت کامل
          دارد و هیچ بازنمایی نادرستی از درآمد در لایه پلتفرم مشاهده نمی‌شود. ردپای حسابرسی (Audit Trail) به‌صورت
          append-only با امضای SHA-256 برای هر گذار حالت موجود است.
        </p>
      </DocSection>

      <DocSignatures />
    </Doc>
  );
}

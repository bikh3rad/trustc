import { useState } from "react";
import { Btn } from "../../components/ui/Btn";
import { Icon } from "../../components/ui/Icon";
import { useCurrentStartup } from "../../context/CurrentStartupContext";
import { useToast } from "../../context/ToastContext";
import { BalanceSheetDoc } from "./docs/BalanceSheet";
import { EscrowReportDoc } from "./docs/EscrowReport";
import { PnLDoc } from "./docs/PnL";
import { TaxComplianceDoc } from "./docs/TaxCompliance";

type Tab = "balance" | "pnl" | "tax" | "escrow";

export function Reports() {
  const { startups } = useCurrentStartup();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("balance");
  // "ALL" or a startup id
  const [scope, setScope] = useState<string>("ALL");

  const scopeLabel =
    scope === "ALL"
      ? "کل پورتفولیو"
      : (startups.find((s) => s.id === scope)?.startup_name ?? "—");

  return (
    <div className="stack" style={{ gap: "var(--s-6)" }}>
      <header
        className="row"
        style={{ justifyContent: "space-between", alignItems: "end" }}
      >
        <div>
          <div className="eyebrow">حسابرسی · گزارش‌ها</div>
          <h1>گزارش‌های مالی</h1>
          <p className="muted" style={{ marginTop: 4 }}>
            گزارش‌های آماده برای ارائه به ممیز مالیاتی یا هیئت‌مدیره. مقادیر بر اساس داده‌های زنده دفتر کل
            (در فاز ۱: نمایشی).
          </p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <select
            className="select"
            style={{ width: 220 }}
            value={scope}
            onChange={(e) => setScope(e.target.value)}
          >
            <option value="ALL">کل پورتفولیو</option>
            {startups.map((s) => (
              <option key={s.id} value={s.id}>
                {s.startup_name}
              </option>
            ))}
          </select>
          <Btn
            variant="secondary"
            icon={<Icon.download />}
            onClick={() =>
              toast({ tone: "warn", msg: "دانلود PDF در فاز بعد فعال می‌شود." })
            }
          >
            دانلود PDF
          </Btn>
          <Btn
            variant="primary"
            icon={<Icon.stamp />}
            onClick={() =>
              toast({
                tone: "warn",
                msg: "امضای حسابرس نیازمند سرویس accounting است که هنوز پیاده‌سازی نشده.",
              })
            }
          >
            امضای حسابرس
          </Btn>
        </div>
      </header>

      <div className="seg">
        <button className={tab === "balance" ? "active" : ""} onClick={() => setTab("balance")}>
          ترازنامه
        </button>
        <button className={tab === "pnl" ? "active" : ""} onClick={() => setTab("pnl")}>
          صورت سود و زیان
        </button>
        <button className={tab === "tax" ? "active" : ""} onClick={() => setTab("tax")}>
          اظهارنامه سامانه مودیان
        </button>
        <button className={tab === "escrow" ? "active" : ""} onClick={() => setTab("escrow")}>
          گزارش وجوه امانی
        </button>
      </div>

      {tab === "balance" && <BalanceSheetDoc scopeLabel={scopeLabel} />}
      {tab === "pnl" && <PnLDoc scopeLabel={scopeLabel} />}
      {tab === "tax" && <TaxComplianceDoc scopeLabel={scopeLabel} />}
      {tab === "escrow" && (
        <EscrowReportDoc
          scopeLabel={scopeLabel}
          startupId={scope === "ALL" ? null : scope}
        />
      )}
    </div>
  );
}

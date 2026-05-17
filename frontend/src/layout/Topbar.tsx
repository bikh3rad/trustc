import { useNavigate } from "react-router-dom";
import { PERSONA_HOME, usePersona, type Persona } from "../context/PersonaContext";
import { useCurrentStartup } from "../context/CurrentStartupContext";
import { useFrozen } from "../context/FrozenContext";

const PERSONA_LABEL: Record<Persona, { label: string; role: string; company: string }> = {
  FOUNDER: { label: "بنیان‌گذار", role: "FOUNDER", company: "شرکت فعال" },
  VC: { label: "سرمایه‌گذار", role: "VC ADMIN", company: "صندوق trustC" },
  AUDITOR: { label: "ممیز", role: "AUDITOR", company: "مرکز حسابرسی" },
};

export function Topbar() {
  const { persona, setPersona } = usePersona();
  const { current } = useCurrentStartup();
  const { isFrozen } = useFrozen();
  const navigate = useNavigate();
  const label = PERSONA_LABEL[persona];
  const frozen = persona === "FOUNDER" && current ? isFrozen(current.id) : false;

  function switchPersona(p: Persona) {
    setPersona(p);
    navigate(PERSONA_HOME[p]);
  }

  const company = persona === "FOUNDER" && current ? current.startup_name : label.company;

  return (
    <header className="app-topbar">
      <div style={{ display: "flex", alignItems: "center", gap: "var(--s-4)" }}>
        <div className="row" style={{ gap: 6 }}>
          <span className="eyebrow">پنل</span>
          <span style={{ fontWeight: 600 }}>{label.label}</span>
          <span className="faint mono" style={{ fontSize: 11 }}>· {company}</span>
        </div>
        {frozen && current && (
          <span className="chip" data-tone="bad" title="استارتاپ توسط VC فریز شده">
            <span className="mono">FROZEN</span>
            <span className="fa">· {current.startup_name}</span>
          </span>
        )}
      </div>

      <div className="row" style={{ gap: "var(--s-3)" }}>
        <div className="seg">
          <button
            className={persona === "FOUNDER" ? "active" : ""}
            onClick={() => switchPersona("FOUNDER")}
          >
            بنیان‌گذار
          </button>
          <button
            className={persona === "VC" ? "active" : ""}
            onClick={() => switchPersona("VC")}
          >
            سرمایه‌گذار
          </button>
          <button
            className={persona === "AUDITOR" ? "active" : ""}
            onClick={() => switchPersona("AUDITOR")}
          >
            ممیز
          </button>
        </div>
        <div className="persona-pill">
          <span className="dot" />
          <span>{label.label}</span>
          <span className="role-label">{label.role}</span>
        </div>
      </div>
    </header>
  );
}

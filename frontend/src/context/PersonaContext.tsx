import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Persona = "FOUNDER" | "VC" | "AUDITOR";

const STORAGE_KEY = "trustc.persona";

type PersonaCtx = {
  persona: Persona;
  setPersona: (p: Persona) => void;
};

const Ctx = createContext<PersonaCtx | null>(null);

export function PersonaProvider({ children }: { children: ReactNode }) {
  const [persona, setPersonaState] = useState<Persona>(() => {
    const v = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    return v === "VC" || v === "AUDITOR" ? v : "FOUNDER";
  });
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, persona);
    } catch {
      /* storage disabled */
    }
  }, [persona]);
  return <Ctx.Provider value={{ persona, setPersona: setPersonaState }}>{children}</Ctx.Provider>;
}

export function usePersona(): PersonaCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("usePersona must be used inside PersonaProvider");
  return v;
}

export const PERSONA_HOME: Record<Persona, string> = {
  FOUNDER: "/dashboard",
  VC: "/vc/portfolio",
  AUDITOR: "/auditor/audit",
};

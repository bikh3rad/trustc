// PersonaContext drives WHICH UI to render — not WHO the user is.
//
// In v2 with real auth, this is a thin admin-only impersonation layer:
//   - For non-admin users the persona is always pinned to the JWT role.
//     The seg switcher in the topbar is hidden, so they can't change it.
//   - For admin users the switcher lets them browse any role's screens for
//     debugging. The JWT role stays ADMIN regardless — the gateway and the
//     admin service trust the JWT, never PersonaContext.
//
// The legacy localStorage["trustc.persona"] is kept only as the admin's last
// chosen view across reloads. We reset persona to "ADMIN" when an admin
// session first mounts, so they always land on the admin console.
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "./AuthContext";
import type { Role } from "../api";

export type Persona = Role; // ADMIN | FOUNDER | VC | AUDITOR

const STORAGE_KEY = "trustc.persona";

type PersonaCtx = {
  persona: Persona;
  setPersona: (p: Persona) => void;
};

const Ctx = createContext<PersonaCtx | null>(null);

const VALID: ReadonlySet<Persona> = new Set<Persona>([
  "ADMIN",
  "FOUNDER",
  "VC",
  "AUDITOR",
]);

export function PersonaProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const role = user?.role ?? "FOUNDER";

  // For admins we honor any previously stored persona (so /admin/users stays
  // selected on reload); for everyone else persona === role, always.
  const [persona, setPersonaState] = useState<Persona>(() => {
    if (role !== "ADMIN") return role;
    const v = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    return v && VALID.has(v as Persona) ? (v as Persona) : "ADMIN";
  });

  // Whenever the user changes (login, switch account), pin persona to role.
  // We deliberately do NOT honor stored persona for non-admins — they can't
  // see other roles' screens (route guards would just bounce them anyway).
  useEffect(() => {
    if (role !== "ADMIN" && persona !== role) {
      setPersonaState(role);
    }
  }, [role, persona]);

  // Persist admin's chosen view; non-admins don't write.
  useEffect(() => {
    if (role !== "ADMIN") return;
    try {
      localStorage.setItem(STORAGE_KEY, persona);
    } catch {
      /* storage disabled */
    }
  }, [persona, role]);

  function setPersona(p: Persona) {
    // Hard guard: non-admins cannot change persona. Even if some component
    // tried, it'd be a no-op.
    if (role !== "ADMIN") return;
    if (!VALID.has(p)) return;
    setPersonaState(p);
  }

  return (
    <Ctx.Provider value={{ persona, setPersona }}>{children}</Ctx.Provider>
  );
}

export function usePersona(): PersonaCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("usePersona must be used inside PersonaProvider");
  return v;
}

// PERSONA_HOME is kept here for backwards compatibility with old call sites.
// New code should import ROLE_HOME from routes/RoleGuard instead.
export const PERSONA_HOME: Record<Persona, string> = {
  ADMIN: "/admin",
  FOUNDER: "/dashboard",
  VC: "/vc/portfolio",
  AUDITOR: "/auditor/audit",
};

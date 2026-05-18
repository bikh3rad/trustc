import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Startups, type Startup } from "../api";
import { useAuth } from "./AuthContext";

const STORAGE_KEY = "trustc.currentStartup";

type CurrentStartupCtx = {
  startups: Startup[];
  currentId: string | null;
  setCurrentId: (id: string) => void;
  current: Startup | null;
  loading: boolean;
  canSwitch: boolean;
  refresh: () => Promise<void>;
};

const Ctx = createContext<CurrentStartupCtx | null>(null);

export function CurrentStartupProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [startups, setStartups] = useState<Startup[]>([]);
  const [currentId, setCurrentIdState] = useState<string | null>(() => {
    return typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
  });
  const [loading, setLoading] = useState(true);

  // Admin is the only role allowed to switch companies — everyone else
  // is pinned to whatever startup their JWT carries (or the first one if
  // no binding exists). The Sidebar reads canSwitch to decide whether to
  // render the company picker.
  const canSwitch = user?.role === "ADMIN";

  const refresh = async () => {
    setLoading(true);
    try {
      const r = await Startups.list();
      setStartups(r.startups);
      // Founder: pin to their own startup_id when present, regardless of
      // any stale value in localStorage.
      if (user?.role === "FOUNDER" && user.startup_id) {
        if (r.startups.some((s) => s.id === user.startup_id)) {
          setCurrentIdState(user.startup_id);
          return;
        }
      }
      // Admin / VC / Auditor: keep current pick if still valid, else st_001.
      if (!currentId && r.startups.length) {
        setCurrentIdState(r.startups[0].id);
      } else if (currentId && !r.startups.some((s) => s.id === currentId) && r.startups.length) {
        setCurrentIdState(r.startups[0].id);
      }
    } catch {
      // Backend may be down — keep prior state.
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    // re-run when the auth user changes (login / logout / role swap)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (currentId) localStorage.setItem(STORAGE_KEY, currentId);
  }, [currentId]);

  // Hard guard: non-admins cannot change the selected startup. Even if a
  // component tries, the setter is a no-op for them.
  const setCurrentId = (id: string) => {
    if (!canSwitch) return;
    setCurrentIdState(id);
  };

  const current = useMemo(
    () => startups.find((s) => s.id === currentId) ?? null,
    [startups, currentId]
  );

  return (
    <Ctx.Provider
      value={{
        startups,
        currentId,
        setCurrentId,
        current,
        loading,
        canSwitch,
        refresh,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useCurrentStartup(): CurrentStartupCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useCurrentStartup must be used inside CurrentStartupProvider");
  return v;
}

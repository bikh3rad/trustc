import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Startups, type Startup } from "../api";

const STORAGE_KEY = "trustc.currentStartup";

type CurrentStartupCtx = {
  startups: Startup[];
  currentId: string | null;
  setCurrentId: (id: string) => void;
  current: Startup | null;
  loading: boolean;
  refresh: () => Promise<void>;
};

const Ctx = createContext<CurrentStartupCtx | null>(null);

export function CurrentStartupProvider({ children }: { children: ReactNode }) {
  const [startups, setStartups] = useState<Startup[]>([]);
  const [currentId, setCurrentIdState] = useState<string | null>(() => {
    return typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
  });
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    try {
      const r = await Startups.list();
      setStartups(r.startups);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (currentId) localStorage.setItem(STORAGE_KEY, currentId);
  }, [currentId]);

  const current = useMemo(
    () => startups.find((s) => s.id === currentId) ?? null,
    [startups, currentId]
  );

  return (
    <Ctx.Provider
      value={{
        startups,
        currentId,
        setCurrentId: setCurrentIdState,
        current,
        loading,
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

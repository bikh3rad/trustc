import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Governance, type Freeze } from "../api";

const POLL_MS = 6000;

type FrozenCtx = {
  freezes: Freeze[];
  frozenIds: Set<string>;
  byStartup: Map<string, Freeze>;
  isFrozen: (startupId: string | undefined | null) => boolean;
  refresh: () => Promise<void>;
};

const Ctx = createContext<FrozenCtx | null>(null);

export function FrozenProvider({ children }: { children: ReactNode }) {
  const [freezes, setFreezes] = useState<Freeze[]>([]);

  const refresh = useCallback(async () => {
    try {
      const r = await Governance.listActive();
      setFreezes(r.freezes);
    } catch {
      // Governance gateway may be down — leave previous state intact.
    }
  }, []);

  useEffect(() => {
    void refresh();
    const t = window.setInterval(refresh, POLL_MS);
    return () => window.clearInterval(t);
  }, [refresh]);

  const { frozenIds, byStartup } = useMemo(() => {
    const ids = new Set<string>();
    const m = new Map<string, Freeze>();
    for (const f of freezes) {
      ids.add(f.startup_id);
      m.set(f.startup_id, f);
    }
    return { frozenIds: ids, byStartup: m };
  }, [freezes]);

  const isFrozen = useCallback(
    (id: string | undefined | null) => (id ? frozenIds.has(id) : false),
    [frozenIds]
  );

  return (
    <Ctx.Provider value={{ freezes, frozenIds, byStartup, isFrozen, refresh }}>
      {children}
    </Ctx.Provider>
  );
}

export function useFrozen(): FrozenCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useFrozen must be used inside FrozenProvider");
  return v;
}

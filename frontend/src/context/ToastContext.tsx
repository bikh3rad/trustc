import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

export type ToastTone = "neutral" | "good" | "bad" | "warn";
type Toast = { id: number; tone: ToastTone; msg: string };

type ToastCtx = {
  toast: (input: { tone?: ToastTone; msg: string }) => void;
  toasts: Toast[];
};

const Ctx = createContext<ToastCtx | null>(null);

const COLOR: Record<ToastTone, string> = {
  neutral: "var(--navy-900)",
  good: "var(--state-good)",
  bad: "var(--state-bad)",
  warn: "var(--state-warn)",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback(({ tone = "neutral", msg }: { tone?: ToastTone; msg: string }) => {
    const id = Date.now() + Math.random();
    setToasts((list) => [...list, { id, tone, msg }]);
    window.setTimeout(() => {
      setToasts((list) => list.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  return (
    <Ctx.Provider value={{ toast, toasts }}>
      {children}
      <div
        style={{
          position: "fixed",
          bottom: 16,
          insetInlineEnd: 16,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          zIndex: 200,
        }}
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            style={{
              background: COLOR[t.tone],
              color: "#fff",
              padding: "10px 16px",
              borderRadius: 4,
              fontSize: 13,
              boxShadow: "var(--shadow-2)",
              maxWidth: 360,
              animation: "fly 320ms var(--ease-document)",
            }}
          >
            {t.msg}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast(): ToastCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useToast must be used inside ToastProvider");
  return v;
}

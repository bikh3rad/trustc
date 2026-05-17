// AuthGate sits between AuthProvider and the routed app.
//   - loading           → spinner
//   - unauthenticated   → Login or Register (local toggle, no router needed)
//   - authenticated     → children (the real app)
import { useState, type ReactNode } from "react";
import { useAuth } from "../context/AuthContext";
import { Login } from "../modules/auth/Login";
import { Register } from "../modules/auth/Register";

export function AuthGate({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");

  if (status === "loading") {
    return (
      <div className="auth-loading" role="status" aria-live="polite">
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <div className="spinner" />
          <div className="mono" style={{ fontSize: 12 }}>در حال بررسی احراز هویت…</div>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return mode === "register" ? (
      <Register onGoLogin={() => setMode("login")} />
    ) : (
      <Login onGoRegister={() => setMode("register")} />
    );
  }

  return <>{children}</>;
}

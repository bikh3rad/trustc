// AuthContext is the single source of truth for "who is logged in".
//
// On mount we call /v1/auth/me with whatever token is in localStorage. A 401
// means the token is stale/missing → we drop it and surface unauthenticated.
//
// login() and register() return the server response so the screen can show
// field-level errors. logout() clears local state immediately, then best-
// effort hits the server (the token is stateless so server logout is purely
// informational right now).

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  ApiHttpError,
  Auth,
  getToken,
  onUnauthenticated,
  setToken,
  type AuthUser,
  type RegisterInput,
} from "../api";

export type AuthStatus = "loading" | "unauthenticated" | "authenticated";

type AuthCtx = {
  user: AuthUser | null;
  status: AuthStatus;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (input: RegisterInput) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  const clear = useCallback(() => {
    setToken(null);
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  // Wire the 401-from-anywhere hook so a stale token on any API call kicks
  // the user back to login.
  useEffect(() => {
    onUnauthenticated(() => clear());
  }, [clear]);

  const refresh = useCallback(async () => {
    if (!getToken()) {
      setStatus("unauthenticated");
      return;
    }
    try {
      const { user } = await Auth.me();
      setUser(user);
      setStatus("authenticated");
    } catch (err) {
      // 401 already handled by onUnauthenticated; any other error we
      // treat as "logged out" too — we'd rather show the login screen
      // than render the shell against a broken session.
      if (err instanceof ApiHttpError && err.status !== 401) {
        // eslint-disable-next-line no-console
        console.error("auth/me failed", err);
      }
      clear();
    }
  }, [clear]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const { token, user } = await Auth.login(email, password);
    setToken(token);
    setUser(user);
    setStatus("authenticated");
    return user;
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const { user } = await Auth.register(input);
    // Newly registered accounts are PENDING by default — caller decides what
    // to render. We do NOT auto-login here.
    return user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await Auth.logout();
    } catch {
      /* server may be down; local clear is enough */
    }
    clear();
  }, [clear]);

  const value = useMemo<AuthCtx>(
    () => ({ user, status, login, register, logout, refresh }),
    [user, status, login, register, logout, refresh],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside AuthProvider");
  return v;
}

// Convenience hook: the authenticated user, guaranteed non-null inside the
// AuthGate's children. Use it instead of useAuth() in protected screens.
export function useUser(): AuthUser {
  const { user } = useAuth();
  if (!user) throw new Error("useUser called before authentication completed");
  return user;
}

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
  authService,
  type SessionIdentity,
} from "./auth.service";

interface AuthContextValue {
  session: SessionIdentity | null;
  bootstrapping: boolean;
  error: string | null;
  loginWithKeycloak: () => Promise<void>;
  loginWithMockGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionIdentity | null>(null);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (window.location.pathname.startsWith("/callback")) {
          const next = await authService.consumeRedirectCallback();
          if (!cancelled) {
            setSession(next);
            window.history.replaceState({}, document.title, "/");
          }
        } else {
          const next = await authService.getSession();
          if (!cancelled) setSession(next);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            `${err instanceof Error ? err.message : String(err)}. Prefer http://localhost:8088`,
          );
          setSession(null);
          if (window.location.pathname.startsWith("/callback")) {
            window.history.replaceState({}, document.title, "/");
          }
        }
      } finally {
        if (!cancelled) setBootstrapping(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loginWithKeycloak = useCallback(async () => {
    setError(null);
    await authService.loginWithKeycloak();
  }, []);

  const loginWithMockGoogle = useCallback(async () => {
    setError(null);
    try {
      const next = await authService.loginWithMockGoogle();
      setSession(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setSession(null);
  }, []);

  const value = useMemo(
    () => ({
      session,
      bootstrapping,
      error,
      loginWithKeycloak,
      loginWithMockGoogle,
      logout,
      clearError: () => setError(null),
    }),
    [
      session,
      bootstrapping,
      error,
      loginWithKeycloak,
      loginWithMockGoogle,
      logout,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

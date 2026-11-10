import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api, refreshSession, setAccessToken, setSessionExpiredHandler } from "@/lib/api";
import type { AuthResponse, Tenant, User } from "@/types";

type Status = "loading" | "authenticated" | "unauthenticated";

interface SignupInput {
  name: string;
  tenantName: string;
  email: string;
  password: string;
}

interface AuthValue {
  status: Status;
  user: User | null;
  tenant: Tenant | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (input: SignupInput) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<Status>("loading");
  const [user, setUser] = useState<User | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);

  const clear = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    setTenant(null);
    setStatus("unauthenticated");
    queryClient.clear(); // don't leak the previous user's cached data
  }, [queryClient]);

  const apply = useCallback((session: AuthResponse) => {
    setAccessToken(session.accessToken);
    setUser(session.user);
    setTenant(session.tenant);
    setStatus("authenticated");
  }, []);

  // On first load, try to restore the session from the refresh cookie.
  useEffect(() => {
    let active = true;
    setSessionExpiredHandler(clear);

    refreshSession().then((session) => {
      if (!active) return;
      if (session) apply(session);
      else setStatus("unauthenticated");
    });

    return () => {
      active = false;
      setSessionExpiredHandler(null);
    };
  }, [apply, clear]);

  const login = useCallback(
    async (email: string, password: string) => {
      apply(await api<AuthResponse>("/auth/login", { method: "POST", body: { email, password } }));
    },
    [apply]
  );

  const signup = useCallback(
    async (input: SignupInput) => {
      apply(await api<AuthResponse>("/auth/signup", { method: "POST", body: input }));
    },
    [apply]
  );

  const logout = useCallback(async () => {
    try {
      await api("/auth/logout", { method: "POST" });
    } catch {
      // even if the call fails, clear local state
    }
    clear();
  }, [clear]);

  const value = useMemo(
    () => ({ status, user, tenant, login, signup, logout }),
    [status, user, tenant, login, signup, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
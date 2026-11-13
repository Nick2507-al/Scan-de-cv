import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, setUnauthorizedHandler } from "../api/client";
import type { User } from "../api/types";

type AuthState = {
  user: User | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (fullName: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (u: User) => void;
};

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  // La session vit dans un cookie httpOnly : on interroge le serveur au chargement.
  useEffect(() => {
    api<{ user: User }>("/api/auth/me")
      .then((r) => setUser(r.user))
      .catch(() => setUser(null))
      .finally(() => setReady(true));
    setUnauthorizedHandler(() => setUser(null));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const r = await api<{ user: User }>("/api/auth/login", { body: { email, password } });
    setUser(r.user);
  }, []);

  const register = useCallback(async (fullName: string, email: string, password: string) => {
    const r = await api<{ user: User }>("/api/auth/register", { body: { fullName, email, password } });
    setUser(r.user);
  }, []);

  const logout = useCallback(async () => {
    await api("/api/auth/logout", { method: "POST" }).catch(() => {});
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, ready, login, register, logout, setUser }), [user, ready, login, register, logout]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth hors de AuthProvider");
  return ctx;
}

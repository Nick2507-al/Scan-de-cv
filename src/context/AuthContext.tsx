import { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  getStoredToken,
  getStoredUser,
  setStoredAuth,
  clearStoredAuth,
  apiUrl,
} from "../api/config";

type User = { id: number; email: string; fullName?: string; roleName?: string; avatarPath?: string };

type AuthContextType = {
  token: string | null;
  user: User | null;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  register: (email: string, password: string, fullName?: string) => Promise<{ ok: boolean; error?: string }>;
  refreshUser: () => Promise<void>;
  logout: () => void;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const [user, setUser] = useState<User | null>(() => getStoredUser());
  const [loading, setLoading] = useState(false);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { ok: false, error: data.error || "Identifiants incorrects" };
      }
      setStoredAuth(data.token, data.user);
      setToken(data.token);
      setUser(data.user);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: "Erreur de connexion" };
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (email: string, password: string, fullName?: string) => {
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/auth/register"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, fullName }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { ok: false, error: data.error || "Erreur lors de l'inscription" };
      }
      setStoredAuth(data.token, data.user);
      setToken(data.token);
      setUser(data.user);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: "Erreur de connexion" };
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const t = getStoredToken();
    if (!t) return;
    try {
      const res = await fetch(apiUrl("/api/users/me"), {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      const u = { id: data.id, email: data.email, fullName: data.fullName, roleName: data.roleName, avatarPath: data.avatarPath };
      setStoredAuth(t, u);
      setUser(u);
    } catch (_) {}
  }, []);

  const logout = useCallback(() => {
    clearStoredAuth();
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ token, user, login, register, refreshUser, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

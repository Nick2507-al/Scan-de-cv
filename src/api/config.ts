export const API_BASE =
  typeof import.meta.env !== "undefined" && import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL
    : "http://localhost:3000";

const AUTH_TOKEN_KEY = "genesis_token";
const AUTH_USER_KEY = "genesis_user";

export function apiUrl(path: string): string {
  const base = API_BASE.replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

export function getStoredToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setStoredAuth(token: string, user: { id: number; email: string; fullName?: string; roleName?: string; avatarPath?: string }): void {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

export function clearStoredAuth(): void {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
}

export function getStoredUser(): { id: number; email: string; fullName?: string; roleName?: string; avatarPath?: string } | null {
  try {
    const s = localStorage.getItem(AUTH_USER_KEY);
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
}

export function authHeaders(): HeadersInit {
  const token = getStoredToken();
  const h: HeadersInit = { "Content-Type": "application/json" };
  if (token) (h as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  return h;
}

export async function fetchApi(path: string, options: RequestInit = {}): Promise<Response> {
  const url = apiUrl(path);
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (!headers.has("Authorization")) {
    const t = getStoredToken();
    if (t) headers.set("Authorization", `Bearer ${t}`);
  }
  return fetch(url, { ...options, headers });
}

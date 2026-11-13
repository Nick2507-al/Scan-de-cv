// Client HTTP unique : session par cookie httpOnly (même origine via le proxy Vite) + en-tête anti-CSRF.

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

type Options = { method?: string; body?: unknown; form?: FormData; signal?: AbortSignal };

let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn;
}

export async function api<T = unknown>(path: string, opts: Options = {}): Promise<T> {
  const headers: Record<string, string> = { "X-Requested-With": "genesis" };
  let body: BodyInit | undefined;
  if (opts.form) body = opts.form;
  else if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.body);
  }
  let res: Response;
  try {
    res = await fetch(path, { method: opts.method ?? (body ? "POST" : "GET"), headers, body, credentials: "same-origin", signal: opts.signal });
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    throw new ApiError(0, "Serveur injoignable. Vérifiez que l'application est démarrée.");
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && !path.startsWith("/api/auth/")) onUnauthorized?.();
    throw new ApiError(res.status, (data as { error?: string }).error || `Erreur ${res.status}`);
  }
  return data as T;
}

/** Téléchargement d'un fichier protégé (CV, export) en conservant le nom proposé par le serveur. */
export async function download(path: string, fallbackName: string) {
  const res = await fetch(path, { credentials: "same-origin" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(res.status, (data as { error?: string }).error || "Téléchargement impossible");
  }
  const blob = await res.blob();
  const cd = res.headers.get("Content-Disposition") || "";
  const m = /filename\*=UTF-8''([^;]+)|filename="([^"]+)"/i.exec(cd);
  const name = m ? decodeURIComponent(m[1] || m[2]) : fallbackName;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Erreur inattendue");

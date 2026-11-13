import { useCallback, useEffect, useState } from "react";
import { api, errMsg } from "../api/client";

/** Chargement d'une ressource GET avec état (données, erreur, rechargement). Annule la requête obsolète. */
export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(Boolean(path));
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!path) return;
    const ctrl = new AbortController();
    setLoading(true);
    setError("");
    api<T>(path, { signal: ctrl.signal })
      .then(setData)
      .catch((e) => { if (e.name !== "AbortError") setError(errMsg(e)); })
      .finally(() => { if (!ctrl.signal.aborted) setLoading(false); });
    return () => ctrl.abort();
  }, [path, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, error, loading, reload, setData };
}

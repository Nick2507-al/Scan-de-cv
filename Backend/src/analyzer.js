import { config } from "./config.js";

const KEY = process.env.ANALYZER_KEY || "";

/** Appel au moteur d'analyse Python (service local, protégé par une clé partagée). */
export async function analyzeFile({ buffer, filename, mime, criteria }) {
  const form = new FormData();
  form.append("file", new Blob([buffer], { type: mime }), filename);
  form.append("criteria", JSON.stringify(criteria));
  const res = await fetch(`${config.analyzerUrl}/v1/analyze`, {
    method: "POST",
    body: form,
    headers: KEY ? { "X-Analyzer-Key": KEY } : {},
    signal: AbortSignal.timeout(config.analyzerTimeoutMs),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Moteur d'analyse : HTTP ${res.status}`);
    err.userFacing = Boolean(data.error) && res.status < 500;
    throw err;
  }
  return data;
}

export async function analyzerHealth() {
  try {
    const res = await fetch(`${config.analyzerUrl}/health`, { signal: AbortSignal.timeout(3000) });
    return res.ok ? await res.json() : { ok: false };
  } catch {
    return { ok: false };
  }
}

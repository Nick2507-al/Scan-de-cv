/**
 * Envoie les logs du navigateur (console.log, error, warn) au backend
 * pour enregistrement dans genesis-logs.txt
 */
import { apiUrl } from "../api/config";

const LOG_API = apiUrl("/api/log");
const FLUSH_INTERVAL_MS = 3000;
const MAX_BUFFER = 20;

type LogEntry = { level: string; args: unknown[] };

const buffer: LogEntry[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function serialize(args: unknown[]): string {
  return args
    .map((a) => {
      if (typeof a === "string") return a;
      try {
        return JSON.stringify(a);
      } catch {
        return String(a);
      }
    })
    .join(" ");
}

function flush() {
  if (buffer.length === 0) return;
  const toSend = buffer.splice(0, buffer.length);
  const messages = toSend.map((e) => `[${e.level}] ${serialize(e.args)}`);
  fetch(LOG_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ level: "client", messages }),
  }).catch(() => {});
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = null;
}

function push(level: string, args: unknown[]) {
  buffer.push({ level, args });
  if (buffer.length >= MAX_BUFFER) flush();
  else if (!flushTimer) flushTimer = setTimeout(flush, FLUSH_INTERVAL_MS);
}

export function initBrowserLogger() {
  const origLog = console.log;
  const origError = console.error;
  const origWarn = console.warn;

  console.log = (...args: unknown[]) => {
    push("log", args);
    origLog.apply(console, args);
  };
  console.error = (...args: unknown[]) => {
    push("error", args);
    origError.apply(console, args);
  };
  console.warn = (...args: unknown[]) => {
    push("warn", args);
    origWarn.apply(console, args);
  };

  window.addEventListener("error", (e) => push("error", [e.message, e.filename, e.lineno]));
  window.addEventListener("unhandledrejection", (e) => push("error", ["Unhandled rejection", String(e.reason)]));
}

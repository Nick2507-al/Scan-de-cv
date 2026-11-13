import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const BACKEND_DIR = join(dirname(fileURLToPath(import.meta.url)), "..");

// Chargement minimal de Backend/.env (sans écraser l'environnement réel).
function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m || process.env[m[1]] !== undefined) continue;
    process.env[m[1]] = m[2].replace(/^(["'])(.*)\1$/, "$2");
  }
}
loadEnvFile(join(BACKEND_DIR, ".env"));

const env = process.env;
const isTest = env.NODE_ENV === "test";
const isProd = env.NODE_ENV === "production";

function required(name, fallbackForDev) {
  const v = env[name];
  if (v) return v;
  if (!isProd && fallbackForDev !== undefined) return fallbackForDev;
  throw new Error(`Variable d'environnement manquante : ${name}`);
}

const jwtSecret = required("JWT_SECRET", isTest ? "test-secret-test-secret-test-secret-0123" : undefined);
if (jwtSecret.length < 32) throw new Error("JWT_SECRET doit contenir au moins 32 caractères");

export const config = {
  isProd,
  isTest,
  port: Number(env.PORT || 3000),
  corsOrigin: (env.CORS_ORIGIN || "http://localhost:5173").split(",").map((s) => s.trim()),
  databaseUrl: required("DATABASE_URL"),
  jwtSecret,
  jwtExpires: env.JWT_EXPIRES || "8h",
  cookieName: "genesis_session",
  analyzerUrl: env.ANALYZER_URL || "http://127.0.0.1:5001",
  analyzerTimeoutMs: Number(env.ANALYZER_TIMEOUT_MS || 180000),
  uploadDir: env.UPLOAD_DIR || join(BACKEND_DIR, "uploads"),
  maxFileBytes: Number(env.MAX_FILE_MB || 15) * 1024 * 1024,
  maxFilesPerRun: Number(env.MAX_FILES_PER_RUN || 25),
  defaultAccount: {
    email: env.DEFAULT_ACCOUNT_EMAIL || "",
    password: env.DEFAULT_ACCOUNT_PASSWORD || "",
    fullName: env.DEFAULT_ACCOUNT_NAME || "Administrateur Genesis",
  },
  loginMaxFailures: 5,
  loginLockMinutes: 15,
  trustProxy: env.TRUST_PROXY === "1",
};

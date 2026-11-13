// Environnement de test : base dédiée, moteur d'analyse simulé, limites de débit relevées.
import http from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const here = dirname(fileURLToPath(import.meta.url));
process.env.NODE_ENV = "test";
// La base de test est dérivée de DATABASE_URL (Backend/.env) en remplaçant le nom de base par genesis_test.
if (!process.env.DATABASE_URL_TEST) {
  const envFile = join(here, "..", ".env");
  const line = existsSync(envFile) && readFileSync(envFile, "utf8").split(/\r?\n/).find((l) => l.startsWith("DATABASE_URL="));
  if (!line) throw new Error("DATABASE_URL introuvable dans Backend/.env");
  const url = new URL(line.slice("DATABASE_URL=".length).trim());
  url.pathname = "/genesis_test";
  process.env.DATABASE_URL_TEST = url.toString();
}
process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
process.env.JWT_SECRET = "test-secret-test-secret-test-secret-0123456789";
process.env.UPLOAD_DIR = join(tmpdir(), `genesis-test-uploads-${process.pid}`);
process.env.ANALYZER_KEY = "test-analyzer-key";
process.env.DEFAULT_ACCOUNT_EMAIL = "default@genesis.test";
process.env.DEFAULT_ACCOUNT_PASSWORD = "DefaultPass123";

// Faux moteur d'analyse : renvoie un résultat déterministe dépendant du nom de fichier.
export const fakeAnalyzer = http.createServer((req, res) => {
  if (req.url === "/health") return res.end(JSON.stringify({ ok: true }));
  if (req.headers["x-analyzer-key"] !== "test-analyzer-key") { res.statusCode = 401; return res.end("{}"); }
  const chunks = [];
  req.on("data", (c) => chunks.push(c));
  req.on("end", () => {
    const body = Buffer.concat(chunks).toString("latin1");
    const name = /filename="([^"]+)"/.exec(body)?.[1] || "cv";
    res.setHeader("Content-Type", "application/json");
    if (name.includes("fail")) { res.statusCode = 422; return res.end(JSON.stringify({ error: "PDF protégé par mot de passe" })); }
    const good = !name.includes("weak");
    res.end(JSON.stringify({
      engine: "fake",
      candidate: {
        fullName: good ? "Aminata Diallo" : "Jean Faible", email: good ? "aminata@example.com" : "", phone: "+242 06 612 3456",
        skills: [{ name: "React", category: "Web" }, { name: "=cmd|' /C calc'!A0", category: "Autre" }],
        experienceYears: good ? 6 : 0, educationLevel: 5, languages: [{ name: "Français", level: "Natif" }],
      },
      evaluation: { score: good ? 88 : 22, retained: good, breakdown: {}, improvementNotes: good ? [] : ["Ajoutez un email"] },
      warnings: [], textExcerpt: "texte",
    }));
  });
});

let started;
export async function setup() {
  if (started) return started;
  started = (async () => {
    await new Promise((r) => fakeAnalyzer.listen(0, "127.0.0.1", r));
    process.env.ANALYZER_URL = `http://127.0.0.1:${fakeAnalyzer.address().port}`;
    await ensureTestDatabase();
    const { pool } = await import("../src/db.js");
    await pool.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
    const { migrate } = await import("../src/migrate.js");
    await migrate({ log: () => {} });
    const { ensureDefaultAccount } = await import("../src/maintenance.js");
    await ensureDefaultAccount(() => {});
    const { createApp } = await import("../src/app.js");
    return { app: createApp(), pool };
  })();
  return started;
}

async function ensureTestDatabase() {
  const pg = (await import("pg")).default;
  const admin = new URL(process.env.DATABASE_URL_TEST);
  const dbName = admin.pathname.slice(1);
  admin.pathname = "/postgres";
  const client = new pg.Client({ connectionString: admin.toString() });
  await client.connect();
  const exists = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [dbName]);
  if (!exists.rowCount) await client.query(`CREATE DATABASE "${dbName.replace(/"/g, "")}"`);
  await client.end();
}

export async function teardown() {
  const { pool } = await import("../src/db.js");
  await pool.end();
  fakeAnalyzer.close();
}

/** Agent connecté (cookie de session conservé) + en-tête anti-CSRF. */
export async function registerAgent(request, app, email, password = "MotDePasse123") {
  const agent = request.agent(app);
  const res = await agent.post("/api/auth/register").set("X-Requested-With", "genesis")
    .send({ email, password, fullName: "Test " + email.split("@")[0] });
  if (res.status !== 201) throw new Error(`inscription ${email} : ${res.status} ${JSON.stringify(res.body)}`);
  return agent;
}

export const X = { "X-Requested-With": "genesis" };
export const pdfBuffer = (extra = "") => Buffer.from(`%PDF-1.4\n1 0 obj<<>>endobj\n${extra}\n%%EOF`);

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { BACKEND_DIR } from "./config.js";
import { pool } from "./db.js";

const MIGRATIONS_DIR = join(BACKEND_DIR, "migrations");

/** Applique, dans l'ordre et une seule fois, les fichiers migrations/NNN_*.sql. */
export async function migrate({ log = console.log } = {}) {
  const client = await pool.connect();
  try {
    // Verrou consultatif : deux instances qui démarrent ensemble ne migrent pas en double.
    await client.query("SELECT pg_advisory_lock(726354)");
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
    const { rows } = await client.query("SELECT version FROM schema_migrations");
    const done = new Set(rows.map((r) => r.version));
    const files = readdirSync(MIGRATIONS_DIR).filter((f) => /^\d+_.+\.sql$/.test(f)).sort();
    for (const file of files) {
      if (done.has(file)) continue;
      const sql = readFileSync(join(MIGRATIONS_DIR, file), "utf8");
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query("INSERT INTO schema_migrations (version) VALUES ($1)", [file]);
        await client.query("COMMIT");
        log(`[migrate] appliquée : ${file}`);
      } catch (err) {
        await client.query("ROLLBACK");
        throw new Error(`Migration ${file} échouée : ${err.message}`);
      }
    }
  } finally {
    await client.query("SELECT pg_advisory_unlock(726354)").catch(() => {});
    client.release();
  }
}

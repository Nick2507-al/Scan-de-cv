import { readdir, stat, unlink } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import { config } from "./config.js";
import { one, query } from "./db.js";
import { hashPassword } from "./auth.js";
import { removeStored } from "./storage.js";

/** Crée (une seule fois) le compte par défaut défini dans Backend/.env. Ne réécrit jamais un mot de passe existant. */
export async function ensureDefaultAccount(log = console.log) {
  const { email, password, fullName } = config.defaultAccount;
  if (!email || !password) return;
  const exists = await one("SELECT id FROM users WHERE lower(email) = lower($1)", [email]);
  if (exists) return;
  const u = await one(
    "INSERT INTO users (email, password_hash, full_name) VALUES (lower($1), $2, $3) RETURNING id",
    [email, await hashPassword(password), fullName]
  );
  await query("INSERT INTO user_settings (user_id) VALUES ($1) ON CONFLICT DO NOTHING", [u.id]);
  log(`[init] compte par défaut créé : ${email}`);
}

/**
 * Conservation RGPD : supprime les candidats sans activité depuis plus longtemps que la durée
 * choisie par chaque compte (24 mois par défaut, recommandation CNIL), puis leurs fichiers.
 */
export async function purgeExpiredCandidates(log = console.log) {
  const { rows } = await query(
    `DELETE FROM candidates c USING users u LEFT JOIN user_settings s ON s.user_id = u.id
     WHERE c.owner_id = u.id AND c.updated_at < now() - make_interval(months => COALESCE(s.retention_months, 24))
     RETURNING c.cv_path`
  );
  for (const r of rows) await removeStored(r.cv_path);
  await query("DELETE FROM audit_log WHERE created_at < now() - interval '3 years'");
  if (rows.length) log(`[rgpd] ${rows.length} candidat(s) expiré(s) supprimé(s)`);
  return rows.length;
}

/** Supprime les fichiers orphelins (upload interrompu, ligne supprimée…) de plus de 24 h. */
export async function cleanOrphanFiles(log = console.log) {
  const root = config.uploadDir;
  const known = new Set();
  const { rows } = await query(
    "SELECT cv_path AS p FROM candidates WHERE cv_path IS NOT NULL UNION SELECT avatar_path FROM users WHERE avatar_path IS NOT NULL"
  );
  rows.forEach((r) => known.add(r.p));
  let removed = 0;
  async function walk(dir) {
    let entries;
    try { entries = await readdir(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const abs = join(dir, e.name);
      if (e.isDirectory()) { await walk(abs); continue; }
      const rel = relative(root, abs).split(sep).join("/");
      if (known.has(rel)) continue;
      const s = await stat(abs);
      if (Date.now() - s.mtimeMs > 24 * 3600 * 1000) { await unlink(abs).catch(() => {}); removed++; }
    }
  }
  await walk(root);
  if (removed) log(`[maintenance] ${removed} fichier(s) orphelin(s) supprimé(s)`);
  return removed;
}

export function scheduleMaintenance() {
  const run = async () => {
    try {
      await purgeExpiredCandidates();
      await cleanOrphanFiles();
    } catch (err) {
      console.error("[maintenance] échec :", err.message);
    }
  };
  run();
  const timer = setInterval(run, 6 * 3600 * 1000);
  timer.unref();
  return timer;
}

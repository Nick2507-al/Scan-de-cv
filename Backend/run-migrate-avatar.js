/**
 * Migration : ajoute la colonne AVATAR_PATH à USERS si elle n'existe pas.
 * Usage: node Backend/run-migrate-avatar.js
 */
import { readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import oracledb from "oracledb";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, ".env");
if (existsSync(envPath)) {
  const env = readFileSync(envPath, "utf8");
  for (const line of env.split(/\r?\n/)) {
    const m = line.match(/^\s*([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  }
}

if (process.env.ORACLE_HOME) {
  try {
    oracledb.initOracleClient({ libDir: process.env.ORACLE_HOME });
  } catch (e) {
    console.error("ERREUR Instant Client:", e.message);
    process.exit(1);
  }
}

function getConnectString() {
  if (process.env.ORACLE_CONNECT_STRING) return process.env.ORACLE_CONNECT_STRING;
  const host = process.env.ORACLE_HOST || "localhost";
  const port = process.env.ORACLE_PORT || "1521";
  const sid = process.env.ORACLE_SID || "XE";
  return `${host}:${port}/${sid}`;
}

(async () => {
  let conn;
  try {
    conn = await oracledb.getConnection({
      user: process.env.ORACLE_USER || "GENESIS",
      password: process.env.ORACLE_PASSWORD || "orcl",
      connectString: getConnectString(),
    });
    await conn.execute(`ALTER TABLE USERS ADD AVATAR_PATH VARCHAR2(500)`);
    console.log("Migration OK : colonne AVATAR_PATH ajoutée à USERS.");
  } catch (e) {
    if (e.message && (e.message.includes("ORA-01430") || e.message.includes("column already exists"))) {
      console.log("AVATAR_PATH existe déjà, rien à faire.");
    } else {
      console.error("Erreur migration:", e.message);
      process.exit(1);
    }
  } finally {
    if (conn) try { await conn.close(); } catch (_) {}
  }
})();

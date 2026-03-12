/**
 * 1. Teste la connexion à Oracle (mode Thick avec Instant Client pour Oracle 11g).
 * 2. Si la connexion est établie, exécute schema-oracle.sql.
 *
 * Usage: node run-schema.js
 * Config: Backend/.env avec ORACLE_HOME (chemin Instant Client), ORACLE_HOST, PORT, SID, USER, PASSWORD
 */
import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import oracledb from "oracledb";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Charger .env si présent (Backend/.env)
const envPath = join(__dirname, ".env");
if (existsSync(envPath)) {
  const env = readFileSync(envPath, "utf8");
  for (const line of env.split(/\r?\n/)) {
    const m = line.match(/^\s*([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  }
}

// Mode Thick (Instant Client) pour Oracle 11g — obligatoire si ORACLE_HOME est défini
if (process.env.ORACLE_HOME) {
  try {
    oracledb.initOracleClient({ libDir: process.env.ORACLE_HOME });
    console.log("Instant Client activé :", process.env.ORACLE_HOME, "\n");
  } catch (e) {
    console.error("ERREUR Instant Client:", e.message);
    console.error("Vérifiez que ORACLE_HOME pointe vers le dossier contenant oci.dll (ex: C:\\instantclient_11_2)");
    process.exit(1);
  }
} else {
  console.warn("ORACLE_HOME non défini — connexion en mode Thin (Oracle 12.1+ uniquement).\n");
}

function getConnectString() {
  if (process.env.ORACLE_CONNECT_STRING) return process.env.ORACLE_CONNECT_STRING;
  const host = process.env.ORACLE_HOST || "localhost";
  const port = process.env.ORACLE_PORT || "1521";
  const sid = process.env.ORACLE_SID || "XE";
  return `${host}:${port}/${sid}`;
}

const config = {
  user: process.env.ORACLE_USER || "system",
  password: process.env.ORACLE_PASSWORD || "orcl",
  connectString: getConnectString(),
};

function getStatements(sql) {
  const lines = sql.split(/\r?\n/);
  const statements = [];
  let current = [];

  for (let line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("--") || trimmed === "") continue;
    if (trimmed === "/") {
      if (current.length > 0) {
        const stmt = current.join("\n").trim().replace(/;[ \t]*$/, "");
        if (stmt) statements.push(stmt);
        current = [];
      }
      continue;
    }
    current.push(line);
    const inPlSqlBlock = current.some((l) => /^\s*BEGIN\s*$/i.test(l.trim()));
    const isEndOfBlock = /^\s*END\s*;?\s*$/i.test(trimmed);
    const shouldFlush = trimmed.endsWith(";") && (!inPlSqlBlock || isEndOfBlock);
    if (shouldFlush) {
      const stmt = current
        .join("\n")
        .replace(/;[ \t]*$/, "")
        .trim();
      if (stmt) statements.push(stmt);
      current = [];
    }
  }
  if (current.length > 0) {
    const stmt = current.join("\n").trim();
    if (stmt) statements.push(stmt);
  }
  return statements.filter((s) => s && s.trim() !== "/");
}

async function testConnection(conn) {
  const result = await conn.execute(`SELECT 'OK' AS TEST FROM DUAL`);
  const row = result.rows && result.rows[0];
  if (row && row[0] === "OK") return true;
  return false;
}

async function run() {
  let conn;
  try {
    console.log("Connexion Oracle en cours...");
    console.log("  Host/SID:", config.connectString);
    console.log("  User:   ", config.user);
    conn = await oracledb.getConnection(config);

    const ok = await testConnection(conn);
    if (!ok) {
      console.error("Test de connexion échoué (SELECT FROM DUAL).");
      process.exit(1);
    }

    console.log("Connexion Oracle établie.\n");

    const schemaPath = join(__dirname, "schema-oracle.sql");
    if (!existsSync(schemaPath)) {
      console.error("Fichier introuvable:", schemaPath);
      process.exit(1);
    }

    const sql = readFileSync(schemaPath, "utf8");
    const statements = getStatements(sql);
    console.log("Exécution du schéma (" + statements.length + " instruction(s))...\n");

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      const preview = stmt.substring(0, 55).replace(/\s+/g, " ") + (stmt.length > 55 ? "..." : "");
      try {
        if (stmt.toUpperCase().trim() === "COMMIT") {
          await conn.commit();
          console.log("  [" + (i + 1) + "/" + statements.length + "] COMMIT");
        } else {
          await conn.execute(stmt);
          console.log("  [" + (i + 1) + "/" + statements.length + "] OK  " + preview);
        }
      } catch (err) {
        if (err.message && err.message.includes("ORA-00955")) {
          console.log("  [" + (i + 1) + "/" + statements.length + "] (déjà existant) " + preview);
        } else if (err.message && err.message.includes("ORA-00001")) {
          console.log("  [" + (i + 1) + "/" + statements.length + "] (données déjà présentes) " + preview);
        } else {
          console.error("  [" + (i + 1) + "/" + statements.length + "] ERREUR:", err.message);
          console.error("  Statement:", preview);
          throw err;
        }
      }
    }

    await conn.commit();
    console.log("\nSchéma exécuté avec succès. Toutes les tables sont créées.");
  } catch (err) {
    console.error("\nErreur:", err.message);
    process.exit(1);
  } finally {
    if (conn) {
      try {
        await conn.close();
      } catch (e) {}
    }
    process.exit(0);
  }
}

run();

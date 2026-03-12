/**
 * Crée les tables dans le schéma GENESIS (pour les voir dans SQL Developer).
 * Supprime d'abord les synonymes existants, puis exécute schema-oracle.sql en tant que GENESIS.
 */
import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
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
    console.log("Instant Client activé :", process.env.ORACLE_HOME, "\n");
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

const genesisConfig = {
  user: "GENESIS",
  password: "orcl",
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
      const stmt = current.join("\n").replace(/;[ \t]*$/, "").trim();
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

async function run() {
  let conn;
  try {
    console.log("Connexion en GENESIS...");
    conn = await oracledb.getConnection(genesisConfig);
    console.log("Connexion établie.\n");

    console.log("Suppression des synonymes (s'ils existent)...");
    for (const syn of ["CANDIDATES", "DASHBOARD_CONFIG"]) {
      try {
        await conn.execute(`DROP SYNONYM ${syn}`);
        console.log("  Synonyme " + syn + " supprimé.");
      } catch (e) {
        if (!e.message || !e.message.includes("ORA-01434")) console.log("  " + syn + " :", e.message);
      }
    }
    await conn.commit();
    console.log("");

    const schemaPath = join(__dirname, "schema-oracle.sql");
    const sql = readFileSync(schemaPath, "utf8");
    const statements = getStatements(sql);
    console.log("Création des tables dans GENESIS (" + statements.length + " instruction(s))...\n");

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
          throw err;
        }
      }
    }

    await conn.commit();
    console.log("\nSchéma GENESIS créé. Rafraîchissez l'arbre dans SQL Developer (clic droit sur Tables > Actualiser).");
  } catch (err) {
    console.error("\nErreur:", err.message);
    process.exit(1);
  } finally {
    if (conn) try { await conn.close(); } catch (e) {}
    process.exit(0);
  }
}

run();

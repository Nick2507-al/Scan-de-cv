/**
 * Exécute le schéma GRH (schema-oracle-v2-grh.sql).
 * À lancer après schema-oracle.sql ou run-schema-genesis.js.
 * Connexion : utilisateur propriétaire des tables (ex. GENESIS).
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

const config = {
  user: process.env.ORACLE_USER || "GENESIS",
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
    console.log("Connexion Oracle (schéma GRH)...");
    conn = await oracledb.getConnection(config);
    console.log("Connexion établie.\n");

    const schemaPath = join(__dirname, "schema-oracle-v2-grh.sql");
    const sql = readFileSync(schemaPath, "utf8");
    const statements = getStatements(sql);
    console.log("Exécution de " + statements.length + " instruction(s)...\n");

    for (let i = 0; i < statements.length; i++) {
      const st = statements[i];
      const preview = st.substring(0, 60).replace(/\s+/g, " ");
      try {
        await conn.execute(st);
        console.log("  OK:", preview + (st.length > 60 ? "..." : ""));
      } catch (e) {
        if (e.message && (e.message.includes("ORA-00955") || e.message.includes("ORA-02289") || e.message.includes("ORA-01430"))) {
          console.log("  (déjà existant):", preview);
        } else {
          console.error("  ERREUR:", preview);
          console.error(e.message);
          process.exitCode = 1;
        }
      }
    }
    await conn.commit();
    console.log("\nSchéma GRH terminé.");
  } catch (err) {
    console.error(err);
    process.exit(1);
  } finally {
    if (conn) try { await conn.close(); } catch (e) {}
  }
}

run();

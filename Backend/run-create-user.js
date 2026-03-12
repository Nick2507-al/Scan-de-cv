/**
 * Exécute create-user-oracle.sql (en SYSTEM) puis genesis-synonyms.sql (en GENESIS).
 * Utilise Backend/.env et ORACLE_HOME pour Instant Client.
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

function getStatementsSimple(sql) {
  const chunks = sql.split(/;(?=\s*[\r\n])/g);
  const statements = [];
  for (const chunk of chunks) {
    let s = chunk
      .split(/\r?\n/)
      .filter((line) => !line.trim().startsWith("--"))
      .join("\n")
      .replace(/^[\s\r\n]+|[\s\r\n]+$/g, "")
      .replace(/;[ \t]*$/, "")
      .trim();
    if (s) statements.push(s);
  }
  return statements;
}

async function runSql(conn, sqlContent) {
  const statements = getStatementsSimple(sqlContent);
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i].trim();
    if (!stmt) continue;
    const preview = stmt.substring(0, 50).replace(/\s+/g, " ") + (stmt.length > 50 ? "..." : "");
    try {
      if (stmt.toUpperCase() === "COMMIT") {
        await conn.commit();
        console.log("  [" + (i + 1) + "/" + statements.length + "] COMMIT");
      } else {
        await conn.execute(stmt);
        console.log("  [" + (i + 1) + "/" + statements.length + "] OK  " + preview);
      }
    } catch (err) {
      if (err.message && err.message.includes("ORA-01920")) {
        console.log("  [" + (i + 1) + "/" + statements.length + "] (utilisateur existe déjà) " + preview);
      } else {
        console.error("  [" + (i + 1) + "/" + statements.length + "] ERREUR:", err.message);
        throw err;
      }
    }
  }
  await conn.commit();
}

async function run() {
  const connectString = getConnectString();
  const systemConfig = {
    user: process.env.ORACLE_USER || "system",
    password: process.env.ORACLE_PASSWORD || "orcl",
    connectString,
  };
  const genesisConfig = {
    user: "GENESIS",
    password: "orcl",
    connectString,
  };

  let conn;
  try {
    console.log("1) Connexion en SYSTEM...");
    conn = await oracledb.getConnection(systemConfig);
    console.log("   Connexion établie.\n");

    const createUserPath = join(__dirname, "create-user-oracle.sql");
    if (!existsSync(createUserPath)) {
      console.error("Fichier introuvable:", createUserPath);
      process.exit(1);
    }
    const createUserSql = readFileSync(createUserPath, "utf8");
    console.log("   Exécution de create-user-oracle.sql...");
    await runSql(conn, createUserSql);
    await conn.close();
    conn = null;
    console.log("   Utilisateur GENESIS créé et droits accordés.\n");

    console.log("2) Connexion en GENESIS...");
    conn = await oracledb.getConnection(genesisConfig);
    console.log("   Connexion établie.\n");

    const synonymsPath = join(__dirname, "genesis-synonyms.sql");
    if (!existsSync(synonymsPath)) {
      console.error("Fichier introuvable:", synonymsPath);
      process.exit(1);
    }
    const synonymsSql = readFileSync(synonymsPath, "utf8");
    console.log("   Exécution de genesis-synonyms.sql...");
    await runSql(conn, synonymsSql);
    console.log("   Synonymes créés.\n");

    console.log("Terminé. Vous pouvez vous connecter en SQL Developer avec GENESIS / orcl.");
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

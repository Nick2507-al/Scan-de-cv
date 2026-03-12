/**
 * Insère les rôles par défaut si la table ROLES est vide.
 * À exécuter après run-schema-v2 si les INSERT ont échoué (trigger invalide).
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
  } catch (e) {}
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

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
oracledb.autoCommit = true;

async function run() {
  let conn;
  try {
    conn = await oracledb.getConnection(config);
    // Corriger le trigger ROLES_BI (sans WHEN, test dans le corps)
    try {
      await conn.execute(`
        CREATE OR REPLACE TRIGGER ROLES_BI BEFORE INSERT ON ROLES FOR EACH ROW
        BEGIN
          IF :NEW.ID IS NULL THEN
            SELECT ROLES_SEQ.NEXTVAL INTO :NEW.ID FROM DUAL;
          END IF;
        END;
      `);
      console.log("Trigger ROLES_BI corrigé.");
    } catch (e) {
      if (!e.message.includes("ORA-04098")) console.warn(e.message);
    }
    // Corriger le trigger USERS_BI (évite ORA-04098 à l'inscription)
    try {
      await conn.execute(`
        CREATE OR REPLACE TRIGGER USERS_BI BEFORE INSERT ON USERS FOR EACH ROW
        BEGIN
          IF :NEW.ID IS NULL THEN
            SELECT USERS_SEQ.NEXTVAL INTO :NEW.ID FROM DUAL;
          END IF;
        END;
      `);
      console.log("Trigger USERS_BI corrigé.");
    } catch (e) {
      if (!e.message.includes("ORA-04098")) console.warn(e.message);
    }
    const r = await conn.execute(`SELECT COUNT(*) AS C FROM ROLES`);
    const count = r.rows?.[0]?.C ?? 0;
    if (count > 0) {
      console.log("Rôles déjà présents, rien à faire.");
      return;
    }
    await conn.execute(`INSERT INTO ROLES (NAME) VALUES ('Recruteur')`);
    await conn.execute(`INSERT INTO ROLES (NAME) VALUES ('Manager RH')`);
    await conn.execute(`INSERT INTO ROLES (NAME) VALUES ('Admin')`);
    console.log("3 rôles insérés (Recruteur, Manager RH, Admin).");
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  } finally {
    if (conn) try { await conn.close(); } catch (e) {}
  }
}

run();

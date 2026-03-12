import oracledb from "oracledb";
import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, ".env");
if (existsSync(envPath)) {
  const env = readFileSync(envPath, "utf8");
  for (const line of env.split(/\r?\n/)) {
    const m = line.match(/^\s*([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  }
}

// Mode Thick (Instant Client) pour Oracle 11g
if (process.env.ORACLE_HOME) {
  try {
    oracledb.initOracleClient({ libDir: process.env.ORACLE_HOME });
  } catch (e) {
    console.warn("Backend Oracle: init Oracle Client échoué —", e.message);
  }
}

let poolPromise = null;

function getConnectString() {
  if (process.env.ORACLE_CONNECT_STRING) {
    return process.env.ORACLE_CONNECT_STRING;
  }
  const host = process.env.ORACLE_HOST || "localhost";
  const port = process.env.ORACLE_PORT || "1521";
  const sid = process.env.ORACLE_SID || "XE";
  return `${host}:${port}/${sid}`;
}

function getPool() {
  if (!poolPromise) {
    poolPromise = oracledb.createPool({
      user: process.env.ORACLE_USER || "system",
      password: process.env.ORACLE_PASSWORD || "orcl",
      connectString: getConnectString(),
      poolMin: 1,
      poolMax: 10,
      poolIncrement: 1,
    });
  }
  return poolPromise;
}

export async function getConnection() {
  const pool = await getPool();
  return await pool.getConnection();
}

export async function closePool() {
  if (poolPromise) {
    const pool = await poolPromise;
    await pool.close(0);
    poolPromise = null;
  }
}

export default { getConnection, closePool, getPool };

import pg from "pg";
import { config } from "./config.js";

// Les NUMERIC sont renvoyés en chaîne par défaut : on les convertit en nombre.
pg.types.setTypeParser(1700, (v) => (v === null ? null : Number(v)));
// COUNT(*) (int8) → nombre (les volumes restent largement sous 2^53).
pg.types.setTypeParser(20, (v) => (v === null ? null : Number(v)));

export const pool = new pg.Pool({
  connectionString: config.databaseUrl,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  statement_timeout: 15000,
  application_name: "genesis-backend",
});

pool.on("error", (err) => {
  // Une connexion inactive qui tombe ne doit pas arrêter le serveur.
  console.error("[db] erreur de connexion inactive :", err.message);
});

/** Requête paramétrée — toutes les valeurs passent par $1, $2… (jamais de concaténation). */
export function query(text, params = []) {
  return pool.query(text, params);
}

export async function one(text, params = []) {
  const { rows } = await pool.query(text, params);
  return rows[0] ?? null;
}

export async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

import { query } from "./db.js";

/** Journal d'audit : n'interrompt jamais la requête en cas d'échec d'écriture. */
export async function audit(req, userId, action, entityType = "", entityId = null, meta = {}) {
  try {
    await query(
      "INSERT INTO audit_log (user_id, action, entity_type, entity_id, meta, ip) VALUES ($1,$2,$3,$4,$5,$6)",
      [userId, action, entityType, entityId, JSON.stringify(meta), (req?.ip || "").slice(0, 64)]
    );
  } catch (err) {
    console.error("[audit] écriture impossible :", err.message);
  }
}

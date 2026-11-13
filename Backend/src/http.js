import { z } from "zod";

/** Erreur HTTP « attendue » : son message est montré tel quel au client. */
export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export const notFound = (what = "Ressource") => new HttpError(404, `${what} introuvable`);

/** Valide `data` avec un schéma zod ; lève une 400 lisible sinon. */
export function parse(schema, data) {
  const r = schema.safeParse(data ?? {});
  if (r.success) return r.data;
  const details = r.error.issues.map((i) => ({ field: i.path.join("."), message: i.message }));
  throw new HttpError(400, details[0] ? `${details[0].field || "requête"} : ${details[0].message}` : "Requête invalide", details);
}

/** Identifiant de ressource : entier positif uniquement (bloque `1 OR 1=1`, `../`, etc.). */
export const idParam = z.coerce.number().int().positive().max(2147483647);

export function parseId(value) {
  return parse(z.object({ id: idParam }), { id: value }).id;
}

// Format d'erreur unique : { error: string, details?: [] }
export function errorHandler(err, req, res, _next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, ...(err.details ? { details: err.details } : {}) });
  }
  if (err?.type === "entity.parse.failed") return res.status(400).json({ error: "JSON invalide" });
  if (err?.type === "entity.too.large") return res.status(413).json({ error: "Requête trop volumineuse" });
  if (err?.code === "LIMIT_FILE_SIZE") return res.status(413).json({ error: "Fichier trop volumineux" });
  if (err?.code === "LIMIT_FILE_COUNT" || err?.code === "LIMIT_UNEXPECTED_FILE")
    return res.status(400).json({ error: "Nombre ou champ de fichiers invalide" });
  // Violations de contraintes PostgreSQL → 409/400 sans fuite de détails SQL.
  if (err?.code === "23505") return res.status(409).json({ error: "Cet élément existe déjà" });
  if (err?.code === "23503") return res.status(400).json({ error: "Référence invalide" });
  if (err?.code === "23514" || err?.code === "22001" || err?.code === "22P02")
    return res.status(400).json({ error: "Valeur invalide" });
  console.error(`[error] ${req.method} ${req.originalUrl}`, err);
  res.status(500).json({ error: "Erreur interne du serveur" });
}

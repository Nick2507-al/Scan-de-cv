import { Router } from "express";
import { z } from "zod";
import { one, query, withTransaction } from "../db.js";
import { HttpError, idParam, notFound, parse, parseId } from "../http.js";
import { audit } from "../audit.js";
import { removeStored, resolveStored, storedExists } from "../storage.js";

export const CANDIDATE_STATUSES = ["Nouveau", "Présélectionné", "Entretien", "Proposition", "Embauché", "Refusé"];

// Tri : liste blanche → aucune colonne fournie par le client n'atteint le SQL.
const SORTS = {
  recent: "c.created_at DESC, c.id DESC",
  oldest: "c.created_at ASC, c.id ASC",
  score: "c.score DESC, c.id DESC",
  name: "c.full_name ASC, c.id ASC",
};

const listSchema = z.object({
  page: z.coerce.number().int().min(1).max(100000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().max(200).default(""),
  status: z.enum(CANDIDATE_STATUSES).optional(),
  offerId: idParam.optional(),
  runId: idParam.optional(),
  retained: z.enum(["true", "false"]).optional(),
  sort: z.enum(Object.keys(SORTS)).default("recent"),
});

export function mapCandidate(r) {
  return {
    id: r.id,
    runId: r.run_id,
    offerId: r.offer_id,
    offerTitle: r.offer_title ?? null,
    fullName: r.full_name,
    email: r.email,
    phone: r.phone,
    location: r.location,
    headline: r.headline,
    links: r.links,
    skills: r.skills,
    organizations: r.organizations,
    education: r.education,
    languages: r.languages,
    educationLevel: r.education_level,
    experienceYears: r.experience_years,
    score: r.score,
    scoreBreakdown: r.score_breakdown,
    retained: r.retained,
    improvementNotes: r.improvement_notes,
    warnings: r.warnings,
    recruiterNotes: r.recruiter_notes,
    status: r.status,
    filename: r.filename,
    hasFile: Boolean(r.cv_path),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

/** Construit le WHERE commun à la liste et à l'export (toujours borné au propriétaire). */
function buildFilters(userId, f) {
  const where = ["c.owner_id = $1"];
  const params = [userId];
  const add = (sql, v) => { params.push(v); where.push(sql.replace("?", `$${params.length}`)); };
  if (f.q) {
    const like = `%${f.q.replace(/[\\%_]/g, (m) => "\\" + m)}%`;
    params.push(f.q, like);
    const a = params.length - 1, b = params.length;
    where.push(`(c.search @@ plainto_tsquery('simple', $${a}) OR c.full_name ILIKE $${b} OR c.email ILIKE $${b})`);
  }
  if (f.status) add("c.status = ?", f.status);
  if (f.offerId) add("c.offer_id = ?", f.offerId);
  if (f.runId) add("c.run_id = ?", f.runId);
  if (f.retained) add("c.retained = ?", f.retained === "true");
  return { where: where.join(" AND "), params };
}

const router = Router();

router.get("/", async (req, res) => {
  const f = parse(listSchema, req.query);
  const { where, params } = buildFilters(req.user.id, f);
  const total = (await one(`SELECT COUNT(*) AS n FROM candidates c WHERE ${where}`, params)).n;
  const { rows } = await query(
    `SELECT c.*, o.title AS offer_title FROM candidates c LEFT JOIN offers o ON o.id = c.offer_id
     WHERE ${where} ORDER BY ${SORTS[f.sort]} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, f.limit, (f.page - 1) * f.limit]
  );
  res.json({ data: rows.map(mapCandidate), total, page: f.page, limit: f.limit });
});

// Neutralise l'injection de formules (=, +, -, @) quand le CSV est ouvert dans Excel.
function csvCell(v) {
  let s = Array.isArray(v) ? v.map((x) => (typeof x === "object" ? x.name ?? "" : x)).join(", ") : String(v ?? "");
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return `"${s.replace(/"/g, '""')}"`;
}

router.get("/export.csv", async (req, res) => {
  const f = parse(listSchema.omit({ page: true, limit: true }), req.query);
  const { where, params } = buildFilters(req.user.id, f);
  const { rows } = await query(
    `SELECT c.*, o.title AS offer_title FROM candidates c LEFT JOIN offers o ON o.id = c.offer_id
     WHERE ${where} ORDER BY ${SORTS[f.sort]} LIMIT 10000`,
    params
  );
  const header = ["Nom", "Email", "Téléphone", "Offre", "Score", "Retenu", "Statut", "Expérience (ans)", "Compétences", "Date"];
  const lines = rows.map((r) => [
    r.full_name, r.email, r.phone, r.offer_title ?? "", r.score, r.retained ? "Oui" : "Non", r.status,
    r.experience_years, r.skills, new Date(r.created_at).toISOString().slice(0, 10),
  ].map(csvCell).join(";"));
  await audit(req, req.user.id, "candidate.export", "candidate", null, { count: rows.length });
  res.set("Content-Type", "text/csv; charset=utf-8");
  res.set("Content-Disposition", 'attachment; filename="candidats.csv"');
  res.send("﻿" + [header.map(csvCell).join(";"), ...lines].join("\r\n"));
});

async function getOwned(id, userId) {
  const r = await one(
    `SELECT c.*, o.title AS offer_title FROM candidates c LEFT JOIN offers o ON o.id = c.offer_id
     WHERE c.id = $1 AND c.owner_id = $2`,
    [id, userId]
  );
  if (!r) throw notFound("Candidat");
  return r;
}

router.get("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  const r = await getOwned(id, req.user.id);
  const [history, interviews] = await Promise.all([
    query(
      `SELECT h.old_status, h.new_status, h.comment, h.created_at, u.full_name
       FROM candidate_history h LEFT JOIN users u ON u.id = h.user_id
       WHERE h.candidate_id = $1 ORDER BY h.created_at DESC, h.id DESC`,
      [id]
    ),
    query("SELECT * FROM interviews WHERE candidate_id = $1 AND owner_id = $2 ORDER BY starts_at", [id, req.user.id]),
  ]);
  res.json({
    ...mapCandidate(r),
    textExcerpt: r.text_excerpt,
    history: history.rows.map((h) => ({
      oldStatus: h.old_status, newStatus: h.new_status, comment: h.comment, createdAt: h.created_at, by: h.full_name ?? "",
    })),
    interviews: interviews.rows.map((i) => ({
      id: i.id, startsAt: i.starts_at, durationMin: i.duration_min, kind: i.kind, location: i.location, notes: i.notes,
    })),
  });
});

const patchSchema = z.object({
  status: z.enum(CANDIDATE_STATUSES).optional(),
  comment: z.string().trim().max(2000).optional(),
  recruiterNotes: z.string().max(20000).optional(),
  offerId: idParam.nullable().optional(),
  fullName: z.string().trim().max(200).optional(),
  email: z.union([z.string().trim().email().max(254), z.literal("")]).optional(),
  phone: z.string().trim().max(40).optional(),
}).strict();

router.patch("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  const b = parse(patchSchema, req.body);
  if (!Object.keys(b).length) throw new HttpError(400, "Aucune donnée à mettre à jour");
  if (b.offerId) {
    const owned = await one("SELECT 1 FROM offers WHERE id = $1 AND owner_id = $2", [b.offerId, req.user.id]);
    if (!owned) throw notFound("Offre");
  }
  const updated = await withTransaction(async (db) => {
    const cur = (await db.query("SELECT status FROM candidates WHERE id = $1 AND owner_id = $2 FOR UPDATE", [id, req.user.id])).rows[0];
    if (!cur) throw notFound("Candidat");
    const r = (await db.query(
      `UPDATE candidates SET
         status = COALESCE($3, status),
         recruiter_notes = COALESCE($4, recruiter_notes),
         offer_id = CASE WHEN $5::boolean THEN $6::int ELSE offer_id END,
         full_name = COALESCE($7, full_name),
         email = COALESCE($8, email),
         phone = COALESCE($9, phone),
         updated_at = now()
       WHERE id = $1 AND owner_id = $2 RETURNING id`,
      [id, req.user.id, b.status ?? null, b.recruiterNotes ?? null, b.offerId !== undefined, b.offerId ?? null,
        b.fullName ?? null, b.email ?? null, b.phone ?? null]
    )).rows[0];
    if (b.status && b.status !== cur.status) {
      await db.query(
        "INSERT INTO candidate_history (candidate_id, user_id, old_status, new_status, comment) VALUES ($1,$2,$3,$4,$5)",
        [id, req.user.id, cur.status, b.status, b.comment ?? ""]
      );
    }
    return r;
  });
  await audit(req, req.user.id, "candidate.update", "candidate", updated.id, { fields: Object.keys(b) });
  res.json(mapCandidate(await getOwned(id, req.user.id)));
});

router.delete("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  const r = await one("DELETE FROM candidates WHERE id = $1 AND owner_id = $2 RETURNING cv_path", [id, req.user.id]);
  if (!r) throw notFound("Candidat");
  await removeStored(r.cv_path);
  await audit(req, req.user.id, "candidate.delete", "candidate", id);
  res.status(204).end();
});

router.get("/:id/file", async (req, res) => {
  const r = await getOwned(parseId(req.params.id), req.user.id);
  if (!r.cv_path || !(await storedExists(r.cv_path))) throw notFound("Fichier");
  // Nom de téléchargement assaini ; type forcé en octet-stream + nosniff : jamais exécuté par le navigateur.
  const name = (r.filename || "cv").replace(/[^\p{L}\p{N}._ -]/gu, "_").slice(0, 150);
  res.set("X-Content-Type-Options", "nosniff");
  res.attachment(name);
  res.type("application/octet-stream");
  res.sendFile(resolveStored(r.cv_path));
});

export default router;

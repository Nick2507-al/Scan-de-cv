import { Router } from "express";
import { z } from "zod";
import { one, query } from "../db.js";
import { notFound, parse, parseId, idParam } from "../http.js";
import { audit } from "../audit.js";

const router = Router();

const interviewSchema = z.object({
  candidateId: idParam,
  startsAt: z.string().datetime({ offset: true, message: "date ISO 8601 attendue" }),
  durationMin: z.coerce.number().int().min(5).max(600).default(45),
  kind: z.enum(["telephone", "visio", "presentiel"]).default("visio"),
  location: z.string().trim().max(500).default(""),
  notes: z.string().max(5000).default(""),
}).strict();

const rangeSchema = z.object({
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
});

const map = (i) => ({
  id: i.id, candidateId: i.candidate_id, candidateName: i.full_name ?? "", startsAt: i.starts_at,
  durationMin: i.duration_min, kind: i.kind, location: i.location, notes: i.notes,
});

router.get("/", async (req, res) => {
  const r = parse(rangeSchema, req.query);
  const { rows } = await query(
    `SELECT i.*, c.full_name FROM interviews i JOIN candidates c ON c.id = i.candidate_id
     WHERE i.owner_id = $1 AND ($2::timestamptz IS NULL OR i.starts_at >= $2) AND ($3::timestamptz IS NULL OR i.starts_at < $3)
     ORDER BY i.starts_at LIMIT 500`,
    [req.user.id, r.from ?? null, r.to ?? null]
  );
  res.json(rows.map(map));
});

router.post("/", async (req, res) => {
  const b = parse(interviewSchema, req.body);
  const cand = await one("SELECT id, status FROM candidates WHERE id = $1 AND owner_id = $2", [b.candidateId, req.user.id]);
  if (!cand) throw notFound("Candidat");
  const i = await one(
    `INSERT INTO interviews (owner_id, candidate_id, starts_at, duration_min, kind, location, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [req.user.id, b.candidateId, b.startsAt, b.durationMin, b.kind, b.location, b.notes]
  );
  // Planifier un entretien fait avancer le candidat dans le pipeline.
  if (["Nouveau", "Présélectionné"].includes(cand.status)) {
    await query("UPDATE candidates SET status = 'Entretien', updated_at = now() WHERE id = $1", [cand.id]);
    await query(
      "INSERT INTO candidate_history (candidate_id, user_id, old_status, new_status, comment) VALUES ($1,$2,$3,'Entretien',$4)",
      [cand.id, req.user.id, cand.status, "Entretien planifié"]
    );
  }
  await audit(req, req.user.id, "interview.create", "interview", i.id);
  res.status(201).json(map(i));
});

router.put("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  const b = parse(interviewSchema, req.body);
  const cand = await one("SELECT 1 FROM candidates WHERE id = $1 AND owner_id = $2", [b.candidateId, req.user.id]);
  if (!cand) throw notFound("Candidat");
  const i = await one(
    `UPDATE interviews SET candidate_id=$3, starts_at=$4, duration_min=$5, kind=$6, location=$7, notes=$8
     WHERE id=$1 AND owner_id=$2 RETURNING *`,
    [id, req.user.id, b.candidateId, b.startsAt, b.durationMin, b.kind, b.location, b.notes]
  );
  if (!i) throw notFound("Entretien");
  res.json(map(i));
});

router.delete("/:id", async (req, res) => {
  const { rowCount } = await query("DELETE FROM interviews WHERE id = $1 AND owner_id = $2", [parseId(req.params.id), req.user.id]);
  if (!rowCount) throw notFound("Entretien");
  res.status(204).end();
});

export default router;

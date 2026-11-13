import { Router } from "express";
import { z } from "zod";
import { one, query } from "../db.js";
import { notFound, parse, parseId } from "../http.js";
import { audit } from "../audit.js";
import { skillList } from "../criteria.js";

export const OFFER_STATUSES = ["brouillon", "ouverte", "pourvue", "annulee"];

const offerSchema = z.object({
  title: z.string().trim().min(1, "titre requis").max(200),
  description: z.string().max(20000).default(""),
  requiredSkills: skillList.default([]),
  niceSkills: skillList.default([]),
  languages: skillList.default([]),
  minExperienceYears: z.coerce.number().min(0).max(60).default(0),
  minEducationLevel: z.coerce.number().int().min(0).max(8).default(0),
  location: z.string().trim().max(200).default(""),
  contractType: z.string().trim().max(50).default(""),
  threshold: z.coerce.number().int().min(0).max(100).default(60),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date AAAA-MM-JJ attendue").nullable().optional(),
  status: z.enum(OFFER_STATUSES).default("ouverte"),
}).strict();

export function mapOffer(r) {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    requiredSkills: r.required_skills,
    niceSkills: r.nice_skills,
    languages: r.languages,
    minExperienceYears: r.min_experience_years,
    minEducationLevel: r.min_education_level,
    location: r.location,
    contractType: r.contract_type,
    threshold: r.threshold,
    deadline: r.deadline ? new Date(r.deadline).toISOString().slice(0, 10) : null,
    status: r.status,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    ...(r.candidate_count !== undefined ? {
      stats: { candidates: r.candidate_count, retained: r.retained_count, hired: r.hired_count },
    } : {}),
  };
}

const router = Router();

router.get("/", async (req, res) => {
  const { rows } = await query(
    `SELECT o.*,
       COUNT(c.id) AS candidate_count,
       COUNT(c.id) FILTER (WHERE c.retained) AS retained_count,
       COUNT(c.id) FILTER (WHERE c.status = 'Embauché') AS hired_count
     FROM offers o LEFT JOIN candidates c ON c.offer_id = o.id AND c.owner_id = o.owner_id
     WHERE o.owner_id = $1
     GROUP BY o.id ORDER BY o.created_at DESC`,
    [req.user.id]
  );
  res.json(rows.map(mapOffer));
});

router.get("/:id", async (req, res) => {
  const r = await one("SELECT * FROM offers WHERE id = $1 AND owner_id = $2", [parseId(req.params.id), req.user.id]);
  if (!r) throw notFound("Offre");
  res.json(mapOffer(r));
});

const offerParams = (o) => [
  o.title, o.description, JSON.stringify(o.requiredSkills), JSON.stringify(o.niceSkills), JSON.stringify(o.languages),
  o.minExperienceYears, o.minEducationLevel, o.location, o.contractType, o.threshold, o.deadline ?? null, o.status,
];

router.post("/", async (req, res) => {
  const o = parse(offerSchema, req.body);
  const r = await one(
    `INSERT INTO offers (title, description, required_skills, nice_skills, languages, min_experience_years,
       min_education_level, location, contract_type, threshold, deadline, status, owner_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
    [...offerParams(o), req.user.id]
  );
  await audit(req, req.user.id, "offer.create", "offer", r.id);
  res.status(201).json(mapOffer(r));
});

router.put("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  const o = parse(offerSchema, req.body);
  const r = await one(
    `UPDATE offers SET title=$1, description=$2, required_skills=$3, nice_skills=$4, languages=$5,
       min_experience_years=$6, min_education_level=$7, location=$8, contract_type=$9, threshold=$10,
       deadline=$11, status=$12, updated_at=now()
     WHERE id=$13 AND owner_id=$14 RETURNING *`,
    [...offerParams(o), id, req.user.id]
  );
  if (!r) throw notFound("Offre");
  await audit(req, req.user.id, "offer.update", "offer", id);
  res.json(mapOffer(r));
});

router.delete("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  const { rowCount } = await query("DELETE FROM offers WHERE id = $1 AND owner_id = $2", [id, req.user.id]);
  if (!rowCount) throw notFound("Offre");
  await audit(req, req.user.id, "offer.delete", "offer", id);
  res.status(204).end();
});

export default router;

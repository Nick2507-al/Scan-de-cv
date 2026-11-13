import { Router } from "express";
import { z } from "zod";
import { one, query } from "../db.js";
import { notFound, parse, parseId } from "../http.js";
import { criteriaSchema } from "../criteria.js";

const router = Router();
const templateSchema = z.object({ name: z.string().trim().min(1).max(120), criteria: criteriaSchema }).strict();
const map = (r) => ({ id: r.id, name: r.name, criteria: r.criteria, createdAt: r.created_at });

router.get("/", async (req, res) => {
  const { rows } = await query("SELECT * FROM criteria_templates WHERE owner_id = $1 ORDER BY name", [req.user.id]);
  res.json(rows.map(map));
});

router.post("/", async (req, res) => {
  const t = parse(templateSchema, req.body);
  const r = await one(
    "INSERT INTO criteria_templates (owner_id, name, criteria) VALUES ($1,$2,$3) RETURNING *",
    [req.user.id, t.name, JSON.stringify(t.criteria)]
  );
  res.status(201).json(map(r));
});

router.delete("/:id", async (req, res) => {
  const { rowCount } = await query("DELETE FROM criteria_templates WHERE id = $1 AND owner_id = $2", [
    parseId(req.params.id), req.user.id,
  ]);
  if (!rowCount) throw notFound("Modèle");
  res.status(204).end();
});

export default router;

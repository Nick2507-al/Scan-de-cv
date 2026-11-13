import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { config } from "../config.js";
import { one, query } from "../db.js";
import { HttpError, idParam, notFound, parse, parseId } from "../http.js";
import { audit } from "../audit.js";
import { analyzeLimiter } from "../security.js";
import { criteriaFromOffer, criteriaSchema } from "../criteria.js";
import { detectCvFormat, removeStored, saveFile, sha256 } from "../storage.js";
import { analyzeFile } from "../analyzer.js";
import { mapCandidate } from "./candidates.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxFileBytes, files: config.maxFilesPerRun, fields: 10, fieldSize: 64 * 1024 },
});

const router = Router();

const runBodySchema = z.object({
  runId: z.union([idParam, z.literal("")]).optional(),
  offerId: z.union([idParam, z.literal("")]).optional(),
  criteria: z.string().max(60000).optional(),
});

// Multer décode le nom de fichier en latin1 : on le ré-interprète en UTF-8 (accents).
const decodeName = (n) => {
  const s = Buffer.from(n, "latin1").toString("utf8");
  return (s.includes("�") ? n : s).replace(/[\u0000-\u001f\\/]/g, "_").slice(0, 200);
};

async function processOne(file, criteria, ctx) {
  const filename = decodeName(file.originalname);
  const fmt = detectCvFormat(filename, file.buffer);
  if (!fmt) return { filename, error: "Format non supporté ou fichier corrompu / contenu ne correspondant pas à l'extension" };
  const hash = sha256(file.buffer);
  const previous = await one(
    `SELECT id, created_at FROM candidates WHERE owner_id = $1 AND file_sha256 = $2
     AND offer_id IS NOT DISTINCT FROM $3 ORDER BY created_at DESC LIMIT 1`,
    [ctx.userId, hash, ctx.offerId]
  );
  let result;
  try {
    result = await analyzeFile({ buffer: file.buffer, filename, mime: fmt.mime, criteria });
  } catch (err) {
    const timeout = err.name === "TimeoutError" || err.name === "AbortError";
    const down = err.cause?.code === "ECONNREFUSED";
    console.error(`[analyse] ${filename} :`, err.message);
    return {
      filename,
      error: down ? "Moteur d'analyse indisponible (service Python arrêté)"
        : timeout ? "Analyse trop longue, fichier abandonné"
        : err.userFacing ? err.message : "Échec de l'analyse de ce fichier",
    };
  }
  const c = result.candidate || {};
  const ev = result.evaluation || {};
  const warnings = [...(result.warnings || [])];
  if (previous) warnings.push(`CV identique déjà analysé le ${new Date(previous.created_at).toLocaleDateString("fr-FR")} (candidat n°${previous.id})`);
  const cvPath = await saveFile(ctx.userId, "cvs", file.buffer, fmt.ext);
  try {
    const row = await one(
      `INSERT INTO candidates (owner_id, run_id, offer_id, full_name, email, phone, location, headline, links, skills,
         organizations, education, languages, education_level, experience_years, score, score_breakdown, retained,
         improvement_notes, warnings, filename, file_mime, file_sha256, cv_path, text_excerpt, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,
         CASE WHEN $18 THEN 'Présélectionné' ELSE 'Nouveau' END)
       RETURNING *`,
      [
        ctx.userId, ctx.runId, ctx.offerId,
        String(c.fullName || "").slice(0, 200), String(c.email || "").slice(0, 254), String(c.phone || "").slice(0, 40),
        String(c.location || "").slice(0, 200), String(c.headline || "").slice(0, 300),
        JSON.stringify(c.links || []), JSON.stringify(c.skills || []), JSON.stringify(c.organizations || []),
        JSON.stringify(c.education || []), JSON.stringify(c.languages || []),
        Math.max(0, Math.min(8, Math.round(Number(c.educationLevel) || 0))),
        Math.max(0, Math.min(60, Number(c.experienceYears) || 0)),
        Math.max(0, Math.min(100, Math.round(Number(ev.score) || 0))),
        JSON.stringify(ev.breakdown || {}), ev.retained === true,
        JSON.stringify(ev.improvementNotes || []), JSON.stringify(warnings),
        filename, fmt.mime, hash, cvPath, String(result.textExcerpt || "").slice(0, 4000),
      ]
    );
    return { ...mapCandidate(row), engine: result.engine, evaluation: ev };
  } catch (err) {
    await removeStored(cvPath);
    throw err;
  }
}

router.post("/", analyzeLimiter, upload.array("files"), async (req, res) => {
  const files = req.files || [];
  if (!files.length) throw new HttpError(400, "Ajoutez au moins un fichier");
  const body = parse(runBodySchema, req.body);
  let offerId = body.offerId ? Number(body.offerId) : null;
  let criteria;
  let run;

  if (body.runId) {
    // Ajout de fichiers à un lot existant (envoi par paquets) : mêmes critères pour tout le lot.
    run = await one("SELECT id, offer_id, criteria FROM analysis_runs WHERE id = $1 AND owner_id = $2", [body.runId, req.user.id]);
    if (!run) throw notFound("Analyse");
    offerId = run.offer_id;
    criteria = run.criteria;
    await query("UPDATE analysis_runs SET file_count = file_count + $2 WHERE id = $1", [run.id, files.length]);
  } else {
    if (offerId) {
      const offer = await one("SELECT * FROM offers WHERE id = $1 AND owner_id = $2", [offerId, req.user.id]);
      if (!offer) throw notFound("Offre");
      criteria = criteriaFromOffer(offer);
    } else {
      let raw;
      try { raw = body.criteria ? JSON.parse(body.criteria) : {}; } catch { throw new HttpError(400, "criteria : JSON invalide"); }
      criteria = parse(criteriaSchema, raw);
    }
    run = await one(
      "INSERT INTO analysis_runs (owner_id, offer_id, criteria, file_count) VALUES ($1,$2,$3,$4) RETURNING id",
      [req.user.id, offerId, JSON.stringify(criteria), files.length]
    );
  }
  const started = Date.now();
  const ctx = { userId: req.user.id, runId: run.id, offerId };

  // Traitement par petits paquets : rapide sans saturer le moteur d'analyse.
  const results = new Array(files.length);
  const CONCURRENCY = 3;
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, files.length) }, async () => {
    while (next < files.length) {
      const i = next++;
      try {
        results[i] = await processOne(files[i], criteria, ctx);
      } catch (err) {
        console.error("[analyse] enregistrement impossible :", err);
        results[i] = { filename: decodeName(files[i].originalname), error: "Erreur lors de l'enregistrement du résultat" };
      }
    }
  }));

  const ok = results.filter((r) => !r.error);
  const engine = ok[0]?.engine || "";
  await query(
    `UPDATE analysis_runs SET retained_count = retained_count + $2, rejected_count = rejected_count + $3,
       error_count = error_count + $4, duration_ms = duration_ms + $5, engine = CASE WHEN $6 = '' THEN engine ELSE $6 END
     WHERE id = $1`,
    [run.id, ok.filter((r) => r.retained).length, ok.filter((r) => !r.retained).length,
      results.length - ok.length, Date.now() - started, engine]
  );
  await audit(req, req.user.id, "analysis.run", "analysis", run.id, { files: files.length });
  res.status(201).json({ runId: run.id, criteria, results });
});

const mapRun = (r) => ({
  id: r.id, offerId: r.offer_id, offerTitle: r.offer_title ?? null, criteria: r.criteria, engine: r.engine,
  fileCount: r.file_count, retainedCount: r.retained_count, rejectedCount: r.rejected_count,
  errorCount: r.error_count, durationMs: r.duration_ms, createdAt: r.created_at,
});

const historySchema = z.object({
  page: z.coerce.number().int().min(1).max(100000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

router.get("/", async (req, res) => {
  const f = parse(historySchema, req.query);
  const total = (await one("SELECT COUNT(*) AS n FROM analysis_runs WHERE owner_id = $1", [req.user.id])).n;
  const { rows } = await query(
    `SELECT r.*, o.title AS offer_title FROM analysis_runs r LEFT JOIN offers o ON o.id = r.offer_id
     WHERE r.owner_id = $1 ORDER BY r.created_at DESC, r.id DESC LIMIT $2 OFFSET $3`,
    [req.user.id, f.limit, (f.page - 1) * f.limit]
  );
  res.json({ data: rows.map(mapRun), total, page: f.page, limit: f.limit });
});

router.get("/:id", async (req, res) => {
  const id = parseId(req.params.id);
  const r = await one(
    `SELECT r.*, o.title AS offer_title FROM analysis_runs r LEFT JOIN offers o ON o.id = r.offer_id
     WHERE r.id = $1 AND r.owner_id = $2`,
    [id, req.user.id]
  );
  if (!r) throw notFound("Analyse");
  const { rows } = await query(
    "SELECT * FROM candidates WHERE run_id = $1 AND owner_id = $2 ORDER BY score DESC, id",
    [id, req.user.id]
  );
  res.json({ ...mapRun(r), candidates: rows.map(mapCandidate) });
});

router.delete("/:id", async (req, res) => {
  const { rowCount } = await query("DELETE FROM analysis_runs WHERE id = $1 AND owner_id = $2", [
    parseId(req.params.id), req.user.id,
  ]);
  if (!rowCount) throw notFound("Analyse");
  res.status(204).end();
});

export default router;

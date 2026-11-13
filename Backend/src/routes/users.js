import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { one, query } from "../db.js";
import { HttpError, notFound, parse } from "../http.js";
import { publicUser } from "../auth.js";
import { audit } from "../audit.js";
import { removeStored, resolveStored, saveFile, sniff, storedExists } from "../storage.js";

const router = Router();
const avatarUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 3 * 1024 * 1024, files: 1 } });

router.get("/me", (req, res) => res.json({ user: publicUser(req.user) }));

const profileSchema = z.object({
  fullName: z.string().trim().min(2).max(120).optional(),
  email: z.string().trim().toLowerCase().email().max(254).optional(),
}).strict();

router.patch("/me", async (req, res) => {
  const body = parse(profileSchema, req.body);
  if (!Object.keys(body).length) throw new HttpError(400, "Aucune donnée à mettre à jour");
  const user = await one(
    `UPDATE users SET full_name = COALESCE($2, full_name), email = COALESCE($3, email), updated_at = now()
     WHERE id = $1 RETURNING id, email, full_name, avatar_path, token_version, created_at`,
    [req.user.id, body.fullName ?? null, body.email ?? null]
  );
  await audit(req, req.user.id, "user.update", "user", req.user.id, { fields: Object.keys(body) });
  res.json({ user: publicUser(user) });
});

router.post("/me/avatar", avatarUpload.single("avatar"), async (req, res) => {
  if (!req.file) throw new HttpError(400, "Aucune image envoyée");
  const sig = sniff(req.file.buffer);
  if (!sig || !["image/png", "image/jpeg", "image/webp"].includes(sig.mime)) {
    throw new HttpError(415, "Format d'image non supporté (PNG, JPEG ou WebP)");
  }
  const rel = await saveFile(req.user.id, "avatars", req.file.buffer, sig.ext);
  const previous = req.user.avatar_path;
  const user = await one(
    `UPDATE users SET avatar_path = $2, updated_at = now() WHERE id = $1
     RETURNING id, email, full_name, avatar_path, token_version, created_at`,
    [req.user.id, rel]
  );
  await removeStored(previous);
  res.json({ user: publicUser(user) });
});

router.get("/me/avatar", async (req, res) => {
  const rel = req.user.avatar_path;
  if (!rel || !(await storedExists(rel))) throw notFound("Photo");
  res.set("Cache-Control", "private, max-age=86400");
  res.sendFile(resolveStored(rel));
});

const settingsSchema = z.object({
  monthlyTarget: z.coerce.number().int().min(1).max(100000).optional(),
  defaultThreshold: z.coerce.number().int().min(0).max(100).optional(),
  retentionMonths: z.coerce.number().int().min(1).max(120).optional(),
}).strict();

const mapSettings = (s) => ({
  monthlyTarget: s.monthly_target, defaultThreshold: s.default_threshold, retentionMonths: s.retention_months,
});

router.get("/me/settings", async (req, res) => {
  await query("INSERT INTO user_settings (user_id) VALUES ($1) ON CONFLICT DO NOTHING", [req.user.id]);
  res.json(mapSettings(await one("SELECT * FROM user_settings WHERE user_id = $1", [req.user.id])));
});

router.patch("/me/settings", async (req, res) => {
  const b = parse(settingsSchema, req.body);
  await query("INSERT INTO user_settings (user_id) VALUES ($1) ON CONFLICT DO NOTHING", [req.user.id]);
  const s = await one(
    `UPDATE user_settings SET monthly_target = COALESCE($2, monthly_target),
       default_threshold = COALESCE($3, default_threshold), retention_months = COALESCE($4, retention_months)
     WHERE user_id = $1 RETURNING *`,
    [req.user.id, b.monthlyTarget ?? null, b.defaultThreshold ?? null, b.retentionMonths ?? null]
  );
  res.json(mapSettings(s));
});

/** Journal d'activité personnel (connexions, analyses, modifications). */
router.get("/me/activity", async (req, res) => {
  const { rows } = await query(
    `SELECT action, entity_type, entity_id, meta, created_at FROM audit_log
     WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100`,
    [req.user.id]
  );
  res.json(rows.map((r) => ({ action: r.action, entityType: r.entity_type, entityId: r.entity_id, meta: r.meta, createdAt: r.created_at })));
});

export default router;

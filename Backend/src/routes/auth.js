import { Router } from "express";
import { z } from "zod";
import { config } from "../config.js";
import { one, query } from "../db.js";
import { HttpError, parse } from "../http.js";
import {
  checkPassword, clearSessionCookie, hashPassword, publicUser, requireAuth, setSessionCookie, signSession,
} from "../auth.js";
import { audit } from "../audit.js";
import { loginLimiter, registerLimiter } from "../security.js";

const email = z.string().trim().toLowerCase().email("adresse email invalide").max(254);
export const passwordPolicy = z
  .string()
  .min(10, "10 caractères minimum")
  .max(128, "128 caractères maximum")
  .refine((p) => /[A-Za-zÀ-ÿ]/.test(p) && /\d/.test(p), "doit contenir au moins une lettre et un chiffre");

const registerSchema = z.object({
  email,
  password: passwordPolicy,
  fullName: z.string().trim().min(2, "2 caractères minimum").max(120),
});
const loginSchema = z.object({ email, password: z.string().min(1).max(128) });

const router = Router();

router.post("/register", registerLimiter, async (req, res) => {
  const body = parse(registerSchema, req.body);
  const hash = await hashPassword(body.password);
  const user = await one(
    `INSERT INTO users (email, password_hash, full_name) VALUES ($1, $2, $3)
     ON CONFLICT DO NOTHING
     RETURNING id, email, full_name, avatar_path, token_version, created_at`,
    [body.email, hash, body.fullName]
  );
  if (!user) throw new HttpError(409, "Un compte existe déjà avec cet email");
  await query("INSERT INTO user_settings (user_id) VALUES ($1) ON CONFLICT DO NOTHING", [user.id]);
  await audit(req, user.id, "auth.register", "user", user.id);
  setSessionCookie(res, signSession(user));
  res.status(201).json({ user: publicUser(user) });
});

router.post("/login", loginLimiter, async (req, res) => {
  const body = parse(loginSchema, req.body);
  const user = await one(
    `SELECT id, email, full_name, avatar_path, password_hash, active, failed_logins, locked_until,
            token_version, created_at
     FROM users WHERE lower(email) = $1`,
    [body.email]
  );
  const locked = user?.locked_until && new Date(user.locked_until) > new Date();
  // Toujours exécuter bcrypt, même sans utilisateur : temps de réponse homogène.
  const ok = await checkPassword(body.password, user?.password_hash);
  if (!user || !user.active || locked || !ok) {
    if (user && !locked && !ok) {
      const failures = user.failed_logins + 1;
      const lock = failures >= config.loginMaxFailures;
      await query(
        `UPDATE users SET failed_logins = $2,
           locked_until = CASE WHEN $3 THEN now() + make_interval(mins => $4) ELSE locked_until END
         WHERE id = $1`,
        [user.id, lock ? 0 : failures, lock, config.loginLockMinutes]
      );
      if (lock) await audit(req, user.id, "auth.locked", "user", user.id);
    }
    if (locked) throw new HttpError(423, "Compte temporairement verrouillé après plusieurs échecs. Réessayez plus tard.");
    throw new HttpError(401, "Email ou mot de passe incorrect");
  }
  await query("UPDATE users SET failed_logins = 0, locked_until = NULL, last_login_at = now() WHERE id = $1", [user.id]);
  await audit(req, user.id, "auth.login", "user", user.id);
  setSessionCookie(res, signSession(user));
  res.json({ user: publicUser(user) });
});

router.post("/logout", (req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

router.get("/me", requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

const changePasswordSchema = z.object({ currentPassword: z.string().min(1).max(128), newPassword: passwordPolicy });

router.post("/change-password", requireAuth, async (req, res) => {
  const body = parse(changePasswordSchema, req.body);
  const row = await one("SELECT password_hash FROM users WHERE id = $1", [req.user.id]);
  if (!(await checkPassword(body.currentPassword, row?.password_hash))) {
    throw new HttpError(400, "Mot de passe actuel incorrect");
  }
  // token_version + 1 : toutes les autres sessions ouvertes sont révoquées.
  const user = await one(
    `UPDATE users SET password_hash = $2, token_version = token_version + 1, updated_at = now()
     WHERE id = $1 RETURNING id, email, full_name, avatar_path, token_version, created_at`,
    [req.user.id, await hashPassword(body.newPassword)]
  );
  await audit(req, user.id, "auth.password_changed", "user", user.id);
  setSessionCookie(res, signSession(user));
  res.json({ ok: true });
});

export default router;

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { config } from "./config.js";
import { one } from "./db.js";
import { HttpError } from "./http.js";

const BCRYPT_COST = config.isTest ? 4 : 12;
// Hash factice : on compare même si l'email n'existe pas (temps de réponse constant → pas d'énumération).
const DUMMY_HASH = bcrypt.hashSync("genesis-dummy-password", BCRYPT_COST);

export const hashPassword = (pw) => bcrypt.hash(pw, BCRYPT_COST);
export const checkPassword = (pw, hash) => bcrypt.compare(pw, hash || DUMMY_HASH);

export function signSession(user) {
  return jwt.sign({ sub: String(user.id), tv: user.token_version }, config.jwtSecret, {
    algorithm: "HS256",
    expiresIn: config.jwtExpires,
  });
}

const cookieOptions = () => ({
  httpOnly: true,
  sameSite: "strict",
  secure: config.isProd,
  path: "/",
});

export function setSessionCookie(res, token) {
  res.cookie(config.cookieName, token, { ...cookieOptions(), maxAge: 8 * 3600 * 1000 });
}

export function clearSessionCookie(res) {
  res.clearCookie(config.cookieName, cookieOptions());
}

function readToken(req) {
  const c = req.cookies?.[config.cookieName];
  if (c) return c;
  const h = req.headers.authorization;
  return h && h.startsWith("Bearer ") ? h.slice(7) : null;
}

/** Exige une session valide ; charge l'utilisateur à jour (compte actif, jeton non révoqué). */
export async function requireAuth(req, _res, next) {
  const token = readToken(req);
  if (!token) return next(new HttpError(401, "Authentification requise"));
  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret, { algorithms: ["HS256"] });
  } catch {
    return next(new HttpError(401, "Session invalide ou expirée"));
  }
  const userId = Number(payload.sub);
  if (!Number.isInteger(userId) || userId <= 0) return next(new HttpError(401, "Session invalide ou expirée"));
  const user = await one(
    "SELECT id, email, full_name, avatar_path, active, token_version, created_at FROM users WHERE id = $1",
    [userId]
  );
  if (!user || !user.active || user.token_version !== payload.tv) {
    return next(new HttpError(401, "Session invalide ou expirée"));
  }
  req.user = user;
  next();
}

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Protection CSRF : en plus du cookie SameSite=Strict, toute requête qui modifie l'état
 * doit porter l'en-tête X-Requested-With (impossible à poser depuis un formulaire tiers
 * sans pré-vol CORS, que nous refusons pour les origines inconnues).
 */
export function csrfGuard(req, _res, next) {
  if (SAFE_METHODS.has(req.method)) return next();
  if (req.get("X-Requested-With") !== "genesis") return next(new HttpError(403, "Requête refusée (CSRF)"));
  next();
}

export function publicUser(u) {
  return {
    id: u.id,
    email: u.email,
    fullName: u.full_name,
    avatarUrl: u.avatar_path ? `/api/users/me/avatar?v=${encodeURIComponent(u.avatar_path)}` : null,
    createdAt: u.created_at,
  };
}

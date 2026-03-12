import express from "express";
import cors from "cors";
import multer from "multer";
import axios from "axios";
import FormData from "form-data";
import oracledb from "oracledb";
import { writeFileSync, existsSync, readFileSync, mkdirSync, appendFileSync, unlinkSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { getConnection } from "./db.js";
import { hashPassword, comparePassword, signToken, authMiddleware, verifyToken } from "./auth.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const UPLOAD_CVS = join(__dirname, "uploads", "cvs");
const UPLOAD_AVATARS = join(__dirname, "uploads", "avatars");
const LOG_FILE = join(__dirname, "..", "genesis-logs.txt");
if (!existsSync(UPLOAD_AVATARS)) mkdirSync(UPLOAD_AVATARS, { recursive: true });

function logToFile(level, ...args) {
  const ts = new Date().toISOString();
  const msg = args.map((a) => (typeof a === "object" && a !== null ? (a.stack || JSON.stringify(a)) : String(a))).join(" ");
  const line = `[Backend ${ts}] [${level}] ${msg}\n`;
  try {
    appendFileSync(LOG_FILE, line, "utf8");
  } catch (e) {}
}

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
oracledb.autoCommit = true;

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors({ origin: process.env.CORS_ORIGIN || "http://localhost:5173", credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ----- Logs navigateur (écrit dans genesis-logs.txt)
app.post("/api/log", (req, res) => {
  try {
    const { level, messages } = req.body || {};
    const ts = new Date().toISOString();
    const prefix = `[Browser ${ts}] [${level || "log"}]`;
    const lines = Array.isArray(messages) ? messages : [String(messages ?? "")];
    lines.forEach((msg) => {
      const line = `${prefix} ${typeof msg === "string" ? msg : JSON.stringify(msg)}\n`;
      appendFileSync(LOG_FILE, line, "utf8");
    });
    res.status(204).end();
  } catch (e) {
    res.status(500).end();
  }
});

// Helper: parse CLOB/JSON
function parseJson(val) {
  if (val == null || val === "") return [];
  if (Array.isArray(val)) return val;
  try {
    const v = typeof val === "string" ? val : (val && val.toString?.());
    return v ? JSON.parse(v) : [];
  } catch {
    return [];
  }
}

// ----- AUTH (sans middleware) -----
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "Email et mot de passe requis" });
  let conn;
  try {
    conn = await getConnection();
    const countResult = await conn.execute(`SELECT COUNT(*) AS C FROM USERS`);
    const count = countResult.rows?.[0]?.C ?? 0;
    if (count === 0) {
      const roleResult = await conn.execute(`SELECT ID FROM ROLES WHERE NAME = 'Admin'`);
      const roleId = roleResult.rows?.[0]?.ID ?? 3;
      const hash = hashPassword("admin");
      await conn.execute(
        `INSERT INTO USERS (EMAIL, PASSWORD_HASH, FULL_NAME, ROLE_ID) VALUES (:email, :hash, :name, :roleId)`,
        ["admin@genesis.com", hash, "Administrateur", roleId]
      );
    }
    const userResult = await conn.execute(
      `SELECT U.ID, U.EMAIL, U.FULL_NAME, NVL(U.AVATAR_PATH, '') AS AVATAR_PATH, U.ROLE_ID, R.NAME AS ROLE_NAME FROM USERS U LEFT JOIN ROLES R ON R.ID = U.ROLE_ID WHERE U.EMAIL = :email AND U.ACTIVE = 1`,
      [email]
    );
    const u = userResult.rows?.[0];
    if (!u) return res.status(401).json({ error: "Identifiants incorrects" });
    const passResult = await conn.execute(`SELECT PASSWORD_HASH FROM USERS WHERE ID = :id`, [u.ID]);
    const hash = passResult.rows?.[0]?.PASSWORD_HASH;
    if (!comparePassword(password, hash)) return res.status(401).json({ error: "Identifiants incorrects" });
    const token = signToken({ userId: u.ID, email: u.EMAIL, roleId: u.ROLE_ID, roleName: u.ROLE_NAME || "Recruteur" });
    res.json({
      token,
      user: { id: u.ID, email: u.EMAIL, fullName: u.FULL_NAME, avatarPath: u.AVATAR_PATH || "", roleId: u.ROLE_ID, roleName: u.ROLE_NAME || "Recruteur" },
    });
  } catch (err) {
    if (err.message && err.message.includes("ORA-00942")) {
      return res.status(503).json({ error: "Schéma GRH non installé. Exécutez le script schema-oracle-v2-grh.sql (en tant que propriétaire des tables)." });
    }
    console.error(err);
    res.status(500).json({ error: "Erreur authentification" });
  } finally {
    if (conn) try { await conn.close(); } catch (e) {}
  }
});

app.post("/api/auth/register", async (req, res) => {
  const { email, password, fullName } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "Email et mot de passe requis" });
  const name = (fullName || "").trim().substring(0, 255);
  if (password.length < 6) return res.status(400).json({ error: "Le mot de passe doit contenir au moins 6 caractères" });
  let conn;
  try {
    conn = await getConnection();
    const existing = await conn.execute(`SELECT ID FROM USERS WHERE UPPER(EMAIL) = UPPER(:email)`, [email]);
    if (existing.rows?.length > 0) return res.status(409).json({ error: "Un compte existe déjà avec cet email" });
    const roleResult = await conn.execute(`SELECT ID FROM ROLES WHERE NAME = 'Recruteur'`);
    const roleId = roleResult.rows?.[0]?.ID ?? 1;
    const hash = hashPassword(password);
    await conn.execute(
      `INSERT INTO USERS (EMAIL, PASSWORD_HASH, FULL_NAME, ROLE_ID) VALUES (:email, :hash, :name, :roleId)`,
      [email, hash, name || email.split("@")[0], roleId]
    );
    const userResult = await conn.execute(
      `SELECT U.ID, U.EMAIL, U.FULL_NAME, NVL(U.AVATAR_PATH, '') AS AVATAR_PATH, U.ROLE_ID, R.NAME AS ROLE_NAME FROM USERS U LEFT JOIN ROLES R ON R.ID = U.ROLE_ID WHERE U.EMAIL = :email`,
      [email]
    );
    const u = userResult.rows?.[0];
    if (!u) return res.status(500).json({ error: "Erreur lors de la création du compte" });
    const token = signToken({ userId: u.ID, email: u.EMAIL, roleId: u.ROLE_ID, roleName: u.ROLE_NAME || "Recruteur" });
    res.status(201).json({
      token,
      user: { id: u.ID, email: u.EMAIL, fullName: u.FULL_NAME, avatarPath: u.AVATAR_PATH || "", roleId: u.ROLE_ID, roleName: u.ROLE_NAME || "Recruteur" },
    });
  } catch (err) {
    if (err.message && err.message.includes("ORA-00942")) {
      return res.status(503).json({ error: "Schéma GRH non installé." });
    }
    console.error(err);
    res.status(500).json({ error: "Erreur lors de l'inscription" });
  } finally {
    if (conn) try { await conn.close(); } catch (e) {}
  }
});

app.get("/api/auth/me", authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

// Profil utilisateur (données complètes depuis la BDD, issues de l'inscription)
app.get("/api/users/me", authMiddleware, async (req, res) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ error: "Non authentifié" });
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(
      `SELECT U.ID, U.EMAIL, U.FULL_NAME, NVL(U.AVATAR_PATH, '') AS AVATAR_PATH, U.ROLE_ID, R.NAME AS ROLE_NAME, U.CREATED_AT
       FROM USERS U LEFT JOIN ROLES R ON R.ID = U.ROLE_ID WHERE U.ID = :id AND U.ACTIVE = 1`,
      [userId]
    );
    const u = result.rows?.[0];
    if (!u) return res.status(404).json({ error: "Utilisateur introuvable" });
    res.json({
      id: u.ID,
      email: u.EMAIL || "",
      fullName: u.FULL_NAME || "",
      avatarPath: u.AVATAR_PATH || "",
      roleId: u.ROLE_ID,
      roleName: u.ROLE_NAME || "Recruteur",
      createdAt: u.CREATED_AT ? new Date(u.CREATED_AT).toISOString() : null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  } finally {
    if (conn) try { await conn.close(); } catch (e) {}
  }
});

app.patch("/api/users/me", authMiddleware, async (req, res) => {
  const userId = req.user?.userId;
  const { fullName, email } = req.body || {};
  if (!userId) return res.status(401).json({ error: "Non authentifié" });
  let conn;
  try {
    conn = await getConnection();
    const updates = [];
    const binds = { id: userId };
    if (fullName !== undefined) {
      updates.push("FULL_NAME = :fullName");
      binds.fullName = (fullName || "").substring(0, 255);
    }
    if (email !== undefined && email.trim()) {
      updates.push("EMAIL = :email");
      binds.email = email.trim().substring(0, 255);
    }
    if (updates.length === 0) return res.status(400).json({ error: "Aucune donnée à mettre à jour" });
    await conn.execute(
      `UPDATE USERS SET ${updates.join(", ")} WHERE ID = :id`,
      binds
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur" });
  } finally {
    if (conn) try { await conn.close(); } catch (e) {}
  }
});

// Photo de profil : envoi du fichier
app.post("/api/users/me/avatar", authMiddleware, upload.single("avatar"), async (req, res) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ error: "Non authentifié" });
  const file = req.file;
  if (!file || !file.buffer) return res.status(400).json({ error: "Aucun fichier image envoyé" });
  const ext = (file.originalname && file.originalname.split(".").pop()) || "jpg";
  const safeExt = ["jpg", "jpeg", "png", "gif", "webp"].includes(ext.toLowerCase()) ? ext.toLowerCase() : "jpg";
  const filename = `${userId}_${Date.now()}.${safeExt}`;
  const relPath = `avatars/${filename}`;
  const fullPath = join(UPLOAD_AVATARS, filename);
  let conn;
  try {
    writeFileSync(fullPath, file.buffer);
    conn = await getConnection();
    await conn.execute(
      `UPDATE USERS SET AVATAR_PATH = :path WHERE ID = :id`,
      { path: relPath, id: userId }
    );
    res.json({ ok: true, avatarPath: relPath });
  } catch (err) {
    if (existsSync(fullPath)) try { unlinkSync(fullPath); } catch (e) {}
    console.error(err);
    res.status(500).json({ error: "Erreur lors de l'enregistrement de la photo" });
  } finally {
    if (conn) try { await conn.close(); } catch (e) {}
  }
});

// Photo de profil : récupération (image)
app.get("/api/users/me/avatar", authMiddleware, async (req, res) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(401).end();
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(`SELECT AVATAR_PATH FROM USERS WHERE ID = :id AND ACTIVE = 1`, [userId]);
    const path = result.rows?.[0]?.AVATAR_PATH;
    if (!path) return res.status(404).end();
    const fullPath = join(__dirname, "uploads", path);
    if (!existsSync(fullPath)) return res.status(404).end();
    res.sendFile(fullPath);
  } catch (err) {
    console.error(err);
    res.status(500).end();
  } finally {
    if (conn) try { await conn.close(); } catch (e) {}
  }
});

// Middleware : protéger toutes les routes /api sauf /api/auth/login
app.use("/api", (req, res, next) => {
  if (req.path === "/auth/login" || req.path === "/auth/register" || req.path === "/log" || req.method === "OPTIONS") return next();
  const auth = req.headers.authorization;
  const token = auth && auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Authentification requise" });
  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ error: "Token invalide ou expiré" });
  req.user = payload;
  next();
});

// ----- CANDIDATES -----
const CANDIDATES_COLS = `ID, NAME, EMAIL, PHONE, SKILLS, ORGANIZATIONS, FILENAME, RETAINED, 
  IMPROVEMENT_NOTES, RECRUITER_NOTES, CREATED_AT, NVL(STATUS,'Nouveau') AS STATUS, OFFER_ID, CV_PATH`;

function mapCandidateRow(r) {
  return {
    id: r.ID,
    name: r.NAME || "",
    email: r.EMAIL || "",
    phone: r.PHONE || "",
    skills: parseJson(r.SKILLS),
    organizations: parseJson(r.ORGANIZATIONS),
    filename: r.FILENAME || "",
    retained: r.RETAINED === 1,
    improvement_notes: parseJson(r.IMPROVEMENT_NOTES),
    recruiter_notes: r.RECRUITER_NOTES ?? "",
    dateAdded: r.CREATED_AT ? new Date(r.CREATED_AT).toISOString().slice(0, 10) : "",
    status: r.STATUS || "Nouveau",
    offerId: r.OFFER_ID ?? null,
    cvUrl: (r.FILENAME || r.CV_PATH) ? `/api/candidates/${r.ID}/file` : null,
  };
}

// Liste candidats avec pagination, recherche, filtres
app.get("/api/candidates", async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const offset = (page - 1) * limit;
  const search = (req.query.search || req.query.q || "").trim();
  const status = (req.query.status || "").trim();
  const offerId = req.query.offer_id ? parseInt(req.query.offer_id, 10) : null;
  let conn;
  try {
    conn = await getConnection();
    let where = [];
    const binds = {};
    if (search) {
      where.push("(UPPER(NAME) LIKE :search OR UPPER(EMAIL) LIKE :search OR UPPER(RECRUITER_NOTES) LIKE :search)");
      binds.search = "%" + search.toUpperCase() + "%";
    }
    if (status) {
      where.push("NVL(STATUS,'Nouveau') = :status");
      binds.status = status;
    }
    if (offerId) {
      where.push("OFFER_ID = :offerId");
      binds.offerId = offerId;
    }
    const whereClause = where.length ? " WHERE " + where.join(" AND ") : "";
    const countResult = await conn.execute(
      `SELECT COUNT(*) AS C FROM CANDIDATES ${whereClause}`,
      binds
    );
    const total = countResult.rows?.[0]?.C ?? 0;
    const endRow = offset + limit;
    const result = await conn.execute(
      `SELECT * FROM (SELECT a.*, ROWNUM rnum FROM (SELECT ${CANDIDATES_COLS} FROM CANDIDATES ${whereClause} ORDER BY CREATED_AT DESC) a WHERE ROWNUM <= :endRow) WHERE rnum > :offset`,
      { ...binds, offset, endRow }
    );
    const rows = (result.rows || []).map((r) => mapCandidateRow(r));
    res.json({ data: rows, total, page, limit });
  } catch (err) {
    if (err.message && err.message.includes("ORA-00904")) {
      return listCandidatesLegacy(req, res);
    }
    console.error(err);
    res.status(500).json({ error: "Erreur base de données" });
  } finally {
    if (conn) try { await conn.close(); } catch (e) {}
  }
});

async function listCandidatesLegacy(req, res) {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(
      `SELECT ID, NAME, EMAIL, PHONE, SKILLS, ORGANIZATIONS, FILENAME, RETAINED, IMPROVEMENT_NOTES, RECRUITER_NOTES, CREATED_AT FROM CANDIDATES ORDER BY CREATED_AT DESC`
    );
    const rows = (result.rows || []).map((r) => ({
      id: r.ID, name: r.NAME || "", email: r.EMAIL || "", phone: r.PHONE || "",
      skills: parseJson(r.SKILLS), organizations: parseJson(r.ORGANIZATIONS), filename: r.FILENAME || "",
      retained: r.RETAINED === 1, improvement_notes: parseJson(r.IMPROVEMENT_NOTES), recruiter_notes: r.RECRUITER_NOTES ?? "",
      dateAdded: r.CREATED_AT ? new Date(r.CREATED_AT).toISOString().slice(0, 10) : "", status: "Nouveau", offerId: null,
      cvUrl: r.FILENAME ? `/api/candidates/${r.ID}/file` : null,
    }));
    res.json({ data: rows, total: rows.length, page: 1, limit: rows.length });
  } catch (e) {
    res.status(500).json({ error: "Erreur base de données" });
  } finally {
    if (conn) try { await conn.close(); } catch (e) {}
  }
}

// Un candidat par ID (avec historique si table CANDIDATE_HISTORY)
app.get("/api/candidates/:id", async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(
      `SELECT ID, NAME, EMAIL, PHONE, SKILLS, ORGANIZATIONS, FILENAME, RETAINED, 
              IMPROVEMENT_NOTES, RECRUITER_NOTES, CREATED_AT, NVL(STATUS,'Nouveau') AS STATUS, OFFER_ID, CV_PATH 
       FROM CANDIDATES WHERE ID = :id`,
      [req.params.id]
    );
    const r = result.rows?.[0];
    if (!r) return res.status(404).json({ error: "Candidat introuvable" });
    let history = [];
    try {
      const histResult = await conn.execute(
        `SELECT H.OLD_STATUS, H.NEW_STATUS, H.COMMENT_TEXT, H.CREATED_AT, U.FULL_NAME 
         FROM CANDIDATE_HISTORY H LEFT JOIN USERS U ON U.ID = H.USER_ID WHERE H.CANDIDATE_ID = :id ORDER BY H.CREATED_AT DESC`,
        [req.params.id]
      );
      history = (histResult.rows || []).map((h) => ({
        oldStatus: h.OLD_STATUS,
        newStatus: h.NEW_STATUS,
        comment: h.COMMENT_TEXT ?? "",
        createdAt: h.CREATED_AT ? new Date(h.CREATED_AT).toISOString() : null,
        userFullName: h.FULL_NAME ?? "",
      }));
    } catch (_) {}
    res.json({
      ...mapCandidateRow(r),
      history,
    });
  } catch (err) {
    if (err.message && err.message.includes("ORA-00904") && conn) {
      const leg = await getCandidateLegacy(conn, req.params.id);
      if (leg) return res.json(leg);
      return res.status(404).json({ error: "Candidat introuvable" });
    }
    console.error(err);
    res.status(500).json({ error: "Erreur base de données" });
  } finally {
    if (conn) try { await conn.close(); } catch (e) {}
  }
});

async function getCandidateLegacy(conn, id) {
  const result = await conn.execute(
    `SELECT ID, NAME, EMAIL, PHONE, SKILLS, ORGANIZATIONS, FILENAME, RETAINED, IMPROVEMENT_NOTES, RECRUITER_NOTES, CREATED_AT FROM CANDIDATES WHERE ID = :id`,
    [id]
  );
  const r = result.rows?.[0];
  if (!r) return null;
  return {
    id: r.ID, name: r.NAME || "", email: r.EMAIL || "", phone: r.PHONE || "",
    skills: parseJson(r.SKILLS), organizations: parseJson(r.ORGANIZATIONS), filename: r.FILENAME || "",
    retained: r.RETAINED === 1, improvement_notes: parseJson(r.IMPROVEMENT_NOTES), recruiter_notes: r.RECRUITER_NOTES ?? "",
    dateAdded: r.CREATED_AT ? new Date(r.CREATED_AT).toISOString().slice(0, 10) : "", status: "Nouveau", offerId: null,
    cvUrl: r.FILENAME ? `/api/candidates/${r.ID}/file` : null, history: [],
  };
}

// Mise à jour candidat (notes, statut, offre) + historique si statut changé
app.patch("/api/candidates/:id", async (req, res) => {
  const { recruiter_notes, status, offer_id } = req.body || {};
  const userId = req.user?.userId;
  let conn;
  try {
    conn = await getConnection();
    let currentStatus = null;
    try {
      const cur = await conn.execute(`SELECT NVL(STATUS,'Nouveau') AS S FROM CANDIDATES WHERE ID = :id`, [req.params.id]);
      currentStatus = cur.rows?.[0]?.S;
    } catch (_) {}
    const updates = [];
    const binds = { id: req.params.id };
    if (recruiter_notes !== undefined) {
      updates.push("RECRUITER_NOTES = :recruiter_notes");
      binds.recruiter_notes = recruiter_notes ?? "";
    }
    if (status !== undefined) {
      updates.push("STATUS = :status");
      binds.status = status;
      updates.push("UPDATED_AT = SYSDATE");
      if (userId) updates.push("UPDATED_BY = :userId");
      if (userId) binds.userId = userId;
    }
    if (offer_id !== undefined) {
      updates.push("OFFER_ID = :offer_id");
      binds.offer_id = offer_id || null;
    }
    if (updates.length === 0) return res.status(400).json({ error: "Aucune donnée à mettre à jour" });
    const sql = `UPDATE CANDIDATES SET ${updates.join(", ")} WHERE ID = :id`;
    const result = await conn.execute(sql, binds);
    if (result.rowsAffected === 0) return res.status(404).json({ error: "Candidat introuvable" });
    if (status !== undefined && currentStatus !== null && status !== currentStatus) {
      try {
        await conn.execute(
          `INSERT INTO CANDIDATE_HISTORY (CANDIDATE_ID, OLD_STATUS, NEW_STATUS, USER_ID) VALUES (:cid, :old, :new, :uid)`,
          [req.params.id, currentStatus, status, userId || null]
        );
      } catch (_) {}
    }
    res.json({ ok: true });
  } catch (err) {
    if (conn && err.message && err.message.includes("ORA-00904") && recruiter_notes !== undefined) {
      try {
        const r = await conn.execute(`UPDATE CANDIDATES SET RECRUITER_NOTES = :notes WHERE ID = :id`, [recruiter_notes ?? "", req.params.id]);
        if (r.rowsAffected > 0) return res.json({ ok: true });
      } catch (_) {}
    }
    console.error(err);
    res.status(500).json({ error: "Erreur base de données" });
  } finally {
    if (conn) try { await conn.close(); } catch (e) {}
  }
});

// Téléchargement du CV (fichier sur disque ou 404)
app.get("/api/candidates/:id/file", async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(`SELECT FILENAME, CV_PATH FROM CANDIDATES WHERE ID = :id`, [req.params.id]);
    const r = result.rows?.[0];
    if (!r) return res.status(404).end();
    const pathToFile = r.CV_PATH ? join(__dirname, r.CV_PATH) : join(UPLOAD_CVS, `${req.params.id}_${(r.FILENAME || "cv").replace(/[^a-zA-Z0-9._-]/g, "_")}`);
    if (!existsSync(pathToFile)) return res.status(404).json({ error: "Fichier non trouvé" });
    const buf = readFileSync(pathToFile);
    const name = (r.FILENAME || "cv.pdf").split(/[/\\]/).pop();
    res.setHeader("Content-Disposition", `attachment; filename="${name}"`);
    res.setHeader("Content-Type", "application/octet-stream");
    res.send(buf);
  } catch (err) {
    if (err.message && err.message.includes("ORA-00904")) {
      const result = await conn.execute(`SELECT FILENAME FROM CANDIDATES WHERE ID = :id`, [req.params.id]);
      const r = result.rows?.[0];
      if (r && r.FILENAME) {
        const pathToFile = join(UPLOAD_CVS, `${req.params.id}_${(r.FILENAME || "cv").replace(/[^a-zA-Z0-9._-]/g, "_")}`);
        if (existsSync(pathToFile)) {
          const buf = readFileSync(pathToFile);
          res.setHeader("Content-Disposition", `attachment; filename="${(r.FILENAME || "cv.pdf").split(/[/\\]/).pop()}"`);
          res.setHeader("Content-Type", "application/octet-stream");
          return res.send(buf);
        }
      }
    }
    res.status(404).json({ error: "Fichier non trouvé" });
  } finally {
    if (conn) try { await conn.close(); } catch (e) {}
  }
});

// ----- OFFERS -----
app.get("/api/offers", async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(
      `SELECT ID, TITLE, DESCRIPTION, SKILLS, DEADLINE, STATUS, CREATED_AT FROM OFFERS ORDER BY CREATED_AT DESC`
    );
    const rows = (result.rows || []).map((r) => ({
      id: r.ID,
      title: r.TITLE || "",
      description: r.DESCRIPTION ?? "",
      skills: parseJson(r.SKILLS),
      deadline: r.DEADLINE ? new Date(r.DEADLINE).toISOString().slice(0, 10) : null,
      status: r.STATUS || "ouverte",
      createdAt: r.CREATED_AT ? new Date(r.CREATED_AT).toISOString() : null,
    }));
    res.json(rows);
  } catch (err) {
    if (err.message && err.message.includes("ORA-00942")) return res.json([]);
    console.error(err);
    res.status(500).json({ error: "Erreur base de données" });
  } finally {
    if (conn) try { await conn.close(); } catch (e) {}
  }
});

app.post("/api/offers", async (req, res) => {
  const { title, description, skills, deadline, status } = req.body || {};
  if (!title) return res.status(400).json({ error: "Titre requis" });
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(
      `INSERT INTO OFFERS (TITLE, DESCRIPTION, SKILLS, DEADLINE, STATUS, CREATED_BY) 
       VALUES (:title, :desc, :skills, :deadline, :status, :uid) RETURNING ID INTO :id`,
      {
        title: title.substring(0, 500),
        desc: description ?? "",
        skills: typeof skills === "string" ? skills : JSON.stringify(skills || []),
        deadline: deadline || null,
        status: status || "ouverte",
        uid: req.user?.userId || null,
        id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      }
    );
    const id = result.outBinds?.id?.[0] ?? result.outBinds?.id;
    res.status(201).json({ id, title, status: status || "ouverte" });
  } catch (err) {
    if (err.message && err.message.includes("ORA-00942")) return res.status(503).json({ error: "Table OFFERS non disponible" });
    console.error(err);
    res.status(500).json({ error: "Erreur base de données" });
  } finally {
    if (conn) try { await conn.close(); } catch (e) {}
  }
});

app.get("/api/offers/:id", async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(
      `SELECT ID, TITLE, DESCRIPTION, SKILLS, DEADLINE, STATUS, CREATED_AT FROM OFFERS WHERE ID = :id`,
      [req.params.id]
    );
    const r = result.rows?.[0];
    if (!r) return res.status(404).json({ error: "Offre introuvable" });
    res.json({
      id: r.ID, title: r.TITLE || "", description: r.DESCRIPTION ?? "", skills: parseJson(r.SKILLS),
      deadline: r.DEADLINE ? new Date(r.DEADLINE).toISOString().slice(0, 10) : null,
      status: r.STATUS || "ouverte", createdAt: r.CREATED_AT ? new Date(r.CREATED_AT).toISOString() : null,
    });
  } catch (err) {
    res.status(500).json({ error: "Erreur base de données" });
  } finally {
    if (conn) try { await conn.close(); } catch (e) {}
  }
});

app.put("/api/offers/:id", async (req, res) => {
  const { title, description, skills, deadline, status } = req.body || {};
  let conn;
  try {
    conn = await getConnection();
    await conn.execute(
      `UPDATE OFFERS SET TITLE = :title, DESCRIPTION = :desc, SKILLS = :skills, DEADLINE = :deadline, STATUS = :status, UPDATED_AT = SYSDATE WHERE ID = :id`,
      [
        (title ?? "").substring(0, 500),
        description ?? "",
        typeof skills === "string" ? skills : JSON.stringify(skills || []),
        deadline || null,
        status ?? "ouverte",
        req.params.id,
      ]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Erreur base de données" });
  } finally {
    if (conn) try { await conn.close(); } catch (e) {}
  }
});

app.delete("/api/offers/:id", async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(`DELETE FROM OFFERS WHERE ID = :id`, [req.params.id]);
    if (result.rowsAffected === 0) return res.status(404).json({ error: "Offre introuvable" });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Erreur base de données" });
  } finally {
    if (conn) try { await conn.close(); } catch (e) {}
  }
});

// ----- CRITERIA TEMPLATES -----
app.get("/api/criteria-templates", async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(`SELECT ID, NAME, SKILLS, CREATED_AT FROM CRITERIA_TEMPLATES ORDER BY NAME`);
    const rows = (result.rows || []).map((r) => ({
      id: r.ID,
      name: r.NAME || "",
      skills: parseJson(r.SKILLS),
      createdAt: r.CREATED_AT ? new Date(r.CREATED_AT).toISOString() : null,
    }));
    res.json(rows);
  } catch (err) {
    if (err.message && err.message.includes("ORA-00942")) return res.json([]);
    res.status(500).json({ error: "Erreur base de données" });
  } finally {
    if (conn) try { await conn.close(); } catch (e) {}
  }
});

app.post("/api/criteria-templates", async (req, res) => {
  const { name, skills } = req.body || {};
  if (!name) return res.status(400).json({ error: "Nom requis" });
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(
      `INSERT INTO CRITERIA_TEMPLATES (NAME, SKILLS) VALUES (:name, :skills) RETURNING ID INTO :id`,
      {
        name: name.substring(0, 255),
        skills: typeof skills === "string" ? skills : JSON.stringify(skills || []),
        id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      }
    );
    const id = result.outBinds?.id?.[0] ?? result.outBinds?.id;
    res.status(201).json({ id, name });
  } catch (err) {
    if (err.message && err.message.includes("ORA-00942")) return res.status(503).json({ error: "Table CRITERIA_TEMPLATES non disponible" });
    res.status(500).json({ error: "Erreur base de données" });
  } finally {
    if (conn) try { await conn.close(); } catch (e) {}
  }
});

// Analyse CV : envoi au service Python puis sauvegarde en base
app.post("/api/analyze", upload.array("file"), async (req, res) => {
  const files = req.files || [];
  const criteriaRaw = req.body?.criteria || "{}";
  const offerId = req.body?.offer_id ? parseInt(req.body.offer_id, 10) : null;
  if (!files.length) return res.status(400).json({ error: "Aucun fichier" });

  let criteriaData = {};
  try {
    criteriaData = typeof criteriaRaw === "string" ? JSON.parse(criteriaRaw) : criteriaRaw;
  } catch (e) {}

  const results = [];
  const pythonUrl = process.env.PYTHON_ANALYZE_URL || "http://localhost:5001/analyze";

  for (const file of files) {
    if (!file.originalname || (!file.originalname.toLowerCase().endsWith(".pdf") && !file.originalname.toLowerCase().endsWith(".docx"))) {
      results.push({ filename: file.originalname, error: "Type non supporté (PDF ou DOCX)" });
      continue;
    }
    try {
      const form = new FormData();
      form.append("file", file.buffer, { filename: file.originalname });
      form.append("criteria", JSON.stringify(criteriaData));
      const response = await axios.post(pythonUrl, form, {
        headers: form.getHeaders(),
        maxBodyLength: Infinity,
      });
      const data = response.data;
      if (data.error) {
        results.push({ filename: file.originalname, error: data.error });
        continue;
      }
      const resultsList = data.results || [data];
      for (const one of resultsList) {
        const retained = one.retained === true ? 1 : 0;
        const name = (one.persons && one.persons.length) ? one.persons.join(" ") : "Candidat";
        const skillsJson = JSON.stringify(one.skills || []);
        const orgsJson = JSON.stringify(one.organizations || []);
        const impJson = JSON.stringify(one.improvement_notes || []);
        const emailVal = (one.emails && one.emails[0]) ? one.emails[0].substring(0, 500) : null;
        const phoneVal = (one.phones && one.phones[0]) ? one.phones[0].substring(0, 100) : null;
        const filenameVal = (one.filename || file.originalname || "").substring(0, 500);
        let conn;
        try {
          conn = await getConnection();
          const bind = {
            name: name.substring(0, 500),
            email: emailVal,
            phone: phoneVal,
            skills: skillsJson,
            orgs: orgsJson,
            filename: filenameVal,
            retained,
            imp: impJson,
            offerId: offerId || null,
            createdBy: req.user?.userId || null,
            id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
          };
          let insertSql = `INSERT INTO CANDIDATES (NAME, EMAIL, PHONE, SKILLS, ORGANIZATIONS, FILENAME, RETAINED, IMPROVEMENT_NOTES, OFFER_ID, CREATED_BY)
             VALUES (:name, :email, :phone, :skills, :orgs, :filename, :retained, :imp, :offerId, :createdBy)
             RETURNING ID INTO :id`;
          try {
            await conn.execute(insertSql, bind);
          } catch (e) {
            if (e.message && e.message.includes("ORA-00904")) {
              delete bind.offerId;
              delete bind.createdBy;
              insertSql = `INSERT INTO CANDIDATES (NAME, EMAIL, PHONE, SKILLS, ORGANIZATIONS, FILENAME, RETAINED, IMPROVEMENT_NOTES)
             VALUES (:name, :email, :phone, :skills, :orgs, :filename, :retained, :imp)
             RETURNING ID INTO :id`;
              await conn.execute(insertSql, bind);
            } else throw e;
          }
          const id = bind.id;
          try {
            if (!existsSync(UPLOAD_CVS)) mkdirSync(UPLOAD_CVS, { recursive: true });
            const safeName = (one.filename || file.originalname || "cv").replace(/[^a-zA-Z0-9._-]/g, "_");
            const relPath = join("uploads", "cvs", `${id}_${safeName}`);
            writeFileSync(join(__dirname, relPath), file.buffer);
            await conn.execute(`UPDATE CANDIDATES SET CV_PATH = :path WHERE ID = :id`, [relPath, id]);
          } catch (e) {
            console.warn("Sauvegarde fichier CV:", e.message);
          }
          results.push({
            ...one,
            id,
            filename: one.filename || file.originalname,
          });
        } finally {
          if (conn) try { await conn.close(); } catch (e) {}
        }
      }
      if (resultsList.length === 0) {
        results.push({
          filename: file.originalname,
          emails: data.emails || [],
          phones: data.phones || [],
          skills: data.skills || [],
          persons: data.persons || [],
          organizations: data.organizations || [],
          retained: data.retained === true,
          improvement_notes: data.improvement_notes || [],
        });
      }
    } catch (err) {
      console.error(err);
      results.push({
        filename: file.originalname,
        error: err.response?.data?.error || err.message || "Erreur analyse",
      });
    }
  }

  res.json({ results });
});

// ----- DASHBOARD -----

function getConfig(conn, key) {
  return conn.execute(
    `SELECT CONFIG_VALUE FROM DASHBOARD_CONFIG WHERE CONFIG_KEY = :k`,
    [key]
  ).then((r) => r.rows?.[0]?.CONFIG_VALUE);
}

// Métriques (CV analysés, en attente, évolutions)
app.get("/api/dashboard/metrics", async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const [totalResult, retainedResult, rejectedResult] = await Promise.all([
      conn.execute(`SELECT COUNT(*) AS C FROM CANDIDATES`),
      conn.execute(`SELECT COUNT(*) AS C FROM CANDIDATES WHERE RETAINED = 1`),
      conn.execute(`SELECT COUNT(*) AS C FROM CANDIDATES WHERE RETAINED = 0`),
    ]);
    const total = totalResult.rows?.[0]?.C ?? 0;
    const retained = retainedResult.rows?.[0]?.C ?? 0;
    const rejected = rejectedResult.rows?.[0]?.C ?? 0;
    const ev1 = await getConfig(conn, "evolution_cv_analyses_pct");
    const ev2 = await getConfig(conn, "evolution_en_attente_pct");
    res.json({
      cvAnalyses: total,
      cvAnalysesEvolution: ev1 != null ? parseFloat(ev1) : 15.5,
      enAttente: rejected,
      enAttenteEvolution: ev2 != null ? parseFloat(ev2) : -3.2,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur base de données" });
  } finally {
    if (conn) try { await conn.close(); } catch (e) {}
  }
});

// Données graphique mensuelle (CV acceptés par mois, année en cours)
app.get("/api/dashboard/monthly-chart", async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(
      `SELECT EXTRACT(MONTH FROM CREATED_AT) AS M, COUNT(*) AS C
       FROM CANDIDATES WHERE RETAINED = 1 AND CREATED_AT >= TRUNC(SYSDATE, 'YEAR')
       GROUP BY EXTRACT(MONTH FROM CREATED_AT) ORDER BY M`
    );
    const months = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];
    const byMonth = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    (result.rows || []).forEach((r) => {
      const m = (Number(r.M) || 1) - 1;
      if (m >= 0 && m < 12) byMonth[m] = Number(r.C) || 0;
    });
    res.json({
      categories: months,
      data: byMonth,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur base de données" });
  } finally {
    if (conn) try { await conn.close(); } catch (e) {}
  }
});

// Objectifs (objectif mensuel, analysés ce mois, aujourd'hui)
app.get("/api/dashboard/targets", async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const objectif = await getConfig(conn, "objectif_mensuel");
    const monthResult = await conn.execute(
      `SELECT COUNT(*) AS C FROM CANDIDATES 
       WHERE CREATED_AT >= TRUNC(SYSDATE, 'MM') AND RETAINED = 1`
    );
    const todayResult = await conn.execute(
      `SELECT COUNT(*) AS C FROM CANDIDATES 
       WHERE TRUNC(CREATED_AT) = TRUNC(SYSDATE) AND RETAINED = 1`
    );
    res.json({
      objectifMensuel: objectif != null ? parseInt(objectif, 10) : 500,
      analysesCeMois: monthResult.rows?.[0]?.C ?? 0,
      aujourdhui: todayResult.rows?.[0]?.C ?? 0,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur base de données" });
  } finally {
    if (conn) try { await conn.close(); } catch (e) {}
  }
});

// Pipeline (répartition par statut)
app.get("/api/dashboard/pipeline", async (req, res) => {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute(
      `SELECT NVL(STATUS,'Nouveau') AS S, COUNT(*) AS C FROM CANDIDATES GROUP BY NVL(STATUS,'Nouveau') ORDER BY C DESC`
    );
    const byStatus = (result.rows || []).map((r) => ({ status: r.S, count: r.C }));
    res.json(byStatus);
  } catch (err) {
    if (err.message && err.message.includes("ORA-00904")) return res.json([]);
    res.status(500).json({ error: "Erreur base de données" });
  } finally {
    if (conn) try { await conn.close(); } catch (e) {}
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  const msg = `Serveur lance sur port ${PORT}`;
  console.log(msg);
  logToFile("info", msg);
});

process.on("uncaughtException", (err) => {
  logToFile("error", "uncaughtException", err?.message || err, err?.stack);
  console.error(err);
});
process.on("unhandledRejection", (reason, promise) => {
  logToFile("error", "unhandledRejection", String(reason));
});

const origConsoleError = console.error;
console.error = (...args) => {
  logToFile("error", ...args);
  origConsoleError.apply(console, args);
};

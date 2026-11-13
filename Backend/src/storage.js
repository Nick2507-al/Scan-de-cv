import { randomUUID, createHash } from "node:crypto";
import { mkdir, writeFile, unlink, stat } from "node:fs/promises";
import { join, resolve, sep } from "node:path";
import { config } from "./config.js";

const ROOT = resolve(config.uploadDir);

/** Chemin relatif sûr (user/kind/uuid.ext) : le nom fourni par le client n'est jamais utilisé. */
export async function saveFile(userId, kind, buffer, ext) {
  const safeExt = /^[a-z0-9]{1,5}$/.test(ext) ? ext : "bin";
  const rel = join(String(userId), kind, `${randomUUID()}.${safeExt}`);
  const abs = resolveStored(rel);
  await mkdir(join(ROOT, String(userId), kind), { recursive: true });
  await writeFile(abs, buffer, { flag: "wx" });
  return rel.split(sep).join("/");
}

/** Résout un chemin stocké en base et refuse tout ce qui sortirait du dossier d'upload. */
export function resolveStored(rel) {
  const abs = resolve(ROOT, rel);
  if (abs !== ROOT && !abs.startsWith(ROOT + sep)) throw new Error("Chemin de fichier hors du stockage");
  return abs;
}

export async function removeStored(rel) {
  if (!rel) return;
  try {
    await unlink(resolveStored(rel));
  } catch (err) {
    if (err.code !== "ENOENT") console.error("[storage] suppression impossible :", err.message);
  }
}

export async function storedExists(rel) {
  try {
    return (await stat(resolveStored(rel))).isFile();
  } catch {
    return false;
  }
}

export const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");

// Signatures binaires (« magic bytes ») : le type réel du fichier, pas son extension déclarée.
const SIGNATURES = [
  { mime: "application/pdf", ext: "pdf", test: (b) => b.subarray(0, 5).toString("latin1") === "%PDF-" },
  { mime: "image/png", ext: "png", test: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { mime: "image/jpeg", ext: "jpg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: "image/webp", ext: "webp", test: (b) => b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP" },
  { mime: "image/gif", ext: "gif", test: (b) => /^GIF8[79]a/.test(b.subarray(0, 6).toString("latin1")) },
  { mime: "image/tiff", ext: "tif", test: (b) => ["49492a00", "4d4d002a"].includes(b.subarray(0, 4).toString("hex")) },
  { mime: "image/bmp", ext: "bmp", test: (b) => b.subarray(0, 2).toString("latin1") === "BM" },
  { mime: "application/rtf", ext: "rtf", test: (b) => b.subarray(0, 5).toString("latin1") === "{\\rtf" },
  { mime: "application/x-ole-storage", ext: "ole", test: (b) => b.subarray(0, 8).toString("hex") === "d0cf11e0a1b11ae1" },
  { mime: "application/zip", ext: "zip", test: (b) => b.subarray(0, 4).toString("hex") === "504b0304" },
];

export function sniff(buffer) {
  for (const s of SIGNATURES) if (buffer.length >= 12 && s.test(buffer)) return s;
  return null;
}

const ZIP_FORMATS = { docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  odt: "application/vnd.oasis.opendocument.text", ods: "application/vnd.oasis.opendocument.spreadsheet" };
const OLE_FORMATS = { doc: "application/msword", xls: "application/vnd.ms-excel" };
const TEXT_FORMATS = { txt: "text/plain", md: "text/markdown", csv: "text/csv", html: "text/html", htm: "text/html", json: "application/json" };
const IMAGE_EXT = { png: "png", jpg: "jpg", jpeg: "jpg", webp: "webp", tif: "tif", tiff: "tif", bmp: "bmp", gif: "gif" };

export const ACCEPTED_CV_EXTENSIONS = [
  "pdf", ...Object.keys(ZIP_FORMATS), ...Object.keys(OLE_FORMATS), "rtf", ...Object.keys(TEXT_FORMATS), ...Object.keys(IMAGE_EXT),
];

function looksLikeText(buffer) {
  const sample = buffer.subarray(0, 4096);
  let control = 0;
  for (const byte of sample) if (byte === 0 || (byte < 9) || (byte > 13 && byte < 32)) control++;
  return control / Math.max(sample.length, 1) < 0.02;
}

/**
 * Détermine le format d'un CV en croisant extension et contenu réel.
 * Retourne { ext, mime } ou null si le fichier est refusé (exécutable déguisé, etc.).
 */
export function detectCvFormat(originalName, buffer) {
  const ext = (originalName.split(".").pop() || "").toLowerCase();
  if (!ACCEPTED_CV_EXTENSIONS.includes(ext) || buffer.length === 0) return null;
  const sig = sniff(buffer);
  if (ext === "pdf") return sig?.ext === "pdf" ? { ext, mime: sig.mime } : null;
  if (ZIP_FORMATS[ext]) return sig?.ext === "zip" ? { ext, mime: ZIP_FORMATS[ext] } : null;
  if (OLE_FORMATS[ext]) return sig?.ext === "ole" ? { ext, mime: OLE_FORMATS[ext] } : null;
  if (ext === "rtf") return sig?.ext === "rtf" ? { ext, mime: sig.mime } : null;
  if (IMAGE_EXT[ext]) return sig && sig.ext === IMAGE_EXT[ext] ? { ext, mime: sig.mime } : null;
  if (TEXT_FORMATS[ext]) return !sig && looksLikeText(buffer) ? { ext, mime: TEXT_FORMATS[ext] } : null;
  return null;
}

"""
Extraction de texte multi-format, robuste et sûre.

Formats : PDF, DOCX, DOC, ODT, RTF, TXT/MD, CSV, HTML, JSON, XLSX, XLS, ODS, PPTX, images.
- Les archives (DOCX/XLSX/ODT/PPTX) sont contrôlées contre les « zip bombs ».
- Les PDF scannés et les images passent par l'OCR distant (service ML) si disponible.
"""
from __future__ import annotations

import csv
import html
import io
import json
import re
import zipfile
from dataclasses import dataclass, field
from xml.etree import ElementTree as ET

from charset_normalizer import from_bytes

MAX_UNCOMPRESSED = 60 * 1024 * 1024   # 60 Mo décompressés au maximum
MAX_RATIO = 120                        # ratio de compression suspect
MAX_ZIP_ENTRIES = 3000
MAX_TEXT_CHARS = 400_000
MAX_PDF_PAGES = 40


class ExtractionError(Exception):
    """Erreur présentable à l'utilisateur."""


@dataclass
class Extracted:
    text: str
    method: str
    pages: int = 0
    warnings: list[str] = field(default_factory=list)
    needs_ocr: bool = False


# --------------------------------------------------------------------------- utilitaires

def _check_zip(data: bytes) -> zipfile.ZipFile:
    try:
        zf = zipfile.ZipFile(io.BytesIO(data))
    except zipfile.BadZipFile as exc:
        raise ExtractionError("Archive Office corrompue") from exc
    infos = zf.infolist()
    if len(infos) > MAX_ZIP_ENTRIES:
        raise ExtractionError("Fichier refusé : archive anormalement complexe")
    total = sum(i.file_size for i in infos)
    packed = max(sum(i.compress_size for i in infos), 1)
    if total > MAX_UNCOMPRESSED or total / packed > MAX_RATIO:
        raise ExtractionError("Fichier refusé : taux de compression suspect (zip bomb)")
    return zf


def _safe_xml(raw: bytes) -> ET.Element:
    # Refuse DTD/entités (XXE, « billion laughs ») avant tout parsing.
    head = raw[:4096].upper()
    if b"<!DOCTYPE" in head or b"<!ENTITY" in raw.upper():
        raise ExtractionError("Fichier refusé : déclaration XML interdite")
    return ET.fromstring(raw)


def decode_text(data: bytes) -> str:
    for bom, enc in ((b"\xef\xbb\xbf", "utf-8"), (b"\xff\xfe", "utf-16-le"), (b"\xfe\xff", "utf-16-be")):
        if data.startswith(bom):
            return data[len(bom):].decode(enc, errors="replace")
    try:
        return data.decode("utf-8")
    except UnicodeDecodeError:
        best = from_bytes(data).best()
        return str(best) if best else data.decode("latin-1", errors="replace")


def _local(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


# --------------------------------------------------------------------------- formats

def _pdf(data: bytes) -> Extracted:
    from pdfminer.high_level import extract_text
    from pdfminer.layout import LAParams
    from pdfminer.pdfpage import PDFPage
    from pdfminer.pdfparser import PDFSyntaxError

    try:
        pages = sum(1 for _ in PDFPage.get_pages(io.BytesIO(data), maxpages=MAX_PDF_PAGES + 1))
    except PDFSyntaxError as exc:
        raise ExtractionError("PDF corrompu ou illisible") from exc
    except Exception as exc:  # PDF chiffré, etc.
        if "encrypt" in str(exc).lower() or "password" in str(exc).lower():
            raise ExtractionError("PDF protégé par mot de passe") from exc
        raise ExtractionError("PDF illisible") from exc
    warnings = []
    if pages > MAX_PDF_PAGES:
        warnings.append(f"Seules les {MAX_PDF_PAGES} premières pages ont été lues")
    # boxes_flow=None : lecture ligne par ligne, plus fiable sur les CV en colonnes.
    text = extract_text(io.BytesIO(data), maxpages=MAX_PDF_PAGES, laparams=LAParams(boxes_flow=None, line_margin=0.4))
    text = text.replace("\x0c", "\n")
    meaningful = len(re.findall(r"[A-Za-zÀ-ÿ]", text))
    return Extracted(text, "pdf", pages=min(pages, MAX_PDF_PAGES), warnings=warnings,
                     needs_ocr=meaningful < 80 * max(1, min(pages, 3)) * 0.5)


def _docx(data: bytes) -> Extracted:
    zf = _check_zip(data)
    parts = []
    names = zf.namelist()
    order = ["word/document.xml"] + sorted(n for n in names if re.match(r"word/(header|footer)\d*\.xml$", n))
    order += [n for n in ("word/footnotes.xml", "word/endnotes.xml") if n in names]
    if "word/document.xml" not in names:
        raise ExtractionError("Document Word invalide")
    for name in order:
        root = _safe_xml(zf.read(name))
        for para in root.iter():
            if _local(para.tag) != "p":
                continue
            buf = []
            for node in para.iter():
                t = _local(node.tag)
                if t == "t" and node.text:
                    buf.append(node.text)
                elif t == "tab":
                    buf.append("\t")
                elif t in ("br", "cr"):
                    buf.append("\n")
            line = "".join(buf).strip()
            if line:
                parts.append(line)
    # Zones de texte (CV « design ») : contenues dans document.xml, déjà parcourues ci-dessus.
    return Extracted("\n".join(parts), "docx")


def _odf(data: bytes, method: str) -> Extracted:
    zf = _check_zip(data)
    if "content.xml" not in zf.namelist():
        raise ExtractionError("Document OpenDocument invalide")
    root = _safe_xml(zf.read("content.xml"))
    lines = []
    for el in root.iter():
        if _local(el.tag) in ("p", "h"):
            txt = "".join(el.itertext()).strip()
            if txt:
                lines.append(txt)
    return Extracted("\n".join(lines), method)


def _pptx(data: bytes) -> Extracted:
    zf = _check_zip(data)
    slides = sorted((n for n in zf.namelist() if re.match(r"ppt/slides/slide\d+\.xml$", n)),
                    key=lambda n: int(re.findall(r"\d+", n)[-1]))
    lines = []
    for name in slides:
        root = _safe_xml(zf.read(name))
        for para in root.iter():
            if _local(para.tag) == "p":
                txt = "".join(t.text or "" for t in para.iter() if _local(t.tag) == "t").strip()
                if txt:
                    lines.append(txt)
    return Extracted("\n".join(lines), "pptx")


def _xlsx(data: bytes) -> Extracted:
    _check_zip(data)
    from openpyxl import load_workbook
    wb = load_workbook(io.BytesIO(data), read_only=True, data_only=True)
    lines = []
    for ws in wb.worksheets[:20]:
        for i, row in enumerate(ws.iter_rows(values_only=True)):
            if i > 5000:
                break
            cells = [str(c).strip() for c in row if c is not None and str(c).strip()]
            if cells:
                lines.append(" | ".join(cells))
    wb.close()
    return Extracted("\n".join(lines), "xlsx")


def _xls(data: bytes) -> Extracted:
    import xlrd
    try:
        book = xlrd.open_workbook(file_contents=data, on_demand=True)
    except xlrd.biffh.XLRDError as exc:
        raise ExtractionError("Classeur Excel illisible") from exc
    lines = []
    for sheet in book.sheets()[:20]:
        for r in range(min(sheet.nrows, 5000)):
            cells = [str(v).strip() for v in sheet.row_values(r) if str(v).strip()]
            if cells:
                lines.append(" | ".join(cells))
    return Extracted("\n".join(lines), "xls")


def _doc(data: bytes) -> Extracted:
    """Word 97-2003 : lecture du flux WordDocument (texte Unicode ou 8 bits)."""
    import olefile
    if not olefile.isOleFile(io.BytesIO(data)):
        raise ExtractionError("Document Word 97 invalide")
    ole = olefile.OleFileIO(io.BytesIO(data))
    if not ole.exists("WordDocument"):
        # Un .xls renommé en .doc, par exemple.
        raise ExtractionError("Ce fichier .doc n'est pas un document Word")
    stream = ole.openstream("WordDocument").read()
    # Heuristique fiable sur la grande majorité des .doc : suites de caractères UTF-16LE imprimables.
    utf16 = re.findall(rb"(?:[\x20-\x7e\xa0-\xff]\x00|[\x00-\xff][\x01-\x05]|\r\x00|\t\x00){4,}", stream)
    text16 = "\n".join(chunk.decode("utf-16-le", errors="ignore") for chunk in utf16)
    text8 = "\n".join(m.decode("cp1252", errors="ignore") for m in re.findall(rb"[\x20-\x7e\xc0-\xff\r\t]{6,}", stream))
    text = text16 if len(text16) >= len(text8) * 0.6 else text8
    text = re.sub(r"\r", "\n", text)
    return Extracted(text, "doc", warnings=["Format Word 97-2003 : convertissez en DOCX/PDF pour une précision maximale"])


def _rtf(data: bytes) -> Extracted:
    from striprtf.striprtf import rtf_to_text
    return Extracted(rtf_to_text(decode_text(data), errors="ignore"), "rtf")


class _HTMLText:
    @staticmethod
    def convert(raw: str) -> str:
        raw = re.sub(r"(?is)<(script|style|noscript|template)[^>]*>.*?</\1>", " ", raw)
        raw = re.sub(r"(?i)<br\s*/?>|</(p|div|li|h[1-6]|tr|section|article)>", "\n", raw)
        raw = re.sub(r"(?s)<[^>]+>", " ", raw)
        return html.unescape(raw)


def _csv(data: bytes) -> Extracted:
    text = decode_text(data)
    try:
        dialect = csv.Sniffer().sniff(text[:4096], delimiters=",;\t|")
        rows = csv.reader(io.StringIO(text), dialect)
        lines = [" | ".join(c.strip() for c in row if c.strip()) for row in rows]
        return Extracted("\n".join(l for l in lines if l), "csv")
    except csv.Error:
        return Extracted(text, "csv")


def _json(data: bytes) -> Extracted:
    try:
        obj = json.loads(decode_text(data))
    except json.JSONDecodeError as exc:
        raise ExtractionError("JSON invalide") from exc
    out = []

    def walk(o, key=""):
        if isinstance(o, dict):
            for k, v in o.items():
                walk(v, k)
        elif isinstance(o, list):
            for v in o:
                walk(v, key)
        elif o is not None:
            out.append(f"{key}: {o}" if key else str(o))
    walk(obj)
    return Extracted("\n".join(out), "json")


IMAGE_EXT = {"png", "jpg", "jpeg", "webp", "tif", "tiff", "bmp", "gif"}

_HANDLERS = {
    "pdf": _pdf, "docx": _docx, "doc": _doc, "rtf": _rtf, "pptx": _pptx,
    "odt": lambda d: _odf(d, "odt"), "ods": lambda d: _odf(d, "ods"),
    "xlsx": _xlsx, "xls": _xls, "csv": _csv, "json": _json,
    "txt": lambda d: Extracted(decode_text(d), "txt"),
    "md": lambda d: Extracted(decode_text(d), "md"),
    "html": lambda d: Extracted(_HTMLText.convert(decode_text(d)), "html"),
    "htm": lambda d: Extracted(_HTMLText.convert(decode_text(d)), "html"),
}

SUPPORTED_EXTENSIONS = sorted(set(_HANDLERS) | IMAGE_EXT)


def clean_text(text: str) -> str:
    text = text.replace("­", "")                      # césure invisible
    text = re.sub(r"[​-‏﻿]", "", text)      # caractères de largeur nulle
    text = text.replace(" ", " ").replace(" ", " ").replace(" ", " ")
    text = re.sub(r"[‐-―−]", "-", text)      # tirets typographiques
    text = re.sub(r"[‘’‛]", "'", text)
    text = re.sub(r"(?<=\w)-\n(?=[a-zà-ÿ])", "", text)     # mots coupés en fin de ligne
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n\s*\n\s*\n+", "\n\n", text)
    return text.strip()[:MAX_TEXT_CHARS]


def extract(filename: str, data: bytes, ocr=None) -> Extracted:
    """
    Extrait le texte d'un fichier. `ocr(data, filename) -> str|None` est appelé pour les images
    et les PDF sans couche texte (scans).
    """
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext in IMAGE_EXT:
        if not ocr:
            raise ExtractionError("Image : l'OCR distant est indisponible, envoyez le CV en PDF/DOCX")
        text = ocr(data, filename)
        if not text:
            raise ExtractionError("Aucun texte reconnu dans l'image")
        return Extracted(clean_text(text), "ocr-image")
    handler = _HANDLERS.get(ext)
    if not handler:
        raise ExtractionError(f"Format .{ext or '?'} non pris en charge")
    try:
        result = handler(data)
    except ExtractionError:
        raise
    except Exception as exc:  # bibliothèque tierce : on ne divulgue pas la trace
        raise ExtractionError(f"Fichier .{ext} illisible ou corrompu") from exc
    result.text = clean_text(result.text)
    if ext == "pdf" and result.needs_ocr:
        scanned = ocr(data, filename) if ocr else None
        if scanned and len(scanned.strip()) > len(result.text):
            result.text = clean_text(scanned)
            result.method = "ocr-pdf"
        elif not result.text:
            raise ExtractionError("PDF scanné sans texte : OCR indisponible pour le moment")
        else:
            result.warnings.append("PDF partiellement scanné : certaines informations peuvent manquer")
    if not result.text:
        raise ExtractionError("Le fichier ne contient aucun texte exploitable")
    return result

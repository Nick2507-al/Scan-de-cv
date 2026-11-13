"""Génération de CV de test dans tous les formats pris en charge (aucun fichier binaire versionné)."""
from __future__ import annotations

import io
import json
import zipfile

CV_LINES = [
    "Aminata DIALLO",
    "Développeuse Full-Stack",
    "Brazzaville, Congo",
    "aminata.diallo@example.com | +242 06 612 34 56",
    "linkedin.com/in/aminata-diallo",
    "",
    "PROFIL",
    "Développeuse passionnée, 5 ans d'expérience en applications web.",
    "",
    "EXPÉRIENCE PROFESSIONNELLE",
    "Développeuse Full-Stack — Société Congolaise de Logiciels",
    "Janvier 2021 - Aujourd'hui",
    "Conception d'API REST avec Node.js et Express, interfaces React et TypeScript.",
    "Mise en place de pipelines CI/CD avec Docker et GitLab CI.",
    "Développeuse Web — Agence Digitale Pointe-Noire",
    "03/2019 – 12/2020",
    "Sites WordPress et applications PHP / Laravel, base de données MySQL.",
    "",
    "FORMATION",
    "Master Informatique — Université Marien Ngouabi, 2018",
    "Licence Mathématiques-Informatique, 2016",
    "",
    "COMPÉTENCES",
    "JavaScript, TypeScript, React, Node.js, PostgreSQL, Git, Scrum, Excel",
    "",
    "LANGUES",
    "Français : langue maternelle",
    "Anglais : courant (C1)",
    "Lingala : natif",
    "",
    "CENTRES D'INTÉRÊT",
    "Lecture, football, bénévolat",
]
CV_TEXT = "\n".join(CV_LINES)


def txt() -> bytes:
    return CV_TEXT.encode("utf-8")


def txt_utf16() -> bytes:
    return CV_TEXT.encode("utf-16")  # avec BOM


def _zip(files: dict[str, str]) -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        for name, content in files.items():
            z.writestr(name, content)
    return buf.getvalue()


def _esc(s: str) -> str:
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def docx() -> bytes:
    paras = "".join(f'<w:p><w:r><w:t xml:space="preserve">{_esc(l)}</w:t></w:r></w:p>' for l in CV_LINES)
    doc = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
           '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
           f"<w:body>{paras}</w:body></w:document>")
    return _zip({
        "[Content_Types].xml": '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
                               '<Default Extension="xml" ContentType="application/xml"/></Types>',
        "word/document.xml": doc,
    })


def odt() -> bytes:
    paras = "".join(f"<text:p>{_esc(l)}</text:p>" for l in CV_LINES)
    content = ('<?xml version="1.0" encoding="UTF-8"?><office:document-content '
               'xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" '
               'xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0">'
               f"<office:body><office:text>{paras}</office:text></office:body></office:document-content>")
    return _zip({"mimetype": "application/vnd.oasis.opendocument.text", "content.xml": content})


def xlsx() -> bytes:
    from openpyxl import Workbook
    wb = Workbook()
    ws = wb.active
    for line in CV_LINES:
        ws.append([line])
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


def csv_file() -> bytes:
    return "\n".join(f'"{l}"' for l in CV_LINES).encode("utf-8")


def html_file() -> bytes:
    body = "".join(f"<p>{_esc(l)}</p>" for l in CV_LINES)
    return f"<html><head><style>p{{color:red}}</style><script>alert(1)</script></head><body>{body}</body></html>".encode()


def rtf() -> bytes:
    def enc(s: str) -> str:
        return "".join(c if ord(c) < 128 else f"\\u{ord(c)}?" for c in s.replace("\\", "\\\\").replace("{", "\\{").replace("}", "\\}"))
    return ("{\\rtf1\\ansi\\deff0 " + "".join(enc(l) + "\\par\n" for l in CV_LINES) + "}").encode("ascii")


def json_file() -> bytes:
    return json.dumps({"cv": CV_LINES}, ensure_ascii=False).encode("utf-8")


def pdf() -> bytes:
    """PDF minimal valide, texte en WinAnsi (accents conservés)."""
    lines = []
    y = 800
    for l in CV_LINES:
        safe = l.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)").replace("—", "-").replace("–", "-")
        lines.append(f"BT /F1 10 Tf 40 {y} Td ({safe}) Tj ET")
        y -= 14
    stream = "\n".join(lines).encode("cp1252")
    objs = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
        b"<< /Length " + str(len(stream)).encode() + b" >>\nstream\n" + stream + b"\nendstream",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    ]
    out = io.BytesIO()
    out.write(b"%PDF-1.4\n")
    offsets = []
    for i, o in enumerate(objs, 1):
        offsets.append(out.tell())
        out.write(f"{i} 0 obj\n".encode() + o + b"\nendobj\n")
    xref = out.tell()
    out.write(f"xref\n0 {len(objs) + 1}\n0000000000 65535 f \n".encode())
    for off in offsets:
        out.write(f"{off:010d} 00000 n \n".encode())
    out.write(f"trailer << /Size {len(objs) + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF".encode())
    return out.getvalue()


ALL_FORMATS = {
    "cv.txt": txt, "cv-utf16.txt": txt_utf16, "cv.docx": docx, "cv.odt": odt, "cv.xlsx": xlsx,
    "cv.csv": csv_file, "cv.html": html_file, "cv.rtf": rtf, "cv.json": json_file, "cv.pdf": pdf,
}

CRITERIA = {
    "jobTitle": "Développeur Full-Stack",
    "requiredSkills": ["JavaScript", "React", "Node.js", "PostgreSQL", "Docker"],
    "niceSkills": ["Kubernetes", "TypeScript"],
    "languages": ["Anglais"],
    "minExperienceYears": 3,
    "minEducationLevel": 5,
    "threshold": 60,
}

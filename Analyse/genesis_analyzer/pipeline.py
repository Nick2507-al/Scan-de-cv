"""Orchestration : fichier → texte → profil structuré → évaluation."""
from __future__ import annotations

import re
import time

from . import contacts
from .education import education
from .experience import experience_years
from .extract import extract
from .languages import languages
from .ml import MLClient
from .scoring import evaluate
from .sections import split_sections
from .skills import INDEX, canonical, detect_skills
from .text_utils import norm, title_case_name

# Compétences et diplômes : confiés au référentiel et aux règles, plus fiables (mesuré) ; le modèle traite les entités nommées.
NER_LABELS = ["person", "organization", "job title", "city"]
_BAD_ENTITY = re.compile(r"^[\W\d_]+$|@|https?:|www\.")


def _ner(ml: MLClient | None, sections: dict, text: str) -> list[dict]:
    if not ml or not ml.available:
        return []
    # Texte ciblé (en-tête + début des expériences) : l'essentiel des entités pour une fraction du calcul.
    focus = "\n".join(filter(None, [sections.get("header", "")[:1200], sections.get("experience", "")[:2500]]))
    ents = ml.ner(focus or text[:3000], NER_LABELS)
    return [e for e in (ents or []) if isinstance(e, dict) and e.get("text") and not _BAD_ENTITY.search(e["text"])]


def _tidy_name(name: str) -> str:
    """« Aminata DIALLO » / « aminata diallo » → « Aminata Diallo » ; garde « McDonald », « N'Goma »."""
    return " ".join(title_case_name(w) if w.isupper() or w.islower() else w for w in name.split())


def _pick_name(ents: list[dict], header: str, emails: list[str]) -> tuple[str, str]:
    header_n = norm(header[:800])
    persons = sorted((e for e in ents if e.get("label") == "person"), key=lambda e: -e.get("score", 0))
    for e in persons:
        name = re.sub(r"\s+", " ", e["text"]).strip(" ,;:|-")
        words = name.split()
        if 2 <= len(words) <= 5 and not any(c.isdigit() for c in name) and norm(name) in header_n:
            return _tidy_name(name), "model"
    guess = contacts.guess_name(header, emails)
    return guess, "rules" if guess else "none"


def analyze(filename: str, data: bytes, criteria: dict, ml: MLClient | None = None) -> dict:
    t0 = time.perf_counter()
    ocr = ml.ocr if ml and ml.available else None
    ext = extract(filename, data, ocr=ocr)
    text = ext.text
    sections = split_sections(text)
    header = sections.get("header", "") or text[:800]

    emails = contacts.extract_emails(text)
    phones = contacts.extract_phones(text)
    links = contacts.extract_links(text)
    ents = _ner(ml, sections, text)

    full_name, name_source = _pick_name(ents, header, emails)
    # Ordre d'apparition dans le CV (le décodage trie par confiance) : l'intitulé de l'en-tête passe en premier.
    ents.sort(key=lambda e: e.get("start", 0))
    header_n = norm(header)
    titles = [e["text"].strip() for e in ents if e.get("label") == "job title"]
    titles.sort(key=lambda t: norm(t) not in header_n)
    cities = [e["text"].strip() for e in ents if e.get("label") == "city" and norm(e["text"]) in norm(header)]
    orgs = list(dict.fromkeys(e["text"].strip() for e in ents if e.get("label") == "organization" and len(e["text"]) <= 80))[:15]

    skills = detect_skills(text, sections)
    known = {norm(s["name"]) for s in skills}
    for e in ents:
        if e.get("label") != "skill":
            continue
        raw = re.sub(r"\s+", " ", e["text"]).strip(" .,;:")
        if not (2 <= len(raw) <= 40) or len(raw.split()) > 4:
            continue
        canon = canonical(raw)
        key = norm(canon["name"])
        if key in known:
            continue
        known.add(key)
        skills.append({"name": canon["name"], "category": canon["category"],
                       "source": "taxonomy+model" if norm(raw) in INDEX else "model", "confidence": round(e.get("score", 0), 2)})

    years, exp_method = experience_years(sections, text)
    edu_level, edu_items = education(sections, text)
    langs = languages(sections, text)

    profile = {
        "fullName": full_name,
        "email": emails[0] if emails else "",
        "phone": phones[0] if phones else "",
        "otherEmails": emails[1:3],
        "otherPhones": phones[1:3],
        "location": cities[0] if cities else "",
        "headline": titles[0] if titles else "",
        "links": links,
        "skills": skills,
        "organizations": orgs,
        "education": edu_items,
        "educationLevel": edu_level,
        "experienceYears": years,
        "languages": [{"name": l["name"], "level": l["level"]} for l in langs],
    }
    warnings = list(ext.warnings)
    if full_name and emails and not contacts.name_matches_email(full_name, emails) and name_source == "rules":
        warnings.append("Nom déduit par heuristique : à vérifier")
    if len(text) < 300:
        warnings.append("Très peu de texte extrait : vérifiez le fichier")
    if ml and ml.configured and not ml.available:
        warnings.append("Modèles IA indisponibles : analyse effectuée en mode règles uniquement")

    evaluation = evaluate(profile, criteria, text, sections, ml)
    engine = "genesis-rules+ml" if ents or (ml and ml.available and ml.configured) else "genesis-rules"
    return {
        "engine": engine,
        "extraction": {"method": ext.method, "pages": ext.pages, "chars": len(text), "sections": sorted(sections)},
        "candidate": profile,
        "evaluation": evaluation,
        "warnings": warnings,
        "textExcerpt": text[:4000],
        "meta": {"nameSource": name_source, "experienceMethod": exp_method, "durationMs": round((time.perf_counter() - t0) * 1000)},
    }

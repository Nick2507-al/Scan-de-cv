"""Découpage d'un CV en sections (FR/EN) à partir des titres usuels."""
from __future__ import annotations

import re

from .text_utils import norm

SECTION_TITLES = {
    "profile": ["profil", "a propos", "resume", "summary", "profile", "about me", "objectif", "objectif professionnel",
                "presentation", "qui suis-je", "career objective", "professional summary"],
    "experience": ["experience", "experiences", "experience professionnelle", "experiences professionnelles",
                   "parcours professionnel", "emplois", "work experience", "professional experience", "employment",
                   "employment history", "stages", "stage", "missions", "career history", "historique professionnel"],
    "education": ["formation", "formations", "education", "etudes", "diplomes", "diplome", "cursus",
                  "parcours academique", "parcours scolaire", "academic background", "qualifications", "scolarite"],
    "skills": ["competences", "competences techniques", "competences cles", "skills", "technical skills",
               "hard skills", "soft skills", "savoir-faire", "outils", "technologies", "stack technique",
               "informatique", "connaissances informatiques", "aptitudes", "expertise", "domaines de competence"],
    "languages": ["langues", "languages", "langues etrangeres", "competences linguistiques"],
    "certifications": ["certifications", "certificats", "certification", "licences et certifications", "habilitations"],
    "projects": ["projets", "projects", "realisations", "projets personnels", "portfolio"],
    "interests": ["centres d'interet", "centres d'interets", "loisirs", "interets", "hobbies", "interests",
                  "activites extra-professionnelles", "vie associative"],
    "references": ["references", "referees"],
}

_LOOKUP = {t: key for key, titles in SECTION_TITLES.items() for t in titles}


def _heading_key(line: str) -> str | None:
    n = norm(line).strip(" :•-–—*#|_.")
    n = re.sub(r"^(?:\d+|[ivx]+)[.)]\s*", "", n)
    # Un titre ne contient ni chiffres (dates, durées) ni ponctuation de phrase.
    if not n or len(n) > 45 or re.search(r"\d|[,;!?]", n):
        return None
    if n in _LOOKUP:
        return _LOOKUP[n]
    # « COMPÉTENCES TECHNIQUES & OUTILS » → titre connu suivi d'un complément de titre.
    letters = re.sub(r"[^A-Za-zÀ-ÿ]", "", line)
    is_upper = bool(letters) and letters.isupper()
    for title, key in sorted(_LOOKUP.items(), key=lambda kv: -len(kv[0])):
        if not n.startswith(title) or len(n) - len(title) > 25:
            continue
        rest = n[len(title):]
        if is_upper or re.match(r"^\s*(?:&|et\b|and\b|/|-|\(|techniques?\b|professionnel|cles\b|principales?\b|informatiques?\b)", rest):
            return key
    return None


def split_sections(text: str) -> dict[str, str]:
    """Retourne {'header': ..., 'experience': ..., ...}. Le texte avant le premier titre va dans 'header'."""
    sections: dict[str, list[str]] = {"header": []}
    current = "header"
    for raw in text.splitlines():
        line = raw.strip()
        if not line:
            continue
        key = _heading_key(line)
        if key:
            current = key
            sections.setdefault(current, [])
            continue
        sections.setdefault(current, []).append(line)
    return {k: "\n".join(v) for k, v in sections.items() if v}

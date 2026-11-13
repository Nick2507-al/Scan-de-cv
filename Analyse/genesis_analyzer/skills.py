"""
Détection des compétences et correspondance avec les exigences d'une offre.

Trois niveaux de règles pour éviter les faux positifs :
- termes à casse stricte (C, R, Go, Swift…) : cherchés tels qu'écrits, jamais dans « c'est », « R&D », « 16 Go » ;
- termes génériques (tableau, word, budget, communication…) : uniquement dans les sections Compétences/Profil,
  sauf s'ils sont explicitement exigés par l'offre ;
- autres termes : mot entier, insensible à la casse et aux accents, partout dans le CV.
"""
from __future__ import annotations

import re
from functools import lru_cache

from .skills_data import TAXONOMY, build_index
from .text_utils import norm, term_pattern

INDEX = build_index()

# Alias à rechercher sensible à la casse dans le texte original.
CASE_SENSITIVE = {"c": "C", "r": "R", "go": "Go", "swift": "Swift", "rust": "Rust", "dart": "Dart", "julia": "Julia",
                  "spring": "Spring", "chef": "Chef", "puppet": "Puppet", "lean": "Lean", "sas": "SAS", "sap": "SAP",
                  "ts": "TS", "py": "PY", "ml": "ML", "ui": "UI", "ux": "UX", "qa": "QA", "kam": "KAM", "but": "BUT",
                  "ad ds": "AD DS", "rest": "REST", "wp": "WP", "tal": "TAL", "ssi": "SSI", "sst": "SST", "ire": "IRE",
                  "sig": "SIG", "soc": "SOC", "plc": "PLC", "ror": "RoR", "ga4": "GA4", "lan": "LAN", "wan": "WAN",
                  "access": "Access", "word": "Word", "teams": "Teams", "outlook": "Outlook", "notion": "Notion",
                  "sketch": "Sketch", "apache": "Apache", "elastic": "Elastic", "node": "Node", "express": "Express",
                  "tableau": "Tableau", "excel": "Excel", "vite": "Vite", "looker": "Looker"}

GENERIC = {norm(x) for x in [
    "c", "r", "go", "ts", "py", "ml", "ui", "ux", "qa", "rest", "lan", "wan", "sig", "soc", "tal", "ire",
    "budget", "communication", "production", "maintenance", "transport", "construction", "administration",
    "assurance", "insurance", "banque", "banking", "recherche", "research", "writing", "training", "translation",
    "cooking", "creative", "creativity", "innovation", "collaboration", "initiative", "leader", "flexible",
    "soins", "sales", "vente", "achats", "accueil", "reception", "qualite", "quality", "cuisine", "enseignement",
    "teaching", "redaction", "traduction", "audit", "mines", "mining", "logistique", "tourisme", "support technique",
    "organisation", "organise", "organisee", "rigueur", "autonomie", "adaptabilite", "polyvalence", "polyvalent",
    "empathie", "proactif", "sprint", "devops", "big data", "linux", "shell", "budgetisation", "sourcing",
    "infirmier", "infirmiere", "formateur", "enseignant", "serveur", "independant", "creatif", "electricite",
    "electronique", "statistique", "comptabilite", "recrutement", "secretariat", "archivage", "douane", "fret",
    "hydraulique", "photographie", "photography", "montage video", "consolidation", "fiscalite", "tax", "tva",
]}

_LOOKAROUND_EXTRA = re.compile(r"^(?:'|&|\s?\+\+)")


def _case_pattern(display: str) -> re.Pattern:
    # « Go » : pas après un nombre (« 16 Go »). « C »/« R » : pas suivis d'apostrophe/&/++ (« c'est », « R&D », « C++ »).
    # Forme d'origine ou tout en majuscules (« Excel » / « EXCEL »), jamais en minuscules (« excel » = verbe anglais).
    forms = dict.fromkeys([display, display.upper()])
    esc = "|".join(re.escape(f).replace(r"\ ", r"\s+") for f in forms)
    return re.compile(rf"(?<![\w+#.\-/])(?<!\d )(?<!\d)(?:{esc})(?![\w+#'’&]|\.\w|\s?\+\+)")


@lru_cache(maxsize=4096)
def _pattern_for(alias_norm: str) -> tuple[re.Pattern, bool]:
    """Retourne (motif, sensible_à_la_casse)."""
    if alias_norm in CASE_SENSITIVE:
        return _case_pattern(CASE_SENSITIVE[alias_norm]), True
    return term_pattern(alias_norm), False


def _search(alias_norm: str, original: str, normalized: str) -> re.Match | None:
    pat, cased = _pattern_for(alias_norm)
    return pat.search(original if cased else normalized)


def canonical(term: str) -> dict:
    """Forme canonique d'un terme (« js » → JavaScript). Terme inconnu : renvoyé tel quel."""
    hit = INDEX.get(norm(term))
    return hit or {"name": term.strip(), "category": "Autre"}


def aliases_of(name: str) -> list[str]:
    for skills in TAXONOMY.values():
        for canon, aliases in skills.items():
            if norm(canon) == norm(name):
                return [norm(canon), *(norm(a) for a in aliases)]
    return [norm(name)]


def _context(text: str, m: re.Match, width: int = 60) -> str:
    a, b = max(0, m.start() - width), min(len(text), m.end() + width)
    return re.sub(r"\s+", " ", text[a:b]).strip()


def detect_skills(full_text: str, sections: dict[str, str]) -> list[dict]:
    """Compétences reconnues dans le CV (référentiel), avec la section où elles apparaissent."""
    focused = "\n".join(sections.get(k, "") for k in ("skills", "profile", "header", "certifications"))
    zones = {"skills": (focused, norm(focused)), "all": (full_text, norm(full_text))}
    found: dict[str, dict] = {}
    for alias, info in INDEX.items():
        if info["name"] in found:
            continue
        zone = "skills" if alias in GENERIC else "all"
        original, normalized = zones[zone]
        m = _search(alias, original, normalized)
        if m:
            found[info["name"]] = {"name": info["name"], "category": info["category"], "source": "taxonomy",
                                   "evidence": _context(original if _pattern_for(alias)[1] else normalized, m)}
    return list(found.values())


def match_requirement(requirement: str, full_text: str, normalized_text: str) -> dict | None:
    """
    Cherche une exigence de l'offre dans le CV : forme canonique + tous ses synonymes.
    Les termes génériques sont acceptés partout puisque le recruteur les a explicitement demandés.
    """
    canon = canonical(requirement)
    candidates = list(dict.fromkeys([norm(requirement), *aliases_of(canon["name"])]))
    for alias in candidates:
        m = _search(alias, full_text, normalized_text)
        if m:
            cased = _pattern_for(alias)[1]
            return {"requirement": requirement, "matched": canon["name"], "method": "exact" if alias == norm(requirement) else "synonym",
                    "evidence": _context(full_text if cased else normalized_text, m)}
    # Exigence multi-mots (« gestion de projets agiles ») : tous les mots significatifs présents à proximité.
    words = [w for w in re.findall(r"[a-z0-9+#]{3,}", norm(requirement)) if w not in _STOP]
    if len(words) >= 2:
        positions = []
        for w in words:
            stem = w[:-1] if w.endswith("s") and len(w) > 4 else w
            m = re.search(rf"\b{re.escape(stem)}", normalized_text)
            if not m:
                return None
            positions.append(m.start())
        if max(positions) - min(positions) < 250:
            return {"requirement": requirement, "matched": requirement, "method": "words",
                    "evidence": normalized_text[max(0, min(positions) - 30): max(positions) + 60]}
    return None


_STOP = {"les", "des", "une", "pour", "avec", "dans", "sur", "par", "and", "the", "for", "with", "aux", "est", "son", "ses",
         "connaissance", "connaissances", "maitrise", "bonne", "bonnes", "experience", "knowledge", "skills", "competence",
         "competences", "notions", "capacite", "aptitude"}

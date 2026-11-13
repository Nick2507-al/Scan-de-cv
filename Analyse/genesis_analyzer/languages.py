"""Langues parlées et niveau (CECRL A1–C2 ou équivalent)."""
from __future__ import annotations

import re

from .text_utils import lines_of, norm, term_pattern

LANGS = {
    "Français": ["francais", "french", "francaise"],
    "Anglais": ["anglais", "english", "toeic", "toefl", "ielts"],
    "Espagnol": ["espagnol", "spanish", "castillan"],
    "Allemand": ["allemand", "german"],
    "Italien": ["italien", "italian"],
    "Portugais": ["portugais", "portuguese"],
    "Arabe": ["arabe", "arabic"],
    "Chinois": ["chinois", "mandarin", "chinese"],
    "Russe": ["russe", "russian"],
    "Néerlandais": ["neerlandais", "dutch", "flamand"],
    "Japonais": ["japonais", "japanese"],
    "Lingala": ["lingala"],
    "Kituba": ["kituba", "munukutuba"],
    "Swahili": ["swahili", "kiswahili"],
    "Wolof": ["wolof"],
    "Bambara": ["bambara"],
}
LEVEL_WORDS = [
    (r"\b(natif|native|maternelle|mother tongue|bilingue|bilingual)\b", "Natif / bilingue", 6),
    (r"\bc2\b", "C2", 6), (r"\bc1\b", "C1", 5),
    (r"\b(courant|fluent|professionnel|professional|avance|advanced)\b", "Courant", 5),
    (r"\bb2\b", "B2", 4), (r"\b(intermediaire|intermediate)\b", "Intermédiaire", 3), (r"\bb1\b", "B1", 3),
    (r"\ba2\b", "A2", 2), (r"\b(scolaire|notions|basic|elementaire|debutant|beginner)\b", "Notions", 1), (r"\ba1\b", "A1", 1),
]
_PATTERNS = {lang: [term_pattern(a) for a in aliases] for lang, aliases in LANGS.items()}


def languages(sections: dict[str, str], full_text: str) -> list[dict]:
    source = sections.get("languages") or full_text
    found: dict[str, dict] = {}
    for line in lines_of(source):
        n = norm(line)
        for lang, pats in _PATTERNS.items():
            if any(p.search(n) for p in pats):
                level, rank = "", 0
                for rx, label, r in LEVEL_WORDS:
                    if re.search(rx, n):
                        level, rank = label, r
                        break
                if lang not in found or rank > found[lang]["rank"]:
                    found[lang] = {"name": lang, "level": level, "rank": rank}
    return list(found.values())


def language_aliases(name: str) -> list[str]:
    n = norm(name)
    for lang, aliases in LANGS.items():
        if n == norm(lang) or n in aliases:
            return [norm(lang), *aliases]
    return [n]

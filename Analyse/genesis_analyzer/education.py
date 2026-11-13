"""Niveau d'études (échelle Bac+N, 0 à 8) et liste des diplômes reconnus."""
from __future__ import annotations

import re

from .text_utils import lines_of, norm

# (motif, niveau, libellé). Niveau = années après le bac (Bac = 0 → codé 1 pour le distinguer de « inconnu »).
LEVELS = [
    (r"\b(doctorat|phd|ph\.d|doctorate|these de doctorat)\b", 8, "Doctorat"),
    (r"(?<!scrum )(?<!product )\b(master(?!\s*class)|mastere|msc|m\.sc|mba|m2|m1|dea|dess|diplome d'ingenieur|ecole d'ingenieurs?|engineering degree|bac\s*\+\s*5)\b", 5, "Bac+5 (Master / Ingénieur)"),
    (r"\bbac\s*\+\s*4\b|\bmaitrise\b", 4, "Bac+4"),
    (r"\b(licence(?!\s+(?:de conduire|d'utilisation|logicielle))|bachelor|bsc|b\.sc|bachelor universitaire de technologie|bac\s*\+\s*3)\b", 3, "Bac+3 (Licence / Bachelor)"),
    (r"\b(bts|dut|deug|hnd|associate degree|bac\s*\+\s*2|deust)\b", 2, "Bac+2 (BTS / DUT)"),
    (r"\b(baccalaureat|bac(?!\s*\+)|high school diploma|a-levels?|bac pro)\b", 1, "Baccalauréat"),
    (r"\b(cap|bep|brevet)\b", 0, "CAP / BEP"),
]
_COMPILED = [(re.compile(p, re.IGNORECASE), lvl, label) for p, lvl, label in LEVELS]
_YEAR = re.compile(r"\b(19[6-9]\d|20[0-4]\d)\b")

LEVEL_LABELS = {8: "Doctorat", 5: "Bac+5", 4: "Bac+4", 3: "Bac+3", 2: "Bac+2", 1: "Bac", 0: "Aucun exigé"}


def education(sections: dict[str, str], full_text: str) -> tuple[int, list[dict]]:
    in_section = bool(sections.get("education"))
    source = sections.get("education") or full_text
    # « Ingénieur » n'indique un diplôme que dans la section Formation (ailleurs, c'est un intitulé de poste).
    patterns = ([(re.compile(r"\bingenieur\b"), 5, "Bac+5 (Master / Ingénieur)")] if in_section else []) + _COMPILED
    items: list[dict] = []
    best = 0
    for line in lines_of(source):
        n = norm(line)
        for rx, lvl, label in patterns:
            if rx.search(n):
                best = max(best, lvl)
                years = _YEAR.findall(line)
                if len(items) < 8 and all(i["title"] != line[:160] for i in items):
                    items.append({"title": line[:160], "level": lvl, "levelLabel": label, "year": int(years[-1]) if years else None})
                break
    # Si la section Formation n'a rien donné, un diplôme cité ailleurs compte quand même.
    if best == 0 and sections.get("education"):
        for rx, lvl, _ in _COMPILED:
            if rx.search(norm(full_text)):
                best = max(best, lvl)
                break
    return best, items

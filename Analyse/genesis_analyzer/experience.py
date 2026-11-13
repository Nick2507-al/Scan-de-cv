"""Calcul de l'expérience professionnelle à partir des périodes datées (FR/EN)."""
from __future__ import annotations

import re
from datetime import date

from .text_utils import norm

MONTHS = {
    "janvier": 1, "janv": 1, "jan": 1, "january": 1,
    "fevrier": 2, "fevr": 2, "fev": 2, "feb": 2, "february": 2,
    "mars": 3, "mar": 3, "march": 3,
    "avril": 4, "avr": 4, "apr": 4, "april": 4,
    "mai": 5, "may": 5,
    "juin": 6, "jun": 6, "june": 6,
    "juillet": 7, "juil": 7, "jul": 7, "july": 7,
    "aout": 8, "aou": 8, "aug": 8, "august": 8,
    "septembre": 9, "sept": 9, "sep": 9, "september": 9,
    "octobre": 10, "oct": 10, "october": 10,
    "novembre": 11, "nov": 11, "november": 11,
    "decembre": 12, "dec": 12, "december": 12,
}
_MONTH_ALT = "|".join(sorted(MONTHS, key=len, reverse=True))
_PRESENT = r"(?:aujourd'?hui|a ce jour|ce jour|present|actuel(?:lement)?|en cours|now|current(?:ly)?|today|ongoing)"
_DATE = rf"(?:(?:{_MONTH_ALT})\.?\s+(?:19|20)\d\d|(?:0?[1-9]|1[0-2])\s*[/.-]\s*(?:19|20)\d\d|(?:19|20)\d\d)"
_RANGE = re.compile(
    rf"(?:de(?:puis)?\s+|du\s+|from\s+|since\s+)?(?P<start>{_DATE})\s*(?:-|a|au|to|until|jusqu'?(?:a|en)|>|→)\s*(?P<end>{_DATE}|{_PRESENT})",
    re.IGNORECASE,
)
_SINCE = re.compile(rf"(?:depuis|since)\s+(?P<start>{_DATE})(?!\s*(?:-|a|au|to)\s*(?:{_DATE}))", re.IGNORECASE)
_DECLARED = re.compile(r"(\d{1,2})\s*(?:\+\s*)?(?:ans|annees|years?|yrs)\s+(?:d'|de\s+|of\s+)?(?:experience|exp)", re.IGNORECASE)


def _parse(token: str, is_end: bool, today: date) -> tuple[int, int] | None:
    t = norm(token).strip(". ")
    if re.fullmatch(_PRESENT, t):
        return today.year, today.month
    m = re.fullmatch(rf"({_MONTH_ALT})\.?\s+((?:19|20)\d\d)", t)
    if m:
        return int(m.group(2)), MONTHS[m.group(1)]
    m = re.fullmatch(r"(0?[1-9]|1[0-2])\s*[/.-]\s*((?:19|20)\d\d)", t)
    if m:
        return int(m.group(2)), int(m.group(1))
    m = re.fullmatch(r"((?:19|20)\d\d)", t)
    if m:
        # Année seule : début → janvier, fin → décembre (ou mois courant si année en cours).
        y = int(m.group(1))
        if is_end:
            return (y, today.month) if y == today.year else (y, 12)
        return y, 1
    return None


def periods(text: str, today: date | None = None) -> list[tuple[int, int]]:
    """Liste d'intervalles [début, fin] en mois absolus (année*12+mois)."""
    today = today or date.today()
    t = norm(text)
    out = []
    for m in _RANGE.finditer(t):
        s, e = _parse(m.group("start"), False, today), _parse(m.group("end"), True, today)
        if not s or not e:
            continue
        a, b = s[0] * 12 + s[1], e[0] * 12 + e[1]
        now = today.year * 12 + today.month
        if a <= b <= now + 1 and 1960 * 12 < a and b - a <= 45 * 12:
            out.append((a, b))
    for m in _SINCE.finditer(t):
        s = _parse(m.group("start"), False, today)
        if s:
            a, b = s[0] * 12 + s[1], today.year * 12 + today.month
            if 1960 * 12 < a <= b:
                out.append((a, b))
    return out


def total_years(intervals: list[tuple[int, int]]) -> float:
    """Fusionne les périodes qui se chevauchent (deux postes en parallèle ne comptent pas double)."""
    if not intervals:
        return 0.0
    merged = []
    for a, b in sorted(intervals):
        if merged and a <= merged[-1][1]:
            merged[-1][1] = max(merged[-1][1], b)
        else:
            merged.append([a, b])
    months = sum(b - a + 1 for a, b in merged)
    return round(months / 12, 1)


def experience_years(sections: dict[str, str], full_text: str, today: date | None = None) -> tuple[float, str]:
    """Retourne (années, méthode). Priorité à la section Expérience ; jamais la section Formation."""
    source = sections.get("experience", "")
    method = "periods:experience"
    if not source:
        source = "\n".join(v for k, v in sections.items() if k not in ("education", "certifications", "interests"))
        method = "periods:document"
    years = total_years(periods(source, today))
    declared = [int(x) for x in _DECLARED.findall(norm(full_text)) if 0 < int(x) <= 50]
    if declared and max(declared) > years:
        return float(max(declared)), "declared"
    return years, method

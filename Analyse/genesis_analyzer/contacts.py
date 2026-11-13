"""Coordonnées : email, téléphone (validé par libphonenumber), liens, localisation, nom."""
from __future__ import annotations

import os
import re

import phonenumbers

from .text_utils import lines_of, norm, title_case_name

DEFAULT_REGION = os.environ.get("DEFAULT_PHONE_REGION", "FR").upper()
# Pays testés quand un numéro local n'est pas valide pour la région par défaut (Afrique francophone, Europe).
FALLBACK_REGIONS = ["FR", "CG", "CD", "CM", "CI", "SN", "GA", "BE", "CH", "CA", "MA", "TN", "DZ", "BJ", "TG", "ML", "BF"]

EMAIL_RE = re.compile(r"(?<![\w.+-])[A-Za-z0-9][A-Za-z0-9._%+-]{0,63}@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9-]{1,63})*\.[A-Za-z]{2,24}(?![\w-])")
URL_RE = re.compile(r"(?i)\b(?:https?://|www\.)[^\s<>()\"']{3,200}|\b(?:linkedin\.com|github\.com|gitlab\.com|behance\.net|dribbble\.com)/[^\s<>()\"']{2,120}")


def extract_emails(text: str) -> list[str]:
    # Rejoint les emails coupés par une espace autour de « @ » (« jean.dupont @ gmail.com »).
    t = re.sub(r"\s*@\s*", "@", text)
    out = []
    for m in EMAIL_RE.findall(t):
        e = m.strip(".").lower()
        if e not in out and not e.endswith((".png", ".jpg", ".jpeg", ".gif")):
            out.append(e)
    return out


_YEAR_RANGE = re.compile(r"^\s*(?:19|20)\d\d\s*[-/–]\s*(?:19|20)\d\d\s*$")


def extract_phones(text: str) -> list[str]:
    found: list[str] = []
    for region in [DEFAULT_REGION] + [r for r in FALLBACK_REGIONS if r != DEFAULT_REGION]:
        fallback = region != DEFAULT_REGION
        for m in phonenumbers.PhoneNumberMatcher(text, region, leniency=phonenumbers.Leniency.VALID):
            raw = m.raw_string
            digits = re.sub(r"\D", "", raw)
            if _YEAR_RANGE.match(raw) or len(digits) < 8:
                continue
            # Région de repli : numéro national plausible seulement (≥ 9 chiffres ou préfixe international).
            if fallback and not raw.lstrip().startswith(("+", "00")) and len(digits) < 9:
                continue
            num = phonenumbers.format_number(m.number, phonenumbers.PhoneNumberFormat.INTERNATIONAL)
            if num not in found:
                found.append(num)
        if found:
            break
    return found[:3]


def extract_links(text: str) -> list[dict]:
    links = []
    for m in URL_RE.findall(text):
        url = m.rstrip(".,;:)")
        low = url.lower()
        kind = ("linkedin" if "linkedin.com" in low else "github" if "github.com" in low
                else "gitlab" if "gitlab.com" in low else "portfolio")
        if not low.startswith("http"):
            url = "https://" + url
        if all(l["url"] != url for l in links):
            links.append({"kind": kind, "url": url})
    return links[:6]


_NOT_NAME = re.compile(
    r"(?i)\b(curriculum|vitae|cv|resume|résumé|profil|profile|email|e-mail|mail|t[ée]l|phone|adresse|address|"
    r"n[ée]e?\s+le|age|âge|ans|years|rue|avenue|bd|boulevard|ville|france|congo|linkedin|github|www|http|"
    r"d[ée]veloppeur|developer|ing[ée]nieur|engineer|manager|assistant|comptable|technicien|consultant|"
    r"stagiaire|chef|responsable|directeur|charg[ée]|analyst|analyste|designer|commercial|gestionnaire)\b"
)
_NAME_LINE = re.compile(r"^[A-ZÀ-Ý][A-Za-zÀ-ÿ'’\-]+(?:\s+[A-ZÀ-Ý][A-Za-zÀ-ÿ'’\-]+){1,3}$")


def guess_name(header_text: str, emails: list[str]) -> str:
    """Repli sans modèle : première ligne courte de 2 à 4 mots capitalisés en haut du CV."""
    for line in lines_of(header_text)[:12]:
        line = re.sub(r"\s{2,}", " ", line.strip(" |•-–:"))
        if len(line) > 45 or _NOT_NAME.search(line) or any(ch.isdigit() for ch in line):
            continue
        if _NAME_LINE.match(line) or (line.isupper() and 2 <= len(line.split()) <= 4 and line.replace(" ", "").replace("-", "").isalpha()):
            return title_case_name(line)
    # Dernier recours : partie locale de l'email « prenom.nom@ ».
    if emails:
        local = emails[0].split("@")[0]
        parts = [p for p in re.split(r"[._-]", local) if p.isalpha() and len(p) > 1]
        if 2 <= len(parts) <= 3:
            return title_case_name(" ".join(parts))
    return ""


def name_matches_email(name: str, emails: list[str]) -> bool:
    if not name or not emails:
        return False
    local = norm(emails[0].split("@")[0])
    return any(len(p) > 2 and p in local for p in norm(name).split())

from __future__ import annotations

import re
import unicodedata


def strip_accents(s: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn")


def norm(s: str) -> str:
    """Forme de comparaison : minuscules, sans accents, espaces simples."""
    s = strip_accents(s.lower())
    s = re.sub(r"[’'`´]", "'", s)
    return re.sub(r"\s+", " ", s).strip()


# Caractères considérés comme faisant partie d'un « mot technique » (C++, C#, .NET, Node.js, CI/CD).
_WORD = r"A-Za-z0-9À-ÿ+#"


def term_pattern(term: str) -> re.Pattern:
    """
    Expression qui trouve `term` comme mot entier dans un texte normalisé.
    « Java » ne correspond pas à « JavaScript », « C » ne correspond pas à « CV » ni à « C++ ».
    """
    t = norm(term)
    parts = [re.escape(p) for p in re.split(r"[\s\-_/]+", t) if p]
    body = r"[\s\-_/]*".join(parts) if parts else re.escape(t)
    body = body.replace(r"\.", r"\.?") if not t.startswith(".") else body
    return re.compile(rf"(?<![{_WORD}.]){body}(?![{_WORD}]|\.[a-z0-9])", re.IGNORECASE)


def lines_of(text: str) -> list[str]:
    return [l.strip() for l in text.splitlines() if l.strip()]


def title_case_name(s: str) -> str:
    def cap(w: str) -> str:
        return "-".join(p[:1].upper() + p[1:].lower() if p else p for p in w.split("-"))
    return " ".join(cap(w) for w in s.split())

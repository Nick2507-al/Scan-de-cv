"""
Tests par propriétés (Hypothesis) : des milliers d'entrées générées pour vérifier des règles
qui doivent tenir pour TOUT fichier ou texte reçu, pas seulement pour quelques exemples.
"""
from __future__ import annotations

import sys
from datetime import date
from pathlib import Path

from hypothesis import HealthCheck, given, settings
from hypothesis import strategies as st

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
sys.path.insert(0, str(Path(__file__).resolve().parent))

from fixtures import CRITERIA, CV_TEXT  # noqa: E402
from genesis_analyzer import contacts, experience  # noqa: E402
from genesis_analyzer.extract import SUPPORTED_EXTENSIONS, ExtractionError, Extracted, clean_text, extract  # noqa: E402
from genesis_analyzer.pipeline import analyze  # noqa: E402
from genesis_analyzer.scoring import evaluate  # noqa: E402
from genesis_analyzer.sections import split_sections  # noqa: E402
from genesis_analyzer.skills import INDEX, CASE_SENSITIVE, GENERIC, detect_skills, match_requirement  # noqa: E402
from genesis_analyzer.text_utils import norm  # noqa: E402

FAST = settings(max_examples=300, deadline=None, suppress_health_check=[HealthCheck.too_slow])
SLOW = settings(max_examples=60, deadline=None, suppress_health_check=[HealthCheck.too_slow])

# Texte « hostile » : toutes catégories Unicode, y compris contrôles, emoji, écritures non latines.
any_text = st.text(alphabet=st.characters(codec="utf-8"), max_size=3000)
months = st.integers(min_value=1960 * 12 + 1, max_value=2026 * 12 + 10)
interval = st.tuples(months, months).map(lambda t: (min(t), max(t)))


# ---------------------------------------------------------------- expérience

@given(st.lists(interval, max_size=12))
@FAST
def test_total_years_bounds(intervals):
    """Entre la plus longue période et la somme des périodes ; jamais négatif."""
    total = experience.total_years(intervals)
    longest = max((b - a + 1 for a, b in intervals), default=0) / 12
    summed = sum(b - a + 1 for a, b in intervals) / 12
    assert total >= 0
    assert round(longest, 1) - 0.05 <= total <= round(summed, 1) + 0.05


@given(st.lists(interval, max_size=12), st.randoms())
@FAST
def test_total_years_order_and_duplicates_independent(intervals, rnd):
    """L'ordre des postes dans le CV et un poste cité deux fois ne changent rien."""
    base = experience.total_years(intervals)
    shuffled = intervals[:]
    rnd.shuffle(shuffled)
    assert experience.total_years(shuffled) == base
    assert experience.total_years(intervals + intervals) == base


@given(any_text)
@FAST
def test_periods_never_in_future_nor_crash(text):
    today = date(2026, 11, 13)
    for a, b in experience.periods(text, today):
        assert a <= b <= today.year * 12 + today.month + 1


# ---------------------------------------------------------------- normalisation

@given(any_text)
@FAST
def test_clean_text_idempotent(text):
    once = clean_text(text)
    assert clean_text(once) == once


@given(any_text)
@FAST
def test_norm_idempotent(text):
    assert norm(norm(text)) == norm(text)


# ---------------------------------------------------------------- coordonnées

@given(any_text)
@FAST
def test_emails_are_wellformed(text):
    for e in contacts.extract_emails(text):
        local, _, domain = e.partition("@")
        assert local and "." in domain and e == e.lower() and " " not in e


@given(st.lists(st.integers(1900, 2099), min_size=1, max_size=8))
@FAST
def test_year_lists_are_never_phone_numbers(years):
    """Une suite de dates (« 2018-2020, 2021 ») ne doit jamais devenir un numéro de téléphone."""
    text = ", ".join(f"{a}-{b}" for a, b in zip(years, years[1:] + years[:1]))
    assert contacts.extract_phones(text) == []


@given(st.sampled_from(["+242 06 612 34 56", "+33 6 12 34 56 78", "+225 07 07 12 34 56", "+243 81 234 5678", "+237 6 71 23 45 67"]),
       any_text, any_text)
@SLOW
def test_valid_phone_found_in_any_context(phone, before, after):
    """Un numéro international valide est trouvé quel que soit le texte autour."""
    found = contacts.extract_phones(f"{before[:200]}\nTél : {phone}\n{after[:200]}")
    digits = "".join(c for c in phone if c.isdigit())
    assert any("".join(c for c in f if c.isdigit()) == digits for f in found)


# ---------------------------------------------------------------- compétences

def test_every_taxonomy_alias_is_detectable_when_required():
    """Oracle : chaque synonyme du référentiel, écrit dans un CV, satisfait l'exigence de sa forme canonique."""
    misses = []
    for alias, info in INDEX.items():
        written = CASE_SENSITIVE.get(alias, alias)
        text = f"Compétences : {written}, gestion"
        if not match_requirement(info["name"], text, norm(text)):
            misses.append((alias, info["name"]))
    assert not misses, misses[:20]


def test_every_canonical_skill_detected_in_skills_section():
    misses = []
    for alias, info in INDEX.items():
        if norm(info["name"]) != alias:
            continue
        written = CASE_SENSITIVE.get(alias, info["name"])
        sec = f"{written}"
        names = {s["name"] for s in detect_skills(sec, {"skills": sec})}
        if info["name"] not in names:
            misses.append(info["name"])
    assert not misses, misses[:20]


@given(any_text)
@SLOW
def test_detect_skills_never_crashes_and_names_are_canonical(text):
    canon = {v["name"] for v in INDEX.values()}
    for s in detect_skills(text, split_sections(text)):
        assert s["name"] in canon


def test_generic_terms_need_skills_section():
    """Un mot courant (« budget », « tableau »…) hors section Compétences n'est pas une compétence."""
    prose = "Nous avons respecté le budget et présenté un tableau de synthèse lors de la communication."
    names = {s["name"] for s in detect_skills(prose, {"experience": prose})}
    assert not names & {"Contrôle de gestion", "Tableau", "Communication"}, names


# ---------------------------------------------------------------- score

@given(st.lists(st.sampled_from(["SAP", "Kubernetes", "Fiscalité", "Figma", "AutoCAD", "Scrum", "React"]), max_size=5, unique=True))
@SLOW
def test_score_bounded_and_monotonic(extra_required):
    """Score toujours dans [0,100] ; ajouter au CV une compétence exigée ne fait jamais baisser le score."""
    crit = {**CRITERIA, "requiredSkills": CRITERIA["requiredSkills"] + extra_required}
    sections = split_sections(CV_TEXT)
    base = analyze("cv.txt", CV_TEXT.encode(), crit)["evaluation"]
    assert 0 <= base["score"] <= 100
    richer_text = CV_TEXT + "\nCOMPÉTENCES COMPLÉMENTAIRES\n" + ", ".join(extra_required)
    richer = analyze("cv.txt", richer_text.encode(), crit)["evaluation"]
    assert richer["score"] >= base["score"]
    assert sections  # le découpage reste non vide


@given(st.integers(0, 100))
@SLOW
def test_threshold_decides_retention(threshold):
    crit = {**CRITERIA, "threshold": threshold}
    ev = analyze("cv.txt", CV_TEXT.encode(), crit)["evaluation"]
    assert ev["retained"] == (ev["score"] >= threshold and not ev["knockouts"])
    assert (ev["improvementNotes"] == []) == ev["retained"] or not ev["retained"]


# ---------------------------------------------------------------- fichiers arbitraires (fuzzing)

@given(st.sampled_from([e for e in SUPPORTED_EXTENSIONS if e not in ("png", "jpg", "jpeg", "webp", "tif", "tiff", "bmp", "gif")]),
       st.binary(max_size=4096))
@settings(max_examples=400, deadline=None, suppress_health_check=[HealthCheck.too_slow])
def test_any_bytes_any_format_never_crashes(ext, data):
    """N'importe quels octets, n'importe quelle extension : soit un texte, soit une erreur propre."""
    try:
        r = extract(f"cv.{ext}", data)
        assert isinstance(r, Extracted) and r.text
    except ExtractionError as exc:
        assert str(exc)


@given(any_text)
@SLOW
def test_pipeline_on_any_text_returns_consistent_result(text):
    try:
        r = analyze("cv.txt", text.encode("utf-8", "surrogatepass"), CRITERIA)
    except ExtractionError:
        return
    ev = r["evaluation"]
    assert 0 <= ev["score"] <= 100 and isinstance(ev["retained"], bool)
    assert 0 <= r["candidate"]["experienceYears"] <= 70
    assert 0 <= r["candidate"]["educationLevel"] <= 8

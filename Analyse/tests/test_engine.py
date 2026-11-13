from __future__ import annotations

import io
import sys
import zipfile
from datetime import date
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
sys.path.insert(0, str(Path(__file__).resolve().parent))

from fixtures import ALL_FORMATS, CRITERIA  # noqa: E402
from genesis_analyzer import contacts, education, experience, skills  # noqa: E402
from genesis_analyzer.extract import ExtractionError, extract  # noqa: E402
from genesis_analyzer.pipeline import analyze  # noqa: E402
from genesis_analyzer.sections import split_sections  # noqa: E402


# --------------------------------------------------------------------- cohérence multi-format

@pytest.mark.parametrize("filename", list(ALL_FORMATS))
def test_every_format_gives_same_profile(filename):
    r = analyze(filename, ALL_FORMATS[filename](), CRITERIA, ml=None)
    c, ev = r["candidate"], r["evaluation"]
    assert c["fullName"] == "Aminata Diallo", filename
    assert c["email"] == "aminata.diallo@example.com"
    assert c["phone"] == "+242 06 612 3456"
    assert c["educationLevel"] == 5
    assert 5.0 <= c["experienceYears"] <= 8.5
    names = {s["name"] for s in c["skills"]}
    assert {"JavaScript", "TypeScript", "React", "Node.js", "PostgreSQL", "Docker", "Git", "Scrum", "Laravel", "MySQL"} <= names
    assert "Java" not in names and "C" not in names and "R" not in names and "Go" not in names
    langs = {l["name"]: l["level"] for l in c["languages"]}
    assert langs.get("Anglais") in ("C1", "Courant") and "Français" in langs and "Lingala" in langs
    assert ev["breakdown"]["required"]["missing"] == []
    assert ev["retained"] is True and ev["score"] >= 80


def test_scores_identical_across_formats():
    scores = {f: analyze(f, gen(), CRITERIA)["evaluation"]["score"] for f, gen in ALL_FORMATS.items()}
    assert len(set(scores.values())) == 1, scores


def test_html_scripts_are_not_extracted():
    text = extract("cv.html", ALL_FORMATS["cv.html"]()).text
    assert "alert(1)" not in text and "color:red" not in text


# --------------------------------------------------------------------- décision

def test_rejected_when_required_skills_missing():
    crit = {**CRITERIA, "requiredSkills": ["SAP", "Comptabilité générale", "OHADA", "Fiscalité"]}
    ev = analyze("cv.txt", ALL_FORMATS["cv.txt"](), crit)["evaluation"]
    assert ev["retained"] is False
    assert "Moins de la moitié des compétences obligatoires" in ev["knockouts"]
    assert any("SAP" in n for n in ev["improvementNotes"])


def test_no_contact_is_knockout():
    text = "Jean Martin\nDéveloppeur\nCOMPÉTENCES\nPython, Django\nFORMATION\nMaster 2015".encode()
    ev = analyze("cv.txt", text, {"requiredSkills": ["Python"], "threshold": 10})["evaluation"]
    assert ev["retained"] is False and "Aucun email ni téléphone exploitable" in ev["knockouts"]


def test_without_criteria_scores_completeness():
    ev = analyze("cv.txt", ALL_FORMATS["cv.txt"](), {})["evaluation"]
    assert "completeness" in ev["breakdown"] and ev["score"] == 100


def test_synonyms_satisfy_requirements():
    text = "Paul Ngoma\npaul@ex.com\nCOMPÉTENCES\nJS, ReactJS, Postgres, k8s, golang".encode()
    ev = analyze("cv.txt", text, {"requiredSkills": ["JavaScript", "React", "PostgreSQL", "Kubernetes", "Go"]})["evaluation"]
    assert ev["breakdown"]["required"]["missing"] == []


# --------------------------------------------------------------------- faux positifs

@pytest.mark.parametrize("text,absent", [
    ("J'utilise JavaScript au quotidien", "Java"),
    ("C'est un projet en R&D, 16 Go de RAM", "C"),
    ("C'est un projet en R&D, 16 Go de RAM", "R"),
    ("C'est un projet en R&D, 16 Go de RAM", "Go"),
    ("Je maîtrise le C++ et le C#", "C"),
    ("Scrum Master certifié", None),
])
def test_no_false_positive_skills(text, absent):
    found = {s["name"] for s in skills.detect_skills(text, {"skills": text})}
    if absent:
        assert absent not in found
    else:
        assert "Scrum" in found


def test_scrum_master_is_not_a_master_degree():
    lvl, _ = education.education({"experience": "Scrum Master chez Orange"}, "Scrum Master chez Orange")
    assert lvl == 0


def test_skill_detected_cpp_and_csharp():
    found = {s["name"] for s in skills.detect_skills("Langages : C++, C#, .NET", {"skills": "Langages : C++, C#, .NET"})}
    assert {"C++", "C#", ".NET"} <= found


# --------------------------------------------------------------------- expérience

def test_overlapping_periods_not_double_counted():
    t = "Poste A janvier 2018 - décembre 2019\nPoste B juin 2019 - décembre 2020"
    assert experience.total_years(experience.periods(t, date(2025, 1, 1))) == 3.0


def test_present_and_numeric_dates():
    today = date(2024, 6, 1)
    assert experience.total_years(experience.periods("01/2020 - aujourd'hui", today)) == pytest.approx(4.4, abs=0.1)
    assert experience.total_years(experience.periods("Since March 2022", today)) == pytest.approx(2.3, abs=0.1)


def test_education_dates_not_counted_as_experience():
    secs = split_sections("EXPÉRIENCE\nStage 2022 - 2022\nFORMATION\nLicence 2015 - 2018\nMaster 2018 - 2020")
    years, method = experience.experience_years(secs, "")
    assert years == 1.0 and method == "periods:experience"


# --------------------------------------------------------------------- coordonnées

def test_phone_formats():
    assert contacts.extract_phones("Tél : 06 12 34 56 78") == ["+33 6 12 34 56 78"]
    assert contacts.extract_phones("Tel: +243 81 234 5678") == ["+243 812 345 678"]  # format officiel RDC
    assert contacts.extract_phones("Né en 1995, code postal 75011, 2018-2020") == []


def test_email_with_spaces_and_case():
    assert contacts.extract_emails("Email : Jean.Dupont @ Gmail.com") == ["jean.dupont@gmail.com"]


# --------------------------------------------------------------------- sécurité de l'extraction

def test_zip_bomb_rejected():
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("word/document.xml", "<a>" + "0" * 70_000_000 + "</a>")
    with pytest.raises(ExtractionError, match="zip bomb|compression"):
        extract("cv.docx", buf.getvalue())


def test_xxe_rejected():
    payload = ('<?xml version="1.0"?><!DOCTYPE x [<!ENTITY e SYSTEM "file:///c:/windows/win.ini">]>'
               '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>&e;</w:t></w:r></w:p></w:body></w:document>')
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as z:
        z.writestr("word/document.xml", payload)
    with pytest.raises(ExtractionError):
        extract("cv.docx", buf.getvalue())


def test_corrupted_files_give_clean_errors():
    for name in ("cv.pdf", "cv.docx", "cv.xlsx", "cv.doc", "cv.xls"):
        with pytest.raises(ExtractionError):
            extract(name, b"this is not a real file at all" * 10)


def test_unsupported_extension():
    with pytest.raises(ExtractionError):
        extract("malware.exe", b"MZ\x90\x00")


def test_image_without_ocr_gives_clear_error():
    with pytest.raises(ExtractionError, match="OCR"):
        extract("scan.png", b"\x89PNG\r\n\x1a\n" + b"\x00" * 50)

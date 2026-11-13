"""
Évaluation d'un profil face aux critères d'une offre : score 0–100 explicable.

Poids (renormalisés sur les seuls critères renseignés) :
  compétences obligatoires 45 · compétences souhaitées 10 · adéquation sémantique 15
  expérience 15 · niveau d'études 10 · langues 5
Règles éliminatoires : aucun moyen de contact ; moins de la moitié des compétences obligatoires.
"""
from __future__ import annotations

from .education import LEVEL_LABELS
from .languages import language_aliases
from .ml import MLClient, cosine
from .skills import match_requirement
from .text_utils import norm, term_pattern

WEIGHTS = {"required": 45, "nice": 10, "semantic": 15, "experience": 15, "education": 10, "languages": 5}
SEMANTIC_SKILL_THRESHOLD = 0.82
SEMANTIC_PARTIAL_CREDIT = 0.6


def _semantic_skill_matches(missing: list[str], profile_skills: list[str], ml: MLClient | None) -> dict[str, tuple[str, float]]:
    """Exigences non trouvées littéralement mais proches d'une compétence du CV (« Postgres » ~ « bases SQL »)."""
    if not ml or not ml.available or not missing or not profile_skills:
        return {}
    vecs = ml.embed([f"query: {m}" for m in missing] + [f"passage: {s}" for s in profile_skills[:60]])
    if not vecs:
        return {}
    req_vecs, skill_vecs = vecs[: len(missing)], vecs[len(missing):]
    out = {}
    for req, rv in zip(missing, req_vecs):
        best = max(((s, cosine(rv, sv)) for s, sv in zip(profile_skills, skill_vecs)), key=lambda x: x[1], default=None)
        if best and best[1] >= SEMANTIC_SKILL_THRESHOLD:
            out[req] = best
    return out


def _semantic_fit(criteria: dict, text: str, sections: dict, ml: MLClient | None) -> float | None:
    offer = " ".join(filter(None, [criteria.get("jobTitle", ""), criteria.get("description", ""),
                                   ", ".join(criteria.get("requiredSkills", []) + criteria.get("niceSkills", []))])).strip()
    if not offer or not ml or not ml.available:
        return None
    chunks = [sections.get(k, "")[:1200] for k in ("profile", "experience", "skills", "projects")]
    chunks = [c for c in chunks if len(c) > 40] or [text[:1500]]
    vecs = ml.embed([f"query: {offer[:2000]}"] + [f"passage: {c}" for c in chunks])
    if not vecs:
        return None
    sims = sorted((cosine(vecs[0], v) for v in vecs[1:]), reverse=True)
    sim = 0.7 * sims[0] + 0.3 * (sum(sims) / len(sims))
    # Calibration multilingual-e5 : ~0.75 = sans rapport, ~0.88 = très proche.
    return max(0.0, min(1.0, (sim - 0.76) / (0.87 - 0.76)))


def evaluate(profile: dict, criteria: dict, text: str, sections: dict, ml: MLClient | None = None) -> dict:
    ntext = norm(text)
    required = criteria.get("requiredSkills", []) or []
    nice = criteria.get("niceSkills", []) or []
    min_exp = float(criteria.get("minExperienceYears") or 0)
    min_edu = int(criteria.get("minEducationLevel") or 0)
    langs = criteria.get("languages", []) or []
    threshold = int(criteria.get("threshold", 60))

    parts: dict[str, dict] = {}
    notes: list[str] = []

    # --- compétences
    profile_skill_names = [s["name"] for s in profile.get("skills", [])]
    req_found = {r: match_requirement(r, text, ntext) for r in required}
    missing_req = [r for r, m in req_found.items() if not m]
    semantic_hits = _semantic_skill_matches(missing_req, profile_skill_names, ml)
    if required:
        credit = sum(1 for m in req_found.values() if m) + SEMANTIC_PARTIAL_CREDIT * len(semantic_hits)
        parts["required"] = {
            "score": credit / len(required),
            "matched": [m for m in req_found.values() if m] + [
                {"requirement": r, "matched": s, "method": "semantic", "similarity": round(sim, 2)} for r, (s, sim) in semantic_hits.items()],
            "missing": [r for r in missing_req if r not in semantic_hits],
        }
    if nice:
        nice_found = [match_requirement(r, text, ntext) for r in nice]
        parts["nice"] = {"score": sum(1 for m in nice_found if m) / len(nice),
                         "matched": [m for m in nice_found if m], "missing": [r for r, m in zip(nice, nice_found) if not m]}

    # --- sémantique
    sem = _semantic_fit(criteria, text, sections, ml)
    if sem is not None:
        parts["semantic"] = {"score": sem}

    # --- expérience
    years = float(profile.get("experienceYears") or 0)
    if min_exp > 0:
        parts["experience"] = {"score": min(1.0, years / min_exp), "years": years, "required": min_exp}

    # --- études
    level = int(profile.get("educationLevel") or 0)
    if min_edu > 0:
        s = 1.0 if level >= min_edu else 0.5 if level >= min_edu - 1 and level > 0 else 0.0
        parts["education"] = {"score": s, "level": level, "required": min_edu}

    # --- langues
    if langs:
        have = {norm(l["name"]) for l in profile.get("languages", [])}
        ok = []
        for lang in langs:
            aliases = language_aliases(lang)
            if have & set(aliases) or any(term_pattern(a).search(ntext) for a in aliases):
                ok.append(lang)
        parts["languages"] = {"score": len(ok) / len(langs), "matched": ok, "missing": [l for l in langs if l not in ok]}

    # --- agrégation
    has_contact = bool(profile.get("email") or profile.get("phone"))
    if parts:
        total_w = sum(WEIGHTS[k] for k in parts)
        score = round(100 * sum(WEIGHTS[k] * v["score"] for k, v in parts.items()) / total_w)
        for k, v in parts.items():
            v["weight"] = round(100 * WEIGHTS[k] / total_w)
            v["score"] = round(v["score"], 3)
    else:
        # Sans critère : qualité/complétude du CV.
        checks = [has_contact, bool(profile.get("fullName")), years > 0, level > 0, len(profile_skill_names) >= 3,
                  bool(profile.get("languages"))]
        score = round(100 * sum(checks) / len(checks))
        parts["completeness"] = {"score": round(score / 100, 3), "weight": 100}

    knockouts = []
    if not has_contact:
        knockouts.append("Aucun email ni téléphone exploitable")
    if required and parts["required"]["score"] < 0.5:
        knockouts.append("Moins de la moitié des compétences obligatoires")
    retained = score >= threshold and not knockouts

    # --- notes d'amélioration (retour au candidat / aide au recruteur)
    if not profile.get("email"):
        notes.append("Aucune adresse email détectée : indiquez-la en haut du CV.")
    if not profile.get("phone"):
        notes.append("Aucun numéro de téléphone valide détecté : ajoutez-le avec l'indicatif pays (ex. +242…).")
    if not profile.get("fullName"):
        notes.append("Nom et prénom non identifiables : placez-les clairement en en-tête.")
    if parts.get("required", {}).get("missing"):
        notes.append("Compétences attendues absentes du CV : " + ", ".join(parts["required"]["missing"])
                     + ". Si vous les possédez, citez-les explicitement (expériences, projets, formations).")
    if "experience" in parts and parts["experience"]["score"] < 1:
        notes.append(f"Expérience détectée : {years:g} an(s) pour {min_exp:g} demandé(s). Datez précisément chaque poste (mois/année).")
    if "education" in parts and parts["education"]["score"] < 1:
        notes.append(f"Niveau d'études détecté : {LEVEL_LABELS.get(level, 'non identifié')} ; niveau attendu : {LEVEL_LABELS.get(min_edu, min_edu)}.")
    if parts.get("languages", {}).get("missing"):
        notes.append("Langues attendues non mentionnées : " + ", ".join(parts["languages"]["missing"]) + " (précisez le niveau, ex. B2).")
    if "semantic" in parts and parts["semantic"]["score"] < 0.35:
        notes.append("Le contenu du CV est éloigné de la description du poste : mettez en avant les missions en lien avec l'offre.")

    return {
        "score": max(0, min(100, score)),
        "threshold": threshold,
        "retained": retained,
        "knockouts": knockouts,
        "breakdown": parts,
        "improvementNotes": [] if retained else notes,
    }

"""
Évaluation professionnelle des CV : décision retenu / non retenu
et génération des notes d'amélioration pour les CV non retenus.
"""


def _skills_list_from_criteria(criteria_data):
    """Extrait la liste des compétences requises depuis les critères."""
    if not criteria_data:
        return []
    if isinstance(criteria_data, dict) and "skills" in criteria_data:
        s = criteria_data["skills"]
        if isinstance(s, str) and s.strip():
            return [x.strip() for x in s.split(",") if x.strip()]
        if isinstance(s, list):
            return s
    if isinstance(criteria_data, list):
        return criteria_data
    return []


def evaluate_cv(analysis, criteria_data, required_skills_min_ratio=0.25):
    """
    Évalue un CV par rapport aux critères.
    Retourne (retained: bool, improvement_notes: list[str]).
    """
    notes = []
    required_skills = _skills_list_from_criteria(criteria_data)
    emails = analysis.get("emails") or []
    phones = analysis.get("phones") or []
    skills_found = analysis.get("skills") or []
    persons = analysis.get("persons") or []

    # --- Critères bloquants ou à signaler ---

    # Coordonnées
    has_contact = bool(emails or phones)
    if not emails:
        notes.append(
            "Aucune adresse email détectée. Indiquez clairement votre email pour permettre aux recruteurs de vous contacter."
        )
    if not phones:
        notes.append(
            "Aucun numéro de téléphone détecté. Ajoutez un numéro de contact pour faciliter les échanges."
        )

    # Identité
    if not persons:
        notes.append(
            "Votre nom (ou identité) n’est pas clairement identifiable. Précisez nom et prénom en en-tête du CV."
        )

    # Compétences requises
    missing_skills = []
    if required_skills:
        for s in required_skills:
            if not s:
                continue
            if not any(s.lower() == sk.lower() for sk in skills_found):
                missing_skills.append(s)
        if missing_skills:
            notes.append(
                "Compétences attendues par le recruteur non présentes ou peu mises en avant : "
                + ", ".join(missing_skills)
                + ". Pensez à les mentionner explicitement (formations, expériences, projets) si vous les possédez."
            )
        if skills_found and required_skills:
            ratio = len(skills_found) / len(required_skills)
            if ratio < required_skills_min_ratio:
                notes.append(
                    "Peu de correspondance avec le profil recherché ("
                    + str(len(skills_found))
                    + "/"
                    + str(len(required_skills))
                    + " compétences). Enrichissez le CV avec des expériences et compétences en lien avec le poste."
                )

    # --- Décision : retenu ou non ---
    # Retenu si : au moins un moyen de contact
    # et soit pas de compétences requises, soit au moins 25 % des compétences requises trouvées
    if not has_contact:
        retained = False
    elif not required_skills:
        retained = True  # pas d'exigence de compétences → retenu si contact
    else:
        min_skills = max(1, len(required_skills) * required_skills_min_ratio)
        retained = len(skills_found) >= min_skills

    improvement_notes = notes if not retained else []

    return retained, improvement_notes

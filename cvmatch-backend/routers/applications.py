# routers/applications.py
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Body
from fastapi.responses import FileResponse
from typing import Optional, List
from pydantic import BaseModel
import os
import uuid
import fitz  # PyMuPDF
import docx
from sentence_transformers import SentenceTransformer, util
from db import get_connection
from .auth import get_current_user
import re
from utils.emailer import send_email

router = APIRouter()

ALLOWED_EXTS = {".pdf", ".doc", ".docx"}
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads", "cv")
UPLOAD_DIR = os.path.abspath(UPLOAD_DIR)
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Charger un modèle une seule fois pour l'analyse globale
MODEL = SentenceTransformer("paraphrase-MiniLM-L6-v2")

# Stopwords FR/EN de base pour filtrer les tokens non discriminants
STOPWORDS = {
    "le","la","les","de","des","du","un","une","et","ou","a","au","aux","en","dans","pour","par","avec","sur","chez","sans","sous","plus","moins","très","tres","ce","cet","cette","ces","à","d'","l'","est","être","ete","été","sont","nous","vous","ils","elles","je","tu","il","elle","on",
    "the","a","an","and","or","to","of","in","on","for","by","with","at","from","as","is","are","was","were","be","been","it","this","that","these","those"
}

def tokenize(text: str) -> set:
    # Python re ne supporte pas \p{L}; on couvre latin étendu explicitement
    tokens = re.split(r"[^A-Za-zÀ-ÖØ-öø-ÿ0-9]+", text.lower())
    cleaned = {t for t in tokens if t and len(t) >= 2 and t not in STOPWORDS}
    return cleaned

def extract_required_years(text: str) -> int:
    years = [int(m.group(1)) for m in re.finditer(r"(\d+)\s*(ans|year|years)", text.lower())]
    return max(years) if years else 0

def extract_text_from_pdf(file_path: str) -> str:
    text = ""
    with fitz.open(file_path) as doc:
        for page in doc:
            text += page.get_text()
    return text

def extract_text_from_docx(file_path: str) -> str:
    d = docx.Document(file_path)
    return "\n".join(p.text for p in d.paragraphs)

class AnalyzeFilters(BaseModel):
    ville: Optional[str] = None
    sexe: Optional[str] = None
    langages: Optional[List[str]] = None  # langages de programmation
    langues: Optional[List[str]] = None   # langues parlées
    experience_min: Optional[int] = None
    mots_cles: Optional[List[str]] = None


def _normalize_text(s: Optional[str]) -> str:
    return (s or "").lower()


def _cv_matches_filters(cv_text: str, app_row: dict, filters: AnalyzeFilters) -> bool:
    if not filters:
        return True
    t = _normalize_text(cv_text)
    # Ville: CV ou localisation utilisateur
    if filters.ville:
        ville = filters.ville.strip().lower()
        user_loc = _normalize_text(app_row.get("localisation"))
        if (ville not in t) and (ville not in user_loc):
            return False
    # Sexe: recherche brute dans le texte (ex: "homme", "femme")
    if filters.sexe:
        if filters.sexe.strip().lower() not in t:
            return False
    # Langages de programmation: tous doivent être présents
    if filters.langages:
        langs = [x.strip().lower() for x in filters.langages if x and x.strip()]
        if any(l not in t for l in langs):
            return False
    # Langues parlées: tous doivent être présents
    if filters.langues:
        lngs = [x.strip().lower() for x in filters.langues if x and x.strip()]
        if any(l not in t for l in lngs):
            return False
    # Mots-clés généraux: tous doivent être présents
    if filters.mots_cles:
        keys = [x.strip().lower() for x in filters.mots_cles if x and x.strip()]
        if any(k not in t for k in keys):
            return False
    # Expérience minimale en années (>=)
    if isinstance(filters.experience_min, int) and filters.experience_min > 0:
        years = extract_required_years(cv_text)
        if years < filters.experience_min:
            return False
    return True

@router.post("/", response_model=dict)
async def create_application(
    cv: UploadFile = File(...),
    offre_id: int = Form(...),
    lettre_motivation: Optional[str] = Form(None),
    current_user: dict = Depends(get_current_user)
):
    # Seuls les candidats peuvent postuler
    if current_user.get("type_utilisateur") != "candidat":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Seuls les candidats peuvent postuler")

    # Valider extension
    _, ext = os.path.splitext(cv.filename or "")
    ext = ext.lower()
    if ext not in ALLOWED_EXTS:
        raise HTTPException(status_code=400, detail="Format de fichier non supporté (PDF, DOC, DOCX)")

    # Sauvegarder le fichier sur disque
    contents = await cv.read()
    unique_name = f"{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(UPLOAD_DIR, unique_name)
    with open(filepath, "wb") as f:
        f.write(contents)

    # Enregistrer en base
    conn = get_connection()
    if conn is None:
        raise HTTPException(status_code=500, detail="Erreur connexion DB")
    cursor = conn.cursor(dictionary=True)
    try:
        # Vérifier si l'offre existe et est active
        cursor.execute("SELECT id FROM offres_emploi WHERE id = %s AND statut = 'active'", (offre_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Offre introuvable ou non active")

        # Éviter les doublons
        cursor.execute(
            "SELECT id FROM candidatures WHERE candidat_id = %s AND offre_emploi_id = %s",
            (current_user["id"], offre_id),
        )
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="Vous avez déjà postulé à cette offre")

        insert_sql = (
            "INSERT INTO candidatures (candidat_id, offre_emploi_id, chemin_fichier_cv, lettre_motivation, statut, date_candidature) "
            "VALUES (%s, %s, %s, %s, %s, NOW())"
        )
        rel_path = os.path.relpath(filepath, start=BASE_DIR)
        cursor.execute(
            insert_sql,
            (current_user["id"], offre_id, rel_path.replace("\\", "/"), lettre_motivation, "en_attente"),
        )
        application_id = cursor.lastrowid

        # Récupérer infos recruteur + offre pour la notification
                # Correction: on a besoin du nom du candidat (current_user), et du recruteur_id de l'offre
        cursor.execute("SELECT o.titre, o.recruteur_id FROM offres_emploi o WHERE o.id = %s", (offre_id,))
        offer_row = cursor.fetchone()
        if offer_row:
            titre_offre = offer_row.get("titre")
            recruteur_id = offer_row.get("recruteur_id")
            # Récupérer nom candidat
            cursor.execute("SELECT prenom, nom FROM utilisateurs WHERE id = %s", (current_user["id"],))
            cand = cursor.fetchone() or {"prenom": "Un", "nom": "candidat"}
            notif_titre = "Nouvelle candidature reçue"
            notif_msg = f"Le candidat {cand['prenom']} {cand['nom']} a postulé à '{titre_offre}'."
            cursor.execute(
                "INSERT INTO notifications (recruteur_id, type, titre, message, offre_id, candidature_id, lu) VALUES (%s, %s, %s, %s, %s, %s, FALSE)",
                (recruteur_id, 'application', notif_titre, notif_msg, offre_id, application_id)
            )
        conn.commit()
        return {"message": "Candidature envoyée avec succès"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

@router.get("/{application_id}/cv")
async def download_cv(application_id: int, current_user: dict = Depends(get_current_user)):
    # Téléchargement sécurisé du CV: réservé au recruteur propriétaire de l'offre
    conn = get_connection()
    if conn is None:
        raise HTTPException(status_code=500, detail="Erreur connexion DB")
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT c.chemin_fichier_cv, o.recruteur_id FROM candidatures c JOIN offres_emploi o ON o.id = c.offre_emploi_id WHERE c.id = %s",
            (application_id,),
        )
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Candidature introuvable")
        if current_user.get("type_utilisateur") != "recruteur" or row["recruteur_id"] != current_user["id"]:
            raise HTTPException(status_code=403, detail="Non autorisé")
        rel_path = row["chemin_fichier_cv"]
        abs_path = os.path.abspath(os.path.join(BASE_DIR, rel_path))
        if not os.path.isfile(abs_path):
            raise HTTPException(status_code=404, detail="Fichier introuvable")
        filename = os.path.basename(abs_path)
        return FileResponse(abs_path, filename=filename)
    finally:
        cursor.close()
        conn.close()

@router.get("/offers/{offer_id}", response_model=List[dict])
async def list_applications_for_offer(offer_id: int, current_user: dict = Depends(get_current_user)):
    # Seuls les recruteurs propriétaires de l'offre peuvent voir les candidatures
    if current_user.get("type_utilisateur") != "recruteur":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès réservé aux recruteurs")

    conn = get_connection()
    if conn is None:
        raise HTTPException(status_code=500, detail="Erreur connexion DB")
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT id FROM offres_emploi WHERE id = %s AND recruteur_id = %s",
            (offer_id, current_user["id"]),
        )
        if not cursor.fetchone():
            raise HTTPException(status_code=403, detail="Vous n'êtes pas autorisé à voir les candidatures de cette offre")

        cursor.execute(
            "SELECT c.id, c.offre_emploi_id, c.candidat_id, c.chemin_fichier_cv, c.lettre_motivation, c.statut, c.date_candidature, "
            "u.prenom, u.nom, u.email "
            "FROM candidatures c JOIN utilisateurs u ON u.id = c.candidat_id WHERE c.offre_emploi_id = %s ORDER BY c.date_candidature DESC",
            (offer_id,),
        )
        rows = cursor.fetchall()
        for r in rows:
            if hasattr(r.get("date_candidature"), "isoformat"):
                r["date_candidature"] = r["date_candidature"].isoformat()
        return rows
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

@router.post("/{application_id}/select", response_model=dict)
async def select_application(application_id: int, current_user: dict = Depends(get_current_user)):
    """
    Marquer une candidature comme présélectionnée par le recruteur propriétaire de l'offre.
    Statut mis à jour: 'preselectionnee'.
    """
    if current_user.get("type_utilisateur") != "recruteur":
        raise HTTPException(status_code=403, detail="Accès réservé aux recruteurs")

    conn = get_connection()
    if conn is None:
        raise HTTPException(status_code=500, detail="Erreur connexion DB")
    cursor = conn.cursor(dictionary=True)
    try:
        # Vérifier que la candidature existe et appartient à une offre du recruteur
        cursor.execute(
            "SELECT c.id, c.offre_emploi_id, o.recruteur_id FROM candidatures c JOIN offres_emploi o ON o.id = c.offre_emploi_id WHERE c.id = %s",
            (application_id,)
        )
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Candidature introuvable")
        if row["recruteur_id"] != current_user["id"]:
            raise HTTPException(status_code=403, detail="Non autorisé")

        # Mettre à jour le statut
        cursor.execute("UPDATE candidatures SET statut = 'preselectionnee' WHERE id = %s", (application_id,))
        conn.commit()
        return {"message": "Candidat présélectionné", "application_id": application_id}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

def _send_email_event(event_type: str, email: str, name: str, application_id: int, offer_title: str, recruiter_name: str, recruiter_email: str):
    """
    Envoie un email d'acceptation ou de refus au candidat,
    en mettant le nom et email du recruteur dans Reply-To.
    """
    subject = ""
    text = ""
    html = None

    if event_type == "accept":
        subject = f"Confirmation de sélection — {offer_title}"
        text = (
            f"Bonjour {name},\n\n"
            f"Nous sommes heureux de vous informer que votre candidature a été sélectionnée pour le poste '{offer_title}'.\n"
            f"Notre équipe RH vous contactera pour la suite du processus.\n\n"
            f"Cordialement,\n{recruiter_name} - CVMatch"
        )
    elif event_type == "refuse":
        subject = f"Réponse à votre candidature — {offer_title}"
        text = (
            f"Bonjour {name},\n\n"
            f"Après examen attentif, nous ne pouvons pas donner une suite favorable à votre candidature pour '{offer_title}'.\n"
            f"Nous vous remercions de l'intérêt porté et vous souhaitons une bonne continuation.\n\n"
            f"Cordialement,\n{recruiter_name} - CVMatch"
        )

    return send_email(
        to_email=email,
        subject=subject,
        text_body=text,
        html_body=html,
        reply_to=f"{recruiter_name} <{recruiter_email}>"
    )

@router.post("/{application_id}/preselect", response_model=dict)
async def preselect_application(application_id: int, current_user: dict = Depends(get_current_user)):
    if current_user.get("type_utilisateur") != "recruteur":
        raise HTTPException(status_code=403, detail="Accès réservé aux recruteurs")
    conn = get_connection();
    if conn is None:
        raise HTTPException(status_code=500, detail="Erreur connexion DB")
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute("""
            SELECT c.id, c.offre_emploi_id, u.prenom, u.nom, u.email, o.recruteur_id
            FROM candidatures c
            JOIN utilisateurs u ON u.id = c.candidat_id
            JOIN offres_emploi o ON o.id = c.offre_emploi_id
            WHERE c.id = %s
        """, (application_id,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Candidature introuvable")
        if row["recruteur_id"] != current_user["id"]:
            raise HTTPException(status_code=403, detail="Non autorisé")
        cur.execute("UPDATE candidatures SET statut='preselectionnee' WHERE id=%s", (application_id,))
        conn.commit()
        return {"message": "Candidat pré-sélectionné"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback(); raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close(); conn.close()

@router.post("/{application_id}/accept", response_model=dict)
async def accept_application(application_id: int, total: int | None = None, current_user: dict = Depends(get_current_user)):
    if current_user.get("type_utilisateur") != "recruteur":
        raise HTTPException(status_code=403, detail="Accès réservé aux recruteurs")
    conn = get_connection();
    if conn is None:
        raise HTTPException(status_code=500, detail="Erreur connexion DB")
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute("""
            SELECT c.id, c.offre_emploi_id, u.prenom, u.nom, u.email, o.recruteur_id
            FROM candidatures c
            JOIN utilisateurs u ON u.id = c.candidat_id
            JOIN offres_emploi o ON o.id = c.offre_emploi_id
            WHERE c.id = %s
        """, (application_id,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Candidature introuvable")
        if row["recruteur_id"] != current_user["id"]:
            raise HTTPException(status_code=403, detail="Non autorisé")

        # Récupérer titre offre
        cur.execute("SELECT titre FROM offres_emploi WHERE id=%s", (row["offre_emploi_id"],))
        offer_row = cur.fetchone() or {"titre": "votre candidature"}
        # Accepter ce candidat
        cur.execute("UPDATE candidatures SET statut='acceptee' WHERE id=%s", (application_id,))
        # Email de confirmation
        email_res = _send_email_event("accept", row["email"], f"{row['prenom']} {row['nom']}", application_id, offer_row.get("titre"), f"{current_user['prenom']} {current_user['nom']}", current_user["email"])

        finalized = False
        # Si un total est fourni, vérifier si le quota est atteint et refuser les autres automatiquement
        if isinstance(total, int) and total > 0:
            cur.execute("SELECT COUNT(*) AS c FROM candidatures WHERE offre_emploi_id=%s AND statut='acceptee'", (row["offre_emploi_id"],))
            count_acc = int((cur.fetchone() or {"c":0})["c"])
            if count_acc >= total:
                
                # Marquer tous les autres comme refusés (sauf déjà acceptés)
                cur.execute("""
                    SELECT c.id, u.prenom, u.nom, u.email
                    FROM candidatures c 
                    JOIN utilisateurs u ON u.id = c.candidat_id
                    WHERE c.offre_emploi_id=%s 
                    AND c.statut NOT IN ('acceptee', 'preselectionnee')
                """, (row["offre_emploi_id"],))
                others = cur.fetchall()
                cur.execute("SELECT titre FROM offres_emploi WHERE id=%s", (row["offre_emploi_id"],))
                offer2 = cur.fetchone() or {"titre": "votre candidature"}

                 # Mettre à jour le statut seulement pour ceux qui sont encore "pending" ou "en cours"
                cur.execute(""" UPDATE candidatures SET statut='refusee' WHERE offre_emploi_id=%s AND statut NOT IN ('acceptee', 'preselectionnee') """, (row["offre_emploi_id"],))
                
                # Envoyer emails de refus aux autres
                for o in others:
                    _send_email_event("refuse", o["email"], f"{o['prenom']} {o['nom']}", o["id"], offer2.get("titre"), f"{current_user['prenom']} {current_user['nom']}", current_user["email"])
                finalized = True
        conn.commit()
        return {"message": "Candidat sélectionné", "finalized": finalized, "email_status": (email_res or {}).get("status"), "email_detail": (email_res or {}).get("detail")}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback(); raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close(); conn.close()

@router.post("/{application_id}/refuse", response_model=dict)
async def refuse_application(application_id: int, current_user: dict = Depends(get_current_user)):
    if current_user.get("type_utilisateur") != "recruteur":
        raise HTTPException(status_code=403, detail="Accès réservé aux recruteurs")
    conn = get_connection();
    if conn is None:
        raise HTTPException(status_code=500, detail="Erreur connexion DB")
    cur = conn.cursor(dictionary=True)
    try:
        cur.execute("""
            SELECT c.id, c.offre_emploi_id, u.prenom, u.nom, u.email, o.recruteur_id
            FROM candidatures c
            JOIN utilisateurs u ON u.id = c.candidat_id
            JOIN offres_emploi o ON o.id = c.offre_emploi_id
            WHERE c.id = %s
        """, (application_id,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Candidature introuvable")
        if row["recruteur_id"] != current_user["id"]:
            raise HTTPException(status_code=403, detail="Non autorisé")
        cur.execute("SELECT titre FROM offres_emploi WHERE id=%s", (row["offre_emploi_id"],))
        offer_row = cur.fetchone() or {"titre": "votre candidature"}
        cur.execute("UPDATE candidatures SET statut='refusee' WHERE id=%s", (application_id,))
        # Email de refus uniquement en cas de statut refusé
        email_res = _send_email_event("refuse", row["email"], f"{row['prenom']} {row['nom']}", application_id, offer_row.get("titre"), f"{current_user['prenom']} {current_user['nom']}", current_user["email"])
        conn.commit()
        return {"message": "Candidat refusé", "email_status": (email_res or {}).get("status"), "email_detail": (email_res or {}).get("detail")}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback(); raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close(); conn.close()

@router.get("/selected", response_model=List[dict])
async def list_selected_candidates(current_user: dict = Depends(get_current_user)):
    """
    Lister les candidats sélectionnés (statut 'preselectionnee' ou 'acceptee')
    pour toutes les offres appartenant au recruteur connecté.
    """
    if current_user.get("type_utilisateur") != "recruteur":
        raise HTTPException(status_code=403, detail="Accès réservé aux recruteurs")

    conn = get_connection()
    if conn is None:
        raise HTTPException(status_code=500, detail="Erreur connexion DB")
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            """
            SELECT c.id AS application_id,
                   c.offre_emploi_id,
                   c.candidat_id,
                   c.chemin_fichier_cv,
                   c.lettre_motivation,
                   c.statut,
                   c.date_candidature,
                   u.prenom,
                   u.nom,
                   u.email,
                   o.titre AS offre_titre
            FROM candidatures c
            JOIN utilisateurs u ON u.id = c.candidat_id
            JOIN offres_emploi o ON o.id = c.offre_emploi_id
            WHERE o.recruteur_id = %s AND c.statut IN ('preselectionnee','acceptee')
            ORDER BY c.date_candidature DESC
            """,
            (current_user["id"],)
        )
        rows = cursor.fetchall()
        for r in rows:
            if hasattr(r.get("date_candidature"), "isoformat"):
                r["date_candidature"] = r["date_candidature"].isoformat()
        return rows
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

@router.post("/offers/{offer_id}/analyze-all", response_model=List[dict])
async def analyze_all_applications_for_offer(offer_id: int, filters: Optional[AnalyzeFilters] = Body(None), current_user: dict = Depends(get_current_user)):
    # Seul le recruteur propriétaire de l'offre
    if current_user.get("type_utilisateur") != "recruteur":
        raise HTTPException(status_code=403, detail="Accès réservé aux recruteurs")
    conn = get_connection()
    if conn is None:
        raise HTTPException(status_code=500, detail="Erreur connexion DB")
    cursor = conn.cursor(dictionary=True)
    try:
        # Vérifier propriété de l'offre et récupérer son contenu
        cursor.execute("SELECT id, recruteur_id, titre, description, exigences, localisation FROM offres_emploi WHERE id = %s", (offer_id,))
        offer = cursor.fetchone()
        if not offer:
            raise HTTPException(status_code=404, detail="Offre introuvable")
        if offer["recruteur_id"] != current_user["id"]:
            raise HTTPException(status_code=403, detail="Non autorisé")

        offer_text = f"{offer['titre']}\n\n{offer['description']}\n\n{('Exigences: ' + offer['exigences']) if offer.get('exigences') else ''}\n\nLieu: {offer.get('localisation') or ''}"

        # Préparer mots-clés et années d'expérience requis
        offer_keywords = tokenize((offer.get('exigences') or '') + ' ' + (offer.get('description') or ''))
        required_years = extract_required_years((offer.get('exigences') or '') + ' ' + (offer.get('description') or ''))

        # Récupérer toutes les candidatures
        cursor.execute(
            "SELECT c.id, c.candidat_id, c.chemin_fichier_cv, c.lettre_motivation, u.prenom, u.nom, u.email FROM candidatures c "
            "JOIN utilisateurs u ON u.id = c.candidat_id WHERE c.offre_emploi_id = %s",
            (offer_id,)
        )
        applications = cursor.fetchall()

        results = []
        for app in applications:
            rel_path = app["chemin_fichier_cv"]
            abs_path = os.path.abspath(os.path.join(BASE_DIR, rel_path))
            if not os.path.isfile(abs_path):
                continue
            ext = os.path.splitext(abs_path)[1].lower()
            try:
                if ext == ".pdf":
                    cv_text = extract_text_from_pdf(abs_path)
                elif ext in {".doc", ".docx"}:
                    cv_text = extract_text_from_docx(abs_path)
                else:
                    continue

                # Appliquer les filtres si fournis
                if filters and not _cv_matches_filters(cv_text, app, filters):
                    continue

                # Similarité sémantique (SBERT)
                embeddings = MODEL.encode([offer_text, cv_text])
                sbert_score = float(util.cos_sim(embeddings[0], embeddings[1]).item() * 100)

                # Couverture de mots-clés requis
                cv_tokens = tokenize(cv_text)
                if offer_keywords:
                    matched = len(offer_keywords & cv_tokens)
                    recall = matched / max(len(offer_keywords), 1)
                    keyword_score = recall * 100.0
                else:
                    keyword_score = 0.0

                # Expérience (années) si identifiable
                cv_years = extract_required_years(cv_text)
                exp_score = 100.0
                if required_years > 0:
                    exp_score = min(cv_years / required_years, 1.0) * 100.0

                # Combinaison pondérée
                combined_keywords = 0.85 * keyword_score + 0.15 * exp_score
                final_score = 0.7 * sbert_score + 0.3 * combined_keywords
                final_score = max(0.0, min(100.0, final_score))
            except Exception:
                final_score = 0.0

            results.append({
                "application_id": app["id"],
                "candidat_id": app["candidat_id"],
                "prenom": app["prenom"],
                "nom": app["nom"],
                "email": app["email"],
                "chemin_fichier_cv": app["chemin_fichier_cv"],
                "lettre_motivation": app.get("lettre_motivation"),
                "score": round(final_score, 2),
            })

        # Mettre à jour les scores en base
        for r in results:
            cursor.execute("UPDATE candidatures SET score_ia = %s WHERE id = %s", (r["score"], r["application_id"]))
        conn.commit()

        # Trier par score desc et renvoyer
        results.sort(key=lambda x: x["score"], reverse=True)
        return results
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()
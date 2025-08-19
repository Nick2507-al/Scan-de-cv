# routers/companies.py
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse
from typing import Optional
import os
from pathlib import Path
from db import get_connection
from .auth import get_current_user

router = APIRouter()

# Permissions: Seuls les recruteurs peuvent accéder aux informations de l'entreprise
@router.get("/status", response_model=dict)
async def company_status(current_user: dict = Depends(get_current_user)):
    """Retourne l'état de complétion du profil entreprise du recruteur courant."""
    if current_user.get("type_utilisateur") != "recruteur":
        raise HTTPException(status_code=403, detail="Accès réservé aux recruteurs")

    conn = get_connection()
    if conn is None:
        raise HTTPException(status_code=500, detail="Erreur connexion DB")
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            """
            SELECT nom_entreprise, forme_juridique, activite_principale, adresse, ville, pays, telephone, email_contact
            FROM profils_recruteurs WHERE utilisateur_id = %s
            """,
            (current_user["id"],)
        )
        row = cursor.fetchone()
        if not row:
            return {"complete": False, "missing": [
                "nom_entreprise","forme_juridique","activite_principale","adresse","ville","pays","telephone","email_contact"
            ]}
        required = [
            ("nom_entreprise", row.get("nom_entreprise")),
            ("forme_juridique", row.get("forme_juridique")),
            ("activite_principale", row.get("activite_principale")),
            ("adresse", row.get("adresse")),
            ("ville", row.get("ville")),
            ("pays", row.get("pays")),
            ("telephone", row.get("telephone")),
            ("email_contact", row.get("email_contact")),
        ]
        missing = [k for k, v in required if not v or (isinstance(v, str) and not v.strip())]
        return {"complete": len(missing) == 0, "missing": missing}
    finally:
        cursor.close()
        conn.close()

# Ensure upload directory exists
UPLOAD_DIR = Path(__file__).resolve().parent.parent / "uploads" / "companies"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Permissions: Seuls les recruteurs peuvent configurer le profil entreprise
@router.post("/setup", response_model=dict)
async def setup_company(
    nom_entreprise: str = Form(...),
    forme_juridique: Optional[str] = Form(None),
    activite_principale: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    adresse: Optional[str] = Form(None),
    code_postal: Optional[str] = Form(None),
    ville: Optional[str] = Form(None),
    pays: Optional[str] = Form(None),
    telephone: Optional[str] = Form(None),
    email: Optional[str] = Form(None),
    site_web: Optional[str] = Form(None),
    confidentialite: Optional[bool] = Form(False),
    document1: Optional[UploadFile] = File(None),
    document2: Optional[UploadFile] = File(None),
    document3: Optional[UploadFile] = File(None),
    current_user: dict = Depends(get_current_user)
):
    # Authorization: recruiters only
    if current_user.get("type_utilisateur") != "recruteur":
        raise HTTPException(status_code=403, detail="Accès réservé aux recruteurs")

    conn = get_connection()
    if conn is None:
        raise HTTPException(status_code=500, detail="Erreur connexion DB")
    cursor = conn.cursor(dictionary=True)

    try:
        # Upsert into profils_recruteurs (extend table if columns exist)
        # Try to add columns if they don't exist (safe guard)
        try:
            cursor.execute("ALTER TABLE profils_recruteurs ADD COLUMN IF NOT EXISTS adresse VARCHAR(255)")
            cursor.execute("ALTER TABLE profils_recruteurs ADD COLUMN IF NOT EXISTS code_postal VARCHAR(20)")
            cursor.execute("ALTER TABLE profils_recruteurs ADD COLUMN IF NOT EXISTS ville VARCHAR(100)")
            cursor.execute("ALTER TABLE profils_recruteurs ADD COLUMN IF NOT EXISTS pays VARCHAR(100)")
            cursor.execute("ALTER TABLE profils_recruteurs ADD COLUMN IF NOT EXISTS telephone VARCHAR(30)")
            cursor.execute("ALTER TABLE profils_recruteurs ADD COLUMN IF NOT EXISTS email_contact VARCHAR(255)")
            cursor.execute("ALTER TABLE profils_recruteurs ADD COLUMN IF NOT EXISTS site_web VARCHAR(255)")
            cursor.execute("ALTER TABLE profils_recruteurs ADD COLUMN IF NOT EXISTS forme_juridique VARCHAR(100)")
            cursor.execute("ALTER TABLE profils_recruteurs ADD COLUMN IF NOT EXISTS activite_principale VARCHAR(255)")
            cursor.execute("ALTER TABLE profils_recruteurs ADD COLUMN IF NOT EXISTS confidentialite BOOLEAN DEFAULT FALSE")
            conn.commit()
        except Exception:
            conn.rollback()
            # Ignore if columns already exist

        # Check if profile exists
        cursor.execute("SELECT id FROM profils_recruteurs WHERE utilisateur_id = %s", (current_user["id"],))
        row = cursor.fetchone()
        if row:
            # update
            cursor.execute(
                """
                UPDATE profils_recruteurs SET 
                    nom_entreprise = %s,
                    forme_juridique = %s,
                    activite_principale = %s,
                    description_entreprise = %s,
                    adresse = %s,
                    code_postal = %s,
                    ville = %s,
                    pays = %s,
                    telephone = %s,
                    email_contact = %s,
                    site_web = %s,
                    confidentialite = %s
                WHERE utilisateur_id = %s
                """,
                (
                    nom_entreprise,
                    forme_juridique,
                    activite_principale,
                    description,
                    adresse,
                    code_postal,
                    ville,
                    pays,
                    telephone,
                    email,
                    site_web,
                    bool(confidentialite),
                    current_user["id"],
                )
            )
            profile_id = row["id"]
        else:
            # insert
            cursor.execute(
                """
                INSERT INTO profils_recruteurs (
                    utilisateur_id, nom_entreprise, forme_juridique, secteur_activite, description_entreprise,
                    adresse, code_postal, ville, pays, telephone, email_contact, site_web, activite_principale, confidentialite
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    current_user["id"], nom_entreprise, forme_juridique, activite_principale, description,
                    adresse, code_postal, ville, pays, telephone, email, site_web, activite_principale, bool(confidentialite)
                )
            )
            profile_id = cursor.lastrowid
        conn.commit()

        # ensure documents table
        try:
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS entreprise_documents (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    profil_recruteur_id INT NOT NULL,
                    chemin_fichier VARCHAR(255) NOT NULL,
                    nom_original VARCHAR(255),
                    date_upload TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (profil_recruteur_id) REFERENCES profils_recruteurs(id) ON DELETE CASCADE
                )
                """
            )
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise

        # Save uploaded files
        saved_docs = []
        for idx, doc in enumerate([document1, document2, document3], start=1):
            if doc is None:
                continue
            safe_name = f"u{current_user['id']}_p{profile_id}_{idx}_{doc.filename}"
            save_path = UPLOAD_DIR / safe_name
            with open(save_path, "wb") as f:
                f.write(await doc.read())
            cursor.execute(
                "INSERT INTO entreprise_documents (profil_recruteur_id, chemin_fichier, nom_original) VALUES (%s, %s, %s)",
                (profile_id, str(save_path), doc.filename)
            )
            saved_docs.append({"file": doc.filename, "path": str(save_path)})
        conn.commit()

        return {"message": "Profil entreprise enregistré", "documents": saved_docs}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

# routers/offers.py
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional, List
from db import get_connection
from .auth import get_current_user

router = APIRouter()

# Assurer la présence de la colonne 'domaine' dans la table offres_emploi

def _ensure_domaine_column(conn):
    try:
        cur = conn.cursor()
        cur.execute("SHOW COLUMNS FROM offres_emploi LIKE 'domaine'")
        exists = cur.fetchone()
        if not exists:
            try:
                cur.execute("ALTER TABLE offres_emploi ADD COLUMN domaine VARCHAR(255) NULL AFTER localisation")
                conn.commit()
            except Exception:
                conn.rollback()
        cur.close()
    except Exception:
        # On ignore silencieusement si la vérification échoue pour ne pas bloquer les endpoints
        try:
            cur.close()
        except Exception:
            pass

@router.get("/domains", response_model=List[str])
async def list_domains():
    conn = get_connection()
    if conn is None:
        raise HTTPException(status_code=500, detail="Erreur connexion DB")
    cursor = conn.cursor()
    try:
        _ensure_domaine_column(conn)
        cursor.execute("SELECT DISTINCT domaine FROM offres_emploi WHERE statut='active' AND domaine IS NOT NULL AND domaine <> '' ORDER BY domaine ASC")
        rows = cursor.fetchall() or []
        return [r[0] for r in rows if r and r[0]]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

# Modèles Pydantic pour les offres d'emploi
class OfferCreateRequest(BaseModel):
    titre: str
    description: str
    exigences: Optional[str] = None
    localisation: Optional[str] = None
    domaine: Optional[str] = None
    salaire_minimum: Optional[float] = None
    salaire_maximum: Optional[float] = None
    type_contrat: Optional[str] = "temps_plein"  # 'temps_plein' | 'temps_partiel' | 'contrat'

class OfferUpdateRequest(BaseModel):
    titre: Optional[str] = None
    description: Optional[str] = None
    exigences: Optional[str] = None
    localisation: Optional[str] = None
    domaine: Optional[str] = None
    salaire_minimum: Optional[float] = None
    salaire_maximum: Optional[float] = None
    type_contrat: Optional[str] = None  # 'temps_plein' | 'temps_partiel' | 'contrat'
    statut: Optional[str] = None        # 'brouillon' | 'active' | 'fermee'

class OfferOut(BaseModel):
    id: int
    titre: str
    description: str
    exigences: Optional[str] = None
    localisation: Optional[str] = None
    domaine: Optional[str] = None
    salaire_minimum: Optional[float] = None
    salaire_maximum: Optional[float] = None
    type_contrat: Optional[str] = None
    recruteur_id: int
    statut: str
    date_creation: str

# Permissions: Seuls les recruteurs peuvent créer des offres
@router.post("/", response_model=OfferOut)
async def create_offer(payload: OfferCreateRequest, current_user: dict = Depends(get_current_user)):
    # Autoriser uniquement les recruteurs
    if current_user.get("type_utilisateur") != "recruteur":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Seuls les recruteurs peuvent créer des offres")

    conn = get_connection()
    if conn is None:
        raise HTTPException(status_code=500, detail="Erreur connexion DB")
    cursor = conn.cursor(dictionary=True)
    try:
        _ensure_domaine_column(conn)
        # Validation simple sur les salaires
        if payload.salaire_minimum is not None and payload.salaire_maximum is not None:
            if payload.salaire_minimum > payload.salaire_maximum:
                raise HTTPException(status_code=422, detail="Le salaire minimum ne peut pas dépasser le salaire maximum")

        sql = (
            "INSERT INTO offres_emploi (recruteur_id, titre, description, exigences, localisation, domaine, salaire_minimum, salaire_maximum, type_contrat, statut, date_creation) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())"
        )
        cursor.execute(
            sql,
            (
                current_user["id"],
                payload.titre,
                payload.description,
                payload.exigences,
                payload.localisation,
                payload.domaine,
                payload.salaire_minimum,
                payload.salaire_maximum,
                payload.type_contrat or "temps_plein",
                "active",
            ),
        )
        conn.commit()
        new_id = cursor.lastrowid

        cursor.execute(
            "SELECT id, recruteur_id, titre, description, exigences, localisation, domaine, salaire_minimum, salaire_maximum, type_contrat, statut, date_creation FROM offres_emploi WHERE id = %s",
            (new_id,)
        )
        row = cursor.fetchone()
        # Normaliser types (date_creation -> str)
        row["date_creation"] = row["date_creation"].isoformat() if row.get("date_creation") else None
        return row
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

# Permissions: Seuls les recruteurs peuvent lister leurs offres
@router.get("/mine", response_model=List[OfferOut])
async def list_my_offers(current_user: dict = Depends(get_current_user)):
    # Uniquement recruteur
    if current_user.get("type_utilisateur") != "recruteur":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès réservé aux recruteurs")
    conn = get_connection()
    if conn is None:
        raise HTTPException(status_code=500, detail="Erreur connexion DB")
    cursor = conn.cursor(dictionary=True)
    try:
        _ensure_domaine_column(conn)
        cursor.execute(
            "SELECT id, recruteur_id, titre, description, exigences, localisation, domaine, salaire_minimum, salaire_maximum, type_contrat, statut, date_creation "
            "FROM offres_emploi WHERE recruteur_id = %s ORDER BY date_creation DESC",
            (current_user["id"],)
        )
        rows = cursor.fetchall()
        for r in rows:
            r["date_creation"] = r["date_creation"].isoformat() if r.get("date_creation") else None
        return rows
    finally:
        cursor.close()
        conn.close()

# Permissions: Tous les utilisateurs peuvent lister les offres actives
@router.get("/", response_model=List[OfferOut])
async def list_offers(domaine: Optional[str] = None):
    conn = get_connection()
    if conn is None:
        raise HTTPException(status_code=500, detail="Erreur connexion DB")
    cursor = conn.cursor(dictionary=True)
    try:
        _ensure_domaine_column(conn)
        if domaine:
            cursor.execute(
                "SELECT id, recruteur_id, titre, description, exigences, localisation, domaine, salaire_minimum, salaire_maximum, type_contrat, statut, date_creation "
                "FROM offres_emploi WHERE statut = 'active' AND domaine = %s ORDER BY date_creation DESC",
                (domaine,)
            )
        else:
            cursor.execute(
                "SELECT id, recruteur_id, titre, description, exigences, localisation, domaine, salaire_minimum, salaire_maximum, type_contrat, statut, date_creation "
                "FROM offres_emploi WHERE statut = 'active' ORDER BY date_creation DESC"
            )
        rows = cursor.fetchall()
        for r in rows:
            r["date_creation"] = r["date_creation"].isoformat() if r.get("date_creation") else None
        return rows
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

# Permissions: Seuls les recruteurs peuvent mettre à jour une offre
@router.put("/{offer_id}", response_model=OfferOut)
async def update_offer(offer_id: int, payload: OfferUpdateRequest, current_user: dict = Depends(get_current_user)):
    if current_user.get("type_utilisateur") != "recruteur":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès réservé aux recruteurs")

    conn = get_connection()
    if conn is None:
        raise HTTPException(status_code=500, detail="Erreur connexion DB")
    cursor = conn.cursor(dictionary=True)
    try:
        # Vérifier propriété
        cursor.execute("SELECT id FROM offres_emploi WHERE id = %s AND recruteur_id = %s", (offer_id, current_user["id"]))
        if not cursor.fetchone():
            raise HTTPException(status_code=403, detail="Non autorisé")

        # Validation salaire
        if payload.salaire_minimum is not None and payload.salaire_maximum is not None and payload.salaire_minimum > payload.salaire_maximum:
            raise HTTPException(status_code=422, detail="Le salaire minimum ne peut pas dépasser le salaire maximum")

        # Construire l'UPDATE dynamique
        fields = []
        values = []
        mapping = {
            "titre": payload.titre,
            "description": payload.description,
            "exigences": payload.exigences,
            "localisation": payload.localisation,
            "domaine": payload.domaine,
            "salaire_minimum": payload.salaire_minimum,
            "salaire_maximum": payload.salaire_maximum,
            "type_contrat": payload.type_contrat,
            "statut": payload.statut,
        }
        for col, val in mapping.items():
            if val is not None:
                fields.append(f"{col} = %s")
                values.append(val)
        if not fields:
            # rien à mettre à jour
            cursor.execute(
                "SELECT id, recruteur_id, titre, description, exigences, localisation, domaine, salaire_minimum, salaire_maximum, type_contrat, statut, date_creation FROM offres_emploi WHERE id = %s",
                (offer_id,)
            )
            row = cursor.fetchone()
            row["date_creation"] = row["date_creation"].isoformat() if row.get("date_creation") else None
            return row

        sql = f"UPDATE offres_emploi SET {', '.join(fields)} WHERE id = %s"
        values.append(offer_id)
        cursor.execute(sql, tuple(values))
        conn.commit()

        cursor.execute(
            "SELECT id, recruteur_id, titre, description, exigences, localisation, domaine, salaire_minimum, salaire_maximum, type_contrat, statut, date_creation FROM offres_emploi WHERE id = %s",
            (offer_id,)
        )
        row = cursor.fetchone()
        row["date_creation"] = row["date_creation"].isoformat() if row.get("date_creation") else None
        return row
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

# Permissions: Seuls les recruteurs peuvent supprimer une offre
@router.delete("/{offer_id}", response_model=dict)
async def delete_offer(offer_id: int, current_user: dict = Depends(get_current_user)):
    if current_user.get("type_utilisateur") != "recruteur":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès réservé aux recruteurs")

    conn = get_connection()
    if conn is None:
        raise HTTPException(status_code=500, detail="Erreur connexion DB")
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT id FROM offres_emploi WHERE id = %s AND recruteur_id = %s", (offer_id, current_user["id"]))
        if not cursor.fetchone():
            raise HTTPException(status_code=403, detail="Non autorisé")
        cursor.execute("DELETE FROM offres_emploi WHERE id = %s", (offer_id,))
        conn.commit()
        return {"message": "Offre supprimée"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()
# routers/notifications.py
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from db import get_connection
from .auth import get_current_user

router = APIRouter()

# Ensure table exists at import time
_conn = get_connection()
if _conn is not None:
    try:
        cur = _conn.cursor()
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS notifications (
              id INT PRIMARY KEY AUTO_INCREMENT,
              recruteur_id INT NOT NULL,
              type VARCHAR(50) NOT NULL DEFAULT 'application',
              titre VARCHAR(255) NOT NULL,
              message TEXT,
              offre_id INT,
              candidature_id INT,
              lu BOOLEAN NOT NULL DEFAULT FALSE,
              date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              INDEX idx_recruteur (recruteur_id),
              FOREIGN KEY (recruteur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            """
        )
        _conn.commit()
    except Exception:
        _conn.rollback()
    finally:
        cur.close()
        _conn.close()

# Permissions: Seuls les recruteurs peuvent accéder aux notifications
@router.get("/", response_model=List[dict])
async def list_notifications(limit: Optional[int] = Query(None, ge=1, le=100), current_user: dict = Depends(get_current_user)):
    if current_user.get("type_utilisateur") != "recruteur":
        raise HTTPException(status_code=403, detail="Accès réservé aux recruteurs")
    conn = get_connection()
    if conn is None:
        raise HTTPException(status_code=500, detail="Erreur connexion DB")
    cursor = conn.cursor(dictionary=True)
    try:
        sql = "SELECT id, type, titre, message, offre_id, candidature_id, lu, date_creation FROM notifications WHERE recruteur_id = %s ORDER BY date_creation DESC"
        if limit:
            sql += " LIMIT %s"
            cursor.execute(sql, (current_user["id"], limit))
        else:
            cursor.execute(sql, (current_user["id"],))
        rows = cursor.fetchall()
        for r in rows:
            if hasattr(r.get("date_creation"), "isoformat"):
                r["date_creation"] = r["date_creation"].isoformat()
        return rows
    finally:
        cursor.close()
        conn.close()

# Permissions: Seuls les recruteurs peuvent accéder au nombre de notifications non lues
@router.get("/unread-count", response_model=dict)
async def unread_count(current_user: dict = Depends(get_current_user)):
    if current_user.get("type_utilisateur") != "recruteur":
        raise HTTPException(status_code=403, detail="Accès réservé aux recruteurs")
    conn = get_connection()
    if conn is None:
        raise HTTPException(status_code=500, detail="Erreur connexion DB")
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT COUNT(*) AS c FROM notifications WHERE recruteur_id = %s AND lu = FALSE", (current_user["id"],))
        row = cursor.fetchone() or {"c": 0}
        return {"count": int(row["c"])}
    finally:
        cursor.close()
        conn.close()

# Permissions: Seuls les recruteurs peuvent marquer une notification comme lue
@router.post("/{notif_id}/read", response_model=dict)
async def mark_read(notif_id: int, current_user: dict = Depends(get_current_user)):
    if current_user.get("type_utilisateur") != "recruteur":
        raise HTTPException(status_code=403, detail="Accès réservé aux recruteurs")
    conn = get_connection()
    if conn is None:
        raise HTTPException(status_code=500, detail="Erreur connexion DB")
    cursor = conn.cursor(dictionary=True)
    try:
        # Autorisation
        cursor.execute("SELECT id FROM notifications WHERE id = %s AND recruteur_id = %s", (notif_id, current_user["id"]))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Notification introuvable")
        cursor.execute("UPDATE notifications SET lu = TRUE WHERE id = %s", (notif_id,))
        conn.commit()
        return {"message": "Notification marquée comme lue"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

# Permissions: Seuls les recruteurs peuvent marquer toutes les notifications comme lues
@router.post("/read-all", response_model=dict)
async def mark_all_read(current_user: dict = Depends(get_current_user)):
    if current_user.get("type_utilisateur") != "recruteur":
        raise HTTPException(status_code=403, detail="Accès réservé aux recruteurs")
    conn = get_connection()
    if conn is None:
        raise HTTPException(status_code=500, detail="Erreur connexion DB")
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("UPDATE notifications SET lu = TRUE WHERE recruteur_id = %s", (current_user["id"],))
        conn.commit()
        return {"message": "Toutes les notifications ont été marquées comme lues"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

# Permissions: Seuls les recruteurs peuvent supprimer toutes les notifications
@router.delete("/", response_model=dict)
async def delete_all_notifications(current_user: dict = Depends(get_current_user)):
    if current_user.get("type_utilisateur") != "recruteur":
        raise HTTPException(status_code=403, detail="Accès réservé aux recruteurs")
    conn = get_connection()
    if conn is None:
        raise HTTPException(status_code=500, detail="Erreur connexion DB")
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("DELETE FROM notifications WHERE recruteur_id = %s", (current_user["id"],))
        conn.commit()
        return {"message": "Toutes les notifications ont été supprimées"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

# Permissions: Seuls les recruteurs peuvent supprimer une notification
@router.delete("/{notif_id}", response_model=dict)
async def delete_notification(notif_id: int, current_user: dict = Depends(get_current_user)):
    if current_user.get("type_utilisateur") != "recruteur":
        raise HTTPException(status_code=403, detail="Accès réservé aux recruteurs")
    conn = get_connection()
    if conn is None:
        raise HTTPException(status_code=500, detail="Erreur connexion DB")
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT id FROM notifications WHERE id = %s AND recruteur_id = %s", (notif_id, current_user["id"]))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Notification introuvable")
        cursor.execute("DELETE FROM notifications WHERE id = %s", (notif_id,))
        conn.commit()
        return {"message": "Notification supprimée"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()
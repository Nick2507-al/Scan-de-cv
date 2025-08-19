from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from fastapi.responses import JSONResponse
import os
import json
import urllib.request
import urllib.error

router = APIRouter()

class ContactPayload(BaseModel):
    name: str
    email: EmailStr
    applicationId: int
    offerId: int | None = None
    sentAt: str | None = None
    source: str | None = None

# Permissions: Route pour transférer les données de contact vers Make (Make.com)
@router.post("/contact")
async def forward_to_make(payload: ContactPayload):
    # Webhook Make (Make.com). Définissez MAKE_WEBHOOK_URL dans .env côté backend.
    webhook_url = os.getenv("MAKE_WEBHOOK_URL", "").strip()
    if not webhook_url:
        raise HTTPException(status_code=500, detail="URL Make non configurée. Définissez MAKE_WEBHOOK_URL dans le backend (.env).")

    # Construire la requête POST JSON côté serveur pour éviter le CORS navigateur
    data = json.dumps(payload.dict()).encode("utf-8")
    # Log minimal pour debug (peut être remplacé par logging)
    try:
        print(f"[MAKE] Forwarding to {webhook_url} payload={payload.dict()}")
    except Exception:
        pass
    req = urllib.request.Request(
        webhook_url,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            resp_body = resp.read().decode("utf-8", errors="ignore")
            return {"status": "ok", "forwarded_to": webhook_url, "response": resp_body[:1000]}
    except urllib.error.HTTPError as e:
        try:
            err_text = e.read().decode("utf-8")
        except Exception:
            err_text = str(e)
        raise HTTPException(status_code=e.code, detail=f"Erreur webhook Make: {err_text}")
    except urllib.error.URLError as e:
        raise HTTPException(status_code=502, detail=f"Connexion au webhook Make échouée: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur interne (Make): {e}")

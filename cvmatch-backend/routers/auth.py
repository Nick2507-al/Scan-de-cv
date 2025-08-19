# routers/auth.py
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordBearer
from datetime import timedelta
from db import get_connection
from utils.auth import hash_password, verify_password, create_access_token, decode_access_token
from models.schemas import RegisterRequest, LoginRequest, TokenResponse, UserOut

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")
ACCESS_TOKEN_EXPIRE_MINUTES = timedelta(minutes=int(__import__("os").environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", "30")))

# Permissions: Seuls les utilisateurs authentifiés peuvent accéder aux routes suivantes
@router.post("/register", response_model=dict)
async def register(request: RegisterRequest):
    conn = get_connection()
    if conn is None:
        raise HTTPException(status_code=500, detail="Erreur connexion DB")
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT id FROM utilisateurs WHERE email = %s", (request.email,))
        if cursor.fetchone():
            return JSONResponse(status_code=400, content={"error": "Un utilisateur avec cet email existe déjà"})

        hashed = hash_password(request.mot_de_passe)
        insert_sql = """
            INSERT INTO utilisateurs (prenom, nom, email, mot_de_passe_hash, type_utilisateur, actif, date_creation)
            VALUES (%s, %s, %s, %s, %s, %s, NOW())
        """
        cursor.execute(insert_sql, (
            request.prenom,
            request.nom,
            request.email,
            hashed,
            request.type_utilisateur,
            True
        ))
        conn.commit()
        user_id = cursor.lastrowid

        token = create_access_token({"sub": request.email, "user_id": user_id}, expires_delta=ACCESS_TOKEN_EXPIRE_MINUTES)

        return {
            "message": "Inscription réussie",
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "id": user_id,
                "prenom": request.prenom,
                "nom": request.nom,
                "email": request.email,
                "type_utilisateur": request.type_utilisateur
            }
        }
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

# Permissions: Seuls les utilisateurs peuvent se connecter
@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest):
    conn = get_connection()
    if conn is None:
        raise HTTPException(status_code=500, detail="Erreur connexion DB")
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM utilisateurs WHERE email = %s", (request.email,))
        user = cursor.fetchone()
        if not user or not verify_password(request.mot_de_passe, user["mot_de_passe_hash"]):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Email ou mot de passe incorrect")

        # Si un type_utilisateur est demandé (provenant du bouton UI), le faire respecter
        if request.type_utilisateur and user.get("type_utilisateur") != request.type_utilisateur:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès refusé pour ce rôle")

        token = create_access_token({"sub": user["email"], "user_id": user["id"]}, expires_delta=ACCESS_TOKEN_EXPIRE_MINUTES)
        return {"access_token": token, "token_type": "bearer"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

# Dépendency qui récupère l'utilisateur courant à partir du token
async def get_current_user(token: str = Depends(oauth2_scheme)):
    payload = decode_access_token(token)
    user_id = payload.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Token invalide")

    conn = get_connection()
    if conn is None:
        raise HTTPException(status_code=500, detail="Erreur connexion DB")
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT id, prenom, nom, email, type_utilisateur FROM utilisateurs WHERE id = %s", (user_id,))
        user = cursor.fetchone()
        if not user:
            raise HTTPException(status_code=401, detail="Utilisateur introuvable")
        return user
    finally:
        cursor.close()
        conn.close()

# Permissions: Route pour obtenir les informations de l'utilisateur courant
@router.get("/me", response_model=UserOut)
async def me(current_user: dict = Depends(get_current_user)):
    return current_user

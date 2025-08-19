# models/schemas.py
from pydantic import BaseModel, EmailStr
from typing import Optional

# Modèles Pydantic pour les requêtes et réponses
class RegisterRequest(BaseModel):
    prenom: str
    nom: str
    email: EmailStr
    mot_de_passe: str
    type_utilisateur: Optional[str] = "candidat"

class LoginRequest(BaseModel):
    email: EmailStr
    mot_de_passe: str
    type_utilisateur: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class UserOut(BaseModel):
    id: int
    prenom: str
    nom: str
    email: EmailStr
    type_utilisateur: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut

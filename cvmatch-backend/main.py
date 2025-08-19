from fastapi import FastAPI, UploadFile, File, Form  
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import requests
from sentence_transformers import SentenceTransformer, util
import fitz  # PyMuPDF pour lire les fichiers PDF
import docx  # Pour lire les fichiers DOCX
import tempfile # Pour les fichiers temporaires
import os
from dotenv import load_dotenv
from pathlib import Path
from routers import auth
from routers import offers
from routers import applications
from routers import stats
from routers import webhook
from routers import companies
from routers import notifications

# Charger les variables d'environnement (chemin explicite vers .env)
ENV_PATH = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=ENV_PATH)

# Initialiser FastAPI
app = FastAPI()

# Autoriser le frontend React à appeler l'API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # à restreindre plus tard en production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(offers.router, prefix="/offers", tags=["Offers"])
app.include_router(applications.router, prefix="/applications", tags=["Applications"])
app.include_router(stats.router, prefix="/stats", tags=["Stats"])
app.include_router(webhook.router, prefix="/webhook", tags=["Webhook"])
app.include_router(companies.router, prefix="/companies", tags=["Companies"])
app.include_router(notifications.router, prefix="/notifications", tags=["Notifications"])

# Modèle Pydantic pour les requêtes JSON
class ChatRequest(BaseModel):
    message: str

# Charger le modèle Sentence-BERT une seule fois
model = SentenceTransformer("paraphrase-MiniLM-L6-v2")
 
# Fonctions d'extraction de texte depuis le CV
def extract_text_from_pdf(file_path):
    text = ""
    with fitz.open(file_path) as doc:
        for page in doc:
            text += page.get_text()
    return text

def extract_text_from_docx(file):
    doc = docx.Document(file)
    return "\n".join([para.text for para in doc.paragraphs])

@app.post("/chat")
async def chat_with_ai(request: ChatRequest):
    try:
        ollama_host = os.getenv("OLLAMA_HOST", "http://127.0.0.1:11434")
        ollama_model = os.getenv("OLLAMA_MODEL", "mistral:latest")  

        system_prompt = ("Tu es un assistant spécialisé dans l'aide à la rédaction de CV et la recherche d'emploi. "
                         "Réponds de manière professionnelle, concise et utile en français.")
        chat_payload = {
            "model": ollama_model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": request.message}
            ],
            "stream": False
        }

        # Essayer /api/chat (Ollama récent). Si 404, repli vers /api/generate (anciennes versions)
        content = None
        data = None
        try:
            resp = requests.post(f"{ollama_host}/api/chat", json=chat_payload, timeout=150)
            if resp.status_code == 404:
                raise requests.HTTPError("404 on /api/chat", response=resp)
            resp.raise_for_status()
            data = resp.json()
            if isinstance(data, dict) and "message" in data and data["message"]:
                content = data["message"].get("content")
        except requests.HTTPError:
            # Fallback pour anciennes versions: /api/generate avec un prompt
            prompt = f"{system_prompt}\n\nUtilisateur: {request.message}\nAssistant:"
            generate_payload = {
                "model": ollama_model,
                "prompt": prompt,
                "stream": False
            }
            resp2 = requests.post(f"{ollama_host}/api/generate", json=generate_payload, timeout=150)
            resp2.raise_for_status()
            data2 = resp2.json()
            if isinstance(data2, dict):
                content = data2.get("response")
                data = data2

        if not content:
            return JSONResponse(
                status_code=500,
                content={"error": "Réponse vide reçue d'Ollama", "hint": "Vérifiez le modèle et la version d'Ollama.", "raw_response": data}
            )

        return {"response": content}

    except requests.exceptions.RequestException as e:
        return JSONResponse(
            status_code=503,
            content={"error": "Impossible de joindre Ollama. Vérifiez que le service tourne et que le modèle est installé.",
                     "details": str(e)}
        )
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": "Erreur interne lors du traitement de la requête IA.", "details": str(e)}
        )
        
# Route principale
@app.post("/generate")
async def generate(req: ChatRequest):
    # Alias de compatibilité pour d'anciens clients
    return await chat_with_ai(req)

@app.post("/analyze")
async def analyze_cv(cv: UploadFile = File(...), offer: str = Form(...)):
    # Enregistrer temporairement le fichier
    with tempfile.NamedTemporaryFile(delete=False) as tmp:
        tmp_path = tmp.name
        tmp.write(await cv.read())

    # Extraire le texte
    ext = cv.filename.split('.')[-1].lower()
    if ext == "pdf":
        cv_text = extract_text_from_pdf(tmp_path)
    elif ext in ["doc", "docx"]:
        cv_text = extract_text_from_docx(tmp_path)
    else:
        return JSONResponse(status_code=400, content={"error": "Format non supporté"})

    os.remove(tmp_path)

    # Appliquer Sentence-BERT
    try:
        embeddings = model.encode([offer, cv_text])
        similarity = util.cos_sim(embeddings[0], embeddings[1]).item()
        score = round(similarity * 100)
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": "Erreur d'analyse", "details": str(e)})

    # Recommandation de base
    advice = "Votre CV est pertinent à {:.0f}% pour cette offre. Ajoutez davantage de détails spécifiques si nécessaire.".format(score)
    
    
    return {"score": score, "advice": advice}
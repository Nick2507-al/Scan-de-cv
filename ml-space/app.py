"""
Genesis ML — service d'inférence hébergé sur un Space Hugging Face (privé).

  GET  /health
  POST /ner    {"text", "labels", "threshold"} → {"entities": [{text,label,score,start,end}]}
  POST /embed  {"texts": [...]}                → {"vectors": [[...], ...]}  (normalisés)
  POST /ocr    {"filename", "data"(base64)}     → {"text": "..."}

Modèles configurables par variables du Space :
  GLINER_MODEL    (défaut urchade/gliner_multi-v2.1)
  EMBED_MODEL     (défaut intfloat/multilingual-e5-small)
"""
from __future__ import annotations

import base64
import io
import os
import re
import subprocess
import tempfile
import threading

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

GLINER_MODEL = os.environ.get("GLINER_MODEL", "urchade/gliner_multi-v2.1")
EMBED_MODEL = os.environ.get("EMBED_MODEL", "intfloat/multilingual-e5-small")
MAX_TEXT = 40_000
MAX_FILE = 20 * 1024 * 1024

app = FastAPI(title="Genesis ML", docs_url=None, redoc_url=None)
_lock = threading.Lock()
_models: dict = {}


def gliner():
    with _lock:
        if "gliner" not in _models:
            from gliner import GLiNER
            _models["gliner"] = GLiNER.from_pretrained(GLINER_MODEL)
        return _models["gliner"]


def embedder():
    with _lock:
        if "embed" not in _models:
            from sentence_transformers import SentenceTransformer
            _models["embed"] = SentenceTransformer(EMBED_MODEL, device="cpu")
        return _models["embed"]


@app.on_event("startup")
def warmup():
    # Chargement en arrière-plan : le Space répond à /health pendant le téléchargement des poids.
    threading.Thread(target=lambda: (gliner(), embedder()), daemon=True).start()


@app.get("/health")
def health():
    return {"gliner": GLINER_MODEL, "embed": EMBED_MODEL, "loaded": sorted(_models)}


class NerIn(BaseModel):
    text: str = Field(max_length=MAX_TEXT)
    labels: list[str] = Field(min_length=1, max_length=20)
    threshold: float = Field(0.45, ge=0.05, le=0.99)


def _chunks(text: str, size: int = 1100):
    """Découpe sur les fins de ligne (≈ 300 tokens, la fenêtre utile de GLiNER)."""
    start, buf = 0, ""
    for line in text.splitlines(keepends=True):
        if len(buf) + len(line) > size and buf:
            yield start, buf
            start += len(buf)
            buf = ""
        buf += line
    if buf:
        yield start, buf


@app.post("/ner")
def ner(body: NerIn):
    model = gliner()
    labels = [l.strip()[:40] for l in body.labels if l.strip()]
    out = []
    for offset, chunk in _chunks(body.text):
        for e in model.predict_entities(chunk, labels, threshold=body.threshold, flat_ner=True):
            out.append({"text": e["text"], "label": e["label"], "score": round(float(e["score"]), 4),
                        "start": e["start"] + offset, "end": e["end"] + offset})
    return {"entities": out}


class EmbedIn(BaseModel):
    texts: list[str] = Field(min_length=1, max_length=128)


@app.post("/embed")
def embed(body: EmbedIn):
    vecs = embedder().encode([t[:4000] for t in body.texts], normalize_embeddings=True, batch_size=16)
    return {"vectors": [[round(float(x), 6) for x in v] for v in vecs]}


class OcrIn(BaseModel):
    filename: str = Field(max_length=255)
    data: str


@app.post("/ocr")
def ocr(body: OcrIn):
    try:
        raw = base64.b64decode(body.data, validate=True)
    except Exception as exc:
        raise HTTPException(400, "base64 invalide") from exc
    if len(raw) > MAX_FILE:
        raise HTTPException(413, "fichier trop volumineux")
    import pytesseract
    from PIL import Image

    texts = []
    with tempfile.TemporaryDirectory() as tmp:
        if raw[:5] == b"%PDF-":
            src = os.path.join(tmp, "in.pdf")
            with open(src, "wb") as f:
                f.write(raw)
            # 300 dpi, 10 pages max, délai borné.
            subprocess.run(["pdftoppm", "-r", "300", "-l", "10", "-png", src, os.path.join(tmp, "p")],
                           check=True, timeout=120, capture_output=True)
            pages = sorted(p for p in os.listdir(tmp) if p.startswith("p") and p.endswith(".png"))
            images = [Image.open(os.path.join(tmp, p)) for p in pages]
        else:
            Image.MAX_IMAGE_PIXELS = 60_000_000  # protège contre les « bombes de décompression »
            images = [Image.open(io.BytesIO(raw))]
        for img in images:
            img = img.convert("L")
            if img.width < 1500:  # suréchantillonnage des petites images : meilleure reconnaissance
                ratio = 1500 / img.width
                img = img.resize((1500, int(img.height * ratio)))
            texts.append(pytesseract.image_to_string(img, lang="fra+eng", config="--oem 1 --psm 3", timeout=60))
    text = "\n".join(texts)
    return {"text": re.sub(r"[ \t]+", " ", text).strip()}

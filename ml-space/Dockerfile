FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
      tesseract-ocr tesseract-ocr-fra tesseract-ocr-eng poppler-utils \
    && rm -rf /var/lib/apt/lists/*

RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user PATH=/home/user/.local/bin:$PATH HF_HOME=/home/user/.cache/huggingface
WORKDIR /home/user/app

COPY --chown=user requirements.txt .
RUN pip install --no-cache-dir --user torch==2.5.1 --index-url https://download.pytorch.org/whl/cpu \
 && pip install --no-cache-dir --user -r requirements.txt

# Pré-téléchargement des poids dans l'image : démarrage à froid plus rapide.
RUN python -c "from gliner import GLiNER; GLiNER.from_pretrained('urchade/gliner_multi-v2.1')" \
 && python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('intfloat/multilingual-e5-small')"

COPY --chown=user app.py .
EXPOSE 7860
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7860", "--workers", "1"]

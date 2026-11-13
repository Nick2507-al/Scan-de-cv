"""
Client du service ML distant (Space Hugging Face « genesis-ml ») :
- /ner   : GLiNER multilingue (personnes, organisations, compétences, postes, diplômes, villes)
- /embed : embeddings multilingues (similarité sémantique CV ↔ offre)
- /ocr   : Tesseract fra+eng pour images et PDF scannés

Disjoncteur : après un échec, le service est ignoré pendant COOLDOWN secondes et l'analyse
continue en mode local (règles + référentiel) au lieu de bloquer l'utilisateur.
"""
from __future__ import annotations

import base64
import json
import math
import os
import threading
import time
import urllib.error
import urllib.request

COOLDOWN = 90


class MLClient:
    def __init__(self, base_url: str | None = None, token: str | None = None, timeout: float = 60):
        self.base_url = (base_url if base_url is not None else os.environ.get("ML_SERVICE_URL", "")).rstrip("/")
        self.token = token if token is not None else os.environ.get("HF_TOKEN", "").strip()
        self.timeout = timeout
        self._down_until = 0.0
        self._lock = threading.Lock()
        self.last_error = ""

    @property
    def configured(self) -> bool:
        return bool(self.base_url)

    @property
    def available(self) -> bool:
        return self.configured and time.time() >= self._down_until

    def _post(self, path: str, payload: dict, timeout: float | None = None):
        if not self.available:
            return None
        headers = {"Content-Type": "application/json"}
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        req = urllib.request.Request(f"{self.base_url}{path}", data=json.dumps(payload).encode(), headers=headers, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=timeout or self.timeout) as res:
                return json.loads(res.read().decode("utf-8"))
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, OSError) as exc:
            with self._lock:
                self._down_until = time.time() + COOLDOWN
                self.last_error = f"{type(exc).__name__}: {exc}"[:300]
            return None

    def health(self) -> dict:
        if not self.configured:
            return {"configured": False}
        headers = {"Authorization": f"Bearer {self.token}"} if self.token else {}
        try:
            req = urllib.request.Request(f"{self.base_url}/health", headers=headers)
            with urllib.request.urlopen(req, timeout=8) as res:
                data = json.loads(res.read().decode())
                self._down_until = 0
                return {"configured": True, "ok": True, **data}
        except Exception as exc:  # noqa: BLE001 — l'état de santé ne doit jamais lever
            return {"configured": True, "ok": False, "error": type(exc).__name__}

    def ner(self, text: str, labels: list[str], threshold: float = 0.45) -> list[dict] | None:
        data = self._post("/ner", {"text": text, "labels": labels, "threshold": threshold})
        return data.get("entities") if isinstance(data, dict) else None

    def embed(self, texts: list[str]) -> list[list[float]] | None:
        data = self._post("/embed", {"texts": texts})
        vecs = data.get("vectors") if isinstance(data, dict) else None
        return vecs if isinstance(vecs, list) and len(vecs) == len(texts) else None

    def ocr(self, data: bytes, filename: str) -> str | None:
        res = self._post("/ocr", {"filename": filename, "data": base64.b64encode(data).decode()}, timeout=180)
        text = res.get("text") if isinstance(res, dict) else None
        return text if isinstance(text, str) else None


def cosine(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(y * y for y in b))
    return dot / (na * nb) if na and nb else 0.0

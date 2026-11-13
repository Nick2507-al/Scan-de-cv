"""
Moteur d'analyse de CV Genesis — service HTTP interne (appelé uniquement par le backend Node).

  GET  /health       état du service et des modèles distants
  POST /v1/analyze   multipart : file, criteria (JSON) → profil structuré + évaluation
"""
from __future__ import annotations

import hmac
import json
import logging
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, jsonify, request

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))
load_dotenv(ROOT / ".env")

from genesis_analyzer.extract import SUPPORTED_EXTENSIONS, ExtractionError  # noqa: E402
from genesis_analyzer.ml import MLClient  # noqa: E402
from genesis_analyzer.local_ml import LocalML  # noqa: E402
from genesis_analyzer.pipeline import analyze  # noqa: E402

logging.basicConfig(level=logging.INFO, format="[analyzer] %(levelname)s %(message)s")
log = logging.getLogger("analyzer")

API_KEY = os.environ.get("ANALYZER_KEY", "")
MAX_MB = int(os.environ.get("MAX_FILE_MB", "15"))

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = (MAX_MB + 1) * 1024 * 1024
# Modèles locaux (ONNX) si présents, sinon service distant, sinon règles seules.
_local = LocalML()
ml = _local if _local.configured and os.environ.get("ML_MODE", "auto") != "remote" else MLClient()

def _warmup():
    """Charge les modèles et compile les motifs en arrière-plan : la 1re analyse n'attend pas ~45 s."""
    import threading

    def run():
        try:
            sample = ("Jean Exemple\nComptable\nParis\njean@example.com\nEXPÉRIENCE\nComptable chez Exemple SA 2019 - 2023\n"
                      "COMPÉTENCES\nExcel, Sage").encode()
            analyze("warmup.txt", sample, {"requiredSkills": ["Excel"], "description": "Comptable"}, ml=ml)
            log.info("modèles prêts")
        except Exception:  # noqa: BLE001
            log.exception("préchauffage échoué (l'analyse reste possible)")
    threading.Thread(target=run, daemon=True, name="warmup").start()


CRITERIA_KEYS = {"jobTitle", "description", "requiredSkills", "niceSkills", "languages",
                 "minExperienceYears", "minEducationLevel", "threshold"}


def _criteria(raw: str | None) -> dict:
    data = json.loads(raw) if raw else {}
    if not isinstance(data, dict):
        raise ValueError("criteria doit être un objet JSON")
    out = {k: data[k] for k in CRITERIA_KEYS if k in data}
    for k in ("requiredSkills", "niceSkills", "languages"):
        v = out.get(k, [])
        if isinstance(v, str):
            v = [x.strip() for x in v.split(",")]
        out[k] = [str(x).strip()[:80] for x in v if str(x).strip()][:80] if isinstance(v, list) else []
    out["jobTitle"] = str(out.get("jobTitle", ""))[:200]
    out["description"] = str(out.get("description", ""))[:20000]
    out["minExperienceYears"] = max(0.0, min(60.0, float(out.get("minExperienceYears") or 0)))
    out["minEducationLevel"] = max(0, min(8, int(out.get("minEducationLevel") or 0)))
    out["threshold"] = max(0, min(100, int(out.get("threshold", 60))))
    return out


@app.before_request
def _auth():
    if request.path == "/health":
        return None
    if API_KEY and not hmac.compare_digest(request.headers.get("X-Analyzer-Key", ""), API_KEY):
        return jsonify({"error": "Accès refusé"}), 401
    return None


@app.get("/health")
def health():
    return jsonify({"ok": True, "formats": SUPPORTED_EXTENSIONS, "ml": ml.health()})


@app.post("/v1/analyze")
def analyze_route():
    file = request.files.get("file")
    if not file or not file.filename:
        return jsonify({"error": "Fichier manquant"}), 400
    try:
        criteria = _criteria(request.form.get("criteria"))
    except (ValueError, TypeError, json.JSONDecodeError):
        return jsonify({"error": "Critères invalides"}), 400
    data = file.read()
    if not data:
        return jsonify({"error": "Fichier vide"}), 400
    try:
        result = analyze(file.filename, data, criteria, ml=ml)
    except ExtractionError as exc:
        return jsonify({"error": str(exc)}), 422
    except Exception:  # noqa: BLE001
        log.exception("échec d'analyse pour %s", file.filename)
        return jsonify({"error": "Erreur interne du moteur d'analyse"}), 500
    log.info("%s → score %s (%s, %s ms)", file.filename, result["evaluation"]["score"], result["engine"], result["meta"]["durationMs"])
    return jsonify(result)


@app.errorhandler(413)
def too_large(_e):
    return jsonify({"error": f"Fichier trop volumineux (max {MAX_MB} Mo)"}), 413


if __name__ == "__main__":
    from waitress import serve
    host = os.environ.get("ANALYZER_HOST", "127.0.0.1")
    port = int(os.environ.get("ANALYZER_PORT", "5001"))
    log.info("démarrage sur http://%s:%s (modèles : %s)", host, port, "locaux ONNX" if isinstance(ml, LocalML) else (ml.base_url or "aucun, mode règles"))
    _warmup()
    serve(app, host=host, port=port, threads=6, channel_timeout=300)

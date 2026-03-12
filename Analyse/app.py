import os
import tempfile
import json
from flask import Flask, request, jsonify
from werkzeug.utils import secure_filename
from dotenv import load_dotenv

load_dotenv()

from nlp_utils import extract_text_from_pdf, extract_text_from_docx, analyze_text
from cv_evaluation import evaluate_cv
from flask_cors import CORS

app = Flask(__name__)
CORS(app, origins=["http://localhost:5173"])

ALLOWED_EXTENSIONS = {"pdf", "docx"}


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def _get_skills_list(criteria_data):
    if not criteria_data:
        return []
    if isinstance(criteria_data, dict) and "skills" in criteria_data:
        s = criteria_data["skills"]
        if isinstance(s, str) and s.strip():
            return [x.strip() for x in s.split(",") if x.strip()]
        if isinstance(s, list):
            return s
    if isinstance(criteria_data, list):
        return criteria_data
    return []


@app.route("/analyze", methods=["POST"])
def analyze():
    files = request.files.getlist("file")
    if not files or (len(files) == 1 and files[0].filename == ""):
        file = request.files.get("file")
        if file and file.filename:
            files = [file]
        else:
            return jsonify({"error": "Fichier(s) manquant(s)"}), 400

    criteria_raw = request.form.get("criteria")
    try:
        criteria_data = json.loads(criteria_raw) if criteria_raw else {}
    except Exception:
        return jsonify({"error": "Format criteria invalide (JSON attendu)"}), 400
    if criteria_data is not None and not isinstance(criteria_data, (dict, list)):
        return jsonify({"error": "Format criteria invalide"}), 400
    criteria_data = criteria_data or {}

    skills_list = _get_skills_list(criteria_data)
    hf_token = os.environ.get("HF_TOKEN", "").strip()
    results = []

    for file in files:
        if not file or not file.filename:
            continue
        if not allowed_file(file.filename):
            results.append({
                "filename": file.filename,
                "error": "Type de fichier non supporté (PDF ou DOCX uniquement)",
            })
            continue

        filename = secure_filename(file.filename)
        temp_dir = tempfile.mkdtemp()
        file_path = os.path.join(temp_dir, filename)

        try:
            file.save(file_path)

            if filename.lower().endswith(".pdf"):
                text = extract_text_from_pdf(file_path)
            else:
                text = extract_text_from_docx(file_path)

            if not text.strip():
                results.append({
                    "filename": filename,
                    "error": "Impossible d'extraire le texte de ce fichier.",
                })
                continue

            analysis = analyze_text(text, skills_list, hf_token=hf_token)
            retained, improvement_notes = evaluate_cv(analysis, criteria_data)

            results.append({
                "filename": filename,
                "emails": analysis.get("emails", []),
                "phones": analysis.get("phones", []),
                "skills": analysis.get("skills", []),
                "persons": analysis.get("persons", []),
                "organizations": analysis.get("organizations", []),
                "retained": retained,
                "improvement_notes": improvement_notes,
            })
        except Exception as e:
            results.append({
                "filename": filename,
                "error": str(e),
            })
        finally:
            try:
                if os.path.exists(file_path):
                    os.remove(file_path)
                if os.path.exists(temp_dir):
                    os.rmdir(temp_dir)
            except Exception:
                pass

    if not results:
        return jsonify({"error": "Aucun fichier valide à analyser"}), 400

    return jsonify({"results": results})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)

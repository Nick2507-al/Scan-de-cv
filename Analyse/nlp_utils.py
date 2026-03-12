"""
Extraction de texte (PDF/DOCX) et analyse via Hugging Face Inference API.
NER (personnes, organisations) assurée par l'API ; emails/téléphones/compétences en regex.
"""
import re
import os
from pdfminer.high_level import extract_text as extract_pdf_text
from docx import Document

# Modèle NER Hugging Face (français)
HF_NER_MODEL = "Jean-Baptiste/camembert-ner"


def extract_text_from_pdf(path_pdf):
    try:
        text = extract_pdf_text(path_pdf)
        return text or ""
    except Exception as e:
        print(f"Erreur extraction PDF : {e}")
        return ""


def extract_text_from_docx(path_docx):
    try:
        doc = Document(path_docx)
        full_text = []
        for para in doc.paragraphs:
            full_text.append(para.text)
        return "\n".join(full_text)
    except Exception as e:
        print(f"Erreur extraction DOCX : {e}")
        return ""


def extract_emails(text):
    email_pattern = r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+'
    return list(set(re.findall(email_pattern, text)))


def extract_phones(text):
    phone_pattern = r'(\+?\d{1,3}[-.\s]?)?(\(?\d{2,3}\)?[-.\s]?)?[\d\s.-]{6,15}\d'
    phones = re.findall(phone_pattern, text)
    results = []
    for tup in phones:
        phone = ''.join(tup)
        phone_clean = re.sub(r'[^\d+]', '', phone)
        if len(phone_clean) >= 8:
            results.append(phone_clean)
    return list(set(results))


def extract_skills(text, skills_list):
    if not skills_list:
        return []
    text_lower = text.lower()
    found_skills = []
    for skill in skills_list:
        if skill and skill.lower() in text_lower:
            found_skills.append(skill)
    return found_skills


def _ner_with_huggingface(text, token):
    """Appel à l'API Hugging Face Inference pour la NER (personnes, organisations)."""
    if not token or not text.strip():
        return [], []

    try:
        from huggingface_hub import InferenceClient
        client = InferenceClient(token=token)
        max_chars = 4000
        text_to_analyze = text[:max_chars] if len(text) > max_chars else text
        result = client.token_classification(
            text_to_analyze,
            model=HF_NER_MODEL,
            aggregation_strategy="simple",
        )
    except Exception as e:
        print(f"Erreur API Hugging Face NER : {e}")
        return [], []

    persons = []
    organizations = []
    # Format possible : liste de dicts avec entity_group ou entity, et word
    if not isinstance(result, list):
        return persons, organizations
    for item in result:
        if not isinstance(item, dict):
            continue
        label = (item.get("entity_group") or item.get("entity") or "").upper()
        word = (item.get("word") or "").strip()
        if not word or word in (" ", "\u2581"):  # skip subword markers
            continue
        if "PER" in label or label in ("B-PER", "I-PER"):
            persons.append(word)
        elif "ORG" in label or label in ("B-ORG", "I-ORG"):
            organizations.append(word)
    return list(set(persons)), list(set(organizations))


def analyze_text(text, criteria_skills, hf_token=None):
    """Analyse le texte : regex pour emails/phones/skills, Hugging Face pour NER."""
    token = hf_token or os.environ.get("HF_TOKEN", "").strip()
    emails = extract_emails(text)
    phones = extract_phones(text)
    skills = extract_skills(text, criteria_skills)
    persons, organizations = _ner_with_huggingface(text, token)
    return {
        "emails": emails,
        "phones": phones,
        "skills": skills,
        "persons": persons,
        "organizations": organizations,
    }

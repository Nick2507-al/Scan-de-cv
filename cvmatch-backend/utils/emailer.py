import os
import smtplib
from email.message import EmailMessage
from typing import Optional

# Chargement facultatif d'un fichier .env (backend/.env ou racine/.env) pour récupérer SMTP_USER/SMTP_PASSWORD
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

def _load_dotenv_if_present():
    paths = [
        os.path.join(BASE_DIR, ".env"),
        os.path.abspath(os.path.join(BASE_DIR, "..", ".env")),
    ]
    for p in paths:
        if os.path.isfile(p):
            try:
                with open(p, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if not line or line.startswith("#"):
                            continue
                        if "=" in line:
                            k, v = line.split("=", 1)
                            k = k.strip()
                            v = v.strip().strip("'\"")
                            # ne pas écraser les variables d'environnement déjà définies
                            if k and (k not in os.environ):
                                os.environ[k] = v
            except Exception as e:
                print(f"[EMAIL WARN] .env non chargé depuis {p}: {e}")

_load_dotenv_if_present()

# Configuration SMTP (Gmail par défaut)
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "cvmatch.notifications@gmail.com")  # email partagé
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")  # mot de passe d'application Gmail
SMTP_FROM = os.getenv("SMTP_FROM", SMTP_USER)
SMTP_TLS = os.getenv("SMTP_TLS", "true").lower() == "true"
SMTP_SSL = os.getenv("SMTP_SSL", "false").lower() == "true"


def send_email(
    to_email: str,
    subject: str,
    text_body: str,
    html_body: Optional[str] = None,
    reply_to: Optional[str] = None
) -> dict:
    """
    Envoie un e-mail via Gmail SMTP (compte partagé).
    - reply_to : email du recruteur pour redirection des réponses
    """
    # Si SMTP_PASSWORD n’est pas configuré, on ne bloque pas l’application
    if not SMTP_PASSWORD:
        print(f"[EMAIL NOOP] To={to_email} Subject={subject} Reply-To={reply_to} (SMTP_PASSWORD manquant)\n{text_body}")
        return {"status": "noop", "detail": "SMTP_PASSWORD not configured - email not sent"}

    msg = EmailMessage()
    msg["From"] = f"CVMatch Notifications <{SMTP_FROM}>"
    msg["To"] = to_email
    msg["Subject"] = subject
    if reply_to:
        msg["Reply-To"] = reply_to  # Redirige les réponses vers l'email du recruteur
    msg.set_content(text_body)
    if html_body:
        msg.add_alternative(html_body, subtype="html")

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.ehlo()
            if SMTP_TLS:
                server.starttls()
                server.ehlo()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.send_message(msg)
        return {"status": "ok"}
    except Exception as e:
        print(f"[EMAIL ERROR] {e}")
        return {"status": "error", "detail": str(e)}
"""
Déploie ml-space/ sur un Space Hugging Face PRIVÉ et renseigne ML_SERVICE_URL dans Analyse/.env.

Usage :  py -3 scripts/deploy_ml_space.py [nom-du-space]
Pré-requis : HF_TOKEN (permission « write ») dans Analyse/.env ; pip install huggingface_hub
Le jeton n'est jamais affiché.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

from dotenv import dotenv_values
from huggingface_hub import HfApi

ROOT = Path(__file__).resolve().parents[1]
ENV = ROOT / "Analyse" / ".env"


def main() -> int:
    token = (dotenv_values(ENV).get("HF_TOKEN") or "").strip()
    if not token:
        print(f"HF_TOKEN absent de {ENV}")
        return 1
    api = HfApi(token=token)
    user = api.whoami()["name"]
    name = sys.argv[1] if len(sys.argv) > 1 else "genesis-ml"
    repo_id = f"{user}/{name}"
    api.create_repo(repo_id, repo_type="space", space_sdk="docker", private=True, exist_ok=True)
    api.upload_folder(repo_id=repo_id, repo_type="space", folder_path=str(ROOT / "ml-space"),
                      commit_message="Déploiement Genesis ML")
    url = f"https://{user.lower().replace('_', '-')}-{name.lower()}.hf.space"
    text = ENV.read_text(encoding="utf-8")
    if re.search(r"^ML_SERVICE_URL=.*$", text, flags=re.M):
        text = re.sub(r"^ML_SERVICE_URL=.*$", f"ML_SERVICE_URL={url}", text, flags=re.M)
    else:
        text += f"\nML_SERVICE_URL={url}\n"
    ENV.write_text(text, encoding="utf-8")
    print(f"Space privé déployé : https://huggingface.co/spaces/{repo_id}")
    print(f"URL du service : {url}  (renseignée dans Analyse/.env)")
    print("La première construction prend 10 à 20 minutes.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

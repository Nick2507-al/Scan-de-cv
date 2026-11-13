r"""
Télécharge les modèles d'IA locaux (ONNX : GLiNER fp16 ~580 Mo, e5 int8 ~120 Mo) dans %LOCALAPPDATA%\Genesis\models.

  py -3 -I scripts/download_models.py

- GLiNER multilingue (urchade/gliner_multi-v2.1, Apache-2.0) : noms, organisations, compétences, postes…
- multilingual-e5-small (intfloat, MIT) : similarité sémantique CV ↔ offre.
Pour utiliser un modèle fine-tuné (training/finetune_gliner_cv.ipynb), passez son identifiant :
  py -3 -I scripts/download_models.py --gliner VOTRE-PSEUDO/genesis-gliner-cv-onnx --dir gliner-ft
"""
from __future__ import annotations

import argparse
import os
import shutil
from pathlib import Path

from dotenv import dotenv_values
from huggingface_hub import hf_hub_download

ROOT = Path(__file__).resolve().parents[1]
DEST = Path(os.environ.get("GENESIS_MODELS_DIR") or Path(os.environ.get("LOCALAPPDATA", Path.home())) / "Genesis" / "models")

MODELS = {
    "gliner": ("onnx-community/gliner_multi-v2.1", ["onnx/model_fp16.onnx", "tokenizer.json", "gliner_config.json"]),
    "e5": ("Xenova/multilingual-e5-small", ["onnx/model_int8.onnx", "tokenizer.json"]),
}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--gliner", default=MODELS["gliner"][0], help="dépôt GLiNER ONNX (ex. NickCdr/genesis-gliner-cv-onnx)")
    parser.add_argument("--dir", default="gliner", help="sous-dossier de destination (ex. gliner-ft)")
    args = parser.parse_args()
    token = (dotenv_values(ROOT / "Analyse" / ".env").get("HF_TOKEN") or "").strip() or None
    if args.gliner != MODELS["gliner"][0]:
        # Modèle fine-tuné : export fp32 « onnx/model.onnx » (la conversion fp16 est défectueuse pour DeBERTa).
        from huggingface_hub import HfApi
        files = {s.rfilename for s in HfApi(token=token).model_info(args.gliner).siblings}
        onnx_file = "onnx/model_fp16.onnx" if "onnx/model_fp16.onnx" in files else "onnx/model.onnx"
        MODELS.pop("gliner")
        MODELS[args.dir] = (args.gliner, [onnx_file, "tokenizer.json", "gliner_config.json"])
        print(f"Ensuite : GENESIS_GLINER={args.dir}/{Path(onnx_file).name} dans Analyse/.env")
    for name, (repo, files) in MODELS.items():
        out = DEST / name
        out.mkdir(parents=True, exist_ok=True)
        for f in files:
            target = out / Path(f).name
            if target.exists() and target.stat().st_size > 0:
                print(f"déjà présent : {name}/{target.name}")
                continue
            # local_dir évite une seconde copie dans le cache Hugging Face (disque limité).
            path = hf_hub_download(repo, f, token=token, local_dir=out / ".dl")
            shutil.move(path, target)
            print(f"téléchargé : {name}/{target.name} ({target.stat().st_size / 1e6:.0f} Mo)")
        shutil.rmtree(out / ".dl", ignore_errors=True)
    (DEST / "SOURCES.txt").write_text("\n".join(f"{k}: {v[0]}" for k, v in MODELS.items()) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()

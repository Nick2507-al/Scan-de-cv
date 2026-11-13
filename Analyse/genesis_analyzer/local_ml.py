"""
Modèles d'IA exécutés en local (ONNX Runtime, CPU) — aucune donnée de CV ne quitte la machine.

- GLiNER multilingue (span-based, int8) : reconnaissance d'entités à la demande.
  Prétraitement et décodage réimplémentés à l'identique de la bibliothèque `gliner` (sans PyTorch).
- multilingual-e5-small (int8) : embeddings, mean pooling + normalisation L2.
- OCR : Tesseract (si installé) + pypdfium2 pour rendre les pages des PDF scannés.

Même interface que MLClient (configured, available, health, ner, embed, ocr).
"""
from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import tempfile
import threading
from pathlib import Path

import numpy as np

# Hors du dossier OneDrive : chargement rapide et pas de synchronisation de ~700 Mo vers le cloud.
MODELS_DIR = Path(os.environ.get("GENESIS_MODELS_DIR") or Path(os.environ.get("LOCALAPPDATA", Path.home())) / "Genesis" / "models")
# Modèle GLiNER : « dossier/fichier » sous MODELS_DIR (choix mesuré par tests/bench_ner.py).
# Remarque : la version int8 de gliner_multi (DeBERTa) ne reconnaît plus rien — ne pas l'utiliser.
GLINER_MODEL = os.environ.get("GENESIS_GLINER", "gliner/model_fp16.onnx")
_WORD_RE = re.compile(r"\w+(?:[-_]\w+)*|\S")  # découpage identique à GLiNER (WhitespaceTokenSplitter)


def _find_tesseract() -> str | None:
    exe = os.environ.get("TESSERACT_PATH") or shutil.which("tesseract")
    if exe:
        return exe
    for p in (r"C:\Program Files\Tesseract-OCR\tesseract.exe", r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
              os.path.expandvars(r"%LOCALAPPDATA%\Programs\Tesseract-OCR\tesseract.exe")):
        if os.path.exists(p):
            return p
    return None


class LocalML:
    def __init__(self, models_dir: Path = MODELS_DIR, gliner_model: str = GLINER_MODEL, threads: int | None = None):
        self.dir = Path(models_dir)
        self.gliner_path = self.dir / gliner_model
        self.gliner_dir = self.gliner_path.parent
        # 2 threads = optimum mesuré sur un CPU 2 cœurs / 4 threads ; au-delà, contention.
        self.threads = threads or max(1, min(4, (os.cpu_count() or 2) // 2))
        self._lock = threading.Lock()
        # Un seul calcul de modèle à la fois : sur peu de cœurs, les exécutions parallèles se gênent.
        self._run_lock = threading.Lock()
        self._gliner = None
        self._e5 = None
        self.tesseract = _find_tesseract()
        self.last_error = ""

    # ------------------------------------------------------------------ état
    @property
    def configured(self) -> bool:
        return self.gliner_path.exists() and (self.dir / "e5" / "model_int8.onnx").exists()

    @property
    def available(self) -> bool:
        return self.configured

    def health(self) -> dict:
        return {"mode": "local", "configured": self.configured, "ok": self.configured,
                "gliner": str(self.gliner_path.relative_to(self.dir)),
                "loaded": [n for n, v in (("gliner", self._gliner), ("e5", self._e5)) if v], "ocr": bool(self.tesseract)}

    # ------------------------------------------------------------------ chargement paresseux
    def _session(self, path: Path):
        import onnxruntime as ort
        opts = ort.SessionOptions()
        opts.log_severity_level = 3  # masque les avertissements d'optimisation sans incidence
        opts.intra_op_num_threads = self.threads
        opts.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
        return ort.InferenceSession(str(path), sess_options=opts, providers=["CPUExecutionProvider"])

    def _load_gliner(self):
        with self._lock:
            if self._gliner is None:
                from tokenizers import Tokenizer
                cfg = json.loads((self.gliner_dir / "gliner_config.json").read_text(encoding="utf-8"))
                tok = Tokenizer.from_file(str(self.gliner_dir / "tokenizer.json"))
                tok.no_truncation()
                tok.no_padding()
                self._gliner = {"session": self._session(self.gliner_path), "tok": tok,
                                "max_width": int(cfg.get("max_width", 12)), "max_len": int(cfg.get("max_len", 384)),
                                "ent": cfg.get("ent_token", "<<ENT>>"), "sep": cfg.get("sep_token", "<<SEP>>")}
        return self._gliner

    def _load_e5(self):
        with self._lock:
            if self._e5 is None:
                from tokenizers import Tokenizer
                tok = Tokenizer.from_file(str(self.dir / "e5" / "tokenizer.json"))
                tok.enable_truncation(512)
                tok.enable_padding(pad_id=1, pad_token="<pad>")
                self._e5 = {"session": self._session(self.dir / "e5" / "model_int8.onnx"), "tok": tok}
        return self._e5

    # ------------------------------------------------------------------ NER (GLiNER)
    def _ner_window(self, g, words: list[tuple[str, int, int]], labels: list[str], threshold: float) -> list[dict]:
        prompt = []
        for lab in labels:
            prompt += [g["ent"], lab]
        prompt.append(g["sep"])
        n = len(words)
        enc = g["tok"].encode(prompt + [w for w, _, _ in words], is_pretokenized=True)
        ids, word_ids = enc.ids, enc.word_ids
        words_mask, prev = [], None
        for wid in word_ids:
            # Premier sous-token de chaque mot du texte → index 1-based du mot ; le reste → 0.
            words_mask.append(wid - len(prompt) + 1 if wid is not None and wid >= len(prompt) and wid != prev else 0)
            prev = wid
        mw = g["max_width"]
        starts = np.repeat(np.arange(n), mw)
        ends = starts + np.tile(np.arange(mw), n)
        feeds = {
            "input_ids": np.array([ids], dtype=np.int64),
            "attention_mask": np.ones((1, len(ids)), dtype=np.int64),
            "words_mask": np.array([words_mask], dtype=np.int64),
            "text_lengths": np.array([[n]], dtype=np.int64),
            "span_idx": np.stack([starts, ends], axis=-1)[None].astype(np.int64),
            "span_mask": (ends < n)[None],
        }
        with self._run_lock:
            logits = g["session"].run(["logits"], feeds)[0][0]  # [mots, largeur, classes]
        probs = 1.0 / (1.0 + np.exp(-logits))
        cands = []
        for s, w, c in zip(*np.where(probs > threshold)):
            e = s + w
            if e < n:
                cands.append((float(probs[s, w, c]), int(s), int(e), labels[int(c)]))
        # Décodage « flat NER » : meilleurs scores d'abord, sans chevauchement.
        cands.sort(reverse=True)
        taken, out = [], []
        for score, s, e, lab in cands:
            if any(not (e < a or s > b) for a, b in taken):
                continue
            taken.append((s, e))
            out.append({"text": "", "label": lab, "score": round(score, 4), "start": words[s][1], "end": words[e][2]})
        return out

    def ner(self, text: str, labels: list[str], threshold: float = 0.45) -> list[dict] | None:
        if not self.available or not text.strip() or not labels:
            return None
        try:
            g = self._load_gliner()
            words = [(m.group(), m.start(), m.end()) for m in _WORD_RE.finditer(text)]
            budget = max(64, g["max_len"] - 2 * len(labels) - 1 - 10)
            ents: list[dict] = []
            step = max(32, budget - 40)  # fenêtres qui se recouvrent de 40 mots : pas d'entité coupée en deux
            for i in range(0, max(1, len(words)), step):
                window = words[i:i + budget]
                if not window:
                    break
                for e in self._ner_window(g, window, labels, threshold):
                    if not any(x["start"] == e["start"] and x["end"] == e["end"] for x in ents):
                        e["text"] = text[e["start"]:e["end"]]
                        ents.append(e)
                if i + budget >= len(words):
                    break
            return ents
        except Exception as exc:  # noqa: BLE001 — le modèle ne doit jamais faire échouer l'analyse
            self.last_error = f"{type(exc).__name__}: {exc}"[:300]
            return None

    # ------------------------------------------------------------------ embeddings (e5)
    def embed(self, texts: list[str]) -> list[list[float]] | None:
        if not self.available or not texts:
            return None
        try:
            m = self._load_e5()
            out = []
            for i in range(0, len(texts), 16):
                batch = m["tok"].encode_batch([t[:4000] for t in texts[i:i + 16]])
                ids = np.array([e.ids for e in batch], dtype=np.int64)
                mask = np.array([e.attention_mask for e in batch], dtype=np.int64)
                with self._run_lock:
                    hidden = m["session"].run(["last_hidden_state"], {"input_ids": ids, "attention_mask": mask,
                                                                       "token_type_ids": np.zeros_like(ids)})[0]
                pooled = (hidden * mask[..., None]).sum(1) / np.clip(mask.sum(1, keepdims=True), 1, None)
                pooled /= np.clip(np.linalg.norm(pooled, axis=1, keepdims=True), 1e-12, None)
                out.extend(pooled.tolist())
            return out
        except Exception as exc:  # noqa: BLE001
            self.last_error = f"{type(exc).__name__}: {exc}"[:300]
            return None

    # ------------------------------------------------------------------ OCR (Tesseract)
    def ocr(self, data: bytes, filename: str) -> str | None:
        if not self.tesseract:
            return None
        try:
            with tempfile.TemporaryDirectory() as tmp:
                images = []
                if data[:5] == b"%PDF-":
                    import pypdfium2 as pdfium
                    pdf = pdfium.PdfDocument(data)
                    for i in range(min(len(pdf), 10)):
                        p = os.path.join(tmp, f"p{i}.png")
                        pdf[i].render(scale=300 / 72).to_pil().convert("L").save(p)
                        images.append(p)
                    pdf.close()
                else:
                    from PIL import Image
                    Image.MAX_IMAGE_PIXELS = 60_000_000  # protège contre les bombes de décompression
                    img = Image.open(__import__("io").BytesIO(data))
                    img = img.convert("L")
                    if img.width < 1500:
                        img = img.resize((1500, int(img.height * 1500 / img.width)))
                    p = os.path.join(tmp, "img.png")
                    img.save(p)
                    images.append(p)
                texts = []
                for p in images:
                    r = subprocess.run([self.tesseract, p, "stdout", "-l", self._ocr_langs(), "--psm", "3"],
                                       capture_output=True, timeout=90, check=False)
                    texts.append(r.stdout.decode("utf-8", errors="replace"))
                return "\n".join(texts).strip() or None
        except Exception as exc:  # noqa: BLE001
            self.last_error = f"OCR {type(exc).__name__}: {exc}"[:300]
            return None

    def _ocr_langs(self) -> str:
        try:
            r = subprocess.run([self.tesseract, "--list-langs"], capture_output=True, timeout=10, check=False)
            have = set(r.stdout.decode(errors="ignore").split())
            langs = [l for l in ("fra", "eng") if l in have]
            return "+".join(langs) or "eng"
        except Exception:  # noqa: BLE001
            return "eng"

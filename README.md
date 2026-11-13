# Genesis — analyse de CV et suivi des recrutements

Genesis lit des CV dans tous les formats courants, en extrait un profil structuré, le compare aux critères d'une offre et produit un score sur 100, expliqué critère par critère. Chaque compte a ses propres offres, analyses, candidats et historique.

## Architecture

```
Navigateur ──► Vite :5173 ──/api──► API Node/Express :3000 ──► PostgreSQL
                                         │
                                         └──► Moteur d'analyse Python :5001 (local)
                                              règles + GLiNER + multilingual-e5 (ONNX) + Tesseract OCR (optionnel)
```

| Dossier | Rôle |
|---|---|
| `src/` | Interface React 19 + TypeScript |
| `Backend/` | API : authentification, isolation par compte, offres, candidats, analyses, entretiens, tableau de bord |
| `Analyse/` | Moteur d'analyse (modèles ONNX locaux) : extraction multi-format, référentiel de compétences, expérience, diplômes, langues, score |
| `ml-space/` | Variante hébergée (Space Hugging Face, nécessite un abonnement PRO) |
| `training/` | Notebook Colab/Kaggle de fine-tuning du modèle GLiNER sur des CV |

## Installation

Prérequis : Node.js 20+, Python 3.11+, PostgreSQL 14+, ~1 Go de disque pour les modèles.

```bash
npm install
py -3 -m pip install -r Analyse/requirements.txt
```

1. Créez la base : `psql -U postgres -c "CREATE DATABASE genesis"`.
2. Copiez `Backend/.env.example` en `Backend/.env` et renseignez `DATABASE_URL`, `JWT_SECRET` (48+ caractères aléatoires) et `ANALYZER_KEY`.
3. Copiez `Analyse/.env.example` en `Analyse/.env` avec la même `ANALYZER_KEY`.
4. Lancez `demarrer-genesis.bat`. Les tables sont créées automatiquement au premier démarrage, ainsi que le compte par défaut défini par `DEFAULT_ACCOUNT_EMAIL` / `DEFAULT_ACCOUNT_PASSWORD`.

### Modèles d'IA (locaux, gratuits)

Les modèles tournent sur le PC (ONNX Runtime, CPU) : aucune donnée de CV ne quitte la machine.

```bash
py -3 -I scripts/download_models.py     # modèles de base dans %LOCALAPPDATA%\Genesis\models
py -3 -I scripts/download_models.py --gliner NickCdr/genesis-gliner-cv-onnx --dir gliner-ft   # modèle fine-tuné (1,2 Go)
# puis GENESIS_GLINER=gliner-ft/model.onnx dans Analyse/.env
```

| Modèle | Rôle | Mesure (banc `Analyse/tests/bench_ner.py`) |
|---|---|---|
| **`NickCdr/genesis-gliner-cv-onnx`** (privé, fp32) — `gliner_multi-v2.1` fine-tuné sur des CV FR/EN (`training/`) | personnes, entreprises, postes, villes | F1 0,94 (sélection) · 0,98 (CV jamais vus) · ~2 s/CV |
| `urchade/gliner_multi-v2.1` (fp16, Apache-2.0) — modèle de base, conservé en secours | idem | F1 0,91 · 0,98 · ~4 s/CV |
| `intfloat/multilingual-e5-small` (int8, MIT) | adéquation CV ↔ offre, synonymes de compétences | ~1 s/CV |

- Mode rapide (moins précis, F1 0,82, ~1 s/CV) : téléchargez `knowledgator/gliner-x-small` (`onnx/model_quantized.onnx`) dans `models/gliner-x/` et ajoutez `GENESIS_GLINER=gliner-x/model_quantized.onnx` dans `Analyse/.env`.
- **N'utilisez pas** la version int8 de `gliner_multi` : la quantification la rend aveugle (mesuré : 0 entité).
- OCR des scans et des images : installez [Tesseract](https://github.com/UB-Mannheim/tesseract/wiki) avec le pack de langue française ; il est détecté automatiquement.
- Sans modèles, l'analyse fonctionne en mode règles seules.
- Fine-tuning : `training/finetune_gliner_cv.ipynb` (Colab/Kaggle GPU gratuit) publie un modèle privé et son export ONNX fp32 (la conversion fp16 est défectueuse pour DeBERTa), à installer avec la commande ci-dessus.

## Tests

```bash
npm test                 # API : fonctionnel + attaques (base genesis_test créée automatiquement)
npm run test:analyzer    # moteur : 10 formats, faux positifs, zip bomb, XXE + tests par propriétés (Hypothesis)
py -3 -I tests-e2e/e2e.py # parcours complet dans Chrome (E2E_EMAIL / E2E_PASSWORD), services démarrés
npm run lint && npm run build
```

## Sécurité

- Session par cookie `httpOnly` + `SameSite=Strict`, en-tête anti-CSRF, jeton révoqué au changement de mot de passe.
- Verrouillage après 5 échecs de connexion, limitation de débit, mots de passe bcrypt (coût 12).
- Requêtes SQL exclusivement paramétrées ; chaque requête est bornée à `owner_id` (aucun accès aux données d'un autre compte).
- Fichiers : type vérifié par signature binaire, nom aléatoire sur disque, protection zip bomb et XXE, téléchargement forcé en pièce jointe.
- RGPD : critères discriminatoires (âge, etc.) refusés ; purge automatique des candidats inactifs (24 mois par défaut, réglable) ; droit à l'effacement.

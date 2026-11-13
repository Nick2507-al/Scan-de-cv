---
title: Genesis ML
emoji: 📄
colorFrom: indigo
colorTo: blue
sdk: docker
app_port: 7860
pinned: false
license: apache-2.0
---

# Genesis ML

Service d'inférence privé du moteur d'analyse de CV Genesis.

| Endpoint | Modèle | Rôle |
|---|---|---|
| `POST /ner` | `urchade/gliner_multi-v2.1` (Apache-2.0) | Entités à la demande : personne, organisation, compétence, poste, diplôme, ville |
| `POST /embed` | `intfloat/multilingual-e5-small` (MIT) | Similarité sémantique CV ↔ offre, synonymes de compétences |
| `POST /ocr` | Tesseract 5 (fra+eng) | CV scannés et images |

Le Space doit rester **privé** : les CV contiennent des données personnelles.
Les appels sont authentifiés par le jeton Hugging Face du propriétaire.

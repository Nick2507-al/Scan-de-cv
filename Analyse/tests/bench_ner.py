"""
Banc d'essai NER : compare des modèles GLiNER ONNX (précision, rappel, F1, temps) sur des CV annotés.
  py -3 -I Analyse/tests/bench_ner.py
"""
from __future__ import annotations

import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
sys.stdout.reconfigure(encoding="utf-8")

from genesis_analyzer.local_ml import MODELS_DIR, LocalML  # noqa: E402
from genesis_analyzer.text_utils import norm  # noqa: E402

LABELS = ["person", "organization", "job title", "city"]

CASES = [
    ("""Aminata DIALLO
Développeuse Full-Stack
Brazzaville, Congo
aminata.diallo@example.com | +242 06 612 34 56
EXPÉRIENCE PROFESSIONNELLE
Développeuse Full-Stack — Société Congolaise de Logiciels
Janvier 2021 - Aujourd'hui
Développeuse Web — Agence Digitale Pointe-Noire
03/2019 – 12/2020""",
     {("person", "Aminata DIALLO"), ("job title", "Développeuse Full-Stack"), ("city", "Brazzaville"),
      ("organization", "Société Congolaise de Logiciels"), ("job title", "Développeuse Web"), ("organization", "Agence Digitale Pointe-Noire")}),
    ("""John Mbemba
Senior Accountant – Kinshasa
john.mbemba@mail.com
WORK EXPERIENCE
Senior Accountant, Ecobank, Kinshasa (2018 – present)
Junior Auditor, Deloitte, Lubumbashi (2015 – 2018)
EDUCATION
Master in Finance, University of Kinshasa""",
     {("person", "John Mbemba"), ("job title", "Senior Accountant"), ("city", "Kinshasa"), ("organization", "Ecobank"),
      ("job title", "Junior Auditor"), ("organization", "Deloitte"), ("city", "Lubumbashi"), ("organization", "University of Kinshasa")}),
    ("""CURRICULUM VITAE
NOM : NGOMA   PRENOM : Sandrine
Adresse : Pointe-Noire
POSTE RECHERCHE : ASSISTANTE DE DIRECTION
2016-2023 : Secrétaire de direction chez TotalEnergies EP Congo
2014-2016 : Réceptionniste à l'Hôtel Atlantic Palace""",
     {("person", "Sandrine"), ("person", "NGOMA"), ("city", "Pointe-Noire"), ("job title", "ASSISTANTE DE DIRECTION"),
      ("job title", "Secrétaire de direction"), ("organization", "TotalEnergies EP Congo"), ("job title", "Réceptionniste"),
      ("organization", "Hôtel Atlantic Palace")}),
]


# CV jamais vus par l'entraînement NI par la décision de publication du notebook (évaluation indépendante).
UNSEEN = [
    ("""Prisca MABIALA
Gestionnaire de paie
Dolisie, République du Congo
Gestionnaire de paie — Groupe Charden Farell (2020 - aujourd'hui)
Assistante comptable — Cabinet KPMG Congo, Pointe-Noire (2017 - 2020)""",
     {("person", "Prisca MABIALA"), ("job title", "Gestionnaire de paie"), ("city", "Dolisie"), ("organization", "Groupe Charden Farell"),
      ("job title", "Assistante comptable"), ("organization", "Cabinet KPMG Congo"), ("city", "Pointe-Noire")}),
    ("""Olivier Nkounkou | Technicien réseau | Brazzaville
2019-2024 Technicien réseau, Congo Telecom
2016-2019 Agent de support informatique, Banque Postale du Congo""",
     {("person", "Olivier Nkounkou"), ("job title", "Technicien réseau"), ("city", "Brazzaville"), ("organization", "Congo Telecom"),
      ("job title", "Agent de support informatique"), ("organization", "Banque Postale du Congo")}),
    ("""Michael Owusu
Procurement Officer – Accra, Ghana
Procurement Officer at Newmont Ghana (2018 – present)
Store Keeper at Ghana Ports and Harbours Authority, Tema (2014 – 2018)""",
     {("person", "Michael Owusu"), ("job title", "Procurement Officer"), ("city", "Accra"), ("organization", "Newmont Ghana"),
      ("job title", "Store Keeper"), ("organization", "Ghana Ports and Harbours Authority"), ("city", "Tema")}),
    ("""CÉLINE DUPONT-ITOUA
Enseignante de français
Bordeaux
Enseignante de français au Lycée Montaigne (depuis 2015)
Formatrice FLE à l'Alliance Française de Brazzaville (2011-2015)""",
     {("person", "CÉLINE DUPONT-ITOUA"), ("job title", "Enseignante de français"), ("city", "Bordeaux"), ("organization", "Lycée Montaigne"),
      ("job title", "Formatrice FLE"), ("organization", "Alliance Française de Brazzaville")}),
]


def evaluate(ml: LocalML, cases=None) -> tuple[float, float, float, float]:
    cases = cases or CASES
    tp = fp = fn = 0
    t = 0.0
    for text, gold in cases:
        s = time.time()
        ents = ml.ner(text, LABELS, threshold=0.4) or []
        t += time.time() - s
        pred = {(e["label"], norm(e["text"])) for e in ents}
        g = {(l, norm(x)) for l, x in gold}
        # Correspondance souple : un nom d'organisation prédit avec « Hôtel » ou sans compte comme trouvé.
        hit = {x for x in g if any(x[0] == p[0] and (x[1] in p[1] or p[1] in x[1]) and min(len(x[1]), len(p[1])) > 3 for p in pred)}
        good_pred = {p for p in pred if any(x[0] == p[0] and (x[1] in p[1] or p[1] in x[1]) for x in g)}
        tp += len(hit)
        fn += len(g - hit)
        fp += len(pred - good_pred)
    p = tp / max(1, tp + fp)
    r = tp / max(1, tp + fn)
    return p, r, 2 * p * r / max(1e-9, p + r), t / len(cases)


if __name__ == "__main__":
    for model in sys.argv[1:] or ["gliner/model_fp16.onnx", "gliner-x/model.onnx", "gliner-x/model_quantized.onnx"]:
        if not (MODELS_DIR / model).exists():
            print("absent :", model)
            continue
        ml = LocalML(gliner_model=model)
        ml.ner("échauffement du modèle", LABELS)
        for name, cases in (("CV de sélection", CASES), ("CV jamais vus", UNSEEN)):
            p, r, f1, t = evaluate(ml, cases)
            print(f"{model:30} {name:16} précision {p:.2f}  rappel {r:.2f}  F1 {f1:.2f}  {t:.1f} s/CV  {ml.last_error}")
        del ml

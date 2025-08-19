

# CVMatch – Guide de test local (React + FastAPI + MySQL + IA locale Ollama)

Ce document explique comment exécuter et tester le projet en local, avec :
- Frontend React (cvmatch-frontend)
- Backend FastAPI (cvmatch-backend)
- Base MySQL (vide au départ)
- IA locale via Ollama (modèle mistral)

Le guide inclut la création du fichier .env à partir d’un modèle et les points d’attention pour éviter les erreurs courantes.

---

## 1) Prérequis

Installez sur votre machine :
- Node.js (LTS recommandé, ≥ 18) et npm
- Python (≥ 3.10) et pip
- MySQL Server (≥ 8.0) et un client (CLI MySQL ou MySQL Workbench)
- Ollama (https://ollama.com) pour l’IA locale
- Git (optionnel si le projet est déjà présent)

Ports utilisés par défaut :
- Frontend React : 3000
- Backend FastAPI : 8000
- Ollama : 11434
- MySQL : 3306

Assurez-vous que ces ports sont libres ou adaptez la configuration (voir plus bas).

---

## 2) Structure du projet

- cvmatch-frontend/ → application React
- cvmatch-backend/ → API FastAPI, scripts SQL et configuration

---

## 3) Variables d’environnement (.env)

Un fichier d’exemple est fourni : `cvmatch-backend/.env.example`.

- Dupliquez le fichier et renommez-le en `.env` dans le dossier `cvmatch-backend/`.
- Complétez les valeurs nécessaires (voir ci-dessous). Le backend charge automatiquement ce fichier.
- Ne commitez jamais votre `.env`.

Exemple de contenu attendu (référez-vous au fichier `.env.example`) :

```
# IA locale (Ollama)
OLLAMA_HOST=http://127.0.0.1:11434
OLLAMA_MODEL=mistral:latest

# Base de données MySQL
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=cvmatch_db

# Authentification (JWT)
# Utilisé par utils/auth.py
SECRET_KEY=change_me_to_a_long_random_string
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Intégration Make (optionnel)
MAKE_WEBHOOK_URL=

# SMTP (optionnel, pour email de notification)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_TLS=true
SMTP_SSL=false
```

Notes :
- SECRET_KEY doit être une chaîne longue et aléatoire.
- Les anciennes variables de type JWT_SECRET/JWT_ALGORITHM/JWT_EXPIRE_MINUTES ne sont pas requises par le code actuel (ne pas les confondre avec SECRET_KEY/ACCESS_TOKEN_EXPIRE_MINUTES).
- Si vous n’utilisez pas l’envoi d’emails ou Make.com, laissez les sections SMTP et MAKE vides.

---

## 4) Initialiser MySQL (base vide)

1. Créez la base de données :
   - En ligne de commande :
     - Windows/macOS/Linux :
       ```bash
       mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS cvmatch_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
       ```
   - Ou via MySQL Workbench : exécutez la commande CREATE DATABASE dans un nouvel onglet SQL.

2. Importez le schéma fourni (si vous souhaitez pré-créer les tables) :
   ```bash
   mysql -u root -p cvmatch_db < cvmatch-backend/database_schema.sql
   ```

Vous pouvez aussi créer une base complètement vide et laisser l’application gérer les opérations ultérieures, mais la présence des tables selon `database_schema.sql` est recommandée pour tester toutes les routes.

---

## 5) Installer et vérifier Ollama (IA locale)

1. Installez Ollama : https://ollama.com/
2. Assurez-vous que le service tourne (par défaut http://127.0.0.1:11434).
3. Téléchargez le modèle requis :
   ```bash
   ollama pull mistral:latest
   ```
4. Vérifiez :
   - Via HTTP : ouvrez http://127.0.0.1:11434/api/tags (liste des modèles)
   - Ou exécutez :
     ```bash
     ollama run mistral:latest "Bonjour"
     ```

Le backend tentera d’appeler l’endpoint `/api/chat` et basculera automatiquement vers `/api/generate` si la version d’Ollama est plus ancienne.

---

## 6) Démarrer le backend (FastAPI)

Dans un terminal, placez-vous dans `cvmatch-backend/` :

1. Créez un environnement virtuel Python et activez-le :
   - Windows PowerShell :
     ```powershell
     python -m venv env
     .\env\Scripts\Activate.ps1
     ```
   - macOS/Linux :
     ```bash
     python3 -m venv env
     source env/bin/activate
     ```

2. Installez les dépendances :
   ```bash
   pip install -r requirements.txt
   ```

3. Démarrez l’API (port 8000 par défaut) :
   ```bash
   uvicorn main:app --reload --port 8000
   ```

4. Vérifiez la documentation interactive Swagger :
   - http://localhost:8000/docs

Points d’attention :
- Le CORS est ouvert pour faciliter les tests locaux.
- Assurez-vous que `.env` est bien dans `cvmatch-backend/` (le code charge explicitement ce chemin).
- Si MySQL n’est pas joignable, les routes qui accèdent à la base échoueront (ex. /auth, /offers…).
- Les routes IA : `/chat` (ou alias `/generate`) utilisent Ollama. Si le modèle n’est pas téléchargé ou si Ollama n’est pas démarré, vous aurez une erreur 503.

---

## 7) Démarrer le frontend (React)

Dans un autre terminal, placez-vous dans `cvmatch-frontend/` :

1. Installez les dépendances :
   ```bash
   npm install
   ```

2. Lancez l’application :
   ```bash
   npm start
   ```

3. Ouvrez le navigateur sur : http://localhost:3000

Configuration API côté frontend :
- L’URL de l’API est actuellement codée dans `cvmatch-frontend/src/api.ts` :
  ```ts
  baseURL: "http://localhost:8000"
  ```
- Laissez le backend sur le port 8000 pour éviter d’éditer le frontend. Si vous changez le port/host du backend, adaptez cette ligne.

---

## 8) Scénarios de test rapides

- Vérifier l’IA :
  - Backend : via Swagger, POST `/chat` avec un body JSON : `{ "message": "Rédige un résumé de CV pour développeur React." }`
  - Réponse attendue : un texte généré en français par le modèle mistral.

- Vérifier l’analyse de CV :
  - Backend : via Swagger, POST `/analyze` avec un fichier PDF/DOCX (paramètre `cv`) et un champ `offer` avec le texte de l’offre.
  - Réponse : score de similarité (%) et conseil.

- Vérifier l’authentification (nécessite MySQL) :
  - POST `/auth/register` puis `/auth/login`. Le token JWT est signé avec `SECRET_KEY` et respecte `ACCESS_TOKEN_EXPIRE_MINUTES`.

- Autres routes :
  - `/offers`, `/applications`, `/companies`, `/stats`, `/notifications`, `/webhook` (Make.com si configuré).

---

## 9) Dépannage

- Port déjà utilisé :
  - Backend : changez le port uvicorn, ex. `--port 8001` et mettez à jour `src/api.ts` côté frontend.
  - Frontend : React proposera un autre port automatiquement.

- MySQL – échec de connexion :
  - Vérifiez `DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME` dans `.env`.
  - Lancez MySQL localement et testez : `mysql -u root -p -h 127.0.0.1 -P 3306`

- Ollama – modèle introuvable ou service inaccessible :
  - Assurez-vous que `OLLAMA_HOST` pointe vers le bon host (par défaut http://127.0.0.1:11434).
  - Exécutez `ollama pull mistral:latest`.
  - Testez l’API Ollama avec un `curl` ou en ouvrant `/api/tags`.

- SMTP (optionnel) :
  - Si non configuré, les fonctionnalités d’email ne fonctionneront pas. Laissez les variables vides pour les tests basiques.

---

## 10) Bonnes pratiques et sécurité

- Ne commitez jamais votre fichier `.env`.
- `SECRET_KEY` doit être fort et gardé secret.
- Le CORS est large par défaut pour le local. À restreindre en production.
- Les identifiants MySQL utilisés en local doivent être limités et spécifiques à l’environnement de test.

---

## 11) Résumé des commandes

Backend :
- Windows :
  ```powershell
  cd cvmatch-backend
  python -m venv env
  .\env\Scripts\Activate.ps1
  pip install -r requirements.txt
  uvicorn main:app --reload --port 8000
  ```
- macOS/Linux :
  ```bash
  cd cvmatch-backend
  python3 -m venv env
  source env/bin/activate
  pip install -r requirements.txt
  uvicorn main:app --reload --port 8000
  ```

Frontend :
```bash
cd cvmatch-frontend
npm install
npm start
```

Ollama :
```bash
ollama pull mistral:latest
```

MySQL (création + import schéma) :
```bash
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS cvmatch_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -p cvmatch_db < cvmatch-backend/database_schema.sql
```

---

Fin du guide.
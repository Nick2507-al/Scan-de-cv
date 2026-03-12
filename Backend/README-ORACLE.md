# Backend – Oracle et démarrage

## 1. Créer le schéma Oracle

Avec SQL*Plus ou SQL Developer, connectez-vous avec un utilisateur ayant les droits CREATE TABLE puis exécutez :

```bash
sqlplus system/orcl@localhost:1521/ORCL
SQL> @schema-oracle.sql
```

Ou copiez-collez le contenu de `schema-oracle.sql`.  
**Prérequis :** Oracle 12c ou plus (pour `IDENTITY`). En 11g, remplacez la colonne `ID` par une séquence + trigger.

## 2. Variables d'environnement

Copiez `Backend/.env.example` en `Backend/.env` et adaptez :

- `ORACLE_USER` : utilisateur Oracle (ex. `system`)
- `ORACLE_PASSWORD` : mot de passe (ex. `orcl`)
- `ORACLE_CONNECT_STRING` : chaîne de connexion (ex. `localhost:1521/ORCL`)

## 3. Lancer le backend

```bash
cd Backend
npm install
node app.js
```

Le serveur écoute sur le port 3000. Le frontend (Vite) doit pointer vers cette URL (par défaut `http://localhost:3000`).

## 4. Service Python (analyse de CV)

L’analyse de CV est déléguée au service Flask (port 5001). Démarrez-le séparément :

```bash
cd Analyse
pip install -r requirements.txt
python app.py
```

Le backend appelle `PYTHON_ANALYZE_URL` (défaut : `http://localhost:5001/analyze`) pour chaque fichier envoyé à `/api/analyze`, puis enregistre les résultats dans Oracle.

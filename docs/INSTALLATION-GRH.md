# Installation du module GRH (Genesis)

## Prérequis

- Schéma de base déjà installé (`npm run db:schema-genesis` ou exécution de `schema-oracle.sql`).
- Backend configuré avec Oracle (`.env` avec `ORACLE_USER`, `ORACLE_PASSWORD`, etc.).

## Étapes

### 1. Exécuter le schéma GRH

À la racine du projet :

```bash
npm run db:schema-v2
```

Cela crée les tables : `ROLES`, `USERS`, `OFFERS`, `CANDIDATE_OFFERS`, `CANDIDATE_HISTORY`, `CRITERIA_TEMPLATES`, `INTERVIEWS`, `AUDIT_LOG`, et ajoute les colonnes `STATUS`, `OFFER_ID`, `CV_PATH`, etc. à `CANDIDATES`.

### 2. Premier lancement

1. Démarrer le backend : `node Backend/app.js` (ou votre commande habituelle).
2. Démarrer le frontend : `npm run dev`.
3. Ouvrir l’application : vous êtes redirigé vers la page de connexion.
4. **Premier connexion** : aucun utilisateur n’existe encore. Lors de la première tentative de connexion, le backend crée automatiquement un compte administrateur :
   - **Email** : `admin@genesis.com`
   - **Mot de passe** : `admin`
5. Connectez-vous avec ces identifiants, puis modifiez le mot de passe si besoin (via une future page Paramètres ou en base).

### 3. Fonctionnalités disponibles après installation

- **Authentification** : connexion obligatoire, JWT, déconnexion.
- **Offres** : CRUD des offres de postes (menu GRH → Offres).
- **Candidats** : liste avec pagination, recherche, filtres par statut et par offre ; fiche candidat détaillée avec historique et téléchargement du CV.
- **Pipeline** : statuts (Nouveau, Analyse OK, Entretien, Proposition, Embauché, Refusé), historique des changements.
- **Analyse CV** : liaison à une offre optionnelle, critères, stockage du fichier CV sur le serveur.
- **Tableau de bord** : métriques et graphiques basés sur les données Oracle.

## Dépannage

- **« Cannot find package 'jsonwebtoken' »** (ou autre module) au démarrage du backend : les dépendances npm ne sont pas installées. À la racine du projet, exécutez `npm install`. Si l’installation échoue par manque de mémoire (heap out of memory), lancez d’abord `set NODE_OPTIONS=--max-old-space-size=4096` puis `npm install`.
- **« Schéma GRH non installé »** à la connexion : exécuter `npm run db:schema-v2` avec un utilisateur Oracle propriétaire des tables (ex. GENESIS).
- **401 sur les API** : vous devez être connecté ; le token est envoyé automatiquement après connexion.
- **Colonnes manquantes (ORA-00904)** : le schéma v2 n’a pas été appliqué ou l’ordre d’exécution des scripts n’est pas correct (base d’abord, puis v2).

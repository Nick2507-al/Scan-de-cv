# Connexion SQL Developer — base Genesis

## 1. Créer l'utilisateur (une seule fois)

En tant que **SYSTEM** (SQL*Plus, SQL Developer ou script Node) :

```sql
@create-user-oracle.sql
```

Ou exécutez le contenu de `Backend/create-user-oracle.sql` dans une fenêtre SQL connectée à **SYSTEM**.

---

## 2. Connexion dans SQL Developer

### Nouvelle connexion

1. **Fichier** → **Nouveau** → **Connexion à une base de données** (ou icône câble vert).
2. Renseigner :

| Champ        | Valeur        |
|-------------|---------------|
| **Nom de la connexion** | Genesis (ou autre libellé) |
| **Nom d'utilisateur**   | `GENESIS`     |
| **Mot de passe**        | `orcl`        |
| **Rôle**                | *Par défaut*   |
| **SID ou nom de service** | `XE` (ou le service de votre serveur) |
| **Hôte**                | `NickGL` (nom ou IP du serveur Oracle) |
| **Port**                | `1521`        |

3. **Tester** : cliquer sur **Tester** → message « Succès ».
4. **Enregistrer** puis **Connexion**.

### Si vous utilisez un TNS (tnsnames.ora)

- **Type de connexion** : **TNS**.
- **Nom de connexion réseau** : choisir l’entrée correspondante (ex. `VISIONNET` ou celle pointant vers NickGL:1521/XE).

---

## 3. Utiliser les tables

Une fois connecté en **GENESIS** :

- Avec synonymes : exécuter une fois `Backend/genesis-synonyms.sql` (Fichier → Ouvrir → exécuter).
  - Ensuite : `SELECT * FROM CANDIDATES;` et `SELECT * FROM DASHBOARD_CONFIG;`
- Sans synonymes : `SELECT * FROM SYSTEM.CANDIDATES;` et `SELECT * FROM SYSTEM.DASHBOARD_CONFIG;`

---

## 4. Récapitulatif

| Élément   | Valeur   |
|----------|----------|
| Utilisateur | `GENESIS` |
| Mot de passe | `orcl`  |
| Hôte     | `NickGL` |
| Port     | `1521`  |
| Service / SID | `XE` |

# Propositions d'amélioration — Application Genesis pour la GRH

Document de recommandations pour rendre l'application plus complète et adaptée à l’usage quotidien d’une équipe RH (recrutement, pipeline candidats, reporting, conformité).

---

## 1. Authentification et rôles

| Amélioration | Description | Priorité |
|--------------|-------------|----------|
| **Connexion obligatoire** | Protéger toutes les routes (sauf `/signin`) : redirection vers login si non connecté. Utiliser le SignIn/SignUp existant et une couche auth (JWT ou session). | Haute |
| **Rôles utilisateur** | Au moins : **Recruteur** (voir/éditer candidats, lancer analyses), **Manager RH** (tout + rapports, config), **Admin** (utilisateurs, paramètres globaux). Table `USERS` + `ROLES`, middleware backend par rôle. | Haute |
| **Gestion des comptes** | Page « Utilisateurs » (liste, création, désactivation, réinitialisation mot de passe). Lien avec annuaire ou SSO optionnel plus tard. | Moyenne |

---

## 2. Pipeline candidats et statuts

| Amélioration | Description | Priorité |
|--------------|-------------|----------|
| **Statut de candidature** | Remplacer le simple « retenu / non retenu » par un **pipeline** : `Nouveau` → `Analyse OK` → `Entretien planifié` → `Entretien fait` → `Proposition` → `Embauché` / `Refusé`. Table `CANDIDATES` : ajouter colonne `STATUS` (ou table `CANDIDATE_STATUS` + historique). | Haute |
| **Historique des changements** | Table `CANDIDATE_HISTORY` (candidat_id, date, ancien_statut, nouveau_statut, utilisateur_id, commentaire). Affichage dans la fiche candidat (timeline). | Moyenne |
| **Actions rapides** | Depuis la liste ou la fiche : boutons « Passer en entretien », « Refuser », « Embaucher » avec optional commentaire. | Haute |

---

## 3. Offres de postes (postes à pourvoir)

| Amélioration | Description | Priorité |
|--------------|-------------|----------|
| **Table OFFERS / POSTES** | Libellé du poste, description, compétences requises (JSON ou table liée), date limite, statut (ouverte / pourvue / annulée), responsable recrutement. | Haute |
| **Lier candidat ↔ offre** | Table `CANDIDATE_OFFERS` (candidat_id, offer_id, date_candidature, statut). Permettre d’associer un candidat à une ou plusieurs offres. | Haute |
| **Critères par offre** | Lors de l’analyse de CV, choisir une **offre** (ou un jeu de critères sauvegardé) pour pré-remplir les compétences requises et évaluer « retenu / non retenu » par rapport à ce poste. | Haute |
| **Page « Offres »** | Liste des offres, création/édition, indicateurs (nb candidats par statut par offre). | Haute |

---

## 4. Stockage des CV et documents

| Amélioration | Description | Priorité |
|--------------|-------------|----------|
| **Fichier CV en base ou disque** | Actuellement seul le **nom** du fichier est stocké. Stocker le **contenu** (BLOB en Oracle ou fichier sur disque avec chemin en base) pour pouvoir re-télécharger le CV depuis la fiche candidat et depuis SQL Developer / rapports. | Haute |
| **Route GET /api/candidates/:id/file** | Implémenter le téléchargement du CV (lecture BLOB ou fichier) avec contrôle d’accès (utilisateur connecté, droits). | Haute |
| **Documents additionnels** | Table `DOCUMENTS` (candidat_id, type : CV / lettre / autre, nom_fichier, blob ou chemin, date_upload). Permettre plusieurs pièces par candidat. | Moyenne |

---

## 5. Dashboard et indicateurs GRH

| Amélioration | Description | Priorité |
|--------------|-------------|----------|
| **KPIs orientés recrutement** | En plus des métriques actuelles : nombre de candidats **par statut**, **par offre**, **taux de conversion** (nouveau → embauché), **délai moyen** (candidature → embauche). | Haute |
| **Graphiques** | Courbe des candidatures dans le temps ; répartition par statut (camembert ou barres) ; top compétences ; comparaison objectif / réalisé par mois. | Moyenne |
| **Filtres temporels** | Sélection de la période (mois, trimestre, année) pour tous les indicateurs du dashboard. | Moyenne |
| **Export PDF/Excel du dashboard** | Rapport synthétique téléchargeable pour la direction. | Basse |

---

## 6. Recherche et filtres candidats

| Amélioration | Description | Priorité |
|--------------|-------------|----------|
| **Recherche full-text** | Recherche dans nom, email, compétences, notes (champ unique ou recherche avancée). Backend : `LIKE` ou Oracle Text si volume important. | Haute |
| **Filtres** | Par statut, par offre, par date de candidature, par « retenu / non retenu » (analyse), par recruteur assigné. Persistance des filtres (URL ou session). | Haute |
| **Tri** | Colonnes triables (nom, date, statut, offre). | Moyenne |
| **Pagination** | Liste paginée (ex. 20 par page) pour ne pas charger des centaines de lignes. | Haute |

---

## 7. Fiche candidat enrichie

| Amélioration | Description | Priorité |
|--------------|-------------|----------|
| **Vue détaillée** | Page dédiée `/candidates/:id` : identité, coordonnées, compétences, résultat de l’analyse (retenu / non retenu, notes d’amélioration), statut pipeline, offres liées, historique, notes recruteur, pièces jointes. | Haute |
| **Édition complète** | Modifier statut, assignation à une offre, notes, et champs de base (nom, email, téléphone) depuis la fiche. | Haute |
| **Téléchargement du CV** | Bouton « Télécharger le CV » une fois le stockage des fichiers en place. | Haute |

---

## 8. Analyse de CV et critères

| Amélioration | Description | Priorité |
|--------------|-------------|----------|
| **Modèles de critères** | Table `CRITERIA_TEMPLATES` (nom, compétences JSON, autres critères). Sauvegarder des jeux de critères réutilisables (ex. « Développeur React », « Data Analyst ») et les sélectionner avant une analyse. | Moyenne |
| **Lien analyse ↔ offre** | Lors de l’analyse, choix d’une offre : critères pré-remplis et candidats enregistrés automatiquement liés à cette offre. | Haute |
| **Score / notation** | Optionnel : score numérique (ex. 0–100) basé sur le taux de compétences trouvées + présence email/téléphone, affiché dans la liste et la fiche. | Basse |
| **Réanalyse** | Possibilité de relancer une analyse pour un candidat existant (nouveau CV ou nouveaux critères) et conserver l’historique. | Basse |

---

## 9. Calendrier et entretiens

| Amélioration | Description | Priorité |
|--------------|-------------|----------|
| **Événements liés aux candidats** | Utiliser la page Calendrier existante : créer des événements « Entretien [Candidat X] » avec lien vers la fiche candidat (id en paramètre ou dans la description). | Moyenne |
| **Table INTERVIEWS** | interview_id, candidate_id, date_heure, type (phone / visio / présentiel), lieu/lien, créateur_id, rappel envoyé (oui/non). Affichage dans le calendrier et dans la fiche candidat. | Moyenne |
| **Rappels** | Notification ou email de rappel la veille ou le jour de l’entretien (cron + envoi d’email ou intégration calendrier). | Basse |

---

## 10. Notifications et communication

| Amélioration | Description | Priorité |
|--------------|-------------|----------|
| **Notifications in-app** | Table `NOTIFICATIONS` (user_id, type, titre, message, lien, lue, date). Ex. : « Nouveau candidat pour l’offre X », « Entretien demain avec Y ». Affichage dans le header (icône cloche). | Moyenne |
| **Emails types** | Modèles d’emails (convocation entretien, refus, proposition). Envoi manuel depuis la fiche candidat (sélection du modèle + personnalisation). | Moyenne |
| **Traçabilité des envois** | Table `EMAIL_LOGS` (candidat_id, type_email, date_envoi, utilisateur_id) pour conformité et suivi. | Basse |

---

## 11. Export et reporting

| Amélioration | Description | Priorité |
|--------------|-------------|----------|
| **Export liste candidats** | Export Excel/CSV de la liste (avec filtres appliqués) : colonnes nom, email, téléphone, compétences, statut, offre, date. | Haute |
| **Rapports prédéfinis** | Ex. : « Candidats par offre », « Candidats par mois », « Taux de conversion ». Page Rapports avec choix du type et période, génération PDF ou Excel. | Moyenne |
| **Conformité RGPD** | Export des données personnelles d’un candidat (droit à la portabilité) ; possibilité d’anonymisation/suppression après X mois. | Moyenne |

---

## 12. Audit et conformité

| Amélioration | Description | Priorité |
|--------------|-------------|----------|
| **Journal des actions** | Table `AUDIT_LOG` (user_id, action, entity_type, entity_id, ancienne_valeur, nouvelle_valeur, date). Enregistrer les modifications importantes (statut, notes, suppression). | Moyenne |
| **Qui a fait quoi** | Afficher sur la fiche candidat « Dernière modification par X le DD/MM/YYYY ». Colonnes `CREATED_BY`, `UPDATED_BY`, `UPDATED_AT` dans `CANDIDATES`. | Moyenne |

---

## 13. Expérience utilisateur et navigation

| Amélioration | Description | Priorité |
|--------------|-------------|----------|
| **Menu orienté GRH** | Sidebar : Tableau de bord, Offres, Candidats (sous-menu : Tous / Par statut), Analyse de CV, Calendrier, Rapports, Paramètres (utilisateurs, modèles de critères). Masquer ou réorganiser les pages template (Alerts, Badges, etc.) non utilisées. | Haute |
| **Breadcrumb** | Fil d’Ariane sur les pages (Accueil > Candidats > Fiche Jean Dupont) pour la navigation. | Basse |
| **Raccourcis** | Depuis le dashboard : accès rapide « Derniers candidats », « Entretiens à venir », « Offres actives ». | Moyenne |
| **Responsive** | Vérifier que liste candidats, formulaires et fiches sont utilisables sur tablette (recruteurs en déplacement). | Moyenne |

---

## 14. Technique et performance

| Amélioration | Description | Priorité |
|--------------|-------------|----------|
| **Pagination côté serveur** | API `GET /api/candidates?page=1&limit=20&status=...&offer=...` avec total pour éviter de charger toute la table. | Haute |
| **Variables d’environnement** | Centraliser les URLs (API, Python) et secrets dans `.env` (déjà partiellement fait) ; pas de secrets en dur. | Moyenne |
| **Gestion d’erreurs** | Messages d’erreur clairs côté front (toast ou inline) et codes HTTP cohérents côté backend. | Moyenne |
| **Tests** | Quelques tests automatisés (API candidates, analyse) pour les régressions. | Basse |

---

## Synthèse des priorités

- **À faire en priorité** (pour un usage GRH opérationnel)  
  Authentification + rôles, pipeline de statuts, offres de postes et lien candidat–offre, stockage réel des CV + téléchargement, dashboard KPIs recrutement, recherche/filtres/pagination, fiche candidat détaillée et édition, menu et navigation GRH.

- **Ensuite**  
  Modèles de critères, calendrier/entretiens, notifications, export Excel, audit basique.

- **Plus tard**  
  Rapports avancés, emails types, RGPD avancé, SSO, tests automatisés.

---

## Ordre de mise en œuvre suggéré

1. **Schéma BDD** : ajouter colonnes (STATUS, OFFER_ID, CREATED_BY, UPDATED_AT, etc.) et tables (OFFERS, CANDIDATE_OFFERS, USERS, ROLES, CRITERIA_TEMPLATES, AUDIT_LOG, DOCUMENTS/CV en BLOB ou chemin).
2. **Auth** : connexion obligatoire, JWT ou session, rôles sur les routes.
3. **Offres** : CRUD offres, association candidat–offre, critères par offre dans l’analyse.
4. **Pipeline** : statuts + historique, actions rapides, affichage dans liste et fiche.
5. **Stockage CV** : enregistrement du fichier (BLOB ou disque), route de téléchargement.
6. **Dashboard** : nouveaux indicateurs et graphiques, filtres de période.
7. **Candidats** : recherche, filtres, pagination, fiche dédiée et édition complète.
8. **Navigation** : menu GRH, nettoyage des pages inutiles.

Ce document peut servir de cahier des charges pour faire évoluer l’application pas à pas vers un outil GRH complet et utilisable au quotidien.

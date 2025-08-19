-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Hôte : 127.0.0.1:3306
-- Généré le : mar. 19 août 2025 à 16:41
-- Version du serveur : 9.1.0
-- Version de PHP : 8.3.14

--
-- Base de données : `cvmatch_db`
--

-- --------------------------------------------------------

--
-- Structure de la table `candidatures`
--

DROP TABLE IF EXISTS `candidatures`;
CREATE TABLE IF NOT EXISTS `candidatures` (
  `id` int NOT NULL AUTO_INCREMENT,
  `candidat_id` int NOT NULL,
  `offre_emploi_id` int NOT NULL,
  `chemin_fichier_cv` varchar(255) DEFAULT NULL,
  `lettre_motivation` text,
  `score_ia` decimal(5,2) DEFAULT NULL,
  `retour_ia` text,
  `statut` enum('en_attente','examinee','preselectionnee','acceptee','refusee') DEFAULT 'en_attente',
  `date_candidature` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `candidature_unique` (`candidat_id`,`offre_emploi_id`),
  KEY `offre_emploi_id` (`offre_emploi_id`)
) ENGINE=MyISAM AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Structure de la table `entreprise_documents`
--

DROP TABLE IF EXISTS `entreprise_documents`;
CREATE TABLE IF NOT EXISTS `entreprise_documents` (
  `id` int NOT NULL AUTO_INCREMENT,
  `profil_recruteur_id` int NOT NULL,
  `chemin_fichier` varchar(255) NOT NULL,
  `nom_original` varchar(255) DEFAULT NULL,
  `type_mime` varchar(100) DEFAULT NULL,
  `taille_octets` int UNSIGNED DEFAULT NULL,
  `date_upload` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_profil` (`profil_recruteur_id`)
) ENGINE=MyISAM AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


--
-- Structure de la table `notifications`
--

DROP TABLE IF EXISTS `notifications`;
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `recruteur_id` int NOT NULL,
  `type` varchar(50) NOT NULL DEFAULT 'application',
  `titre` varchar(255) NOT NULL,
  `message` text,
  `offre_id` int DEFAULT NULL,
  `candidature_id` int DEFAULT NULL,
  `lu` tinyint(1) NOT NULL DEFAULT '0',
  `date_creation` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_recruteur` (`recruteur_id`)
) ENGINE=MyISAM AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;



-- Structure de la table `offres_emploi`
--

DROP TABLE IF EXISTS `offres_emploi`;
CREATE TABLE IF NOT EXISTS `offres_emploi` (
  `id` int NOT NULL AUTO_INCREMENT,
  `recruteur_id` int NOT NULL,
  `titre` varchar(255) NOT NULL,
  `description` text NOT NULL,
  `exigences` text,
  `localisation` varchar(255) DEFAULT NULL,
  `domaine` varchar(255) DEFAULT NULL,
  `salaire_minimum` decimal(10,2) DEFAULT NULL,
  `salaire_maximum` decimal(10,2) DEFAULT NULL,
  `type_contrat` enum('temps_plein','temps_partiel','contrat') DEFAULT 'temps_plein',
  `statut` enum('brouillon','active','fermee') DEFAULT 'brouillon',
  `date_creation` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_offres_statut` (`statut`),
  KEY `idx_offres_recruteur` (`recruteur_id`),
  KEY `idx_offres_date` (`date_creation`)
) ENGINE=MyISAM AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Structure de la table `profils_recruteurs`
--

DROP TABLE IF EXISTS `profils_recruteurs`;
CREATE TABLE IF NOT EXISTS `profils_recruteurs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `utilisateur_id` int NOT NULL,
  `nom_entreprise` varchar(255) NOT NULL,
  `taille_entreprise` enum('startup','petite','moyenne','grande') DEFAULT 'moyenne',
  `secteur_activite` varchar(255) DEFAULT NULL,
  `description_entreprise` text,
  `forme_juridique` varchar(100) DEFAULT NULL,
  `activite_principale` varchar(255) DEFAULT NULL,
  `adresse` varchar(255) DEFAULT NULL,
  `code_postal` varchar(20) DEFAULT NULL,
  `ville` varchar(100) DEFAULT NULL,
  `pays` varchar(100) DEFAULT NULL,
  `telephone` varchar(30) DEFAULT NULL,
  `email_contact` varchar(255) DEFAULT NULL,
  `site_web` varchar(255) DEFAULT NULL,
  `confidentialite` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `utilisateur_id` (`utilisateur_id`)
) ENGINE=MyISAM AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;



-- Structure de la table `utilisateurs`
--

DROP TABLE IF EXISTS `utilisateurs`;
CREATE TABLE IF NOT EXISTS `utilisateurs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `prenom` varchar(100) NOT NULL,
  `nom` varchar(100) NOT NULL,
  `email` varchar(191) NOT NULL,
  `mot_de_passe_hash` varchar(255) NOT NULL,
  `type_utilisateur` enum('candidat','recruteur') DEFAULT 'candidat',
  `actif` tinyint(1) DEFAULT '1',
  `date_creation` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=MyISAM AUTO_INCREMENT=27 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

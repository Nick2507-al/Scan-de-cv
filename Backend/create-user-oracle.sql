-- =============================================================================
-- Création de l'utilisateur GENESIS pour l'application et SQL Developer
-- À exécuter en tant que SYSTEM (ou un utilisateur DBA)
-- =============================================================================

-- 1. Création de l'utilisateur
CREATE USER GENESIS IDENTIFIED BY orcl
  DEFAULT TABLESPACE USERS
  TEMPORARY TABLESPACE TEMP
  QUOTA UNLIMITED ON USERS;

-- 2. Droits de base (connexion + création d'objets)
GRANT CONNECT TO GENESIS;
GRANT RESOURCE TO GENESIS;
GRANT CREATE SYNONYM TO GENESIS;

-- 3. Droits sur les tables de l'application (créées dans SYSTEM)
GRANT SELECT, INSERT, UPDATE, DELETE ON SYSTEM.CANDIDATES TO GENESIS;
GRANT SELECT, INSERT, UPDATE, DELETE ON SYSTEM.DASHBOARD_CONFIG TO GENESIS;

-- 4. (Optionnel) Pour utiliser les tables sans préfixe SYSTEM,
--    connectez-vous en tant que GENESIS et exécutez : @genesis-synonyms.sql

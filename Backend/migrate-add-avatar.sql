-- Migration : ajouter la colonne AVATAR_PATH à USERS
-- Exécuter une fois en GENESIS (ou le schéma où se trouve la table USERS).
-- Si la colonne existe déjà (ORA-01430), ignorer l'erreur.
ALTER TABLE USERS ADD AVATAR_PATH VARCHAR2(500);

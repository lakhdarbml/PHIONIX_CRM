-- db-schema-and-seed.sql
-- Schema (InnoDB, utf8mb4) + seed data for the Phionix CRM
-- Created from project `src/lib/db.json` and adjusted for MySQL
-- Corrected index creation and Task.statut enum

-- Create database if not exists and use it
CREATE DATABASE IF NOT EXISTS phionix CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
USE phionix;

-- ================================
-- BASE : PERSONNES & ROLES
-- ================================

CREATE TABLE IF NOT EXISTS Personne (
    id_personne INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100),
    titre VARCHAR(50),
    email VARCHAR(255) UNIQUE,
    telephone VARCHAR(30),
    adresse TEXT,
    ville VARCHAR(100),
    code_postal VARCHAR(20),
    pays VARCHAR(50) DEFAULT 'France',
    date_naissance DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS Role (
    id_role INT AUTO_INCREMENT PRIMARY KEY,
    libelle VARCHAR(50) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================
-- ENTREPRISES
-- ================================

CREATE TABLE IF NOT EXISTS Companies (
    id_company INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(200) NOT NULL,
    type_entreprise VARCHAR(50),
    statut VARCHAR(50) DEFAULT 'Actif',
    site_web VARCHAR(200),
    adresse TEXT,
    ville VARCHAR(100),
    code_postal VARCHAR(20),
    pays VARCHAR(50) DEFAULT 'France',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================
-- EMPLOYES & CLIENTS
-- ================================

CREATE TABLE IF NOT EXISTS Employe (
    id_employe INT AUTO_INCREMENT PRIMARY KEY,
    id_personne INT UNIQUE NOT NULL,
    mot_de_passe VARCHAR(200) NOT NULL,
    id_role INT NOT NULL,
    date_embauche DATE,
    departement VARCHAR(100),
    statut VARCHAR(50) DEFAULT 'inactif',
    FOREIGN KEY (id_personne) REFERENCES Personne(id_personne) ON DELETE CASCADE,
    FOREIGN KEY (id_role) REFERENCES Role(id_role) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS Client (
    id_client INT AUTO_INCREMENT PRIMARY KEY,
    id_personne INT UNIQUE NOT NULL,
    id_company INT NULL,
    type_client VARCHAR(50) DEFAULT 'Individuel',
    statut VARCHAR(50) DEFAULT 'Inactif',
    FOREIGN KEY (id_personne) REFERENCES Personne(id_personne) ON DELETE CASCADE,
    FOREIGN KEY (id_company) REFERENCES Companies(id_company) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================
-- SEGMENTS (N–N AVEC CLIENTS)
-- ================================

CREATE TABLE IF NOT EXISTS Segment (
    id_segment INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    description TEXT,
    id_createur INT NULL,
    criteres JSON NULL,
    date_creation DATETIME DEFAULT CURRENT_TIMESTAMP,
    statut VARCHAR(50) DEFAULT 'Actif',
    FOREIGN KEY (id_createur) REFERENCES Employe(id_employe) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS Client_Segment (
    id_client INT NOT NULL,
    id_segment INT NOT NULL,
    date_affectation DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_client, id_segment),
    FOREIGN KEY (id_client) REFERENCES Client(id_client) ON DELETE CASCADE,
    FOREIGN KEY (id_segment) REFERENCES Segment(id_segment) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================
-- TACHES
-- ================================

CREATE TABLE IF NOT EXISTS Task (
    id_task INT AUTO_INCREMENT PRIMARY KEY,
    titre VARCHAR(200) NOT NULL,
    description TEXT,
    date_creation DATETIME DEFAULT CURRENT_TIMESTAMP,
    date_echeance DATETIME,
    statut ENUM('Ouverte', 'En Cours', 'Terminée', 'Annulée', 'PendingValidation') DEFAULT 'Ouverte',
    priorite ENUM('Basse', 'Moyenne', 'Haute') DEFAULT 'Moyenne',
    id_createur INT NOT NULL,
    id_assigner_a INT NOT NULL,
    id_client INT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_createur) REFERENCES Employe(id_employe) ON DELETE RESTRICT,
    FOREIGN KEY (id_assigner_a) REFERENCES Employe(id_employe) ON DELETE RESTRICT,
    FOREIGN KEY (id_client) REFERENCES Client(id_client) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================
-- INTERACTIONS
-- ================================

CREATE TABLE IF NOT EXISTS Objectif (
    id_objectif INT AUTO_INCREMENT PRIMARY KEY,
    libelle VARCHAR(100) NOT NULL,
    description TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS Produit (
    id_produit INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    description TEXT,
    prix DECIMAL(10,2),
    prix_liste DECIMAL(10,2),
    cout DECIMAL(10,2)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS Type_Interaction (
    id_type INT AUTO_INCREMENT PRIMARY KEY,
    libelle VARCHAR(100) NOT NULL,
    description TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS Interaction (
    id_interaction INT AUTO_INCREMENT PRIMARY KEY,
    date_interaction DATETIME DEFAULT CURRENT_TIMESTAMP,
    duree TIME,
    resultat TEXT,
    id_employe INT NOT NULL,
    id_client INT NOT NULL,
    id_objectif INT NULL,
    id_produit INT NULL,
    id_type INT NOT NULL,
    FOREIGN KEY (id_employe) REFERENCES Employe(id_employe) ON DELETE RESTRICT,
    FOREIGN KEY (id_client) REFERENCES Client(id_client) ON DELETE CASCADE,
    FOREIGN KEY (id_objectif) REFERENCES Objectif(id_objectif) ON DELETE SET NULL,
    FOREIGN KEY (id_produit) REFERENCES Produit(id_produit) ON DELETE SET NULL,
    FOREIGN KEY (id_type) REFERENCES Type_Interaction(id_type) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS Note (
    id_note INT AUTO_INCREMENT PRIMARY KEY,
    contenu TEXT NOT NULL,
    date_creation DATETIME DEFAULT CURRENT_TIMESTAMP,
    id_interaction INT NOT NULL,
    FOREIGN KEY (id_interaction) REFERENCES Interaction(id_interaction) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================
-- OPPORTUNITES
-- ================================

CREATE TABLE IF NOT EXISTS Opportunite (
    id_opportunite INT AUTO_INCREMENT PRIMARY KEY,
    titre VARCHAR(200) NOT NULL,
    description TEXT,
    valeur DECIMAL(12,2),
    probabilite DECIMAL(5,2) DEFAULT 50.00,
    source_lead VARCHAR(100),
    date_fermeture_prevue DATE,
    etape VARCHAR(50),
    date_creation DATETIME DEFAULT CURRENT_TIMESTAMP,
    id_employe INT NOT NULL,
    id_client INT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_employe) REFERENCES Employe(id_employe) ON DELETE RESTRICT,
    FOREIGN KEY (id_client) REFERENCES Client(id_client) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Triggers to enforce probabilite between 0 and 100
DELIMITER //
CREATE TRIGGER check_probabilite_before_insert
BEFORE INSERT ON Opportunite
FOR EACH ROW
BEGIN
    IF NEW.probabilite < 0 OR NEW.probabilite > 100 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Probabilite must be between 0 and 100';
    END IF;
END;
//
CREATE TRIGGER check_probabilite_before_update
BEFORE UPDATE ON Opportunite
FOR EACH ROW
BEGIN
    IF NEW.probabilite < 0 OR NEW.probabilite > 100 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Probabilite must be between 0 and 100';
    END IF;
END;
//
DELIMITER ;

-- ================================
-- MESSAGERIE
-- ================================

CREATE TABLE IF NOT EXISTS Conversation (
    id_conversation INT AUTO_INCREMENT PRIMARY KEY,
    titre VARCHAR(200),
    id_createur INT NOT NULL,
    date_creation DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (id_createur) REFERENCES Employe(id_employe) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS Participant (
    id_conversation INT NOT NULL,
    id_personne INT NOT NULL,
    type_participant ENUM('Employe', 'Client') NOT NULL,
    date_ajout DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_conversation, id_personne),
    FOREIGN KEY (id_conversation) REFERENCES Conversation(id_conversation) ON DELETE CASCADE,
    FOREIGN KEY (id_personne) REFERENCES Personne(id_personne) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS Message (
    id_message INT AUTO_INCREMENT PRIMARY KEY,
    contenu TEXT NOT NULL,
    date_envoi DATETIME DEFAULT CURRENT_TIMESTAMP,
    id_emetteur INT NOT NULL,
    id_conversation INT NOT NULL,
    FOREIGN KEY (id_emetteur) REFERENCES Personne(id_personne) ON DELETE RESTRICT,
    FOREIGN KEY (id_conversation) REFERENCES Conversation(id_conversation) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS Message_Read (
    id_message INT NOT NULL,
    id_personne INT NOT NULL,
    vu BOOLEAN DEFAULT FALSE,
    date_vue DATETIME NULL,
    PRIMARY KEY (id_message, id_personne),
    FOREIGN KEY (id_message) REFERENCES Message(id_message) ON DELETE CASCADE,
    FOREIGN KEY (id_personne) REFERENCES Personne(id_personne) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================
-- STORED PROCEDURE FOR SAFE INDEX CREATION
-- ================================

DELIMITER //

CREATE PROCEDURE CreateIndexIfNotExists(
    IN indexName VARCHAR(255),
    IN tableName VARCHAR(255),
    IN columnName VARCHAR(255)
)
BEGIN
    DECLARE indexExists INT DEFAULT 0;

    -- Check if index exists
    SELECT COUNT(*)
    INTO indexExists
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = tableName
    AND INDEX_NAME = indexName;

    -- Create index if it doesn't exist
    IF indexExists = 0 THEN
        SET @sql = CONCAT('CREATE INDEX ', indexName, ' ON ', tableName, '(', columnName, ')');
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END //

DELIMITER ;

-- ================================
-- INDEXES POUR PERFORMANCE
-- ================================

CALL CreateIndexIfNotExists('idx_personne_email', 'Personne', 'email');
CALL CreateIndexIfNotExists('idx_personne_titre', 'Personne', 'titre');
CALL CreateIndexIfNotExists('idx_employe_personne', 'Employe', 'id_personne');
CALL CreateIndexIfNotExists('idx_client_personne', 'Client', 'id_personne');
CALL CreateIndexIfNotExists('idx_client_company', 'Client', 'id_company');
CALL CreateIndexIfNotExists('idx_companies_nom', 'Companies', 'nom');
CALL CreateIndexIfNotExists('idx_segment_createur', 'Segment', 'id_createur');
CALL CreateIndexIfNotExists('idx_task_createur', 'Task', 'id_createur');
CALL CreateIndexIfNotExists('idx_task_assigner', 'Task', 'id_assigner_a');
CALL CreateIndexIfNotExists('idx_task_statut', 'Task', 'statut');
CALL CreateIndexIfNotExists('idx_interaction_employe', 'Interaction', 'id_employe');
CALL CreateIndexIfNotExists('idx_interaction_client', 'Interaction', 'id_client');
CALL CreateIndexIfNotExists('idx_interaction_date', 'Interaction', 'date_interaction');
CALL CreateIndexIfNotExists('idx_note_interaction', 'Note', 'id_interaction');
CALL CreateIndexIfNotExists('idx_opportunite_employe', 'Opportunite', 'id_employe');
CALL CreateIndexIfNotExists('idx_opportunite_client', 'Opportunite', 'id_client');
CALL CreateIndexIfNotExists('idx_opportunite_etape', 'Opportunite', 'etape');
CALL CreateIndexIfNotExists('idx_opportunite_probabilite', 'Opportunite', 'probabilite');
CALL CreateIndexIfNotExists('idx_conversation_createur', 'Conversation', 'id_createur');
CALL CreateIndexIfNotExists('idx_conversation_updated', 'Conversation', 'updated_at');
CALL CreateIndexIfNotExists('idx_participant_personne', 'Participant', 'id_personne');
CALL CreateIndexIfNotExists('idx_participant_type', 'Participant', 'type_participant');
CALL CreateIndexIfNotExists('idx_message_emetteur', 'Message', 'id_emetteur');
CALL CreateIndexIfNotExists('idx_message_conversation', 'Message', 'id_conversation');
CALL CreateIndexIfNotExists('idx_message_date', 'Message', 'date_envoi');
CALL CreateIndexIfNotExists('idx_message_read_personne', 'Message_Read', 'id_personne');

-- ================================
-- SEED DATA derived from src/lib/db.json
-- NOTE: mappings: p1->1, p2->2, ... ; r1->1, e1->1, c1->1, conv_1->1, etc.
-- ================================

-- Roles
INSERT INTO Role (id_role, libelle) VALUES
(1,'admin'),
(2,'manager'),
(3,'sales'),
(4,'support'),
(5,'client')
ON DUPLICATE KEY UPDATE libelle=VALUES(libelle);

-- Personnes
INSERT INTO Personne (id_personne, nom, prenom, email, telephone, created_at, updated_at) VALUES
(1,'Admin','User','admin@agileflow.com','0102030405','2024-01-01 10:00:00','2024-01-01 10:00:00'),
(2,'Manager','User','manager@agileflow.com','0102030406','2024-01-01 10:00:00','2024-01-01 10:00:00'),
(3,'Sales','User','sales@agileflow.com','0102030407','2024-01-01 10:00:00','2024-01-01 10:00:00'),
(4,'Support','User','support@agileflow.com','0102030408','2024-01-01 10:00:00','2024-01-01 10:00:00'),
(5,'Alpha','Société','client@alpha.com','0601010101','2024-01-10 10:00:00','2024-01-10 10:00:00'),
(6,'Beta','Global','client@beta.com','0602020202','2024-01-11 10:00:00','2024-01-11 10:00:00')
ON DUPLICATE KEY UPDATE nom=VALUES(nom);

-- Employes (map e1->1 etc.)
INSERT INTO Employe (id_employe, id_personne, mot_de_passe, id_role, statut, date_embauche) VALUES
(1,1,'password',1,'Actif','2022-08-15'),
(2,2,'password',2,'Actif','2023-03-10'),
(3,3,'password',3,'Actif','2023-06-01'),
(4,4,'password',4,'Actif','2023-09-20')
ON DUPLICATE KEY UPDATE id_personne=VALUES(id_personne);

-- Companies (none in seed) - left empty

-- Clients (c1->1, c2->2)
INSERT INTO Client (id_client, id_personne, statut) VALUES
(1,5,'Actif'),
(2,6,'Prospect')
ON DUPLICATE KEY UPDATE id_personne=VALUES(id_personne);

-- Produit
INSERT INTO Produit (id_produit, nom, description, prix) VALUES
(1,'Abonnement Premium','Accès complet à la plateforme',99.99),
(2,'Abonnement Standard','Accès limité',49.99)
ON DUPLICATE KEY UPDATE nom=VALUES(nom);

-- Objectifs
INSERT INTO Objectif (id_objectif, libelle) VALUES
(1,'Suivi'),
(2,'Démonstration')
ON DUPLICATE KEY UPDATE libelle=VALUES(libelle);

-- Type_Interaction
INSERT INTO Type_Interaction (id_type, libelle) VALUES
(1,'Appel'),
(2,'Email'),
(3,'Réunion'),
(4,'Note')
ON DUPLICATE KEY UPDATE libelle=VALUES(libelle);

-- Opportunites (map to integers)
INSERT INTO Opportunite (id_opportunite, titre, valeur, etape, date_creation, id_employe, id_client, updated_at) VALUES
(1,'Intégration CRM pour Alpha',5000,'Proposition','2024-05-01 11:00:00',3,1,'2024-05-01 11:00:00'),
(2,'Phase de découverte Beta',10000,'Qualification','2024-04-25 16:00:00',3,2,'2024-04-25 16:00:00')
ON DUPLICATE KEY UPDATE titre=VALUES(titre);

-- Interactions (map ids)
INSERT INTO Interaction (id_interaction, date_interaction, id_employe, id_client, id_objectif, id_type, resultat) VALUES
(1,'2024-05-15 09:00:00',3,1,1,2,'Email de suivi envoyé concernant la proposition.'),
(2,'2024-05-14 15:30:00',3,2,2,3,'Réunion de démonstration effectuée. Le client semble intéressé.'),
(3,'2024-05-16 11:00:00',4,1,1,2,'Problème de connexion résolu.'),
(4,'2024-05-17 14:00:00',3,1,1,4,'Le client a confirmé la réception de la proposition.')
ON DUPLICATE KEY UPDATE resultat=VALUES(resultat);

-- Tasks
INSERT INTO Task (id_task, titre, description, date_creation, date_echeance, statut, priorite, id_createur, id_assigner_a, id_client, updated_at) VALUES
(1,'Préparer la proposition pour Alpha','', '2024-05-10 10:00:00','2024-05-25 17:00:00','En Cours','Haute',2,3,1,'2024-05-10 10:00:00'),
(2,'Planifier la démo avec Beta','', '2024-05-12 10:00:00','2024-05-20 17:00:00','Ouverte','Moyenne',2,3,2,'2024-05-12 10:00:00'),
(3,'Valider nouvelle stratégie marketing','', '2024-05-13 10:00:00','2024-05-30 17:00:00','PendingValidation','Haute',2,1,NULL,'2024-05-13 10:00:00'),
(4,'Formation interne CRM','', '2024-05-18 10:00:00','2024-05-28 17:00:00','Ouverte','Moyenne',3,3,NULL,'2024-05-18 10:00:00'),
(5,'Rapport de performance mensuel','', '2024-05-20 10:00:00','2024-06-05 17:00:00','Ouverte','Basse',1,2,NULL,'2024-05-20 10:00:00'),
(6,'Organiser le team building','', '2024-05-21 10:00:00','2024-06-15 17:00:00','En Cours','Moyenne',2,2,NULL,'2024-05-21 10:00:00')
ON DUPLICATE KEY UPDATE titre=VALUES(titre);

-- Conversations
INSERT INTO Conversation (id_conversation, titre, id_createur, date_creation, updated_at) VALUES
(1,'Discussion Projet Alpha',3,'2024-05-15 14:50:00','2024-05-15 15:00:00'),
(2,'Question Client Beta',4,'2024-05-15 11:45:00','2024-05-15 12:00:00'),
(3,'Briefing Équipe Commerciale',2,'2024-05-20 09:00:00','2024-05-20 09:15:00')
ON DUPLICATE KEY UPDATE titre=VALUES(titre);

-- Participants (map p3->3 etc.)
INSERT INTO Participant (id_conversation, id_personne, type_participant, date_ajout) VALUES
(1,3,'Employe','2024-05-15 14:50:00'),
(1,4,'Employe','2024-05-15 14:50:00'),
(2,4,'Employe','2024-05-15 11:45:00'),
(2,6,'Client','2024-05-15 11:45:00'),
(3,2,'Employe','2024-05-20 09:00:00'),
(3,3,'Employe','2024-05-20 09:00:00')
ON DUPLICATE KEY UPDATE date_ajout=VALUES(date_ajout);

-- Messages (map ids)
INSERT INTO Message (id_message, contenu, date_envoi, id_emetteur, id_conversation) VALUES
(1,'Salut, tu as pu jeter un oeil à la doc pour Alpha ?','2024-05-15 14:55:00',3,1),
(2,'Oui, j\'ai une question sur le point 3. On peut faire un point demain ?','2024-05-15 15:00:00',4,1),
(3,'Bonjour, je ne comprends pas comment activer la nouvelle fonctionnalité.','2024-05-15 11:50:00',6,2),
(4,'Bonjour, il vous suffit d\'aller dans les paramètres de votre compte. Je vous guide.','2024-05-15 11:55:00',4,2),
(5,'Merci pour votre retour rapide !','2024-05-15 12:00:00',6,2),
(6,'Bonjour l\'équipe, petit point sur les objectifs du trimestre. Pensez à mettre à jour vos opportunités.','2024-05-20 09:10:00',2,3),
(7,'Bien reçu ! Je m\'en occupe.','2024-05-20 09:15:00',3,3)
ON DUPLICATE KEY UPDATE contenu=VALUES(contenu);

-- Message_Read left empty by default

-- ================================
-- End of seed
-- ================================
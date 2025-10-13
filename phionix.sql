-- phpMyAdmin SQL Dump
-- version 4.8.5
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1:3306
-- Generation Time: Oct 09, 2025 at 01:52 PM
-- Server version: 5.7.26
-- PHP Version: 7.2.18

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET AUTOCOMMIT = 0;
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `phionix`
--

DELIMITER $$
--
-- Procedures
--
DROP PROCEDURE IF EXISTS `CanReceiveNotification`$$
CREATE DEFINER=`root`@`localhost` PROCEDURE `CanReceiveNotification` (IN `p_user_id` BIGINT, IN `p_type_notification` VARCHAR(50))  BEGIN
    SELECT 
        CASE 
            WHEN nr.id_notification_role IS NOT NULL 
            AND np.id_preference IS NOT NULL 
            AND np.in_app_enabled = TRUE 
            THEN TRUE 
            ELSE FALSE 
        END as can_receive
    FROM Personne p
    JOIN Role r ON p.id_role = r.id_role
    LEFT JOIN NotificationRoles nr ON r.id_role = nr.id_role 
        AND nr.type_notification = p_type_notification
    LEFT JOIN NotificationPreferences np ON p.id_personne = np.id_personne 
        AND np.type_notification = p_type_notification
    WHERE p.id_personne = p_user_id;
END$$

DROP PROCEDURE IF EXISTS `CreateIndexIfNotExists`$$
CREATE DEFINER=`root`@`localhost` PROCEDURE `CreateIndexIfNotExists` (IN `indexName` VARCHAR(255), IN `tableName` VARCHAR(255), IN `columnName` VARCHAR(255))  BEGIN
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
END$$

DROP PROCEDURE IF EXISTS `CreateNotification`$$
CREATE DEFINER=`root`@`localhost` PROCEDURE `CreateNotification` (IN `p_titre` VARCHAR(255), IN `p_message` TEXT, IN `p_destinataire_id` BIGINT, IN `p_type_notification` VARCHAR(50), IN `p_priority` VARCHAR(10), IN `p_meta` JSON)  BEGIN
    INSERT INTO Notifications (
        titre, 
        message, 
        destinataire_id, 
        type_notification, 
        priority, 
        meta
    )
    VALUES (
        p_titre, 
        p_message, 
        p_destinataire_id, 
        p_type_notification, 
        p_priority, 
        p_meta
    );
    SELECT LAST_INSERT_ID() as id_notification;
END$$

DROP PROCEDURE IF EXISTS `GetUnreadNotificationCount`$$
CREATE DEFINER=`root`@`localhost` PROCEDURE `GetUnreadNotificationCount` (IN `p_user_id` BIGINT)  BEGIN
    SELECT COUNT(*) as unread_count
    FROM Notifications
    WHERE destinataire_id = p_user_id 
    AND lu = FALSE;
END$$

DROP PROCEDURE IF EXISTS `GetUserNotifications`$$
CREATE DEFINER=`root`@`localhost` PROCEDURE `GetUserNotifications` (IN `p_user_id` BIGINT, IN `p_limit` INT, IN `p_offset` INT)  BEGIN
    SELECT n.*
    FROM Notifications n
    WHERE n.destinataire_id = p_user_id
    ORDER BY n.date_creation DESC
    LIMIT p_limit
    OFFSET p_offset;
END$$

DROP PROCEDURE IF EXISTS `MarkNotificationAsRead`$$
CREATE DEFINER=`root`@`localhost` PROCEDURE `MarkNotificationAsRead` (IN `p_notification_id` BIGINT, IN `p_user_id` BIGINT)  BEGIN
    UPDATE Notifications 
    SET lu = TRUE, 
        date_lecture = CURRENT_TIMESTAMP
    WHERE id_notification = p_notification_id 
    AND destinataire_id = p_user_id;
END$$

DROP PROCEDURE IF EXISTS `UpdateNotificationPreferences`$$
CREATE DEFINER=`root`@`localhost` PROCEDURE `UpdateNotificationPreferences` (IN `p_user_id` BIGINT, IN `p_type_notification` VARCHAR(50), IN `p_email_enabled` BOOLEAN, IN `p_push_enabled` BOOLEAN, IN `p_in_app_enabled` BOOLEAN)  BEGIN
    INSERT INTO NotificationPreferences (
        id_personne,
        type_notification,
        email_enabled,
        push_enabled,
        in_app_enabled
    )
    VALUES (
        p_user_id,
        p_type_notification,
        p_email_enabled,
        p_push_enabled,
        p_in_app_enabled
    )
    ON DUPLICATE KEY UPDATE
        email_enabled = p_email_enabled,
        push_enabled = p_push_enabled,
        in_app_enabled = p_in_app_enabled;
END$$

DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `client`
--

DROP TABLE IF EXISTS `client`;
CREATE TABLE IF NOT EXISTS `client` (
  `id_client` int(11) NOT NULL AUTO_INCREMENT,
  `id_personne` int(11) NOT NULL,
  `id_company` int(11) DEFAULT NULL,
  `type_client` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'Individuel',
  `statut` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'Inactif',
  PRIMARY KEY (`id_client`),
  UNIQUE KEY `id_personne` (`id_personne`),
  KEY `idx_client_personne` (`id_personne`),
  KEY `idx_client_company` (`id_company`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `client`
--

INSERT INTO `client` (`id_client`, `id_personne`, `id_company`, `type_client`, `statut`) VALUES
(1, 5, NULL, 'Individuel', 'Actif'),
(2, 6, NULL, 'Individuel', 'Prospect');

-- --------------------------------------------------------

--
-- Table structure for table `client_segment`
--

DROP TABLE IF EXISTS `client_segment`;
CREATE TABLE IF NOT EXISTS `client_segment` (
  `id_client` int(11) NOT NULL,
  `id_segment` int(11) NOT NULL,
  `date_affectation` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_client`,`id_segment`),
  KEY `id_segment` (`id_segment`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `companies`
--

DROP TABLE IF EXISTS `companies`;
CREATE TABLE IF NOT EXISTS `companies` (
  `id_company` int(11) NOT NULL AUTO_INCREMENT,
  `nom` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type_entreprise` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `statut` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'Actif',
  `site_web` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `adresse` text COLLATE utf8mb4_unicode_ci,
  `ville` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `code_postal` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pays` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'Algeria',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_company`),
  KEY `idx_companies_nom` (`nom`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `conversation`
--

DROP TABLE IF EXISTS `conversation`;
CREATE TABLE IF NOT EXISTS `conversation` (
  `id_conversation` int(11) NOT NULL AUTO_INCREMENT,
  `titre` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `id_createur` int(11) NOT NULL,
  `date_creation` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_banned` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id_conversation`),
  KEY `idx_conversation_createur` (`id_createur`),
  KEY `idx_conversation_updated` (`updated_at`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `conversation`
--

INSERT INTO `conversation` (`id_conversation`, `titre`, `id_createur`, `date_creation`, `updated_at`, `is_banned`) VALUES
(1, 'Discussion Projet Alpha', 3, '2024-05-15 14:50:00', '2024-05-15 15:00:00', 0),
(2, 'Question Client Beta', 4, '2024-05-15 11:45:00', '2025-10-09 09:38:02', 1),
(3, 'Briefing Équipe Commerciale', 2, '2024-05-20 09:00:00', '2024-05-20 09:15:00', 0),
(5, 'cc', 1, '2025-10-09 09:37:44', '2025-10-09 10:05:37', 1),
(6, 'E2E Test Conv', 1, '2025-10-09 09:49:32', '2025-10-09 09:49:34', 1),
(7, 'E2E Test Conv', 1, '2025-10-09 10:12:55', '2025-10-09 10:12:55', 1),
(8, 'vv', 1, '2025-10-09 10:15:42', '2025-10-09 10:15:42', 0);

-- --------------------------------------------------------

--
-- Table structure for table `employe`
--

DROP TABLE IF EXISTS `employe`;
CREATE TABLE IF NOT EXISTS `employe` (
  `id_employe` int(11) NOT NULL AUTO_INCREMENT,
  `id_personne` int(11) NOT NULL,
  `mot_de_passe` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `id_role` int(11) NOT NULL,
  `date_embauche` date DEFAULT NULL,
  `departement` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `statut` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'inactif',
  PRIMARY KEY (`id_employe`),
  UNIQUE KEY `id_personne` (`id_personne`),
  KEY `id_role` (`id_role`),
  KEY `idx_employe_personne` (`id_personne`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `employe`
--

INSERT INTO `employe` (`id_employe`, `id_personne`, `mot_de_passe`, `id_role`, `date_embauche`, `departement`, `statut`) VALUES
(1, 1, 'password', 1, '2022-08-15', NULL, 'Actif'),
(2, 2, 'password', 2, '2023-03-10', NULL, 'Actif'),
(3, 3, 'password', 3, '2023-06-01', NULL, 'Actif'),
(4, 4, 'password', 4, '2023-09-20', NULL, 'Actif');

-- --------------------------------------------------------

--
-- Table structure for table `interaction`
--

DROP TABLE IF EXISTS `interaction`;
CREATE TABLE IF NOT EXISTS `interaction` (
  `id_interaction` int(11) NOT NULL AUTO_INCREMENT,
  `date_interaction` datetime DEFAULT CURRENT_TIMESTAMP,
  `duree` time DEFAULT NULL,
  `resultat` text COLLATE utf8mb4_unicode_ci,
  `id_employe` int(11) NOT NULL,
  `id_client` int(11) NOT NULL,
  `id_objectif` int(11) DEFAULT NULL,
  `id_produit` int(11) DEFAULT NULL,
  `id_type` int(11) NOT NULL,
  PRIMARY KEY (`id_interaction`),
  KEY `id_objectif` (`id_objectif`),
  KEY `id_produit` (`id_produit`),
  KEY `id_type` (`id_type`),
  KEY `idx_interaction_employe` (`id_employe`),
  KEY `idx_interaction_client` (`id_client`),
  KEY `idx_interaction_date` (`date_interaction`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `interaction`
--

INSERT INTO `interaction` (`id_interaction`, `date_interaction`, `duree`, `resultat`, `id_employe`, `id_client`, `id_objectif`, `id_produit`, `id_type`) VALUES
(1, '2024-05-15 09:00:00', NULL, 'Email de suivi envoyé concernant la proposition.', 3, 1, 1, NULL, 2),
(2, '2024-05-14 15:30:00', NULL, 'Réunion de démonstration effectuée. Le client semble intéressé.', 3, 2, 2, NULL, 3),
(3, '2024-05-16 11:00:00', NULL, 'Problème de connexion résolu.', 4, 1, 1, NULL, 2),
(4, '2024-05-17 14:00:00', NULL, 'Le client a confirmé la réception de la proposition.', 3, 1, 1, NULL, 4);

-- --------------------------------------------------------

--
-- Table structure for table `message`
--

DROP TABLE IF EXISTS `message`;
CREATE TABLE IF NOT EXISTS `message` (
  `id_message` int(11) NOT NULL AUTO_INCREMENT,
  `contenu` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `date_envoi` datetime DEFAULT CURRENT_TIMESTAMP,
  `id_emetteur` int(11) NOT NULL,
  `id_conversation` int(11) NOT NULL,
  PRIMARY KEY (`id_message`),
  KEY `idx_message_emetteur` (`id_emetteur`),
  KEY `idx_message_conversation` (`id_conversation`),
  KEY `idx_message_date` (`date_envoi`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `message`
--

INSERT INTO `message` (`id_message`, `contenu`, `date_envoi`, `id_emetteur`, `id_conversation`) VALUES
(1, 'Salut, tu as pu jeter un oeil à la doc pour Alpha ?', '2024-05-15 14:55:00', 3, 1),
(2, 'Oui, j\'ai une question sur le point 3. On peut faire un point demain ?', '2024-05-15 15:00:00', 4, 1),
(3, 'Bonjour, je ne comprends pas comment activer la nouvelle fonctionnalité.', '2024-05-15 11:50:00', 6, 2),
(4, 'Bonjour, il vous suffit d\'aller dans les paramètres de votre compte. Je vous guide.', '2024-05-15 11:55:00', 4, 2),
(5, 'Merci pour votre retour rapide !', '2024-05-15 12:00:00', 6, 2),
(6, 'Bonjour l\'équipe, petit point sur les objectifs du trimestre. Pensez à mettre à jour vos opportunités.', '2024-05-20 09:10:00', 2, 3),
(7, 'Bien reçu ! Je m\'en occupe.', '2024-05-20 09:15:00', 3, 3),
(8, 'ok', '2025-10-09 10:23:05', 3, 3),
(9, 'bouchmell', '2025-10-09 10:23:31', 3, 1),
(10, 'hi', '2025-10-09 11:11:57', 2, 8),
(11, 'ok', '2025-10-09 11:18:15', 1, 8),
(12, 'cv', '2025-10-09 11:36:16', 1, 8);

-- --------------------------------------------------------

--
-- Table structure for table `message_read`
--

DROP TABLE IF EXISTS `message_read`;
CREATE TABLE IF NOT EXISTS `message_read` (
  `id_message` int(11) NOT NULL,
  `id_personne` int(11) NOT NULL,
  `vu` tinyint(1) DEFAULT '0',
  `date_vue` datetime DEFAULT NULL,
  PRIMARY KEY (`id_message`,`id_personne`),
  KEY `idx_message_read_personne` (`id_personne`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `note`
--

DROP TABLE IF EXISTS `note`;
CREATE TABLE IF NOT EXISTS `note` (
  `id_note` int(11) NOT NULL AUTO_INCREMENT,
  `contenu` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `date_creation` datetime DEFAULT CURRENT_TIMESTAMP,
  `id_interaction` int(11) NOT NULL,
  PRIMARY KEY (`id_note`),
  KEY `idx_note_interaction` (`id_interaction`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `notification`
--

DROP TABLE IF EXISTS `notification`;
CREATE TABLE IF NOT EXISTS `notification` (
  `id_notification` bigint(20) NOT NULL AUTO_INCREMENT,
  `titre` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `message` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `destinataire_id` bigint(20) NOT NULL,
  `type_notification` enum('MESSAGE','OPPORTUNITY','TASK_ASSIGNMENT','TASK_STATUS','CLIENT_REQUEST','CLIENT_VALIDATION','ADMIN_SUPERVISION','MANAGER_ACTION','TEAM_UPDATE') COLLATE utf8mb4_unicode_ci NOT NULL,
  `priority` enum('low','medium','high') COLLATE utf8mb4_unicode_ci NOT NULL,
  `lu` tinyint(1) DEFAULT '0',
  `date_creation` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `date_lecture` timestamp NULL DEFAULT NULL,
  `meta` json DEFAULT NULL,
  PRIMARY KEY (`id_notification`),
  KEY `idx_notifications_destinataire` (`destinataire_id`,`lu`),
  KEY `idx_notifications_type` (`type_notification`),
  KEY `idx_notifications_date` (`date_creation`)
) ENGINE=MyISAM AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `notification`
--

INSERT INTO `notification` (`id_notification`, `titre`, `message`, `destinataire_id`, `type_notification`, `priority`, `lu`, `date_creation`, `date_lecture`, `meta`) VALUES
(1, 'Nouveau message', 'cv', 2, 'MESSAGE', 'low', 0, '2025-10-09 10:36:15', NULL, '{\"id_message\": 12, \"id_conversation\": \"8\"}');

-- --------------------------------------------------------

--
-- Table structure for table `notificationpreferences`
--

DROP TABLE IF EXISTS `notificationpreferences`;
CREATE TABLE IF NOT EXISTS `notificationpreferences` (
  `id_preference` bigint(20) NOT NULL AUTO_INCREMENT,
  `id_personne` bigint(20) NOT NULL,
  `type_notification` enum('MESSAGE','OPPORTUNITY','TASK_ASSIGNMENT','TASK_STATUS','CLIENT_REQUEST','CLIENT_VALIDATION','ADMIN_SUPERVISION','MANAGER_ACTION','TEAM_UPDATE') COLLATE utf8mb4_unicode_ci NOT NULL,
  `email_enabled` tinyint(1) DEFAULT '1',
  `push_enabled` tinyint(1) DEFAULT '1',
  `in_app_enabled` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id_preference`),
  UNIQUE KEY `unique_user_notification_type` (`id_personne`,`type_notification`)
) ENGINE=MyISAM AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `notificationpreferences`
--

INSERT INTO `notificationpreferences` (`id_preference`, `id_personne`, `type_notification`, `email_enabled`, `push_enabled`, `in_app_enabled`) VALUES
(1, 1, 'MESSAGE', 1, 1, 1);

-- --------------------------------------------------------

--
-- Table structure for table `notificationroles`
--

DROP TABLE IF EXISTS `notificationroles`;
CREATE TABLE IF NOT EXISTS `notificationroles` (
  `id_notification_role` bigint(20) NOT NULL AUTO_INCREMENT,
  `type_notification` enum('MESSAGE','OPPORTUNITY','TASK_ASSIGNMENT','TASK_STATUS','CLIENT_REQUEST','CLIENT_VALIDATION','ADMIN_SUPERVISION','MANAGER_ACTION','TEAM_UPDATE') COLLATE utf8mb4_unicode_ci NOT NULL,
  `id_role` bigint(20) NOT NULL,
  PRIMARY KEY (`id_notification_role`),
  UNIQUE KEY `unique_notification_role` (`type_notification`,`id_role`),
  KEY `id_role` (`id_role`)
) ENGINE=MyISAM AUTO_INCREMENT=26 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `notificationroles`
--

INSERT INTO `notificationroles` (`id_notification_role`, `type_notification`, `id_role`) VALUES
(1, 'MESSAGE', 1),
(2, 'OPPORTUNITY', 1),
(3, 'TASK_ASSIGNMENT', 1),
(4, 'TASK_STATUS', 1),
(5, 'CLIENT_REQUEST', 1),
(6, 'CLIENT_VALIDATION', 1),
(7, 'ADMIN_SUPERVISION', 1),
(8, 'MANAGER_ACTION', 1),
(9, 'TEAM_UPDATE', 1),
(10, 'MESSAGE', 2),
(11, 'OPPORTUNITY', 2),
(12, 'TASK_ASSIGNMENT', 2),
(13, 'TASK_STATUS', 2),
(14, 'CLIENT_REQUEST', 2),
(15, 'TEAM_UPDATE', 2),
(16, 'MESSAGE', 3),
(17, 'OPPORTUNITY', 3),
(18, 'TASK_ASSIGNMENT', 3),
(19, 'TASK_STATUS', 3),
(20, 'TEAM_UPDATE', 3),
(21, 'MESSAGE', 4),
(22, 'TASK_ASSIGNMENT', 4),
(23, 'TASK_STATUS', 4),
(24, 'TEAM_UPDATE', 4),
(25, 'MESSAGE', 5);

-- --------------------------------------------------------

--
-- Table structure for table `objectif`
--

DROP TABLE IF EXISTS `objectif`;
CREATE TABLE IF NOT EXISTS `objectif` (
  `id_objectif` int(11) NOT NULL AUTO_INCREMENT,
  `libelle` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id_objectif`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `objectif`
--

INSERT INTO `objectif` (`id_objectif`, `libelle`, `description`) VALUES
(1, 'Suivi', NULL),
(2, 'Démonstration', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `opportunite`
--

DROP TABLE IF EXISTS `opportunite`;
CREATE TABLE IF NOT EXISTS `opportunite` (
  `id_opportunite` int(11) NOT NULL AUTO_INCREMENT,
  `titre` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `valeur` decimal(12,2) DEFAULT NULL,
  `probabilite` decimal(5,2) DEFAULT '50.00',
  `source_lead` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `date_fermeture_prevue` date DEFAULT NULL,
  `etape` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `date_creation` datetime DEFAULT CURRENT_TIMESTAMP,
  `id_employe` int(11) NOT NULL,
  `id_client` int(11) NOT NULL,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_opportunite`),
  KEY `idx_opportunite_employe` (`id_employe`),
  KEY `idx_opportunite_client` (`id_client`),
  KEY `idx_opportunite_etape` (`etape`),
  KEY `idx_opportunite_probabilite` (`probabilite`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `opportunite`
--

INSERT INTO `opportunite` (`id_opportunite`, `titre`, `description`, `valeur`, `probabilite`, `source_lead`, `date_fermeture_prevue`, `etape`, `date_creation`, `id_employe`, `id_client`, `updated_at`) VALUES
(1, 'Intégration CRM pour Alpha', NULL, '5000.00', '50.00', NULL, NULL, 'Proposition', '2024-05-01 11:00:00', 3, 1, '2024-05-01 11:00:00'),
(2, 'Phase de découverte Beta', NULL, '10000.00', '50.00', NULL, NULL, 'Qualification', '2024-04-25 16:00:00', 3, 2, '2024-04-25 16:00:00');

--
-- Triggers `opportunite`
--
DROP TRIGGER IF EXISTS `check_probabilite_before_insert`;
DELIMITER $$
CREATE TRIGGER `check_probabilite_before_insert` BEFORE INSERT ON `opportunite` FOR EACH ROW BEGIN
    IF NEW.probabilite < 0 OR NEW.probabilite > 100 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Probabilite must be between 0 and 100';
    END IF;
END
$$
DELIMITER ;
DROP TRIGGER IF EXISTS `check_probabilite_before_update`;
DELIMITER $$
CREATE TRIGGER `check_probabilite_before_update` BEFORE UPDATE ON `opportunite` FOR EACH ROW BEGIN
    IF NEW.probabilite < 0 OR NEW.probabilite > 100 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Probabilite must be between 0 and 100';
    END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Table structure for table `participant`
--

DROP TABLE IF EXISTS `participant`;
CREATE TABLE IF NOT EXISTS `participant` (
  `id_conversation` int(11) NOT NULL,
  `id_personne` int(11) NOT NULL,
  `type_participant` enum('Employe','Client') COLLATE utf8mb4_unicode_ci NOT NULL,
  `date_ajout` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_conversation`,`id_personne`),
  KEY `idx_participant_personne` (`id_personne`),
  KEY `idx_participant_type` (`type_participant`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `participant`
--

INSERT INTO `participant` (`id_conversation`, `id_personne`, `type_participant`, `date_ajout`) VALUES
(1, 3, 'Employe', '2024-05-15 14:50:00'),
(1, 4, 'Employe', '2024-05-15 14:50:00'),
(2, 4, 'Employe', '2024-05-15 11:45:00'),
(2, 6, 'Client', '2024-05-15 11:45:00'),
(3, 2, 'Employe', '2024-05-20 09:00:00'),
(3, 3, 'Employe', '2024-05-20 09:00:00'),
(5, 1, 'Employe', '2025-10-09 09:37:43'),
(5, 2, 'Employe', '2025-10-09 09:37:43'),
(6, 3, 'Employe', '2025-10-09 09:49:32'),
(7, 3, 'Employe', '2025-10-09 10:12:55'),
(8, 1, 'Employe', '2025-10-09 10:15:42'),
(8, 2, 'Employe', '2025-10-09 10:15:42');

-- --------------------------------------------------------

--
-- Table structure for table `personne`
--

DROP TABLE IF EXISTS `personne`;
CREATE TABLE IF NOT EXISTS `personne` (
  `id_personne` int(11) NOT NULL AUTO_INCREMENT,
  `nom` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `prenom` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `titre` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `telephone` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `adresse` text COLLATE utf8mb4_unicode_ci,
  `ville` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `code_postal` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pays` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'France',
  `date_naissance` date DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_personne`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_personne_email` (`email`),
  KEY `idx_personne_titre` (`titre`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `personne`
--

INSERT INTO `personne` (`id_personne`, `nom`, `prenom`, `titre`, `email`, `telephone`, `adresse`, `ville`, `code_postal`, `pays`, `date_naissance`, `created_at`, `updated_at`) VALUES
(1, 'Admin', 'User', NULL, 'admin@phionix.com', '0102030405', NULL, NULL, NULL, 'France', NULL, '2024-01-01 10:00:00', '2025-10-09 14:45:27'),
(2, 'Manager', 'User', NULL, 'manager@phionix.com', '0102030406', NULL, NULL, NULL, 'France', NULL, '2024-01-01 10:00:00', '2025-10-09 14:45:54'),
(3, 'Sales', 'User', NULL, 'sales@phionix.com', '0102030407', NULL, NULL, NULL, 'France', NULL, '2024-01-01 10:00:00', '2025-10-09 14:46:06'),
(4, 'Support', 'User', NULL, 'support@phionix.com', '0102030408', NULL, NULL, NULL, 'France', NULL, '2024-01-01 10:00:00', '2025-10-09 14:46:17'),
(5, 'Alpha', 'Société', NULL, 'client@alpha.com', '0601010101', NULL, NULL, NULL, 'France', NULL, '2024-01-10 10:00:00', '2024-01-10 10:00:00'),
(6, 'Beta', 'Global', NULL, 'client@beta.com', '0602020202', NULL, NULL, NULL, 'France', NULL, '2024-01-11 10:00:00', '2024-01-11 10:00:00');

-- --------------------------------------------------------

--
-- Table structure for table `produit`
--

DROP TABLE IF EXISTS `produit`;
CREATE TABLE IF NOT EXISTS `produit` (
  `id_produit` int(11) NOT NULL AUTO_INCREMENT,
  `nom` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `prix` decimal(10,2) DEFAULT NULL,
  `prix_liste` decimal(10,2) DEFAULT NULL,
  `cout` decimal(10,2) DEFAULT NULL,
  PRIMARY KEY (`id_produit`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `produit`
--

INSERT INTO `produit` (`id_produit`, `nom`, `description`, `prix`, `prix_liste`, `cout`) VALUES
(1, 'Abonnement Premium', 'Accès complet à la plateforme', '99.99', NULL, NULL),
(2, 'Abonnement Standard', 'Accès limité', '49.99', NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `role`
--

DROP TABLE IF EXISTS `role`;
CREATE TABLE IF NOT EXISTS `role` (
  `id_role` int(11) NOT NULL AUTO_INCREMENT,
  `libelle` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id_role`),
  UNIQUE KEY `libelle` (`libelle`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `role`
--

INSERT INTO `role` (`id_role`, `libelle`) VALUES
(1, 'admin'),
(5, 'client'),
(2, 'manager'),
(3, 'sales'),
(4, 'support');

-- --------------------------------------------------------

--
-- Table structure for table `segment`
--

DROP TABLE IF EXISTS `segment`;
CREATE TABLE IF NOT EXISTS `segment` (
  `id_segment` int(11) NOT NULL AUTO_INCREMENT,
  `nom` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `id_createur` int(11) DEFAULT NULL,
  `criteres` json DEFAULT NULL,
  `date_creation` datetime DEFAULT CURRENT_TIMESTAMP,
  `statut` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'Actif',
  PRIMARY KEY (`id_segment`),
  KEY `idx_segment_createur` (`id_createur`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `task`
--

DROP TABLE IF EXISTS `task`;
CREATE TABLE IF NOT EXISTS `task` (
  `id_task` int(11) NOT NULL AUTO_INCREMENT,
  `titre` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `date_creation` datetime DEFAULT CURRENT_TIMESTAMP,
  `date_echeance` datetime DEFAULT NULL,
  `statut` enum('Ouverte','En Cours','Terminée','Annulée','PendingValidation') COLLATE utf8mb4_unicode_ci DEFAULT 'Ouverte',
  `priorite` enum('Basse','Moyenne','Haute') COLLATE utf8mb4_unicode_ci DEFAULT 'Moyenne',
  `id_createur` int(11) NOT NULL,
  `id_assigner_a` int(11) NOT NULL,
  `id_client` int(11) DEFAULT NULL,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_task`),
  KEY `id_client` (`id_client`),
  KEY `idx_task_createur` (`id_createur`),
  KEY `idx_task_assigner` (`id_assigner_a`),
  KEY `idx_task_statut` (`statut`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `task`
--

INSERT INTO `task` (`id_task`, `titre`, `description`, `date_creation`, `date_echeance`, `statut`, `priorite`, `id_createur`, `id_assigner_a`, `id_client`, `updated_at`) VALUES
(1, 'Préparer la proposition pour Alpha', '', '2024-05-10 10:00:00', '2024-05-25 17:00:00', 'En Cours', 'Haute', 2, 3, 1, '2024-05-10 10:00:00'),
(2, 'Planifier la démo avec Beta', '', '2024-05-12 10:00:00', '2024-05-20 17:00:00', 'Ouverte', 'Moyenne', 2, 3, 2, '2024-05-12 10:00:00'),
(3, 'Valider nouvelle stratégie marketing', '', '2024-05-13 10:00:00', '2024-05-30 17:00:00', 'PendingValidation', 'Haute', 2, 1, NULL, '2024-05-13 10:00:00'),
(4, 'Formation interne CRM', '', '2024-05-18 10:00:00', '2024-05-28 17:00:00', 'Ouverte', 'Moyenne', 3, 3, NULL, '2024-05-18 10:00:00'),
(5, 'Rapport de performance mensuel', '', '2024-05-20 10:00:00', '2024-06-05 17:00:00', 'Ouverte', 'Basse', 1, 2, NULL, '2024-05-20 10:00:00'),
(6, 'Organiser le team building', '', '2024-05-21 10:00:00', '2024-06-15 17:00:00', 'En Cours', 'Moyenne', 2, 2, NULL, '2024-05-21 10:00:00');

-- --------------------------------------------------------

--
-- Table structure for table `type_interaction`
--

DROP TABLE IF EXISTS `type_interaction`;
CREATE TABLE IF NOT EXISTS `type_interaction` (
  `id_type` int(11) NOT NULL AUTO_INCREMENT,
  `libelle` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id_type`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `type_interaction`
--

INSERT INTO `type_interaction` (`id_type`, `libelle`, `description`) VALUES
(1, 'Appel', NULL),
(2, 'Email', NULL),
(3, 'Réunion', NULL),
(4, 'Note', NULL);

--
-- Constraints for dumped tables
--

--
-- Constraints for table `client`
--
ALTER TABLE `client`
  ADD CONSTRAINT `client_ibfk_1` FOREIGN KEY (`id_personne`) REFERENCES `personne` (`id_personne`) ON DELETE CASCADE,
  ADD CONSTRAINT `client_ibfk_2` FOREIGN KEY (`id_company`) REFERENCES `companies` (`id_company`) ON DELETE SET NULL;

--
-- Constraints for table `client_segment`
--
ALTER TABLE `client_segment`
  ADD CONSTRAINT `client_segment_ibfk_1` FOREIGN KEY (`id_client`) REFERENCES `client` (`id_client`) ON DELETE CASCADE,
  ADD CONSTRAINT `client_segment_ibfk_2` FOREIGN KEY (`id_segment`) REFERENCES `segment` (`id_segment`) ON DELETE CASCADE;

--
-- Constraints for table `conversation`
--
ALTER TABLE `conversation`
  ADD CONSTRAINT `conversation_ibfk_1` FOREIGN KEY (`id_createur`) REFERENCES `employe` (`id_employe`);

--
-- Constraints for table `employe`
--
ALTER TABLE `employe`
  ADD CONSTRAINT `employe_ibfk_1` FOREIGN KEY (`id_personne`) REFERENCES `personne` (`id_personne`) ON DELETE CASCADE,
  ADD CONSTRAINT `employe_ibfk_2` FOREIGN KEY (`id_role`) REFERENCES `role` (`id_role`);

--
-- Constraints for table `interaction`
--
ALTER TABLE `interaction`
  ADD CONSTRAINT `interaction_ibfk_1` FOREIGN KEY (`id_employe`) REFERENCES `employe` (`id_employe`),
  ADD CONSTRAINT `interaction_ibfk_2` FOREIGN KEY (`id_client`) REFERENCES `client` (`id_client`) ON DELETE CASCADE,
  ADD CONSTRAINT `interaction_ibfk_3` FOREIGN KEY (`id_objectif`) REFERENCES `objectif` (`id_objectif`) ON DELETE SET NULL,
  ADD CONSTRAINT `interaction_ibfk_4` FOREIGN KEY (`id_produit`) REFERENCES `produit` (`id_produit`) ON DELETE SET NULL,
  ADD CONSTRAINT `interaction_ibfk_5` FOREIGN KEY (`id_type`) REFERENCES `type_interaction` (`id_type`);

--
-- Constraints for table `message`
--
ALTER TABLE `message`
  ADD CONSTRAINT `message_ibfk_1` FOREIGN KEY (`id_emetteur`) REFERENCES `personne` (`id_personne`),
  ADD CONSTRAINT `message_ibfk_2` FOREIGN KEY (`id_conversation`) REFERENCES `conversation` (`id_conversation`) ON DELETE CASCADE;

--
-- Constraints for table `message_read`
--
ALTER TABLE `message_read`
  ADD CONSTRAINT `message_read_ibfk_1` FOREIGN KEY (`id_message`) REFERENCES `message` (`id_message`) ON DELETE CASCADE,
  ADD CONSTRAINT `message_read_ibfk_2` FOREIGN KEY (`id_personne`) REFERENCES `personne` (`id_personne`) ON DELETE CASCADE;

--
-- Constraints for table `note`
--
ALTER TABLE `note`
  ADD CONSTRAINT `note_ibfk_1` FOREIGN KEY (`id_interaction`) REFERENCES `interaction` (`id_interaction`) ON DELETE CASCADE;

--
-- Constraints for table `opportunite`
--
ALTER TABLE `opportunite`
  ADD CONSTRAINT `opportunite_ibfk_1` FOREIGN KEY (`id_employe`) REFERENCES `employe` (`id_employe`),
  ADD CONSTRAINT `opportunite_ibfk_2` FOREIGN KEY (`id_client`) REFERENCES `client` (`id_client`) ON DELETE CASCADE;

--
-- Constraints for table `participant`
--
ALTER TABLE `participant`
  ADD CONSTRAINT `participant_ibfk_1` FOREIGN KEY (`id_conversation`) REFERENCES `conversation` (`id_conversation`) ON DELETE CASCADE,
  ADD CONSTRAINT `participant_ibfk_2` FOREIGN KEY (`id_personne`) REFERENCES `personne` (`id_personne`) ON DELETE CASCADE;

--
-- Constraints for table `segment`
--
ALTER TABLE `segment`
  ADD CONSTRAINT `segment_ibfk_1` FOREIGN KEY (`id_createur`) REFERENCES `employe` (`id_employe`) ON DELETE SET NULL;

--
-- Constraints for table `task`
--
ALTER TABLE `task`
  ADD CONSTRAINT `task_ibfk_1` FOREIGN KEY (`id_createur`) REFERENCES `employe` (`id_employe`),
  ADD CONSTRAINT `task_ibfk_2` FOREIGN KEY (`id_assigner_a`) REFERENCES `employe` (`id_employe`),
  ADD CONSTRAINT `task_ibfk_3` FOREIGN KEY (`id_client`) REFERENCES `client` (`id_client`) ON DELETE SET NULL;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

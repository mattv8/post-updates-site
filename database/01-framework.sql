SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

--
-- Database: Uses MYSQL_DATABASE environment variable
--
-- Database creation handled by Docker environment
-- USE database_name;

-- --------------------------------------------------------

--
-- Table structure for table `audit`
--

CREATE TABLE IF NOT EXISTS `audit` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '[PK] ID',
  `timestamp` timestamp NOT NULL DEFAULT current_timestamp() COMMENT 'Time that action occurred',
  `currentUser` text NOT NULL COMMENT 'Username that performed the action',
  `description` text DEFAULT NULL COMMENT 'Human readable description of this action',
  `actionId` text NOT NULL COMMENT 'Traceable name of the AJAX function or request',
  `ipAddress` text DEFAULT NULL COMMENT 'IP address of the user agent',
  `affectedField` text DEFAULT NULL COMMENT 'Applicable database field or key changed by this action (if applicable)',
  `from` text DEFAULT NULL COMMENT 'Previous value (if applicable)',
  `to` text DEFAULT NULL COMMENT 'New value (if applicable)',
  PRIMARY KEY (`id`),
  KEY `id` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `sites`
--

CREATE TABLE IF NOT EXISTS `sites` (
  `SiteId` int(11) NOT NULL AUTO_INCREMENT COMMENT '[PK] Site ID Reference',
  `SiteName` varchar(64) NOT NULL COMMENT '[IDX] Site Name',
  PRIMARY KEY (`SiteId`),
  KEY `SiteName` (`SiteName`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE IF NOT EXISTS `users` (
  `username` varchar(32) NOT NULL,
  `password` varchar(500) NOT NULL,
  `first` varchar(32) NOT NULL,
  `last` varchar(32) NOT NULL,
  `isadmin` tinyint(1) NOT NULL,
  `active` tinyint(1) NOT NULL,
  `siteMemberships` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NULL DEFAULT NULL,
  `email` varchar(32) NOT NULL,
  PRIMARY KEY (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COLLATE=utf8mb3_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`username`, `password`, `first`, `last`, `isadmin`, `active`, `siteMemberships`, `email`) VALUES
('admin', '$2y$10$7r0PbAyV26hG73/abtso0uoBmVvs59OfEnmmAI58ShlrAaWejyuMe', 'Matt', 'Visnovsky', 1, 1, '[]', 'matt@visnovsky.us');
COMMIT;
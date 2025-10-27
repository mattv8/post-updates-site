-- Migration tracking system
-- This table keeps track of which database migrations have been applied
-- Must be run before any other migrations

CREATE TABLE IF NOT EXISTS `migrations` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '[PK] Migration ID',
  `filename` varchar(255) NOT NULL COMMENT 'Name of the migration file',
  `checksum` varchar(64) NOT NULL COMMENT 'SHA256 hash of the migration file content',
  `applied_at` timestamp DEFAULT CURRENT_TIMESTAMP COMMENT 'When the migration was applied',
  `applied_by` varchar(100) DEFAULT 'CI/CD' COMMENT 'Who/what applied the migration',
  PRIMARY KEY (`id`),
  UNIQUE KEY `filename` (`filename`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tracks applied database migrations';

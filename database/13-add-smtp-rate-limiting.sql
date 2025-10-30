-- Migration: Add SMTP rate limiting settings
-- Description: Adds configurable SMTP rate limiting to prevent overloading mail relays
-- Date: 2025-10-30

-- --------------------------------------------------------
-- Add smtp_rate_limit column to settings
-- --------------------------------------------------------

SET @columnExists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'settings'
    AND COLUMN_NAME = 'smtp_rate_limit'
);

SET @sql = IF(
    @columnExists = 0,
    'ALTER TABLE `settings` ADD COLUMN `smtp_rate_limit` INT DEFAULT 20 COMMENT ''Maximum emails to send per period (0 = unlimited)'' AFTER `email_include_post_body`',
    'SELECT "Column smtp_rate_limit already exists" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- --------------------------------------------------------
-- Add smtp_rate_period column to settings
-- --------------------------------------------------------

SET @columnExists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'settings'
    AND COLUMN_NAME = 'smtp_rate_period'
);

SET @sql = IF(
    @columnExists = 0,
    'ALTER TABLE `settings` ADD COLUMN `smtp_rate_period` INT DEFAULT 60 COMMENT ''Time period in seconds for rate limit'' AFTER `smtp_rate_limit`',
    'SELECT "Column smtp_rate_period already exists" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- --------------------------------------------------------
-- Add smtp_batch_delay column to settings
-- --------------------------------------------------------

SET @columnExists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'settings'
    AND COLUMN_NAME = 'smtp_batch_delay'
);

SET @sql = IF(
    @columnExists = 0,
    'ALTER TABLE `settings` ADD COLUMN `smtp_batch_delay` DECIMAL(4,2) DEFAULT 0.5 COMMENT ''Delay in seconds between individual emails'' AFTER `smtp_rate_period`',
    'SELECT "Column smtp_batch_delay already exists" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- --------------------------------------------------------
-- Set default values for existing settings row
-- --------------------------------------------------------

UPDATE `settings`
SET
  `smtp_rate_limit` = 20,
  `smtp_rate_period` = 60,
  `smtp_batch_delay` = 0.5
WHERE `id` = 1
  AND (`smtp_rate_limit` IS NULL OR `smtp_rate_period` IS NULL OR `smtp_batch_delay` IS NULL);

-- Migration complete

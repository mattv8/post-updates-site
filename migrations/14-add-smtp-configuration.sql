-- Migration: Add SMTP Configuration Settings
-- Description: Adds configurable SMTP settings to allow database-level configuration
-- Author: System
-- Date: 2025-11-01

-- =============================================================================
-- Add smtp_host column to settings
-- =============================================================================

-- Check if smtp_host column exists
SELECT COUNT(*) INTO @column_exists
FROM information_schema.COLUMNS
WHERE
    TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'settings'
    AND COLUMN_NAME = 'smtp_host';

-- Add smtp_host column if it doesn't exist
SET @query := IF(
    @column_exists = 0,
    'ALTER TABLE `settings` ADD COLUMN `smtp_host` VARCHAR(255) DEFAULT NULL COMMENT ''SMTP server hostname or IP address'' AFTER `smtp_batch_delay`',
    'SELECT "Column smtp_host already exists" AS message'
);

PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;


-- =============================================================================
-- Add smtp_port column to settings
-- =============================================================================

-- Check if smtp_port column exists
SELECT COUNT(*) INTO @column_exists
FROM information_schema.COLUMNS
WHERE
    TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'settings'
    AND COLUMN_NAME = 'smtp_port';

-- Add smtp_port column if it doesn't exist
SET @query := IF(
    @column_exists = 0,
    'ALTER TABLE `settings` ADD COLUMN `smtp_port` INT DEFAULT NULL COMMENT ''SMTP server port (25, 587, 465)'' AFTER `smtp_host`',
    'SELECT "Column smtp_port already exists" AS message'
);

PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;


-- =============================================================================
-- Add smtp_secure column to settings
-- =============================================================================

-- Check if smtp_secure column exists
SELECT COUNT(*) INTO @column_exists
FROM information_schema.COLUMNS
WHERE
    TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'settings'
    AND COLUMN_NAME = 'smtp_secure';

-- Add smtp_secure column if it doesn't exist
SET @query := IF(
    @column_exists = 0,
    'ALTER TABLE `settings` ADD COLUMN `smtp_secure` VARCHAR(10) DEFAULT NULL COMMENT ''SMTP encryption: empty string, tls, or ssl'' AFTER `smtp_port`',
    'SELECT "Column smtp_secure already exists" AS message'
);

PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;


-- =============================================================================
-- Add smtp_auth column to settings
-- =============================================================================

-- Check if smtp_auth column exists
SELECT COUNT(*) INTO @column_exists
FROM information_schema.COLUMNS
WHERE
    TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'settings'
    AND COLUMN_NAME = 'smtp_auth';

-- Add smtp_auth column if it doesn't exist
SET @query := IF(
    @column_exists = 0,
    'ALTER TABLE `settings` ADD COLUMN `smtp_auth` TINYINT(1) DEFAULT NULL COMMENT ''Enable SMTP authentication (1 = yes, 0 = no)'' AFTER `smtp_secure`',
    'SELECT "Column smtp_auth already exists" AS message'
);

PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;


-- =============================================================================
-- Add smtp_username column to settings
-- =============================================================================

-- Check if smtp_username column exists
SELECT COUNT(*) INTO @column_exists
FROM information_schema.COLUMNS
WHERE
    TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'settings'
    AND COLUMN_NAME = 'smtp_username';

-- Add smtp_username column if it doesn't exist
SET @query := IF(
    @column_exists = 0,
    'ALTER TABLE `settings` ADD COLUMN `smtp_username` VARCHAR(255) DEFAULT NULL COMMENT ''SMTP authentication username'' AFTER `smtp_auth`',
    'SELECT "Column smtp_username already exists" AS message'
);

PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;


-- =============================================================================
-- Add smtp_password column to settings
-- =============================================================================

-- Check if smtp_password column exists
SELECT COUNT(*) INTO @column_exists
FROM information_schema.COLUMNS
WHERE
    TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'settings'
    AND COLUMN_NAME = 'smtp_password';

-- Add smtp_password column if it doesn't exist
SET @query := IF(
    @column_exists = 0,
    'ALTER TABLE `settings` ADD COLUMN `smtp_password` VARCHAR(255) DEFAULT NULL COMMENT ''SMTP authentication password (stored encrypted)'' AFTER `smtp_username`',
    'SELECT "Column smtp_password already exists" AS message'
);

PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;


-- =============================================================================
-- Add smtp_from_email column to settings
-- =============================================================================

-- Check if smtp_from_email column exists
SELECT COUNT(*) INTO @column_exists
FROM information_schema.COLUMNS
WHERE
    TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'settings'
    AND COLUMN_NAME = 'smtp_from_email';

-- Add smtp_from_email column if it doesn't exist
SET @query := IF(
    @column_exists = 0,
    'ALTER TABLE `settings` ADD COLUMN `smtp_from_email` VARCHAR(255) DEFAULT NULL COMMENT ''From email address for outgoing emails'' AFTER `smtp_password`',
    'SELECT "Column smtp_from_email already exists" AS message'
);

PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;


-- =============================================================================
-- Add smtp_from_name column to settings
-- =============================================================================

-- Check if smtp_from_name column exists
SELECT COUNT(*) INTO @column_exists
FROM information_schema.COLUMNS
WHERE
    TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'settings'
    AND COLUMN_NAME = 'smtp_from_name';

-- Add smtp_from_name column if it doesn't exist
SET @query := IF(
    @column_exists = 0,
    'ALTER TABLE `settings` ADD COLUMN `smtp_from_name` VARCHAR(255) DEFAULT NULL COMMENT ''From name for outgoing emails'' AFTER `smtp_from_email`',
    'SELECT "Column smtp_from_name already exists" AS message'
);

PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;


-- =============================================================================
-- Migration complete
-- =============================================================================

SELECT 'Migration 14: Add SMTP Configuration Settings - completed successfully' AS status;

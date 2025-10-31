-- Migration: Add visibility toggles for Hero Banner, About, and Donation sections
-- Date: 2025-10-27
-- Description: Adds boolean flags to control visibility of main site sections

-- Add visibility toggle columns (idempotent - only add if they don't exist)
SET @dbname = DATABASE();

-- Add show_hero column if it doesn't exist
SET @col_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
    AND TABLE_NAME = 'settings'
    AND COLUMN_NAME = 'show_hero'
);

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE `settings` ADD COLUMN `show_hero` TINYINT(1) DEFAULT 1 COMMENT ''Show/hide hero banner section'' AFTER `hero_overlay_color`',
    'SELECT "Column show_hero already exists" AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add show_about column if it doesn't exist
SET @col_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
    AND TABLE_NAME = 'settings'
    AND COLUMN_NAME = 'show_about'
);

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE `settings` ADD COLUMN `show_about` TINYINT(1) DEFAULT 1 COMMENT ''Show/hide about section in sidebar'' AFTER `show_hero`',
    'SELECT "Column show_about already exists" AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add show_donation column if it doesn't exist
SET @col_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
    AND TABLE_NAME = 'settings'
    AND COLUMN_NAME = 'show_donation'
);

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE `settings` ADD COLUMN `show_donation` TINYINT(1) DEFAULT 1 COMMENT ''Show/hide donation section in sidebar'' AFTER `show_about`',
    'SELECT "Column show_donation already exists" AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Update the existing row to have all sections visible by default
UPDATE `settings` SET
  `show_hero` = 1,
  `show_about` = 1,
  `show_donation` = 1
WHERE `id` = 1;

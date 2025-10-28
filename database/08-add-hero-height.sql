-- Migration: Add hero_height field to settings table
-- Date: 2025-10-27
-- Description: Adds hero_height column to control the height of the hero section

-- Add hero_height column if it doesn't exist (idempotent)
SET @dbname = DATABASE();

SET @col_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
    AND TABLE_NAME = 'settings'
    AND COLUMN_NAME = 'hero_height'
);

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE `settings` ADD COLUMN `hero_height` INT(11) DEFAULT 400 COMMENT ''Hero section height in pixels'' AFTER `hero_overlay_color`',
    'SELECT "Column hero_height already exists" AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Set default value for existing row
UPDATE `settings` SET `hero_height` = 400 WHERE `id` = 1 AND `hero_height` IS NULL;

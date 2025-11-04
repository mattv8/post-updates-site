-- Migration: Add branding settings (logo and favicon)
-- Adds logo_media_id and favicon_media_id fields to settings table

-- Check if logo_media_id column exists
SET @column_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'settings'
    AND COLUMN_NAME = 'logo_media_id'
);

-- Add logo_media_id if it doesn't exist
SET @sql = IF(
  @column_exists = 0,
  'ALTER TABLE `settings` ADD COLUMN `logo_media_id` INT(11) DEFAULT NULL COMMENT ''FK to media table for site logo'' AFTER `site_title`',
  'SELECT ''Column logo_media_id already exists'' AS notice'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add foreign key constraint for logo_media_id if column was just added
SET @fk_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'settings'
    AND CONSTRAINT_NAME = 'fk_settings_logo_media'
);

SET @sql = IF(
  @column_exists = 0 AND @fk_exists = 0,
  'ALTER TABLE `settings` ADD CONSTRAINT `fk_settings_logo_media` FOREIGN KEY (`logo_media_id`) REFERENCES `media` (`id`) ON DELETE SET NULL',
  'SELECT ''Foreign key fk_settings_logo_media already exists or column did not exist'' AS notice'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check if favicon_media_id column exists
SET @column_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'settings'
    AND COLUMN_NAME = 'favicon_media_id'
);

-- Add favicon_media_id if it doesn't exist
SET @sql = IF(
  @column_exists = 0,
  'ALTER TABLE `settings` ADD COLUMN `favicon_media_id` INT(11) DEFAULT NULL COMMENT ''FK to media table for site favicon'' AFTER `logo_media_id`',
  'SELECT ''Column favicon_media_id already exists'' AS notice'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add foreign key constraint for favicon_media_id if column was just added
SET @fk_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'settings'
    AND CONSTRAINT_NAME = 'fk_settings_favicon_media'
);

SET @sql = IF(
  @column_exists = 0 AND @fk_exists = 0,
  'ALTER TABLE `settings` ADD CONSTRAINT `fk_settings_favicon_media` FOREIGN KEY (`favicon_media_id`) REFERENCES `media` (`id`) ON DELETE SET NULL',
  'SELECT ''Foreign key fk_settings_favicon_media already exists or column did not exist'' AS notice'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check if show_logo column exists
SET @column_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'settings'
    AND COLUMN_NAME = 'show_logo'
);

-- Add show_logo if it doesn't exist
SET @sql = IF(
  @column_exists = 0,
  'ALTER TABLE `settings` ADD COLUMN `show_logo` TINYINT(1) DEFAULT 1 COMMENT ''Toggle to show/hide logo site-wide'' AFTER `favicon_media_id`',
  'SELECT ''Column show_logo already exists'' AS notice'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

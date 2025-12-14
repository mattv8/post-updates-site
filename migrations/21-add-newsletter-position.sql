-- Migration: Add newsletter position setting
-- Description: Adds newsletter_position and newsletter_position_scope columns to control where newsletter signup displays
-- Date: 2025-12-14

-- --------------------------------------------------------
-- Add newsletter_position column to settings
-- --------------------------------------------------------

SET @columnExists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'settings'
    AND COLUMN_NAME = 'newsletter_position'
);

SET @sql = IF(
    @columnExists = 0,
    'ALTER TABLE `settings` ADD COLUMN `newsletter_position` ENUM(''sidebar'', ''above_timeline'') DEFAULT ''sidebar'' COMMENT ''Position of newsletter signup: sidebar (default) or above_timeline'' AFTER `show_mailing_list`',
    'SELECT "Column newsletter_position already exists" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- --------------------------------------------------------
-- Add newsletter_position_scope column to settings
-- --------------------------------------------------------

SET @columnExists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'settings'
    AND COLUMN_NAME = 'newsletter_position_scope'
);

SET @sql = IF(
    @columnExists = 0,
    'ALTER TABLE `settings` ADD COLUMN `newsletter_position_scope` ENUM(''mobile_only'', ''all_devices'') DEFAULT ''mobile_only'' COMMENT ''Scope for newsletter position: mobile_only (default) or all_devices'' AFTER `newsletter_position`',
    'SELECT "Column newsletter_position_scope already exists" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

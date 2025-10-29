-- Migration: Add footer settings to settings table
-- Date: 2025-10-29
-- Description: Adds footer content fields with toggle for 1 or 2 column layout, background image with overlay
-- Idempotent: Safe to run multiple times

-- Add footer settings columns to settings table (only if they don't exist)
SET @dbname = DATABASE();

-- Check and add show_footer
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'settings' AND COLUMN_NAME = 'show_footer');
SET @query = IF(@col_exists = 0,
  'ALTER TABLE `settings` ADD COLUMN `show_footer` tinyint(1) DEFAULT 1 COMMENT \'Show/hide footer section\' AFTER `show_donation`',
  'SELECT "Column show_footer already exists" AS msg');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add footer_layout
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'settings' AND COLUMN_NAME = 'footer_layout');
SET @query = IF(@col_exists = 0,
  'ALTER TABLE `settings` ADD COLUMN `footer_layout` enum(\'single\',\'double\') DEFAULT \'double\' COMMENT \'Footer layout: single or double column\' AFTER `show_footer`',
  'SELECT "Column footer_layout already exists" AS msg');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add footer_media_id
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'settings' AND COLUMN_NAME = 'footer_media_id');
SET @query = IF(@col_exists = 0,
  'ALTER TABLE `settings` ADD COLUMN `footer_media_id` int(11) DEFAULT NULL COMMENT \'FK to media table for footer background image\' AFTER `footer_layout`',
  'SELECT "Column footer_media_id already exists" AS msg');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add footer_height
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'settings' AND COLUMN_NAME = 'footer_height');
SET @query = IF(@col_exists = 0,
  'ALTER TABLE `settings` ADD COLUMN `footer_height` int(11) DEFAULT 30 COMMENT \'Footer height as percentage of width (aspect ratio)\' AFTER `footer_media_id`',
  'SELECT "Column footer_height already exists" AS msg');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add footer_overlay_opacity
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'settings' AND COLUMN_NAME = 'footer_overlay_opacity');
SET @query = IF(@col_exists = 0,
  'ALTER TABLE `settings` ADD COLUMN `footer_overlay_opacity` decimal(3,2) DEFAULT 0.50 COMMENT \'Footer overlay opacity (0.00-1.00)\' AFTER `footer_height`',
  'SELECT "Column footer_overlay_opacity already exists" AS msg');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add footer_overlay_color
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'settings' AND COLUMN_NAME = 'footer_overlay_color');
SET @query = IF(@col_exists = 0,
  'ALTER TABLE `settings` ADD COLUMN `footer_overlay_color` varchar(7) DEFAULT \'#000000\' COMMENT \'Footer overlay color (hex)\' AFTER `footer_overlay_opacity`',
  'SELECT "Column footer_overlay_color already exists" AS msg');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add footer_column1_html
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'settings' AND COLUMN_NAME = 'footer_column1_html');
SET @query = IF(@col_exists = 0,
  'ALTER TABLE `settings` ADD COLUMN `footer_column1_html` longtext COMMENT \'Footer column 1 HTML content\' AFTER `footer_overlay_color`',
  'SELECT "Column footer_column1_html already exists" AS msg');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add footer_column2_html
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'settings' AND COLUMN_NAME = 'footer_column2_html');
SET @query = IF(@col_exists = 0,
  'ALTER TABLE `settings` ADD COLUMN `footer_column2_html` longtext COMMENT \'Footer column 2 HTML content (only shown in double layout)\' AFTER `footer_column1_html`',
  'SELECT "Column footer_column2_html already exists" AS msg');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add foreign key constraint for footer media (only if it doesn't exist)
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = @dbname AND TABLE_NAME = 'settings' AND CONSTRAINT_NAME = 'fk_settings_footer_media');
SET @query = IF(@fk_exists = 0,
  'ALTER TABLE `settings` ADD CONSTRAINT `fk_settings_footer_media` FOREIGN KEY (`footer_media_id`) REFERENCES `media` (`id`) ON DELETE SET NULL',
  'SELECT "Foreign key fk_settings_footer_media already exists" AS msg');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Update existing settings row with default footer content (only if columns are empty)
UPDATE `settings`
SET
  `show_footer` = COALESCE(`show_footer`, 1),
  `footer_layout` = COALESCE(`footer_layout`, 'double'),
  `footer_height` = COALESCE(`footer_height`, 30),
  `footer_overlay_opacity` = COALESCE(`footer_overlay_opacity`, 0.50),
  `footer_overlay_color` = COALESCE(`footer_overlay_color`, '#000000'),
  `footer_column1_html` = COALESCE(`footer_column1_html`, '<h3>Contact</h3><p>Stay connected with us.</p>'),
  `footer_column2_html` = COALESCE(`footer_column2_html`, '<h3>Links</h3><p>Additional resources and information.</p>')
WHERE `id` = 1;

COMMIT;

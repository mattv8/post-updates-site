-- Migration: Add flexible donation methods configuration
-- Date: 2025-10-29
-- Description: Replaces Stripe-specific donation_settings_json with flexible donation method fields
-- Idempotent: Safe to run multiple times

-- Add donation configuration columns to settings table
SET @dbname = DATABASE();

-- Check and add donation_method
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'settings' AND COLUMN_NAME = 'donation_method');
SET @query = IF(@col_exists = 0,
  'ALTER TABLE `settings` ADD COLUMN `donation_method` enum(\'link\',\'qr\',\'both\') DEFAULT \'link\' COMMENT \'How to display donation info: link, QR code, or both\' AFTER `donate_text_html`',
  'SELECT "Column donation_method already exists" AS msg');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add donation_link
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'settings' AND COLUMN_NAME = 'donation_link');
SET @query = IF(@col_exists = 0,
  'ALTER TABLE `settings` ADD COLUMN `donation_link` varchar(500) DEFAULT NULL COMMENT \'Donation link (Venmo, PayPal, Ko-fi, etc.)\' AFTER `donation_method`',
  'SELECT "Column donation_link already exists" AS msg');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add donation_qr_media_id
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'settings' AND COLUMN_NAME = 'donation_qr_media_id');
SET @query = IF(@col_exists = 0,
  'ALTER TABLE `settings` ADD COLUMN `donation_qr_media_id` int(11) DEFAULT NULL COMMENT \'FK to media table for donation QR code image\' AFTER `donation_link`',
  'SELECT "Column donation_qr_media_id already exists" AS msg');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add donation_instructions_html
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'settings' AND COLUMN_NAME = 'donation_instructions_html');
SET @query = IF(@col_exists = 0,
  'ALTER TABLE `settings` ADD COLUMN `donation_instructions_html` longtext DEFAULT NULL COMMENT \'Instructions shown in donation modal\' AFTER `donation_qr_media_id`',
  'SELECT "Column donation_instructions_html already exists" AS msg');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add foreign key constraint for donation QR media (only if it doesn't exist)
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = @dbname AND TABLE_NAME = 'settings' AND CONSTRAINT_NAME = 'fk_settings_donation_qr_media');
SET @query = IF(@fk_exists = 0,
  'ALTER TABLE `settings` ADD CONSTRAINT `fk_settings_donation_qr_media` FOREIGN KEY (`donation_qr_media_id`) REFERENCES `media` (`id`) ON DELETE SET NULL',
  'SELECT "Foreign key fk_settings_donation_qr_media already exists" AS msg');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Update existing settings row with default values
UPDATE `settings`
SET
  `donation_method` = COALESCE(`donation_method`, 'link'),
  `donation_instructions_html` = COALESCE(`donation_instructions_html`, '<p>Thank you for your support!</p>')
WHERE `id` = 1;

COMMIT;

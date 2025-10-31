-- Migration: Add mailing list / newsletter functionality
-- Description: Adds newsletter_subscribers table and mailing list section settings
-- Date: 2025-10-29

-- --------------------------------------------------------
-- Create newsletter_subscribers table
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS `newsletter_subscribers` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL COMMENT 'Subscriber email address',
  `subscribed_at` timestamp NOT NULL DEFAULT current_timestamp() COMMENT 'Timestamp when user subscribed',
  `ip_address` varchar(45) DEFAULT NULL COMMENT 'IP address at time of subscription',
  `is_active` tinyint(1) DEFAULT 1 COMMENT 'Whether subscription is active (1) or archived (0)',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `is_active` (`is_active`),
  KEY `subscribed_at` (`subscribed_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Newsletter/mailing list subscribers';

-- --------------------------------------------------------
-- Add show_mailing_list column to settings
-- --------------------------------------------------------

SET @columnExists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'settings'
    AND COLUMN_NAME = 'show_mailing_list'
);

SET @sql = IF(
    @columnExists = 0,
    'ALTER TABLE `settings` ADD COLUMN `show_mailing_list` TINYINT(1) DEFAULT 1 COMMENT ''Show/hide mailing list section in sidebar'' AFTER `show_donation`',
    'SELECT "Column show_mailing_list already exists" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- --------------------------------------------------------
-- Add mailing_list_html column to settings
-- --------------------------------------------------------

SET @columnExists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'settings'
    AND COLUMN_NAME = 'mailing_list_html'
);

SET @sql = IF(
    @columnExists = 0,
    'ALTER TABLE `settings` ADD COLUMN `mailing_list_html` LONGTEXT DEFAULT NULL COMMENT ''Mailing list section HTML content'' AFTER `donate_text_html`',
    'SELECT "Column mailing_list_html already exists" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- --------------------------------------------------------
-- Add mailing_list_html_draft column to settings
-- --------------------------------------------------------

SET @columnExists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'settings'
    AND COLUMN_NAME = 'mailing_list_html_draft'
);

SET @sql = IF(
    @columnExists = 0,
    'ALTER TABLE `settings` ADD COLUMN `mailing_list_html_draft` LONGTEXT DEFAULT NULL COMMENT ''Mailing list section HTML content (draft)'' AFTER `mailing_list_html`',
    'SELECT "Column mailing_list_html_draft already exists" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- --------------------------------------------------------
-- Add mailing_list_html_editing column to settings
-- --------------------------------------------------------

SET @columnExists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'settings'
    AND COLUMN_NAME = 'mailing_list_html_editing'
);

SET @sql = IF(
    @columnExists = 0,
    'ALTER TABLE `settings` ADD COLUMN `mailing_list_html_editing` LONGTEXT GENERATED ALWAYS AS (COALESCE(`mailing_list_html_draft`, `mailing_list_html`)) VIRTUAL COMMENT ''Computed column for editing: draft or published'' AFTER `mailing_list_html_draft`',
    'SELECT "Column mailing_list_html_editing already exists" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- --------------------------------------------------------
-- Add notify_subscribers_on_post column to settings
-- --------------------------------------------------------

SET @columnExists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'settings'
    AND COLUMN_NAME = 'notify_subscribers_on_post'
);

SET @sql = IF(
    @columnExists = 0,
    'ALTER TABLE `settings` ADD COLUMN `notify_subscribers_on_post` TINYINT(1) DEFAULT 1 COMMENT ''Send email notification to subscribers when new post is published'' AFTER `show_mailing_list`',
    'SELECT "Column notify_subscribers_on_post already exists" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- --------------------------------------------------------
-- Add email_include_post_body column to settings
-- --------------------------------------------------------

SET @columnExists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'settings'
    AND COLUMN_NAME = 'email_include_post_body'
);

SET @sql = IF(
    @columnExists = 0,
    'ALTER TABLE `settings` ADD COLUMN `email_include_post_body` TINYINT(1) DEFAULT 0 COMMENT ''Include formatted post body in notification emails (1) or just link (0)'' AFTER `notify_subscribers_on_post`',
    'SELECT "Column email_include_post_body already exists" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- --------------------------------------------------------
-- Set default values for existing settings row
-- --------------------------------------------------------

UPDATE `settings`
SET
  `show_mailing_list` = 1,
  `mailing_list_html` = '<p>Subscribe to get notified when we post updates.</p>',
  `notify_subscribers_on_post` = 1,
  `email_include_post_body` = 0
WHERE `id` = 1
  AND (`show_mailing_list` IS NULL OR `mailing_list_html` IS NULL OR `mailing_list_html` = '' OR `notify_subscribers_on_post` IS NULL OR `email_include_post_body` IS NULL);

-- Migration complete
SELECT 'Migration 12 completed successfully' AS status;

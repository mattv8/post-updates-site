START TRANSACTION;

-- Add verification token column if missing
SET @columnExists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'newsletter_subscribers' AND COLUMN_NAME = 'verification_token'
);

SET @sql := IF(
  @columnExists = 0,
  'ALTER TABLE `newsletter_subscribers` ADD COLUMN `verification_token` VARCHAR(255) NULL DEFAULT NULL COMMENT ''Token used for double opt-in'' AFTER `email`',
  'SELECT "Column verification_token already exists" AS message'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add verified_at column if missing
SET @columnExists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'newsletter_subscribers' AND COLUMN_NAME = 'verified_at'
);

SET @sql := IF(
  @columnExists = 0,
  'ALTER TABLE `newsletter_subscribers` ADD COLUMN `verified_at` DATETIME NULL DEFAULT NULL COMMENT ''Timestamp when subscriber verified'' AFTER `subscribed_at`',
  'SELECT "Column verified_at already exists" AS message'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add unsubscribed_at column if missing
SET @columnExists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'newsletter_subscribers' AND COLUMN_NAME = 'unsubscribed_at'
);

SET @sql := IF(
  @columnExists = 0,
  'ALTER TABLE `newsletter_subscribers` ADD COLUMN `unsubscribed_at` DATETIME NULL DEFAULT NULL COMMENT ''Timestamp when subscriber opted out'' AFTER `verified_at`',
  'SELECT "Column unsubscribed_at already exists" AS message'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Ensure is_active has an index for faster filtering
SET @indexExists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'newsletter_subscribers' AND INDEX_NAME = 'idx_is_active'
);

SET @sql := IF(
  @indexExists = 0,
  'CREATE INDEX `idx_is_active` ON `newsletter_subscribers` (`is_active`)',
  'SELECT "Index idx_is_active already exists" AS message'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

COMMIT;

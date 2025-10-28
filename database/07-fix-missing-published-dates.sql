-- Migration: Fix missing published_at dates for published posts
-- Issue: Some published posts have NULL published_at, causing dates to not display
-- Fix: Set published_at to created_at for published posts where published_at is NULL
--
-- Compatible with: MySQL 5.7+, MariaDB 10.6+

-- Update published posts that don't have a published_at timestamp
-- Use created_at as a fallback since that's when the post was created
UPDATE `posts`
SET `published_at` = `created_at`
WHERE `status` = 'published'
  AND `published_at` IS NULL
  AND `deleted_at` IS NULL;

-- Record migration in tracker
-- Handles both migration_tracker and migrations table names
SET @stmt = (SELECT IF(
  (SELECT COUNT(*) FROM information_schema.TABLES
   WHERE TABLE_SCHEMA = DATABASE()
   AND TABLE_NAME = 'migration_tracker') > 0,
  "INSERT INTO migration_tracker (migration_file, description) VALUES ('07-fix-missing-published-dates.sql', 'Fix missing published_at dates for published posts') ON DUPLICATE KEY UPDATE applied_at = CURRENT_TIMESTAMP",
  (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'migrations') > 0,
    "INSERT INTO migrations (filename, checksum, applied_by) VALUES ('07-fix-missing-published-dates.sql', SHA2('07-fix-missing-published-dates', 256), 'manual') ON DUPLICATE KEY UPDATE applied_at = CURRENT_TIMESTAMP",
    "SELECT 'No migration tracker table found' AS warning"
  ))
));
PREPARE stmt FROM @stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

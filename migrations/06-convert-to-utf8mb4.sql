-- Migration: Convert all tables to utf8mb4 to support emojis and full Unicode
-- Issue: Production failing with "Incorrect string value: '\\xF0\\x9F\\x91\\x8B'" when inserting emojis
-- Fix: Convert tables and columns from utf8mb3/utf8 to utf8mb4
--
-- Compatible with: MySQL 5.7+, MariaDB 10.6+
-- NOTE: Safe to run multiple times - MySQL/MariaDB will only convert if needed

-- --------------------------------------------------------
-- Step 1: Drop all foreign key constraints
-- MariaDB requires this before charset conversion on referenced tables
-- --------------------------------------------------------

-- Drop foreign keys from posts table
SET @drop1 = (SELECT IF(
  (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
   WHERE CONSTRAINT_SCHEMA = DATABASE()
   AND TABLE_NAME = 'posts' AND CONSTRAINT_NAME = 'fk_posts_hero_media') > 0,
  'ALTER TABLE posts DROP FOREIGN KEY fk_posts_hero_media',
  'SELECT "FK fk_posts_hero_media does not exist"'
));
PREPARE stmt1 FROM @drop1; EXECUTE stmt1; DEALLOCATE PREPARE stmt1;

SET @drop2 = (SELECT IF(
  (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
   WHERE CONSTRAINT_SCHEMA = DATABASE()
   AND TABLE_NAME = 'posts' AND CONSTRAINT_NAME = 'fk_posts_created_by') > 0,
  'ALTER TABLE posts DROP FOREIGN KEY fk_posts_created_by',
  'SELECT "FK fk_posts_created_by does not exist"'
));
PREPARE stmt2 FROM @drop2; EXECUTE stmt2; DEALLOCATE PREPARE stmt2;

-- Drop foreign keys from settings table
SET @drop3 = (SELECT IF(
  (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
   WHERE CONSTRAINT_SCHEMA = DATABASE()
   AND TABLE_NAME = 'settings' AND CONSTRAINT_NAME = 'fk_settings_hero_media') > 0,
  'ALTER TABLE settings DROP FOREIGN KEY fk_settings_hero_media',
  'SELECT "FK fk_settings_hero_media does not exist"'
));
PREPARE stmt3 FROM @drop3; EXECUTE stmt3; DEALLOCATE PREPARE stmt3;

-- Drop foreign keys from media table
SET @drop4 = (SELECT IF(
  (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
   WHERE CONSTRAINT_SCHEMA = DATABASE()
   AND TABLE_NAME = 'media' AND CONSTRAINT_NAME = 'fk_media_created_by') > 0,
  'ALTER TABLE media DROP FOREIGN KEY fk_media_created_by',
  'SELECT "FK fk_media_created_by does not exist"'
));
PREPARE stmt4 FROM @drop4; EXECUTE stmt4; DEALLOCATE PREPARE stmt4;

-- --------------------------------------------------------
-- Step 2: Convert all tables to utf8mb4
-- --------------------------------------------------------

-- users table (framework - contains usernames referenced by FK)
ALTER TABLE `users`
  CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- media table (referenced by posts and settings via FK)
ALTER TABLE `media`
  CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- posts table (CRITICAL - contains user content with emojis)
ALTER TABLE `posts`
  CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- settings table (contains site configuration)
ALTER TABLE `settings`
  CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Step 3: Recreate foreign key constraints
-- --------------------------------------------------------

-- Posts foreign keys
ALTER TABLE `posts`
  ADD CONSTRAINT `fk_posts_hero_media`
    FOREIGN KEY (`hero_media_id`) REFERENCES `media` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_posts_created_by`
    FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`username`) ON DELETE RESTRICT;

-- Settings foreign keys
ALTER TABLE `settings`
  ADD CONSTRAINT `fk_settings_hero_media`
    FOREIGN KEY (`hero_media_id`) REFERENCES `media` (`id`) ON DELETE SET NULL;

-- Media foreign keys
ALTER TABLE `media`
  ADD CONSTRAINT `fk_media_created_by`
    FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`username`) ON DELETE RESTRICT;

-- --------------------------------------------------------
-- Record migration in tracker
-- Handles both migration_tracker and migrations table names
-- --------------------------------------------------------
SET @stmt = (SELECT IF(
  (SELECT COUNT(*) FROM information_schema.TABLES
   WHERE TABLE_SCHEMA = DATABASE()
   AND TABLE_NAME = 'migration_tracker') > 0,
  "INSERT INTO migration_tracker (migration_file, description) VALUES ('06-convert-to-utf8mb4.sql', 'Convert all tables to utf8mb4 to support emojis and full Unicode') ON DUPLICATE KEY UPDATE applied_at = CURRENT_TIMESTAMP",
  (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'migrations') > 0,
    "INSERT INTO migrations (filename, checksum, applied_by) VALUES ('06-convert-to-utf8mb4.sql', SHA2('06-convert-to-utf8mb4', 256), 'manual') ON DUPLICATE KEY UPDATE applied_at = CURRENT_TIMESTAMP",
    "SELECT 'No migration tracker table found' AS warning"
  ))
));
PREPARE stmt FROM @stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

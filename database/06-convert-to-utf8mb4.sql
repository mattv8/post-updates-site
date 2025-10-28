-- Migration: Convert all tables to utf8mb4 to support emojis and full Unicode
-- Issue: Production failing with "Incorrect string value: '\\xF0\\x9F\\x91\\x8B'" when inserting emojis
-- Fix: Convert tables and columns from utf8mb3/utf8 to utf8mb4
--
-- Compatible with: MySQL 5.7+, MariaDB 10.6+
-- NOTE: Safe to run multiple times - MySQL/MariaDB will only convert if needed

-- Disable foreign key checks to allow table modifications
SET FOREIGN_KEY_CHECKS = 0;

-- --------------------------------------------------------
-- Convert Care Bridge core tables to utf8mb4
-- These tables MUST exist for the application to function
-- --------------------------------------------------------

-- users table (framework - contains usernames referenced by FK)
ALTER TABLE `users`
  CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- media table (referenced by posts and settings via FK)
ALTER TABLE `media`
  CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- posts table (CRITICAL - contains user content with emojis)
-- This is the table that was failing with emoji insertion
ALTER TABLE `posts`
  CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- settings table (contains site configuration)
ALTER TABLE `settings`
  CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- --------------------------------------------------------
-- Rebuild foreign key constraints with utf8mb4 compatibility
-- Drop existing constraints first (ignore errors if they don't exist)
-- --------------------------------------------------------

-- Posts table foreign keys
SET @stmt = (SELECT IF(
  (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
   WHERE CONSTRAINT_SCHEMA = DATABASE()
   AND TABLE_NAME = 'posts'
   AND CONSTRAINT_NAME = 'fk_posts_hero_media') > 0,
  'ALTER TABLE posts DROP FOREIGN KEY fk_posts_hero_media',
  'SELECT 1'
));
PREPARE stmt FROM @stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @stmt = (SELECT IF(
  (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
   WHERE CONSTRAINT_SCHEMA = DATABASE()
   AND TABLE_NAME = 'posts'
   AND CONSTRAINT_NAME = 'fk_posts_created_by') > 0,
  'ALTER TABLE posts DROP FOREIGN KEY fk_posts_created_by',
  'SELECT 1'
));
PREPARE stmt FROM @stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

ALTER TABLE `posts`
  ADD CONSTRAINT `fk_posts_hero_media`
    FOREIGN KEY (`hero_media_id`) REFERENCES `media` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_posts_created_by`
    FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`username`) ON DELETE RESTRICT;

-- Settings table foreign keys
SET @stmt = (SELECT IF(
  (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
   WHERE CONSTRAINT_SCHEMA = DATABASE()
   AND TABLE_NAME = 'settings'
   AND CONSTRAINT_NAME = 'fk_settings_hero_media') > 0,
  'ALTER TABLE settings DROP FOREIGN KEY fk_settings_hero_media',
  'SELECT 1'
));
PREPARE stmt FROM @stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

ALTER TABLE `settings`
  ADD CONSTRAINT `fk_settings_hero_media`
    FOREIGN KEY (`hero_media_id`) REFERENCES `media` (`id`) ON DELETE SET NULL;

-- Media table foreign keys
SET @stmt = (SELECT IF(
  (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
   WHERE CONSTRAINT_SCHEMA = DATABASE()
   AND TABLE_NAME = 'media'
   AND CONSTRAINT_NAME = 'fk_media_created_by') > 0,
  'ALTER TABLE media DROP FOREIGN KEY fk_media_created_by',
  'SELECT 1'
));
PREPARE stmt FROM @stmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

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

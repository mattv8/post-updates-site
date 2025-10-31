-- Migration: Add draft fields to posts table
-- This allows auto-save to save to draft without publishing changes
-- When user clicks "Save", the draft is copied to the published fields

-- Check if migration already applied
SELECT
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'posts'
      AND COLUMN_NAME = 'body_html_draft'
    )
    THEN 'Migration already applied: draft fields exist'
    ELSE 'Applying migration: adding draft fields to posts table'
  END as migration_status;

-- Add draft fields for all editable post content
-- Check and add each column individually
SET @col_exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'posts'
  AND COLUMN_NAME = 'title_draft'
);

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `posts` ADD COLUMN `title_draft` VARCHAR(255) DEFAULT NULL COMMENT ''Draft title (auto-saved)'' AFTER `title`',
  'SELECT "Column title_draft already exists" as status'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'posts'
  AND COLUMN_NAME = 'body_html_draft'
);

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `posts` ADD COLUMN `body_html_draft` LONGTEXT DEFAULT NULL COMMENT ''Draft body HTML (auto-saved)'' AFTER `body_html`',
  'SELECT "Column body_html_draft already exists" as status'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'posts'
  AND COLUMN_NAME = 'hero_media_id_draft'
);

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `posts` ADD COLUMN `hero_media_id_draft` INT(11) DEFAULT NULL COMMENT ''Draft hero media ID (auto-saved)'' AFTER `hero_media_id`',
  'SELECT "Column hero_media_id_draft already exists" as status'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'posts'
  AND COLUMN_NAME = 'hero_image_height_draft'
);

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `posts` ADD COLUMN `hero_image_height_draft` INT(11) DEFAULT NULL COMMENT ''Draft hero height percentage (auto-saved)'' AFTER `hero_image_height`',
  'SELECT "Column hero_image_height_draft already exists" as status'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'posts'
  AND COLUMN_NAME = 'hero_crop_overlay_draft'
);

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `posts` ADD COLUMN `hero_crop_overlay_draft` TINYINT(1) DEFAULT NULL COMMENT ''Draft hero crop setting (auto-saved)'' AFTER `hero_crop_overlay`',
  'SELECT "Column hero_crop_overlay_draft already exists" as status'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'posts'
  AND COLUMN_NAME = 'hero_title_overlay_draft'
);

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `posts` ADD COLUMN `hero_title_overlay_draft` TINYINT(1) DEFAULT NULL COMMENT ''Draft hero title overlay setting (auto-saved)'' AFTER `hero_title_overlay`',
  'SELECT "Column hero_title_overlay_draft already exists" as status'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'posts'
  AND COLUMN_NAME = 'hero_overlay_opacity_draft'
);

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `posts` ADD COLUMN `hero_overlay_opacity_draft` DECIMAL(3,2) DEFAULT NULL COMMENT ''Draft hero overlay opacity (auto-saved)'' AFTER `hero_overlay_opacity`',
  'SELECT "Column hero_overlay_opacity_draft already exists" as status'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'posts'
  AND COLUMN_NAME = 'gallery_media_ids_draft'
);

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `posts` ADD COLUMN `gallery_media_ids_draft` TEXT DEFAULT NULL COMMENT ''Draft gallery media IDs JSON (auto-saved)'' AFTER `gallery_media_ids`',
  'SELECT "Column gallery_media_ids_draft already exists" as status'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add foreign key for draft hero media if it doesn't exist
SET @fk_exists = (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'posts'
  AND CONSTRAINT_NAME = 'fk_posts_hero_media_draft'
);

SET @sql = IF(@fk_exists = 0,
  'ALTER TABLE `posts` ADD CONSTRAINT `fk_posts_hero_media_draft` FOREIGN KEY (`hero_media_id_draft`) REFERENCES `media` (`id`) ON DELETE SET NULL',
  'SELECT "Foreign key fk_posts_hero_media_draft already exists" as status'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ====================================================
-- Add draft fields to settings table for auto-save
-- ====================================================

-- hero_html_draft
SET @col_exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'settings'
  AND COLUMN_NAME = 'hero_html_draft'
);

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `settings` ADD COLUMN `hero_html_draft` LONGTEXT DEFAULT NULL COMMENT ''Draft hero HTML (auto-saved)'' AFTER `hero_html`',
  'SELECT "Column hero_html_draft already exists" as status'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- site_bio_html_draft
SET @col_exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'settings'
  AND COLUMN_NAME = 'site_bio_html_draft'
);

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `settings` ADD COLUMN `site_bio_html_draft` LONGTEXT DEFAULT NULL COMMENT ''Draft bio HTML (auto-saved)'' AFTER `site_bio_html`',
  'SELECT "Column site_bio_html_draft already exists" as status'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- donate_text_html_draft
SET @col_exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'settings'
  AND COLUMN_NAME = 'donate_text_html_draft'
);

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `settings` ADD COLUMN `donate_text_html_draft` LONGTEXT DEFAULT NULL COMMENT ''Draft donate text HTML (auto-saved)'' AFTER `donate_text_html`',
  'SELECT "Column donate_text_html_draft already exists" as status'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- donation_instructions_html_draft
SET @col_exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'settings'
  AND COLUMN_NAME = 'donation_instructions_html_draft'
);

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `settings` ADD COLUMN `donation_instructions_html_draft` LONGTEXT DEFAULT NULL COMMENT ''Draft donation instructions HTML (auto-saved)'' AFTER `donation_instructions_html`',
  'SELECT "Column donation_instructions_html_draft already exists" as status'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- footer_column1_html_draft
SET @col_exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'settings'
  AND COLUMN_NAME = 'footer_column1_html_draft'
);

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `settings` ADD COLUMN `footer_column1_html_draft` LONGTEXT DEFAULT NULL COMMENT ''Draft footer column 1 HTML (auto-saved)'' AFTER `footer_column1_html`',
  'SELECT "Column footer_column1_html_draft already exists" as status'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- footer_column2_html_draft
SET @col_exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'settings'
  AND COLUMN_NAME = 'footer_column2_html_draft'
);

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `settings` ADD COLUMN `footer_column2_html_draft` LONGTEXT DEFAULT NULL COMMENT ''Draft footer column 2 HTML (auto-saved)'' AFTER `footer_column2_html`',
  'SELECT "Column footer_column2_html_draft already exists" as status'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT 'Migration complete: draft fields added to posts and settings tables' as result;

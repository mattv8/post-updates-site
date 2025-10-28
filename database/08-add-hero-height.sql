-- Migration: Add hero_height fields to settings and posts tables
-- Date: 2025-10-27
-- Description: Adds hero_height column to settings for main hero section and hero_image_height to posts for per-post customization (both percentage-based)

-- Add or modify hero_height column (idempotent)
SET @dbname = DATABASE();

SET @col_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
    AND TABLE_NAME = 'settings'
    AND COLUMN_NAME = 'hero_height'
);

-- Add column if it doesn't exist
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE `settings` ADD COLUMN `hero_height` INT(11) DEFAULT 100 COMMENT ''Hero section height as percentage (10-100%)'' AFTER `hero_overlay_color`',
    'SELECT "Column hero_height already exists, will modify it" AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Always modify the column to ensure correct definition (handles both new and existing)
ALTER TABLE `settings` MODIFY COLUMN `hero_height` INT(11) DEFAULT 100 COMMENT 'Hero section height as percentage (10-100%)';

-- Update existing rows to use percentage instead of pixels
UPDATE `settings` SET `hero_height` = 100 WHERE `hero_height` > 100 OR `hero_height` IS NULL;

-- Add hero_image_height column to posts table (idempotent)
-- Default 100% to show full image height, allows range from 10-100%
SET @post_col_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
    AND TABLE_NAME = 'posts'
    AND COLUMN_NAME = 'hero_image_height'
);

-- Add column if it doesn't exist
SET @sql2 = IF(@post_col_exists = 0,
    'ALTER TABLE `posts` ADD COLUMN `hero_image_height` INT(11) DEFAULT 100 COMMENT ''Height as percentage of image (10-100%)'' AFTER `hero_media_id`',
    'SELECT "Column hero_image_height already exists, will modify it" AS message'
);
PREPARE stmt2 FROM @sql2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;

-- Always modify the column to ensure correct definition (handles both new and existing)
ALTER TABLE `posts` MODIFY COLUMN `hero_image_height` INT(11) DEFAULT 100 COMMENT 'Height as percentage of image (10-100%)';

-- Update existing rows to use percentage instead of pixels
UPDATE `posts` SET `hero_image_height` = 100 WHERE `hero_image_height` > 100 OR `hero_image_height` IS NULL;

-- Add hero_crop_overlay column to posts table (idempotent)
-- Controls whether overlay shows full image (0) or uses hero_image_height cropping (1)
SET @crop_overlay_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
    AND TABLE_NAME = 'posts'
    AND COLUMN_NAME = 'hero_crop_overlay'
);

-- Add column if it doesn't exist
SET @sql3 = IF(@crop_overlay_exists = 0,
    'ALTER TABLE `posts` ADD COLUMN `hero_crop_overlay` TINYINT(1) DEFAULT 0 COMMENT ''Apply hero_image_height cropping in overlay (0=full image, 1=cropped)'' AFTER `hero_image_height`',
    'SELECT "Column hero_crop_overlay already exists, will modify it" AS message'
);
PREPARE stmt3 FROM @sql3;
EXECUTE stmt3;
DEALLOCATE PREPARE stmt3;

-- Always modify the column to ensure correct definition
ALTER TABLE `posts` MODIFY COLUMN `hero_crop_overlay` TINYINT(1) DEFAULT 0 COMMENT 'Apply hero_image_height cropping in overlay (0=full image, 1=cropped)';

-- Add hero_title_overlay column to posts table (idempotent)
-- Controls whether title displays over hero image (1) or below it (0)
SET @title_overlay_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
    AND TABLE_NAME = 'posts'
    AND COLUMN_NAME = 'hero_title_overlay'
);

-- Add column if it doesn't exist
SET @sql4 = IF(@title_overlay_exists = 0,
    'ALTER TABLE `posts` ADD COLUMN `hero_title_overlay` TINYINT(1) DEFAULT 1 COMMENT ''Display title over hero image (1=over, 0=below)'' AFTER `hero_crop_overlay`',
    'SELECT "Column hero_title_overlay already exists, will modify it" AS message'
);
PREPARE stmt4 FROM @sql4;
EXECUTE stmt4;
DEALLOCATE PREPARE stmt4;

-- Always modify the column to ensure correct definition
ALTER TABLE `posts` MODIFY COLUMN `hero_title_overlay` TINYINT(1) DEFAULT 1 COMMENT 'Display title over hero image (1=over, 0=below)';

-- Add hero_overlay_opacity column to posts table (idempotent)
-- Controls brightness/opacity of hero image when title overlay is enabled (0.0=very dark, 1.0=no darkening)
SET @opacity_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
    AND TABLE_NAME = 'posts'
    AND COLUMN_NAME = 'hero_overlay_opacity'
);

-- Add column if it doesn't exist
SET @sql5 = IF(@opacity_exists = 0,
    'ALTER TABLE `posts` ADD COLUMN `hero_overlay_opacity` DECIMAL(3,2) DEFAULT 0.70 COMMENT ''Hero image brightness when title overlay enabled (0.0-1.0)'' AFTER `hero_title_overlay`',
    'SELECT "Column hero_overlay_opacity already exists, will modify it" AS message'
);
PREPARE stmt5 FROM @sql5;
EXECUTE stmt5;
DEALLOCATE PREPARE stmt5;

-- Always modify the column to ensure correct definition
ALTER TABLE `posts` MODIFY COLUMN `hero_overlay_opacity` DECIMAL(3,2) DEFAULT 0.70 COMMENT 'Hero image brightness when title overlay enabled (0.0-1.0)';

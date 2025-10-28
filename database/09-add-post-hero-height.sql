-- Migration: Add hero_image_height to posts table
-- Description: Allows users to customize the vertical height/cropping of hero images on individual posts
-- Date: 2025-10-28
-- Note: This is separate from settings.hero_height which controls the main page hero section

-- Add hero_image_height column to posts table (idempotent)
-- Default 100% to show full image height, allows range from 10-100%
SET @stmt = IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'posts'
    AND COLUMN_NAME = 'hero_image_height'
    ) > 0,
    'SELECT "Column hero_image_height already exists" AS message',
    'ALTER TABLE `posts` ADD COLUMN `hero_image_height` int(11) DEFAULT 100 COMMENT ''Height as percentage of image (10-100%)'' AFTER `hero_media_id`'
);
PREPARE exec_stmt FROM @stmt;
EXECUTE exec_stmt;
DEALLOCATE PREPARE exec_stmt;

-- Update existing rows to use percentage instead of pixels
UPDATE `posts` SET `hero_image_height` = 100 WHERE `hero_image_height` > 100 OR `hero_image_height` IS NULL;

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

--
-- Post Portal Database Schema
-- Creates tables for posts, media, and site settings
--

-- --------------------------------------------------------
-- Table structure for table `media`
-- Stores uploaded images with variants for responsive display
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS `media` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `filename` varchar(255) NOT NULL COMMENT 'Generated unique filename',
  `original_filename` varchar(255) NOT NULL COMMENT 'Original uploaded filename',
  `mime_type` varchar(100) NOT NULL COMMENT 'MIME type (image/jpeg, image/png, etc)',
  `size_bytes` int(11) NOT NULL COMMENT 'File size in bytes',
  `width` int(11) DEFAULT NULL COMMENT 'Original image width in pixels',
  `height` int(11) DEFAULT NULL COMMENT 'Original image height in pixels',
  `alt_text` text DEFAULT NULL COMMENT 'Alt text for accessibility',
  `storage_path` varchar(500) NOT NULL COMMENT 'Path to original file',
  `variants_json` text DEFAULT NULL COMMENT 'JSON array of responsive variants with paths and sizes',
  `created_by_user_id` varchar(32) NOT NULL COMMENT 'Username of creator',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `created_by_user_id` (`created_by_user_id`),
  KEY `created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `posts`
-- Stores  update posts with hero images and galleries
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS `posts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(255) DEFAULT NULL COMMENT 'Post title (optional)',
  `body_html` longtext NOT NULL COMMENT 'Post content in HTML from WYSIWYG editor',
  `excerpt` varchar(500) DEFAULT NULL COMMENT 'Auto-generated or manual excerpt (first 250 chars)',
  `hero_media_id` int(11) DEFAULT NULL COMMENT 'FK to media table for hero image',
  `gallery_media_ids` text DEFAULT NULL COMMENT 'Ordered JSON array of media IDs for gallery',
  `status` enum('draft','published') NOT NULL DEFAULT 'draft' COMMENT 'Publication status',
  `published_at` datetime DEFAULT NULL COMMENT 'Publication date/time',
  `created_by_user_id` varchar(32) NOT NULL COMMENT 'Username of creator',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `status` (`status`),
  KEY `published_at` (`published_at`),
  KEY `created_by_user_id` (`created_by_user_id`),
  KEY `hero_media_id` (`hero_media_id`),
  CONSTRAINT `fk_posts_hero_media` FOREIGN KEY (`hero_media_id`) REFERENCES `media` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_posts_created_by` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`username`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `settings`
-- Single-row table for site-wide settings
-- --------------------------------------------------------

CREATE TABLE IF NOT EXISTS `settings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `site_title` varchar(255) DEFAULT '' COMMENT 'Site title/name',
  `hero_html` longtext DEFAULT '' COMMENT 'Hero section HTML content',
  `hero_media_id` int(11) DEFAULT NULL COMMENT 'FK to media table for hero background image',
  `site_bio_html` longtext DEFAULT '' COMMENT 'Site bio/about HTML content',
  `donation_settings_json` text DEFAULT NULL COMMENT 'JSON: stripe_mode, stripe_public_key, preset_amounts',
  `timezone` varchar(100) DEFAULT 'America/New_York' COMMENT 'Site timezone',
  `cta_text` varchar(100) DEFAULT 'Read Updates' COMMENT 'Call to action button text',
  `cta_url` varchar(255) DEFAULT '#updates' COMMENT 'Call to action button URL',
  `donate_text_html` longtext DEFAULT '' COMMENT 'How to help/donate section HTML',
  `hero_overlay_opacity` decimal(3,2) DEFAULT 0.50 COMMENT 'Hero overlay opacity (0.00-1.00)',
  `hero_overlay_color` varchar(7) DEFAULT '#000000' COMMENT 'Hero overlay color (hex)',
  `show_hero` tinyint(1) DEFAULT 1 COMMENT 'Show/hide hero banner section',
  `show_about` tinyint(1) DEFAULT 1 COMMENT 'Show/hide about section in sidebar',
  `show_donation` tinyint(1) DEFAULT 1 COMMENT 'Show/hide donation section in sidebar',
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `hero_media_id` (`hero_media_id`),
  CONSTRAINT `fk_settings_hero_media` FOREIGN KEY (`hero_media_id`) REFERENCES `media` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default settings row
INSERT INTO `settings` (
  `id`,
  `site_title`,
  `hero_html`,
  `site_bio_html`,
  `cta_text`,
  `cta_url`,
  `donate_text_html`,
  `hero_overlay_opacity`,
  `hero_overlay_color`,
  `show_hero`,
  `show_about`,
  `show_donation`,
  `timezone`
) VALUES (
  1,
  '',
  '<h1>Welcome</h1><p>Share your journey with those who care.</p>',
  '<p>This is where you can share your story...</p>',
  'Read Updates',
  '#updates',
  '<h3>How You Can Help</h3><p>Your support means everything to us.</p>',
  0.50,
  '#000000',
  1,
  1,
  1,
  'America/Central'
);

-- --------------------------------------------------------
-- Add admin flag to existing users table if it doesn't exist
-- --------------------------------------------------------

-- Check and add isadmin column if missing (should already exist from framework schema)
-- ALTER TABLE `users` ADD COLUMN IF NOT EXISTS `isadmin` tinyint(1) NOT NULL DEFAULT 0;

COMMIT;

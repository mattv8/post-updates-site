-- Migration: Add footer settings to settings table
-- Date: 2025-10-29
-- Description: Adds footer content fields with toggle for 1 or 2 column layout, background image with overlay

-- Add footer settings columns to settings table
ALTER TABLE `settings`
  ADD COLUMN `show_footer` tinyint(1) DEFAULT 1 COMMENT 'Show/hide footer section' AFTER `show_donation`,
  ADD COLUMN `footer_layout` enum('single','double') DEFAULT 'double' COMMENT 'Footer layout: single or double column' AFTER `show_footer`,
  ADD COLUMN `footer_media_id` int(11) DEFAULT NULL COMMENT 'FK to media table for footer background image' AFTER `footer_layout`,
  ADD COLUMN `footer_overlay_opacity` decimal(3,2) DEFAULT 0.50 COMMENT 'Footer overlay opacity (0.00-1.00)' AFTER `footer_media_id`,
  ADD COLUMN `footer_overlay_color` varchar(7) DEFAULT '#000000' COMMENT 'Footer overlay color (hex)' AFTER `footer_overlay_opacity`,
  ADD COLUMN `footer_column1_html` longtext COMMENT 'Footer column 1 HTML content' AFTER `footer_overlay_color`,
  ADD COLUMN `footer_column2_html` longtext COMMENT 'Footer column 2 HTML content (only shown in double layout)' AFTER `footer_column1_html`;

-- Add foreign key constraint for footer media
ALTER TABLE `settings`
  ADD CONSTRAINT `fk_settings_footer_media` FOREIGN KEY (`footer_media_id`) REFERENCES `media` (`id`) ON DELETE SET NULL;

-- Update existing settings row with default footer content
UPDATE `settings`
SET
  `show_footer` = 1,
  `footer_layout` = 'double',
  `footer_media_id` = NULL,
  `footer_overlay_opacity` = 0.50,
  `footer_overlay_color` = '#000000',
  `footer_column1_html` = '<h3>Contact</h3><p>Stay connected with us.</p>',
  `footer_column2_html` = '<h3>Links</h3><p>Additional resources and information.</p>'
WHERE `id` = 1;

COMMIT;

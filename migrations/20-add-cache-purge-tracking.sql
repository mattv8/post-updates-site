-- Migration: Add cache purge tracking
-- Description: Adds a field to track when the page cache was last purged

-- Add last_cache_purge column to settings table
ALTER TABLE `settings`
ADD COLUMN IF NOT EXISTS `last_cache_purge` DATETIME DEFAULT NULL COMMENT 'Timestamp of last cache purge';

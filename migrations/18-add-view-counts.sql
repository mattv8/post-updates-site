START TRANSACTION;

-- Add view/impression counters to posts
ALTER TABLE `posts`
  ADD COLUMN `impression_count` BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Total impressions (card viewed in viewport)',
  ADD COLUMN `unique_impression_count` BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Unique impressions per visitor (client-tracked)',
  ADD COLUMN `view_count` BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Total opens/views',
  ADD COLUMN `unique_view_count` BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Unique opens/views per visitor (client-tracked)';

-- Add public toggles for displaying view/impression counts separately
ALTER TABLE `settings`
  ADD COLUMN `show_view_counts` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Show view count badges to the public',
  ADD COLUMN `show_impression_counts` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Show impression count badges to the public',
  ADD COLUMN `ignore_admin_tracking` TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Do not track views/impressions from logged-in admins';

COMMIT;

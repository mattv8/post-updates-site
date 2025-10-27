SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

--
-- Add soft delete support to posts table
-- Posts are archived rather than permanently deleted
--

ALTER TABLE `posts`
ADD COLUMN `deleted_at` timestamp NULL DEFAULT NULL COMMENT 'Soft delete timestamp - NULL means not deleted',
ADD INDEX `deleted_at` (`deleted_at`);

COMMIT;

-- Migration: Fix SMTP Secure Field to Use ENUM
-- Description: Changes smtp_secure from VARCHAR to ENUM('none','tls','ssl') for better data integrity
-- Author: System
-- Date: 2025-11-04

-- =============================================================================
-- Modify smtp_secure column to ENUM
-- =============================================================================

-- First, convert any empty strings or NULL values to 'none'
UPDATE `settings`
SET `smtp_secure` = 'none'
WHERE `smtp_secure` IS NULL OR `smtp_secure` = '';

-- Change the column type to ENUM
ALTER TABLE `settings`
MODIFY COLUMN `smtp_secure` ENUM('none', 'tls', 'ssl') NOT NULL DEFAULT 'none'
COMMENT 'SMTP encryption type: none, tls (STARTTLS), or ssl';

-- =============================================================================
-- Migration complete
-- =============================================================================

SELECT 'Migration 17: Fix SMTP Secure ENUM - completed successfully' AS status;

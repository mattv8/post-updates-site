-- Migration: Encrypt SMTP password field
-- Increase field size to accommodate encrypted password

-- Increase smtp_password column size to accommodate encrypted data (idempotent)
ALTER TABLE settings MODIFY COLUMN smtp_password VARCHAR(500) DEFAULT NULL;

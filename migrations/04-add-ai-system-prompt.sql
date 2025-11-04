-- Migration: Add AI system prompt setting
-- Date: 2025-10-27

-- Add ai_system_prompt column to settings table
ALTER TABLE `settings`
ADD COLUMN `ai_system_prompt` TEXT DEFAULT NULL COMMENT 'Custom system prompt for AI title generation' AFTER `show_donation`;

-- Set default AI system prompt
UPDATE `settings`
SET `ai_system_prompt` = 'You are a helpful assistant that creates concise, engaging titles for update posts. The title should be short (3-8 words), and capture the essence of the update. Return ONLY the title text, nothing else.'
WHERE `id` = 1 AND `ai_system_prompt` IS NULL;

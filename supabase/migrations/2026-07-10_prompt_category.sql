-- Allow 'prompt' as a knowledge_files category (AI Prompts feature).
-- Run in Supabase Dashboard → SQL Editor.

ALTER TABLE knowledge_files
  DROP CONSTRAINT IF EXISTS knowledge_files_category_check;

ALTER TABLE knowledge_files
  ADD CONSTRAINT knowledge_files_category_check
  CHECK (category IN ('knowledge', 'sow', 'prompt'));

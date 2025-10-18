-- Add file_url and file_name columns to notes table for Android app
-- Run this in Supabase SQL Editor

ALTER TABLE notes 
ADD COLUMN IF NOT EXISTS file_url TEXT,
ADD COLUMN IF NOT EXISTS file_name TEXT;

-- Create index for file queries
CREATE INDEX IF NOT EXISTS idx_notes_with_files ON notes(user_id, file_url) WHERE file_url IS NOT NULL;

-- Verify columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'notes' 
AND column_name IN ('file_url', 'file_name');


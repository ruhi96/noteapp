-- Migration SQL to add Firebase Authentication support to existing notes table
-- Run this in your Supabase SQL Editor

-- Step 1: Add new columns for user authentication
ALTER TABLE notes 
ADD COLUMN IF NOT EXISTS user_id TEXT,
ADD COLUMN IF NOT EXISTS user_email TEXT;

-- Step 2: Update existing notes (if any) with a placeholder user_id
-- You can delete these or assign them to your user after authentication
-- UPDATE notes SET user_id = 'migration_placeholder' WHERE user_id IS NULL;

-- Step 3: Make user_id NOT NULL after updating existing records
-- Uncomment this after you've handled existing notes:
-- ALTER TABLE notes ALTER COLUMN user_id SET NOT NULL;

-- Step 4: Drop old RLS policies
DROP POLICY IF EXISTS "Enable all access for notes" ON notes;
DROP POLICY IF EXISTS "Users can view their own notes" ON notes;
DROP POLICY IF EXISTS "Users can create their own notes" ON notes;
DROP POLICY IF EXISTS "Users can update their own notes" ON notes;
DROP POLICY IF EXISTS "Users can delete their own notes" ON notes;

-- Step 5: Enable Row Level Security (if not already enabled)
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- Step 6: Create new RLS policy allowing backend to manage all notes
-- Since we use Firebase JWT verification in backend, we let backend handle filtering
CREATE POLICY "Allow backend to manage all notes" ON notes
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Step 7: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_user_created ON notes(user_id, created_at DESC);

-- Step 8: Verify the changes
-- Run this to check your table structure:
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'notes';


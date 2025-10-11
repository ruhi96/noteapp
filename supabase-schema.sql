-- Create notes table in Supabase with user authentication
-- Run this SQL in your Supabase SQL Editor

-- Drop existing table if you need to recreate it
-- DROP TABLE IF EXISTS notes;

CREATE TABLE IF NOT EXISTS notes (
    id BIGSERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    user_id TEXT NOT NULL,
    user_email TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist
DROP POLICY IF EXISTS "Enable all access for notes" ON notes;

-- Create policies for user-specific access
-- Users can only read their own notes
CREATE POLICY "Users can view their own notes" ON notes
    FOR SELECT
    USING (user_id = current_setting('app.current_user_id', true));

-- Users can only insert their own notes
CREATE POLICY "Users can create their own notes" ON notes
    FOR INSERT
    WITH CHECK (user_id = current_setting('app.current_user_id', true));

-- Users can only update their own notes
CREATE POLICY "Users can update their own notes" ON notes
    FOR UPDATE
    USING (user_id = current_setting('app.current_user_id', true));

-- Users can only delete their own notes
CREATE POLICY "Users can delete their own notes" ON notes
    FOR DELETE
    USING (user_id = current_setting('app.current_user_id', true));

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_user_created ON notes(user_id, created_at DESC);

-- Note: Since we're using Firebase Auth with the backend handling authorization,
-- you can also use simpler policies that allow all operations
-- and rely on backend token verification:

-- Alternative: Simple policy allowing all operations
-- (Backend will handle user filtering)
DROP POLICY IF EXISTS "Users can view their own notes" ON notes;
DROP POLICY IF EXISTS "Users can create their own notes" ON notes;
DROP POLICY IF EXISTS "Users can update their own notes" ON notes;
DROP POLICY IF EXISTS "Users can delete their own notes" ON notes;

CREATE POLICY "Allow backend to manage all notes" ON notes
    FOR ALL
    USING (true)
    WITH CHECK (true);


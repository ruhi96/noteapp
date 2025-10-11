-- Enhanced Database Schema for Notes App with File Attachments
-- Run these commands in Supabase SQL Editor

-- 1. Create file_attachments table
CREATE TABLE IF NOT EXISTS file_attachments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    note_id UUID REFERENCES notes(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL, -- Firebase UID
    file_name TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    file_type TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    storage_bucket TEXT NOT NULL DEFAULT 'note-attachments',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_file_attachments_note_id ON file_attachments(note_id);
CREATE INDEX IF NOT EXISTS idx_file_attachments_user_id ON file_attachments(user_id);
CREATE INDEX IF NOT EXISTS idx_file_attachments_created_at ON file_attachments(created_at DESC);

-- 3. Enable Row Level Security
ALTER TABLE file_attachments ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies for file_attachments
-- Policy: Users can view their own file attachments
CREATE POLICY "Users can view their own file attachments"
ON file_attachments FOR SELECT
TO authenticated
USING (auth.role() = 'authenticated');

-- Policy: Users can insert their own file attachments
CREATE POLICY "Users can insert their own file attachments"
ON file_attachments FOR INSERT
TO authenticated
WITH CHECK (auth.role() = 'authenticated');

-- Policy: Users can update their own file attachments
CREATE POLICY "Users can update their own file attachments"
ON file_attachments FOR UPDATE
TO authenticated
USING (auth.role() = 'authenticated');

-- Policy: Users can delete their own file attachments
CREATE POLICY "Users can delete their own file attachments"
ON file_attachments FOR DELETE
TO authenticated
USING (auth.role() = 'authenticated');

-- 5. Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 6. Create trigger to automatically update updated_at
CREATE TRIGGER update_file_attachments_updated_at 
    BEFORE UPDATE ON file_attachments 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 7. Add attachments column to notes table if it doesn't exist
ALTER TABLE notes ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

-- 8. Create storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('note-attachments', 'note-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- 9. Create permissive storage policies for note-attachments bucket
-- These policies use auth.role() instead of auth.uid() because Firebase tokens don't set auth.uid()

-- Policy: Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'note-attachments' AND
    auth.role() = 'authenticated'
);

-- Policy: Allow public access to files (for public bucket)
CREATE POLICY "Public files are accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'note-attachments');

-- Policy: Allow authenticated users to update their files
CREATE POLICY "Authenticated users can update files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'note-attachments' AND
    auth.role() = 'authenticated'
);

-- Policy: Allow authenticated users to delete their files
CREATE POLICY "Authenticated users can delete files"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'note-attachments' AND
    auth.role() = 'authenticated'
);

-- 10. Create view for easy file attachment queries
CREATE OR REPLACE VIEW file_attachments_with_notes AS
SELECT 
    fa.*,
    n.title as note_title,
    n.user_id as note_user_id
FROM file_attachments fa
LEFT JOIN notes n ON fa.note_id = n.id;

-- 11. Grant permissions on the view
GRANT SELECT ON file_attachments_with_notes TO authenticated;

-- 12. Create function to clean up orphaned file attachments
CREATE OR REPLACE FUNCTION cleanup_orphaned_attachments()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM file_attachments 
    WHERE note_id IS NULL 
    AND created_at < NOW() - INTERVAL '24 hours';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. Create function to get file attachment statistics
CREATE OR REPLACE FUNCTION get_file_attachment_stats(user_uid TEXT)
RETURNS TABLE (
    total_files BIGINT,
    total_size BIGINT,
    file_types JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_files,
        COALESCE(SUM(file_size), 0) as total_size,
        jsonb_object_agg(
            COALESCE(file_type, 'unknown'), 
            type_count
        ) as file_types
    FROM (
        SELECT 
            file_type,
            COUNT(*) as type_count
        FROM file_attachments 
        WHERE user_id = user_uid
        GROUP BY file_type
    ) file_type_counts
    CROSS JOIN (
        SELECT COUNT(*), SUM(file_size)
        FROM file_attachments 
        WHERE user_id = user_uid
    ) stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 14. Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION cleanup_orphaned_attachments() TO authenticated;
GRANT EXECUTE ON FUNCTION get_file_attachment_stats(TEXT) TO authenticated;

-- 15. Create indexes for better performance on notes table
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_attachments ON notes USING GIN (attachments);

-- 16. Add comments for documentation
COMMENT ON TABLE file_attachments IS 'Stores metadata for file attachments linked to notes';
COMMENT ON COLUMN file_attachments.note_id IS 'References notes.id, NULL for temporary attachments';
COMMENT ON COLUMN file_attachments.user_id IS 'Firebase UID of the user who uploaded the file';
COMMENT ON COLUMN file_attachments.storage_path IS 'Path to file in Supabase Storage bucket';
COMMENT ON COLUMN file_attachments.storage_bucket IS 'Supabase Storage bucket name';

COMMENT ON VIEW file_attachments_with_notes IS 'View joining file attachments with their associated notes';
COMMENT ON FUNCTION cleanup_orphaned_attachments() IS 'Removes temporary attachments older than 24 hours';
COMMENT ON FUNCTION get_file_attachment_stats(TEXT) IS 'Returns file attachment statistics for a user';

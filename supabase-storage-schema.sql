-- Supabase Storage Setup for File Attachments
-- Run this in Supabase SQL Editor

-- 1. Update notes table to support file attachments
ALTER TABLE notes 
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

-- attachments will be an array of objects like:
-- [
--   {
--     "name": "document.pdf",
--     "url": "https://project.supabase.co/storage/v1/object/public/note-attachments/uuid/file.pdf",
--     "size": 1024000,
--     "type": "application/pdf"
--   }
-- ]

-- 2. Create storage bucket for note attachments
-- Go to: Storage → Create a new bucket
-- Name: note-attachments
-- Public: Yes (or No for private files)

-- 3. Set up Row Level Security policies for storage
-- This allows users to upload and access their own files

-- Storage policies (run these after creating the bucket)
-- Note: Replace 'note-attachments' with your bucket name if different

-- Allow authenticated users to upload files
CREATE POLICY "Users can upload their own files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'note-attachments' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to read their own files
CREATE POLICY "Users can view their own files"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'note-attachments' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public access (if bucket is public)
CREATE POLICY "Public files are accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'note-attachments');

-- Allow authenticated users to delete their own files
CREATE POLICY "Users can delete their own files"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'note-attachments' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

-- 4. Example of how attachments are stored in notes table:
-- UPDATE notes SET attachments = '[
--   {
--     "name": "report.pdf",
--     "url": "https://xyz.supabase.co/storage/v1/object/public/note-attachments/user-id/uuid-file.pdf",
--     "size": 2048000,
--     "type": "application/pdf"
--   },
--   {
--     "name": "image.jpg",
--     "url": "https://xyz.supabase.co/storage/v1/object/public/note-attachments/user-id/uuid-image.jpg",
--     "size": 512000,
--     "type": "image/jpeg"
--   }
-- ]'::jsonb WHERE id = 1;

-- 5. Query notes with attachments
-- SELECT id, title, content, attachments FROM notes WHERE user_id = 'user-id';


# Supabase Storage Setup for File Attachments

## 📋 Step-by-Step Setup Guide

### 1. Create Storage Bucket

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Click **Storage** in the left sidebar
4. Click **Create a new bucket**
5. Configure the bucket:
   - **Name:** `note-attachments`
   - **Public bucket:** Toggle **ON** (allows public access to files)
   - Click **Create bucket**

### 2. Update Database Schema

Run this SQL in **SQL Editor**:

```sql
-- Add attachments column to notes table
ALTER TABLE notes 
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;
```

### 3. Set Up Storage Policies (Optional but Recommended)

If you want more control over who can access files, run these policies in **SQL Editor**:

```sql
-- Allow authenticated users to upload their own files
CREATE POLICY "Users can upload their own files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'note-attachments' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public access to files (for public bucket)
CREATE POLICY "Public files are accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'note-attachments');

-- Allow users to delete their own files
CREATE POLICY "Users can delete their own files"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'note-attachments' AND
    auth.uid()::text = (storage.foldername(name))[1]
);
```

### 4. Verify Setup

1. Go to **Storage** → **note-attachments**
2. You should see an empty bucket
3. Storage URL format: `https://your-project.supabase.co/storage/v1/object/public/note-attachments/`

## ✅ Testing

### Test File Upload

1. Sign in to your note app
2. Create a new note
3. Click **"Attach Files"** button
4. Select an image, PDF, or any file
5. Click **"Add Note"**
6. The file should upload and appear in the note

### Verify in Supabase

1. Go to **Storage** → **note-attachments**
2. You should see a folder with your user ID
3. Inside, you'll see uploaded files: `timestamp-filename.ext`

### Check Database

Go to **Table Editor** → **notes**:
- The `attachments` column should contain JSON array:
```json
[
  {
    "name": "document.pdf",
    "url": "https://project.supabase.co/storage/v1/object/public/note-attachments/user-id/12345-document.pdf",
    "size": 1024000,
    "type": "application/pdf"
  }
]
```

## 📊 Supported File Types

The app supports uploading:
- 🖼️ Images: .jpg, .png, .gif, .webp, .svg
- 🎥 Videos: .mp4, .mov, .avi, .webm
- 🎵 Audio: .mp3, .wav, .ogg
- 📄 Documents: .pdf, .doc, .docx
- 📊 Spreadsheets: .xls, .xlsx, .csv
- 📦 Archives: .zip, .rar, .7z
- And any other file type!

## 💾 File Size Limits

- **Default limit:** 10MB per file
- **Supabase free tier:** 1GB total storage
- **Supabase Pro tier:** 100GB total storage

To change the 10MB limit, edit `public/app.js`:

```javascript
// Change this line (currently at 10MB):
if (file.size > 10 * 1024 * 1024) {
    // Change to 20MB:
    if (file.size > 20 * 1024 * 1024) {
```

## 🎨 Features Implemented

### Upload UI
- **File select button** with upload icon
- **Multiple file selection** - upload many files at once
- **File preview chips** - see selected files before uploading
- **Remove files** - click × to remove before uploading

### File Display in Notes
- **Image previews** - images show inline in notes
- **Download links** - all files have download links
- **File info** - shows filename, icon, and size
- **Click to view** - click images to open full size

### Backend
- **Supabase Storage integration** - files stored in cloud
- **User-specific folders** - each user has their own folder
- **Unique filenames** - timestamp prevents name conflicts
- **File validation** - checks size and type

## 🔧 Troubleshooting

### Error: "Bucket not found"
- Make sure you created the bucket named `note-attachments`
- Check spelling is exact
- Bucket must exist before uploading

### Error: "New row violates row-level security policy"
- Make sure you ran the storage policies SQL
- Or make the bucket public in Supabase dashboard

### Error: "File too large"
- Default limit is 10MB per file
- Check file size before uploading
- Increase limit in code if needed

### Files not appearing in notes
- Check browser console for errors
- Verify attachments column exists in database
- Check storage policies allow public access

### Images not showing
- Make sure bucket is set to **Public**
- Check image URL is accessible
- Verify image file types are supported

## 📁 File Storage Structure

```
note-attachments/
├── user-uid-1/
│   ├── 1699123456789-document.pdf
│   ├── 1699123456790-image.jpg
│   └── 1699123456791-report.xlsx
├── user-uid-2/
│   ├── 1699123456792-photo.png
│   └── 1699123456793-video.mp4
└── user-uid-3/
    └── 1699123456794-presentation.pptx
```

Each user has their own folder (user ID from Firebase Auth).

## 🔐 Security

- ✅ User-specific folders (user ID as folder name)
- ✅ Firebase authentication required to upload
- ✅ File size validation (prevents huge uploads)
- ✅ Filename sanitization (prevents malicious names)
- ✅ Unique timestamps (prevents name conflicts)

## 💡 Tips

1. **Make bucket public** for easier access to files
2. **Run storage policies** for additional security
3. **Monitor storage usage** in Supabase dashboard
4. **Delete unused files** to save storage space
5. **Use CDN** for better performance (Supabase includes this)

## 🚀 Next Steps

Want to add more features?

- **Delete attachments** - add delete button to files
- **Image compression** - reduce file sizes before upload
- **Drag & drop** - drag files to upload area
- **Progress bars** - show upload progress
- **File previews** - preview PDFs, videos inline
- **Download all** - download all attachments as zip

## 📚 Resources

- [Supabase Storage Docs](https://supabase.com/docs/guides/storage)
- [Storage API Reference](https://supabase.com/docs/reference/javascript/storage)
- [Storage GitHub](https://github.com/supabase/storage)

## ✅ Quick Checklist

- [ ] Created `note-attachments` bucket in Supabase
- [ ] Set bucket to Public
- [ ] Ran SQL to add `attachments` column
- [ ] (Optional) Set up storage policies
- [ ] Tested file upload in app
- [ ] Verified files appear in Supabase Storage
- [ ] Confirmed files show in notes

**You're all set! 🎉**


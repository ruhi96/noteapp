# File Upload Setup Guide

## 📋 How File Upload Works

### Flow:
1. User creates a note (title + content)
2. Note is saved to Supabase → **Note ID** is generated
3. User-selected files are uploaded to Supabase Storage
4. Files are stored at: `userId/noteId/timestamp-filename`
5. File URLs are added to the note's `attachments` field
6. Note displays with attached files

## 🔧 Supabase Storage Configuration

### Endpoint:
```
https://epihgevunzsjsjplglax.storage.supabase.co/storage/v1/s3
```

**All files MUST be stored at this endpoint!**

### File Storage Structure:
```
Note app/
└── {userId}/
    └── {noteId}/
        ├── 1699123456789-image.jpg
        ├── 1699123456790-document.pdf
        └── 1699123456791-video.mp4
```

**Benefits of Note ID Mapping:**
- ✅ Files organized by note
- ✅ Easy to find all files for a note
- ✅ Can delete all files when deleting a note
- ✅ Better organization

## 📝 Setup Steps

### 1. Create Storage Bucket in Supabase

1. Go to Supabase Dashboard → **Storage**
2. Click **Create a new bucket**
3. Configuration:
   - **Name:** `Note app`
   - **Public bucket:** Toggle **ON**
   - Click **Create bucket**

### 2. Update Database Schema

Run in Supabase **SQL Editor**:

```sql
-- Add attachments column to notes table
ALTER TABLE notes 
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;
```

### 3. Update Environment Variables

Your `.env` file should have:

```env
SUPABASE_URL=https://epihgevunzsjsjplglax.supabase.co
SUPABASE_KEY=your_actual_anon_key_here
SUPABASE_STORAGE_ENDPOINT=https://epihgevunzsjsjplglax.storage.supabase.co/storage/v1/s3
```

### 4. For Render Deployment

Add to Render Environment variables:
- `SUPABASE_STORAGE_ENDPOINT` = `https://epihgevunzsjsjplglax.storage.supabase.co/storage/v1/s3`

## 🎯 API Endpoints

### Upload File
```
POST /api/upload
Headers: Authorization: Bearer {firebase-token}
Body: {
  fileName: "document.pdf",
  fileData: "data:application/pdf;base64,...",
  fileType: "application/pdf",
  noteId: 123  // Note ID to map file to
}

Response: {
  url: "https://epihgevunzsjsjplglax.supabase.co/storage/v1/object/public/Note app/userId/noteId/file.pdf",
  path: "userId/noteId/1699123456789-document.pdf",
  name: "document.pdf",
  size: 1024000,
  type: "application/pdf",
  storageEndpoint: "https://epihgevunzsjsjplglax.storage.supabase.co/storage/v1/s3"
}
```

### Update Note with Attachments
```
PATCH /api/notes/{noteId}
Headers: Authorization: Bearer {firebase-token}
Body: {
  attachments: [
    {
      name: "file.pdf",
      url: "https://...",
      path: "userId/noteId/file.pdf",
      size: 1024000,
      type: "application/pdf"
    }
  ]
}
```

## 📊 Data Structure

### Note with Attachments in Database:

```json
{
  "id": 123,
  "title": "My Note with Files",
  "content": "Note content here",
  "user_id": "firebase-user-uid",
  "user_email": "user@example.com",
  "attachments": [
    {
      "name": "report.pdf",
      "url": "https://epihgevunzsjsjplglax.supabase.co/storage/v1/object/public/Note app/userId/123/1699123456789-report.pdf",
      "path": "userId/123/1699123456789-report.pdf",
      "size": 2048000,
      "type": "application/pdf"
    },
    {
      "name": "image.jpg",
      "url": "https://epihgevunzsjsjplglax.supabase.co/storage/v1/object/public/Note app/userId/123/1699123456790-image.jpg",
      "path": "userId/123/1699123456790-image.jpg",
      "size": 512000,
      "type": "image/jpeg"
    }
  ],
  "created_at": "2024-11-05T10:30:00Z"
}
```

## 🔍 File Upload Process

### Step-by-Step:

1. **User fills form:**
   - Title: "My Note"
   - Content: "Content here"
   - Clicks "Attach Files" → Selects 2 files

2. **User clicks "Add Note":**
   - Button text: "Creating..."
   - Note saved to Supabase
   - Note ID returned: `123`

3. **Files upload:**
   - Button text: "Uploading 2 file(s)..."
   - File 1 → `userId/123/1699123456789-file1.pdf`
   - File 2 → `userId/123/1699123456790-file2.jpg`
   - Uploaded to: `https://epihgevunzsjsjplglax.storage.supabase.co/storage/v1/s3`

4. **Attachments saved:**
   - Button text: "Saving attachments..."
   - PATCH request updates note with file URLs

5. **Complete:**
   - Button text: "Add Note"
   - Note displays with attached files
   - Images show preview
   - All files have download links

## 🎨 User Interface

### Upload Icon
- Click "Attach Files" button (with upload icon)
- Select files from file picker
- Files appear as chips below the button
- Click × on chip to remove before uploading

### Display in Notes
- **Images:** Show as previews (click to open full size)
- **Other files:** Show as download links with icons
- **File info:** Name, size, type icon

## 🔒 Security

### File Organization:
- `userId/noteId/filename` - Files tied to specific users and notes
- Users can only access their own folders
- Note ID ensures files belong to specific notes

### Validation:
- ✅ Maximum 10MB per file
- ✅ Authentication required
- ✅ Filename sanitization
- ✅ User ownership verification

## 📏 Limits

- **File size:** 10MB per file (configurable in code)
- **Files per note:** Unlimited
- **Total storage:** Depends on Supabase plan
  - Free tier: 1GB
  - Pro tier: 100GB

## 🐛 Troubleshooting

### Issue: "Bucket not found"
**Solution:** Create `Note app` bucket in Supabase Storage

### Issue: "Row Level Security policy violation"
**Solution:** Make bucket public OR set up storage policies

### Issue: Files upload but don't show in note
**Solution:** 
- Check browser console for errors
- Verify attachments column exists in database
- Check that PATCH endpoint is working

### Issue: "Storage endpoint not accessible"
**Solution:**
- Verify `SUPABASE_STORAGE_ENDPOINT` is set correctly
- Must be: `https://epihgevunzsjsjplglax.storage.supabase.co/storage/v1/s3`
- Check Supabase project URL matches

## ✅ Verification Checklist

- [ ] Created `Note app` bucket in Supabase
- [ ] Bucket is set to Public
- [ ] Added `attachments` column to notes table (JSONB)
- [ ] Updated `.env` with correct `SUPABASE_URL` and `SUPABASE_KEY`
- [ ] Set `SUPABASE_STORAGE_ENDPOINT` in `.env`
- [ ] Restarted server
- [ ] Signed in with Google
- [ ] Created note with file attachment
- [ ] File uploaded successfully
- [ ] File appears in note
- [ ] Verified in Supabase Storage → Files are in `userId/noteId/` folder

## 🔧 Testing

1. Sign in: http://localhost:3001
2. Create new note
3. Click "Attach Files"
4. Select an image or PDF
5. Click "Add Note"
6. Watch server logs:
```
📝 Creating note for user: user@gmail.com
   User ID: abc123
✅ Note created successfully with ID: 1
📤 Uploading file to Supabase Storage:
   Endpoint: https://epihgevunzsjsjplglax.storage.supabase.co/storage/v1/s3
   Path: abc123/1/1699123456789-file.pdf
✅ File uploaded successfully
📝 Updating note ID: 1 with 1 attachments
✅ Note updated with attachments
```

7. Check Supabase Storage:
   - Should see: `Note app/abc123/1/1699123456789-file.pdf`

## 📍 Important Notes

- Files are **strictly stored** at the endpoint: `https://epihgevunzsjsjplglax.storage.supabase.co/storage/v1/s3`
- Files are **mapped to note IDs** in the folder structure
- Each note can have multiple files
- Files persist in Supabase Storage even if note is deleted (manual cleanup needed)

## 🚀 Deployment

For Render, make sure to add:
```
SUPABASE_STORAGE_ENDPOINT=https://epihgevunzsjsjplglax.storage.supabase.co/storage/v1/s3
```

This ensures all files are stored at the correct endpoint in production!


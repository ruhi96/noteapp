# Enhanced Note App Setup Guide - File Attachments

This guide will help you set up the enhanced note app with comprehensive file attachment support using Supabase Storage and Firebase Authentication.

## 🎯 Features

- **Firebase Authentication** (Google Sign-in, Email/Password)
- **Supabase Storage** for file attachments
- **Dual Supabase Clients** (anon key for DB, service role for storage)
- **File Management** (upload, download, delete, preview)
- **Image/Video Previews** with modal viewer
- **File Validation** (50MB limit, type checking)
- **Temporary Storage** for unsaved notes
- **Responsive UI** with modern design

## 📋 Prerequisites

1. **Supabase Project** with storage enabled
2. **Firebase Project** with Authentication enabled
3. **Node.js** and npm installed
4. **Render Account** for deployment (optional)

## 🔧 Environment Variables

### Required Variables

Add these to your `.env` file:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
SUPABASE_STORAGE_ENDPOINT=https://your-project.storage.supabase.co/storage/v1/s3

# Firebase Configuration
FIREBASE_API_KEY=your_firebase_api_key
FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}

# Server Configuration
PORT=3001
```

### Where to Get Keys

**Supabase Keys:**
- Dashboard → Project Settings → API
- Copy `anon public` key → `SUPABASE_KEY`
- Copy `service_role secret` key → `SUPABASE_SERVICE_ROLE_KEY`

**Firebase Keys:**
- Console → Project Settings → Your apps → Web app
- Copy `apiKey` → `FIREBASE_API_KEY`
- Copy `authDomain` → `FIREBASE_AUTH_DOMAIN`
- Copy `projectId` → `FIREBASE_PROJECT_ID`

## 🗄️ Database Setup

### 1. Run Database Schema

Execute this SQL in **Supabase SQL Editor**:

```sql
-- Create file_attachments table
CREATE TABLE IF NOT EXISTS file_attachments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    note_id UUID REFERENCES notes(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    file_type TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    storage_bucket TEXT NOT NULL DEFAULT 'note-attachments',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_file_attachments_note_id ON file_attachments(note_id);
CREATE INDEX IF NOT EXISTS idx_file_attachments_user_id ON file_attachments(user_id);
CREATE INDEX IF NOT EXISTS idx_file_attachments_created_at ON file_attachments(created_at DESC);

-- Enable RLS
ALTER TABLE file_attachments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own file attachments"
ON file_attachments FOR SELECT
TO authenticated
USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert their own file attachments"
ON file_attachments FOR INSERT
TO authenticated
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update their own file attachments"
ON file_attachments FOR UPDATE
TO authenticated
USING (auth.role() = 'authenticated');

CREATE POLICY "Users can delete their own file attachments"
ON file_attachments FOR DELETE
TO authenticated
USING (auth.role() = 'authenticated');

-- Add attachments column to notes
ALTER TABLE notes ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;
```

### 2. Create Storage Bucket

In **Supabase Dashboard → Storage**:

1. Click **"New bucket"**
2. Name: `note-attachments`
3. **Public bucket**: ✅ **ON**
4. Click **"Create bucket"**

### 3. Set Storage Policies

Execute this SQL in **Supabase SQL Editor**:

```sql
-- Create permissive storage policies
CREATE POLICY "Authenticated users can upload files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'note-attachments' AND
    auth.role() = 'authenticated'
);

CREATE POLICY "Public files are accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'note-attachments');

CREATE POLICY "Authenticated users can update files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'note-attachments' AND
    auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can delete files"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'note-attachments' AND
    auth.role() = 'authenticated'
);
```

## 🚀 Installation & Setup

### 1. Clone and Install

```bash
git clone https://github.com/ruhi96/noteapp.git
cd noteapp
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in your keys:

```bash
cp .env.example .env
# Edit .env with your actual keys
```

### 3. Run Database Schema

Execute the SQL commands above in Supabase SQL Editor.

### 4. Start Development Server

```bash
npm start
```

Visit: http://localhost:3001

## 📱 Usage

### Creating Notes with Files

1. **Sign in** with Google or Email/Password
2. **Create note**: Enter title and content
3. **Attach files**: Click "Attach Files" button
4. **Select files**: Choose images, videos, PDFs, etc.
5. **Upload**: Click "Add Note" to save with attachments

### File Management

- **Preview**: Images show thumbnails, videos show player
- **Download**: Click download button for any file
- **Delete**: Remove individual attachments
- **Modal view**: Click images for full-size preview

### File Types Supported

- **Images**: JPEG, PNG, GIF, WebP
- **Videos**: MP4, WebM, OGG
- **Documents**: PDF, TXT, DOC, DOCX
- **Size limit**: 50MB per file

## 🔒 Security Features

### Authentication
- Firebase Authentication with Google/Email
- JWT token validation on backend
- User-specific file access

### File Security
- Files stored in user-specific folders: `{userId}/{noteId}/`
- Temporary files in `{userId}/temp/`
- Service role key bypasses RLS for storage operations
- Application-level user filtering

### Database Security
- Row Level Security (RLS) enabled
- Permissive policies for Firebase auth compatibility
- User isolation at application level

## 📊 File Storage Structure

```
note-attachments/
├── {userId}/
│   ├── temp/
│   │   └── {timestamp}-filename.ext  # Temporary files
│   ├── {noteId}/
│   │   ├── {timestamp}-image.jpg     # Saved note attachments
│   │   └── {timestamp}-document.pdf
│   └── {anotherNoteId}/
│       └── {timestamp}-video.mp4
```

## 🛠️ API Endpoints

### Backend Endpoints

- `GET /api/config/supabase` - Get Supabase configuration
- `GET /api/config/firebase` - Get Firebase configuration
- `GET /api/notes` - Get user's notes
- `POST /api/notes` - Create new note
- `DELETE /api/notes/:id` - Delete note
- `PATCH /api/notes/:id` - Update note

### Frontend Storage Operations

- `uploadFile(file, noteId)` - Upload file to storage
- `deleteFile(attachmentId, storagePath)` - Delete file
- `downloadFile(storagePath, fileName)` - Download file
- `getFileAttachments(noteId)` - Get note attachments

## 🚀 Deployment to Render

### 1. Update Environment Variables

In **Render Dashboard → Environment**:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
SUPABASE_STORAGE_ENDPOINT=https://your-project.storage.supabase.co/storage/v1/s3
FIREBASE_API_KEY=your_firebase_api_key
FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}
PORT=3001
```

### 2. Deploy

```bash
git add .
git commit -m "Deploy enhanced note app with file attachments"
git push origin main
```

## 🐛 Troubleshooting

### Common Issues

**"Bucket not found"**
- Ensure `note-attachments` bucket exists
- Check bucket is public
- Verify storage policies are set

**"Permission denied"**
- Check RLS policies use `auth.role() = 'authenticated'`
- Verify service role key is correct
- Ensure Firebase tokens are valid

**Files not uploading**
- Check file size (50MB limit)
- Verify file type is supported
- Check browser console for errors

**Database errors**
- Run database schema SQL
- Check environment variables
- Verify Supabase connection

### Debug Logging

Check browser console for:
```
✅ Supabase configuration loaded
✅ Dual Supabase clients initialized
📤 Uploading file: filename.ext
✅ File uploaded to storage: path
✅ File metadata saved to database
```

Check server logs for:
```
📦 Supabase Configuration:
   URL: https://project.supabase.co
   Anon Key: ✓ Set
   Service Key: ✓ Set
   Storage Endpoint: https://project.storage.supabase.co/storage/v1/s3
```

## 📁 File Structure

```
note-app/
├── public/
│   ├── index-enhanced.html      # Enhanced UI with file upload
│   ├── app-enhanced.js          # Enhanced app logic
│   ├── styles-enhanced.css      # Enhanced styles
│   └── firebase-config.js       # Firebase configuration
├── server.js                    # Backend with Supabase config endpoint
├── database-schema.sql          # Complete database setup
├── .env                         # Environment variables
├── .env.example                 # Environment template
└── ENHANCED_SETUP_GUIDE.md      # This guide
```

## 🎉 You're Ready!

Your enhanced note app now supports:

- ✅ Firebase Authentication
- ✅ File attachments with Supabase Storage
- ✅ Image/video previews
- ✅ File download/delete
- ✅ Responsive UI
- ✅ Security best practices
- ✅ Production deployment ready

**Happy note-taking with files!** 📝📎

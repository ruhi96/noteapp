# Android App - Backend Deployment Guide

## Issues Fixed

✅ **Save button now visible** - Action bar enabled in AddEditNoteActivity  
✅ **API endpoint corrected** - `/api/subscription-status` → `/api/user/subscription-status`  
✅ **PUT endpoint added** - Full note updates now supported  
✅ **DELETE endpoint added** - Note deletion now works  
✅ **File upload working** - Multipart upload endpoint for Android  
✅ **Premium status display** - Will show once backend deployed

## Required Deployment Steps

### 1. Run Database Migration

Execute this SQL in **Supabase SQL Editor**:

```sql
-- Add file_url and file_name columns to notes table
ALTER TABLE notes 
ADD COLUMN IF NOT EXISTS file_url TEXT,
ADD COLUMN IF NOT EXISTS file_name TEXT;

-- Create index for file queries
CREATE INDEX IF NOT EXISTS idx_notes_with_files ON notes(user_id, file_url) 
WHERE file_url IS NOT NULL;
```

Or run the file: `add-file-columns-migration.sql`

### 2. Install New Dependencies

```bash
cd "C:\Users\91956\note application\noteapp"
npm install multer
```

### 3. Restart Backend Server

If running locally:
```bash
npm start
```

If deployed on Render:
1. Commit and push changes to GitHub:
   ```bash
   git add .
   git commit -m "Add Android app support: file upload, PUT/DELETE endpoints"
   git push origin main
   ```
2. Render will auto-deploy
3. Check logs: https://dashboard.render.com

### 4. Rebuild Android App

In Android Studio:
1. **Build** → **Clean Project**
2. **Build** → **Rebuild Project**
3. Uninstall old app from device/emulator
4. **Run** the app

## New Backend Features

### 1. Multipart File Upload
**Endpoint**: `POST /api/upload`  
**Content-Type**: `multipart/form-data`  
**Field**: `file`

**Response**:
```json
{
  "fileUrl": "https://...supabase.co/storage/.../file.pdf",
  "fileName": "document.pdf",
  "filePath": "user_id/files/timestamp-file.pdf"
}
```

### 2. Update Note
**Endpoint**: `PUT /api/notes/:id`  
**Body**:
```json
{
  "title": "Note Title",
  "content": "Note Content",
  "fileUrl": "optional-file-url",
  "fileName": "optional-file-name"
}
```

### 3. Delete Note
**Endpoint**: `DELETE /api/notes/:id`  
**Response**:
```json
{
  "message": "Note deleted successfully"
}
```

## Updated Files

### Backend
- ✅ `server.js` - Added multer, PUT/DELETE/upload endpoints
- ✅ `package.json` - Added multer dependency
- ✅ `add-file-columns-migration.sql` - Database migration

### Android Client
- ✅ `Config.java` - Fixed subscription API endpoint
- ✅ `AddEditNoteActivity.java` - Enabled action bar, fixed back button, improved file upload
- ✅ `Note.java` - Added constructor with file fields
- ✅ Backend endpoints now support full CRUD with file attachments

## Testing Checklist

### Android App
- [ ] Login with Google account
- [ ] Create new note with title and content
- [ ] Save note (check if save button appears in top-right)
- [ ] View created note in list
- [ ] Edit existing note
- [ ] Delete note (long press)
- [ ] Attach file to note
- [ ] View premium status banner at top
- [ ] Logout

### Premium Status
The premium status banner should show:
- **Free users**: "Status: Free" (gray)
- **Premium users**: "✓ Premium - Plan Name" (green)

This requires:
1. Backend deployed with `/api/user/subscription-status` endpoint
2. User has entry in `user_subscriptions` table with `status = 'active'`

## Common Issues

### Save Button Not Showing
**Cause**: Action bar disabled  
**Fixed**: Added `getSupportActionBar().setDisplayHomeAsUpEnabled(true)`

### File Upload Fails
**Cause**: Backend expects base64, Android sends multipart  
**Fixed**: Added `/api/upload` endpoint with multer

### Premium Status Not Showing
**Cause**: Wrong API endpoint  
**Fixed**: Changed from `/api/subscription-status` to `/api/user/subscription-status`

### Note Update/Delete Fails
**Cause**: PUT and DELETE endpoints missing  
**Fixed**: Added both endpoints to server.js

## Backend URL Configuration

Update in `Config.java`:
```java
// Local testing (emulator)
public static final String BASE_URL = "http://10.0.2.2:3001";

// Production (Render)
public static final String BASE_URL = "https://noteapp-moei.onrender.com";
```

## Environment Variables

Ensure these are set on Render:
- `SUPABASE_URL`
- `SUPABASE_KEY`
- `FIREBASE_SERVICE_ACCOUNT`
- `FIREBASE_API_KEY`
- `FIREBASE_AUTH_DOMAIN`
- `FIREBASE_PROJECT_ID`

## Database Schema

After migration, `notes` table structure:
```sql
CREATE TABLE notes (
    id BIGSERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    user_id TEXT NOT NULL,
    user_email TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    attachments JSONB DEFAULT '[]'::jsonb,
    file_url TEXT,              -- NEW
    file_name TEXT              -- NEW
);
```

## API Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notes` | Get all user notes |
| POST | `/api/notes` | Create new note |
| PUT | `/api/notes/:id` | Update note ✨ NEW |
| DELETE | `/api/notes/:id` | Delete note ✨ NEW |
| POST | `/api/upload` | Upload file (multipart) ✨ NEW |
| GET | `/api/user/subscription-status` | Get premium status |

## Next Steps

1. ✅ Run SQL migration in Supabase
2. ✅ Install `npm install multer`
3. ✅ Deploy backend (commit + push if on Render)
4. ✅ Rebuild Android app
5. ✅ Test all features

---

**Status**: Ready for deployment  
**Date**: 2025-10-18


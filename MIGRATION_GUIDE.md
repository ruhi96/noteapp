# Supabase Database Migration Guide

## Adding Firebase Authentication Support to Existing Database

If you already have a `notes` table in Supabase, follow these steps to add Firebase authentication support.

## Current Table Structure (Before Migration)

```sql
notes (
    id BIGSERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
)
```

## Required New Structure (After Migration)

```sql
notes (
    id BIGSERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    user_id TEXT NOT NULL,        -- NEW: Firebase user UID
    user_email TEXT,               -- NEW: User email (optional)
    created_at TIMESTAMPTZ DEFAULT NOW()
)
```

## Migration Steps

### Option 1: Fresh Start (No Existing Data to Keep)

If you don't have important data or want to start fresh:

1. Go to Supabase Dashboard → SQL Editor
2. Drop the existing table:
```sql
DROP TABLE IF EXISTS notes;
```

3. Run the complete schema from `supabase-schema.sql`

### Option 2: Migrate Existing Data

If you have existing notes you want to keep:

#### Step 1: Backup Your Data (Recommended)

```sql
-- Create a backup table
CREATE TABLE notes_backup AS SELECT * FROM notes;
```

#### Step 2: Run Migration SQL

Go to Supabase Dashboard → SQL Editor and run `supabase-migration.sql`:

```sql
-- Add new columns
ALTER TABLE notes 
ADD COLUMN IF NOT EXISTS user_id TEXT,
ADD COLUMN IF NOT EXISTS user_email TEXT;
```

#### Step 3: Handle Existing Notes

You have several options for existing notes:

**Option A: Delete existing notes**
```sql
DELETE FROM notes;
ALTER TABLE notes ALTER COLUMN user_id SET NOT NULL;
```

**Option B: Assign to placeholder (then manually reassign after auth)**
```sql
UPDATE notes SET user_id = 'migration_placeholder' WHERE user_id IS NULL;
ALTER TABLE notes ALTER COLUMN user_id SET NOT NULL;
```

**Option C: Assign to your Firebase UID (get this after signing in)**
```sql
-- Replace 'YOUR_FIREBASE_UID' with your actual Firebase UID
UPDATE notes SET user_id = 'YOUR_FIREBASE_UID' WHERE user_id IS NULL;
UPDATE notes SET user_email = 'your@email.com' WHERE user_email IS NULL;
ALTER TABLE notes ALTER COLUMN user_id SET NOT NULL;
```

#### Step 4: Update RLS Policies

```sql
-- Drop old policies
DROP POLICY IF EXISTS "Enable all access for notes" ON notes;

-- Enable RLS
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- Create new policy
CREATE POLICY "Allow backend to manage all notes" ON notes
    FOR ALL
    USING (true)
    WITH CHECK (true);
```

#### Step 5: Create Indexes

```sql
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_user_created ON notes(user_id, created_at DESC);
```

#### Step 6: Verify Changes

```sql
-- Check table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'notes'
ORDER BY ordinal_position;

-- Check existing data
SELECT id, title, user_id, user_email, created_at 
FROM notes 
LIMIT 5;
```

## Quick Migration Script

For a quick migration (drops existing data):

```sql
-- CAUTION: This will delete all existing notes!
DROP TABLE IF EXISTS notes CASCADE;

CREATE TABLE notes (
    id BIGSERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    user_id TEXT NOT NULL,
    user_email TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow backend to manage all notes" ON notes
    FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE INDEX idx_notes_user_id ON notes(user_id);
CREATE INDEX idx_notes_created_at ON notes(created_at DESC);
CREATE INDEX idx_notes_user_created ON notes(user_id, created_at DESC);
```

## Testing After Migration

1. Sign in with Google on your app
2. Create a test note
3. Check in Supabase:
```sql
SELECT * FROM notes ORDER BY created_at DESC LIMIT 1;
```

4. Verify that `user_id` is populated with your Firebase UID

## Get Your Firebase UID

After signing in to your app:
1. Open browser DevTools (F12)
2. Go to Console tab
3. Type: `auth.currentUser.uid`
4. Copy the UID to use in migration scripts

## Rollback (If Needed)

If something goes wrong and you have a backup:

```sql
-- Restore from backup
DROP TABLE notes;
ALTER TABLE notes_backup RENAME TO notes;
```

## Common Issues

### Issue: "column user_id does not exist"
**Solution:** Run the migration SQL to add the column

### Issue: "null value in column user_id violates not-null constraint"
**Solution:** Make sure to set `user_id` for existing notes before making it NOT NULL

### Issue: "Cannot read notes after migration"
**Solution:** Check RLS policies are set correctly, or temporarily disable RLS for testing:
```sql
ALTER TABLE notes DISABLE ROW LEVEL SECURITY;
```

## Summary

The migration adds:
- ✅ `user_id` column for Firebase authentication
- ✅ `user_email` column for user reference
- ✅ Updated RLS policies
- ✅ Performance indexes

After migration, each note will be associated with a specific user, and users will only see their own notes.


# Environment Variables Setup for Local Development

## 🚨 Important: You Need to Update Your .env File!

Your `.env` file currently has placeholder values. You need to add your actual credentials.

## 📝 Step-by-Step Guide

### 1. Get Supabase Credentials

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Click **Settings** (gear icon) → **API**
4. Copy these values:
   - **Project URL** → This is your `SUPABASE_URL`
   - **anon/public key** → This is your `SUPABASE_KEY`

### 2. Get Firebase Frontend Config

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (**noteapp-23402**)
3. Click ⚙️ → **Project Settings**
4. Scroll to **Your apps** section
5. Find the web app configuration
6. Copy these 3 values:
   - `apiKey` → `FIREBASE_API_KEY`
   - `authDomain` → `FIREBASE_AUTH_DOMAIN` (should be `noteapp-23402.firebaseapp.com`)
   - `projectId` → `FIREBASE_PROJECT_ID` (should be `noteapp-23402`)

### 3. Update Your .env File

Edit `C:\Users\91956\note-app\.env`:

```env
# Supabase Configuration
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_KEY=your_actual_supabase_anon_key_here

# Firebase Backend - Using local file
# (firebase-service-account.json already in project root - no action needed)

# Firebase Frontend Configuration
FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXX
FIREBASE_AUTH_DOMAIN=noteapp-23402.firebaseapp.com
FIREBASE_PROJECT_ID=noteapp-23402

# Server Configuration
PORT=3001
```

### 4. Restart Your Server

Stop the current server (Ctrl+C in terminal) and restart:

```bash
cd C:\Users\91956\note-app
npm start
```

## ✅ How to Verify It's Working

After restarting the server, you should see in the logs:

```
🔍 Checking environment variables...
PORT: 3001
SUPABASE_URL: ✓ Set
SUPABASE_KEY: ✓ Set
FIREBASE_SERVICE_ACCOUNT: ✗ Not set
Firebase Auth (Required):
  FIREBASE_API_KEY: ✓ Set
  FIREBASE_AUTH_DOMAIN: ✓ Set
  FIREBASE_PROJECT_ID: ✓ Set
📁 FIREBASE_SERVICE_ACCOUNT not found, trying local file...
✅ Loaded firebase-service-account.json from local file
   Project ID: noteapp-23402
✅ Firebase Admin SDK initialized successfully
✅ Server running at http://localhost:3001
📝 Note app is ready!
```

## 🔍 Testing User ID Storage

1. Sign in with Google at http://localhost:3001
2. Create a note
3. Check the server logs - you should see:
```
🔐 Verifying Firebase token...
✅ Token verified for user: your-email@gmail.com
   UID: firebase-user-id-here
📝 Creating note for user: your-email@gmail.com
   User ID: firebase-user-id-here
✅ Note created successfully with ID: 1
   Stored user_id: firebase-user-id-here
   Stored user_email: your-email@gmail.com
```

4. Check in Supabase Dashboard → **Table Editor** → **notes**
5. You should see your note with `user_id` and `user_email` filled in!

## 🐛 Troubleshooting

### Issue: "SUPABASE_URL: ✗ Not set"
**Solution:** Update .env with your actual Supabase URL

### Issue: "FIREBASE_API_KEY: ✗ Not set"
**Solution:** Update .env with your actual Firebase API key from Firebase Console

### Issue: "Error parsing FIREBASE_SERVICE_ACCOUNT"
**Solution:** Remove or comment out the FIREBASE_SERVICE_ACCOUNT line in .env (already done!)

### Issue: "User_id is still NULL in database"
**Solution:**
1. Check server logs when creating a note
2. Look for "Token verified for user:" message
3. If you don't see it, authentication is failing
4. Verify your Firebase config values are correct

### Issue: "Unauthorized - No token provided"
**Solution:**
1. Make sure you're signed in
2. Check browser console for errors
3. Verify frontend is sending Authorization header

## 📋 Quick Checklist

- [ ] Updated `SUPABASE_URL` in .env with actual value
- [ ] Updated `SUPABASE_KEY` in .env with actual value
- [ ] Updated `FIREBASE_API_KEY` in .env with actual value
- [ ] Confirmed `FIREBASE_AUTH_DOMAIN` is `noteapp-23402.firebaseapp.com`
- [ ] Confirmed `FIREBASE_PROJECT_ID` is `noteapp-23402`
- [ ] Restarted the server
- [ ] Signed in with Google successfully
- [ ] Created a test note
- [ ] Verified user_id appears in Supabase database

## 🔧 Example .env File (with real values)

```env
# Supabase Configuration
SUPABASE_URL=https://abcdefghijk.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSI...

# Firebase Frontend Configuration
FIREBASE_API_KEY=AIzaSyBcDeFgHiJkLmNoPqRsTuVwXyZ123456789
FIREBASE_AUTH_DOMAIN=noteapp-23402.firebaseapp.com
FIREBASE_PROJECT_ID=noteapp-23402

# Server Configuration
PORT=3001
```

## 💡 Pro Tip

After updating `.env`, always restart the server to load the new values!

```bash
# Stop server: Ctrl+C
# Start server:
npm start
```


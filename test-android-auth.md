# Android App 401 Unauthorized - Debug Guide

## Problem
Android app shows: **"Failed to load notes: Error 401"**

This means the Firebase ID token from Android is being rejected by the backend.

## Root Cause
Your Android app uses Firebase project: **noteapp-45c39**

But your Render backend might be configured with a **different** Firebase project or missing Firebase credentials.

## Solution

### Step 1: Verify Render Has Firebase Credentials

Go to: https://dashboard.render.com → Your service → **Environment**

**Check these variables exist:**

| Variable | What to Check |
|----------|---------------|
| `FIREBASE_SERVICE_ACCOUNT` | Should be a single-line JSON containing `"project_id": "noteapp-45c39"` |
| `FIREBASE_API_KEY` | Should match your Firebase project |
| `FIREBASE_AUTH_DOMAIN` | Should be `noteapp-45c39.firebaseapp.com` |
| `FIREBASE_PROJECT_ID` | Should be `noteapp-45c39` |

### Step 2: Get Firebase Service Account JSON

1. Go to: https://console.firebase.google.com/project/noteapp-45c39/settings/serviceaccounts
2. Click **"Generate new private key"**
3. Download the JSON file
4. **Convert to single line:**

**On Windows PowerShell:**
```powershell
Get-Content path\to\serviceAccountKey.json | ConvertFrom-Json | ConvertTo-Json -Compress
```

**On Linux/Mac:**
```bash
cat serviceAccountKey.json | jq -c
```

5. Copy the single-line JSON output

### Step 3: Update Render Environment Variables

1. Go to Render Dashboard → Your service → **Environment**
2. Find or add these variables:

**FIREBASE_SERVICE_ACCOUNT:**
```
{"type":"service_account","project_id":"noteapp-45c39",...}
```
(The entire single-line JSON)

**FIREBASE_PROJECT_ID:**
```
noteapp-45c39
```

**FIREBASE_API_KEY:**
```
AIzaSyDzZnwFt4Az6O1mvgzoZYj94ToWRxCMxX4
```

**FIREBASE_AUTH_DOMAIN:**
```
noteapp-45c39.firebaseapp.com
```

3. Click **Save Changes**
4. Render will auto-redeploy

### Step 4: Test After Deployment

Wait 2-3 minutes for Render to redeploy, then:

1. Open Android app
2. Login with Google
3. Try to view notes
4. Should work now!

### Step 5: Check Render Logs (If Still Fails)

Go to: Render Dashboard → Your service → **Logs**

Look for these messages:
- ✅ `"Firebase Admin SDK initialized successfully"`
- ❌ `"Firebase Admin SDK initialization failed"`
- ❌ `"Auth verification error"`

If you see errors about Firebase, the service account JSON is wrong or project IDs don't match.

## Quick Debug Commands

### Test if backend is receiving the token:

Check Render logs for:
```
🔐 Verifying Firebase token...
❌ Auth verification error: <error message>
```

The error message will tell you what's wrong.

### Common Errors:

**"Firebase project ID does not match"**
→ Android app uses different Firebase project than backend

**"Invalid token"**
→ Token expired or malformed (shouldn't happen with `getIdToken(true)`)

**"No service account credentials"**
→ `FIREBASE_SERVICE_ACCOUNT` not set on Render

## Android App Firebase Config

Your app uses:
- Project ID: `noteapp-45c39`
- Project Number: `520774016263`

Backend MUST use the same project.

## Verify Token in Android (Add Debug Log)

Add this to `NotesActivity.java` after line 89:

```java
String token = task.getResult().getToken();
Log.d("AUTH_TOKEN", "Token: " + token.substring(0, 50) + "...");
apiService.setAuthToken(token);
```

Check Android Studio Logcat for the token. Copy first 50 chars and search in Render logs to confirm backend received it.

## Still Not Working?

1. Check Render logs for specific error
2. Verify all environment variables are set correctly
3. Ensure Firebase project IDs match
4. Try regenerating Firebase service account key
5. Make sure both Android and backend use same Firebase project

---

**Quick Fix Checklist:**
- [ ] Firebase Service Account JSON added to Render
- [ ] FIREBASE_PROJECT_ID = `noteapp-45c39`
- [ ] Render redeployed successfully
- [ ] Render logs show "Firebase Admin SDK initialized successfully"
- [ ] Android app rebuilt and tested


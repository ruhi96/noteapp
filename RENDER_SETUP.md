# Render Deployment Setup Guide

## Issue: "Cannot find module './firebase-service-account.json'"

This error occurs when the `FIREBASE_SERVICE_ACCOUNT` environment variable is not properly set in Render.

## Solution: Set Up Environment Variables

### Step 1: Get Your Firebase Service Account JSON

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click ⚙️ (Settings) → **Project Settings**
4. Go to **Service Accounts** tab
5. Click **Generate New Private Key**
6. Download the JSON file (e.g., `your-project-firebase-adminsdk.json`)

### Step 2: Convert to Single-Line JSON

The JSON file needs to be converted to a single line for Render.

#### On Windows (PowerShell):
```powershell
Get-Content firebase-service-account.json | ConvertFrom-Json | ConvertTo-Json -Compress | Set-Clipboard
```
*This copies the single-line JSON to your clipboard*

#### On Windows (Manual):
1. Open the JSON file in a text editor
2. Remove all line breaks and extra spaces
3. Copy the entire content as one line

#### On Linux/Mac:
```bash
cat firebase-service-account.json | jq -c
```

#### Using Online Tool:
1. Go to https://www.text-utils.com/json-formatter/
2. Paste your JSON
3. Click "Minify"
4. Copy the result

### Step 3: Add Environment Variables to Render

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Select your web service
3. Go to **Environment** tab
4. Click **Add Environment Variable**
5. Add each variable:

#### Required Variables:

**Supabase:**
```
Key: SUPABASE_URL
Value: https://your-project.supabase.co
```

```
Key: SUPABASE_KEY
Value: your_supabase_anon_key
```

**Firebase Admin (Backend):**
```
Key: FIREBASE_SERVICE_ACCOUNT
Value: {"type":"service_account","project_id":"your-project",...}
```
*⚠️ Paste the entire single-line JSON from Step 2*

**Firebase Frontend:**
```
Key: FIREBASE_API_KEY
Value: AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXX
```

```
Key: FIREBASE_AUTH_DOMAIN
Value: your-project-id.firebaseapp.com
```

```
Key: FIREBASE_PROJECT_ID
Value: your-project-id
```

```
Key: FIREBASE_STORAGE_BUCKET
Value: your-project-id.appspot.com
```

```
Key: FIREBASE_MESSAGING_SENDER_ID
Value: 123456789012
```

```
Key: FIREBASE_APP_ID
Value: 1:123456789012:web:xxxxxxxxxxxxx
```

### Step 4: Save and Deploy

1. Click **Save Changes**
2. Render will automatically redeploy with the new environment variables

## Verification

After deployment, check the logs in Render:
- ✅ Should see: "Firebase initialized successfully"
- ❌ Should NOT see: "Cannot find module './firebase-service-account.json'"

## Common Issues

### Issue: "Invalid FIREBASE_SERVICE_ACCOUNT environment variable"
**Solution:** Make sure the JSON is valid and properly formatted as a single line. Verify with a JSON validator.

### Issue: "Error parsing FIREBASE_SERVICE_ACCOUNT"
**Solution:** 
- Check for special characters that might need escaping
- Ensure the entire JSON is copied (starts with `{` and ends with `}`)
- No extra quotes around the JSON string

### Issue: Firebase Admin still fails
**Solution:**
1. Verify the service account has correct permissions in Firebase
2. Check that the project_id matches your Firebase project
3. Regenerate the service account key if needed

## Testing Locally

To test with the same setup locally:

1. Copy your single-line JSON
2. Add to `.env`:
```env
FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}
```

3. Or keep using the local file:
```bash
# Place firebase-service-account.json in project root
# Server will automatically use it if FIREBASE_SERVICE_ACCOUNT env var is not set
```

## Quick Checklist

- [ ] Firebase service account JSON generated
- [ ] JSON converted to single line
- [ ] `FIREBASE_SERVICE_ACCOUNT` set in Render
- [ ] All Firebase frontend variables set (6 total)
- [ ] Supabase variables set (2 total)
- [ ] Saved changes and redeployed
- [ ] Checked deployment logs for success

## Environment Variables Summary

**Total: 9 environment variables needed**

| Category | Variables | Count |
|----------|-----------|-------|
| Supabase | SUPABASE_URL, SUPABASE_KEY | 2 |
| Firebase Admin | FIREBASE_SERVICE_ACCOUNT | 1 |
| Firebase Frontend | FIREBASE_API_KEY, FIREBASE_AUTH_DOMAIN, FIREBASE_PROJECT_ID, FIREBASE_STORAGE_BUCKET, FIREBASE_MESSAGING_SENDER_ID, FIREBASE_APP_ID | 6 |

## Support

If issues persist:
1. Check Render logs for specific error messages
2. Verify all environment variables are set correctly
3. Ensure Firebase project has authentication enabled
4. Verify Supabase database schema is correct


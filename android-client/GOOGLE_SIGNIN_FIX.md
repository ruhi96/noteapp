# Fix Google Sign-In Error 10 (DEVELOPER_ERROR)

## Root Cause
`google-services.json` has empty `oauth_client` array. This happens when:
1. SHA-1 certificate not added to Firebase
2. OAuth clients not properly configured

## Step-by-Step Fix

### 1. Get SHA-1 Debug Certificate

**Option A - Using gradlew (Recommended)**
```bash
cd "C:\Users\91956\note application\noteapp\android-client"
gradlew signingReport
```

**Option B - Using keytool**
Look for `debug.keystore` at: `C:\Users\91956\.android\debug.keystore`

Then run (adjust Java path if needed):
```bash
"%JAVA_HOME%\bin\keytool" -list -v -keystore "%USERPROFILE%\.android\debug.keystore" -alias androiddebugkey -storepass android -keypass android
```

Copy the **SHA1** fingerprint (format: `AA:BB:CC:DD:...`)

### 2. Add SHA-1 to Firebase Console

1. Go to: https://console.firebase.google.com/project/noteapp-45c39/settings/general
2. Scroll to **Your apps** section
3. Find: **com.noteapp.android** (Android app)
4. Click **Add fingerprint** button
5. Paste your SHA-1
6. Click **Save**

### 3. Configure Google Sign-In OAuth

1. Go to: https://console.firebase.google.com/project/noteapp-45c39/authentication/providers
2. Click **Google** provider
3. If disabled, click **Enable**
4. You should see:
   - **Web SDK configuration** section
   - **Web client ID** (looks like: `520774016263-xxxxx.apps.googleusercontent.com`)
5. Copy this **Web client ID**
6. Click **Save**

### 4. Get Fresh google-services.json

**CRITICAL: You must re-download after adding SHA-1**

1. Go to: https://console.firebase.google.com/project/noteapp-45c39/settings/general
2. Find your Android app: **com.noteapp.android**
3. Click the **Download** button (cloud icon with down arrow)
4. Save as: `C:\Users\91956\note application\noteapp\android-client\app\google-services.json`
5. **Overwrite** the existing file

### 5. Verify New google-services.json

Open the new file and check that `oauth_client` array is **NOT empty**:

```json
{
  "client": [
    {
      "oauth_client": [
        {
          "client_id": "520774016263-xxxxx.apps.googleusercontent.com",
          "client_type": 1,
          "android_info": {
            "package_name": "com.noteapp.android",
            "certificate_hash": "YOUR_SHA1_HERE"
          }
        },
        {
          "client_id": "520774016263-yyyyy.apps.googleusercontent.com",
          "client_type": 3
        }
      ],
      ...
    }
  ]
}
```

The `client_type: 3` entry is your **Web Client ID**.

### 6. Update Android String Resource

Edit: `android-client/app/src/main/res/values/strings.xml`

Replace line 20 with the **Web Client ID** from step 3:

```xml
<string name="default_web_client_id">520774016263-xxxxx.apps.googleusercontent.com</string>
```

### 7. Clean and Rebuild

In Android Studio:

1. **Build** → **Clean Project**
2. **Build** → **Rebuild Project**
3. **Uninstall** the existing app from device/emulator
4. **Run** the app again

### 8. Test Sign-In

The error should be gone. Google Sign-In should work!

## Still Not Working?

### Check Package Name Match
```bash
# In build.gradle.kts
namespace = "com.noteapp.android"

# In google-services.json
"package_name": "com.noteapp.android"
```

Must be identical!

### Check for Multiple Google Accounts
If testing on emulator, ensure you have a Google account added:
- Settings → Accounts → Add account → Google

### Debug Logs
Check Android Studio Logcat for detailed error:
```
Filter: GoogleSignIn
```

### Common Issues
- **Emulator**: Make sure Google Play Services is updated
- **Real Device**: Make sure date/time is correct
- **Certificate**: Debug and release certificates are different (use debug for testing)

## Project Details
- **Project ID**: noteapp-45c39
- **Project Number**: 520774016263
- **Package Name**: com.noteapp.android
- **Firebase Console**: https://console.firebase.google.com/project/noteapp-45c39

## Need Help?
Check: https://firebase.google.com/docs/auth/android/google-signin


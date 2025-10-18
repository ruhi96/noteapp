# Manual Fix for google-services.json OAuth Clients

If Firebase isn't generating OAuth clients automatically, you need to:

## 1. Get Your Web Client ID

Visit: https://console.cloud.google.com/apis/credentials?project=noteapp-45c39

You should see:
- **Web client (Auto-created by Google Service)** 
  - Copy this Client ID (format: `520774016263-xxxxx.apps.googleusercontent.com`)

If you don't see it:
1. Click **Create Credentials** → **OAuth client ID**
2. Choose **Web application**
3. Name: "Web client"
4. Click **Create**
5. Copy the Client ID

## 2. Get Your Android Client ID (Optional)

On the same page, create Android OAuth client if not exists:
1. Click **Create Credentials** → **OAuth client ID**
2. Choose **Android**
3. Package name: `com.noteapp.android`
4. SHA-1: Your debug certificate SHA-1
5. Click **Create**
6. Copy the Client ID

## 3. Manually Edit google-services.json

Replace the empty oauth_client array in your google-services.json:

```json
{
  "project_info": {
    "project_number": "520774016263",
    "project_id": "noteapp-45c39",
    "storage_bucket": "noteapp-45c39.firebasestorage.app"
  },
  "client": [
    {
      "client_info": {
        "mobilesdk_app_id": "1:520774016263:android:19ce523bfd35d635b239a2",
        "android_client_info": {
          "package_name": "com.noteapp.android"
        }
      },
      "oauth_client": [
        {
          "client_id": "520774016263-YOUR_ANDROID_CLIENT.apps.googleusercontent.com",
          "client_type": 1,
          "android_info": {
            "package_name": "com.noteapp.android",
            "certificate_hash": "YOUR_SHA1_HERE"
          }
        },
        {
          "client_id": "520774016263-YOUR_WEB_CLIENT.apps.googleusercontent.com",
          "client_type": 3
        }
      ],
      "api_key": [
        {
          "current_key": "AIzaSyDzZnwFt4Az6O1mvgzoZYj94ToWRxCMxX4"
        }
      ],
      "services": {
        "appinvite_service": {
          "other_platform_oauth_client": [
            {
              "client_id": "520774016263-YOUR_WEB_CLIENT.apps.googleusercontent.com",
              "client_type": 3
            }
          ]
        }
      }
    }
  ],
  "configuration_version": "1"
}
```

Replace:
- `YOUR_ANDROID_CLIENT` with your Android OAuth Client ID (if you created one)
- `YOUR_WEB_CLIENT` with your Web OAuth Client ID (CRITICAL - this is what you need)
- `YOUR_SHA1_HERE` with your actual SHA-1 certificate

## 4. Update strings.xml

Edit: `android-client/app/src/main/res/values/strings.xml`

```xml
<string name="default_web_client_id">520774016263-YOUR_WEB_CLIENT.apps.googleusercontent.com</string>
```

## 5. Clean and Rebuild

- Build → Clean Project
- Build → Rebuild Project
- Uninstall app
- Run again

## Important Notes

- The **Web Client ID** (client_type: 3) is MANDATORY
- The Android Client ID (client_type: 1) is optional but recommended
- Both should appear in Google Cloud Console credentials
- SHA-1 must match your debug keystore

## Quick Test

After updating, check Android Studio Logcat when signing in:
- Filter: `GoogleSignIn`
- Should NOT show error code 10


# NoteApp - Android Client

Android client for the NoteApp with Firebase Authentication, CRUD operations, file upload, and premium status display.

## Features

✅ **Firebase Google Authentication** - Secure sign-in with Google  
✅ **CRUD Operations** - Create, Read, Update, Delete notes  
✅ **File Upload** - Attach files to notes (images, PDFs, documents)  
✅ **Premium Status** - Display user subscription status (Premium/Free)  
✅ **Offline-Ready** - Works with backend API  
✅ **Modern UI** - Material Design 3 with RecyclerView

## Requirements

- **Android Studio**: Narwhal 4 Feature Drop | 2025.1.4 or later
- **Min SDK**: API 24 (Android 7.0)
- **Target SDK**: API 35 (Android 15)
- **Java Version**: 11

## Setup Instructions

### 1. Clone and Open Project

1. Open Android Studio
2. Open the `android-client` folder from the noteapp repository
3. Wait for Gradle sync to complete

### 2. Firebase Setup

#### A. Create/Configure Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Use the same Firebase project as your web app (or create new one)
3. Click "Add app" → Select Android (robot icon)

#### B. Register Android App

1. **Package Name**: `com.noteapp.android`
2. **App Nickname**: NoteApp Android (optional)
3. **SHA-1 Certificate**: Get your debug key SHA-1:

```bash
# On Windows (PowerShell)
cd %USERPROFILE%\.android
keytool -list -v -keystore debug.keystore -alias androiddebugkey -storepass android -keypass android

# On Mac/Linux
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

4. Copy the SHA-1 fingerprint and paste it in Firebase
5. Click "Register App"

#### C. Download google-services.json

1. Download `google-services.json` from Firebase Console
2. Place it in: `android-client/app/google-services.json`

**Important**: This file contains your Firebase config. Do NOT commit to Git.

#### D. Enable Google Sign-In

1. In Firebase Console → Authentication → Sign-in method
2. Enable "Google" provider
3. Save

### 3. Configure Backend URL

Edit `android-client/app/src/main/java/com/noteapp/android/Config.java`:

```java
public class Config {
    // For local testing with emulator
    public static final String BASE_URL = "http://10.0.2.2:3001";
    
    // For production (replace with your Render URL)
    // public static final String BASE_URL = "https://your-app.onrender.com";
    
    // ... rest of the file
}
```

**Testing Options:**

- **Android Emulator + Local Server**: Use `http://10.0.2.2:3001`
- **Real Device + Local Server**: Use your computer's local IP (e.g., `http://192.168.1.x:3001`)
- **Production**: Use your Render URL (e.g., `https://your-app.onrender.com`)

### 4. Build and Run

1. Connect an Android device or start an emulator
2. Click **Run** (green play button) or press `Shift + F10`
3. App will install and launch

## Project Structure

```
android-client/
├── app/
│   ├── src/main/
│   │   ├── java/com/noteapp/android/
│   │   │   ├── MainActivity.java              # Login screen
│   │   │   ├── NotesActivity.java             # Notes list with premium status
│   │   │   ├── AddEditNoteActivity.java       # Create/Edit note with file upload
│   │   │   ├── Config.java                    # Backend URL configuration
│   │   │   ├── api/
│   │   │   │   └── ApiService.java            # REST API client
│   │   │   ├── models/
│   │   │   │   ├── Note.java                  # Note model
│   │   │   │   └── SubscriptionStatus.java    # Subscription model
│   │   │   └── adapters/
│   │   │       └── NotesAdapter.java          # RecyclerView adapter
│   │   ├── res/
│   │   │   ├── layout/                        # XML layouts
│   │   │   ├── menu/                          # Menu resources
│   │   │   ├── values/                        # Strings, colors, themes
│   │   │   └── mipmap/                        # App icons
│   │   └── AndroidManifest.xml
│   ├── build.gradle.kts                        # App dependencies
│   └── google-services.json                    # Firebase config (not in git)
├── build.gradle.kts                            # Project-level Gradle
├── settings.gradle.kts                         # Gradle settings
└── README.md                                   # This file
```

## Usage

### Sign In

1. Launch app
2. Tap "Sign in with Google"
3. Select your Google account
4. Grant permissions

### Create Note

1. Tap the **+** (FAB) button
2. Enter title and content
3. (Optional) Tap "Attach File" to add an attachment
4. Tap the **Save** icon (top-right)

### Edit Note

1. Tap on a note card
2. Make changes
3. Tap **Save**

### Delete Note

1. Long-press on a note card
2. Tap "Delete" in the dialog

### View Premium Status

- Premium status is shown in a banner at the top of the notes list
- **Green "✓ Premium"** = Premium user
- **Gray "Status: Free"** = Free user

### Logout

1. Tap the menu icon (⋮) in the top-right
2. Select "Logout"

## API Endpoints Used

The Android client communicates with these backend endpoints:

| Endpoint                     | Method | Description                |
| ---------------------------- | ------ | -------------------------- |
| `/api/notes`                 | GET    | Get all user notes         |
| `/api/notes`                 | POST   | Create new note            |
| `/api/notes/:id`             | PUT    | Update existing note       |
| `/api/notes/:id`             | DELETE | Delete note                |
| `/api/upload`                | POST   | Upload file                |
| `/api/subscription-status`   | GET    | Get subscription status    |

All requests include Firebase ID token in `Authorization: Bearer <token>` header.

## Troubleshooting

### Google Sign-In Not Working

**Problem**: "Sign-in failed" or no Google accounts shown

**Solutions**:
1. Verify `google-services.json` is in `app/` folder
2. Check SHA-1 certificate fingerprint is added to Firebase
3. Enable Google Sign-In in Firebase Console → Authentication
4. Make sure you're using the correct Firebase project
5. Clear app data and try again

### Network/API Errors

**Problem**: "Failed to load notes" or connection errors

**Solutions**:
1. Check backend URL in `Config.java`
2. Ensure backend server is running
3. For emulator: Use `http://10.0.2.2:3001` (not `localhost`)
4. For real device: Use your computer's local IP address
5. Check internet permission in AndroidManifest.xml

### Build Errors

**Problem**: Gradle sync or build fails

**Solutions**:
1. File → Invalidate Caches → Invalidate and Restart
2. Delete `.gradle` and `build` folders, then sync again
3. Check you have Java 11 configured
4. Update Android Gradle Plugin if needed

### Premium Status Not Showing

**Problem**: Premium status always shows "Free" or doesn't appear

**Solutions**:
1. Check backend has `/api/subscription-status` endpoint
2. Verify user has subscription in Supabase `user_subscriptions` table
3. Check backend logs for errors
4. Ensure auth token is being sent correctly

## Testing

### Test with Android Emulator

1. Create emulator in AVD Manager (Android Studio)
2. Recommended: Pixel 5, API 35
3. Start emulator
4. Run app from Android Studio

### Test with Real Device

1. Enable Developer Options on your Android device:
   - Settings → About Phone → Tap "Build Number" 7 times
2. Enable USB Debugging:
   - Settings → Developer Options → USB Debugging
3. Connect device via USB
4. Allow USB debugging prompt on device
5. Run app from Android Studio

## Notes on Implementation

### Authentication
- Uses Firebase Auth with Google Sign-In
- ID token is automatically refreshed
- Token sent with every API request in Authorization header

### File Upload
- Uses `ACTION_GET_CONTENT` intent to pick files
- Files are temporarily copied to cache directory
- Uploaded via multipart form data to backend
- Supported file types: All (*, images, PDFs, documents, etc.)

### Premium Status
- Fetched from backend `/api/subscription-status` endpoint
- Backend checks Supabase `user_subscriptions` table
- Status displayed in colored banner (green = premium, gray = free)
- No Dodo Payments integration (as per requirements)

### Offline Support
- Currently requires internet connection
- Future enhancement: Local database with sync

## Security

✅ Firebase JWT authentication  
✅ Secure HTTPS connections (production)  
✅ User-specific data (backend enforces)  
✅ No hardcoded secrets (use google-services.json)  

## Dependencies

Key libraries used:

- **Firebase**: Authentication & Storage (BOM 33.7.0)
- **Google Play Services**: Google Sign-In (21.2.0)
- **OkHttp**: HTTP client (4.12.0)
- **Gson**: JSON parsing (2.11.0)
- **Glide**: Image loading (4.16.0)
- **Material Components**: UI components (1.12.0)

## License

MIT

## Support

For issues or questions:
1. Check Troubleshooting section above
2. Review backend logs for API errors
3. Check Firebase Console for authentication issues
4. Verify Supabase database setup

---

**Built for Android Studio Narwhal 4 Feature Drop | 2025.1.4**


# Firebase Authentication - Client-Side Implementation

This document explains the **client-side Firebase Authentication** implementation using only the Firebase Web SDK.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT SIDE (Browser)                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Firebase Web SDK (firebase/app + firebase/auth)            │
│  ├── Initialize Firebase (apiKey, authDomain, projectId)    │
│  ├── Email/Password Signup (createUserWithEmailAndPassword) │
│  ├── Email/Password Login (signInWithEmailAndPassword)      │
│  ├── Google Sign-in (signInWithPopup)                       │
│  └── Get ID Token (user.getIdToken())                       │
│                                                              │
│                          ↓ (Send JWT Token)                 │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    SERVER SIDE (Node.js)                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Firebase Admin SDK (firebase-admin)                        │
│  └── Verify ID Token (admin.auth().verifyIdToken())         │
│                                                              │
│  Backend filters notes by user.uid                          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Client-Side Implementation (Pure Firebase Web SDK)

### 1. Initialize Firebase

**File:** `public/firebase-config.js`

```javascript
// Fetch config from backend (contains only apiKey, authDomain, projectId)
const response = await fetch('/api/config/firebase');
const firebaseConfig = await response.json();

// Initialize Firebase Web SDK
firebase.initializeApp(firebaseConfig);
auth = firebase.auth();
googleProvider = new firebase.auth.GoogleAuthProvider();
```

**Required Config:**
- `apiKey` - Public API key
- `authDomain` - Auth domain (e.g., `your-app.firebaseapp.com`)
- `projectId` - Firebase project ID

**Note:** No service account needed on client side!

### 2. Email/Password Sign Up

**File:** `public/app.js`

```javascript
async signupWithEmail() {
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    
    // Firebase Web SDK method
    await auth.createUserWithEmailAndPassword(email, password);
    // User is automatically signed in after signup
}
```

**What happens:**
1. User enters email and password
2. Firebase creates account (no backend code needed)
3. Firebase automatically signs user in
4. `onAuthStateChanged` listener fires
5. App gets ID token and sends to backend

### 3. Email/Password Login

**File:** `public/app.js`

```javascript
async loginWithEmail() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    // Firebase Web SDK method
    await auth.signInWithEmailAndPassword(email, password);
    // User is now signed in
}
```

### 4. Google Sign-In

**File:** `public/app.js`

```javascript
async signInWithGoogle() {
    // Firebase Web SDK method
    await auth.signInWithPopup(googleProvider);
    // User is now signed in with Google
}
```

### 5. Auth State Listener

**File:** `public/app.js`

```javascript
auth.onAuthStateChanged(async (user) => {
    if (user) {
        // User is signed in
        this.authToken = await user.getIdToken();
        // Use token to make authenticated API calls
    } else {
        // User is signed out
        this.showAuthScreen();
    }
});
```

### 6. Making Authenticated API Calls

```javascript
// Get fresh token
const token = await this.currentUser.getIdToken();

// Send to backend
const response = await fetch('/api/notes', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`  // JWT token
    },
    body: JSON.stringify({ title, content })
});
```

## Backend Verification (Why We Need It)

The backend uses **Firebase Admin SDK** to:
1. Verify the JWT token is valid
2. Extract user ID (uid) from token
3. Filter Supabase queries by user ID
4. Ensure users only see their own notes

**Backend code:**
```javascript
// Verify token (Firebase Admin SDK)
const decodedToken = await admin.auth().verifyIdToken(token);
const userId = decodedToken.uid;

// Query Supabase with user filter
const { data } = await supabase
    .from('notes')
    .select('*')
    .eq('user_id', userId);  // Only get this user's notes
```

## Firebase Configuration

### Required Environment Variables

**Client-side (3 variables):**
- `FIREBASE_API_KEY` - Public API key
- `FIREBASE_AUTH_DOMAIN` - Auth domain
- `FIREBASE_PROJECT_ID` - Project ID

**Server-side (1 variable):**
- `FIREBASE_SERVICE_ACCOUNT` - Service account JSON (for Admin SDK)

### Where to Get Them

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click ⚙️ → **Project Settings**
4. Scroll to **Your apps** section
5. Copy the config values

## Security Notes

### ✅ Safe to Expose (Client-side)
- `apiKey` - Not a secret, identifies your Firebase project
- `authDomain` - Public domain for authentication
- `projectId` - Public project identifier

### ❌ Never Expose (Server-side only)
- Service Account JSON - Contains private key
- Firebase Admin SDK credentials

## Authentication Flow

```
User Action (Client)
    ↓
Firebase Auth (Client SDK)
    ├── Creates account / Signs in
    ├── Returns Firebase User object
    └── Generates ID Token (JWT)
    ↓
App gets token: user.getIdToken()
    ↓
Send token to Backend API
    ↓
Backend verifies token (Admin SDK)
    ↓
Backend filters data by user.uid
    ↓
Response sent back to client
```

## Key Points

1. **No backend code needed for authentication** - Firebase handles it
2. **Client uses Web SDK** - `firebase/app` and `firebase/auth`
3. **Backend uses Admin SDK** - Only for verifying tokens
4. **Tokens are secure** - Short-lived JWT tokens
5. **User data is isolated** - Backend filters by user.uid

## Methods Used (Firebase Web SDK)

| Method | Purpose | Code |
|--------|---------|------|
| Initialize | Setup Firebase | `firebase.initializeApp(config)` |
| Email Signup | Create account | `auth.createUserWithEmailAndPassword(email, pass)` |
| Email Login | Sign in | `auth.signInWithEmailAndPassword(email, pass)` |
| Google Sign-in | OAuth | `auth.signInWithPopup(googleProvider)` |
| Get Token | For API calls | `user.getIdToken()` |
| Sign Out | Logout | `auth.signOut()` |
| Auth Listener | Monitor state | `auth.onAuthStateChanged(callback)` |

## Files Structure

```
public/
├── firebase-config.js     # Initialize Firebase Web SDK
├── app.js                 # Auth methods (signup, login, Google)
├── index.html            # Auth UI (forms, buttons)
└── styles.css            # Auth styling

server.js                 # Backend token verification (Admin SDK)
```

## Testing

1. **Sign Up:** Enter email and password → Account created
2. **Login:** Use same credentials → Logged in
3. **Google:** Click Google button → OAuth flow → Signed in
4. **Create Note:** Token sent to backend → Note saved with user_id
5. **Sign Out:** Click sign out → Returned to login screen

## References

- [Firebase Web SDK Docs](https://firebase.google.com/docs/web/setup)
- [Firebase Auth Guide](https://firebase.google.com/docs/auth/web/start)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)


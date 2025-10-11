# Note App - Full Stack with Firebase Auth + Supabase

A secure note-taking app with **Firebase Google Authentication**, **Node.js/Express backend**, **Supabase database**, and **vanilla JavaScript frontend**. Deployable to Render.

## Tech Stack

**Backend:**
- Node.js + Express.js
- Firebase Admin SDK (Authentication)
- Supabase (PostgreSQL Database)

**Frontend:**
- HTML5, CSS3, Vanilla JavaScript
- Firebase Auth SDK

**Deployment:**
- Render

## Features

- 🔐 Google Sign-in with Firebase Auth
- ✍️ Create and read notes
- 👤 User-specific notes (each user sees only their notes)
- 💾 Persistent storage with Supabase
- 🚀 RESTful API with JWT verification
- 🎨 Modern, responsive UI
- ☁️ Deploy to Render

## Local Development Setup

### 1. Clone the Repository

```bash
git clone https://github.com/ruhi96/noteapp.git
cd noteapp
npm install
```

### 2. Set Up Firebase

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or use existing
3. Enable **Authentication** → **Google Sign-in**
4. Get Web App Config:
   - Project Settings → Your apps → Web app
   - Copy the config object
5. Update `public/firebase-config.js` with your config:

```javascript
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};
```

6. Generate Service Account Key:
   - Project Settings → Service Accounts
   - Click "Generate New Private Key"
   - Save as `firebase-service-account.json` in project root

### 3. Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and create a project
2. In SQL Editor, run the schema from `supabase-schema.sql`
3. Get credentials from Project Settings → API

### 4. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env`:
```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_key
PORT=3001
```

### 5. Start the Server

```bash
npm start
```

Open browser: **http://localhost:3001**

## Deploy to Render

### Step 1: Prepare Firebase Service Account

Convert your `firebase-service-account.json` to a single-line string:

```bash
# On Linux/Mac:
cat firebase-service-account.json | jq -c

# On Windows PowerShell:
Get-Content firebase-service-account.json | ConvertFrom-Json | ConvertTo-Json -Compress
```

### Step 2: Deploy to Render

#### Option A: Using render.yaml (Automatic)

1. Push code to GitHub
2. Go to [Render Dashboard](https://dashboard.render.com/)
3. New → Blueprint
4. Connect your GitHub repo
5. Add environment variables:
   - `SUPABASE_URL`: Your Supabase project URL
   - `SUPABASE_KEY`: Your Supabase anon key
   - `FIREBASE_SERVICE_ACCOUNT`: Single-line JSON string from Step 1
6. Click **Apply**

#### Option B: Manual Setup

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. New → Web Service
3. Connect GitHub repository
4. Configure:
   - **Name**: note-app
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Add environment variables (same as Option A)
6. Create Web Service

Your app will be live at: `https://your-app-name.onrender.com`

### Step 3: Update Firebase Auth Domain

Add your Render URL to Firebase:
1. Firebase Console → Authentication → Settings
2. Authorized domains → Add domain
3. Add: `your-app-name.onrender.com`

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/notes` | Required | Get user's notes |
| POST | `/api/notes` | Required | Create new note |

### Example Request

```bash
# Get auth token from Firebase
TOKEN="your_firebase_id_token"

# Create a note
curl -X POST https://your-app.onrender.com/api/notes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title":"My Note","content":"Note content"}'

# Get all notes
curl https://your-app.onrender.com/api/notes \
  -H "Authorization: Bearer $TOKEN"
```

## Project Structure

```
note-app/
├── server.js                          # Express backend with auth
├── package.json                       # Dependencies
├── .env                               # Environment variables (not in git)
├── .env.example                       # Environment template
├── firebase-service-account.json      # Firebase admin key (not in git)
├── firebase-service-account.example.json  # Template
├── render.yaml                        # Render deployment config
├── supabase-schema.sql               # Database schema with user_id
├── public/
│   ├── index.html                    # Frontend with auth UI
│   ├── styles.css                    # Styling with auth screens
│   ├── app.js                        # Frontend JS with auth logic
│   └── firebase-config.js            # Firebase client config
└── README.md                         # Documentation
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `SUPABASE_URL` | Supabase project URL | Yes |
| `SUPABASE_KEY` | Supabase anon/public key | Yes |
| `FIREBASE_SERVICE_ACCOUNT` | Firebase service account JSON (single-line for Render) | Yes (production) |
| `PORT` | Server port | No (default: 3001) |

## Security

- ✅ Firebase JWT token verification on backend
- ✅ User-specific data filtering
- ✅ Supabase Row Level Security
- ✅ Environment variables for secrets
- ✅ HTTPS on Render deployment

## Database Schema

The `notes` table includes:
- `id`: Primary key
- `title`: Note title
- `content`: Note content
- `user_id`: Firebase user UID
- `user_email`: User email (optional)
- `created_at`: Timestamp

Each user can only access their own notes.

## Troubleshooting

### Firebase Auth Error
- Check Firebase config in `firebase-config.js`
- Verify authorized domains in Firebase Console
- Ensure service account JSON is valid

### Supabase Connection Error
- Verify SUPABASE_URL and SUPABASE_KEY
- Check if schema is properly set up
- Ensure RLS policies allow backend operations

### Render Deployment Error
- Check environment variables are set correctly
- Verify FIREBASE_SERVICE_ACCOUNT is single-line JSON
- Check Render logs for specific errors

## License

MIT

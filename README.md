# Note App - Full Stack JavaScript with Supabase

A simple note-taking app with **Node.js/Express backend**, **Supabase database**, and **vanilla JavaScript frontend**. Deployable to Render.

## Tech Stack

**Backend:**
- Node.js
- Express.js
- Supabase (PostgreSQL)

**Frontend:**
- HTML5
- CSS3
- Vanilla JavaScript

**Deployment:**
- Render

## Features

- ✍️ Create notes with title and content
- 📖 Read all saved notes
- 💾 Persistent storage with Supabase
- 🚀 RESTful API
- 🎨 Modern, responsive UI
- ☁️ Deploy to Render

## Local Development Setup

### 1. Clone the Repository

```bash
git clone https://github.com/ruhi96/noteapp.git
cd noteapp
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. In the SQL Editor, run the schema from `supabase-schema.sql`:

```sql
CREATE TABLE IF NOT EXISTS notes (
    id BIGSERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for notes" ON notes
    FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes(created_at DESC);
```

3. Get your Supabase credentials:
   - Go to Project Settings → API
   - Copy the **Project URL** and **anon/public key**

### 4. Configure Environment Variables

Copy `.env.example` to `.env` and add your Supabase credentials:

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

Open browser to: **http://localhost:3001**

## Deploy to Render

### Option 1: Using render.yaml (Recommended)

1. Push your code to GitHub
2. Go to [Render Dashboard](https://dashboard.render.com/)
3. Click **New** → **Blueprint**
4. Connect your GitHub repository
5. Render will automatically detect `render.yaml`
6. Add environment variables:
   - `SUPABASE_URL`: Your Supabase project URL
   - `SUPABASE_KEY`: Your Supabase anon key
7. Click **Apply**

### Option 2: Manual Setup

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **New** → **Web Service**
3. Connect your GitHub repository
4. Configure:
   - **Name**: note-app
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Add environment variables:
   - `SUPABASE_URL`: Your Supabase project URL
   - `SUPABASE_KEY`: Your Supabase anon key
6. Click **Create Web Service**

Your app will be live at: `https://your-app-name.onrender.com`

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notes` | Get all notes |
| POST | `/api/notes` | Create a new note |

### Example Request

```bash
# Create a note
curl -X POST http://localhost:3001/api/notes \
  -H "Content-Type: application/json" \
  -d '{"title":"My Note","content":"This is my note content"}'

# Get all notes
curl http://localhost:3001/api/notes
```

## Project Structure

```
note-app/
├── server.js              # Express backend with Supabase
├── package.json           # Dependencies
├── .env                   # Environment variables (not in git)
├── .env.example           # Environment variables template
├── render.yaml            # Render deployment config
├── supabase-schema.sql    # Database schema
├── public/
│   ├── index.html        # Frontend HTML
│   ├── styles.css        # Styling
│   └── app.js            # Frontend JavaScript
└── README.md             # Documentation
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_KEY` | Your Supabase anon/public key |
| `PORT` | Server port (default: 3001) |

## Contributing

Feel free to fork and submit pull requests!

## License

MIT

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// In-memory storage (replace with database in production)
let notes = [];
let nextId = 1;

// API Routes

// Get all notes
app.get('/api/notes', (req, res) => {
    res.json(notes);
});

// Create a new note
app.post('/api/notes', (req, res) => {
    const { title, content } = req.body;
    
    if (!title || !content) {
        return res.status(400).json({ error: 'Title and content are required' });
    }
    
    const note = {
        id: nextId++,
        title,
        content,
        createdAt: new Date().toISOString()
    };
    
    notes.unshift(note);
    res.status(201).json(note);
});

// Serve frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
    console.log(`📝 Note app is ready!`);
});


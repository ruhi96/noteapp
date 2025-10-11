require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const admin = require('firebase-admin');

const app = express();
const PORT = process.env.PORT || 3001;

// Check required environment variables
console.log('🔍 Checking environment variables...');
console.log('PORT:', PORT);
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? '✓ Set' : '✗ Not set');
console.log('SUPABASE_KEY:', process.env.SUPABASE_KEY ? '✓ Set' : '✗ Not set');
console.log('FIREBASE_SERVICE_ACCOUNT:', process.env.FIREBASE_SERVICE_ACCOUNT ? '✓ Set' : '✗ Not set');
console.log('FIREBASE_API_KEY:', process.env.FIREBASE_API_KEY ? '✓ Set' : '✗ Not set');
console.log('FIREBASE_AUTH_DOMAIN:', process.env.FIREBASE_AUTH_DOMAIN ? '✓ Set' : '✗ Not set');
console.log('FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID ? '✓ Set' : '✗ Not set');

// Initialize Firebase Admin
let serviceAccount;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    // Production: Use environment variable (JSON string)
    console.log('📦 Loading Firebase Admin from FIREBASE_SERVICE_ACCOUNT environment variable...');
    try {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        console.log('✅ Firebase service account parsed successfully');
        console.log('   Project ID:', serviceAccount.project_id);
    } catch (error) {
        console.error('❌ Error parsing FIREBASE_SERVICE_ACCOUNT:', error.message);
        console.error('⚠️  Make sure the environment variable contains valid JSON');
        throw new Error('Invalid FIREBASE_SERVICE_ACCOUNT environment variable. Must be valid JSON.');
    }
} else {
    // Development: Try to load from local file
    console.log('📁 FIREBASE_SERVICE_ACCOUNT not found, trying local file...');
    try {
        serviceAccount = require('./firebase-service-account.json');
        console.log('✅ Loaded firebase-service-account.json from local file');
    } catch (error) {
        console.error('❌ Firebase service account not found!');
        console.error('');
        console.error('🔧 TO FIX THIS IN RENDER:');
        console.error('   1. Go to Render Dashboard → Your Service → Environment');
        console.error('   2. Add environment variable:');
        console.error('      Key: FIREBASE_SERVICE_ACCOUNT');
        console.error('      Value: Your Firebase service account JSON (single line)');
        console.error('');
        console.error('🔧 TO FIX THIS LOCALLY:');
        console.error('   1. Download service account JSON from Firebase Console');
        console.error('   2. Save as firebase-service-account.json in project root');
        console.error('   OR');
        console.error('   3. Add FIREBASE_SERVICE_ACCOUNT to your .env file');
        console.error('');
        throw new Error('Firebase Admin SDK initialization failed: No service account credentials found.');
    }
}

try {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    console.log('✅ Firebase Admin SDK initialized successfully');
} catch (error) {
    console.error('❌ Failed to initialize Firebase Admin SDK:', error.message);
    throw error;
}

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Auth middleware
async function authenticateUser(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        
        const token = authHeader.split('Bearer ')[1];
        const decodedToken = await admin.auth().verifyIdToken(token);
        
        req.user = {
            uid: decodedToken.uid,
            email: decodedToken.email,
            name: decodedToken.name
        };
        
        next();
    } catch (error) {
        console.error('Auth error:', error);
        return res.status(401).json({ error: 'Unauthorized' });
    }
}

// API Routes

// Get Firebase configuration for frontend
app.get('/api/config/firebase', (req, res) => {
    const firebaseConfig = {
        apiKey: process.env.FIREBASE_API_KEY,
        authDomain: process.env.FIREBASE_AUTH_DOMAIN,
        projectId: process.env.FIREBASE_PROJECT_ID,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.FIREBASE_APP_ID
    };
    
    res.json(firebaseConfig);
});

// Get all notes for authenticated user
app.get('/api/notes', authenticateUser, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('notes')
            .select('*')
            .eq('user_id', req.user.uid)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        res.json(data);
    } catch (error) {
        console.error('Error fetching notes:', error);
        res.status(500).json({ error: 'Failed to fetch notes' });
    }
});

// Create a new note for authenticated user
app.post('/api/notes', authenticateUser, async (req, res) => {
    try {
        const { title, content } = req.body;
        
        if (!title || !content) {
            return res.status(400).json({ error: 'Title and content are required' });
        }
        
        const { data, error } = await supabase
            .from('notes')
            .insert([{ 
                title, 
                content, 
                user_id: req.user.uid,
                user_email: req.user.email 
            }])
            .select()
            .single();
        
        if (error) throw error;
        
        res.status(201).json(data);
    } catch (error) {
        console.error('Error creating note:', error);
        res.status(500).json({ error: 'Failed to create note' });
    }
});

// Serve frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
    console.log(`📝 Note app is ready!`);
});


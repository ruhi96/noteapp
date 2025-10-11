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
console.log('Firebase Auth (Required):');
console.log('  FIREBASE_API_KEY:', process.env.FIREBASE_API_KEY ? '✓ Set' : '✗ Not set');
console.log('  FIREBASE_AUTH_DOMAIN:', process.env.FIREBASE_AUTH_DOMAIN ? '✓ Set' : '✗ Not set');
console.log('  FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID ? '✓ Set' : '✗ Not set');

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
const supabaseStorageEndpoint = process.env.SUPABASE_STORAGE_ENDPOINT;

console.log('📦 Supabase Configuration:');
console.log('   URL:', supabaseUrl);
console.log('   Storage Endpoint:', supabaseStorageEndpoint);

const supabase = createClient(supabaseUrl, supabaseKey);

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increase limit for file uploads
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static('public'));

// Auth middleware
async function authenticateUser(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            console.error('❌ No authorization header found');
            return res.status(401).json({ error: 'Unauthorized - No token provided' });
        }
        
        const token = authHeader.split('Bearer ')[1];
        console.log('🔐 Verifying Firebase token...');
        
        const decodedToken = await admin.auth().verifyIdToken(token);
        
        req.user = {
            uid: decodedToken.uid,
            email: decodedToken.email,
            name: decodedToken.name
        };
        
        console.log('✅ Token verified for user:', req.user.email);
        console.log('   UID:', req.user.uid);
        
        next();
    } catch (error) {
        console.error('❌ Auth verification error:', error.message);
        return res.status(401).json({ error: 'Unauthorized - Invalid token' });
    }
}

// API Routes

// Get Firebase configuration for frontend
app.get('/api/config/firebase', (req, res) => {
    // Only include essential Firebase Auth configuration
    const firebaseConfig = {
        apiKey: process.env.FIREBASE_API_KEY,
        authDomain: process.env.FIREBASE_AUTH_DOMAIN,
        projectId: process.env.FIREBASE_PROJECT_ID
    };
    
    // Validate required fields
    if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId) {
        console.error('❌ Missing required Firebase configuration!');
        console.error('   Required: FIREBASE_API_KEY, FIREBASE_AUTH_DOMAIN, FIREBASE_PROJECT_ID');
        return res.status(500).json({ 
            error: 'Firebase configuration incomplete. Please contact administrator.' 
        });
    }
    
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

// Upload file to Supabase Storage (mapped to note)
app.post('/api/upload', authenticateUser, async (req, res) => {
    try {
        const { fileName, fileData, fileType, noteId } = req.body;
        
        if (!fileName || !fileData) {
            return res.status(400).json({ error: 'File name and data are required' });
        }
        
        // Convert base64 to buffer
        const base64Data = fileData.split(',')[1];
        const buffer = Buffer.from(base64Data, 'base64');
        
        // Generate unique file path mapped to note
        // Format: userId/noteId/timestamp-filename (if noteId provided)
        // Format: userId/temp/timestamp-filename (if no noteId yet)
        const timestamp = Date.now();
        const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
        const folder = noteId || 'temp';
        const filePath = `${req.user.uid}/${folder}/${timestamp}-${sanitizedFileName}`;
        
        console.log('📤 Uploading file to Supabase Storage:');
        console.log('   Endpoint:', supabaseStorageEndpoint);
        console.log('   Path:', filePath);
        console.log('   Size:', buffer.length, 'bytes');
        
        // Upload to Supabase Storage at the specific endpoint
        const { data, error } = await supabase.storage
            .from('Note app')
            .upload(filePath, buffer, {
                contentType: fileType,
                upsert: false
            });
        
        if (error) {
            console.error('❌ Supabase storage error:', error);
            throw error;
        }
        
        // Get public URL using the storage endpoint
        const { data: { publicUrl } } = supabase.storage
            .from('Note app')
            .getPublicUrl(filePath);
        
        console.log('✅ File uploaded successfully');
        console.log('   Storage path:', filePath);
        console.log('   Public URL:', publicUrl);
        
        res.json({
            success: true,
            url: publicUrl,
            path: filePath,
            name: fileName,
            size: buffer.length,
            type: fileType,
            storageEndpoint: supabaseStorageEndpoint
        });
        
    } catch (error) {
        console.error('Error uploading file:', error);
        res.status(500).json({ error: 'Failed to upload file: ' + error.message });
    }
});

// Create a new note for authenticated user
app.post('/api/notes', authenticateUser, async (req, res) => {
    try {
        const { title, content, attachments } = req.body;
        
        if (!title || !content) {
            return res.status(400).json({ error: 'Title and content are required' });
        }
        
        const noteData = { 
            title, 
            content, 
            user_id: req.user.uid,
            user_email: req.user.email,
            attachments: attachments || []
        };
        
        console.log('📝 Creating note for user:', req.user.email);
        console.log('   User ID:', req.user.uid);
        console.log('   Attachments:', attachments?.length || 0);
        
        const { data, error } = await supabase
            .from('notes')
            .insert([noteData])
            .select()
            .single();
        
        if (error) {
            console.error('❌ Supabase insert error:', error);
            throw error;
        }
        
        console.log('✅ Note created successfully with ID:', data.id);
        console.log('   Stored user_id:', data.user_id);
        console.log('   Stored user_email:', data.user_email);
        
        res.status(201).json(data);
    } catch (error) {
        console.error('Error creating note:', error);
        res.status(500).json({ error: 'Failed to create note: ' + error.message });
    }
});

// Update note attachments
app.patch('/api/notes/:id', authenticateUser, async (req, res) => {
    try {
        const noteId = req.params.id;
        const { attachments } = req.body;
        
        console.log('📝 Updating note ID:', noteId, 'with', attachments?.length || 0, 'attachments');
        
        const { data, error } = await supabase
            .from('notes')
            .update({ attachments })
            .eq('id', noteId)
            .eq('user_id', req.user.uid)  // Ensure user owns the note
            .select()
            .single();
        
        if (error) {
            console.error('❌ Supabase update error:', error);
            throw error;
        }
        
        console.log('✅ Note updated with attachments');
        
        res.json(data);
    } catch (error) {
        console.error('Error updating note:', error);
        res.status(500).json({ error: 'Failed to update note: ' + error.message });
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


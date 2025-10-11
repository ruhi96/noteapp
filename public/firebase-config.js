// Firebase Configuration
// Fetched from backend environment variables
// Only using Firebase Authentication (Google Sign-in)

let auth;
let googleProvider;

// Fetch Firebase config from backend and initialize
async function initializeFirebase() {
    try {
        const response = await fetch('/api/config/firebase');
        
        if (!response.ok) {
            throw new Error('Failed to fetch Firebase configuration');
        }
        
        const firebaseConfig = await response.json();
        
        // Validate required fields for Firebase Auth
        if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId) {
            throw new Error('Incomplete Firebase configuration received');
        }
        
        console.log('📦 Firebase config received:', {
            apiKey: firebaseConfig.apiKey ? '✓' : '✗',
            authDomain: firebaseConfig.authDomain ? '✓' : '✗',
            projectId: firebaseConfig.projectId ? '✓' : '✗'
        });
        
        // Initialize Firebase with minimal config (Auth only)
        firebase.initializeApp(firebaseConfig);
        auth = firebase.auth();
        googleProvider = new firebase.auth.GoogleAuthProvider();
        
        console.log('✅ Firebase Authentication initialized successfully');
        
        // Dispatch custom event to notify app that Firebase is ready
        window.dispatchEvent(new Event('firebaseReady'));
    } catch (error) {
        console.error('❌ Failed to initialize Firebase:', error);
        alert('Failed to load authentication. Please refresh the page.');
    }
}

// Initialize Firebase when script loads
initializeFirebase();


// Firebase Configuration
// Fetched from backend environment variables

let auth;
let googleProvider;

// Fetch Firebase config from backend and initialize
async function initializeFirebase() {
    try {
        const response = await fetch('/api/config/firebase');
        const firebaseConfig = await response.json();
        
        // Initialize Firebase with config from backend
        firebase.initializeApp(firebaseConfig);
        auth = firebase.auth();
        googleProvider = new firebase.auth.GoogleAuthProvider();
        
        console.log('Firebase initialized successfully');
        
        // Dispatch custom event to notify app that Firebase is ready
        window.dispatchEvent(new Event('firebaseReady'));
    } catch (error) {
        console.error('Failed to initialize Firebase:', error);
        alert('Failed to load authentication. Please refresh the page.');
    }
}

// Initialize Firebase when script loads
initializeFirebase();


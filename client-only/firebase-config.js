// Firebase Configuration - Client-Side Only
// NO SERVICE ACCOUNT, NO ADMIN SDK, NO BACKEND

// Replace these with your Firebase project credentials
const firebaseConfig = {
    apiKey: "YOUR_FIREBASE_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID"
};

console.log('🔧 Initializing Firebase (Client-Side Only)...');

// Initialize Firebase Web SDK
firebase.initializeApp(firebaseConfig);

// Initialize Firebase Authentication
const auth = firebase.auth();
const googleProvider = new firebase.auth.GoogleAuthProvider();

// Initialize Firebase Firestore (for storing notes)
const db = firebase.firestore();

console.log('✅ Firebase initialized successfully');
console.log('   Auth: Ready');
console.log('   Firestore: Ready');
console.log('   Mode: Client-Side Only (No Backend)');


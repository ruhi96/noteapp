// Note App - Pure Client-Side Implementation
// Using Firebase Auth + Firestore (NO BACKEND, NO ADMIN SDK)

class NoteApp {
    constructor() {
        this.currentUser = null;
        this.init();
    }

    async init() {
        console.log('🚀 Starting Note App (Client-Side Only)');
        
        // Set up auth state observer
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                console.log('✅ User authenticated:', user.email);
                await this.handleAuthenticatedUser(user);
            } else {
                console.log('❌ User not authenticated');
                this.showAuthScreen();
            }
        });

        // Set up auth screen listeners
        this.setupAuthListeners();
    }

    setupAuthListeners() {
        // Tab switching
        document.getElementById('loginTab').addEventListener('click', () => this.switchTab('login'));
        document.getElementById('signupTab').addEventListener('click', () => this.switchTab('signup'));
        
        // Email/Password authentication
        document.getElementById('emailLoginBtn').addEventListener('click', () => this.loginWithEmail());
        document.getElementById('emailSignupBtn').addEventListener('click', () => this.signupWithEmail());
        
        // Google authentication
        document.getElementById('googleSignIn').addEventListener('click', () => this.signInWithGoogle());
        
        // Sign out
        document.getElementById('signOutBtn').addEventListener('click', () => this.signOut());
        
        // Enter key handlers
        document.getElementById('loginPassword').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.loginWithEmail();
        });
        document.getElementById('signupPasswordConfirm').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.signupWithEmail();
        });
    }

    switchTab(tab) {
        const loginTab = document.getElementById('loginTab');
        const signupTab = document.getElementById('signupTab');
        const loginForm = document.getElementById('loginForm');
        const signupForm = document.getElementById('signupForm');
        
        if (tab === 'login') {
            loginTab.classList.add('active');
            signupTab.classList.remove('active');
            loginForm.style.display = 'flex';
            signupForm.style.display = 'none';
            this.clearErrors();
        } else {
            signupTab.classList.add('active');
            loginTab.classList.remove('active');
            signupForm.style.display = 'flex';
            loginForm.style.display = 'none';
            this.clearErrors();
        }
    }

    clearErrors() {
        document.getElementById('loginError').textContent = '';
        document.getElementById('signupError').textContent = '';
    }

    // === FIREBASE AUTH METHODS (CLIENT-SIDE) ===

    // Email/Password Sign Up
    async signupWithEmail() {
        const email = document.getElementById('signupEmail').value.trim();
        const password = document.getElementById('signupPassword').value;
        const passwordConfirm = document.getElementById('signupPasswordConfirm').value;
        const errorDiv = document.getElementById('signupError');
        
        errorDiv.textContent = '';
        
        if (!email || !password || !passwordConfirm) {
            errorDiv.textContent = 'Please fill in all fields';
            return;
        }
        
        if (password !== passwordConfirm) {
            errorDiv.textContent = 'Passwords do not match';
            return;
        }
        
        if (password.length < 6) {
            errorDiv.textContent = 'Password must be at least 6 characters';
            return;
        }
        
        try {
            // Firebase Web SDK - Create user
            await auth.createUserWithEmailAndPassword(email, password);
            console.log('✅ User created:', email);
        } catch (error) {
            console.error('Signup error:', error);
            errorDiv.textContent = this.getErrorMessage(error);
        }
    }

    // Email/Password Login
    async loginWithEmail() {
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;
        const errorDiv = document.getElementById('loginError');
        
        errorDiv.textContent = '';
        
        if (!email || !password) {
            errorDiv.textContent = 'Please enter email and password';
            return;
        }
        
        try {
            // Firebase Web SDK - Sign in
            await auth.signInWithEmailAndPassword(email, password);
            console.log('✅ Logged in:', email);
        } catch (error) {
            console.error('Login error:', error);
            errorDiv.textContent = this.getErrorMessage(error);
        }
    }

    // Google Sign-in
    async signInWithGoogle() {
        try {
            // Firebase Web SDK - Google popup
            await auth.signInWithPopup(googleProvider);
            console.log('✅ Signed in with Google');
        } catch (error) {
            console.error('Google sign-in error:', error);
            alert('Failed to sign in with Google. Please try again.');
        }
    }

    // Sign Out
    async signOut() {
        try {
            await auth.signOut();
            this.currentUser = null;
            console.log('✅ Signed out');
        } catch (error) {
            console.error('Sign out error:', error);
            alert('Failed to sign out. Please try again.');
        }
    }

    getErrorMessage(error) {
        switch (error.code) {
            case 'auth/email-already-in-use':
                return 'This email is already registered';
            case 'auth/invalid-email':
                return 'Invalid email address';
            case 'auth/user-not-found':
                return 'No account found with this email';
            case 'auth/wrong-password':
                return 'Incorrect password';
            case 'auth/weak-password':
                return 'Password is too weak';
            case 'auth/too-many-requests':
                return 'Too many attempts. Please try again later';
            default:
                return error.message || 'Authentication failed';
        }
    }

    // === APP STATE MANAGEMENT ===

    async handleAuthenticatedUser(user) {
        this.currentUser = user;
        
        // Show app screen
        this.showAppScreen();
        
        // Display user info
        document.getElementById('userName').textContent = user.displayName || user.email;
        document.getElementById('userPhoto').src = user.photoURL || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.email);
        
        // Initialize app components
        this.initializeAppComponents();
        
        // Load notes from Firestore
        await this.loadNotes();
    }

    showAuthScreen() {
        document.getElementById('authScreen').style.display = 'flex';
        document.getElementById('appScreen').style.display = 'none';
    }

    showAppScreen() {
        document.getElementById('authScreen').style.display = 'none';
        document.getElementById('appScreen').style.display = 'block';
    }

    initializeAppComponents() {
        // Get DOM elements
        this.noteTitle = document.getElementById('noteTitle');
        this.noteContent = document.getElementById('noteContent');
        this.addNoteBtn = document.getElementById('addNote');
        this.notesList = document.getElementById('notesList');

        // Add event listeners
        this.addNoteBtn.addEventListener('click', () => this.createNote());
        
        this.noteTitle.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.noteContent.focus();
            }
        });
    }

    // === FIRESTORE OPERATIONS (CLIENT-SIDE) ===

    // Create Note
    async createNote() {
        const title = this.noteTitle.value.trim();
        const content = this.noteContent.value.trim();

        if (!title || !content) {
            alert('Please fill in both title and content');
            return;
        }

        try {
            // Firebase Firestore - Add document
            await db.collection('notes').add({
                userId: this.currentUser.uid,
                userEmail: this.currentUser.email,
                title: title,
                content: content,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            console.log('✅ Note created');
            
            // Clear form
            this.noteTitle.value = '';
            this.noteContent.value = '';
            this.noteTitle.focus();

            // Notes will auto-update via realtime listener
        } catch (error) {
            console.error('Error creating note:', error);
            alert('Failed to create note. Please try again.');
        }
    }

    // Load Notes with Real-time Updates
    async loadNotes() {
        try {
            // Firebase Firestore - Real-time listener
            // Only get notes for current user
            this.unsubscribe = db.collection('notes')
                .where('userId', '==', this.currentUser.uid)
                .orderBy('createdAt', 'desc')
                .onSnapshot((snapshot) => {
                    const notes = [];
                    snapshot.forEach((doc) => {
                        notes.push({
                            id: doc.id,
                            ...doc.data()
                        });
                    });
                    
                    console.log(`📝 Loaded ${notes.length} notes`);
                    this.displayNotes(notes);
                }, (error) => {
                    console.error('Error loading notes:', error);
                    this.notesList.innerHTML = `
                        <div class="empty-state">
                            <p>Failed to load notes. Please refresh the page.</p>
                        </div>
                    `;
                });

        } catch (error) {
            console.error('Error setting up notes listener:', error);
        }
    }

    displayNotes(notes) {
        this.notesList.innerHTML = '';

        if (notes.length === 0) {
            this.notesList.innerHTML = `
                <div class="empty-state">
                    <p>No notes yet. Create your first note!</p>
                </div>
            `;
            return;
        }

        notes.forEach(note => {
            const noteCard = this.createNoteCard(note);
            this.notesList.appendChild(noteCard);
        });
    }

    createNoteCard(note) {
        const card = document.createElement('div');
        card.className = 'note-card';
        
        let formattedDate = 'Just now';
        if (note.createdAt) {
            const date = note.createdAt.toDate();
            formattedDate = date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }

        card.innerHTML = `
            <h3>${this.escapeHtml(note.title)}</h3>
            <p>${this.escapeHtml(note.content)}</p>
            <span class="note-date">${formattedDate}</span>
        `;

        return card;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    console.log('📱 Note App Starting (Client-Side Only)');
    new NoteApp();
});


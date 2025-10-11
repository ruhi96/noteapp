// Note App - Frontend JavaScript with Firebase Auth and API calls

class NoteApp {
    constructor() {
        this.apiUrl = '/api/notes';
        this.currentUser = null;
        this.authToken = null;
        this.init();
    }

    async init() {
        // Wait for Firebase to initialize from backend config
        await this.waitForFirebase();
        
        // Set up auth state observer
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                await this.handleAuthenticatedUser(user);
            } else {
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

    waitForFirebase() {
        return new Promise((resolve) => {
            if (typeof firebase !== 'undefined' && typeof auth !== 'undefined' && auth !== null) {
                resolve();
            } else {
                // Listen for firebaseReady event
                window.addEventListener('firebaseReady', () => resolve(), { once: true });
            }
        });
    }

    async handleAuthenticatedUser(user) {
        this.currentUser = user;
        
        // Get the ID token
        this.authToken = await user.getIdToken();
        
        // Show app screen
        this.showAppScreen();
        
        // Display user info
        document.getElementById('userName').textContent = user.displayName || 'User';
        document.getElementById('userPhoto').src = user.photoURL || '';
        
        // Initialize app components
        this.initializeAppComponents();
        
        // Load notes
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

    // Email/Password Sign Up - Client-side Firebase Auth
    async signupWithEmail() {
        const email = document.getElementById('signupEmail').value.trim();
        const password = document.getElementById('signupPassword').value;
        const passwordConfirm = document.getElementById('signupPasswordConfirm').value;
        const errorDiv = document.getElementById('signupError');
        
        errorDiv.textContent = '';
        
        // Validation
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
            // Firebase Web SDK - Create user with email and password
            await auth.createUserWithEmailAndPassword(email, password);
            console.log('✅ User created successfully');
        } catch (error) {
            console.error('Signup error:', error);
            errorDiv.textContent = this.getErrorMessage(error);
        }
    }

    // Email/Password Login - Client-side Firebase Auth
    async loginWithEmail() {
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;
        const errorDiv = document.getElementById('loginError');
        
        errorDiv.textContent = '';
        
        // Validation
        if (!email || !password) {
            errorDiv.textContent = 'Please enter email and password';
            return;
        }
        
        try {
            // Firebase Web SDK - Sign in with email and password
            await auth.signInWithEmailAndPassword(email, password);
            console.log('✅ Logged in successfully');
        } catch (error) {
            console.error('Login error:', error);
            errorDiv.textContent = this.getErrorMessage(error);
        }
    }

    // Google Sign-in - Client-side Firebase Auth
    async signInWithGoogle() {
        try {
            // Firebase Web SDK - Sign in with Google popup
            await auth.signInWithPopup(googleProvider);
            console.log('✅ Signed in with Google successfully');
        } catch (error) {
            console.error('Error signing in with Google:', error);
            alert('Failed to sign in with Google. Please try again.');
        }
    }

    async signOut() {
        try {
            await auth.signOut();
            this.currentUser = null;
            this.authToken = null;
            console.log('✅ Signed out successfully');
        } catch (error) {
            console.error('Error signing out:', error);
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

    initializeAppComponents() {
        // Get DOM elements
        this.noteTitle = document.getElementById('noteTitle');
        this.noteContent = document.getElementById('noteContent');
        this.addNoteBtn = document.getElementById('addNote');
        this.notesList = document.getElementById('notesList');

        // Add event listeners
        this.addNoteBtn.addEventListener('click', () => this.createNote());
        
        // Allow Enter key in title to move to content
        this.noteTitle.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.noteContent.focus();
            }
        });
    }

    async createNote() {
        const title = this.noteTitle.value.trim();
        const content = this.noteContent.value.trim();

        // Validation
        if (!title || !content) {
            alert('Please fill in both title and content');
            return;
        }

        try {
            // Refresh token if needed
            this.authToken = await this.currentUser.getIdToken();

            // Send POST request to backend with auth token
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.authToken}`
                },
                body: JSON.stringify({ title, content })
            });

            if (!response.ok) {
                throw new Error('Failed to create note');
            }

            // Clear form
            this.noteTitle.value = '';
            this.noteContent.value = '';
            this.noteTitle.focus();

            // Reload notes
            await this.loadNotes();
        } catch (error) {
            console.error('Error creating note:', error);
            alert('Failed to create note. Please try again.');
        }
    }

    async loadNotes() {
        try {
            // Refresh token if needed
            this.authToken = await this.currentUser.getIdToken();

            // Fetch notes from backend with auth token
            const response = await fetch(this.apiUrl, {
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to load notes');
            }

            const notes = await response.json();
            this.displayNotes(notes);
        } catch (error) {
            console.error('Error loading notes:', error);
            this.notesList.innerHTML = `
                <div class="empty-state">
                    <p>Failed to load notes. Please refresh the page.</p>
                </div>
            `;
        }
    }

    displayNotes(notes) {
        // Clear current display
        this.notesList.innerHTML = '';

        // Check if there are notes
        if (notes.length === 0) {
            this.notesList.innerHTML = `
                <div class="empty-state">
                    <p>No notes yet. Create your first note!</p>
                </div>
            `;
            return;
        }

        // Display each note
        notes.forEach(note => {
            const noteCard = this.createNoteCard(note);
            this.notesList.appendChild(noteCard);
        });
    }

    createNoteCard(note) {
        const card = document.createElement('div');
        card.className = 'note-card';
        
        // Handle both camelCase (old) and snake_case (Supabase) field names
        const dateString = note.created_at || note.createdAt;
        const date = new Date(dateString);
        const formattedDate = date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

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

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new NoteApp();
});

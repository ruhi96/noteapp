// Note App - Frontend JavaScript with Firebase Auth and API calls

class NoteApp {
    constructor() {
        this.apiUrl = '/api/notes';
        this.currentUser = null;
        this.authToken = null;
        this.init();
    }

    async init() {
        // Wait for Firebase to initialize
        await this.waitForFirebase();
        
        // Set up auth state observer
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                await this.handleAuthenticatedUser(user);
            } else {
                this.showAuthScreen();
            }
        });

        // Set up auth button listeners
        document.getElementById('googleSignIn').addEventListener('click', () => this.signInWithGoogle());
        document.getElementById('signOutBtn').addEventListener('click', () => this.signOut());
    }

    waitForFirebase() {
        return new Promise((resolve) => {
            if (typeof firebase !== 'undefined' && typeof auth !== 'undefined') {
                resolve();
            } else {
                setTimeout(() => resolve(this.waitForFirebase()), 100);
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

    async signInWithGoogle() {
        try {
            await auth.signInWithPopup(googleProvider);
        } catch (error) {
            console.error('Error signing in:', error);
            alert('Failed to sign in. Please try again.');
        }
    }

    async signOut() {
        try {
            await auth.signOut();
            this.currentUser = null;
            this.authToken = null;
        } catch (error) {
            console.error('Error signing out:', error);
            alert('Failed to sign out. Please try again.');
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

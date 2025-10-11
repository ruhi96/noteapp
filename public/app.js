// Note App - Frontend JavaScript with Firebase Auth and API calls

class NoteApp {
    constructor() {
        this.apiUrl = '/api/notes';
        this.currentUser = null;
        this.authToken = null;
        this.dodoProductId = null;
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
        
        // Load DODO Payments configuration
        await this.loadDodoConfig();
        
        // Handle payment redirects
        this.handlePaymentRedirects();
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
        
        // Premium upgrade
        document.getElementById('upgradePremiumBtn').addEventListener('click', () => this.upgradeToPremium());
        
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
        this.fileInput = document.getElementById('fileInput');
        this.uploadFileBtn = document.getElementById('uploadFileBtn');
        this.selectedFilesDiv = document.getElementById('selectedFiles');
        
        // Store selected files
        this.selectedFiles = [];

        // Add event listeners
        this.addNoteBtn.addEventListener('click', () => this.createNote());
        this.uploadFileBtn.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        
        // Allow Enter key in title to move to content
        this.noteTitle.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.noteContent.focus();
            }
        });
    }

    handleFileSelect(event) {
        const files = Array.from(event.target.files);
        
        files.forEach(file => {
            // Check file size (max 10MB)
            if (file.size > 10 * 1024 * 1024) {
                alert(`File ${file.name} is too large. Maximum size is 10MB.`);
                return;
            }
            
            this.selectedFiles.push(file);
        });
        
        this.displaySelectedFiles();
        event.target.value = ''; // Reset input
    }

    displaySelectedFiles() {
        this.selectedFilesDiv.innerHTML = '';
        
        this.selectedFiles.forEach((file, index) => {
            const chip = document.createElement('div');
            chip.className = 'file-chip';
            chip.innerHTML = `
                <span>${this.getFileIcon(file.type)} ${file.name}</span>
                <span class="remove-file" data-index="${index}">×</span>
            `;
            
            chip.querySelector('.remove-file').addEventListener('click', () => {
                this.selectedFiles.splice(index, 1);
                this.displaySelectedFiles();
            });
            
            this.selectedFilesDiv.appendChild(chip);
        });
    }

    getFileIcon(type) {
        if (type.startsWith('image/')) return '🖼️';
        if (type.startsWith('video/')) return '🎥';
        if (type.startsWith('audio/')) return '🎵';
        if (type === 'application/pdf') return '📄';
        if (type.includes('word')) return '📝';
        if (type.includes('excel') || type.includes('spreadsheet')) return '📊';
        if (type.includes('zip') || type.includes('rar')) return '📦';
        return '📎';
    }

    async uploadFile(file, noteId) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = async () => {
                try {
                    console.log('📤 Uploading file:', file.name, 'for note ID:', noteId);
                    
                    const response = await fetch('/api/upload', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${this.authToken}`
                        },
                        body: JSON.stringify({
                            fileName: file.name,
                            fileData: reader.result,
                            fileType: file.type,
                            noteId: noteId  // Map file to note ID
                        })
                    });
                    
                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.error || 'Upload failed');
                    }
                    
                    const data = await response.json();
                    console.log('✅ File uploaded to:', data.storageEndpoint);
                    console.log('   Path:', data.path);
                    resolve(data);
                } catch (error) {
                    reject(error);
                }
            };
            
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(file);
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
            // Show loading state
            this.addNoteBtn.disabled = true;
            this.addNoteBtn.textContent = 'Creating...';
            
            // Refresh token if needed
            this.authToken = await this.currentUser.getIdToken();

            // First, create the note to get the note ID
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.authToken}`
                },
                body: JSON.stringify({ title, content, attachments: [] })
            });

            if (!response.ok) {
                throw new Error('Failed to create note');
            }

            const createdNote = await response.json();
            const noteId = createdNote.id;
            
            console.log('✅ Note created with ID:', noteId);

            // Upload files if any, mapped to the note ID
            const attachments = [];
            if (this.selectedFiles.length > 0) {
                this.addNoteBtn.textContent = `Uploading ${this.selectedFiles.length} file(s)...`;
                
                for (const file of this.selectedFiles) {
                    try {
                        const uploadResult = await this.uploadFile(file, noteId);
                        attachments.push({
                            name: uploadResult.name,
                            url: uploadResult.url,
                            path: uploadResult.path,
                            size: uploadResult.size,
                            type: uploadResult.type
                        });
                        console.log('✅ Uploaded:', file.name, 'to note ID:', noteId);
                    } catch (error) {
                        console.error('Error uploading file:', file.name, error);
                        alert(`Failed to upload ${file.name}. Continuing with other files.`);
                    }
                }
                
                // Update note with attachments
                if (attachments.length > 0) {
                    this.addNoteBtn.textContent = 'Saving attachments...';
                    
                    const updateResponse = await fetch(`${this.apiUrl}/${noteId}`, {
                        method: 'PATCH',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${this.authToken}`
                        },
                        body: JSON.stringify({ attachments })
                    });
                    
                    if (updateResponse.ok) {
                        console.log('✅ Attachments saved to note ID:', noteId);
                    }
                }
            }

            console.log('✅ Note created with', attachments.length, 'attachment(s)');

            // Clear form
            this.noteTitle.value = '';
            this.noteContent.value = '';
            this.selectedFiles = [];
            this.displaySelectedFiles();
            this.noteTitle.focus();

            // Reload notes
            await this.loadNotes();
        } catch (error) {
            console.error('Error creating note:', error);
            alert('Failed to create note. Please try again.');
        } finally {
            // Reset button
            this.addNoteBtn.disabled = false;
            this.addNoteBtn.textContent = 'Add Note';
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

        let attachmentsHTML = '';
        if (note.attachments && note.attachments.length > 0) {
            attachmentsHTML = '<div class="note-attachments">';
            
            // Show image previews
            const images = note.attachments.filter(att => att.type?.startsWith('image/'));
            if (images.length > 0) {
                attachmentsHTML += '<div class="attachment-preview">';
                images.forEach(img => {
                    attachmentsHTML += `<img src="${img.url}" alt="${this.escapeHtml(img.name)}" onclick="window.open('${img.url}', '_blank')" />`;
                });
                attachmentsHTML += '</div>';
            }
            
            // Show all attachments as links
            note.attachments.forEach(attachment => {
                const icon = this.getFileIcon(attachment.type);
                const sizeKB = Math.round(attachment.size / 1024);
                attachmentsHTML += `
                    <a href="${attachment.url}" target="_blank" class="attachment-item" download="${attachment.name}">
                        <span>${icon}</span>
                        <span>${this.escapeHtml(attachment.name)}</span>
                        <span style="font-size: 0.8em; color: #999;">(${sizeKB} KB)</span>
                    </a>
                `;
            });
            attachmentsHTML += '</div>';
        }

        card.innerHTML = `
            <h3>${this.escapeHtml(note.title)}</h3>
            <p>${this.escapeHtml(note.content)}</p>
            ${attachmentsHTML}
            <span class="note-date">${formattedDate}</span>
        `;

        return card;
    }

    handlePaymentRedirects() {
        // Check for payment status in URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const paymentStatus = urlParams.get('payment');
        
        if (paymentStatus) {
            // Clean up URL
            const newUrl = window.location.protocol + '//' + window.location.host + window.location.pathname;
            window.history.replaceState({}, document.title, newUrl);
            
            // Show appropriate message
            switch (paymentStatus) {
                case 'success':
                    this.showSuccessMessage('🎉 Welcome to Premium! Your subscription is now active.');
                    break;
                case 'cancelled':
                    this.showErrorMessage('Payment was cancelled. You can try again anytime.');
                    break;
                case 'error':
                    this.showErrorMessage('Payment failed. Please try again or contact support.');
                    break;
                default:
                    this.showErrorMessage('Payment status unknown. Please check your account.');
            }
        }
    }

    showSuccessMessage(message) {
        // Create success notification
        const notification = document.createElement('div');
        notification.className = 'payment-notification success';
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">✅</span>
                <span class="notification-text">${message}</span>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    showErrorMessage(message) {
        // Create error notification
        const notification = document.createElement('div');
        notification.className = 'payment-notification error';
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">❌</span>
                <span class="notification-text">${message}</span>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Auto-remove after 7 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 7000);
    }

    async loadDodoConfig() {
        try {
            const response = await fetch('/api/config/dodo');
            if (!response.ok) {
                console.warn('⚠️ Failed to load DODO Payments configuration');
                return;
            }
            
            const dodoConfig = await response.json();
            this.dodoProductId = dodoConfig.productId;
            console.log('✅ DODO Payments configuration loaded:', this.dodoProductId);
            
        } catch (error) {
            console.error('❌ Failed to load DODO Payments configuration:', error);
        }
    }

    async upgradeToPremium() {
        try {
            const upgradeBtn = document.getElementById('upgradePremiumBtn');
            const originalText = upgradeBtn.textContent;
            
            // Disable button and show loading state
            upgradeBtn.disabled = true;
            upgradeBtn.textContent = '🔄 Processing...';
            
            console.log('💳 Starting premium upgrade for user:', this.currentUser.email);
            
            // Check if product ID is loaded
            if (!this.dodoProductId) {
                throw new Error('Payment configuration not loaded. Please refresh the page and try again.');
            }
            
            console.log('📦 Using product ID:', this.dodoProductId);
            
            // Create checkout session
            const response = await fetch('/api/payments/create-checkout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.authToken}`
                },
                body: JSON.stringify({
                    productId: this.dodoProductId
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to create checkout session');
            }

            const checkoutData = await response.json();
            
            console.log('✅ Checkout session created:', checkoutData.session_id);
            console.log('🔗 Redirecting to checkout URL:', checkoutData.checkout_url);
            
            // Redirect to DODO Payments checkout
            window.location.href = checkoutData.checkout_url;
            
        } catch (error) {
            console.error('❌ Error upgrading to premium:', error);
            
            // Reset button state
            const upgradeBtn = document.getElementById('upgradePremiumBtn');
            upgradeBtn.disabled = false;
            upgradeBtn.textContent = '⭐ Upgrade to Premium';
            
            // Show error message
            this.showError('Failed to start premium upgrade. Please try again.');
        }
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

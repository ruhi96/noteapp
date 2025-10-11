// Enhanced Note App - Frontend JavaScript with Firebase Auth and Supabase Storage
// This version implements dual Supabase clients and comprehensive file management

class EnhancedNoteApp {
    constructor() {
        this.apiUrl = '/api/notes';
        this.currentUser = null;
        this.authToken = null;
        this.supabase = null;
        this.supabaseStorage = null;
        this.supabaseConfig = null;
        this.selectedFiles = [];
        this.tempFiles = []; // For unsaved notes
        this.init();
    }

    async init() {
        try {
            // Wait for Firebase to initialize from backend config
            await this.waitForFirebase();
            
            // Initialize Supabase clients
            await this.initializeSupabaseClients();
            
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
            
            // Initialize app components
            this.initializeAppComponents();
            
        } catch (error) {
            console.error('❌ Failed to initialize app:', error);
            this.showError('Failed to initialize application. Please refresh the page.');
        }
    }

    async initializeSupabaseClients() {
        try {
            // Get Supabase configuration from backend
            const response = await fetch('/api/config/supabase');
            if (!response.ok) {
                throw new Error('Failed to get Supabase configuration');
            }
            
            this.supabaseConfig = await response.json();
            console.log('✅ Supabase configuration loaded');
            
            // Create dual Supabase clients
            this.supabase = supabase.createClient(
                this.supabaseConfig.url,
                this.supabaseConfig.anonKey
            );
            
            this.supabaseStorage = supabase.createClient(
                this.supabaseConfig.url,
                this.supabaseConfig.serviceKey
            );
            
            console.log('✅ Dual Supabase clients initialized');
            
        } catch (error) {
            console.error('❌ Failed to initialize Supabase clients:', error);
            throw error;
        }
    }

    async waitForFirebase() {
        return new Promise((resolve) => {
            if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
                resolve();
            } else {
                const checkFirebase = setInterval(() => {
                    if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
                        clearInterval(checkFirebase);
                        resolve();
                    }
                }, 100);
            }
        });
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

    initializeAppComponents() {
        // Get DOM elements
        this.authScreen = document.getElementById('authScreen');
        this.appScreen = document.getElementById('appScreen');
        this.noteTitle = document.getElementById('noteTitle');
        this.noteContent = document.getElementById('noteContent');
        this.addNoteBtn = document.getElementById('addNoteBtn');
        this.notesContainer = document.getElementById('notesContainer');
        this.userInfo = document.getElementById('userInfo');
        this.fileInput = document.getElementById('fileInput');
        this.uploadFileBtn = document.getElementById('uploadFileBtn');
        this.selectedFilesDiv = document.getElementById('selectedFiles');
        this.attachmentsContainer = document.getElementById('attachmentsContainer');

        // File upload event listeners
        this.uploadFileBtn.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
    }

    async handleAuthenticatedUser(user) {
        this.currentUser = user;
        this.authToken = await user.getIdToken();
        this.showAppScreen();
        this.displayUserInfo();
        await this.loadNotes();
    }

    showAuthScreen() {
        this.authScreen.style.display = 'block';
        this.appScreen.style.display = 'none';
    }

    showAppScreen() {
        this.authScreen.style.display = 'none';
        this.appScreen.style.display = 'block';
        this.noteTitle.focus();
    }

    displayUserInfo() {
        this.userInfo.innerHTML = `
            <div class="user-info">
                <img src="${this.currentUser.photoURL || '/default-avatar.png'}" alt="Profile" class="user-avatar">
                <div>
                    <div class="user-name">${this.currentUser.displayName || this.currentUser.email}</div>
                    <div class="user-email">${this.currentUser.email}</div>
                </div>
                <button id="signOutBtn" class="sign-out-btn">Sign Out</button>
            </div>
        `;
        
        // Re-attach sign out listener
        document.getElementById('signOutBtn').addEventListener('click', () => this.signOut());
    }

    // Authentication Methods
    switchTab(tab) {
        document.getElementById('loginTab').classList.toggle('active', tab === 'login');
        document.getElementById('signupTab').classList.toggle('active', tab === 'signup');
        document.getElementById('loginForm').style.display = tab === 'login' ? 'block' : 'none';
        document.getElementById('signupForm').style.display = tab === 'signup' ? 'block' : 'none';
        this.clearErrors();
    }

    clearErrors() {
        const errorElements = document.querySelectorAll('.error-message');
        errorElements.forEach(el => el.remove());
    }

    async signupWithEmail() {
        const email = document.getElementById('signupEmail').value.trim();
        const password = document.getElementById('signupPassword').value;
        const confirmPassword = document.getElementById('signupPasswordConfirm').value;

        if (password !== confirmPassword) {
            this.showError('Passwords do not match', 'signupForm');
            return;
        }

        if (password.length < 6) {
            this.showError('Password must be at least 6 characters', 'signupForm');
            return;
        }

        try {
            const userCredential = await auth.createUserWithEmailAndPassword(auth.getAuth(), email, password);
            console.log('✅ User created:', userCredential.user.email);
        } catch (error) {
            console.error('❌ Signup error:', error);
            this.showError(this.getErrorMessage(error), 'signupForm');
        }
    }

    async loginWithEmail() {
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;

        try {
            const userCredential = await auth.signInWithEmailAndPassword(auth.getAuth(), email, password);
            console.log('✅ User signed in:', userCredential.user.email);
        } catch (error) {
            console.error('❌ Login error:', error);
            this.showError(this.getErrorMessage(error), 'loginForm');
        }
    }

    async signInWithGoogle() {
        try {
            const provider = new auth.GoogleAuthProvider();
            const userCredential = await auth.signInWithPopup(auth.getAuth(), provider);
            console.log('✅ Google sign-in successful:', userCredential.user.email);
        } catch (error) {
            console.error('❌ Google sign-in error:', error);
            this.showError(this.getErrorMessage(error), 'loginForm');
        }
    }

    async signOut() {
        try {
            await auth.signOut(auth.getAuth());
            this.currentUser = null;
            this.authToken = null;
            this.selectedFiles = [];
            this.tempFiles = [];
            this.showAuthScreen();
            console.log('✅ User signed out');
        } catch (error) {
            console.error('❌ Sign out error:', error);
        }
    }

    getErrorMessage(error) {
        const errorMessages = {
            'auth/user-not-found': 'No account found with this email',
            'auth/wrong-password': 'Incorrect password',
            'auth/email-already-in-use': 'An account with this email already exists',
            'auth/weak-password': 'Password is too weak',
            'auth/invalid-email': 'Invalid email address',
            'auth/user-disabled': 'This account has been disabled',
            'auth/too-many-requests': 'Too many failed attempts. Please try again later',
            'auth/network-request-failed': 'Network error. Please check your connection'
        };
        return errorMessages[error.code] || error.message || 'An error occurred';
    }

    showError(message, containerId = null) {
        this.clearErrors();
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        
        if (containerId) {
            const container = document.getElementById(containerId);
            container.insertBefore(errorDiv, container.firstChild);
        } else {
            document.body.insertBefore(errorDiv, document.body.firstChild);
        }
        
        setTimeout(() => errorDiv.remove(), 5000);
    }

    // File Management Methods
    handleFileSelect(event) {
        const files = Array.from(event.target.files);
        
        files.forEach(file => {
            if (this.validateFile(file)) {
                this.selectedFiles.push(file);
                console.log('📁 File selected:', file.name, '(' + this.formatFileSize(file.size) + ')');
            }
        });
        
        this.displaySelectedFiles();
        event.target.value = ''; // Reset input
    }

    validateFile(file) {
        const maxSize = 50 * 1024 * 1024; // 50MB
        const allowedTypes = [
            'image/jpeg', 'image/png', 'image/gif', 'image/webp',
            'video/mp4', 'video/webm', 'video/ogg',
            'application/pdf', 'text/plain', 'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];

        if (file.size > maxSize) {
            this.showError(`File "${file.name}" is too large. Maximum size is 50MB.`);
            return false;
        }

        if (!allowedTypes.includes(file.type)) {
            this.showError(`File type "${file.type}" is not supported.`);
            return false;
        }

        return true;
    }

    displaySelectedFiles() {
        if (this.selectedFiles.length === 0) {
            this.selectedFilesDiv.innerHTML = '';
            return;
        }

        const filesHtml = this.selectedFiles.map((file, index) => `
            <div class="file-chip" data-index="${index}">
                <span class="file-icon">${this.getFileIcon(file.type)}</span>
                <span class="file-name">${file.name}</span>
                <span class="file-size">${this.formatFileSize(file.size)}</span>
                <button class="remove-file" onclick="noteApp.removeSelectedFile(${index})">×</button>
            </div>
        `).join('');

        this.selectedFilesDiv.innerHTML = filesHtml;
    }

    removeSelectedFile(index) {
        this.selectedFiles.splice(index, 1);
        this.displaySelectedFiles();
    }

    getFileIcon(fileType) {
        if (fileType.startsWith('image/')) return '🖼️';
        if (fileType.startsWith('video/')) return '🎥';
        if (fileType === 'application/pdf') return '📄';
        if (fileType.includes('word') || fileType.includes('document')) return '📝';
        return '📎';
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // File Upload Methods
    async uploadFile(file, noteId = null) {
        try {
            console.log('📤 Uploading file:', file.name, 'for note ID:', noteId);
            
            // Generate unique filename
            const timestamp = Date.now();
            const fileExtension = file.name.split('.').pop();
            const uniqueFileName = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
            
            // Determine storage path
            let storagePath;
            if (noteId) {
                storagePath = `${this.currentUser.uid}/${noteId}/${uniqueFileName}`;
            } else {
                storagePath = `${this.currentUser.uid}/temp/${uniqueFileName}`;
            }

            // Upload to Supabase Storage using service role client
            const { data, error } = await this.supabaseStorage.storage
                .from('note-attachments')
                .upload(storagePath, file, {
                    contentType: file.type,
                    upsert: false
                });

            if (error) {
                throw new Error(`Storage upload failed: ${error.message}`);
            }

            console.log('✅ File uploaded to storage:', storagePath);

            // Get public URL
            const { data: { publicUrl } } = this.supabaseStorage.storage
                .from('note-attachments')
                .getPublicUrl(storagePath);

            // Save file metadata to database
            const fileMetadata = {
                note_id: noteId,
                user_id: this.currentUser.uid,
                file_name: file.name,
                file_size: file.size,
                file_type: file.type,
                storage_path: storagePath,
                storage_bucket: 'note-attachments'
            };

            const { data: attachmentData, error: dbError } = await this.supabase
                .from('file_attachments')
                .insert([fileMetadata])
                .select()
                .single();

            if (dbError) {
                throw new Error(`Database save failed: ${dbError.message}`);
            }

            console.log('✅ File metadata saved to database:', attachmentData.id);

            return {
                id: attachmentData.id,
                name: file.name,
                size: file.size,
                type: file.type,
                url: publicUrl,
                path: storagePath,
                attachment: attachmentData
            };

        } catch (error) {
            console.error('❌ File upload failed:', error);
            throw error;
        }
    }

    async deleteFile(attachmentId, storagePath) {
        try {
            console.log('🗑️ Deleting file:', attachmentId, storagePath);
            
            // Delete from storage
            const { error: storageError } = await this.supabaseStorage.storage
                .from('note-attachments')
                .remove([storagePath]);

            if (storageError) {
                console.warn('⚠️ Storage deletion failed:', storageError.message);
            }

            // Delete from database
            const { error: dbError } = await this.supabase
                .from('file_attachments')
                .delete()
                .eq('id', attachmentId)
                .eq('user_id', this.currentUser.uid);

            if (dbError) {
                throw new Error(`Database deletion failed: ${dbError.message}`);
            }

            console.log('✅ File deleted successfully');

        } catch (error) {
            console.error('❌ File deletion failed:', error);
            throw error;
        }
    }

    async downloadFile(storagePath, fileName) {
        try {
            console.log('⬇️ Downloading file:', fileName);
            
            const { data, error } = await this.supabaseStorage.storage
                .from('note-attachments')
                .download(storagePath);

            if (error) {
                throw new Error(`Download failed: ${error.message}`);
            }

            // Create download link
            const url = URL.createObjectURL(data);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            console.log('✅ File download initiated');

        } catch (error) {
            console.error('❌ File download failed:', error);
            throw error;
        }
    }

    async getFileAttachments(noteId) {
        try {
            const { data, error } = await this.supabase
                .from('file_attachments')
                .select('*')
                .eq('note_id', noteId)
                .eq('user_id', this.currentUser.uid)
                .order('created_at', { ascending: false });

            if (error) {
                throw new Error(`Failed to fetch attachments: ${error.message}`);
            }

            return data || [];

        } catch (error) {
            console.error('❌ Failed to get file attachments:', error);
            return [];
        }
    }

    // Note Management Methods
    async createNote() {
        const title = this.noteTitle.value.trim();
        const content = this.noteContent.value.trim();

        if (!title || !content) {
            this.showError('Please fill in both title and content');
            return;
        }

        try {
            this.addNoteBtn.disabled = true;
            this.addNoteBtn.textContent = 'Creating...';
            this.authToken = await this.currentUser.getIdToken();

            // First, create the note
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

            // Upload files if any
            const attachments = [];
            if (this.selectedFiles.length > 0) {
                this.addNoteBtn.textContent = `Uploading ${this.selectedFiles.length} file(s)...`;
                
                for (const file of this.selectedFiles) {
                    try {
                        const uploadResult = await this.uploadFile(file, noteId);
                        attachments.push(uploadResult);
                        console.log('✅ Uploaded:', file.name, 'to note ID:', noteId);
                    } catch (error) {
                        console.error('❌ Error uploading file:', file.name, error);
                        this.showError(`Failed to upload ${file.name}. Continuing with other files.`);
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
            
            // Reload notes to show the new one
            await this.loadNotes();

        } catch (error) {
            console.error('❌ Error creating note:', error);
            this.showError('Failed to create note. Please try again.');
        } finally {
            this.addNoteBtn.disabled = false;
            this.addNoteBtn.textContent = 'Add Note';
        }
    }

    async loadNotes() {
        try {
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
            console.error('❌ Error loading notes:', error);
            this.showError('Failed to load notes. Please refresh the page.');
        }
    }

    async displayNotes(notes) {
        if (notes.length === 0) {
            this.notesContainer.innerHTML = '<p class="no-notes">No notes yet. Create your first note above!</p>';
            return;
        }

        const notesHtml = await Promise.all(notes.map(async (note) => {
            const attachments = await this.getFileAttachments(note.id);
            return this.createNoteCard(note, attachments);
        }));

        this.notesContainer.innerHTML = notesHtml.join('');
    }

    async createNoteCard(note, attachments) {
        const attachmentsHtml = attachments.length > 0 ? `
            <div class="note-attachments">
                <h4>Attachments (${attachments.length})</h4>
                ${attachments.map(attachment => this.createAttachmentHtml(attachment)).join('')}
            </div>
        ` : '';

        return `
            <div class="note-card" data-note-id="${note.id}">
                <div class="note-header">
                    <h3 class="note-title">${this.escapeHtml(note.title)}</h3>
                    <div class="note-date">${new Date(note.created_at).toLocaleDateString()}</div>
                </div>
                <div class="note-content">${this.escapeHtml(note.content).replace(/\n/g, '<br>')}</div>
                ${attachmentsHtml}
                <div class="note-actions">
                    <button class="delete-btn" onclick="noteApp.deleteNote('${note.id}')">Delete</button>
                </div>
            </div>
        `;
    }

    createAttachmentHtml(attachment) {
        const isImage = attachment.file_type.startsWith('image/');
        const isVideo = attachment.file_type.startsWith('video/');
        
        let previewHtml = '';
        if (isImage) {
            previewHtml = `
                <div class="attachment-preview">
                    <img src="${attachment.url}" alt="${attachment.file_name}" 
                         onclick="noteApp.showImageModal('${attachment.url}', '${attachment.file_name}')"
                         class="attachment-image">
                </div>
            `;
        } else if (isVideo) {
            previewHtml = `
                <div class="attachment-preview">
                    <video controls class="attachment-video">
                        <source src="${attachment.url}" type="${attachment.file_type}">
                        Your browser does not support the video tag.
                    </video>
                </div>
            `;
        }

        return `
            <div class="attachment-item" data-attachment-id="${attachment.id}">
                <div class="attachment-info">
                    <span class="attachment-icon">${this.getFileIcon(attachment.file_type)}</span>
                    <span class="attachment-name">${this.escapeHtml(attachment.file_name)}</span>
                    <span class="attachment-size">${this.formatFileSize(attachment.file_size)}</span>
                </div>
                ${previewHtml}
                <div class="attachment-actions">
                    <button class="download-btn" onclick="noteApp.downloadFile('${attachment.storage_path}', '${attachment.file_name}')">
                        Download
                    </button>
                    <button class="delete-attachment-btn" onclick="noteApp.deleteAttachment('${attachment.id}', '${attachment.storage_path}')">
                        Delete
                    </button>
                </div>
            </div>
        `;
    }

    async deleteNote(noteId) {
        if (!confirm('Are you sure you want to delete this note? This action cannot be undone.')) {
            return;
        }

        try {
            const response = await fetch(`${this.apiUrl}/${noteId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to delete note');
            }

            console.log('✅ Note deleted:', noteId);
            await this.loadNotes();

        } catch (error) {
            console.error('❌ Error deleting note:', error);
            this.showError('Failed to delete note. Please try again.');
        }
    }

    async deleteAttachment(attachmentId, storagePath) {
        if (!confirm('Are you sure you want to delete this attachment?')) {
            return;
        }

        try {
            await this.deleteFile(attachmentId, storagePath);
            
            // Remove from UI
            const attachmentElement = document.querySelector(`[data-attachment-id="${attachmentId}"]`);
            if (attachmentElement) {
                attachmentElement.remove();
            }
            
            console.log('✅ Attachment deleted:', attachmentId);

        } catch (error) {
            console.error('❌ Error deleting attachment:', error);
            this.showError('Failed to delete attachment. Please try again.');
        }
    }

    showImageModal(imageUrl, imageName) {
        const modal = document.createElement('div');
        modal.className = 'image-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <span class="modal-close">&times;</span>
                <img src="${imageUrl}" alt="${imageName}" class="modal-image">
                <div class="modal-caption">${imageName}</div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Close modal on click
        modal.addEventListener('click', (e) => {
            if (e.target === modal || e.target.classList.contains('modal-close')) {
                document.body.removeChild(modal);
            }
        });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.noteApp = new EnhancedNoteApp();
});

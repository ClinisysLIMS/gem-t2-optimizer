/**
 * Firebase Configuration and Initialization
 * Handles Firebase setup, authentication, and Firestore database
 */

class FirebaseManager {
    constructor() {
        this.app = null;
        this.auth = null;
        this.db = null;
        this.user = null;
        this.initialized = false;
        
        // Firebase configuration (replace with your actual config)
        // To set up Firebase:
        // 1. Go to https://console.firebase.google.com/
        // 2. Create a new project or use existing one
        // 3. Enable Authentication (Email/Password and Google)
        // 4. Enable Firestore Database
        // 5. Get your config from Project Settings > General > Your apps
        this.firebaseConfig = {
            apiKey: "your-api-key-here",
            authDomain: "your-project.firebaseapp.com",
            projectId: "your-project-id",
            storageBucket: "your-project.appspot.com",
            messagingSenderId: "123456789",
            appId: "1:123456789:web:abcdef123456"
        };
        
        this.initFirebase();
    }
    
    /**
     * Initialize Firebase
     */
    async initFirebase() {
        try {
            // Check if Firebase is already loaded
            if (typeof firebase === 'undefined') {
                console.warn('Firebase SDK not loaded. Please include Firebase scripts.');
                return;
            }
            
            // Initialize Firebase app
            this.app = firebase.initializeApp(this.firebaseConfig);
            this.auth = firebase.auth();
            this.db = firebase.firestore();
            
            // Set up auth state observer
            this.auth.onAuthStateChanged((user) => {
                this.user = user;
                this.handleAuthStateChange(user);
            });
            
            this.initialized = true;
            console.log('Firebase initialized successfully');
            
        } catch (error) {
            console.error('Firebase initialization error:', error);
        }
    }
    
    /**
     * Handle authentication state changes
     */
    handleAuthStateChange(user) {
        if (user) {
            console.log('User signed in:', user.email);
            this.updateUserInterface(true);
            this.loadUserData();
        } else {
            console.log('User signed out');
            this.updateUserInterface(false);
        }
        
        // Dispatch custom event for other components
        window.dispatchEvent(new CustomEvent('authStateChanged', { 
            detail: { user: user } 
        }));
    }
    
    /**
     * Sign up with email and password
     */
    async signUp(email, password, displayName = null) {
        try {
            const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            // Update user profile with display name
            if (displayName) {
                await user.updateProfile({ displayName: displayName });
            }
            
            // Create user document in Firestore
            await this.createUserDocument(user, { displayName });
            
            return { success: true, user: user };
        } catch (error) {
            console.error('Sign up error:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Sign in with email and password
     */
    async signIn(email, password) {
        try {
            const userCredential = await this.auth.signInWithEmailAndPassword(email, password);
            return { success: true, user: userCredential.user };
        } catch (error) {
            console.error('Sign in error:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Sign in with Google
     */
    async signInWithGoogle() {
        try {
            const provider = new firebase.auth.GoogleAuthProvider();
            const result = await this.auth.signInWithPopup(provider);
            
            // Create user document if it doesn't exist
            await this.createUserDocument(result.user);
            
            return { success: true, user: result.user };
        } catch (error) {
            console.error('Google sign in error:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Sign out
     */
    async signOut() {
        try {
            await this.auth.signOut();
            return { success: true };
        } catch (error) {
            console.error('Sign out error:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Create user document in Firestore
     */
    async createUserDocument(user, additionalData = {}) {
        if (!user) return;
        
        const userRef = this.db.collection('users').doc(user.uid);
        const snapshot = await userRef.get();
        
        if (!snapshot.exists) {
            const { displayName, email, photoURL } = user;
            const createdAt = firebase.firestore.FieldValue.serverTimestamp();
            
            try {
                await userRef.set({
                    displayName,
                    email,
                    photoURL,
                    createdAt,
                    lastLogin: createdAt,
                    profiles: [],
                    preferences: {
                        units: 'imperial',
                        theme: 'light',
                        notifications: true
                    },
                    ...additionalData
                });
                
                console.log('User document created');
            } catch (error) {
                console.error('Error creating user document:', error);
            }
        } else {
            // Update last login
            await userRef.update({
                lastLogin: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
    }
    
    /**
     * Load user data from Firestore
     */
    async loadUserData() {
        if (!this.user) return null;
        
        try {
            const userRef = this.db.collection('users').doc(this.user.uid);
            const doc = await userRef.get();
            
            if (doc.exists) {
                const userData = doc.data();
                console.log('User data loaded:', userData);
                return userData;
            }
        } catch (error) {
            console.error('Error loading user data:', error);
        }
        
        return null;
    }
    
    /**
     * Update user interface based on auth state
     */
    updateUserInterface(isSignedIn) {
        const authElements = document.querySelectorAll('[data-auth-required]');
        const guestElements = document.querySelectorAll('[data-guest-only]');
        const userInfoElements = document.querySelectorAll('[data-user-info]');
        
        authElements.forEach(el => {
            el.style.display = isSignedIn ? 'block' : 'none';
        });
        
        guestElements.forEach(el => {
            el.style.display = isSignedIn ? 'none' : 'block';
        });
        
        if (isSignedIn && this.user) {
            userInfoElements.forEach(el => {
                if (el.dataset.userInfo === 'displayName') {
                    el.textContent = this.user.displayName || this.user.email;
                } else if (el.dataset.userInfo === 'email') {
                    el.textContent = this.user.email;
                } else if (el.dataset.userInfo === 'photoURL' && this.user.photoURL) {
                    el.src = this.user.photoURL;
                }
            });
        }
    }
    
    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        return !!this.user;
    }
    
    /**
     * Get current user
     */
    getCurrentUser() {
        return this.user;
    }
    
    /**
     * Reset password
     */
    async resetPassword(email) {
        try {
            await this.auth.sendPasswordResetEmail(email);
            return { success: true };
        } catch (error) {
            console.error('Password reset error:', error);
            return { success: false, error: error.message };
        }
    }
}

// Create global Firebase manager instance
window.firebaseManager = new FirebaseManager();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FirebaseManager;
}
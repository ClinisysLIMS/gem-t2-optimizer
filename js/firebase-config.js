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
        // 6. Replace the placeholder values below with your actual config
        // 7. See FIREBASE_SETUP.md for detailed instructions
        this.firebaseConfig = {
            apiKey: "YOUR_API_KEY",
            authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
            projectId: "YOUR_PROJECT_ID",
            storageBucket: "YOUR_PROJECT_ID.appspot.com",
            messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
            appId: "YOUR_APP_ID"
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
                this.showSetupInstructions();
                return;
            }
            
            // Check if configuration has been updated from placeholders
            if (this.firebaseConfig.apiKey === "YOUR_API_KEY") {
                console.warn('Firebase configuration has not been updated.');
                this.showSetupInstructions();
                return;
            }
            
            // Initialize Firebase app
            this.app = firebase.initializeApp(this.firebaseConfig);
            this.auth = firebase.auth();
            this.db = firebase.firestore();
            
            // Enable Firestore persistence for offline support
            this.db.enablePersistence()
                .catch((err) => {
                    if (err.code === 'failed-precondition') {
                        console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
                    } else if (err.code === 'unimplemented') {
                        console.warn('The current browser does not support offline persistence');
                    }
                });
            
            // Set up auth state observer
            this.auth.onAuthStateChanged((user) => {
                this.user = user;
                this.handleAuthStateChange(user);
            });
            
            this.initialized = true;
            console.log('Firebase initialized successfully');
            
        } catch (error) {
            console.error('Firebase initialization error:', error);
            this.showSetupInstructions();
        }
    }
    
    /**
     * Show detailed setup instructions
     */
    showSetupInstructions() {
        console.log(`
%c========================================
FIREBASE SETUP REQUIRED
========================================%c

To enable user accounts and save profiles, follow these steps:

%c1. Create a Firebase Project:%c
   • Go to https://console.firebase.google.com/
   • Click "Create a project" or select existing
   • Follow the setup wizard

%c2. Enable Authentication:%c
   • In your Firebase project, click "Authentication"
   • Click "Get started"
   • Enable "Email/Password" provider
   • Enable "Google" provider (optional)

%c3. Enable Firestore Database:%c
   • Click "Firestore Database" in sidebar
   • Click "Create database"
   • Choose "Start in test mode" for development
   • Select your region

%c4. Get Your Configuration:%c
   • Click ⚙️ next to "Project Overview"
   • Select "Project settings"
   • Scroll to "Your apps" section
   • Click </> (Web app icon)
   • Register your app with a nickname
   • Copy the firebaseConfig object

%c5. Update This File:%c
   • Open js/firebase-config.js
   • Replace the placeholder values:
     - YOUR_API_KEY
     - YOUR_PROJECT_ID
     - YOUR_MESSAGING_SENDER_ID
     - YOUR_APP_ID
   • Save and refresh the page

%cFor detailed instructions with screenshots, see FIREBASE_SETUP.md%c

%cNote: Firebase features are optional. The app works without them, but you won't be able to save profiles or use community features.%c
`, 
        'color: red; font-weight: bold',
        'color: inherit',
        'color: blue; font-weight: bold',
        'color: inherit',
        'color: blue; font-weight: bold',
        'color: inherit',
        'color: blue; font-weight: bold',
        'color: inherit',
        'color: blue; font-weight: bold',
        'color: inherit',
        'color: blue; font-weight: bold',
        'color: inherit',
        'color: green; font-weight: bold',
        'color: inherit',
        'color: orange; font-style: italic',
        'color: inherit'
        );
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
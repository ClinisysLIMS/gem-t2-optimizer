/**
 * Local Profile Service
 * Provides local profile management without authentication
 * Always returns a "logged in" local user for compatibility
 */
class LocalAuthService {
    constructor() {
        this.currentProfile = null;
        this.profileStateListeners = [];
        this.storageKey = 'gem_local_profile';
        
        // Initialize from stored profile
        this.initializeFromStorage();
    }
    
    /**
     * Initialize profile state from localStorage
     */
    initializeFromStorage() {
        try {
            const storedProfile = localStorage.getItem(this.storageKey);
            if (storedProfile) {
                this.currentProfile = JSON.parse(storedProfile);
                this.log('Local profile restored:', this.currentProfile.displayName);
            } else {
                // Create default local profile
                this.createDefaultProfile();
            }
        } catch (error) {
            this.error('Failed to restore profile:', error);
            this.createDefaultProfile();
        }
        
        // Notify that we're "authenticated" (always true for local)
        this.notifyAuthStateChange();
    }
    
    /**
     * Create default local profile
     */
    createDefaultProfile() {
        this.currentProfile = {
            uid: 'local-user',
            displayName: 'Local User',
            email: 'local@device.local',
            isLocalProfile: true,
            createdAt: new Date().toISOString(),
            metadata: {
                creationTime: new Date().toISOString(),
                lastSignInTime: new Date().toISOString()
            }
        };
        this.saveProfile();
    }
    
    /**
     * Save current profile to localStorage
     */
    saveProfile() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.currentProfile));
        } catch (error) {
            this.error('Failed to save profile:', error);
        }
    }
    
    /**
     * Update profile display name
     */
    updateProfile(displayName) {
        if (this.currentProfile) {
            this.currentProfile.displayName = displayName || 'Local User';
            this.saveProfile();
            this.notifyAuthStateChange();
        }
    }
    
    /**
     * Get current user (always returns local profile)
     */
    getCurrentUser() {
        return this.currentProfile;
    }
    
    /**
     * Check if user is authenticated (always true for local)
     */
    isAuthenticated() {
        return true; // Always authenticated locally
    }
    
    /**
     * Add auth state change listener
     */
    onAuthStateChanged(callback) {
        this.profileStateListeners.push(callback);
        
        // Immediately call with current state
        callback(this.currentProfile);
        
        return () => {
            const index = this.profileStateListeners.indexOf(callback);
            if (index > -1) {
                this.profileStateListeners.splice(index, 1);
            }
        };
    }
    
    /**
     * Notify all listeners of auth state change
     */
    notifyAuthStateChange() {
        this.profileStateListeners.forEach(callback => {
            try {
                callback(this.currentProfile);
            } catch (error) {
                this.error('Auth state listener error:', error);
            }
        });
    }
    
    /**
     * Sign out (just for compatibility - immediately signs back in locally)
     */
    async signOut() {
        this.log('Local sign out requested - staying local');
        // Don't actually sign out, just refresh the local profile
        this.notifyAuthStateChange();
        return Promise.resolve();
    }
    
    /**
     * Create user (compatibility method - returns local profile)
     */
    async createUserWithEmailAndPassword(email, password) {
        // Update display name based on email if provided
        if (email && email.includes('@')) {
            this.updateProfile(email.split('@')[0]);
        }
        
        return {
            user: this.currentProfile
        };
    }
    
    /**
     * Sign in (compatibility method - returns local profile)
     */
    async signInWithEmailAndPassword(email, password) {
        // Update display name based on email if provided
        if (email && email.includes('@')) {
            this.updateProfile(email.split('@')[0]);
        }
        
        return {
            user: this.currentProfile
        };
    }
    
    /**
     * Get user by UID (always returns local user)
     */
    getUserByUID(uid) {
        return this.currentProfile;
    }
    
    /**
     * Save user data (local profile data)
     */
    async saveUserData(data) {
        if (this.currentProfile) {
            // Merge data into current profile
            this.currentProfile = {
                ...this.currentProfile,
                ...data,
                lastUpdated: new Date().toISOString()
            };
            this.saveProfile();
        }
    }
    
    /**
     * Get user data (local profile data)
     */
    async getUserData() {
        return this.currentProfile || {};
    }
    
    /**
     * Delete user data (reset to default)
     */
    async deleteUserData() {
        localStorage.removeItem(this.storageKey);
        this.createDefaultProfile();
        this.notifyAuthStateChange();
    }
    
    /**
     * Log helper
     */
    log(message, ...args) {
        console.log(`[LocalAuth] ${message}`, ...args);
    }
    
    /**
     * Error helper
     */
    error(message, ...args) {
        console.error(`[LocalAuth] ${message}`, ...args);
    }
}

// Initialize global local auth service
window.localAuth = new LocalAuthService();

// Export for module usage if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LocalAuthService;
}
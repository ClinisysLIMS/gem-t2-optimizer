/**
 * Firebase Profile Manager
 * Manages vehicle profiles, configurations, and trip history in Firestore
 */
class FirebaseProfileManager {
    constructor() {
        this.firebase = null;
        this.currentProfile = null;
        this.profiles = [];
        this.syncInProgress = false;
        
        this.init();
    }
    
    /**
     * Initialize profile manager
     */
    async init() {
        // Wait for Firebase manager to be available
        if (typeof window.firebaseManager !== 'undefined') {
            this.firebase = window.firebaseManager;
            console.log('Firebase Profile Manager initialized');
            
            // Listen for auth state changes
            window.addEventListener('authStateChanged', (e) => {
                this.handleAuthStateChange(e.detail.user);
            });
            
            // If user is already signed in, load profiles
            if (this.firebase.isAuthenticated()) {
                await this.loadUserProfiles();
            }
        } else {
            console.warn('Firebase manager not available');
        }
        
        this.setupProfileUI();
        this.setupEventListeners();
    }
    
    /**
     * Handle authentication state changes
     */
    async handleAuthStateChange(user) {
        if (user) {
            await this.loadUserProfiles();
            this.showProfileOptions();
        } else {
            this.clearProfiles();
            this.hideProfileOptions();
        }
    }
    
    /**
     * Load user profiles from Firestore
     */
    async loadUserProfiles() {
        if (!this.firebase.isAuthenticated()) return;
        
        try {
            const user = this.firebase.getCurrentUser();
            const profilesRef = this.firebase.db.collection('users').doc(user.uid).collection('profiles');
            const snapshot = await profilesRef.orderBy('lastUsed', 'desc').get();
            
            this.profiles = [];
            snapshot.forEach(doc => {
                this.profiles.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            console.log(`Loaded ${this.profiles.length} profiles`);
            this.updateProfileUI();
            
        } catch (error) {
            console.error('Error loading profiles:', error);
        }
    }
    
    /**
     * Save current vehicle configuration as a profile
     */
    async saveCurrentProfile(profileName, description = '') {
        if (!this.firebase.isAuthenticated()) {
            this.showError('Please sign in to save profiles');
            return false;
        }
        
        try {
            const vehicleData = this.gatherCurrentVehicleData();
            const tripSettings = this.gatherCurrentTripSettings();
            const currentSettings = this.gatherCurrentControllerSettings();
            
            if (!vehicleData.model) {
                this.showError('Please complete vehicle information before saving');
                return false;
            }
            
            const profile = {
                name: profileName,
                description: description,
                vehicleData: vehicleData,
                tripSettings: tripSettings,
                controllerSettings: currentSettings,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastUsed: firebase.firestore.FieldValue.serverTimestamp(),
                version: '1.0'
            };
            
            const user = this.firebase.getCurrentUser();
            const profilesRef = this.firebase.db.collection('users').doc(user.uid).collection('profiles');
            
            const docRef = await profilesRef.add(profile);
            profile.id = docRef.id;
            
            this.profiles.unshift(profile);
            this.updateProfileUI();
            this.showSuccess(`Profile "${profileName}" saved successfully`);
            
            return true;
            
        } catch (error) {
            console.error('Error saving profile:', error);
            this.showError('Failed to save profile: ' + error.message);
            return false;
        }
    }
    
    /**
     * Load a profile and apply it to the current form
     */
    async loadProfile(profileId) {
        const profile = this.profiles.find(p => p.id === profileId);
        if (!profile) {
            this.showError('Profile not found');
            return false;
        }
        
        try {
            // Apply vehicle data
            this.applyVehicleData(profile.vehicleData);
            
            // Apply trip settings if available
            if (profile.tripSettings) {
                this.applyTripSettings(profile.tripSettings);
            }
            
            // Store current profile reference
            this.currentProfile = profile;
            
            // Update last used timestamp
            await this.updateProfileLastUsed(profileId);
            
            this.showSuccess(`Profile "${profile.name}" loaded successfully`);
            
            // Trigger form validation and continue button update
            if (typeof unifiedFlow !== 'undefined') {
                unifiedFlow.validateStep1();
            }
            
            return true;
            
        } catch (error) {
            console.error('Error loading profile:', error);
            this.showError('Failed to load profile: ' + error.message);
            return false;
        }
    }
    
    /**
     * Update profile last used timestamp
     */
    async updateProfileLastUsed(profileId) {
        if (!this.firebase.isAuthenticated()) return;
        
        try {
            const user = this.firebase.getCurrentUser();
            const profileRef = this.firebase.db.collection('users').doc(user.uid).collection('profiles').doc(profileId);
            
            await profileRef.update({
                lastUsed: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Update local copy
            const profile = this.profiles.find(p => p.id === profileId);
            if (profile) {
                profile.lastUsed = new Date();
            }
            
        } catch (error) {
            console.warn('Failed to update last used timestamp:', error);
        }
    }
    
    /**
     * Delete a profile
     */
    async deleteProfile(profileId) {
        if (!this.firebase.isAuthenticated()) return false;
        
        try {
            const user = this.firebase.getCurrentUser();
            const profileRef = this.firebase.db.collection('users').doc(user.uid).collection('profiles').doc(profileId);
            
            await profileRef.delete();
            
            this.profiles = this.profiles.filter(p => p.id !== profileId);
            this.updateProfileUI();
            
            this.showSuccess('Profile deleted successfully');
            return true;
            
        } catch (error) {
            console.error('Error deleting profile:', error);
            this.showError('Failed to delete profile: ' + error.message);
            return false;
        }
    }
    
    /**
     * Save trip history
     */
    async saveTripHistory(tripData) {
        if (!this.firebase.isAuthenticated()) return false;
        
        try {
            const user = this.firebase.getCurrentUser();
            const tripHistory = {
                ...tripData,
                profileId: this.currentProfile?.id || null,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                userId: user.uid
            };
            
            const tripsRef = this.firebase.db.collection('users').doc(user.uid).collection('tripHistory');
            await tripsRef.add(tripHistory);
            
            return true;
            
        } catch (error) {
            console.error('Error saving trip history:', error);
            return false;
        }
    }
    
    /**
     * Get trip history
     */
    async getTripHistory(limit = 10) {
        if (!this.firebase.isAuthenticated()) return [];
        
        try {
            const user = this.firebase.getCurrentUser();
            const tripsRef = this.firebase.db.collection('users').doc(user.uid).collection('tripHistory');
            const snapshot = await tripsRef.orderBy('timestamp', 'desc').limit(limit).get();
            
            const trips = [];
            snapshot.forEach(doc => {
                trips.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            return trips;
            
        } catch (error) {
            console.error('Error loading trip history:', error);
            return [];
        }
    }
    
    /**
     * Gather current vehicle data from form
     */
    gatherCurrentVehicleData() {
        return {
            model: document.getElementById('vehicle-model')?.value || '',
            year: document.getElementById('vehicle-year')?.value || '',
            controller: document.getElementById('controller-type')?.value || '',
            motorType: document.getElementById('motor-type')?.value || '',
            motorModel: document.getElementById('motor-model')?.value || '',
            motorPower: document.getElementById('motor-power')?.value || '',
            currentSpeed: document.getElementById('current-speed')?.value || '',
            batteryVoltage: document.getElementById('battery-voltage')?.value || '',
            batteryType: document.getElementById('battery-type')?.value || '',
            batteryCapacity: document.getElementById('battery-capacity')?.value || '',
            tireDiameter: document.getElementById('tire-diameter')?.value || '',
            gearRatio: document.getElementById('gear-ratio')?.value || '',
            motorAge: document.getElementById('motor-age')?.value || '',
            motorLastService: document.getElementById('motor-last-service')?.value || '',
            motorCondition: this.gatherMotorCondition()
        };
    }
    
    /**
     * Gather motor condition checkboxes
     */
    gatherMotorCondition() {
        return {
            sparking: document.getElementById('motor-sparking')?.checked || false,
            noise: document.getElementById('motor-noise')?.checked || false,
            overheating: document.getElementById('motor-overheating')?.checked || false,
            vibration: document.getElementById('motor-vibration')?.checked || false,
            powerLoss: document.getElementById('motor-power-loss')?.checked || false
        };
    }
    
    /**
     * Gather current trip settings
     */
    gatherCurrentTripSettings() {
        // Get trip planning data if available
        const settings = {};
        
        // Check for selected quick action
        const selectedAction = document.querySelector('.quick-action-btn.selected');
        if (selectedAction) {
            settings.quickAction = selectedAction.dataset.action;
        }
        
        // Get any additional trip planning data
        if (typeof tripPlanner !== 'undefined') {
            settings.tripData = tripPlanner.getCurrentTripData();
        }
        
        return settings;
    }
    
    /**
     * Gather current controller settings if available
     */
    gatherCurrentControllerSettings() {
        const settings = {};
        
        // Check if there are generated settings available
        if (typeof optimizer !== 'undefined' && optimizer.lastGeneratedSettings) {
            settings.optimized = optimizer.lastGeneratedSettings;
        }
        
        // Check for PDF imported settings
        if (typeof pdfParser !== 'undefined' && pdfParser.lastParsedSettings) {
            settings.imported = pdfParser.lastParsedSettings;
        }
        
        return settings;
    }
    
    /**
     * Apply vehicle data to form
     */
    applyVehicleData(vehicleData) {
        const fieldMappings = {
            'vehicle-model': vehicleData.model,
            'vehicle-year': vehicleData.year,
            'controller-type': vehicleData.controller,
            'motor-type': vehicleData.motorType,
            'motor-model': vehicleData.motorModel,
            'motor-power': vehicleData.motorPower,
            'current-speed': vehicleData.currentSpeed,
            'battery-voltage': vehicleData.batteryVoltage,
            'battery-type': vehicleData.batteryType,
            'battery-capacity': vehicleData.batteryCapacity,
            'tire-diameter': vehicleData.tireDiameter,
            'gear-ratio': vehicleData.gearRatio,
            'motor-age': vehicleData.motorAge,
            'motor-last-service': vehicleData.motorLastService
        };
        
        Object.entries(fieldMappings).forEach(([fieldId, value]) => {
            const element = document.getElementById(fieldId);
            if (element && value) {
                element.value = value;
                element.dispatchEvent(new Event('change'));
            }
        });
        
        // Apply motor condition checkboxes
        if (vehicleData.motorCondition) {
            const conditionMappings = {
                'motor-sparking': vehicleData.motorCondition.sparking,
                'motor-noise': vehicleData.motorCondition.noise,
                'motor-overheating': vehicleData.motorCondition.overheating,
                'motor-vibration': vehicleData.motorCondition.vibration,
                'motor-power-loss': vehicleData.motorCondition.powerLoss
            };
            
            Object.entries(conditionMappings).forEach(([fieldId, checked]) => {
                const element = document.getElementById(fieldId);
                if (element) {
                    element.checked = checked;
                }
            });
        }
    }
    
    /**
     * Apply trip settings if supported
     */
    applyTripSettings(tripSettings) {
        if (tripSettings.quickAction) {
            const button = document.querySelector(`[data-action="${tripSettings.quickAction}"]`);
            if (button) {
                button.classList.add('selected');
            }
        }
    }
    
    /**
     * Setup profile UI components
     */
    setupProfileUI() {
        this.createProfileManagementUI();
        this.addFirebaseScripts();
    }
    
    /**
     * Add Firebase scripts to the page
     */
    addFirebaseScripts() {
        // Check if Firebase scripts are already loaded
        if (document.querySelector('script[src*="firebase"]')) {
            return;
        }
        
        const scripts = [
            'https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js',
            'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js',
            'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js'
        ];
        
        scripts.forEach(src => {
            const script = document.createElement('script');
            script.src = src;
            script.async = true;
            document.head.appendChild(script);
        });
    }
    
    /**
     * Create profile management UI
     */
    createProfileManagementUI() {
        // Add profile section to vehicle information
        const vehicleSection = document.getElementById('vehicle-info-section');
        if (!vehicleSection) return;
        
        const profileSection = document.createElement('div');
        profileSection.id = 'profile-management-section';
        profileSection.className = 'mt-6 pt-6 border-t';
        profileSection.innerHTML = `
            <div class="flex items-center justify-between mb-4">
                <h3 class="font-semibold text-gray-800">Vehicle Profiles</h3>
                <div id="profile-auth-status" class="text-sm text-gray-600">
                    <span data-guest-only>Sign in to save profiles</span>
                    <span data-auth-required class="hidden">
                        <span data-user-info="displayName"></span> • 
                        <button id="sign-out-btn" class="text-red-600 hover:text-red-500">Sign Out</button>
                    </span>
                </div>
            </div>
            
            <!-- Guest UI -->
            <div data-guest-only class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div class="flex items-start">
                    <div class="flex-shrink-0">
                        <svg class="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
                        </svg>
                    </div>
                    <div class="ml-3">
                        <h4 class="text-sm font-medium text-blue-900">Save Your Vehicle Configurations</h4>
                        <p class="text-sm text-blue-700 mt-1">
                            Create an account to save multiple GEM profiles and access them from any device.
                        </p>
                        <div class="mt-3 space-x-2">
                            <button id="show-auth-modal" class="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">
                                Sign In / Sign Up
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Authenticated UI -->
            <div data-auth-required class="hidden">
                <!-- Profile Actions -->
                <div class="mb-4 flex space-x-2">
                    <button id="save-profile-btn" class="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700 disabled:opacity-50">
                        💾 Save Current Profile
                    </button>
                    <button id="load-profile-btn" class="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">
                        📂 Load Profile
                    </button>
                </div>
                
                <!-- Current Profile Display -->
                <div id="current-profile-display" class="hidden mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div class="flex items-center justify-between">
                        <div>
                            <span class="text-sm font-medium text-green-800">Current Profile:</span>
                            <span id="current-profile-name" class="text-sm text-green-700 ml-2"></span>
                        </div>
                        <button id="clear-profile-btn" class="text-xs text-green-600 hover:text-green-500">Clear</button>
                    </div>
                </div>
                
                <!-- Quick Profile List -->
                <div id="quick-profiles" class="grid md:grid-cols-2 gap-3"></div>
            </div>
        `;
        
        vehicleSection.appendChild(profileSection);
        
        // Create modals
        this.createAuthModal();
        this.createProfileModal();
    }
    
    /**
     * Create authentication modal
     */
    createAuthModal() {
        const modal = document.createElement('div');
        modal.id = 'auth-modal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 hidden flex items-center justify-center';
        modal.innerHTML = `
            <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-semibold">Sign In to Your Account</h3>
                    <button id="close-auth-modal" class="text-gray-400 hover:text-gray-600">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
                
                <div id="auth-form">
                    <!-- Sign In Form -->
                    <div id="signin-form">
                        <div class="space-y-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <input type="email" id="signin-email" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Password</label>
                                <input type="password" id="signin-password" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                            </div>
                            <button id="signin-btn" class="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700">
                                Sign In
                            </button>
                            <div class="relative">
                                <div class="absolute inset-0 flex items-center">
                                    <div class="w-full border-t border-gray-300"></div>
                                </div>
                                <div class="relative flex justify-center text-sm">
                                    <span class="px-2 bg-white text-gray-500">Or</span>
                                </div>
                            </div>
                            <button id="google-signin-btn" class="w-full border border-gray-300 text-gray-700 py-2 rounded-md hover:bg-gray-50 flex items-center justify-center">
                                <svg class="w-5 h-5 mr-2" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                </svg>
                                Continue with Google
                            </button>
                        </div>
                        
                        <div class="mt-4 text-center">
                            <button id="show-signup" class="text-sm text-blue-600 hover:text-blue-500">
                                Don't have an account? Sign up
                            </button>
                        </div>
                    </div>
                    
                    <!-- Sign Up Form -->
                    <div id="signup-form" class="hidden">
                        <div class="space-y-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                                <input type="text" id="signup-name" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <input type="email" id="signup-email" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Password</label>
                                <input type="password" id="signup-password" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                            </div>
                            <button id="signup-btn" class="w-full bg-green-600 text-white py-2 rounded-md hover:bg-green-700">
                                Create Account
                            </button>
                        </div>
                        
                        <div class="mt-4 text-center">
                            <button id="show-signin" class="text-sm text-blue-600 hover:text-blue-500">
                                Already have an account? Sign in
                            </button>
                        </div>
                    </div>
                </div>
                
                <div id="auth-error" class="hidden mt-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700"></div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }
    
    /**
     * Create profile management modal
     */
    createProfileModal() {
        const modal = document.createElement('div');
        modal.id = 'profile-modal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 hidden flex items-center justify-center';
        modal.innerHTML = `
            <div class="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-semibold">Manage Vehicle Profiles</h3>
                    <button id="close-profile-modal" class="text-gray-400 hover:text-gray-600">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
                
                <!-- Save New Profile -->
                <div id="save-profile-section" class="mb-6 p-4 bg-gray-50 rounded-lg">
                    <h4 class="font-medium text-gray-800 mb-3">Save Current Configuration</h4>
                    <div class="space-y-3">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Profile Name *</label>
                            <input type="text" id="new-profile-name" placeholder="e.g., My Daily Commuter" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500" required>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
                            <textarea id="new-profile-description" placeholder="Optional description of this configuration" rows="2" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"></textarea>
                        </div>
                        <button id="save-new-profile-btn" class="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700">
                            💾 Save Profile
                        </button>
                    </div>
                </div>
                
                <!-- Existing Profiles -->
                <div>
                    <h4 class="font-medium text-gray-800 mb-3">Your Saved Profiles</h4>
                    <div id="profiles-list" class="space-y-3">
                        <!-- Profiles will be populated here -->
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Auth modal events
        document.getElementById('show-auth-modal')?.addEventListener('click', () => this.showAuthModal());
        document.getElementById('close-auth-modal')?.addEventListener('click', () => this.hideAuthModal());
        document.getElementById('show-signup')?.addEventListener('click', () => this.showSignUpForm());
        document.getElementById('show-signin')?.addEventListener('click', () => this.showSignInForm());
        
        // Auth form events
        document.getElementById('signin-btn')?.addEventListener('click', () => this.handleSignIn());
        document.getElementById('signup-btn')?.addEventListener('click', () => this.handleSignUp());
        document.getElementById('google-signin-btn')?.addEventListener('click', () => this.handleGoogleSignIn());
        document.getElementById('sign-out-btn')?.addEventListener('click', () => this.handleSignOut());
        
        // Profile modal events
        document.getElementById('save-profile-btn')?.addEventListener('click', () => this.showProfileModal());
        document.getElementById('load-profile-btn')?.addEventListener('click', () => this.showProfileModal());
        document.getElementById('close-profile-modal')?.addEventListener('click', () => this.hideProfileModal());
        document.getElementById('save-new-profile-btn')?.addEventListener('click', () => this.handleSaveNewProfile());
        document.getElementById('clear-profile-btn')?.addEventListener('click', () => this.clearCurrentProfile());
        
        // Modal backdrop clicks
        document.getElementById('auth-modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'auth-modal') this.hideAuthModal();
        });
        document.getElementById('profile-modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'profile-modal') this.hideProfileModal();
        });
        
        // Enter key handling
        document.getElementById('signin-password')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleSignIn();
        });
        document.getElementById('signup-password')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleSignUp();
        });
    }
    
    /**
     * Authentication handlers
     */
    async handleSignIn() {
        const email = document.getElementById('signin-email').value;
        const password = document.getElementById('signin-password').value;
        
        if (!email || !password) {
            this.showAuthError('Please enter both email and password');
            return;
        }
        
        const result = await this.firebase.signIn(email, password);
        if (result.success) {
            this.hideAuthModal();
        } else {
            this.showAuthError(result.error);
        }
    }
    
    async handleSignUp() {
        const name = document.getElementById('signup-name').value;
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        
        if (!name || !email || !password) {
            this.showAuthError('Please fill in all fields');
            return;
        }
        
        const result = await this.firebase.signUp(email, password, name);
        if (result.success) {
            this.hideAuthModal();
        } else {
            this.showAuthError(result.error);
        }
    }
    
    async handleGoogleSignIn() {
        const result = await this.firebase.signInWithGoogle();
        if (result.success) {
            this.hideAuthModal();
        } else {
            this.showAuthError(result.error);
        }
    }
    
    async handleSignOut() {
        await this.firebase.signOut();
    }
    
    /**
     * Profile management handlers
     */
    async handleSaveNewProfile() {
        const name = document.getElementById('new-profile-name').value.trim();
        const description = document.getElementById('new-profile-description').value.trim();
        
        if (!name) {
            this.showError('Please enter a profile name');
            return;
        }
        
        const success = await this.saveCurrentProfile(name, description);
        if (success) {
            document.getElementById('new-profile-name').value = '';
            document.getElementById('new-profile-description').value = '';
            this.hideProfileModal();
        }
    }
    
    clearCurrentProfile() {
        this.currentProfile = null;
        this.updateCurrentProfileDisplay();
    }
    
    /**
     * UI update functions
     */
    updateProfileUI() {
        this.updateQuickProfiles();
        this.updateProfilesList();
        this.updateCurrentProfileDisplay();
    }
    
    updateQuickProfiles() {
        const container = document.getElementById('quick-profiles');
        if (!container) return;
        
        container.innerHTML = '';
        
        if (this.profiles.length === 0) {
            container.innerHTML = '<p class="text-sm text-gray-500 col-span-2">No saved profiles yet</p>';
            return;
        }
        
        this.profiles.slice(0, 4).forEach(profile => {
            const profileDiv = document.createElement('div');
            profileDiv.className = 'border border-gray-200 rounded-lg p-3 hover:border-green-400 cursor-pointer transition-colors';
            profileDiv.innerHTML = `
                <div class="flex items-center justify-between mb-2">
                    <h4 class="font-medium text-sm text-gray-800">${profile.name}</h4>
                    <span class="text-xs text-gray-500">${this.formatDate(profile.lastUsed)}</span>
                </div>
                <div class="text-xs text-gray-600">
                    ${profile.vehicleData.model || 'Unknown model'} • ${profile.vehicleData.year || 'Unknown year'}
                </div>
                <div class="mt-2 flex space-x-2">
                    <button class="load-profile-btn text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200" data-profile-id="${profile.id}">
                        Load
                    </button>
                    <button class="delete-profile-btn text-xs bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200" data-profile-id="${profile.id}">
                        Delete
                    </button>
                </div>
            `;
            
            // Add event listeners
            profileDiv.querySelector('.load-profile-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                this.loadProfile(profile.id);
            });
            
            profileDiv.querySelector('.delete-profile-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm(`Delete profile "${profile.name}"?`)) {
                    this.deleteProfile(profile.id);
                }
            });
            
            container.appendChild(profileDiv);
        });
    }
    
    updateProfilesList() {
        const container = document.getElementById('profiles-list');
        if (!container) return;
        
        container.innerHTML = '';
        
        if (this.profiles.length === 0) {
            container.innerHTML = '<p class="text-sm text-gray-500">No saved profiles yet</p>';
            return;
        }
        
        this.profiles.forEach(profile => {
            const profileDiv = document.createElement('div');
            profileDiv.className = 'border border-gray-200 rounded-lg p-4';
            profileDiv.innerHTML = `
                <div class="flex items-start justify-between">
                    <div class="flex-1">
                        <h5 class="font-medium text-gray-800">${profile.name}</h5>
                        <p class="text-sm text-gray-600 mt-1">${profile.description || 'No description'}</p>
                        <div class="text-xs text-gray-500 mt-2">
                            ${profile.vehicleData.model || 'Unknown model'} • ${profile.vehicleData.year || 'Unknown year'} • 
                            Last used: ${this.formatDate(profile.lastUsed)}
                        </div>
                    </div>
                    <div class="flex space-x-2 ml-4">
                        <button class="load-profile-btn text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700" data-profile-id="${profile.id}">
                            Load
                        </button>
                        <button class="delete-profile-btn text-sm bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700" data-profile-id="${profile.id}">
                            Delete
                        </button>
                    </div>
                </div>
            `;
            
            // Add event listeners
            profileDiv.querySelector('.load-profile-btn').addEventListener('click', () => {
                this.loadProfile(profile.id);
                this.hideProfileModal();
            });
            
            profileDiv.querySelector('.delete-profile-btn').addEventListener('click', () => {
                if (confirm(`Delete profile "${profile.name}"?`)) {
                    this.deleteProfile(profile.id);
                }
            });
            
            container.appendChild(profileDiv);
        });
    }
    
    updateCurrentProfileDisplay() {
        const display = document.getElementById('current-profile-display');
        const nameSpan = document.getElementById('current-profile-name');
        
        if (!display || !nameSpan) return;
        
        if (this.currentProfile) {
            nameSpan.textContent = this.currentProfile.name;
            display.classList.remove('hidden');
        } else {
            display.classList.add('hidden');
        }
    }
    
    /**
     * Modal management
     */
    showAuthModal() {
        document.getElementById('auth-modal').classList.remove('hidden');
    }
    
    hideAuthModal() {
        document.getElementById('auth-modal').classList.add('hidden');
        this.clearAuthError();
    }
    
    showProfileModal() {
        document.getElementById('profile-modal').classList.remove('hidden');
    }
    
    hideProfileModal() {
        document.getElementById('profile-modal').classList.add('hidden');
    }
    
    showSignUpForm() {
        document.getElementById('signin-form').classList.add('hidden');
        document.getElementById('signup-form').classList.remove('hidden');
        this.clearAuthError();
    }
    
    showSignInForm() {
        document.getElementById('signup-form').classList.add('hidden');
        document.getElementById('signin-form').classList.remove('hidden');
        this.clearAuthError();
    }
    
    showAuthError(message) {
        const errorDiv = document.getElementById('auth-error');
        errorDiv.textContent = message;
        errorDiv.classList.remove('hidden');
    }
    
    clearAuthError() {
        const errorDiv = document.getElementById('auth-error');
        errorDiv.classList.add('hidden');
    }
    
    showProfileOptions() {
        document.querySelectorAll('[data-auth-required]').forEach(el => el.classList.remove('hidden'));
        document.querySelectorAll('[data-guest-only]').forEach(el => el.classList.add('hidden'));
    }
    
    hideProfileOptions() {
        document.querySelectorAll('[data-auth-required]').forEach(el => el.classList.add('hidden'));
        document.querySelectorAll('[data-guest-only]').forEach(el => el.classList.remove('hidden'));
    }
    
    clearProfiles() {
        this.profiles = [];
        this.currentProfile = null;
        this.updateProfileUI();
    }
    
    /**
     * Utility functions
     */
    formatDate(timestamp) {
        if (!timestamp) return 'Unknown';
        
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        
        return date.toLocaleDateString();
    }
    
    showSuccess(message) {
        this.showNotification(message, 'success');
    }
    
    showError(message) {
        this.showNotification(message, 'error');
    }
    
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 max-w-md ${
            type === 'success' ? 'bg-green-500' : 
            type === 'error' ? 'bg-red-500' : 'bg-blue-500'
        } text-white`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 4000);
    }
}

// Initialize Firebase Profile Manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.firebaseProfileManager = new FirebaseProfileManager();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FirebaseProfileManager;
}
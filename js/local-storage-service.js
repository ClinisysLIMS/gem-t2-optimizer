/**
 * Local Storage Service
 * Uses IndexedDB for local user profiles and data storage (replaces Firebase)
 */
class LocalStorageService {
    constructor() {
        this.dbName = 'GEM_Optimizer_DB';
        this.dbVersion = 1;
        this.db = null;
        this.isInitialized = false;
        
        // Store types
        this.stores = {
            userProfiles: 'user_profiles',
            vehicleSettings: 'vehicle_settings',
            tripHistory: 'trip_history',
            presets: 'presets',
            cacheData: 'cache_data',
            preferences: 'user_preferences'
        };
        
        console.log('Local Storage Service initialized with IndexedDB');
        this.init();
    }
    
    /**
     * Initialize IndexedDB database
     */
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onerror = () => {
                console.error('IndexedDB error:', request.error);
                reject(request.error);
            };
            
            request.onsuccess = () => {
                this.db = request.result;
                this.isInitialized = true;
                console.log('IndexedDB initialized successfully');
                resolve(this.db);
            };
            
            request.onupgradeneeded = (event) => {
                this.db = event.target.result;
                this.createStores();
            };
        });
    }
    
    /**
     * Create object stores (tables)
     */
    createStores() {
        // User profiles store
        if (!this.db.objectStoreNames.contains(this.stores.userProfiles)) {
            const profileStore = this.db.createObjectStore(this.stores.userProfiles, {
                keyPath: 'id',
                autoIncrement: true
            });
            profileStore.createIndex('email', 'email', { unique: true });
            profileStore.createIndex('username', 'username', { unique: true });
            profileStore.createIndex('created', 'created', { unique: false });
        }
        
        // Vehicle settings store
        if (!this.db.objectStoreNames.contains(this.stores.vehicleSettings)) {
            const vehicleStore = this.db.createObjectStore(this.stores.vehicleSettings, {
                keyPath: 'id',
                autoIncrement: true
            });
            vehicleStore.createIndex('userId', 'userId', { unique: false });
            vehicleStore.createIndex('vehicleId', 'vehicleId', { unique: false });
            vehicleStore.createIndex('created', 'created', { unique: false });
        }
        
        // Trip history store
        if (!this.db.objectStoreNames.contains(this.stores.tripHistory)) {
            const tripStore = this.db.createObjectStore(this.stores.tripHistory, {
                keyPath: 'id',
                autoIncrement: true
            });
            tripStore.createIndex('userId', 'userId', { unique: false });
            tripStore.createIndex('date', 'date', { unique: false });
            tripStore.createIndex('type', 'type', { unique: false });
        }
        
        // Presets store
        if (!this.db.objectStoreNames.contains(this.stores.presets)) {
            const presetStore = this.db.createObjectStore(this.stores.presets, {
                keyPath: 'id',
                autoIncrement: true
            });
            presetStore.createIndex('userId', 'userId', { unique: false });
            presetStore.createIndex('name', 'name', { unique: false });
            presetStore.createIndex('type', 'type', { unique: false });
        }
        
        // Cache data store
        if (!this.db.objectStoreNames.contains(this.stores.cacheData)) {
            const cacheStore = this.db.createObjectStore(this.stores.cacheData, {
                keyPath: 'key'
            });
            cacheStore.createIndex('type', 'type', { unique: false });
            cacheStore.createIndex('expires', 'expires', { unique: false });
        }
        
        // User preferences store
        if (!this.db.objectStoreNames.contains(this.stores.preferences)) {
            const prefStore = this.db.createObjectStore(this.stores.preferences, {
                keyPath: 'userId'
            });
            prefStore.createIndex('updated', 'updated', { unique: false });
        }
    }
    
    /**
     * Ensure database is initialized
     */
    async ensureInitialized() {
        if (!this.isInitialized) {
            await this.init();
        }
    }
    
    /**
     * Generic method to save data to a store
     */
    async save(storeName, data) {
        await this.ensureInitialized();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            
            // Add timestamp
            const dataWithTimestamp = {
                ...data,
                updated: new Date().toISOString(),
                created: data.created || new Date().toISOString()
            };
            
            const request = store.put(dataWithTimestamp);
            
            request.onsuccess = () => {
                resolve({ success: true, id: request.result });
            };
            
            request.onerror = () => {
                console.error(`Error saving to ${storeName}:`, request.error);
                reject(request.error);
            };
        });
    }
    
    /**
     * Generic method to get data from a store
     */
    async get(storeName, key) {
        await this.ensureInitialized();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(key);
            
            request.onsuccess = () => {
                resolve(request.result || null);
            };
            
            request.onerror = () => {
                console.error(`Error getting from ${storeName}:`, request.error);
                reject(request.error);
            };
        });
    }
    
    /**
     * Generic method to get all data from a store
     */
    async getAll(storeName, indexName = null, query = null) {
        await this.ensureInitialized();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            
            let request;
            if (indexName && query) {
                const index = store.index(indexName);
                request = index.getAll(query);
            } else {
                request = store.getAll();
            }
            
            request.onsuccess = () => {
                resolve(request.result || []);
            };
            
            request.onerror = () => {
                console.error(`Error getting all from ${storeName}:`, request.error);
                reject(request.error);
            };
        });
    }
    
    /**
     * Generic method to delete data from a store
     */
    async delete(storeName, key) {
        await this.ensureInitialized();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(key);
            
            request.onsuccess = () => {
                resolve({ success: true });
            };
            
            request.onerror = () => {
                console.error(`Error deleting from ${storeName}:`, request.error);
                reject(request.error);
            };
        });
    }
    
    /**
     * User Profile Management
     */
    async createUserProfile(userData) {
        const profile = {
            username: userData.username || 'Guest',
            email: userData.email || null,
            vehicleCount: 0,
            totalTrips: 0,
            totalMiles: 0,
            preferences: {
                units: 'imperial',
                theme: 'light',
                autoSave: true,
                notifications: true
            },
            created: new Date().toISOString()
        };
        
        return await this.save(this.stores.userProfiles, profile);
    }
    
    async getUserProfile(userId) {
        return await this.get(this.stores.userProfiles, userId);
    }
    
    async updateUserProfile(userId, updates) {
        const existing = await this.getUserProfile(userId);
        if (!existing) {
            throw new Error('User profile not found');
        }
        
        const updated = {
            ...existing,
            ...updates,
            id: userId // Ensure ID stays the same
        };
        
        return await this.save(this.stores.userProfiles, updated);
    }
    
    async deleteUserProfile(userId) {
        return await this.delete(this.stores.userProfiles, userId);
    }
    
    /**
     * Vehicle Settings Management
     */
    async saveVehicleSettings(userId, vehicleData) {
        const settings = {
            userId: userId,
            vehicleId: vehicleData.vehicleId || Date.now(),
            make: vehicleData.make || 'GEM',
            model: vehicleData.model || 'e2',
            year: vehicleData.year || 2020,
            vin: vehicleData.vin || null,
            currentSettings: vehicleData.currentSettings || [],
            optimizedSettings: vehicleData.optimizedSettings || [],
            batteryInfo: vehicleData.batteryInfo || {},
            motorInfo: vehicleData.motorInfo || {},
            controllerInfo: vehicleData.controllerInfo || {},
            performance: vehicleData.performance || {},
            notes: vehicleData.notes || ''
        };
        
        return await this.save(this.stores.vehicleSettings, settings);
    }
    
    async getUserVehicles(userId) {
        return await this.getAll(this.stores.vehicleSettings, 'userId', userId);
    }
    
    async getVehicleSettings(vehicleId) {
        const vehicles = await this.getAll(this.stores.vehicleSettings, 'vehicleId', vehicleId);
        return vehicles.length > 0 ? vehicles[0] : null;
    }
    
    async deleteVehicleSettings(vehicleId) {
        const vehicles = await this.getAll(this.stores.vehicleSettings, 'vehicleId', vehicleId);
        if (vehicles.length > 0) {
            return await this.delete(this.stores.vehicleSettings, vehicles[0].id);
        }
        return { success: false, error: 'Vehicle not found' };
    }
    
    /**
     * Trip History Management
     */
    async saveTripHistory(userId, tripData) {
        const trip = {
            userId: userId,
            date: tripData.date || new Date().toISOString(),
            type: tripData.type || 'optimization',
            startLocation: tripData.startLocation || null,
            endLocation: tripData.endLocation || null,
            distance: tripData.distance || 0,
            duration: tripData.duration || 0,
            settings: tripData.settings || [],
            weather: tripData.weather || {},
            performance: tripData.performance || {},
            notes: tripData.notes || '',
            rating: tripData.rating || null
        };
        
        return await this.save(this.stores.tripHistory, trip);
    }
    
    async getUserTripHistory(userId, limit = 50) {
        const trips = await this.getAll(this.stores.tripHistory, 'userId', userId);
        
        // Sort by date descending
        return trips.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, limit);
    }
    
    async getTripsByType(userId, type) {
        const trips = await this.getAll(this.stores.tripHistory, 'userId', userId);
        return trips.filter(trip => trip.type === type);
    }
    
    async deleteTripHistory(tripId) {
        return await this.delete(this.stores.tripHistory, tripId);
    }
    
    /**
     * Presets Management
     */
    async savePreset(userId, presetData) {
        const preset = {
            userId: userId,
            name: presetData.name,
            type: presetData.type || 'settings',
            description: presetData.description || '',
            data: presetData.data || {},
            isPublic: presetData.isPublic || false,
            tags: presetData.tags || [],
            usageCount: 0
        };
        
        return await this.save(this.stores.presets, preset);
    }
    
    async getUserPresets(userId) {
        return await this.getAll(this.stores.presets, 'userId', userId);
    }
    
    async getPresetsByType(userId, type) {
        const presets = await this.getAll(this.stores.presets, 'userId', userId);
        return presets.filter(preset => preset.type === type);
    }
    
    async deletePreset(presetId) {
        return await this.delete(this.stores.presets, presetId);
    }
    
    /**
     * Cache Management
     */
    async saveToCache(key, data, ttlMinutes = 60) {
        const cacheEntry = {
            key: key,
            type: 'general',
            data: data,
            expires: new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString(),
            created: new Date().toISOString()
        };
        
        return await this.save(this.stores.cacheData, cacheEntry);
    }
    
    async getFromCache(key) {
        const entry = await this.get(this.stores.cacheData, key);
        
        if (!entry) return null;
        
        // Check if expired
        if (new Date(entry.expires) < new Date()) {
            await this.delete(this.stores.cacheData, key);
            return null;
        }
        
        return entry.data;
    }
    
    async clearExpiredCache() {
        const allCache = await this.getAll(this.stores.cacheData);
        const now = new Date();
        
        for (const entry of allCache) {
            if (new Date(entry.expires) < now) {
                await this.delete(this.stores.cacheData, entry.key);
            }
        }
    }
    
    /**
     * User Preferences Management
     */
    async saveUserPreferences(userId, preferences) {
        const prefs = {
            userId: userId,
            ...preferences,
            updated: new Date().toISOString()
        };
        
        return await this.save(this.stores.preferences, prefs);
    }
    
    async getUserPreferences(userId) {
        return await this.get(this.stores.preferences, userId);
    }
    
    /**
     * Data Import/Export
     */
    async exportUserData(userId) {
        const profile = await this.getUserProfile(userId);
        const vehicles = await this.getUserVehicles(userId);
        const trips = await this.getUserTripHistory(userId);
        const presets = await this.getUserPresets(userId);
        const preferences = await this.getUserPreferences(userId);
        
        return {
            exportDate: new Date().toISOString(),
            profile: profile,
            vehicles: vehicles,
            tripHistory: trips,
            presets: presets,
            preferences: preferences
        };
    }
    
    async importUserData(userId, importData) {
        try {
            // Import profile updates
            if (importData.profile) {
                await this.updateUserProfile(userId, importData.profile);
            }
            
            // Import vehicles
            if (importData.vehicles) {
                for (const vehicle of importData.vehicles) {
                    vehicle.userId = userId; // Ensure correct user association
                    await this.saveVehicleSettings(userId, vehicle);
                }
            }
            
            // Import trips
            if (importData.tripHistory) {
                for (const trip of importData.tripHistory) {
                    trip.userId = userId;
                    await this.saveTripHistory(userId, trip);
                }
            }
            
            // Import presets
            if (importData.presets) {
                for (const preset of importData.presets) {
                    preset.userId = userId;
                    await this.savePreset(userId, preset);
                }
            }
            
            // Import preferences
            if (importData.preferences) {
                await this.saveUserPreferences(userId, importData.preferences);
            }
            
            return { success: true, message: 'Data imported successfully' };
            
        } catch (error) {
            console.error('Import error:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Database Statistics
     */
    async getStorageStats() {
        const stats = {};
        
        for (const [name, storeName] of Object.entries(this.stores)) {
            const data = await this.getAll(storeName);
            stats[name] = {
                count: data.length,
                size: JSON.stringify(data).length
            };
        }
        
        return {
            totalStores: Object.keys(this.stores).length,
            stores: stats,
            isInitialized: this.isInitialized,
            dbName: this.dbName,
            dbVersion: this.dbVersion
        };
    }
    
    /**
     * Clear all user data (GDPR compliance)
     */
    async clearAllUserData(userId) {
        try {
            await this.deleteUserProfile(userId);
            
            // Delete all related data
            const vehicles = await this.getUserVehicles(userId);
            for (const vehicle of vehicles) {
                await this.delete(this.stores.vehicleSettings, vehicle.id);
            }
            
            const trips = await this.getUserTripHistory(userId);
            for (const trip of trips) {
                await this.delete(this.stores.tripHistory, trip.id);
            }
            
            const presets = await this.getUserPresets(userId);
            for (const preset of presets) {
                await this.delete(this.stores.presets, preset.id);
            }
            
            await this.delete(this.stores.preferences, userId);
            
            return { success: true, message: 'All user data deleted' };
            
        } catch (error) {
            console.error('Clear data error:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Database maintenance
     */
    async performMaintenance() {
        console.log('Performing database maintenance...');
        
        // Clear expired cache
        await this.clearExpiredCache();
        
        // Could add other maintenance tasks here
        // - Compact data
        // - Remove orphaned records
        // - Update indexes
        
        console.log('Database maintenance completed');
    }
    
    /**
     * Check if IndexedDB is supported
     */
    static isSupported() {
        return 'indexedDB' in window;
    }
    
    /**
     * Get database size estimate
     */
    async getDatabaseSize() {
        if ('storage' in navigator && 'estimate' in navigator.storage) {
            const estimate = await navigator.storage.estimate();
            return {
                quota: estimate.quota,
                usage: estimate.usage,
                usageDetails: estimate.usageDetails
            };
        }
        return null;
    }
}

// Create global instance
window.localStorageService = new LocalStorageService();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LocalStorageService;
}
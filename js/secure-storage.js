/**
 * Secure Storage Module
 * Provides encrypted storage for sensitive data like API keys
 */
class SecureStorage {
    constructor() {
        // Simple encryption key derived from a fixed string + browser fingerprint
        // Note: For production use, consider using Web Crypto API with proper key management
        this.encryptionKey = this.generateKey();
    }
    
    /**
     * Generate a pseudo-unique key based on browser characteristics
     * @returns {string} Encryption key
     */
    generateKey() {
        const fingerprint = [
            navigator.userAgent,
            navigator.language,
            new Date().getTimezoneOffset(),
            screen.width + 'x' + screen.height,
            'GEM-T2-Optimizer-2024'
        ].join('|');
        
        return this.simpleHash(fingerprint);
    }
    
    /**
     * Simple hash function for key generation
     * @param {string} str - String to hash
     * @returns {string} Hash value
     */
    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(36);
    }
    
    /**
     * Simple XOR encryption (not cryptographically secure, but better than plaintext)
     * For production, use Web Crypto API
     * @param {string} text - Text to encrypt
     * @param {string} key - Encryption key
     * @returns {string} Encrypted text (base64)
     */
    encrypt(text, key) {
        if (!text) return '';
        
        let encrypted = '';
        for (let i = 0; i < text.length; i++) {
            const textChar = text.charCodeAt(i);
            const keyChar = key.charCodeAt(i % key.length);
            encrypted += String.fromCharCode(textChar ^ keyChar);
        }
        
        // Encode to base64 for storage
        return btoa(encrypted);
    }
    
    /**
     * Simple XOR decryption
     * @param {string} encryptedText - Encrypted text (base64)
     * @param {string} key - Decryption key
     * @returns {string} Decrypted text
     */
    decrypt(encryptedText, key) {
        if (!encryptedText) return '';
        
        try {
            // Decode from base64
            const encrypted = atob(encryptedText);
            
            let decrypted = '';
            for (let i = 0; i < encrypted.length; i++) {
                const encChar = encrypted.charCodeAt(i);
                const keyChar = key.charCodeAt(i % key.length);
                decrypted += String.fromCharCode(encChar ^ keyChar);
            }
            
            return decrypted;
        } catch (error) {
            console.error('Decryption error:', error);
            return '';
        }
    }
    
    /**
     * Store encrypted data
     * @param {string} key - Storage key
     * @param {string} value - Value to store
     */
    setItem(key, value) {
        try {
            const encrypted = this.encrypt(value, this.encryptionKey);
            localStorage.setItem(`gem_secure_${key}`, encrypted);
            
            // Store a hash of the key for validation
            const keyHash = this.simpleHash(this.encryptionKey + key);
            localStorage.setItem(`gem_secure_${key}_hash`, keyHash);
        } catch (error) {
            console.error('Storage error:', error);
        }
    }
    
    /**
     * Retrieve and decrypt data
     * @param {string} key - Storage key
     * @returns {string|null} Decrypted value or null
     */
    getItem(key) {
        try {
            const encrypted = localStorage.getItem(`gem_secure_${key}`);
            const storedHash = localStorage.getItem(`gem_secure_${key}_hash`);
            
            if (!encrypted) return null;
            
            // Validate key hash
            const expectedHash = this.simpleHash(this.encryptionKey + key);
            if (storedHash !== expectedHash) {
                console.warn('Key validation failed, data may be corrupted');
                return null;
            }
            
            return this.decrypt(encrypted, this.encryptionKey);
        } catch (error) {
            console.error('Retrieval error:', error);
            return null;
        }
    }
    
    /**
     * Remove encrypted data
     * @param {string} key - Storage key
     */
    removeItem(key) {
        localStorage.removeItem(`gem_secure_${key}`);
        localStorage.removeItem(`gem_secure_${key}_hash`);
    }
    
    /**
     * Check if encrypted data exists
     * @param {string} key - Storage key
     * @returns {boolean} True if exists
     */
    hasItem(key) {
        return localStorage.getItem(`gem_secure_${key}`) !== null;
    }
    
    /**
     * Clear all encrypted data
     */
    clear() {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.startsWith('gem_secure_')) {
                localStorage.removeItem(key);
            }
        });
    }
    
    /**
     * Store multiple API keys securely
     * @param {Object} apiKeys - Object containing API keys
     */
    storeAPIKeys(apiKeys) {
        Object.entries(apiKeys).forEach(([name, key]) => {
            if (key && key.trim()) {
                this.setItem(`api_${name}`, key);
            }
        });
    }
    
    /**
     * Retrieve all API keys
     * @returns {Object} Object containing decrypted API keys
     */
    getAPIKeys() {
        return {
            openweather: this.getItem('api_openweather') || '',
            mapbox: this.getItem('api_mapbox') || ''
        };
    }
    
    /**
     * Validate API key format
     * @param {string} keyName - Name of the API key
     * @param {string} key - API key to validate
     * @returns {boolean} True if valid format
     */
    validateAPIKey(keyName, key) {
        if (!key || typeof key !== 'string') return false;
        
        const patterns = {
            openweather: /^[a-f0-9]{32}$/i, // 32 hex characters
            mapbox: /^pk\.[a-zA-Z0-9_-]{50,100}$/ // Starts with 'pk.' followed by 50-100 chars
        };
        
        const pattern = patterns[keyName];
        return pattern ? pattern.test(key.trim()) : true;
    }
    
    /**
     * Get storage info
     * @returns {Object} Storage information
     */
    getStorageInfo() {
        const keys = Object.keys(localStorage);
        const secureKeys = keys.filter(k => k.startsWith('gem_secure_'));
        
        return {
            totalKeys: keys.length,
            secureKeys: secureKeys.length / 2, // Divide by 2 because each item has a hash
            storageUsed: new Blob(Object.values(localStorage)).size,
            hasOpenWeatherKey: this.hasItem('api_openweather'),
            hasMapboxKey: this.hasItem('api_mapbox')
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SecureStorage;
}
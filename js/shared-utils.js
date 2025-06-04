/**
 * Shared Utility Functions
 * Common utilities used across multiple modules to eliminate duplication
 */
class SharedUtils {
    /**
     * Calculate distance between two coordinates using Haversine formula
     * @param {number} lat1 - Latitude of first point
     * @param {number} lon1 - Longitude of first point
     * @param {number} lat2 - Latitude of second point
     * @param {number} lon2 - Longitude of second point
     * @returns {number} Distance in kilometers
     */
    static calculateDistance(lat1, lon1, lat2, lon2) {
        if (lat1 === lat2 && lon1 === lon2) return 0;
        
        const R = 6371; // Earth's radius in kilometers
        const dLat = this.toRadians(lat2 - lat1);
        const dLon = this.toRadians(lon2 - lon1);
        
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }
    
    /**
     * Convert degrees to radians
     * @param {number} degrees - Angle in degrees
     * @returns {number} Angle in radians
     */
    static toRadians(degrees) {
        return degrees * (Math.PI / 180);
    }
    
    /**
     * Get season from date
     * @param {Date} date - Date object
     * @returns {string} Season name (winter, spring, summer, fall)
     */
    static getSeason(date) {
        if (!date || !(date instanceof Date)) {
            date = new Date();
        }
        
        const month = date.getMonth();
        if (month >= 11 || month <= 1) return 'winter';
        if (month >= 2 && month <= 4) return 'spring';
        if (month >= 5 && month <= 7) return 'summer';
        return 'fall';
    }
    
    /**
     * Validate input data with comprehensive type checking
     * @param {*} value - Value to validate
     * @param {string} type - Expected type
     * @param {*} defaultValue - Default value if validation fails
     * @returns {*} Validated value or default
     */
    static validateInput(value, type, defaultValue = null) {
        try {
            switch (type.toLowerCase()) {
                case 'number':
                    const num = Number(value);
                    return !isNaN(num) && isFinite(num) ? num : defaultValue;
                
                case 'string':
                    return typeof value === 'string' ? value : String(defaultValue || '');
                
                case 'boolean':
                    return typeof value === 'boolean' ? value : Boolean(defaultValue);
                
                case 'array':
                    return Array.isArray(value) ? value : (defaultValue || []);
                
                case 'object':
                    return value && typeof value === 'object' && !Array.isArray(value) ? 
                           value : (defaultValue || {});
                
                default:
                    return value !== null && value !== undefined ? value : defaultValue;
            }
        } catch (error) {
            console.warn(`Input validation failed for type ${type}:`, error);
            return defaultValue;
        }
    }
    
    /**
     * Safe mathematical operations with bounds checking
     * @param {string} operation - Operation type (divide, multiply, add, subtract)
     * @param {number} a - First operand
     * @param {number} b - Second operand
     * @param {number} min - Minimum allowed result
     * @param {number} max - Maximum allowed result
     * @returns {number} Result within bounds
     */
    static safeMath(operation, a, b, min = -Infinity, max = Infinity) {
        try {
            // Validate inputs
            a = this.validateInput(a, 'number', 0);
            b = this.validateInput(b, 'number', 0);
            
            let result;
            switch (operation.toLowerCase()) {
                case 'divide':
                    result = b !== 0 ? a / b : (a >= 0 ? max : min);
                    break;
                case 'multiply':
                    result = a * b;
                    break;
                case 'add':
                    result = a + b;
                    break;
                case 'subtract':
                    result = a - b;
                    break;
                default:
                    throw new Error(`Unknown operation: ${operation}`);
            }
            
            // Apply bounds
            if (!isFinite(result) || isNaN(result)) {
                return a >= 0 ? Math.min(max, 0) : Math.max(min, 0);
            }
            
            return Math.max(min, Math.min(max, result));
        } catch (error) {
            console.warn(`Safe math operation failed:`, error);
            return min;
        }
    }
    
    /**
     * Debounce function to limit rapid function calls
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in milliseconds
     * @returns {Function} Debounced function
     */
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    /**
     * Deep clone object safely
     * @param {*} obj - Object to clone
     * @returns {*} Cloned object
     */
    static deepClone(obj) {
        try {
            if (obj === null || typeof obj !== 'object') return obj;
            if (obj instanceof Date) return new Date(obj.getTime());
            if (obj instanceof Array) return obj.map(item => this.deepClone(item));
            if (typeof obj === 'object') {
                const cloned = {};
                Object.keys(obj).forEach(key => {
                    cloned[key] = this.deepClone(obj[key]);
                });
                return cloned;
            }
            return obj;
        } catch (error) {
            console.warn('Deep clone failed:', error);
            return obj;
        }
    }
    
    /**
     * Format error messages for user display
     * @param {Error} error - Error object
     * @param {string} context - Context where error occurred
     * @returns {string} User-friendly error message
     */
    static formatUserError(error, context = '') {
        const baseMessage = context ? `${context}: ` : '';
        
        if (error.name === 'TypeError') {
            return `${baseMessage}Invalid data format. Please check your inputs.`;
        } else if (error.name === 'RangeError') {
            return `${baseMessage}Value out of acceptable range. Please adjust your settings.`;
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
            return `${baseMessage}Connection issue. The app will use offline calculations.`;
        } else if (error.message.includes('timeout')) {
            return `${baseMessage}Operation timed out. Please try again.`;
        } else {
            return `${baseMessage}An unexpected error occurred. The app will continue with safe defaults.`;
        }
    }
    
    /**
     * Generate unique ID
     * @returns {string} Unique identifier
     */
    static generateId() {
        return 'id_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36);
    }
    
    /**
     * Check if value is within valid range
     * @param {number} value - Value to check
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {boolean} True if value is within range
     */
    static isInRange(value, min, max) {
        const num = this.validateInput(value, 'number');
        return num >= min && num <= max;
    }
    
    /**
     * Clamp value to range
     * @param {number} value - Value to clamp
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number} Clamped value
     */
    static clamp(value, min, max) {
        const num = this.validateInput(value, 'number', min);
        return Math.max(min, Math.min(max, num));
    }
}

// Create global instance for easy access
if (typeof window !== 'undefined') {
    window.SharedUtils = SharedUtils;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SharedUtils;
}
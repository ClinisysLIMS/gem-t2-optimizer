/**
 * Backend API Client
 * Handles all API calls through the secure backend proxy
 */
class BackendAPIClient {
    constructor() {
        // Backend server configuration
        this.baseUrl = process.env.NODE_ENV === 'production' 
            ? 'https://your-backend-domain.com'  // Replace with your actual backend URL
            : 'http://localhost:3001';
        
        this.cache = new Map();
        this.cacheTimeout = 3600000; // 1 hour
        this.requestQueue = new Map();
        
        this.initialize();
    }
    
    /**
     * Initialize the backend API client
     */
    async initialize() {
        // Test backend connection
        await this.testConnection();
        console.log('Backend API client initialized');
    }
    
    /**
     * Test connection to backend
     */
    async testConnection() {
        try {
            const response = await fetch(`${this.baseUrl}/health`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Backend not available: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Backend connection successful:', data.status);
            return true;
            
        } catch (error) {
            console.warn('Backend connection failed:', error.message);
            return false;
        }
    }
    
    /**
     * Generic API request method with caching and error handling
     */
    async makeRequest(endpoint, options = {}) {
        const {
            method = 'GET',
            body = null,
            cache = true,
            timeout = 30000,
            retries = 3
        } = options;
        
        // Create cache key
        const cacheKey = `${method}:${endpoint}:${JSON.stringify(body)}`;
        
        // Check cache first
        if (cache && method === 'GET') {
            const cached = this.cache.get(cacheKey);
            if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
                console.log(`Cache hit for ${endpoint}`);
                return { ...cached.data, cached: true };
            }
        }
        
        // Check if request is already in progress
        if (this.requestQueue.has(cacheKey)) {
            console.log(`Request already in progress for ${endpoint}`);
            return await this.requestQueue.get(cacheKey);
        }
        
        // Create the request promise
        const requestPromise = this.executeRequest(endpoint, {
            method,
            body,
            timeout,
            retries
        });
        
        // Add to queue
        this.requestQueue.set(cacheKey, requestPromise);
        
        try {
            const result = await requestPromise;
            
            // Cache successful GET requests
            if (cache && method === 'GET' && result.success) {
                this.cache.set(cacheKey, {
                    data: result,
                    timestamp: Date.now()
                });
            }
            
            return result;
            
        } finally {
            // Remove from queue
            this.requestQueue.delete(cacheKey);
        }
    }
    
    /**
     * Execute the actual HTTP request
     */
    async executeRequest(endpoint, options) {
        const { method, body, timeout, retries } = options;
        
        const requestOptions = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            }
        };
        
        if (body) {
            requestOptions.body = JSON.stringify(body);
        }
        
        // Add timeout using AbortController
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        requestOptions.signal = controller.signal;
        
        let lastError;
        
        for (let attempt = 0; attempt < retries; attempt++) {
            try {
                const response = await fetch(`${this.baseUrl}${endpoint}`, requestOptions);
                clearTimeout(timeoutId);
                
                if (!response.ok) {
                    // Handle specific HTTP errors
                    if (response.status === 429) {
                        throw new Error('Rate limit exceeded. Please try again later.');
                    } else if (response.status === 403) {
                        throw new Error('Access denied. CORS or authentication issue.');
                    } else if (response.status >= 500) {
                        throw new Error(`Server error: ${response.status}`);
                    } else {
                        const errorData = await response.json().catch(() => ({}));
                        throw new Error(errorData.message || `HTTP ${response.status}`);
                    }
                }
                
                const data = await response.json();
                return data;
                
            } catch (error) {
                lastError = error;
                console.warn(`Request attempt ${attempt + 1} failed:`, error.message);
                
                // Don't retry on certain errors
                if (error.name === 'AbortError' || 
                    error.message.includes('Rate limit') ||
                    error.message.includes('Access denied')) {
                    break;
                }
                
                // Wait before retrying (exponential backoff)
                if (attempt < retries - 1) {
                    await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
                }
            }
        }
        
        clearTimeout(timeoutId);
        throw lastError;
    }
    
    /**
     * Weather API methods
     */
    async getCurrentWeather(location, units = 'imperial') {
        return await this.makeRequest(`/api/weather/current/${encodeURIComponent(location)}?units=${units}`);
    }
    
    async getWeatherForecast(location, days = 5, units = 'imperial') {
        return await this.makeRequest(`/api/weather/forecast/${encodeURIComponent(location)}?days=${days}&units=${units}`);
    }
    
    async getDetailedWeather(location, date, units = 'imperial') {
        return await this.makeRequest('/api/weather/detailed', {
            method: 'POST',
            body: { location, date, units }
        });
    }
    
    /**
     * Maps API methods
     */
    async getDirections(origin, destination, options = {}) {
        const {
            mode = 'driving',
            avoid = [],
            waypoints = [],
            alternatives = true
        } = options;
        
        return await this.makeRequest('/api/maps/directions', {
            method: 'POST',
            body: {
                origin,
                destination,
                mode,
                avoid,
                waypoints,
                alternatives
            }
        });
    }
    
    async searchPlaces(query, location = null, radius = 10000, type = null) {
        const params = new URLSearchParams({ query });
        if (location) params.append('location', location);
        if (radius) params.append('radius', radius);
        if (type) params.append('type', type);
        
        return await this.makeRequest(`/api/maps/places/search?${params}`);
    }
    
    async getDistanceMatrix(origins, destinations, mode = 'driving', units = 'imperial') {
        return await this.makeRequest('/api/maps/distance-matrix', {
            method: 'POST',
            body: {
                origins,
                destinations,
                mode,
                units
            }
        });
    }
    
    /**
     * Elevation API methods
     */
    async getElevationForLocations(locations) {
        return await this.makeRequest('/api/elevation/locations', {
            method: 'POST',
            body: { locations }
        });
    }
    
    async getElevationProfile(path, samples = 100) {
        return await this.makeRequest('/api/elevation/path', {
            method: 'POST',
            body: { path, samples }
        });
    }
    
    /**
     * Geocoding API methods
     */
    async geocodeAddress(address, options = {}) {
        const params = new URLSearchParams({ address });
        Object.entries(options).forEach(([key, value]) => {
            if (value) params.append(key, value);
        });
        
        return await this.makeRequest(`/api/geocoding/forward?${params}`);
    }
    
    async reverseGeocode(lat, lng, options = {}) {
        const params = new URLSearchParams({ lat, lng });
        Object.entries(options).forEach(([key, value]) => {
            if (value) params.append(key, value);
        });
        
        return await this.makeRequest(`/api/geocoding/reverse?${params}`);
    }
    
    async batchGeocode(addresses) {
        return await this.makeRequest('/api/geocoding/batch', {
            method: 'POST',
            body: { addresses }
        });
    }
    
    /**
     * Utility methods
     */
    async getBackendStatus() {
        return await this.makeRequest('/api/status');
    }
    
    clearCache() {
        this.cache.clear();
        console.log('Backend API cache cleared');
    }
    
    getCacheStats() {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys()),
            totalSize: JSON.stringify(Array.from(this.cache.values())).length
        };
    }
    
    /**
     * Check if backend is available
     */
    async isBackendAvailable() {
        try {
            await this.testConnection();
            return true;
        } catch (error) {
            return false;
        }
    }
    
    /**
     * Get supported features from backend
     */
    async getSupportedFeatures() {
        try {
            const status = await this.getBackendStatus();
            return status.data?.features || {};
        } catch (error) {
            console.warn('Could not get backend features:', error.message);
            return {};
        }
    }
}

// Create global instance
window.backendAPI = new BackendAPIClient();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BackendAPIClient;
}
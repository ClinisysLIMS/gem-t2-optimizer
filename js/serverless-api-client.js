/**
 * Serverless API Client
 * Frontend client for calling serverless functions on Netlify/Vercel
 * Handles all external API calls through secure serverless endpoints
 */
class ServerlessAPIClient {
    constructor() {
        // Auto-detect the base URL based on environment
        this.baseUrl = this.detectBaseUrl();
        this.requestQueue = new Map();
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes default cache
        
        // Rate limiting
        this.rateLimits = new Map();
        this.defaultRateLimit = 1000; // 1 second between requests
        
        console.log('Serverless API Client initialized:', this.baseUrl);
    }
    
    /**
     * Auto-detect the base URL for API calls
     */
    detectBaseUrl() {
        if (typeof window === 'undefined') {
            // Server-side environment
            return 'http://localhost:8888';
        }
        
        const hostname = window.location.hostname;
        const protocol = window.location.protocol;
        
        // Production environments
        if (hostname.includes('netlify.app') || hostname.includes('netlify.com')) {
            return `${protocol}//${hostname}`;
        }
        if (hostname.includes('vercel.app') || hostname.includes('vercel.com')) {
            return `${protocol}//${hostname}`;
        }
        
        // Custom domain
        if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
            return `${protocol}//${hostname}`;
        }
        
        // Local development
        const port = window.location.port;
        if (port === '8888' || port === '3000') {
            // Netlify dev or common dev ports
            return `${protocol}//${hostname}:${port}`;
        }
        
        // Default fallback
        return `${protocol}//${hostname}${port ? ':' + port : ''}`;
    }
    
    /**
     * Make HTTP request with caching and rate limiting
     */
    async makeRequest(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const cacheKey = `${options.method || 'GET'}:${url}:${JSON.stringify(options.params || {})}`;
        
        // Check cache first (for GET requests)
        if ((!options.method || options.method === 'GET') && this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < (options.cacheTimeout || this.cacheTimeout)) {
                return { ...cached.data, cached: true };
            } else {
                this.cache.delete(cacheKey);
            }
        }
        
        // Check if request is already in progress
        if (this.requestQueue.has(cacheKey)) {
            return await this.requestQueue.get(cacheKey);
        }
        
        // Rate limiting
        await this.enforceRateLimit(endpoint);
        
        // Create request promise
        const requestPromise = this.executeRequest(url, options);
        this.requestQueue.set(cacheKey, requestPromise);
        
        try {
            const result = await requestPromise;
            
            // Cache successful GET requests
            if ((!options.method || options.method === 'GET') && result.success) {
                this.cache.set(cacheKey, {
                    data: result,
                    timestamp: Date.now()
                });
            }
            
            return result;
            
        } finally {
            this.requestQueue.delete(cacheKey);
        }
    }
    
    /**
     * Execute the actual HTTP request
     */
    async executeRequest(url, options = {}) {
        try {
            const requestOptions = {
                method: options.method || 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                }
            };
            
            // Add query parameters for GET requests
            if (options.params && (!options.method || options.method === 'GET')) {
                const searchParams = new URLSearchParams();
                Object.entries(options.params).forEach(([key, value]) => {
                    if (value !== null && value !== undefined) {
                        searchParams.append(key, value.toString());
                    }
                });
                url += `?${searchParams.toString()}`;
            }
            
            // Add body for POST requests
            if (options.body || (options.params && options.method === 'POST')) {
                requestOptions.body = JSON.stringify(options.body || options.params);
            }
            
            const response = await fetch(url, requestOptions);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            return data;
            
        } catch (error) {
            console.error('Request failed:', url, error);
            return {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }
    
    /**
     * Rate limiting to be respectful to free services
     */
    async enforceRateLimit(endpoint) {
        const now = Date.now();
        const lastRequest = this.rateLimits.get(endpoint) || 0;
        const timeSinceLastRequest = now - lastRequest;
        
        if (timeSinceLastRequest < this.defaultRateLimit) {
            const delay = this.defaultRateLimit - timeSinceLastRequest;
            await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        this.rateLimits.set(endpoint, Date.now());
    }
    
    /**
     * Weather API calls
     */
    async getCurrentWeather(location, units = 'imperial') {
        return await this.makeRequest('/api/weather', {
            params: {
                location: location,
                type: 'current',
                units: units
            }
        });
    }
    
    async getWeatherForecast(location, days = 7, units = 'imperial') {
        return await this.makeRequest('/api/weather', {
            params: {
                location: location,
                type: 'forecast',
                days: days,
                units: units
            }
        });
    }
    
    async getWeatherForDate(location, date, units = 'imperial') {
        return await this.makeRequest('/api/weather', {
            params: {
                location: location,
                type: 'current', // Will handle date logic server-side
                units: units,
                date: date instanceof Date ? date.toISOString() : date
            }
        });
    }
    
    /**
     * Geocoding API calls
     */
    async geocodeAddress(address, options = {}) {
        return await this.makeRequest('/api/geocoding', {
            params: {
                type: 'forward',
                address: address,
                limit: options.limit || 5,
                source: options.source || 'auto',
                countryCode: options.countryCode,
                radius: options.radius
            }
        });
    }
    
    async reverseGeocode(lat, lng, options = {}) {
        return await this.makeRequest('/api/geocoding', {
            params: {
                type: 'reverse',
                lat: lat,
                lng: lng,
                source: options.source || 'auto'
            }
        });
    }
    
    async searchPlaces(query, options = {}) {
        return await this.makeRequest('/api/geocoding', {
            params: {
                type: 'places',
                q: query,
                lat: options.lat,
                lng: options.lng,
                limit: options.limit || 10,
                countryCode: options.countryCode,
                radius: options.radius
            }
        });
    }
    
    /**
     * Elevation API calls
     */
    async getElevation(lat, lng, source = 'auto') {
        return await this.makeRequest('/api/elevation', {
            params: {
                type: 'point',
                lat: lat,
                lng: lng,
                source: source
            }
        });
    }
    
    async getElevationForLocations(locations, source = 'auto') {
        // Format locations for API
        const locationString = locations.map(loc => {
            if (typeof loc === 'string') return loc;
            return `${loc.lat},${loc.lng}`;
        }).join(';');
        
        return await this.makeRequest('/api/elevation', {
            params: {
                type: 'point',
                locations: locationString,
                source: source
            }
        });
    }
    
    async getElevationProfile(path, samples = 100, source = 'auto') {
        return await this.makeRequest('/api/elevation', {
            method: 'POST',
            body: {
                type: 'profile',
                path: path,
                samples: samples,
                source: source
            }
        });
    }
    
    /**
     * Maps/Routing API calls
     */
    async getDirections(origin, destination, options = {}) {
        return await this.makeRequest('/api/maps', {
            params: {
                type: 'directions',
                origin: typeof origin === 'string' ? origin : `${origin.lat},${origin.lng}`,
                destination: typeof destination === 'string' ? destination : `${destination.lat},${destination.lng}`,
                mode: options.mode || 'driving',
                alternatives: options.alternatives || 'true',
                avoid: options.avoid || '',
                waypoints: options.waypoints || '',
                source: options.source || 'auto',
                units: options.units || 'imperial'
            }
        });
    }
    
    /**
     * Batch operations
     */
    async batchRequests(requests) {
        const results = await Promise.allSettled(
            requests.map(request => this.makeRequest(request.endpoint, request.options))
        );
        
        return results.map((result, index) => ({
            request: requests[index],
            success: result.status === 'fulfilled',
            data: result.status === 'fulfilled' ? result.value : null,
            error: result.status === 'rejected' ? result.reason.message : null
        }));
    }
    
    /**
     * Health check for serverless functions
     */
    async healthCheck() {
        const endpoints = ['/api/weather', '/api/geocoding', '/api/elevation', '/api/maps'];
        const startTime = Date.now();
        
        const results = await Promise.allSettled(
            endpoints.map(async endpoint => {
                try {
                    const testStart = Date.now();
                    // Simple test requests
                    let testResult;
                    
                    if (endpoint === '/api/weather') {
                        testResult = await this.getCurrentWeather('New York');
                    } else if (endpoint === '/api/geocoding') {
                        testResult = await this.geocodeAddress('New York');
                    } else if (endpoint === '/api/elevation') {
                        testResult = await this.getElevation(40.7128, -74.0060);
                    } else if (endpoint === '/api/maps') {
                        testResult = await this.getDirections('New York', 'Boston');
                    }
                    
                    const testTime = Date.now() - testStart;
                    
                    return {
                        endpoint: endpoint,
                        available: testResult.success,
                        responseTime: testTime,
                        error: testResult.error || null
                    };
                } catch (error) {
                    return {
                        endpoint: endpoint,
                        available: false,
                        responseTime: null,
                        error: error.message
                    };
                }
            })
        );
        
        const totalTime = Date.now() - startTime;
        
        return {
            overall: {
                healthy: results.every(r => r.status === 'fulfilled' && r.value.available),
                totalTime: totalTime,
                baseUrl: this.baseUrl
            },
            endpoints: results.map(r => r.status === 'fulfilled' ? r.value : {
                endpoint: 'unknown',
                available: false,
                responseTime: null,
                error: r.reason.message
            })
        };
    }
    
    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
        console.log('API cache cleared');
    }
    
    /**
     * Get cache statistics
     */
    getCacheStats() {
        return {
            size: this.cache.size,
            entries: Array.from(this.cache.keys()),
            memoryUsage: JSON.stringify(Array.from(this.cache.values())).length
        };
    }
    
    /**
     * Update base URL (useful for testing different environments)
     */
    setBaseUrl(url) {
        this.baseUrl = url.replace(/\/$/, ''); // Remove trailing slash
        console.log('API base URL updated:', this.baseUrl);
    }
    
    /**
     * Test connection to serverless functions
     */
    async testConnection() {
        try {
            const testUrl = `${this.baseUrl}/api/weather?location=test&type=current`;
            const response = await fetch(testUrl, { method: 'HEAD' });
            
            return {
                connected: response.ok || response.status === 405, // 405 is OK (method not allowed but service exists)
                status: response.status,
                baseUrl: this.baseUrl
            };
        } catch (error) {
            return {
                connected: false,
                status: null,
                baseUrl: this.baseUrl,
                error: error.message
            };
        }
    }
    
    /**
     * Get API status and configuration
     */
    getStatus() {
        return {
            baseUrl: this.baseUrl,
            cacheSize: this.cache.size,
            rateLimits: Object.fromEntries(this.rateLimits),
            requestQueue: this.requestQueue.size,
            environment: this.detectEnvironment()
        };
    }
    
    /**
     * Detect current environment
     */
    detectEnvironment() {
        if (typeof window === 'undefined') return 'server';
        
        const hostname = window.location.hostname;
        
        if (hostname.includes('netlify')) return 'netlify';
        if (hostname.includes('vercel')) return 'vercel';
        if (hostname === 'localhost' || hostname === '127.0.0.1') return 'development';
        
        return 'production';
    }
}

// Create global instance
window.serverlessAPIClient = new ServerlessAPIClient();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ServerlessAPIClient;
}
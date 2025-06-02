/**
 * Comprehensive API Manager
 * Centralized management for all external API integrations with fallback support
 */
class APIManager {
    constructor() {
        this.secureStorage = window.secureStorage || (window.secureStorage = new SecureStorage());
        
        this.apis = {
            googleMaps: {
                key: null,
                baseUrl: 'https://maps.googleapis.com/maps/api',
                isConfigured: false,
                fallbackAvailable: true
            },
            openai: {
                key: null,
                baseUrl: 'https://api.openai.com/v1',
                isConfigured: false,
                fallbackAvailable: true
            },
            claude: {
                key: null,
                baseUrl: 'https://api.anthropic.com/v1',
                isConfigured: false,
                fallbackAvailable: true
            },
            mapbox: {
                key: null,
                baseUrl: 'https://api.mapbox.com',
                isConfigured: false,
                fallbackAvailable: true
            },
            openweather: {
                key: null,
                baseUrl: 'https://api.openweathermap.org/data/2.5',
                isConfigured: false,
                fallbackAvailable: true
            }
        };
        
        this.cache = new Map();
        this.cacheTimeout = 3600000; // 1 hour
        this.requestQueue = new Map(); // Queue per API
        this.rateLimits = new Map(); // Rate limiting per API
        
        this.initialize();
    }
    
    /**
     * Initialize API Manager
     */
    async initialize() {
        // Load stored API keys
        this.loadStoredAPIKeys();
        
        // Initialize rate limiting
        this.setupRateLimiting();
        
        // Test API connections
        await this.testAllAPIs();
        
        console.log('API Manager initialized with services:', this.getConfiguredAPIs());
    }
    
    /**
     * Load stored API keys from secure storage
     */
    loadStoredAPIKeys() {
        const apiKeys = {
            googleMaps: this.secureStorage.getItem('api_google_maps'),
            openai: this.secureStorage.getItem('api_openai'),
            claude: this.secureStorage.getItem('api_claude'),
            mapbox: this.secureStorage.getItem('api_mapbox'),
            openweather: this.secureStorage.getItem('api_openweather')
        };
        
        Object.entries(apiKeys).forEach(([api, key]) => {
            if (key) {
                this.apis[api].key = key;
                this.apis[api].isConfigured = true;
            }
        });
    }
    
    /**
     * Set API key and store securely
     */
    setAPIKey(apiName, key) {
        if (!this.apis[apiName]) {
            throw new Error(`Unknown API: ${apiName}`);
        }
        
        if (key && key.trim()) {
            this.apis[apiName].key = key.trim();
            this.apis[apiName].isConfigured = true;
            this.secureStorage.setItem(`api_${apiName}`, key.trim());
        } else {
            this.apis[apiName].key = null;
            this.apis[apiName].isConfigured = false;
            this.secureStorage.removeItem(`api_${apiName}`);
        }
        
        // Test the API after setting key
        this.testAPI(apiName);
    }
    
    /**
     * Test all configured APIs
     */
    async testAllAPIs() {
        const tests = Object.keys(this.apis).map(api => this.testAPI(api));
        await Promise.allSettled(tests);
    }
    
    /**
     * Test specific API connection
     */
    async testAPI(apiName) {
        const api = this.apis[apiName];
        if (!api.isConfigured) return false;
        
        try {
            switch (apiName) {
                case 'googleMaps':
                    return await this.testGoogleMapsAPI();
                case 'openai':
                    return await this.testOpenAIAPI();
                case 'claude':
                    return await this.testClaudeAPI();
                case 'mapbox':
                    return await this.testMapboxAPI();
                case 'openweather':
                    return await this.testOpenWeatherAPI();
                default:
                    return false;
            }
        } catch (error) {
            console.warn(`API test failed for ${apiName}:`, error);
            return false;
        }
    }
    
    /**
     * Get configured APIs
     */
    getConfiguredAPIs() {
        return Object.entries(this.apis)
            .filter(([_, api]) => api.isConfigured)
            .map(([name, _]) => name);
    }
    
    /**
     * Setup rate limiting for APIs
     */
    setupRateLimiting() {
        this.rateLimits.set('googleMaps', { requests: 0, limit: 100, window: 1000 }); // 100 req/sec
        this.rateLimits.set('openai', { requests: 0, limit: 60, window: 60000 }); // 60 req/min
        this.rateLimits.set('claude', { requests: 0, limit: 100, window: 60000 }); // 100 req/min
        this.rateLimits.set('mapbox', { requests: 0, limit: 600, window: 60000 }); // 600 req/min
        this.rateLimits.set('openweather', { requests: 0, limit: 60, window: 60000 }); // 60 req/min
        
        // Reset counters periodically
        Object.keys(this.apis).forEach(api => {
            const limit = this.rateLimits.get(api);
            if (limit) {
                setInterval(() => {
                    limit.requests = 0;
                }, limit.window);
            }
        });
    }
    
    /**
     * Check rate limit for API
     */
    checkRateLimit(apiName) {
        const limit = this.rateLimits.get(apiName);
        if (!limit) return true;
        
        if (limit.requests >= limit.limit) {
            console.warn(`Rate limit reached for ${apiName}`);
            return false;
        }
        
        limit.requests++;
        return true;
    }
    
    /**
     * Make API request with fallback support
     */
    async makeAPIRequest(apiName, endpoint, options = {}) {
        const api = this.apis[apiName];
        
        // Check if API is configured
        if (!api.isConfigured) {
            console.log(`${apiName} not configured, using fallback`);
            return this.getFallbackResponse(apiName, endpoint, options);
        }
        
        // Check rate limit
        if (!this.checkRateLimit(apiName)) {
            return this.getFallbackResponse(apiName, endpoint, options);
        }
        
        // Check cache
        const cacheKey = `${apiName}:${endpoint}:${JSON.stringify(options)}`;
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;
        
        try {
            const response = await this.executeAPIRequest(apiName, endpoint, options);
            
            // Cache successful response
            if (response.success) {
                this.setCache(cacheKey, response);
            }
            
            return response;
            
        } catch (error) {
            console.error(`API request failed for ${apiName}:`, error);
            return this.getFallbackResponse(apiName, endpoint, options);
        }
    }
    
    /**
     * Execute actual API request
     */
    async executeAPIRequest(apiName, endpoint, options) {
        const api = this.apis[apiName];
        const url = `${api.baseUrl}${endpoint}`;
        
        const headers = {
            'Content-Type': 'application/json',
            ...this.getAPIHeaders(apiName),
            ...options.headers
        };
        
        const response = await fetch(url, {
            method: options.method || 'GET',
            headers,
            body: options.body ? JSON.stringify(options.body) : undefined
        });
        
        if (!response.ok) {
            throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        return { success: true, data };
    }
    
    /**
     * Get API-specific headers
     */
    getAPIHeaders(apiName) {
        const api = this.apis[apiName];
        
        switch (apiName) {
            case 'googleMaps':
                return {}; // Key goes in URL params
            case 'openai':
                return { 'Authorization': `Bearer ${api.key}` };
            case 'claude':
                return { 
                    'x-api-key': api.key,
                    'anthropic-version': '2023-06-01'
                };
            case 'mapbox':
                return {}; // Key goes in URL params
            case 'openweather':
                return {}; // Key goes in URL params
            default:
                return {};
        }
    }
    
    /**
     * Get fallback response for failed API requests
     */
    getFallbackResponse(apiName, endpoint, options) {
        console.log(`Using fallback for ${apiName} ${endpoint}`);
        
        switch (apiName) {
            case 'googleMaps':
                return this.getGoogleMapsFallback(endpoint, options);
            case 'openai':
            case 'claude':
                return this.getAIFallback(endpoint, options);
            case 'mapbox':
                return this.getMapboxFallback(endpoint, options);
            case 'openweather':
                return this.getWeatherFallback(endpoint, options);
            default:
                return { success: false, fallback: true, data: null };
        }
    }
    
    /**
     * Google Maps fallback responses
     */
    getGoogleMapsFallback(endpoint, options) {
        if (endpoint.includes('/directions')) {
            return {
                success: true,
                fallback: true,
                data: {
                    routes: [{
                        summary: 'Fallback Route',
                        legs: [{
                            distance: { text: '5.2 miles', value: 8368 },
                            duration: { text: '15 mins', value: 900 },
                            steps: []
                        }],
                        warnings: ['Using fallback route data']
                    }]
                }
            };
        }
        
        if (endpoint.includes('/places')) {
            return {
                success: true,
                fallback: true,
                data: {
                    results: [{
                        name: 'Local Golf Cart Path',
                        geometry: { location: { lat: 0, lng: 0 } },
                        types: ['route']
                    }]
                }
            };
        }
        
        return { success: false, fallback: true, data: null };
    }
    
    /**
     * AI fallback for PDF analysis
     */
    getAIFallback(endpoint, options) {
        if (endpoint.includes('completions') || endpoint.includes('messages')) {
            const pdfText = options.body?.messages?.[0]?.content || options.body?.prompt || '';
            
            // Basic pattern matching for controller settings
            const settings = {};
            const matches = pdfText.matchAll(/F\.(\d+)\s*=\s*(\d+)/g);
            
            for (const match of matches) {
                settings[`F.${match[1]}`] = parseInt(match[2]);
            }
            
            return {
                success: true,
                fallback: true,
                data: {
                    choices: [{
                        message: {
                            content: JSON.stringify({
                                extracted_settings: settings,
                                confidence: 0.7,
                                method: 'pattern_matching'
                            })
                        }
                    }]
                }
            };
        }
        
        return { success: false, fallback: true, data: null };
    }
    
    /**
     * Mapbox fallback for elevation data
     */
    getMapboxFallback(endpoint, options) {
        if (endpoint.includes('tilequery')) {
            return {
                success: true,
                fallback: true,
                data: {
                    features: [{
                        properties: {
                            ele: Math.floor(Math.random() * 200 + 100) // Random elevation 100-300m
                        }
                    }]
                }
            };
        }
        
        return { success: false, fallback: true, data: null };
    }
    
    /**
     * Weather fallback data
     */
    getWeatherFallback(endpoint, options) {
        return {
            success: true,
            fallback: true,
            data: {
                main: {
                    temp: 72,
                    humidity: 50,
                    pressure: 1013
                },
                weather: [{
                    main: 'Clear',
                    description: 'clear sky'
                }],
                wind: {
                    speed: 5
                }
            }
        };
    }
    
    /**
     * Test Google Maps API
     */
    async testGoogleMapsAPI() {
        const testUrl = `${this.apis.googleMaps.baseUrl}/geocode/json?address=test&key=${this.apis.googleMaps.key}`;
        const response = await fetch(testUrl);
        const data = await response.json();
        return data.status !== 'REQUEST_DENIED';
    }
    
    /**
     * Test OpenAI API
     */
    async testOpenAIAPI() {
        const response = await fetch(`${this.apis.openai.baseUrl}/models`, {
            headers: { 'Authorization': `Bearer ${this.apis.openai.key}` }
        });
        return response.ok;
    }
    
    /**
     * Test Claude API
     */
    async testClaudeAPI() {
        // Claude doesn't have a simple test endpoint, so we'll check if key format is valid
        return this.apis.claude.key && this.apis.claude.key.startsWith('sk-ant-');
    }
    
    /**
     * Test Mapbox API
     */
    async testMapboxAPI() {
        const testUrl = `${this.apis.mapbox.baseUrl}/geocoding/v5/mapbox.places/test.json?access_token=${this.apis.mapbox.key}`;
        const response = await fetch(testUrl);
        return response.ok;
    }
    
    /**
     * Test OpenWeather API
     */
    async testOpenWeatherAPI() {
        const testUrl = `${this.apis.openweather.baseUrl}/weather?q=London&appid=${this.apis.openweather.key}`;
        const response = await fetch(testUrl);
        return response.ok;
    }
    
    /**
     * Cache management
     */
    getFromCache(key) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.data;
        }
        this.cache.delete(key);
        return null;
    }
    
    setCache(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
        
        // Limit cache size
        if (this.cache.size > 100) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
    }
    
    /**
     * Get API status summary
     */
    getAPIStatus() {
        return Object.entries(this.apis).map(([name, api]) => ({
            name,
            configured: api.isConfigured,
            fallbackAvailable: api.fallbackAvailable
        }));
    }
}

// Create global instance
window.apiManager = new APIManager();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = APIManager;
}
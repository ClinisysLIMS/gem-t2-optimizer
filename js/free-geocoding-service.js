/**
 * Free Geocoding Service
 * Uses OpenStreetMap Nominatim API (no API key required)
 */
class FreeGeocodingService {
    constructor() {
        this.baseUrl = 'https://nominatim.openstreetmap.org';
        this.cache = new Map();
        this.cacheTimeout = 24 * 60 * 60 * 1000; // 24 hours
        this.requestQueue = new Map();
        this.rateLimitDelay = 1000; // 1 second between requests (Nominatim requirement)
        this.lastRequestTime = 0;
        
        this.userAgent = 'GEM-T2-Optimizer/1.0 (https://github.com/gem-optimizer)';
        
        console.log('Free Geocoding Service initialized with Nominatim');
    }
    
    /**
     * Enforce rate limiting for Nominatim
     */
    async enforceRateLimit() {
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        
        if (timeSinceLastRequest < this.rateLimitDelay) {
            const delay = this.rateLimitDelay - timeSinceLastRequest;
            await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        this.lastRequestTime = Date.now();
    }
    
    /**
     * Make request to Nominatim with proper headers and rate limiting
     */
    async makeRequest(endpoint, params) {
        await this.enforceRateLimit();
        
        const url = new URL(endpoint, this.baseUrl);
        Object.entries(params).forEach(([key, value]) => {
            if (value !== null && value !== undefined) {
                url.searchParams.append(key, value);
            }
        });
        
        const response = await fetch(url.toString(), {
            headers: {
                'User-Agent': this.userAgent,
                'Accept': 'application/json',
                'Accept-Language': 'en-US,en;q=0.9'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Nominatim API error: ${response.status} ${response.statusText}`);
        }
        
        return await response.json();
    }
    
    /**
     * Forward geocoding: address to coordinates
     */
    async geocodeAddress(address, options = {}) {
        if (!address || address.trim().length < 2) {
            throw new Error('Address must be at least 2 characters long');
        }
        
        const cacheKey = `forward:${address}:${JSON.stringify(options)}`;
        
        // Check cache first
        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return { ...cached.data, cached: true };
        }
        
        // Check if request is in progress
        if (this.requestQueue.has(cacheKey)) {
            return await this.requestQueue.get(cacheKey);
        }
        
        // Create request promise
        const requestPromise = this.executeGeocode(address, options);
        this.requestQueue.set(cacheKey, requestPromise);
        
        try {
            const result = await requestPromise;
            
            // Cache successful results
            if (result.success) {
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
     * Execute the actual geocoding request
     */
    async executeGeocode(address, options) {
        try {
            const params = {
                q: address,
                format: 'json',
                addressdetails: 1,
                limit: options.limit || 5,
                ...options
            };
            
            const data = await this.makeRequest('/search', params);
            
            if (!data || data.length === 0) {
                return {
                    success: false,
                    error: 'No results found',
                    results: []
                };
            }
            
            const results = data.map(item => this.formatGeocodingResult(item));
            
            return {
                success: true,
                results: results,
                source: 'nominatim',
                cached: false
            };
            
        } catch (error) {
            console.error('Geocoding error:', error);
            return {
                success: false,
                error: error.message,
                results: []
            };
        }
    }
    
    /**
     * Reverse geocoding: coordinates to address
     */
    async reverseGeocode(lat, lng, options = {}) {
        if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
            throw new Error('Valid latitude and longitude are required');
        }
        
        if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            throw new Error('Invalid coordinates');
        }
        
        const cacheKey = `reverse:${lat},${lng}:${JSON.stringify(options)}`;
        
        // Check cache first
        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return { ...cached.data, cached: true };
        }
        
        // Check if request is in progress
        if (this.requestQueue.has(cacheKey)) {
            return await this.requestQueue.get(cacheKey);
        }
        
        // Create request promise
        const requestPromise = this.executeReverseGeocode(lat, lng, options);
        this.requestQueue.set(cacheKey, requestPromise);
        
        try {
            const result = await requestPromise;
            
            // Cache successful results
            if (result.success) {
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
     * Execute reverse geocoding request
     */
    async executeReverseGeocode(lat, lng, options) {
        try {
            const params = {
                lat: lat,
                lon: lng,
                format: 'json',
                addressdetails: 1,
                zoom: options.zoom || 18,
                ...options
            };
            
            const data = await this.makeRequest('/reverse', params);
            
            if (!data || data.error) {
                return {
                    success: false,
                    error: data?.error || 'No results found',
                    results: []
                };
            }
            
            const result = this.formatGeocodingResult(data);
            
            return {
                success: true,
                results: [result],
                source: 'nominatim',
                cached: false
            };
            
        } catch (error) {
            console.error('Reverse geocoding error:', error);
            return {
                success: false,
                error: error.message,
                results: []
            };
        }
    }
    
    /**
     * Format Nominatim result to standard format
     */
    formatGeocodingResult(item) {
        return {
            formattedAddress: item.display_name,
            location: {
                lat: parseFloat(item.lat),
                lng: parseFloat(item.lon)
            },
            placeId: item.place_id,
            types: [item.type, item.class].filter(Boolean),
            importance: item.importance,
            addressComponents: this.parseAddressComponents(item.address || {}),
            bounds: item.boundingbox ? {
                northeast: {
                    lat: parseFloat(item.boundingbox[1]),
                    lng: parseFloat(item.boundingbox[3])
                },
                southwest: {
                    lat: parseFloat(item.boundingbox[0]),
                    lng: parseFloat(item.boundingbox[2])
                }
            } : null,
            source: 'nominatim'
        };
    }
    
    /**
     * Parse address components from Nominatim format
     */
    parseAddressComponents(address) {
        const components = [];
        
        const mappings = {
            house_number: ['street_number'],
            road: ['route', 'street'],
            suburb: ['sublocality', 'neighborhood'],
            city: ['locality'],
            town: ['locality'],
            village: ['locality'],
            county: ['administrative_area_level_2'],
            state: ['administrative_area_level_1'],
            postcode: ['postal_code'],
            country: ['country'],
            country_code: ['country_code']
        };
        
        Object.entries(address).forEach(([key, value]) => {
            if (value && mappings[key]) {
                components.push({
                    longName: value,
                    shortName: key === 'country_code' ? value.toUpperCase() : value,
                    types: mappings[key]
                });
            }
        });
        
        return components;
    }
    
    /**
     * Batch geocoding with rate limiting
     */
    async batchGeocode(addresses, options = {}) {
        if (!Array.isArray(addresses) || addresses.length === 0) {
            throw new Error('Addresses must be a non-empty array');
        }
        
        if (addresses.length > 20) {
            throw new Error('Maximum 20 addresses allowed per batch (rate limiting)');
        }
        
        const results = [];
        
        for (let i = 0; i < addresses.length; i++) {
            try {
                console.log(`Geocoding ${i + 1}/${addresses.length}: ${addresses[i]}`);
                
                const result = await this.geocodeAddress(addresses[i], options);
                results.push({
                    input: addresses[i],
                    success: result.success,
                    data: result.success ? result.results[0] : null,
                    error: result.error || null
                });
                
                // Progress callback
                if (options.onProgress) {
                    options.onProgress(i + 1, addresses.length, results[results.length - 1]);
                }
                
            } catch (error) {
                results.push({
                    input: addresses[i],
                    success: false,
                    data: null,
                    error: error.message
                });
            }
        }
        
        return {
            success: true,
            results: results,
            processed: results.length,
            successful: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length
        };
    }
    
    /**
     * Search for places by category
     */
    async searchPlaces(query, options = {}) {
        const {
            lat = null,
            lng = null,
            radius = null,
            limit = 10,
            countryCode = null
        } = options;
        
        try {
            const params = {
                q: query,
                format: 'json',
                addressdetails: 1,
                limit: Math.min(limit, 50),
                extratags: 1,
                namedetails: 1
            };
            
            if (lat && lng) {
                params.lat = lat;
                params.lon = lng;
                if (radius) {
                    // Nominatim doesn't support radius, but we can sort by distance
                    params.bounded = 1;
                    const offset = radius / 111000; // Rough conversion to degrees
                    params.viewbox = `${lng - offset},${lat + offset},${lng + offset},${lat - offset}`;
                }
            }
            
            if (countryCode) {
                params.countrycodes = countryCode;
            }
            
            const data = await this.makeRequest('/search', params);
            
            if (!data || data.length === 0) {
                return {
                    success: true,
                    results: [],
                    source: 'nominatim'
                };
            }
            
            let results = data.map(item => ({
                ...this.formatGeocodingResult(item),
                category: item.type,
                amenity: item.extratags?.amenity || null,
                name: item.namedetails?.name || item.display_name.split(',')[0]
            }));
            
            // Sort by distance if center point provided
            if (lat && lng) {
                results = results.map(result => ({
                    ...result,
                    distance: this.calculateDistance(lat, lng, result.location.lat, result.location.lng)
                })).sort((a, b) => a.distance - b.distance);
            }
            
            return {
                success: true,
                results: results,
                source: 'nominatim'
            };
            
        } catch (error) {
            console.error('Places search error:', error);
            return {
                success: false,
                error: error.message,
                results: []
            };
        }
    }
    
    /**
     * Calculate distance between two points (Haversine formula)
     */
    calculateDistance(lat1, lng1, lat2, lng2) {
        const R = 6371; // Earth's radius in kilometers
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }
    
    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
        console.log('Geocoding cache cleared');
    }
    
    /**
     * Get cache statistics
     */
    getCacheStats() {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys()),
            totalMemory: JSON.stringify(Array.from(this.cache.values())).length
        };
    }
    
    /**
     * Check if service is available
     */
    async testConnection() {
        try {
            const result = await this.geocodeAddress('New York', { limit: 1 });
            return {
                available: result.success,
                latency: Date.now() - this.lastRequestTime,
                message: result.success ? 'Service operational' : result.error
            };
        } catch (error) {
            return {
                available: false,
                latency: null,
                message: error.message
            };
        }
    }
}

// Create global instance
window.freeGeocodingService = new FreeGeocodingService();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FreeGeocodingService;
}
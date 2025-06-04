/**
 * Free Elevation Service
 * Uses OpenTopoData and Open-Elevation APIs (completely free, no API key required)
 */
class FreeElevationService {
    constructor() {
        // Primary elevation APIs (no API key required)
        this.elevationSources = [
            {
                name: 'opentopo',
                baseUrl: 'https://api.opentopodata.org/v1',
                dataset: 'aster30m', // Global 30m resolution
                maxLocations: 100,
                available: true
            },
            {
                name: 'open-elevation',
                baseUrl: 'https://api.open-elevation.com/api/v1',
                dataset: 'srtm',
                maxLocations: 100,
                available: true
            }
        ];
        
        this.cache = new Map();
        this.cacheTimeout = 2 * 60 * 60 * 1000; // 2 hours for elevation data
        this.requestQueue = new Map();
        this.rateLimitDelay = 500; // 500ms between requests to be respectful
        this.lastRequestTime = 0;
        
        console.log('Free Elevation Service initialized with OpenTopoData and Open-Elevation');
    }
    
    /**
     * Enforce rate limiting
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
     * Get elevation for multiple locations
     */
    async getElevationForLocations(locations) {
        if (!Array.isArray(locations) || locations.length === 0) {
            throw new Error('Locations must be a non-empty array');
        }
        
        if (locations.length > 100) {
            throw new Error('Maximum 100 locations allowed per request');
        }
        
        const cacheKey = `locations:${JSON.stringify(locations)}`;
        
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
        const requestPromise = this.executeElevationRequest(locations);
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
     * Execute elevation request with fallback
     */
    async executeElevationRequest(locations) {
        const formattedLocations = this.formatLocations(locations);
        
        // Try each elevation source
        for (const source of this.elevationSources) {
            if (!source.available) continue;
            
            try {
                await this.enforceRateLimit();
                console.log(`Trying elevation source: ${source.name}`);
                
                const result = await this.requestElevationFromSource(source, formattedLocations);
                
                if (result.success) {
                    return {
                        ...result,
                        source: source.name,
                        dataset: source.dataset
                    };
                }
                
            } catch (error) {
                console.warn(`${source.name} elevation API failed:`, error.message);
                source.available = false; // Temporarily disable this source
                continue;
            }
        }
        
        // If all APIs fail, use estimation
        console.warn('All elevation APIs failed, using estimation');
        return this.estimateElevations(formattedLocations);
    }
    
    /**
     * Request elevation from specific source
     */
    async requestElevationFromSource(source, locations) {
        if (source.name === 'opentopo') {
            return await this.requestOpenTopoData(source, locations);
        } else if (source.name === 'open-elevation') {
            return await this.requestOpenElevation(source, locations);
        }
        
        throw new Error(`Unknown elevation source: ${source.name}`);
    }
    
    /**
     * Request from OpenTopoData API
     */
    async requestOpenTopoData(source, locations) {
        const locationString = locations.map(loc => `${loc.lat},${loc.lng}`).join('|');
        const url = `${source.baseUrl}/${source.dataset}?locations=${locationString}`;
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'User-Agent': 'GEM-T2-Optimizer/1.0'
            }
        });
        
        if (!response.ok) {
            throw new Error(`OpenTopoData API error: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.status !== 'OK') {
            throw new Error(`OpenTopoData error: ${data.error || data.status}`);
        }
        
        return {
            success: true,
            results: data.results.map((result, index) => ({
                elevation: Math.round(result.elevation * 3.28084), // Convert to feet
                elevationMeters: result.elevation,
                location: {
                    lat: locations[index].lat,
                    lng: locations[index].lng
                },
                dataset: result.dataset,
                resolution: null // OpenTopoData doesn't provide resolution info
            })),
            source: 'opentopo'
        };
    }
    
    /**
     * Request from Open-Elevation API
     */
    async requestOpenElevation(source, locations) {
        const requestBody = {
            locations: locations.map(loc => ({
                latitude: loc.lat,
                longitude: loc.lng
            }))
        };
        
        const response = await fetch(`${source.baseUrl}/lookup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'GEM-T2-Optimizer/1.0'
            },
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            throw new Error(`Open-Elevation API error: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.results) {
            throw new Error('No elevation results received');
        }
        
        return {
            success: true,
            results: data.results.map(result => ({
                elevation: Math.round(result.elevation * 3.28084), // Convert to feet
                elevationMeters: result.elevation,
                location: {
                    lat: result.latitude,
                    lng: result.longitude
                },
                dataset: 'srtm',
                resolution: null
            })),
            source: 'open-elevation'
        };
    }
    
    /**
     * Get elevation profile along a path
     */
    async getElevationProfile(path, samples = 100) {
        if (!Array.isArray(path) || path.length < 2) {
            throw new Error('Path must contain at least 2 points');
        }
        
        const cacheKey = `profile:${JSON.stringify(path)}:${samples}`;
        
        // Check cache first
        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return { ...cached.data, cached: true };
        }
        
        try {
            // Sample points along the path
            const sampledPath = this.samplePath(path, Math.min(samples, 100));
            
            // Get elevation for sampled points
            const elevationResult = await this.getElevationForLocations(sampledPath);
            
            if (!elevationResult.success) {
                throw new Error(elevationResult.error);
            }
            
            // Calculate grades and statistics
            const results = this.calculatePathGrades(elevationResult.results);
            const summary = this.calculateElevationSummary(results);
            
            const profileData = {
                success: true,
                results: results,
                summary: summary,
                source: elevationResult.source,
                cached: false
            };
            
            // Cache the result
            this.cache.set(cacheKey, {
                data: profileData,
                timestamp: Date.now()
            });
            
            return profileData;
            
        } catch (error) {
            console.error('Elevation profile error:', error);
            
            // Fallback to estimated profile
            return this.estimateElevationProfile(path, samples);
        }
    }
    
    /**
     * Calculate grades between elevation points
     */
    calculatePathGrades(elevationResults) {
        return elevationResults.map((result, index) => {
            let grade = 0;
            let distance = 0;
            
            if (index > 0) {
                const prev = elevationResults[index - 1];
                const elevationDiff = result.elevationMeters - prev.elevationMeters;
                distance = this.calculateDistance(
                    prev.location.lat, prev.location.lng,
                    result.location.lat, result.location.lng
                );
                
                if (distance > 0) {
                    grade = (elevationDiff / distance) * 100; // Grade as percentage
                }
            }
            
            return {
                ...result,
                grade: Math.round(grade * 100) / 100, // Round to 2 decimal places
                distanceFromStart: distance,
                segmentDistance: distance
            };
        });
    }
    
    /**
     * Calculate elevation summary statistics
     */
    calculateElevationSummary(results) {
        const elevations = results.map(r => r.elevation);
        const grades = results.map(r => Math.abs(r.grade)).filter(g => g > 0);
        
        let totalElevationGain = 0;
        let totalElevationLoss = 0;
        
        for (let i = 1; i < results.length; i++) {
            const diff = results[i].elevation - results[i-1].elevation;
            if (diff > 0) {
                totalElevationGain += diff;
            } else {
                totalElevationLoss += Math.abs(diff);
            }
        }
        
        return {
            minElevation: Math.min(...elevations),
            maxElevation: Math.max(...elevations),
            totalElevationGain: Math.round(totalElevationGain),
            totalElevationLoss: Math.round(totalElevationLoss),
            maxGrade: grades.length > 0 ? Math.max(...grades) : 0,
            avgGrade: grades.length > 0 ? grades.reduce((a, b) => a + b, 0) / grades.length : 0,
            totalDistance: results.reduce((sum, result) => sum + (result.segmentDistance || 0), 0)
        };
    }
    
    /**
     * Sample points along a path
     */
    samplePath(path, samples) {
        const formattedPath = this.formatLocations(path);
        
        if (formattedPath.length <= samples) {
            return formattedPath;
        }
        
        const sampledPoints = [];
        const step = (formattedPath.length - 1) / (samples - 1);
        
        for (let i = 0; i < samples; i++) {
            const index = Math.round(i * step);
            sampledPoints.push(formattedPath[index]);
        }
        
        return sampledPoints;
    }
    
    /**
     * Format locations to consistent format
     */
    formatLocations(locations) {
        return locations.map(location => {
            if (typeof location === 'string') {
                const [lat, lng] = location.split(',').map(coord => parseFloat(coord.trim()));
                if (isNaN(lat) || isNaN(lng)) {
                    throw new Error(`Invalid location format: ${location}`);
                }
                return { lat, lng };
            } else if (typeof location === 'object') {
                const lat = location.lat || location.latitude;
                const lng = location.lng || location.longitude;
                if (isNaN(lat) || isNaN(lng)) {
                    throw new Error(`Invalid location object: ${JSON.stringify(location)}`);
                }
                return { lat: parseFloat(lat), lng: parseFloat(lng) };
            } else {
                throw new Error(`Invalid location type: ${typeof location}`);
            }
        });
    }
    
    /**
     * Calculate distance between two points (Haversine formula)
     */
    calculateDistance(lat1, lng1, lat2, lng2) {
        const R = 6371000; // Earth's radius in meters
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }
    
    /**
     * Estimate elevations when APIs fail
     */
    estimateElevations(locations) {
        console.log('Using elevation estimation for', locations.length, 'locations');
        
        const results = locations.map((location, index) => {
            // Simple elevation estimation based on latitude (very rough)
            // This is just a fallback - real elevation varies tremendously
            let estimatedElevation = 1000; // Base elevation in feet
            
            // Rough adjustments based on latitude
            const lat = Math.abs(location.lat);
            if (lat > 60) estimatedElevation += 500; // Higher latitudes tend to be higher
            if (lat < 30) estimatedElevation -= 300; // Lower latitudes tend to be lower
            
            // Add some variation
            const variation = Math.sin(location.lng * Math.PI / 180) * 200;
            estimatedElevation += variation;
            
            return {
                elevation: Math.round(estimatedElevation),
                elevationMeters: Math.round(estimatedElevation / 3.28084),
                location: location,
                dataset: 'estimated',
                resolution: null,
                estimated: true
            };
        });
        
        return {
            success: true,
            results: results,
            source: 'estimation',
            warning: 'Using estimated elevation data - external services unavailable'
        };
    }
    
    /**
     * Estimate elevation profile when APIs fail
     */
    estimateElevationProfile(path, samples) {
        const sampledPath = this.samplePath(path, samples);
        const elevationResult = this.estimateElevations(sampledPath);
        
        const results = this.calculatePathGrades(elevationResult.results);
        const summary = this.calculateElevationSummary(results);
        
        return {
            success: true,
            results: results,
            summary: summary,
            source: 'estimation',
            warning: 'Using estimated elevation profile - external services unavailable',
            cached: false
        };
    }
    
    /**
     * Get single point elevation
     */
    async getElevation(lat, lng) {
        const result = await this.getElevationForLocations([{ lat, lng }]);
        
        if (result.success && result.results.length > 0) {
            return {
                success: true,
                elevation: result.results[0].elevation,
                elevationMeters: result.results[0].elevationMeters,
                source: result.source,
                cached: result.cached
            };
        }
        
        return {
            success: false,
            error: result.error || 'No elevation data available'
        };
    }
    
    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
        console.log('Elevation cache cleared');
    }
    
    /**
     * Get cache statistics
     */
    getCacheStats() {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys()),
            memoryUsage: JSON.stringify(Array.from(this.cache.values())).length
        };
    }
    
    /**
     * Test service availability
     */
    async testConnection() {
        try {
            const startTime = Date.now();
            const result = await this.getElevation(40.7128, -74.0060); // New York
            const latency = Date.now() - startTime;
            
            return {
                available: result.success,
                latency: latency,
                source: result.source,
                message: result.success ? 'Service operational' : result.error
            };
        } catch (error) {
            return {
                available: false,
                latency: null,
                source: null,
                message: error.message
            };
        }
    }
    
    /**
     * Reset source availability (in case of temporary failures)
     */
    resetSourceAvailability() {
        this.elevationSources.forEach(source => {
            source.available = true;
        });
        console.log('Elevation source availability reset');
    }
}

// Create global instance
window.freeElevationService = new FreeElevationService();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FreeElevationService;
}
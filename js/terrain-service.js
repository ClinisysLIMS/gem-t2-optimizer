/**
 * Terrain Service - Elevation Analysis and Route Grading
 * Provides terrain analysis using OpenElevation API (free) and Mapbox Elevation API
 */
class TerrainService {
    constructor() {
        // Initialize secure storage
        this.secureStorage = window.secureStorage || (window.secureStorage = new SecureStorage());
        
        this.mapboxApiKey = this.getStoredMapboxApiKey() || '';
        this.cache = new Map();
        this.cacheTimeout = 30 * 60 * 1000; // 30 minutes
        
        // API endpoints
        this.openElevationUrl = 'https://api.open-elevation.com/api/v1';
        this.mapboxGeocodeUrl = 'https://api.mapbox.com/geocoding/v5/mapbox.places';
        this.mapboxElevationUrl = 'https://api.mapbox.com/v4/mapbox.mapbox-terrain-v2/tilequery';
        
        // Rate limiting
        this.requestQueue = [];
        this.isProcessingQueue = false;
        this.lastRequestTime = 0;
        this.minRequestInterval = 100; // 100ms between requests for free APIs
    }
    
    /**
     * Set Mapbox API key and store it securely
     * @param {string} apiKey - Mapbox API key
     */
    setMapboxApiKey(apiKey) {
        this.mapboxApiKey = apiKey;
        try {
            if (apiKey && apiKey.trim()) {
                this.secureStorage.setItem('api_mapbox', apiKey.trim());
            } else {
                this.secureStorage.removeItem('api_mapbox');
            }
        } catch (error) {
            console.warn('Could not store Mapbox API key:', error);
        }
    }
    
    /**
     * Get stored Mapbox API key from secure storage
     * @returns {string|null} Stored API key
     */
    getStoredMapboxApiKey() {
        try {
            // First try secure storage
            const secureKey = this.secureStorage.getItem('api_mapbox');
            if (secureKey) return secureKey;
            
            // Fallback to old storage and migrate
            const oldKey = localStorage.getItem('mapbox-api-key');
            if (oldKey) {
                this.setMapboxApiKey(oldKey); // This will store it securely
                localStorage.removeItem('mapbox-api-key'); // Remove old key
                return oldKey;
            }
            
            return null;
        } catch (error) {
            console.warn('Could not retrieve Mapbox API key:', error);
            return null;
        }
    }
    
    /**
     * Check if Mapbox API key is configured
     * @returns {boolean} True if API key is set
     */
    isMapboxConfigured() {
        return !!this.mapboxApiKey && this.mapboxApiKey.length > 0;
    }
    
    /**
     * Geocode locations to get coordinates
     * @param {string} startLocation - Starting location name
     * @param {string} endLocation - Destination location name
     * @returns {Promise<Object>} Start and end coordinates
     */
    async geocodeRoute(startLocation, endLocation) {
        const cacheKey = `geocode:${startLocation}|${endLocation}`;
        const cached = this.getFromCache(cacheKey);
        if (cached) {
            return cached;
        }
        
        try {
            let startCoords, endCoords;
            
            if (this.isMapboxConfigured()) {
                // Use Mapbox geocoding for better accuracy
                startCoords = await this.geocodeWithMapbox(startLocation);
                endCoords = await this.geocodeWithMapbox(endLocation);
            } else {
                // Use free geocoding service (Nominatim)
                startCoords = await this.geocodeWithNominatim(startLocation);
                endCoords = await this.geocodeWithNominatim(endLocation);
            }
            
            const result = {
                start: startCoords,
                end: endCoords
            };
            
            this.setCache(cacheKey, result);
            return result;
            
        } catch (error) {
            console.error('Geocoding error:', error);
            throw error;
        }
    }
    
    /**
     * Geocode using Mapbox API
     * @param {string} location - Location name
     * @returns {Promise<Object>} Coordinates
     */
    async geocodeWithMapbox(location) {
        const url = `${this.mapboxGeocodeUrl}/${encodeURIComponent(location)}.json?access_token=${this.mapboxApiKey}&limit=1`;
        
        try {
            const response = await this.makeRequest(url);
            
            if (!response.ok) {
                throw new Error(`Mapbox geocoding failed: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.features.length === 0) {
                throw new Error(`Location not found: ${location}`);
            }
            
            const coords = data.features[0].center;
            return {
                lat: coords[1],
                lon: coords[0],
                name: data.features[0].place_name
            };
            
        } catch (error) {
            console.error('Mapbox geocoding error:', error);
            throw error;
        }
    }
    
    /**
     * Geocode using free Nominatim API
     * @param {string} location - Location name
     * @returns {Promise<Object>} Coordinates
     */
    async geocodeWithNominatim(location) {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}&limit=1`;
        
        try {
            const response = await this.makeRequest(url);
            
            if (!response.ok) {
                throw new Error(`Nominatim geocoding failed: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.length === 0) {
                throw new Error(`Location not found: ${location}`);
            }
            
            return {
                lat: parseFloat(data[0].lat),
                lon: parseFloat(data[0].lon),
                name: data[0].display_name
            };
            
        } catch (error) {
            console.error('Nominatim geocoding error:', error);
            throw error;
        }
    }
    
    /**
     * Analyze terrain for a route between two locations
     * @param {string} startLocation - Starting location
     * @param {string} endLocation - Destination location
     * @param {number} samples - Number of elevation samples (default: 50)
     * @returns {Promise<Object>} Comprehensive terrain analysis
     */
    async analyzeRoute(startLocation, endLocation, samples = 50) {
        try {
            // Get route coordinates
            const routeCoords = await this.geocodeRoute(startLocation, endLocation);
            
            // Generate route points
            const routePoints = this.generateRoutePoints(
                routeCoords.start,
                routeCoords.end,
                samples
            );
            
            // Get elevation data
            const elevationData = await this.getElevationProfile(routePoints);
            
            // Calculate terrain metrics
            const analysis = this.calculateTerrainMetrics(elevationData, routeCoords);
            
            return {
                ...analysis,
                route: {
                    start: routeCoords.start,
                    end: routeCoords.end,
                    samples: samples
                },
                elevationProfile: elevationData,
                source: this.isMapboxConfigured() ? 'mapbox' : 'open-elevation'
            };
            
        } catch (error) {
            console.error('Route analysis error:', error);
            // Return fallback data
            return this.getFallbackTerrainData(startLocation, endLocation);
        }
    }
    
    /**
     * Generate route points between start and end coordinates
     * @param {Object} start - Start coordinates {lat, lon}
     * @param {Object} end - End coordinates {lat, lon}
     * @param {number} samples - Number of points to generate
     * @returns {Array} Array of coordinate points
     */
    generateRoutePoints(start, end, samples) {
        const points = [];
        
        for (let i = 0; i < samples; i++) {
            const ratio = i / (samples - 1);
            const lat = start.lat + (end.lat - start.lat) * ratio;
            const lon = start.lon + (end.lon - start.lon) * ratio;
            
            points.push({ lat, lon });
        }
        
        return points;
    }
    
    /**
     * Get elevation profile for route points
     * @param {Array} points - Array of coordinate points
     * @returns {Promise<Array>} Elevation data for each point
     */
    async getElevationProfile(points) {
        const cacheKey = `elevation:${JSON.stringify(points)}`;
        const cached = this.getFromCache(cacheKey);
        if (cached) {
            return cached;
        }
        
        try {
            let elevationData;
            
            if (this.isMapboxConfigured()) {
                elevationData = await this.getMapboxElevations(points);
            } else {
                elevationData = await this.getOpenElevations(points);
            }
            
            this.setCache(cacheKey, elevationData);
            return elevationData;
            
        } catch (error) {
            console.error('Elevation profile error:', error);
            throw error;
        }
    }
    
    /**
     * Get elevations using Mapbox Tilequery API
     * @param {Array} points - Coordinate points
     * @returns {Promise<Array>} Elevation data
     */
    async getMapboxElevations(points) {
        const elevations = [];
        
        // Process points in batches to avoid rate limits
        const batchSize = 10;
        for (let i = 0; i < points.length; i += batchSize) {
            const batch = points.slice(i, i + batchSize);
            const batchElevations = await Promise.all(
                batch.map(point => this.getMapboxElevationForPoint(point))
            );
            elevations.push(...batchElevations);
            
            // Add delay between batches
            if (i + batchSize < points.length) {
                await new Promise(resolve => setTimeout(resolve, 200));
            }
        }
        
        return elevations;
    }
    
    /**
     * Get elevation for a single point using Mapbox
     * @param {Object} point - Coordinate point {lat, lon}
     * @returns {Promise<Object>} Elevation data
     */
    async getMapboxElevationForPoint(point) {
        const url = `${this.mapboxElevationUrl}/${point.lon},${point.lat}.json?layers=contour&limit=1&access_token=${this.mapboxApiKey}`;
        
        try {
            const response = await this.makeRequest(url);
            
            if (!response.ok) {
                throw new Error(`Mapbox elevation failed: ${response.status}`);
            }
            
            const data = await response.json();
            
            const elevation = data.features.length > 0 
                ? data.features[0].properties.ele || 0
                : 0;
            
            return {
                lat: point.lat,
                lon: point.lon,
                elevation: Math.round(elevation * 3.28084) // Convert meters to feet
            };
            
        } catch (error) {
            console.warn(`Mapbox elevation error for point ${point.lat},${point.lon}:`, error);
            return {
                lat: point.lat,
                lon: point.lon,
                elevation: 0
            };
        }
    }
    
    /**
     * Get elevations using OpenElevation API
     * @param {Array} points - Coordinate points
     * @returns {Promise<Array>} Elevation data
     */
    async getOpenElevations(points) {
        // OpenElevation supports batch requests
        const locations = points.map(p => ({ latitude: p.lat, longitude: p.lon }));
        
        const url = `${this.openElevationUrl}/lookup`;
        
        try {
            const response = await this.makeRequest(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ locations })
            });
            
            if (!response.ok) {
                throw new Error(`OpenElevation failed: ${response.status}`);
            }
            
            const data = await response.json();
            
            return data.results.map(result => ({
                lat: result.latitude,
                lon: result.longitude,
                elevation: Math.round(result.elevation * 3.28084) // Convert meters to feet
            }));
            
        } catch (error) {
            console.error('OpenElevation error:', error);
            throw error;
        }
    }
    
    /**
     * Calculate comprehensive terrain metrics
     * @param {Array} elevationData - Elevation profile data
     * @param {Object} routeCoords - Route coordinates
     * @returns {Object} Terrain analysis metrics
     */
    calculateTerrainMetrics(elevationData, routeCoords) {
        if (elevationData.length < 2) {
            throw new Error('Insufficient elevation data for analysis');
        }
        
        // Calculate distances and gradients
        const segments = [];
        let totalDistance = 0;
        let totalElevationGain = 0;
        let totalElevationLoss = 0;
        let maxGrade = 0;
        let steepestClimb = 0;
        let steepestDescent = 0;
        
        for (let i = 1; i < elevationData.length; i++) {
            const prev = elevationData[i - 1];
            const curr = elevationData[i];
            
            // Calculate distance using Haversine formula
            const distance = this.calculateDistance(prev.lat, prev.lon, curr.lat, curr.lon);
            const elevationChange = curr.elevation - prev.elevation;
            const grade = distance > 0 ? (elevationChange / (distance * 5280)) * 100 : 0; // Convert to percentage
            
            segments.push({
                distance,
                elevationChange,
                grade: Math.round(grade * 10) / 10
            });
            
            totalDistance += distance;
            
            if (elevationChange > 0) {
                totalElevationGain += elevationChange;
            } else {
                totalElevationLoss += Math.abs(elevationChange);
            }
            
            maxGrade = Math.max(maxGrade, Math.abs(grade));
            if (grade > 0) {
                steepestClimb = Math.max(steepestClimb, grade);
            } else {
                steepestDescent = Math.max(steepestDescent, Math.abs(grade));
            }
        }
        
        // Calculate terrain difficulty score
        const difficultyScore = this.calculateDifficultyScore({
            totalDistance,
            totalElevationGain,
            maxGrade,
            steepestClimb
        });
        
        // Classify terrain type
        const terrainType = this.classifyTerrain(maxGrade, totalElevationGain, totalDistance);
        
        // Calculate elevation statistics
        const elevations = elevationData.map(p => p.elevation);
        const minElevation = Math.min(...elevations);
        const maxElevation = Math.max(...elevations);
        const avgElevation = Math.round(elevations.reduce((a, b) => a + b, 0) / elevations.length);
        
        return {
            distance: Math.round(totalDistance * 10) / 10,
            elevationGain: Math.round(totalElevationGain),
            elevationLoss: Math.round(totalElevationLoss),
            netElevationChange: Math.round(totalElevationGain - totalElevationLoss),
            maxGrade: Math.round(maxGrade * 10) / 10,
            steepestClimb: Math.round(steepestClimb * 10) / 10,
            steepestDescent: Math.round(steepestDescent * 10) / 10,
            avgGrade: Math.round((totalElevationGain + totalElevationLoss) / (totalDistance * 5280) * 100 * 10) / 10,
            minElevation,
            maxElevation,
            avgElevation,
            elevationRange: maxElevation - minElevation,
            difficultyScore,
            terrainType,
            classification: this.getTerrainClassification(difficultyScore),
            segments,
            recommendations: this.generateTerrainRecommendations(difficultyScore, maxGrade, totalElevationGain)
        };
    }
    
    /**
     * Calculate distance between two coordinates using Haversine formula
     * @param {number} lat1 - Latitude 1
     * @param {number} lon1 - Longitude 1
     * @param {number} lat2 - Latitude 2
     * @param {number} lon2 - Longitude 2
     * @returns {number} Distance in miles
     */
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 3959; // Earth's radius in miles
        const dLat = this.toRadians(lat2 - lat1);
        const dLon = this.toRadians(lon2 - lon1);
        
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);
        
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
    
    /**
     * Convert degrees to radians
     * @param {number} degrees - Degrees
     * @returns {number} Radians
     */
    toRadians(degrees) {
        return degrees * (Math.PI / 180);
    }
    
    /**
     * Calculate terrain difficulty score (0-100)
     * @param {Object} metrics - Terrain metrics
     * @returns {number} Difficulty score
     */
    calculateDifficultyScore(metrics) {
        const { totalDistance, totalElevationGain, maxGrade, steepestClimb } = metrics;
        
        // Weighted scoring factors
        const distanceScore = Math.min(totalDistance / 50 * 20, 20); // Max 20 points for 50+ miles
        const elevationScore = Math.min(totalElevationGain / 2000 * 30, 30); // Max 30 points for 2000+ ft gain
        const gradeScore = Math.min(maxGrade / 20 * 25, 25); // Max 25 points for 20%+ grade
        const climbScore = Math.min(steepestClimb / 15 * 25, 25); // Max 25 points for 15%+ climb
        
        return Math.round(distanceScore + elevationScore + gradeScore + climbScore);
    }
    
    /**
     * Classify terrain type based on characteristics
     * @param {number} maxGrade - Maximum grade percentage
     * @param {number} elevationGain - Total elevation gain
     * @param {number} distance - Total distance
     * @returns {string} Terrain type
     */
    classifyTerrain(maxGrade, elevationGain, distance) {
        if (maxGrade < 3 && elevationGain < 200) {
            return 'flat';
        } else if (maxGrade < 8 && elevationGain < 800) {
            return 'rolling';
        } else if (maxGrade < 15 && elevationGain < 1500) {
            return 'hilly';
        } else if (maxGrade < 20 && elevationGain < 3000) {
            return 'mountainous';
        } else {
            return 'extreme';
        }
    }
    
    /**
     * Get terrain classification description
     * @param {number} difficultyScore - Difficulty score
     * @returns {Object} Classification info
     */
    getTerrainClassification(difficultyScore) {
        if (difficultyScore < 20) {
            return {
                level: 'Easy',
                description: 'Gentle terrain suitable for all skill levels',
                color: '#22c55e'
            };
        } else if (difficultyScore < 40) {
            return {
                level: 'Moderate',
                description: 'Some hills and elevation changes',
                color: '#eab308'
            };
        } else if (difficultyScore < 60) {
            return {
                level: 'Challenging',
                description: 'Significant hills and steep sections',
                color: '#f97316'
            };
        } else if (difficultyScore < 80) {
            return {
                level: 'Difficult',
                description: 'Steep terrain requiring careful planning',
                color: '#dc2626'
            };
        } else {
            return {
                level: 'Extreme',
                description: 'Very challenging mountain terrain',
                color: '#7c2d12'
            };
        }
    }
    
    /**
     * Generate terrain-specific recommendations
     * @param {number} difficultyScore - Difficulty score
     * @param {number} maxGrade - Maximum grade
     * @param {number} elevationGain - Total elevation gain
     * @returns {Array} Recommendations
     */
    generateTerrainRecommendations(difficultyScore, maxGrade, elevationGain) {
        const recommendations = [];
        
        if (maxGrade > 15) {
            recommendations.push('Steep grades detected - ensure battery is fully charged');
            recommendations.push('Consider low gear operation on steepest sections');
            recommendations.push('Monitor motor temperature during climbs');
        }
        
        if (elevationGain > 1000) {
            recommendations.push('Significant elevation gain - plan for reduced range');
            recommendations.push('Take advantage of regenerative braking on descents');
        }
        
        if (difficultyScore > 60) {
            recommendations.push('Challenging terrain - drive conservatively');
            recommendations.push('Allow extra time for the journey');
            recommendations.push('Consider emergency backup plan');
        }
        
        if (maxGrade > 20) {
            recommendations.push('Extreme grades - verify GEM capabilities before attempting');
            recommendations.push('Consider alternative route if possible');
        }
        
        // General recommendations
        recommendations.push('Check tire pressure before departure');
        recommendations.push('Ensure adequate cooling system maintenance');
        
        return recommendations;
    }
    
    /**
     * Get fallback terrain data when API fails
     * @param {string} startLocation - Start location
     * @param {string} endLocation - End location
     * @returns {Object} Fallback terrain data
     */
    getFallbackTerrainData(startLocation, endLocation) {
        // Estimate based on location names
        const end = endLocation.toLowerCase();
        let estimatedData = {
            distance: 25,
            elevationGain: 500,
            elevationLoss: 500,
            maxGrade: 8,
            difficultyScore: 30,
            terrainType: 'rolling'
        };
        
        if (end.includes('mountain') || end.includes('hill') || end.includes('peak')) {
            estimatedData = {
                distance: 30,
                elevationGain: 1500,
                elevationLoss: 1500,
                maxGrade: 18,
                difficultyScore: 70,
                terrainType: 'mountainous'
            };
        } else if (end.includes('valley') || end.includes('flat') || end.includes('desert')) {
            estimatedData = {
                distance: 20,
                elevationGain: 100,
                elevationLoss: 100,
                maxGrade: 3,
                difficultyScore: 15,
                terrainType: 'flat'
            };
        }
        
        return {
            ...estimatedData,
            netElevationChange: 0,
            steepestClimb: estimatedData.maxGrade,
            steepestDescent: estimatedData.maxGrade,
            avgGrade: Math.round(estimatedData.elevationGain / (estimatedData.distance * 528) * 100 * 10) / 10,
            classification: this.getTerrainClassification(estimatedData.difficultyScore),
            source: 'estimated',
            error: 'Terrain API unavailable - using estimates',
            recommendations: this.generateTerrainRecommendations(
                estimatedData.difficultyScore,
                estimatedData.maxGrade,
                estimatedData.elevationGain
            )
        };
    }
    
    /**
     * Make rate-limited API request
     * @param {string} url - API endpoint URL
     * @param {Object} options - Fetch options
     * @returns {Promise<Response>} Fetch response
     */
    async makeRequest(url, options = {}) {
        return new Promise((resolve, reject) => {
            this.requestQueue.push({ url, options, resolve, reject });
            this.processQueue();
        });
    }
    
    /**
     * Process request queue with rate limiting
     */
    async processQueue() {
        if (this.isProcessingQueue || this.requestQueue.length === 0) {
            return;
        }
        
        this.isProcessingQueue = true;
        
        while (this.requestQueue.length > 0) {
            const now = Date.now();
            const timeSinceLastRequest = now - this.lastRequestTime;
            
            if (timeSinceLastRequest < this.minRequestInterval) {
                await new Promise(resolve => 
                    setTimeout(resolve, this.minRequestInterval - timeSinceLastRequest)
                );
            }
            
            const request = this.requestQueue.shift();
            this.lastRequestTime = Date.now();
            
            try {
                const response = await fetch(request.url, request.options);
                request.resolve(response);
            } catch (error) {
                request.reject(error);
            }
        }
        
        this.isProcessingQueue = false;
    }
    
    /**
     * Get data from cache
     * @param {string} key - Cache key
     * @returns {*} Cached data or null
     */
    getFromCache(key) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < cached.timeout) {
            return cached.data;
        }
        
        this.cache.delete(key);
        return null;
    }
    
    /**
     * Set data in cache
     * @param {string} key - Cache key
     * @param {*} data - Data to cache
     * @param {number} timeout - Cache timeout in milliseconds
     */
    setCache(key, data, timeout = this.cacheTimeout) {
        this.cache.set(key, {
            data: data,
            timestamp: Date.now(),
            timeout: timeout
        });
        
        // Clean up old cache entries
        if (this.cache.size > 50) {
            const oldestKey = this.cache.keys().next().value;
            this.cache.delete(oldestKey);
        }
    }
    
    /**
     * Clear all cached data
     */
    clearCache() {
        this.cache.clear();
    }
    
    /**
     * Get service usage statistics
     * @returns {Object} Usage statistics
     */
    getUsageStats() {
        return {
            cacheSize: this.cache.size,
            isMapboxConfigured: this.isMapboxConfigured(),
            queueLength: this.requestQueue.length,
            primaryService: this.isMapboxConfigured() ? 'Mapbox' : 'OpenElevation'
        };
    }
}

// Create global instance
window.terrainService = new TerrainService();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TerrainService;
}
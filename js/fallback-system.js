/**
 * Comprehensive Fallback System
 * Ensures all features work even when APIs are unavailable
 */
class FallbackSystem {
    constructor() {
        this.fallbackProviders = {
            maps: {
                primary: 'googleMaps',
                secondary: 'mapbox',
                fallback: 'osm'
            },
            elevation: {
                primary: 'googleElevation',
                secondary: 'mapbox',
                fallback: 'openElevation'
            },
            weather: {
                primary: 'openweather',
                secondary: 'weatherapi',
                fallback: 'historical'
            },
            pdf: {
                primary: 'claude',
                secondary: 'openai',
                fallback: 'patternMatching'
            },
            traffic: {
                primary: 'googleTraffic',
                secondary: 'mapbox',
                fallback: 'timeBasedPatterns'
            }
        };
        
        this.fallbackData = new Map();
        this.initialize();
    }
    
    /**
     * Initialize fallback system
     */
    initialize() {
        this.loadFallbackData();
        this.setupAPIMonitoring();
        console.log('Fallback System initialized');
    }
    
    /**
     * Load pre-defined fallback data
     */
    loadFallbackData() {
        // Weather fallback data by season
        this.fallbackData.set('weather', {
            winter: { temp: 45, humidity: 60, wind: 10, conditions: 'Clear' },
            spring: { temp: 65, humidity: 55, wind: 8, conditions: 'Partly Cloudy' },
            summer: { temp: 85, humidity: 65, wind: 5, conditions: 'Sunny' },
            fall: { temp: 60, humidity: 50, wind: 12, conditions: 'Clear' }
        });
        
        // Elevation profiles for common terrain types
        this.fallbackData.set('elevation', {
            flat: { min: 0, max: 100, avg: 50, grade: 2 },
            rolling: { min: 0, max: 300, avg: 150, grade: 5 },
            hilly: { min: 0, max: 800, avg: 400, grade: 10 },
            mountainous: { min: 0, max: 2000, avg: 1000, grade: 15 }
        });
        
        // Traffic patterns by time of day
        this.fallbackData.set('traffic', {
            rush_morning: { congestion: 'heavy', speed_reduction: 40 },
            midday: { congestion: 'light', speed_reduction: 10 },
            rush_evening: { congestion: 'heavy', speed_reduction: 45 },
            night: { congestion: 'none', speed_reduction: 0 },
            weekend: { congestion: 'moderate', speed_reduction: 20 }
        });
        
        // Controller settings patterns
        this.fallbackData.set('controller', {
            patterns: [
                /F\.?(\d+)\s*[=:]\s*(\d+)/gi,
                /Function\s+(\d+)\s*[=:]\s*(\d+)/gi,
                /Parameter\s+(\d+)\s*[=:]\s*(\d+)/gi
            ]
        });
    }
    
    /**
     * Setup API monitoring
     */
    setupAPIMonitoring() {
        // Monitor API failures and switch to fallbacks
        window.addEventListener('apiFailed', (event) => {
            const { service, error } = event.detail;
            console.warn(`API failed for ${service}, switching to fallback:`, error);
            this.activateFallback(service);
        });
    }
    
    /**
     * Get weather fallback
     */
    getWeatherFallback(location, date = new Date()) {
        const season = this.getSeason(date);
        const baseWeather = this.fallbackData.get('weather')[season];
        
        // Add some randomness for realism
        const variation = {
            temp: Math.round(baseWeather.temp + (Math.random() - 0.5) * 10),
            humidity: Math.round(baseWeather.humidity + (Math.random() - 0.5) * 20),
            wind: Math.round(baseWeather.wind + (Math.random() - 0.5) * 5)
        };
        
        return {
            ...baseWeather,
            ...variation,
            location: location,
            date: date.toISOString(),
            source: 'fallback',
            accuracy: 'estimated'
        };
    }
    
    /**
     * Get elevation fallback
     */
    getElevationFallback(points, terrainType = 'rolling') {
        const profile = this.fallbackData.get('elevation')[terrainType];
        
        return points.map((point, index) => {
            // Create realistic elevation variations
            const progress = index / points.length;
            const baseElevation = profile.min + (profile.max - profile.min) * progress;
            const variation = Math.sin(progress * Math.PI * 4) * 50; // Add some hills
            
            return {
                ...point,
                elevation: Math.round(baseElevation + variation),
                source: 'fallback'
            };
        });
    }
    
    /**
     * Get traffic fallback
     */
    getTrafficFallback(time = new Date()) {
        const hour = time.getHours();
        const dayOfWeek = time.getDay();
        
        let period = 'midday';
        if (dayOfWeek >= 1 && dayOfWeek <= 5) { // Weekday
            if (hour >= 7 && hour <= 9) period = 'rush_morning';
            else if (hour >= 16 && hour <= 18) period = 'rush_evening';
            else if (hour >= 22 || hour <= 5) period = 'night';
        } else { // Weekend
            period = 'weekend';
        }
        
        const pattern = this.fallbackData.get('traffic')[period];
        
        return {
            congestionLevel: pattern.congestion,
            speedReduction: pattern.speed_reduction,
            estimatedDelay: Math.round(pattern.speed_reduction * 0.3), // minutes
            alternativeRoutes: this.generateAlternativeRoutes(pattern.congestion),
            source: 'fallback',
            basedOn: 'historical_patterns'
        };
    }
    
    /**
     * Get PDF extraction fallback
     */
    getPDFExtractionFallback(text) {
        const patterns = this.fallbackData.get('controller').patterns;
        const settings = {};
        
        patterns.forEach(pattern => {
            const matches = text.matchAll(pattern);
            for (const match of matches) {
                const funcNum = match[1];
                const value = match[2];
                if (funcNum && value) {
                    settings[`F.${funcNum}`] = parseInt(value);
                }
            }
        });
        
        return {
            settings,
            vehicleInfo: this.extractVehicleInfoFallback(text),
            confidence: 0.7,
            source: 'pattern_matching',
            method: 'fallback'
        };
    }
    
    /**
     * Get route fallback
     */
    getRouteFallback(start, end) {
        const distance = this.calculateDistance(start, end);
        const avgSpeed = 20; // MPH for LSV
        const duration = (distance / avgSpeed) * 60; // minutes
        
        return {
            distance: { value: distance * 1609.34, text: `${distance.toFixed(1)} mi` },
            duration: { value: duration * 60, text: `${Math.round(duration)} mins` },
            waypoints: this.generateFallbackWaypoints(start, end),
            warnings: ['Using estimated route - verify locally'],
            isLegal: true,
            legalityScore: 0.7,
            source: 'fallback'
        };
    }
    
    /**
     * Generate alternative routes
     */
    generateAlternativeRoutes(congestionLevel) {
        const routes = [];
        
        if (congestionLevel === 'heavy') {
            routes.push({
                name: 'Residential Route',
                description: 'Through quiet neighborhoods',
                estimatedDelay: -5,
                suitability: 'excellent'
            });
            routes.push({
                name: 'Scenic Route',
                description: 'Via parks and green spaces',
                estimatedDelay: 3,
                suitability: 'good'
            });
        }
        
        return routes;
    }
    
    /**
     * Calculate distance between points
     */
    calculateDistance(start, end) {
        const R = 3959; // Earth radius in miles
        const lat1 = start.lat || start.latitude;
        const lon1 = start.lng || start.longitude;
        const lat2 = end.lat || end.latitude;
        const lon2 = end.lng || end.longitude;
        
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }
    
    /**
     * Generate fallback waypoints
     */
    generateFallbackWaypoints(start, end) {
        const waypoints = [];
        const steps = 5;
        
        for (let i = 0; i <= steps; i++) {
            const ratio = i / steps;
            waypoints.push({
                lat: start.lat + (end.lat - start.lat) * ratio,
                lng: start.lng + (end.lng - start.lng) * ratio,
                instruction: i === 0 ? 'Start' : i === steps ? 'Destination' : 'Continue'
            });
        }
        
        return waypoints;
    }
    
    /**
     * Extract vehicle info fallback
     */
    extractVehicleInfoFallback(text) {
        const info = {};
        
        // Model detection
        const modelMatch = text.match(/\b(e[2-6]|e[SLM]|elXD)\b/i);
        if (modelMatch) info.model = modelMatch[1];
        
        // Year detection
        const yearMatch = text.match(/\b(19|20)\d{2}\b/);
        if (yearMatch) info.year = parseInt(yearMatch[0]);
        
        // Motor type detection
        const motorMatch = text.match(/\b(DC|AC|Stock|Upgrade)\b/i);
        if (motorMatch) info.motorType = motorMatch[1];
        
        return info;
    }
    
    /**
     * Get season from date
     */
    getSeason(date) {
        const month = date.getMonth();
        if (month >= 11 || month <= 1) return 'winter';
        if (month >= 2 && month <= 4) return 'spring';
        if (month >= 5 && month <= 7) return 'summer';
        return 'fall';
    }
    
    /**
     * Activate fallback for service
     */
    activateFallback(service) {
        console.log(`Activating fallback for ${service}`);
        
        // Notify UI components
        window.dispatchEvent(new CustomEvent('fallbackActivated', {
            detail: { service, timestamp: new Date() }
        }));
    }
    
    /**
     * Check if fallback is needed
     */
    needsFallback(service) {
        if (!window.apiManager) return true;
        
        const apiMap = {
            'maps': 'googleMaps',
            'elevation': 'mapbox',
            'weather': 'openweather',
            'pdf': 'claude',
            'traffic': 'googleMaps'
        };
        
        const apiKey = apiMap[service];
        return !window.apiManager.apis[apiKey]?.isConfigured;
    }
    
    /**
     * Get fallback confidence score
     */
    getFallbackConfidence(service, method = 'fallback') {
        const scores = {
            'maps': { osm: 0.8, fallback: 0.6 },
            'elevation': { openElevation: 0.85, fallback: 0.7 },
            'weather': { historical: 0.7, fallback: 0.5 },
            'pdf': { patternMatching: 0.75, fallback: 0.6 },
            'traffic': { timeBasedPatterns: 0.7, fallback: 0.5 }
        };
        
        return scores[service]?.[method] || 0.5;
    }
}

// Create global instance
window.fallbackSystem = new FallbackSystem();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FallbackSystem;
}
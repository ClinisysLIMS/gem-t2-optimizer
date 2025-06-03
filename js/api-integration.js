/**
 * API Integration Layer with Fallback Support
 * Seamlessly switches between API calls and local calculations
 */
class APIIntegration {
    constructor() {
        this.apiManager = window.apiManager || null;
        this.fallbackCalc = window.fallbackCalculations || new FallbackCalculations();
        this.fallbackSystem = window.fallbackSystem || null;
        this.mcpConfig = window.mcpConfig || null;
        
        this.useLocalOnly = false; // Force local calculations
        this.apiAttempts = new Map(); // Track API failures
        this.maxRetries = 3;
        
        this.initialize();
    }
    
    /**
     * Initialize API integration
     */
    initialize() {
        // Check for required dependencies
        if (!this.fallbackCalc) {
            console.error('Fallback calculations not available');
        }
        
        // Set up event listeners
        this.setupEventListeners();
        
        console.log('API Integration initialized with fallback support');
    }
    
    /**
     * Setup event listeners for API failures
     */
    setupEventListeners() {
        window.addEventListener('apiFailed', (event) => {
            this.handleAPIFailure(event.detail);
        });
        
        window.addEventListener('forceLocalMode', () => {
            this.useLocalOnly = true;
            console.log('Forced to local-only mode');
        });
    }
    
    /**
     * Get weather data with fallback
     */
    async getWeather(location, date = new Date()) {
        // Check if forced to local mode
        if (this.useLocalOnly) {
            return this.getLocalWeather(location, date);
        }
        
        // Try API first
        try {
            if (this.apiManager?.apis.openweather?.isConfigured) {
                const response = await this.apiManager.makeAPIRequest('openweather', '/weather', {
                    method: 'GET',
                    params: { q: location }
                });
                
                if (response.success) {
                    return this.transformWeatherResponse(response.data);
                }
            }
        } catch (error) {
            console.warn('Weather API failed, using fallback:', error);
        }
        
        // Use fallback calculation
        return this.getLocalWeather(location, date);
    }
    
    /**
     * Get local weather estimation
     */
    getLocalWeather(location, date) {
        const weather = this.fallbackCalc.estimateWeather(location, date);
        
        return {
            ...weather,
            displayWarning: 'Using estimated weather data',
            isLocal: true
        };
    }
    
    /**
     * Get terrain data with fallback
     */
    async getTerrain(location) {
        if (this.useLocalOnly) {
            return this.getLocalTerrain(location);
        }
        
        // Try MCP first
        try {
            if (this.mcpConfig && !this.mcpConfig.isLocal) {
                const response = await this.mcpConfig.callTool('get_terrain', {
                    location: location
                });
                
                if (response.success) {
                    return response;
                }
            }
        } catch (error) {
            console.warn('Terrain API failed, using fallback:', error);
        }
        
        // Use fallback calculation
        return this.getLocalTerrain(location);
    }
    
    /**
     * Get local terrain estimation
     */
    getLocalTerrain(location) {
        const terrain = this.fallbackCalc.estimateTerrain(location);
        
        return {
            ...terrain,
            displayWarning: 'Using estimated terrain data',
            isLocal: true
        };
    }
    
    /**
     * Get traffic data with fallback
     */
    async getTraffic(location, dateTime = new Date()) {
        if (this.useLocalOnly) {
            return this.getLocalTraffic(location, dateTime);
        }
        
        // Try Google Maps API first
        try {
            if (this.apiManager?.apis.googleMaps?.isConfigured) {
                const response = await this.apiManager.makeAPIRequest('googleMaps', '/directions', {
                    method: 'GET',
                    params: {
                        origin: location,
                        destination: location,
                        departure_time: Math.floor(dateTime.getTime() / 1000)
                    }
                });
                
                if (response.success) {
                    return this.transformTrafficResponse(response.data);
                }
            }
        } catch (error) {
            console.warn('Traffic API failed, using fallback:', error);
        }
        
        // Use fallback calculation
        return this.getLocalTraffic(location, dateTime);
    }
    
    /**
     * Get local traffic estimation
     */
    getLocalTraffic(location, dateTime) {
        const traffic = this.fallbackCalc.estimateTraffic(location, dateTime);
        
        return {
            ...traffic,
            displayWarning: 'Using estimated traffic patterns',
            isLocal: true
        };
    }
    
    /**
     * Get elevation profile with fallback
     */
    async getElevationProfile(start, end, distance) {
        if (this.useLocalOnly) {
            return this.getLocalElevationProfile(start, end, distance);
        }
        
        // Try Mapbox API first
        try {
            if (this.apiManager?.apis.mapbox?.isConfigured) {
                // Would normally make API call here
                // For now, fall through to local calculation
            }
        } catch (error) {
            console.warn('Elevation API failed, using fallback:', error);
        }
        
        // Use fallback calculation
        return this.getLocalElevationProfile(start, end, distance);
    }
    
    /**
     * Get local elevation profile
     */
    getLocalElevationProfile(start, end, distance) {
        const profile = this.fallbackCalc.estimateElevationProfile(start, end, distance);
        
        return {
            ...profile,
            displayWarning: 'Using estimated elevation data',
            isLocal: true
        };
    }
    
    /**
     * Optimize route with fallback
     */
    async optimizeRoute(start, destination, preferences = {}) {
        if (this.useLocalOnly) {
            return this.getLocalRouteOptimization(start, destination, preferences);
        }
        
        // Try Google Maps API first
        try {
            if (this.apiManager?.apis.googleMaps?.isConfigured) {
                const response = await this.apiManager.makeAPIRequest('googleMaps', '/directions', {
                    method: 'GET',
                    params: {
                        origin: start,
                        destination: destination,
                        mode: 'driving',
                        alternatives: true
                    }
                });
                
                if (response.success) {
                    return this.transformRouteResponse(response.data, preferences);
                }
            }
        } catch (error) {
            console.warn('Route API failed, using fallback:', error);
        }
        
        // Use fallback calculation
        return this.getLocalRouteOptimization(start, destination, preferences);
    }
    
    /**
     * Get local route optimization
     */
    getLocalRouteOptimization(start, destination, preferences) {
        const route = this.fallbackCalc.optimizeRoute(start, destination, preferences);
        
        return {
            ...route,
            displayWarning: 'Using estimated route data',
            isLocal: true
        };
    }
    
    /**
     * Get comprehensive trip analysis
     */
    async analyzeTripConditions(tripData) {
        const { start, destination, date, vehicleConfig, preferences } = tripData;
        
        // Gather all data (with fallbacks as needed)
        const [weather, terrain, traffic, elevation, route] = await Promise.all([
            this.getWeather(destination, date),
            this.getTerrain(destination),
            this.getTraffic(destination, date),
            this.getElevationProfile(start, destination, route?.distance?.value || 5),
            this.optimizeRoute(start, destination, preferences)
        ]);
        
        // Combine all data for comprehensive analysis
        const analysis = {
            weather: weather,
            terrain: terrain,
            traffic: traffic,
            elevation: elevation,
            route: route,
            
            // Calculate combined impact
            combinedImpact: this.calculateCombinedImpact(weather, terrain, traffic, elevation),
            
            // Generate optimization recommendations
            optimizationRecommendations: this.generateTripOptimizations(
                weather, terrain, traffic, elevation, vehicleConfig
            ),
            
            // Overall trip assessment
            tripAssessment: this.assessTripViability(weather, terrain, traffic, elevation),
            
            // Data sources
            dataSources: {
                weather: weather.isLocal ? 'local_estimation' : 'api',
                terrain: terrain.isLocal ? 'local_estimation' : 'api',
                traffic: traffic.isLocal ? 'local_estimation' : 'api',
                elevation: elevation.isLocal ? 'local_estimation' : 'api',
                route: route.isLocal ? 'local_estimation' : 'api'
            },
            
            // Overall confidence
            confidence: this.calculateOverallConfidence(weather, terrain, traffic, elevation, route)
        };
        
        return analysis;
    }
    
    /**
     * Calculate combined impact of all factors
     */
    calculateCombinedImpact(weather, terrain, traffic, elevation) {
        let impactScore = 1.0;
        
        // Weather impact
        if (weather.temperature < 40 || weather.temperature > 95) impactScore *= 0.9;
        if (weather.windSpeed > 20) impactScore *= 0.85;
        if (weather.precipitation > 0.5) impactScore *= 0.8;
        
        // Terrain impact
        impactScore *= (1 - terrain.difficulty * 0.3);
        
        // Traffic impact
        impactScore *= (1 - traffic.congestionScore * 0.2);
        
        // Elevation impact
        if (elevation.avgGrade > 10) impactScore *= 0.85;
        if (elevation.maxGrade > 20) impactScore *= 0.75;
        
        return {
            overall: impactScore,
            rangeImpact: (1 - impactScore) * 100, // Percentage range reduction
            performanceImpact: this.getPerformanceImpactDescription(impactScore),
            primaryFactors: this.identifyPrimaryFactors(weather, terrain, traffic, elevation)
        };
    }
    
    /**
     * Generate trip-specific optimizations
     */
    generateTripOptimizations(weather, terrain, traffic, elevation, vehicleConfig) {
        const optimizations = [];
        
        // Weather-based optimizations
        if (weather.temperature > 85) {
            optimizations.push({
                category: 'cooling',
                recommendation: 'Pre-cool vehicle before departure',
                impact: 'Reduces battery drain from AC'
            });
        }
        
        if (weather.windSpeed > 15) {
            optimizations.push({
                category: 'aerodynamics',
                recommendation: 'Remove unnecessary accessories',
                impact: 'Reduces wind resistance'
            });
        }
        
        // Terrain-based optimizations
        if (terrain.difficulty > 0.6) {
            optimizations.push({
                category: 'traction',
                recommendation: 'Check tire pressure (reduce by 2-3 PSI)',
                impact: 'Improves traction on difficult terrain'
            });
        }
        
        // Traffic-based optimizations
        if (traffic.congestionScore > 0.7) {
            optimizations.push({
                category: 'timing',
                recommendation: `Depart ${traffic.alternativeRoutes[0]?.name || 'earlier'}`,
                impact: 'Avoid peak congestion'
            });
        }
        
        // Elevation-based optimizations
        if (elevation.totalAscent > 500) {
            optimizations.push({
                category: 'regeneration',
                recommendation: 'Maximize regenerative braking settings',
                impact: 'Recover energy on descents'
            });
        }
        
        // Vehicle-specific optimizations
        if (vehicleConfig.batteryAge > 3) {
            optimizations.push({
                category: 'battery',
                recommendation: 'Charge to 100% before departure',
                impact: 'Compensate for reduced capacity'
            });
        }
        
        return optimizations;
    }
    
    /**
     * Assess overall trip viability
     */
    assessTripViability(weather, terrain, traffic, elevation) {
        const factors = [];
        let viabilityScore = 1.0;
        
        // Check each factor
        if (weather.conditions.includes('Rain') || weather.conditions.includes('Storm')) {
            factors.push('Poor weather conditions');
            viabilityScore *= 0.8;
        }
        
        if (terrain.difficulty > 0.8) {
            factors.push('Very difficult terrain');
            viabilityScore *= 0.7;
        }
        
        if (traffic.congestionLevel === 'Heavy') {
            factors.push('Heavy traffic expected');
            viabilityScore *= 0.85;
        }
        
        if (elevation.difficulty === 'Very Difficult') {
            factors.push('Challenging elevation changes');
            viabilityScore *= 0.75;
        }
        
        return {
            viable: viabilityScore > 0.5,
            score: viabilityScore,
            concerns: factors,
            recommendation: this.getTripRecommendation(viabilityScore),
            safetyNotes: this.generateSafetyNotes(weather, terrain, traffic, elevation)
        };
    }
    
    /**
     * Calculate overall confidence in data
     */
    calculateOverallConfidence(weather, terrain, traffic, elevation, route) {
        const confidences = [
            weather.confidence || 0.5,
            terrain.confidence || 0.5,
            traffic.confidence || 0.5,
            elevation.confidence || 0.5,
            route.confidence || 0.5
        ];
        
        const avgConfidence = confidences.reduce((a, b) => a + b, 0) / confidences.length;
        const allLocal = weather.isLocal && terrain.isLocal && traffic.isLocal && 
                        elevation.isLocal && route.isLocal;
        
        return {
            average: avgConfidence,
            allLocal: allLocal,
            reliability: avgConfidence > 0.7 ? 'High' : avgConfidence > 0.5 ? 'Medium' : 'Low',
            recommendation: allLocal ? 
                'Consider configuring API keys for more accurate data' : 
                'Data includes real-time information'
        };
    }
    
    /**
     * Transform weather API response
     */
    transformWeatherResponse(apiData) {
        return {
            temperature: Math.round((apiData.main.temp - 273.15) * 9/5 + 32), // K to F
            humidity: apiData.main.humidity,
            windSpeed: Math.round(apiData.wind.speed * 2.237), // m/s to mph
            conditions: apiData.weather[0].main,
            pressure: apiData.main.pressure,
            visibility: 'good',
            source: 'api',
            confidence: 0.95,
            isLocal: false
        };
    }
    
    /**
     * Transform traffic API response
     */
    transformTrafficResponse(apiData) {
        const route = apiData.routes[0];
        const normalDuration = route.legs[0].duration.value;
        const trafficDuration = route.legs[0].duration_in_traffic?.value || normalDuration;
        const congestion = (trafficDuration - normalDuration) / normalDuration;
        
        return {
            congestionLevel: congestion > 0.3 ? 'Heavy' : congestion > 0.15 ? 'Moderate' : 'Light',
            congestionScore: Math.min(1, congestion),
            estimatedDelay: Math.round((trafficDuration - normalDuration) / 60),
            alternativeRoutes: apiData.routes.slice(1).map(r => ({
                name: r.summary,
                estimatedDelay: Math.round((r.legs[0].duration.value - normalDuration) / 60)
            })),
            source: 'api',
            confidence: 0.9,
            isLocal: false
        };
    }
    
    /**
     * Transform route API response
     */
    transformRouteResponse(apiData, preferences) {
        const route = apiData.routes[0];
        const leg = route.legs[0];
        
        return {
            distance: {
                value: leg.distance.value / 1609.34, // meters to miles
                text: leg.distance.text
            },
            duration: {
                value: Math.round(leg.duration.value / 60), // seconds to minutes
                text: leg.duration.text
            },
            waypoints: leg.steps.map(step => ({
                instruction: step.html_instructions,
                distance: step.distance.value / 1609.34,
                duration: step.duration.value / 60
            })),
            warnings: route.warnings || [],
            source: 'api',
            confidence: 0.95,
            isLocal: false
        };
    }
    
    /**
     * Get performance impact description
     */
    getPerformanceImpactDescription(score) {
        if (score > 0.9) return 'Minimal impact';
        if (score > 0.7) return 'Moderate impact';
        if (score > 0.5) return 'Significant impact';
        return 'Severe impact';
    }
    
    /**
     * Identify primary impact factors
     */
    identifyPrimaryFactors(weather, terrain, traffic, elevation) {
        const factors = [];
        
        if (weather.temperature < 40 || weather.temperature > 95) {
            factors.push('Extreme temperature');
        }
        
        if (terrain.difficulty > 0.7) {
            factors.push('Difficult terrain');
        }
        
        if (traffic.congestionScore > 0.7) {
            factors.push('Heavy traffic');
        }
        
        if (elevation.maxGrade > 15) {
            factors.push('Steep grades');
        }
        
        return factors.slice(0, 3); // Top 3 factors
    }
    
    /**
     * Get trip recommendation
     */
    getTripRecommendation(score) {
        if (score > 0.8) return 'Excellent conditions for trip';
        if (score > 0.6) return 'Good conditions with minor challenges';
        if (score > 0.4) return 'Proceed with caution';
        return 'Consider postponing or alternative transportation';
    }
    
    /**
     * Generate safety notes
     */
    generateSafetyNotes(weather, terrain, traffic, elevation) {
        const notes = [];
        
        if (weather.conditions.includes('Rain')) {
            notes.push('Wet conditions - reduce speed and increase following distance');
        }
        
        if (terrain.traction < 0.6) {
            notes.push('Low traction surface - avoid sudden movements');
        }
        
        if (elevation.maxGrade > 20) {
            notes.push('Very steep sections - check brakes before descending');
        }
        
        if (traffic.congestionLevel === 'Heavy') {
            notes.push('Heavy traffic - remain alert and patient');
        }
        
        return notes;
    }
    
    /**
     * Handle API failure
     */
    handleAPIFailure(detail) {
        const { service, error } = detail;
        
        // Track failures
        const attempts = this.apiAttempts.get(service) || 0;
        this.apiAttempts.set(service, attempts + 1);
        
        // If too many failures, switch to local only for this service
        if (attempts >= this.maxRetries) {
            console.warn(`Too many failures for ${service}, using local calculations only`);
            // Could implement per-service local-only mode here
        }
    }
    
    /**
     * Reset API attempts
     */
    resetAPIAttempts() {
        this.apiAttempts.clear();
    }
    
    /**
     * Force local mode
     */
    forceLocalMode(enabled = true) {
        this.useLocalOnly = enabled;
        console.log(`Local-only mode ${enabled ? 'enabled' : 'disabled'}`);
    }
    
    /**
     * Get integration status
     */
    getStatus() {
        return {
            localOnly: this.useLocalOnly,
            apiFailures: Array.from(this.apiAttempts.entries()),
            fallbackAvailable: !!this.fallbackCalc,
            apiConfigured: this.apiManager?.getConfiguredAPIs() || [],
            mcpStatus: this.mcpConfig?.getStatus() || { isLocal: true }
        };
    }
}

// Create global instance
window.apiIntegration = new APIIntegration();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = APIIntegration;
}
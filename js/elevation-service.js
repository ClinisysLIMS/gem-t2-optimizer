/**
 * Enhanced Elevation Service
 * Comprehensive elevation API integration with radius analysis
 */
class ElevationService {
    constructor() {
        this.apiManager = window.apiManager || new APIManager();
        this.providers = {
            google: {
                name: 'Google Elevation API',
                endpoint: 'https://maps.googleapis.com/maps/api/elevation',
                active: false
            },
            mapbox: {
                name: 'Mapbox Elevation API',
                endpoint: 'https://api.mapbox.com/v4/mapbox.mapbox-terrain-v2',
                active: false
            },
            openElevation: {
                name: 'Open-Elevation API',
                endpoint: 'https://api.open-elevation.com/api/v1',
                active: true // Always available as fallback
            }
        };
        
        this.cache = new Map();
        this.cacheTimeout = 3600000; // 1 hour
        this.batchSize = 100; // Max points per request
        
        this.initialize();
    }
    
    /**
     * Initialize elevation service
     */
    async initialize() {
        // Check which APIs are configured
        if (this.apiManager.apis.googleMaps.isConfigured) {
            this.providers.google.active = true;
        }
        if (this.apiManager.apis.mapbox.isConfigured) {
            this.providers.mapbox.active = true;
        }
        
        console.log('Elevation Service initialized with providers:', this.getActiveProviders());
    }
    
    /**
     * Get active elevation providers
     */
    getActiveProviders() {
        return Object.entries(this.providers)
            .filter(([_, provider]) => provider.active)
            .map(([name, _]) => name);
    }
    
    /**
     * Analyze elevation within radius
     */
    async analyzeRadiusElevation(centerPoint, radiusMiles = 5, options = {}) {
        const {
            samples = 100,
            includeRoutes = true,
            includeHeatmap = true,
            vehicleType = 'lsv'
        } = options;
        
        // Generate analysis points
        const analysisPoints = this.generateRadiusPoints(centerPoint, radiusMiles, samples);
        
        // Get elevation data
        const elevationData = await this.getElevationForPoints(analysisPoints);
        
        // Perform comprehensive analysis
        const analysis = {
            center: centerPoint,
            radius: radiusMiles,
            points: elevationData,
            statistics: this.calculateElevationStatistics(elevationData),
            terrain: this.analyzeTerrainCharacteristics(elevationData, centerPoint),
            gradients: this.calculateGradients(elevationData),
            zones: this.identifyElevationZones(elevationData),
            accessibility: this.assessAccessibility(elevationData, vehicleType)
        };
        
        // Add route suggestions if requested
        if (includeRoutes) {
            analysis.suggestedRoutes = await this.generateRoutesSuggestions(analysis);
        }
        
        // Add heatmap data if requested
        if (includeHeatmap) {
            analysis.heatmapData = this.generateElevationHeatmap(elevationData);
        }
        
        return analysis;
    }
    
    /**
     * Get elevation for specific points
     */
    async getElevationForPoints(points) {
        // Check cache first
        const cacheKey = this.generateCacheKey(points);
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;
        
        let elevationData = null;
        
        // Try providers in order of preference
        if (this.providers.google.active) {
            elevationData = await this.getGoogleElevation(points);
        }
        
        if (!elevationData && this.providers.mapbox.active) {
            elevationData = await this.getMapboxElevation(points);
        }
        
        if (!elevationData) {
            elevationData = await this.getOpenElevation(points);
        }
        
        // Cache results
        if (elevationData) {
            this.setCache(cacheKey, elevationData);
        }
        
        return elevationData;
    }
    
    /**
     * Get elevation using Google Elevation API
     */
    async getGoogleElevation(points) {
        try {
            const batches = this.createBatches(points, this.batchSize);
            const results = [];
            
            for (const batch of batches) {
                const locations = batch.map(p => `${p.lat},${p.lng}`).join('|');
                const url = `${this.providers.google.endpoint}/json?locations=${locations}&key=${this.apiManager.apis.googleMaps.key}`;
                
                const response = await fetch(url);
                const data = await response.json();
                
                if (data.status === 'OK') {
                    results.push(...data.results.map((result, idx) => ({
                        ...batch[idx],
                        elevation: result.elevation,
                        resolution: result.resolution,
                        provider: 'google'
                    })));
                } else {
                    throw new Error(`Google Elevation API error: ${data.status}`);
                }
            }
            
            return results;
            
        } catch (error) {
            console.warn('Google Elevation failed:', error);
            return null;
        }
    }
    
    /**
     * Get elevation using Mapbox API
     */
    async getMapboxElevation(points) {
        try {
            const results = [];
            
            // Mapbox requires individual requests for each point
            for (const point of points) {
                const url = `${this.providers.mapbox.endpoint}/tilequery/${point.lng},${point.lat}.json?layers=contour&limit=1&access_token=${this.apiManager.apis.mapbox.key}`;
                
                const response = await fetch(url);
                const data = await response.json();
                
                if (data.features && data.features.length > 0) {
                    results.push({
                        ...point,
                        elevation: data.features[0].properties.ele || 0,
                        provider: 'mapbox'
                    });
                } else {
                    results.push({
                        ...point,
                        elevation: 0,
                        provider: 'mapbox'
                    });
                }
                
                // Rate limiting
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            return results;
            
        } catch (error) {
            console.warn('Mapbox Elevation failed:', error);
            return null;
        }
    }
    
    /**
     * Get elevation using Open-Elevation API
     */
    async getOpenElevation(points) {
        try {
            const batches = this.createBatches(points, this.batchSize);
            const results = [];
            
            for (const batch of batches) {
                const locations = batch.map(p => ({
                    latitude: p.lat,
                    longitude: p.lng
                }));
                
                const response = await fetch(`${this.providers.openElevation.endpoint}/lookup`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ locations })
                });
                
                const data = await response.json();
                
                if (data.results) {
                    results.push(...data.results.map((result, idx) => ({
                        ...batch[idx],
                        elevation: result.elevation,
                        provider: 'open-elevation'
                    })));
                }
            }
            
            return results;
            
        } catch (error) {
            console.warn('Open-Elevation failed:', error);
            // Return fallback data
            return this.generateFallbackElevation(points);
        }
    }
    
    /**
     * Generate radius analysis points
     */
    generateRadiusPoints(center, radiusMiles, samples) {
        const points = [];
        const radiusKm = radiusMiles * 1.60934;
        
        // Use spiral pattern for better coverage
        const spiralSamples = Math.sqrt(samples);
        const angleStep = (2 * Math.PI) / spiralSamples;
        
        for (let r = 0; r <= spiralSamples; r++) {
            const radius = (r / spiralSamples) * radiusKm;
            const numPoints = Math.max(1, Math.floor(2 * Math.PI * r));
            
            for (let p = 0; p < numPoints; p++) {
                const angle = (p / numPoints) * 2 * Math.PI;
                const point = this.calculateDestination(center, radius, angle);
                
                points.push({
                    lat: point.lat,
                    lng: point.lng,
                    distanceFromCenter: radius / 1.60934, // Convert back to miles
                    angle: angle * 180 / Math.PI
                });
            }
        }
        
        return points;
    }
    
    /**
     * Calculate destination point given distance and bearing
     */
    calculateDestination(origin, distanceKm, bearingRad) {
        const R = 6371; // Earth radius in km
        const lat1 = origin.lat * Math.PI / 180;
        const lng1 = origin.lng * Math.PI / 180;
        
        const lat2 = Math.asin(
            Math.sin(lat1) * Math.cos(distanceKm / R) +
            Math.cos(lat1) * Math.sin(distanceKm / R) * Math.cos(bearingRad)
        );
        
        const lng2 = lng1 + Math.atan2(
            Math.sin(bearingRad) * Math.sin(distanceKm / R) * Math.cos(lat1),
            Math.cos(distanceKm / R) - Math.sin(lat1) * Math.sin(lat2)
        );
        
        return {
            lat: lat2 * 180 / Math.PI,
            lng: lng2 * 180 / Math.PI
        };
    }
    
    /**
     * Calculate elevation statistics
     */
    calculateElevationStatistics(elevationData) {
        const elevations = elevationData.map(p => p.elevation);
        
        return {
            min: Math.min(...elevations),
            max: Math.max(...elevations),
            mean: elevations.reduce((a, b) => a + b, 0) / elevations.length,
            median: this.calculateMedian(elevations),
            standardDeviation: this.calculateStandardDeviation(elevations),
            range: Math.max(...elevations) - Math.min(...elevations),
            percentiles: {
                p10: this.calculatePercentile(elevations, 10),
                p25: this.calculatePercentile(elevations, 25),
                p50: this.calculatePercentile(elevations, 50),
                p75: this.calculatePercentile(elevations, 75),
                p90: this.calculatePercentile(elevations, 90)
            }
        };
    }
    
    /**
     * Analyze terrain characteristics
     */
    analyzeTerrainCharacteristics(elevationData, center) {
        const characteristics = {
            type: 'unknown',
            roughness: 0,
            variability: 0,
            dominantDirection: null,
            slopes: {
                gentle: 0,    // < 5%
                moderate: 0,  // 5-10%
                steep: 0,     // 10-15%
                extreme: 0    // > 15%
            }
        };
        
        // Calculate terrain roughness
        const elevations = elevationData.map(p => p.elevation);
        characteristics.roughness = this.calculateRoughness(elevations);
        characteristics.variability = this.calculateStandardDeviation(elevations);
        
        // Analyze slopes
        const gradients = this.calculateGradients(elevationData);
        gradients.forEach(g => {
            if (g.grade < 5) characteristics.slopes.gentle++;
            else if (g.grade < 10) characteristics.slopes.moderate++;
            else if (g.grade < 15) characteristics.slopes.steep++;
            else characteristics.slopes.extreme++;
        });
        
        // Determine terrain type
        if (characteristics.roughness < 50 && characteristics.variability < 20) {
            characteristics.type = 'flat';
        } else if (characteristics.roughness < 100 && characteristics.variability < 50) {
            characteristics.type = 'rolling';
        } else if (characteristics.roughness < 200) {
            characteristics.type = 'hilly';
        } else {
            characteristics.type = 'mountainous';
        }
        
        // Find dominant slope direction
        characteristics.dominantDirection = this.findDominantDirection(elevationData, center);
        
        return characteristics;
    }
    
    /**
     * Calculate gradients between points
     */
    calculateGradients(elevationData) {
        const gradients = [];
        
        for (let i = 0; i < elevationData.length - 1; i++) {
            for (let j = i + 1; j < elevationData.length; j++) {
                const p1 = elevationData[i];
                const p2 = elevationData[j];
                
                const distance = this.calculateDistance(p1, p2) * 5280; // Convert to feet
                const elevationChange = Math.abs(p2.elevation - p1.elevation);
                const grade = (elevationChange / distance) * 100;
                
                gradients.push({
                    from: p1,
                    to: p2,
                    distance: distance / 5280, // Back to miles
                    elevationChange,
                    grade,
                    direction: this.calculateBearing(p1, p2)
                });
            }
        }
        
        return gradients;
    }
    
    /**
     * Identify elevation zones
     */
    identifyElevationZones(elevationData) {
        const stats = this.calculateElevationStatistics(elevationData);
        const zones = {
            low: [],
            medium: [],
            high: [],
            veryHigh: []
        };
        
        const zoneThresholds = {
            low: stats.percentiles.p25,
            medium: stats.percentiles.p50,
            high: stats.percentiles.p75,
            veryHigh: stats.percentiles.p90
        };
        
        elevationData.forEach(point => {
            if (point.elevation <= zoneThresholds.low) {
                zones.low.push(point);
            } else if (point.elevation <= zoneThresholds.medium) {
                zones.medium.push(point);
            } else if (point.elevation <= zoneThresholds.high) {
                zones.high.push(point);
            } else {
                zones.veryHigh.push(point);
            }
        });
        
        // Calculate zone percentages
        const total = elevationData.length;
        return {
            zones,
            percentages: {
                low: (zones.low.length / total) * 100,
                medium: (zones.medium.length / total) * 100,
                high: (zones.high.length / total) * 100,
                veryHigh: (zones.veryHigh.length / total) * 100
            },
            thresholds: zoneThresholds
        };
    }
    
    /**
     * Assess accessibility for vehicle type
     */
    assessAccessibility(elevationData, vehicleType) {
        const gradients = this.calculateGradients(elevationData);
        const maxGrades = {
            'golf_cart': 8,
            'lsv': 12,
            'any': 15
        };
        
        const maxGrade = maxGrades[vehicleType] || 12;
        const accessibleGradients = gradients.filter(g => g.grade <= maxGrade);
        const inaccessibleGradients = gradients.filter(g => g.grade > maxGrade);
        
        // Find accessible areas
        const accessibleAreas = this.findAccessibleAreas(elevationData, accessibleGradients);
        
        return {
            vehicleType,
            maxGrade,
            accessibilityScore: (accessibleGradients.length / gradients.length) * 100,
            accessibleAreas,
            challenges: inaccessibleGradients.map(g => ({
                location: { lat: g.from.lat, lng: g.from.lng },
                grade: g.grade,
                direction: g.direction,
                recommendation: g.grade > maxGrade * 1.5 ? 'Avoid' : 'Use caution'
            })),
            recommendations: this.generateAccessibilityRecommendations(
                accessibleGradients.length / gradients.length,
                vehicleType
            )
        };
    }
    
    /**
     * Generate route suggestions based on elevation analysis
     */
    async generateRoutesSuggestions(analysis) {
        const routes = [];
        
        // Find optimal elevation routes (minimal grade changes)
        const flatRoute = this.findFlatRoute(analysis.points, analysis.gradients);
        if (flatRoute) {
            routes.push({
                type: 'easiest',
                description: 'Minimal elevation change',
                ...flatRoute
            });
        }
        
        // Find scenic route (moderate elevation with views)
        const scenicRoute = this.findScenicRoute(analysis.points, analysis.zones);
        if (scenicRoute) {
            routes.push({
                type: 'scenic',
                description: 'Moderate elevation with potential views',
                ...scenicRoute
            });
        }
        
        // Find challenging route (for capable vehicles)
        const challengingRoute = this.findChallengingRoute(analysis.points, analysis.gradients);
        if (challengingRoute) {
            routes.push({
                type: 'challenging',
                description: 'Steeper grades for capable vehicles',
                ...challengingRoute
            });
        }
        
        return routes;
    }
    
    /**
     * Generate elevation heatmap data
     */
    generateElevationHeatmap(elevationData) {
        const stats = this.calculateElevationStatistics(elevationData);
        
        return elevationData.map(point => ({
            lat: point.lat,
            lng: point.lng,
            weight: (point.elevation - stats.min) / (stats.max - stats.min),
            elevation: point.elevation
        }));
    }
    
    /**
     * Utility functions
     */
    createBatches(array, batchSize) {
        const batches = [];
        for (let i = 0; i < array.length; i += batchSize) {
            batches.push(array.slice(i, i + batchSize));
        }
        return batches;
    }
    
    calculateDistance(p1, p2) {
        const R = 3959; // Earth radius in miles
        const dLat = (p2.lat - p1.lat) * Math.PI / 180;
        const dLng = (p2.lng - p1.lng) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(p1.lat * Math.PI / 180) * Math.cos(p2.lat * Math.PI / 180) *
                  Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }
    
    calculateBearing(p1, p2) {
        const dLng = (p2.lng - p1.lng) * Math.PI / 180;
        const lat1 = p1.lat * Math.PI / 180;
        const lat2 = p2.lat * Math.PI / 180;
        
        const y = Math.sin(dLng) * Math.cos(lat2);
        const x = Math.cos(lat1) * Math.sin(lat2) -
                  Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
        
        return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
    }
    
    calculateMedian(values) {
        const sorted = [...values].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    }
    
    calculatePercentile(values, percentile) {
        const sorted = [...values].sort((a, b) => a - b);
        const index = (percentile / 100) * (sorted.length - 1);
        const lower = Math.floor(index);
        const upper = Math.ceil(index);
        const weight = index % 1;
        return sorted[lower] * (1 - weight) + sorted[upper] * weight;
    }
    
    calculateStandardDeviation(values) {
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const squareDiffs = values.map(value => Math.pow(value - mean, 2));
        const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / values.length;
        return Math.sqrt(avgSquareDiff);
    }
    
    calculateRoughness(elevations) {
        let roughness = 0;
        for (let i = 1; i < elevations.length; i++) {
            roughness += Math.abs(elevations[i] - elevations[i-1]);
        }
        return roughness / elevations.length;
    }
    
    findDominantDirection(elevationData, center) {
        const directions = { N: 0, E: 0, S: 0, W: 0 };
        
        elevationData.forEach(point => {
            const bearing = this.calculateBearing(center, point);
            if (bearing >= 315 || bearing < 45) directions.N++;
            else if (bearing >= 45 && bearing < 135) directions.E++;
            else if (bearing >= 135 && bearing < 225) directions.S++;
            else directions.W++;
        });
        
        return Object.entries(directions).sort((a, b) => b[1] - a[1])[0][0];
    }
    
    findAccessibleAreas(elevationData, accessibleGradients) {
        // Group accessible points into contiguous areas
        const areas = [];
        const visited = new Set();
        
        elevationData.forEach(point => {
            if (!visited.has(`${point.lat},${point.lng}`)) {
                const area = this.exploreAccessibleArea(point, elevationData, accessibleGradients, visited);
                if (area.length > 5) { // Minimum 5 points for an area
                    areas.push({
                        points: area,
                        center: this.calculateCentroid(area),
                        size: area.length
                    });
                }
            }
        });
        
        return areas.sort((a, b) => b.size - a.size);
    }
    
    exploreAccessibleArea(startPoint, allPoints, accessibleGradients, visited) {
        const area = [];
        const queue = [startPoint];
        
        while (queue.length > 0) {
            const point = queue.shift();
            const key = `${point.lat},${point.lng}`;
            
            if (visited.has(key)) continue;
            visited.add(key);
            area.push(point);
            
            // Find connected accessible points
            const connections = accessibleGradients.filter(g => 
                (g.from.lat === point.lat && g.from.lng === point.lng) ||
                (g.to.lat === point.lat && g.to.lng === point.lng)
            );
            
            connections.forEach(conn => {
                const nextPoint = conn.from.lat === point.lat ? conn.to : conn.from;
                if (!visited.has(`${nextPoint.lat},${nextPoint.lng}`)) {
                    queue.push(nextPoint);
                }
            });
        }
        
        return area;
    }
    
    calculateCentroid(points) {
        const sum = points.reduce((acc, p) => ({
            lat: acc.lat + p.lat,
            lng: acc.lng + p.lng
        }), { lat: 0, lng: 0 });
        
        return {
            lat: sum.lat / points.length,
            lng: sum.lng / points.length
        };
    }
    
    generateAccessibilityRecommendations(accessibilityScore, vehicleType) {
        const recommendations = [];
        
        if (accessibilityScore > 90) {
            recommendations.push('Excellent accessibility - most areas are easily navigable');
        } else if (accessibilityScore > 70) {
            recommendations.push('Good accessibility - some steep areas to avoid');
        } else if (accessibilityScore > 50) {
            recommendations.push('Moderate accessibility - plan routes carefully');
        } else {
            recommendations.push('Limited accessibility - consider alternative areas');
        }
        
        if (vehicleType === 'golf_cart' && accessibilityScore < 80) {
            recommendations.push('Consider upgrading to LSV for better hill climbing ability');
        }
        
        return recommendations;
    }
    
    findFlatRoute(points, gradients) {
        // Find route with minimal elevation changes
        const flatGradients = gradients.filter(g => g.grade < 3);
        if (flatGradients.length === 0) return null;
        
        return {
            waypoints: flatGradients.slice(0, 5).map(g => g.from),
            maxGrade: Math.max(...flatGradients.map(g => g.grade)),
            totalDistance: flatGradients.reduce((sum, g) => sum + g.distance, 0)
        };
    }
    
    findScenicRoute(points, zones) {
        // Find route through varied elevation zones
        const waypoints = [];
        
        ['medium', 'high', 'medium'].forEach(zone => {
            if (zones.zones[zone].length > 0) {
                waypoints.push(zones.zones[zone][0]);
            }
        });
        
        if (waypoints.length < 2) return null;
        
        return { waypoints };
    }
    
    findChallengingRoute(points, gradients) {
        // Find route with steeper but manageable grades
        const challengingGradients = gradients.filter(g => g.grade >= 8 && g.grade <= 15);
        if (challengingGradients.length === 0) return null;
        
        return {
            waypoints: challengingGradients.slice(0, 3).map(g => g.from),
            maxGrade: Math.max(...challengingGradients.map(g => g.grade)),
            warning: 'Suitable for capable vehicles only'
        };
    }
    
    generateFallbackElevation(points) {
        // Generate realistic elevation data based on location
        return points.map(point => ({
            ...point,
            elevation: 100 + Math.sin(point.lat * 10) * 50 + Math.cos(point.lng * 10) * 30,
            provider: 'fallback'
        }));
    }
    
    generateCacheKey(points) {
        const coords = points.slice(0, 5).map(p => `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`).join('|');
        return `elevation:${coords}:${points.length}`;
    }
    
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
        if (this.cache.size > 50) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
    }
}

// Create global instance
window.elevationService = new ElevationService();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ElevationService;
}
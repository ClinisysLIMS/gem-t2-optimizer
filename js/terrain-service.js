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
     * Analyze terrain for a route between two locations or within a radius
     * @param {string|Object} input - Starting location or options object
     * @param {string} endLocation - Destination location (if input is string)
     * @param {number} samples - Number of elevation samples (default: 50)
     * @returns {Promise<Object>} Comprehensive terrain analysis
     */
    async analyzeRoute(input, endLocation, samples = 50) {
        try {
            // Handle different input types
            if (typeof input === 'object' && input.coordinates) {
                // Radius-based analysis
                return await this.analyzeRadiusArea(input);
            } else if (typeof input === 'string' && endLocation) {
                // Point-to-point route analysis
                return await this.analyzePointToPointRoute(input, endLocation, samples);
            } else if (typeof input === 'object' && input.start && input.end) {
                // Route coordinates provided directly
                return await this.analyzePointToPointRoute(input.start, input.end, samples);
            } else {
                throw new Error('Invalid input parameters for terrain analysis');
            }
        } catch (error) {
            console.error('Route analysis error:', error);
            return this.getFallbackTerrainData(input, endLocation);
        }
    }
    
    /**
     * Analyze terrain within a radius from a center point
     * @param {Object} options - Analysis options
     * @returns {Promise<Object>} Radius terrain analysis
     */
    async analyzeRadiusArea(options) {
        const { coordinates, radius = 5, samples = 100 } = options;
        
        try {
            // Generate analysis points in a grid pattern within the radius
            const analysisPoints = this.generateRadiusPoints(coordinates, radius, samples);
            
            // Get elevation data for all points
            const elevationData = await this.getElevationProfile(analysisPoints);
            
            // Calculate radius-specific metrics
            const radiusMetrics = this.calculateRadiusMetrics(elevationData, coordinates, radius);
            
            // Find routes within legal constraints
            const legalRoutes = await this.findLegalRoutesInRadius(coordinates, radius, elevationData);
            
            return {
                ...radiusMetrics,
                center: coordinates,
                radius: radius,
                analysisPoints: analysisPoints.length,
                elevationProfile: elevationData,
                legalRoutes: legalRoutes,
                type: 'radius_analysis',
                source: this.isMapboxConfigured() ? 'mapbox' : 'open-elevation'
            };
            
        } catch (error) {
            console.error('Radius analysis error:', error);
            return this.getFallbackRadiusData(coordinates, radius);
        }
    }
    
    /**
     * Analyze point-to-point route
     * @param {string} startLocation - Starting location
     * @param {string} endLocation - Destination location
     * @param {number} samples - Number of elevation samples
     * @returns {Promise<Object>} Point-to-point analysis
     */
    async analyzePointToPointRoute(startLocation, endLocation, samples = 50) {
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
            type: 'point_to_point',
            source: this.isMapboxConfigured() ? 'mapbox' : 'open-elevation'
        };
    }
    
    /**
     * Generate analysis points within a radius
     * @param {Object} center - Center coordinates {lat, lon}
     * @param {number} radius - Radius in miles
     * @param {number} samples - Number of sample points
     * @returns {Array} Array of coordinate points
     */
    generateRadiusPoints(center, radius, samples) {
        const points = [];
        const gridSize = Math.ceil(Math.sqrt(samples));
        const radiusInDegrees = radius / 69; // Approximate conversion for lat/lon
        
        for (let i = 0; i < gridSize; i++) {
            for (let j = 0; j < gridSize; j++) {
                const latOffset = (i / (gridSize - 1) - 0.5) * 2 * radiusInDegrees;
                const lonOffset = (j / (gridSize - 1) - 0.5) * 2 * radiusInDegrees;
                
                const lat = center.lat + latOffset;
                const lon = center.lon + lonOffset;
                
                // Check if point is within radius
                const distance = this.calculateDistance(center.lat, center.lon, lat, lon);
                if (distance <= radius) {
                    points.push({ lat, lon, distanceFromCenter: distance });
                }
            }
        }
        
        return points;
    }
    
    /**
     * Calculate metrics specific to radius analysis
     * @param {Array} elevationData - Elevation profile data
     * @param {Object} center - Center coordinates
     * @param {number} radius - Analysis radius
     * @returns {Object} Radius-specific metrics
     */
    calculateRadiusMetrics(elevationData, center, radius) {
        if (elevationData.length < 2) {
            throw new Error('Insufficient elevation data for radius analysis');
        }
        
        // Calculate elevation statistics
        const elevations = elevationData.map(p => p.elevation);
        const minElevation = Math.min(...elevations);
        const maxElevation = Math.max(...elevations);
        const avgElevation = Math.round(elevations.reduce((a, b) => a + b, 0) / elevations.length);
        const elevationRange = maxElevation - minElevation;
        
        // Calculate gradients between points
        const gradients = [];
        const terrainVariability = [];
        
        elevationData.forEach(point => {
            // Find nearest neighbors
            const neighbors = elevationData
                .filter(p => p !== point)
                .map(p => ({
                    ...p,
                    distance: this.calculateDistance(point.lat, point.lon, p.lat, p.lon)
                }))
                .filter(p => p.distance < 0.5) // Within 0.5 miles
                .sort((a, b) => a.distance - b.distance)
                .slice(0, 4); // Take 4 nearest neighbors
            
            if (neighbors.length > 0) {
                const avgNeighborElevation = neighbors.reduce((sum, n) => sum + n.elevation, 0) / neighbors.length;
                const elevationDiff = Math.abs(point.elevation - avgNeighborElevation);
                terrainVariability.push(elevationDiff);
                
                neighbors.forEach(neighbor => {
                    if (neighbor.distance > 0) {
                        const grade = Math.abs(point.elevation - neighbor.elevation) / (neighbor.distance * 5280) * 100;
                        gradients.push(grade);
                    }
                });
            }
        });
        
        const maxGrade = gradients.length > 0 ? Math.max(...gradients) : 0;
        const avgGrade = gradients.length > 0 ? gradients.reduce((a, b) => a + b, 0) / gradients.length : 0;
        const avgVariability = terrainVariability.length > 0 ? 
            terrainVariability.reduce((a, b) => a + b, 0) / terrainVariability.length : 0;
        
        // Calculate terrain difficulty for the area
        const areaDifficultyScore = this.calculateAreaDifficultyScore({
            elevationRange,
            maxGrade,
            avgGrade,
            variability: avgVariability,
            radius
        });
        
        // Classify terrain zones within radius
        const terrainZones = this.classifyRadiusTerrainZones(elevationData, center);
        
        // Generate recommendations specific to radius exploration
        const recommendations = this.generateRadiusRecommendations(areaDifficultyScore, terrainZones, radius);
        
        return {
            elevationRange,
            minElevation,
            maxElevation,
            avgElevation,
            maxGrade: Math.round(maxGrade * 10) / 10,
            avgGrade: Math.round(avgGrade * 10) / 10,
            terrainVariability: Math.round(avgVariability),
            difficultyScore: areaDifficultyScore,
            terrainZones,
            classification: this.getTerrainClassification(areaDifficultyScore),
            recommendations,
            areaAnalysis: {
                suitableForGolfCart: maxGrade < 8 && elevationRange < 500,
                suitableForLSV: maxGrade < 15 && elevationRange < 1000,
                challengingAreas: gradients.filter(g => g > 10).length,
                flatAreas: gradients.filter(g => g < 3).length,
                coverageArea: Math.PI * radius * radius
            }
        };
    }
    
    /**
     * Calculate difficulty score for area analysis
     * @param {Object} metrics - Area metrics
     * @returns {number} Difficulty score (0-100)
     */
    calculateAreaDifficultyScore(metrics) {
        const { elevationRange, maxGrade, avgGrade, variability, radius } = metrics;
        
        // Weighted scoring factors for area analysis
        const elevationScore = Math.min(elevationRange / 1000 * 25, 25); // Max 25 points for 1000+ ft range
        const maxGradeScore = Math.min(maxGrade / 20 * 30, 30); // Max 30 points for 20%+ max grade
        const avgGradeScore = Math.min(avgGrade / 10 * 20, 20); // Max 20 points for 10%+ avg grade
        const variabilityScore = Math.min(variability / 100 * 15, 15); // Max 15 points for high variability
        const areaScore = Math.min(radius / 10 * 10, 10); // Max 10 points for large area
        
        return Math.round(elevationScore + maxGradeScore + avgGradeScore + variabilityScore + areaScore);
    }
    
    /**
     * Classify terrain zones within radius
     * @param {Array} elevationData - Elevation data points
     * @param {Object} center - Center coordinates
     * @returns {Object} Terrain zone classification
     */
    classifyRadiusTerrainZones(elevationData, center) {
        const zones = {
            flat: { count: 0, percentage: 0 },
            rolling: { count: 0, percentage: 0 },
            hilly: { count: 0, percentage: 0 },
            steep: { count: 0, percentage: 0 }
        };
        
        // Classify each point based on local gradient
        elevationData.forEach(point => {
            // Calculate local gradient (simplified)
            const nearbyPoints = elevationData
                .filter(p => this.calculateDistance(point.lat, point.lon, p.lat, p.lon) < 0.2)
                .filter(p => p !== point);
            
            if (nearbyPoints.length > 0) {
                const elevationDiffs = nearbyPoints.map(p => Math.abs(p.elevation - point.elevation));
                const maxLocalDiff = Math.max(...elevationDiffs);
                
                if (maxLocalDiff < 20) zones.flat.count++;
                else if (maxLocalDiff < 50) zones.rolling.count++;
                else if (maxLocalDiff < 100) zones.hilly.count++;
                else zones.steep.count++;
            }
        });
        
        // Calculate percentages
        const totalPoints = elevationData.length;
        Object.keys(zones).forEach(zone => {
            zones[zone].percentage = Math.round((zones[zone].count / totalPoints) * 100);
        });
        
        return zones;
    }
    
    /**
     * Find legal routes within radius based on terrain
     * @param {Object} center - Center coordinates
     * @param {number} radius - Search radius
     * @param {Array} elevationData - Elevation data
     * @returns {Array} Legal route suggestions
     */
    async findLegalRoutesInRadius(center, radius, elevationData) {
        const routes = [];
        
        // Find points with gentle grades suitable for GEM vehicles
        const suitablePoints = elevationData.filter(point => {
            // Calculate grade to center
            const distance = this.calculateDistance(center.lat, center.lon, point.lat, point.lon);
            if (distance === 0) return false;
            
            const elevationDiff = Math.abs(point.elevation - elevationData[0].elevation);
            const grade = (elevationDiff / (distance * 5280)) * 100;
            
            return grade < 8; // Suitable for golf carts/LSVs
        });
        
        // Generate route suggestions to interesting points
        const interestingPoints = suitablePoints
            .filter(p => p.distanceFromCenter > radius * 0.3) // Not too close to center
            .sort((a, b) => a.distanceFromCenter - b.distanceFromCenter)
            .slice(0, 8); // Top 8 destinations
        
        interestingPoints.forEach((point, index) => {
            routes.push({
                id: `route_${index + 1}`,
                destination: {
                    lat: point.lat,
                    lon: point.lon,
                    elevation: point.elevation
                },
                distance: Math.round(point.distanceFromCenter * 10) / 10,
                estimatedGrade: this.calculateEstimatedGrade(center, point),
                difficulty: 'easy',
                suitable: true,
                description: `${Math.round(point.distanceFromCenter)} mile route to elevation ${point.elevation}ft`
            });
        });
        
        return routes;
    }
    
    /**
     * Calculate estimated grade between two points
     * @param {Object} point1 - First point
     * @param {Object} point2 - Second point
     * @returns {number} Estimated grade percentage
     */
    calculateEstimatedGrade(point1, point2) {
        const distance = this.calculateDistance(point1.lat, point1.lon, point2.lat, point2.lon);
        if (distance === 0) return 0;
        
        const elevationDiff = Math.abs((point2.elevation || 0) - (point1.elevation || 0));
        return Math.round((elevationDiff / (distance * 5280)) * 100 * 10) / 10;
    }
    
    /**
     * Generate recommendations for radius exploration
     * @param {number} difficultyScore - Area difficulty score
     * @param {Object} terrainZones - Terrain zone classification
     * @param {number} radius - Exploration radius
     * @returns {Array} Recommendations
     */
    generateRadiusRecommendations(difficultyScore, terrainZones, radius) {
        const recommendations = [];
        
        if (terrainZones.flat.percentage > 60) {
            recommendations.push('Excellent area for recreational driving - mostly flat terrain');
            recommendations.push('Suitable for all GEM vehicle types including golf carts');
        }
        
        if (terrainZones.steep.percentage > 20) {
            recommendations.push('Steep areas detected - LSV recommended over golf cart');
            recommendations.push('Monitor battery levels when exploring hilly sections');
        }
        
        if (difficultyScore > 50) {
            recommendations.push('Challenging terrain in area - plan shorter routes');
            recommendations.push('Consider weather conditions before exploring steep areas');
        }
        
        if (radius > 8) {
            recommendations.push('Large exploration area - plan multiple shorter trips');
            recommendations.push('Identify charging opportunities for longer range needs');
        }
        
        // Add specific recommendations based on terrain zones
        if (terrainZones.rolling.percentage > 40) {
            recommendations.push('Rolling hills present - optimize regenerative braking settings');
        }
        
        if (terrainZones.hilly.percentage > 30) {
            recommendations.push('Significant hills detected - increase motor current for climbs');
            recommendations.push('Allow extra time for routes through hilly areas');
        }
        
        // General exploration recommendations
        recommendations.push('Use legal routing system to verify road access');
        recommendations.push('Check local regulations for vehicle type restrictions');
        
        return recommendations;
    }
    
    /**
     * Get fallback radius terrain data
     * @param {Object} coordinates - Center coordinates
     * @param {number} radius - Radius in miles
     * @returns {Object} Fallback radius data
     */
    getFallbackRadiusData(coordinates, radius) {
        // Generate estimated data based on radius size
        const estimatedVariability = radius * 10; // Larger radius = more variability
        const estimatedMaxGrade = Math.min(radius * 2, 15); // Larger radius = potentially steeper terrain
        
        return {
            elevationRange: estimatedVariability * 5,
            minElevation: 500,
            maxElevation: 500 + (estimatedVariability * 5),
            avgElevation: 500 + (estimatedVariability * 2.5),
            maxGrade: estimatedMaxGrade,
            avgGrade: estimatedMaxGrade * 0.4,
            terrainVariability: estimatedVariability,
            difficultyScore: Math.min(radius * 8, 80),
            terrainZones: {
                flat: { count: 20, percentage: 40 },
                rolling: { count: 20, percentage: 40 },
                hilly: { count: 8, percentage: 16 },
                steep: { count: 2, percentage: 4 }
            },
            classification: this.getTerrainClassification(Math.min(radius * 8, 80)),
            center: coordinates,
            radius: radius,
            type: 'radius_analysis',
            source: 'estimated',
            error: 'Terrain API unavailable - using estimates',
            recommendations: [
                'Terrain data unavailable - use conservative settings',
                'Verify local terrain conditions before departure',
                'Plan shorter routes until terrain is confirmed'
            ]
        };
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
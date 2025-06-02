/**
 * Traffic Service
 * Real-time traffic data integration to avoid congested areas
 */
class TrafficService {
    constructor() {
        this.apiManager = window.apiManager || new APIManager();
        this.providers = {
            googleTraffic: {
                name: 'Google Traffic',
                active: false,
                realtime: true
            },
            mapboxTraffic: {
                name: 'Mapbox Traffic',
                active: false,
                realtime: true
            },
            tomtom: {
                name: 'TomTom Traffic',
                endpoint: 'https://api.tomtom.com/traffic/services/4',
                active: false,
                realtime: true
            },
            here: {
                name: 'HERE Traffic',
                endpoint: 'https://traffic.ls.hereapi.com/traffic/6.3',
                active: false,
                realtime: true
            }
        };
        
        this.trafficLayers = new Map();
        this.activeIncidents = [];
        this.congestionZones = [];
        this.updateInterval = null;
        this.cache = new Map();
        
        this.initialize();
    }
    
    /**
     * Initialize traffic service
     */
    async initialize() {
        // Check which APIs are available
        if (this.apiManager.apis.googleMaps.isConfigured) {
            this.providers.googleTraffic.active = true;
        }
        if (this.apiManager.apis.mapbox.isConfigured) {
            this.providers.mapboxTraffic.active = true;
        }
        
        // Additional traffic API keys would be stored separately
        this.checkAdditionalAPIs();
        
        console.log('Traffic Service initialized with providers:', this.getActiveProviders());
    }
    
    /**
     * Get active traffic providers
     */
    getActiveProviders() {
        return Object.entries(this.providers)
            .filter(([_, provider]) => provider.active)
            .map(([name, _]) => name);
    }
    
    /**
     * Get real-time traffic conditions for area
     */
    async getTrafficConditions(bounds, options = {}) {
        const {
            includeIncidents = true,
            includeCongestion = true,
            includeConstruction = true,
            vehicleType = 'lsv'
        } = options;
        
        const trafficData = {
            timestamp: new Date(),
            bounds: bounds,
            conditions: [],
            incidents: [],
            congestionZones: [],
            construction: [],
            alternativeRoutes: []
        };
        
        // Try each provider
        if (this.providers.googleTraffic.active) {
            const googleData = await this.getGoogleTraffic(bounds);
            this.mergeTrafficData(trafficData, googleData);
        }
        
        if (this.providers.mapboxTraffic.active) {
            const mapboxData = await this.getMapboxTraffic(bounds);
            this.mergeTrafficData(trafficData, mapboxData);
        }
        
        // Fallback to historical patterns if no real-time data
        if (trafficData.conditions.length === 0) {
            const historicalData = this.getHistoricalTrafficPatterns(bounds);
            this.mergeTrafficData(trafficData, historicalData);
        }
        
        // Analyze traffic for GEM vehicle concerns
        trafficData.analysis = this.analyzeTrafficForGEM(trafficData, vehicleType);
        
        // Generate alternative routes
        if (trafficData.congestionZones.length > 0) {
            trafficData.alternativeRoutes = await this.generateAlternativeRoutes(
                bounds,
                trafficData.congestionZones,
                vehicleType
            );
        }
        
        return trafficData;
    }
    
    /**
     * Get Google Traffic data
     */
    async getGoogleTraffic(bounds) {
        if (!window.google || !window.google.maps) {
            return this.getEmptyTrafficData();
        }
        
        try {
            // Google Traffic Layer provides visual data
            // For programmatic access, we'd use the Distance Matrix API with traffic
            const trafficData = {
                conditions: [],
                incidents: [],
                congestionZones: []
            };
            
            // Sample traffic conditions using Distance Matrix
            const samplePoints = this.generateSamplePoints(bounds, 9);
            
            for (let i = 0; i < samplePoints.length - 1; i++) {
                const origin = samplePoints[i];
                const destination = samplePoints[i + 1];
                
                const duration = await this.getGoogleTravelTime(origin, destination, true);
                const durationNoTraffic = await this.getGoogleTravelTime(origin, destination, false);
                
                if (duration && durationNoTraffic) {
                    const congestionRatio = duration / durationNoTraffic;
                    
                    trafficData.conditions.push({
                        from: origin,
                        to: destination,
                        congestionLevel: this.calculateCongestionLevel(congestionRatio),
                        delayMinutes: Math.round((duration - durationNoTraffic) / 60),
                        provider: 'google'
                    });
                    
                    if (congestionRatio > 1.3) {
                        trafficData.congestionZones.push({
                            center: {
                                lat: (origin.lat + destination.lat) / 2,
                                lng: (origin.lng + destination.lng) / 2
                            },
                            radius: 0.5, // miles
                            severity: congestionRatio > 1.5 ? 'high' : 'medium'
                        });
                    }
                }
            }
            
            return trafficData;
            
        } catch (error) {
            console.warn('Google Traffic error:', error);
            return this.getEmptyTrafficData();
        }
    }
    
    /**
     * Get Google travel time with/without traffic
     */
    async getGoogleTravelTime(origin, destination, withTraffic) {
        return new Promise((resolve) => {
            if (!window.google || !window.google.maps) {
                resolve(null);
                return;
            }
            
            const service = new google.maps.DistanceMatrixService();
            const request = {
                origins: [origin],
                destinations: [destination],
                travelMode: google.maps.TravelMode.DRIVING,
                drivingOptions: withTraffic ? {
                    departureTime: new Date(),
                    trafficModel: google.maps.TrafficModel.BEST_GUESS
                } : undefined,
                unitSystem: google.maps.UnitSystem.IMPERIAL
            };
            
            service.getDistanceMatrix(request, (response, status) => {
                if (status === 'OK' && response.rows[0].elements[0].status === 'OK') {
                    resolve(response.rows[0].elements[0].duration.value);
                } else {
                    resolve(null);
                }
            });
        });
    }
    
    /**
     * Get Mapbox Traffic data
     */
    async getMapboxTraffic(bounds) {
        try {
            // Mapbox Traffic API would provide incident data
            const url = `https://api.mapbox.com/v4/mapbox.mapbox-traffic-v1/tilequery/${bounds.center.lng},${bounds.center.lat}.json?radius=5000&access_token=${this.apiManager.apis.mapbox.key}`;
            
            const response = await fetch(url);
            const data = await response.json();
            
            const trafficData = {
                conditions: [],
                incidents: [],
                congestionZones: []
            };
            
            if (data.features) {
                data.features.forEach(feature => {
                    if (feature.properties.congestion) {
                        const congestionLevel = feature.properties.congestion;
                        
                        trafficData.conditions.push({
                            location: {
                                lat: feature.geometry.coordinates[1],
                                lng: feature.geometry.coordinates[0]
                            },
                            congestionLevel: congestionLevel,
                            provider: 'mapbox'
                        });
                        
                        if (congestionLevel === 'heavy' || congestionLevel === 'severe') {
                            trafficData.congestionZones.push({
                                center: {
                                    lat: feature.geometry.coordinates[1],
                                    lng: feature.geometry.coordinates[0]
                                },
                                radius: 0.3,
                                severity: congestionLevel
                            });
                        }
                    }
                });
            }
            
            return trafficData;
            
        } catch (error) {
            console.warn('Mapbox Traffic error:', error);
            return this.getEmptyTrafficData();
        }
    }
    
    /**
     * Get historical traffic patterns (fallback)
     */
    getHistoricalTrafficPatterns(bounds) {
        const hour = new Date().getHours();
        const dayOfWeek = new Date().getDay();
        
        const trafficData = {
            conditions: [],
            incidents: [],
            congestionZones: []
        };
        
        // Rush hour patterns
        const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
        const isMorningRush = hour >= 7 && hour <= 9;
        const isEveningRush = hour >= 16 && hour <= 18;
        
        if (isWeekday && (isMorningRush || isEveningRush)) {
            // Generate typical congestion zones
            const mainRoads = this.identifyMainRoads(bounds);
            
            mainRoads.forEach(road => {
                trafficData.congestionZones.push({
                    center: road.center,
                    radius: 0.5,
                    severity: 'medium',
                    type: 'historical_pattern',
                    timeRange: isMorningRush ? '7:00 AM - 9:00 AM' : '4:00 PM - 6:00 PM'
                });
            });
            
            trafficData.conditions.push({
                area: 'general',
                congestionLevel: 'moderate',
                description: `Typical ${isMorningRush ? 'morning' : 'evening'} rush hour traffic`,
                provider: 'historical'
            });
        }
        
        // Weekend patterns
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            if (hour >= 10 && hour <= 14) {
                trafficData.conditions.push({
                    area: 'shopping_districts',
                    congestionLevel: 'light_to_moderate',
                    description: 'Weekend shopping traffic',
                    provider: 'historical'
                });
            }
        }
        
        return trafficData;
    }
    
    /**
     * Analyze traffic for GEM vehicles
     */
    analyzeTrafficForGEM(trafficData, vehicleType) {
        const analysis = {
            suitability: 'good',
            concerns: [],
            recommendations: [],
            avoidanceZones: []
        };
        
        // Check congestion zones
        trafficData.congestionZones.forEach(zone => {
            if (zone.severity === 'high' || zone.severity === 'severe') {
                analysis.concerns.push(`Heavy traffic near ${this.formatLocation(zone.center)}`);
                analysis.avoidanceZones.push(zone);
                
                // GEM vehicles in heavy traffic
                if (vehicleType === 'golf_cart') {
                    analysis.recommendations.push('Avoid heavy traffic areas - limited speed capability');
                } else if (vehicleType === 'lsv') {
                    analysis.recommendations.push('Use caution in heavy traffic - maintain safe following distance');
                }
            }
        });
        
        // Check for highway proximity
        const highwayProximity = this.checkHighwayProximity(trafficData.bounds);
        if (highwayProximity.near) {
            analysis.concerns.push('Close proximity to highway traffic');
            analysis.recommendations.push('Stay on designated low-speed roads');
        }
        
        // Overall suitability
        if (analysis.avoidanceZones.length > 3) {
            analysis.suitability = 'poor';
        } else if (analysis.avoidanceZones.length > 1) {
            analysis.suitability = 'moderate';
        }
        
        // Time-based recommendations
        const hour = new Date().getHours();
        if ((hour >= 7 && hour <= 9) || (hour >= 16 && hour <= 18)) {
            analysis.recommendations.push('Consider traveling outside rush hours for safer conditions');
        }
        
        return analysis;
    }
    
    /**
     * Generate alternative routes avoiding traffic
     */
    async generateAlternativeRoutes(bounds, congestionZones, vehicleType) {
        const alternatives = [];
        
        // Define waypoints that avoid congestion
        const avoidanceWaypoints = this.calculateAvoidanceWaypoints(bounds, congestionZones);
        
        // Generate up to 3 alternative routes
        for (let i = 0; i < Math.min(3, avoidanceWaypoints.length); i++) {
            const route = {
                id: `alt_route_${i + 1}`,
                waypoints: avoidanceWaypoints[i],
                avoidsCongestion: true,
                estimatedDelay: 0,
                suitability: this.assessRouteSuitability(avoidanceWaypoints[i], vehicleType)
            };
            
            alternatives.push(route);
        }
        
        // Add scenic route option if available
        const scenicRoute = this.findScenicAlternative(bounds);
        if (scenicRoute) {
            alternatives.push({
                id: 'scenic_route',
                ...scenicRoute,
                description: 'Scenic route with minimal traffic'
            });
        }
        
        return alternatives;
    }
    
    /**
     * Monitor traffic conditions with updates
     */
    startTrafficMonitoring(bounds, callback, intervalMinutes = 5) {
        // Clear existing monitoring
        this.stopTrafficMonitoring();
        
        // Initial check
        this.getTrafficConditions(bounds).then(callback);
        
        // Set up periodic updates
        this.updateInterval = setInterval(async () => {
            const conditions = await this.getTrafficConditions(bounds);
            
            // Check for significant changes
            const changes = this.detectTrafficChanges(conditions);
            if (changes.significant) {
                callback(conditions, changes);
            }
        }, intervalMinutes * 60 * 1000);
    }
    
    /**
     * Stop traffic monitoring
     */
    stopTrafficMonitoring() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }
    
    /**
     * Add traffic layer to map
     */
    addTrafficLayer(map, provider = 'google') {
        if (provider === 'google' && window.google && window.google.maps) {
            const trafficLayer = new google.maps.TrafficLayer();
            trafficLayer.setMap(map);
            this.trafficLayers.set('google', trafficLayer);
            return trafficLayer;
        }
        
        // Other providers would have their own implementation
        return null;
    }
    
    /**
     * Remove traffic layer from map
     */
    removeTrafficLayer(provider = 'google') {
        const layer = this.trafficLayers.get(provider);
        if (layer) {
            if (provider === 'google' && layer.setMap) {
                layer.setMap(null);
            }
            this.trafficLayers.delete(provider);
        }
    }
    
    /**
     * Utility functions
     */
    calculateCongestionLevel(ratio) {
        if (ratio < 1.1) return 'light';
        if (ratio < 1.3) return 'moderate';
        if (ratio < 1.5) return 'heavy';
        return 'severe';
    }
    
    generateSamplePoints(bounds, count) {
        const points = [];
        const latRange = bounds.northeast.lat - bounds.southwest.lat;
        const lngRange = bounds.northeast.lng - bounds.southwest.lng;
        
        const gridSize = Math.sqrt(count);
        
        for (let i = 0; i < gridSize; i++) {
            for (let j = 0; j < gridSize; j++) {
                points.push({
                    lat: bounds.southwest.lat + (i / (gridSize - 1)) * latRange,
                    lng: bounds.southwest.lng + (j / (gridSize - 1)) * lngRange
                });
            }
        }
        
        return points;
    }
    
    identifyMainRoads(bounds) {
        // Simplified main road identification
        // In production, this would use map data
        return [
            {
                name: 'Main Street',
                center: {
                    lat: (bounds.northeast.lat + bounds.southwest.lat) / 2,
                    lng: (bounds.northeast.lng + bounds.southwest.lng) / 2
                },
                type: 'arterial'
            }
        ];
    }
    
    checkHighwayProximity(bounds) {
        // Check if bounds are near highways
        // This would use actual map data in production
        return {
            near: false,
            highways: []
        };
    }
    
    formatLocation(location) {
        return `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`;
    }
    
    calculateAvoidanceWaypoints(bounds, congestionZones) {
        const waypoints = [];
        
        // Create grid of potential waypoints
        const gridPoints = this.generateSamplePoints(bounds, 16);
        
        // Filter out points in congestion zones
        const clearPoints = gridPoints.filter(point => {
            return !congestionZones.some(zone => {
                const distance = this.calculateDistance(point, zone.center);
                return distance <= zone.radius;
            });
        });
        
        // Group into potential routes
        if (clearPoints.length >= 3) {
            waypoints.push(clearPoints.slice(0, 3));
            if (clearPoints.length >= 6) {
                waypoints.push(clearPoints.slice(3, 6));
            }
        }
        
        return waypoints;
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
    
    assessRouteSuitability(waypoints, vehicleType) {
        // Simple suitability assessment
        const avgSpeed = vehicleType === 'golf_cart' ? 15 : 25;
        const distance = this.calculateRouteDistance(waypoints);
        const estimatedTime = (distance / avgSpeed) * 60; // minutes
        
        return {
            distance: distance,
            estimatedTime: estimatedTime,
            suitable: true,
            score: 0.8
        };
    }
    
    calculateRouteDistance(waypoints) {
        let distance = 0;
        for (let i = 1; i < waypoints.length; i++) {
            distance += this.calculateDistance(waypoints[i-1], waypoints[i]);
        }
        return distance;
    }
    
    findScenicAlternative(bounds) {
        // Look for parks or scenic areas
        // This would use POI data in production
        return {
            waypoints: [
                { lat: bounds.southwest.lat + 0.01, lng: bounds.southwest.lng + 0.01 },
                { lat: bounds.northeast.lat - 0.01, lng: bounds.northeast.lng - 0.01 }
            ],
            features: ['park_adjacent', 'low_traffic'],
            estimatedDelay: 5
        };
    }
    
    detectTrafficChanges(newConditions) {
        const changes = {
            significant: false,
            newIncidents: [],
            clearedIncidents: [],
            congestionChanges: []
        };
        
        // Compare with previous conditions
        if (this.previousConditions) {
            // Check for new incidents
            const prevIncidentIds = new Set(this.previousConditions.incidents.map(i => i.id));
            newConditions.incidents.forEach(incident => {
                if (!prevIncidentIds.has(incident.id)) {
                    changes.newIncidents.push(incident);
                    changes.significant = true;
                }
            });
            
            // Check for congestion changes
            const congestionDiff = Math.abs(
                newConditions.congestionZones.length - 
                this.previousConditions.congestionZones.length
            );
            
            if (congestionDiff > 2) {
                changes.significant = true;
                changes.congestionChanges.push(`Traffic congestion ${
                    newConditions.congestionZones.length > this.previousConditions.congestionZones.length ?
                    'increased' : 'decreased'
                }`);
            }
        }
        
        this.previousConditions = newConditions;
        return changes;
    }
    
    mergeTrafficData(target, source) {
        if (source.conditions) {
            target.conditions.push(...source.conditions);
        }
        if (source.incidents) {
            target.incidents.push(...source.incidents);
        }
        if (source.congestionZones) {
            target.congestionZones.push(...source.congestionZones);
        }
    }
    
    getEmptyTrafficData() {
        return {
            conditions: [],
            incidents: [],
            congestionZones: []
        };
    }
    
    checkAdditionalAPIs() {
        // Check for additional traffic API keys
        const tomtomKey = this.apiManager.secureStorage.getItem('api_tomtom');
        if (tomtomKey) {
            this.providers.tomtom.active = true;
            this.providers.tomtom.key = tomtomKey;
        }
        
        const hereKey = this.apiManager.secureStorage.getItem('api_here');
        if (hereKey) {
            this.providers.here.active = true;
            this.providers.here.key = hereKey;
        }
    }
}

// Create global instance
window.trafficService = new TrafficService();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TrafficService;
}
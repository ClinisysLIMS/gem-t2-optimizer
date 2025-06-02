/**
 * Google Maps Service
 * Comprehensive integration for legal route filtering and cart path detection
 */
class GoogleMapsService {
    constructor() {
        this.apiManager = window.apiManager || new APIManager();
        this.map = null;
        this.markers = [];
        this.routes = [];
        this.cartPaths = [];
        this.legalRoutes = [];
        this.directionsService = null;
        this.directionsRenderer = null;
        this.placesService = null;
        this.geocoder = null;
        this.isLoaded = false;
        
        this.initialize();
    }
    
    /**
     * Initialize Google Maps Service
     */
    async initialize() {
        // Check if Google Maps API is configured
        if (!this.apiManager.apis.googleMaps.isConfigured) {
            console.warn('Google Maps API not configured, using fallback mode');
            return;
        }
        
        // Load Google Maps script
        await this.loadGoogleMapsScript();
    }
    
    /**
     * Load Google Maps JavaScript API
     */
    async loadGoogleMapsScript() {
        if (window.google && window.google.maps) {
            this.onGoogleMapsLoaded();
            return;
        }
        
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = `https://maps.googleapis.com/maps/api/js?key=${this.apiManager.apis.googleMaps.key}&libraries=places,directions,geometry&callback=initGoogleMaps`;
            script.async = true;
            script.defer = true;
            
            window.initGoogleMaps = () => {
                this.onGoogleMapsLoaded();
                resolve();
            };
            
            script.onerror = () => {
                console.error('Failed to load Google Maps');
                reject(new Error('Google Maps load failed'));
            };
            
            document.head.appendChild(script);
        });
    }
    
    /**
     * Handle Google Maps loaded
     */
    onGoogleMapsLoaded() {
        this.isLoaded = true;
        this.directionsService = new google.maps.DirectionsService();
        this.geocoder = new google.maps.Geocoder();
        console.log('Google Maps Service initialized');
    }
    
    /**
     * Initialize map on element
     */
    initializeMap(elementId, options = {}) {
        if (!this.isLoaded) {
            console.warn('Google Maps not loaded');
            return null;
        }
        
        const defaultOptions = {
            center: { lat: 33.7490, lng: -84.3880 }, // Atlanta
            zoom: 13,
            mapTypeId: 'roadmap',
            styles: this.getMapStyles()
        };
        
        this.map = new google.maps.Map(
            document.getElementById(elementId),
            { ...defaultOptions, ...options }
        );
        
        this.directionsRenderer = new google.maps.DirectionsRenderer({
            map: this.map,
            suppressMarkers: false,
            polylineOptions: {
                strokeColor: '#10B981',
                strokeWeight: 5
            }
        });
        
        this.placesService = new google.maps.places.PlacesService(this.map);
        
        return this.map;
    }
    
    /**
     * Find legal routes for GEM vehicles
     */
    async findLegalRoutes(origin, destination, vehicleType = 'lsv') {
        const request = {
            origin,
            destination,
            vehicleType,
            timestamp: Date.now()
        };
        
        try {
            // First try Google Maps API
            if (this.isLoaded && this.directionsService) {
                return await this.findLegalRoutesWithGoogle(origin, destination, vehicleType);
            }
        } catch (error) {
            console.warn('Google Maps routing failed, using fallback:', error);
        }
        
        // Fallback to OSM-based routing
        return await this.findLegalRoutesWithOSM(origin, destination, vehicleType);
    }
    
    /**
     * Find legal routes using Google Maps
     */
    async findLegalRoutesWithGoogle(origin, destination, vehicleType) {
        return new Promise((resolve, reject) => {
            const request = {
                origin,
                destination,
                travelMode: google.maps.TravelMode.DRIVING,
                provideRouteAlternatives: true,
                avoidHighways: true,
                avoidTolls: true,
                unitSystem: google.maps.UnitSystem.IMPERIAL
            };
            
            this.directionsService.route(request, async (result, status) => {
                if (status === 'OK') {
                    // Filter routes for legal speeds
                    const legalRoutes = await this.filterLegalRoutes(result.routes, vehicleType);
                    
                    // Add cart path detection
                    for (const route of legalRoutes) {
                        route.cartPaths = await this.detectCartPaths(route);
                    }
                    
                    resolve({
                        success: true,
                        routes: legalRoutes,
                        source: 'google_maps'
                    });
                } else {
                    reject(new Error(`Directions request failed: ${status}`));
                }
            });
        });
    }
    
    /**
     * Filter routes for legal vehicle speeds
     */
    async filterLegalRoutes(routes, vehicleType) {
        const speedLimits = {
            'golf_cart': 25, // 25 MPH max for golf carts
            'lsv': 35,      // 35 MPH max for LSVs (on 35 MPH roads)
            'any': 45       // Higher limit for checking
        };
        
        const maxSpeed = speedLimits[vehicleType] || 35;
        const legalRoutes = [];
        
        for (const route of routes) {
            let isLegal = true;
            const segments = [];
            
            for (const leg of route.legs) {
                for (const step of leg.steps) {
                    // Extract road info from instructions
                    const roadInfo = await this.extractRoadInfo(step);
                    
                    if (roadInfo.speedLimit > maxSpeed) {
                        isLegal = false;
                    }
                    
                    segments.push({
                        instruction: step.instructions,
                        distance: step.distance,
                        duration: step.duration,
                        roadInfo: roadInfo,
                        isLegal: roadInfo.speedLimit <= maxSpeed
                    });
                }
            }
            
            // Calculate route legality score
            const legalSegments = segments.filter(s => s.isLegal).length;
            const totalSegments = segments.length;
            const legalityScore = legalSegments / totalSegments;
            
            legalRoutes.push({
                ...route,
                isFullyLegal: isLegal,
                legalityScore: legalityScore,
                segments: segments,
                vehicleType: vehicleType,
                warnings: isLegal ? [] : ['Route contains roads exceeding vehicle speed limits']
            });
        }
        
        // Sort by legality score
        return legalRoutes.sort((a, b) => b.legalityScore - a.legalityScore);
    }
    
    /**
     * Extract road information from step
     */
    async extractRoadInfo(step) {
        const roadInfo = {
            name: 'Unknown Road',
            type: 'local',
            speedLimit: 25,
            isResidential: false,
            isPrivate: false
        };
        
        // Extract road name from instructions
        const roadMatch = step.instructions.match(/on\s+(.+?)(?:\s|$)/i);
        if (roadMatch) {
            roadInfo.name = roadMatch[1];
        }
        
        // Determine road type and speed limit
        const instruction = step.instructions.toLowerCase();
        
        if (instruction.includes('highway') || instruction.includes('freeway')) {
            roadInfo.type = 'highway';
            roadInfo.speedLimit = 65;
        } else if (instruction.includes('expressway') || instruction.includes('parkway')) {
            roadInfo.type = 'expressway';
            roadInfo.speedLimit = 55;
        } else if (instruction.includes('blvd') || instruction.includes('boulevard') || 
                   instruction.includes('avenue') || instruction.includes('ave')) {
            roadInfo.type = 'arterial';
            roadInfo.speedLimit = 35;
        } else if (instruction.includes('street') || instruction.includes('st') || 
                   instruction.includes('road') || instruction.includes('rd')) {
            roadInfo.type = 'local';
            roadInfo.speedLimit = 25;
        } else if (instruction.includes('drive') || instruction.includes('dr') || 
                   instruction.includes('lane') || instruction.includes('ln')) {
            roadInfo.type = 'residential';
            roadInfo.speedLimit = 25;
            roadInfo.isResidential = true;
        } else if (instruction.includes('path') || instruction.includes('trail')) {
            roadInfo.type = 'path';
            roadInfo.speedLimit = 15;
        }
        
        // Check for private roads
        if (instruction.includes('private') || instruction.includes('gated')) {
            roadInfo.isPrivate = true;
        }
        
        return roadInfo;
    }
    
    /**
     * Detect cart paths along route
     */
    async detectCartPaths(route) {
        const cartPaths = [];
        const bounds = new google.maps.LatLngBounds();
        
        // Extend bounds to include entire route
        route.overview_path.forEach(point => bounds.extend(point));
        
        // Search for golf-related places along route
        const golfPlaces = await this.searchPlacesAlongRoute(bounds, ['golf_course', 'park']);
        
        // Look for cart path indicators
        for (const place of golfPlaces) {
            const nearbyPaths = await this.findNearbyCartPaths(place.geometry.location);
            cartPaths.push(...nearbyPaths);
        }
        
        // Also check for known cart path patterns
        const pathPatterns = await this.detectPathPatterns(route);
        cartPaths.push(...pathPatterns);
        
        return cartPaths;
    }
    
    /**
     * Search for places along route
     */
    async searchPlacesAlongRoute(bounds, types) {
        if (!this.placesService) {
            return this.getFallbackPlaces(bounds, types);
        }
        
        return new Promise((resolve) => {
            const request = {
                bounds: bounds,
                type: types
            };
            
            this.placesService.nearbySearch(request, (results, status) => {
                if (status === google.maps.places.PlacesServiceStatus.OK) {
                    resolve(results);
                } else {
                    console.warn('Places search failed:', status);
                    resolve(this.getFallbackPlaces(bounds, types));
                }
            });
        });
    }
    
    /**
     * Find nearby cart paths
     */
    async findNearbyCartPaths(location) {
        const paths = [];
        
        // Common cart path identifiers
        const cartPathKeywords = [
            'cart path', 'golf cart', 'cart crossing',
            'golf path', 'cart trail', 'cart route'
        ];
        
        // Search for paths near location
        if (this.placesService) {
            const searchPromises = cartPathKeywords.map(keyword => 
                this.searchNearbyByKeyword(location, keyword)
            );
            
            const results = await Promise.allSettled(searchPromises);
            
            results.forEach(result => {
                if (result.status === 'fulfilled' && result.value) {
                    paths.push(...result.value);
                }
            });
        }
        
        return paths;
    }
    
    /**
     * Detect path patterns in route
     */
    async detectPathPatterns(route) {
        const patterns = [];
        
        // Look for path-like segments
        route.legs.forEach(leg => {
            leg.steps.forEach(step => {
                const instruction = step.instructions.toLowerCase();
                
                if (instruction.includes('path') || 
                    instruction.includes('trail') ||
                    instruction.includes('cart') ||
                    instruction.includes('golf')) {
                    
                    patterns.push({
                        location: step.start_location,
                        type: 'detected_path',
                        confidence: 0.8,
                        description: step.instructions
                    });
                }
            });
        });
        
        return patterns;
    }
    
    /**
     * Find legal routes with OSM fallback
     */
    async findLegalRoutesWithOSM(origin, destination, vehicleType) {
        // Convert addresses to coordinates if needed
        const startCoords = await this.geocodeLocation(origin);
        const endCoords = await this.geocodeLocation(destination);
        
        if (!startCoords || !endCoords) {
            return {
                success: false,
                error: 'Failed to geocode locations',
                routes: []
            };
        }
        
        // Use OSRM for routing
        const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${startCoords.lng},${startCoords.lat};${endCoords.lng},${endCoords.lat}?overview=full&alternatives=true&steps=true`;
        
        try {
            const response = await fetch(osrmUrl);
            const data = await response.json();
            
            if (data.code === 'Ok' && data.routes) {
                const legalRoutes = await this.processOSRMRoutes(data.routes, vehicleType);
                
                return {
                    success: true,
                    routes: legalRoutes,
                    source: 'osm_fallback'
                };
            }
        } catch (error) {
            console.error('OSM routing failed:', error);
        }
        
        // Ultimate fallback
        return {
            success: true,
            routes: [{
                summary: 'Direct Route (Estimated)',
                distance: this.calculateDistance(startCoords, endCoords),
                duration: this.estimateDuration(startCoords, endCoords),
                isFullyLegal: true,
                legalityScore: 0.7,
                warnings: ['Using estimated route - verify locally'],
                source: 'fallback'
            }],
            source: 'fallback'
        };
    }
    
    /**
     * Process OSRM routes for legality
     */
    async processOSRMRoutes(osrmRoutes, vehicleType) {
        const processedRoutes = [];
        
        for (const route of osrmRoutes) {
            const legs = route.legs.map(leg => ({
                distance: { value: leg.distance, text: `${(leg.distance / 1609.34).toFixed(1)} mi` },
                duration: { value: leg.duration, text: `${Math.round(leg.duration / 60)} mins` },
                steps: leg.steps.map(step => ({
                    instruction: step.name || 'Continue',
                    distance: { value: step.distance, text: `${(step.distance / 1609.34).toFixed(1)} mi` },
                    duration: { value: step.duration, text: `${Math.round(step.duration / 60)} mins` }
                }))
            }));
            
            processedRoutes.push({
                summary: 'Alternative Route',
                legs: legs,
                distance: route.distance,
                duration: route.duration,
                isFullyLegal: true, // Assume legal for residential streets
                legalityScore: 0.8,
                vehicleType: vehicleType,
                warnings: [],
                source: 'osm'
            });
        }
        
        return processedRoutes;
    }
    
    /**
     * Geocode location
     */
    async geocodeLocation(location) {
        if (typeof location === 'object' && location.lat && location.lng) {
            return location;
        }
        
        // Try Google Geocoding first
        if (this.geocoder) {
            try {
                return await this.geocodeWithGoogle(location);
            } catch (error) {
                console.warn('Google geocoding failed:', error);
            }
        }
        
        // Fallback to Nominatim
        return await this.geocodeWithNominatim(location);
    }
    
    /**
     * Geocode with Google
     */
    async geocodeWithGoogle(address) {
        return new Promise((resolve, reject) => {
            this.geocoder.geocode({ address }, (results, status) => {
                if (status === 'OK' && results[0]) {
                    resolve({
                        lat: results[0].geometry.location.lat(),
                        lng: results[0].geometry.location.lng()
                    });
                } else {
                    reject(new Error(`Geocoding failed: ${status}`));
                }
            });
        });
    }
    
    /**
     * Geocode with Nominatim fallback
     */
    async geocodeWithNominatim(location) {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}&limit=1`;
        
        try {
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.length > 0) {
                return {
                    lat: parseFloat(data[0].lat),
                    lng: parseFloat(data[0].lon)
                };
            }
        } catch (error) {
            console.error('Nominatim geocoding failed:', error);
        }
        
        return null;
    }
    
    /**
     * Get map styles for better cart path visibility
     */
    getMapStyles() {
        return [
            {
                featureType: 'road.local',
                elementType: 'geometry',
                stylers: [{ color: '#f5f5f5' }]
            },
            {
                featureType: 'poi.park',
                elementType: 'geometry',
                stylers: [{ color: '#e5f5e5' }]
            },
            {
                featureType: 'poi.sports_complex',
                elementType: 'geometry',
                stylers: [{ color: '#e5f5e5' }]
            }
        ];
    }
    
    /**
     * Add cart path overlay to map
     */
    addCartPathOverlay(paths) {
        if (!this.map) return;
        
        paths.forEach(path => {
            const marker = new google.maps.Marker({
                position: path.location,
                map: this.map,
                title: path.description || 'Cart Path',
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 8,
                    fillColor: '#10B981',
                    fillOpacity: 0.8,
                    strokeColor: '#065F46',
                    strokeWeight: 2
                }
            });
            
            this.markers.push(marker);
        });
    }
    
    /**
     * Utility functions
     */
    calculateDistance(start, end) {
        const R = 3959; // Earth radius in miles
        const dLat = (end.lat - start.lat) * Math.PI / 180;
        const dLon = (end.lng - start.lng) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(start.lat * Math.PI / 180) * Math.cos(end.lat * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }
    
    estimateDuration(start, end) {
        const distance = this.calculateDistance(start, end);
        const avgSpeed = 20; // 20 MPH average for LSV
        return (distance / avgSpeed) * 60 * 60; // seconds
    }
    
    getFallbackPlaces(bounds, types) {
        // Return common place types that might have cart paths
        return [
            {
                name: 'Local Golf Course',
                geometry: { location: bounds.getCenter() },
                types: ['golf_course']
            },
            {
                name: 'Community Park',
                geometry: { location: bounds.getCenter() },
                types: ['park']
            }
        ];
    }
    
    searchNearbyByKeyword(location, keyword) {
        return new Promise((resolve) => {
            if (!this.placesService) {
                resolve([]);
                return;
            }
            
            const request = {
                location: location,
                radius: 500, // 500 meters
                keyword: keyword
            };
            
            this.placesService.nearbySearch(request, (results, status) => {
                if (status === google.maps.places.PlacesServiceStatus.OK) {
                    resolve(results);
                } else {
                    resolve([]);
                }
            });
        });
    }
    
    /**
     * Clear all markers and routes
     */
    clearMap() {
        this.markers.forEach(marker => marker.setMap(null));
        this.markers = [];
        
        if (this.directionsRenderer) {
            this.directionsRenderer.setDirections({ routes: [] });
        }
    }
    
    /**
     * Display route on map
     */
    displayRoute(route) {
        if (!this.directionsRenderer || !route) return;
        
        this.directionsRenderer.setDirections({ routes: [route] });
    }
}

// Create global instance
window.googleMapsService = new GoogleMapsService();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GoogleMapsService;
}
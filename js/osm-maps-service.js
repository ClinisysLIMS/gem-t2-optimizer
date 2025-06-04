/**
 * OpenStreetMap/Leaflet Service
 * Free alternative to Google Maps for legal route filtering and cart path detection
 */

class OSMMapService {
    constructor() {
        this.map = null;
        this.markers = [];
        this.routes = [];
        this.cartPaths = [];
        this.isLoaded = false;
        this.leaflet = null;
        
        this.initialize();
    }
    
    /**
     * Initialize OSM service
     */
    async initialize() {
        await this.loadLeafletLibrary();
    }
    
    /**
     * Load Leaflet library
     */
    async loadLeafletLibrary() {
        if (window.L) {
            this.onLeafletLoaded();
            return;
        }
        
        return new Promise((resolve, reject) => {
            // Load Leaflet CSS
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
            link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
            link.crossOrigin = '';
            document.head.appendChild(link);
            
            // Load Leaflet JS
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
            script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
            script.crossOrigin = '';
            script.async = true;
            
            script.onload = () => {
                this.onLeafletLoaded();
                resolve();
            };
            
            script.onerror = () => {
                console.error('Failed to load Leaflet');
                reject(new Error('Leaflet load failed'));
            };
            
            document.head.appendChild(script);
        });
    }
    
    /**
     * Handle Leaflet loaded
     */
    onLeafletLoaded() {
        this.leaflet = window.L;
        this.isLoaded = true;
        console.log('OpenStreetMap/Leaflet service initialized');
    }
    
    /**
     * Initialize map on element
     */
    initializeMap(elementId, options = {}) {
        if (!this.isLoaded) {
            console.warn('Leaflet not loaded');
            return null;
        }
        
        const defaultOptions = {
            center: [33.7490, -84.3880], // Atlanta
            zoom: 13,
            zoomControl: true,
            attributionControl: true
        };
        
        // Create map
        this.map = this.leaflet.map(elementId, { ...defaultOptions, ...options });
        
        // Add OpenStreetMap tile layer
        this.leaflet.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19
        }).addTo(this.map);
        
        // Add cart path overlay from OpenStreetMap data
        this.addCartPathLayer();
        
        return this.map;
    }
    
    /**
     * Find legal routes for GEM vehicles
     */
    async findLegalRoutes(origin, destination, vehicleType = 'lsv') {
        try {
            // Convert addresses to coordinates
            const startCoords = await this.geocodeLocation(origin);
            const endCoords = await this.geocodeLocation(destination);
            
            if (!startCoords || !endCoords) {
                throw new Error('Failed to geocode locations');
            }
            
            // Get routes from OSRM
            const routes = await this.getOSRMRoutes(startCoords, endCoords, vehicleType);
            
            // Filter for legal speeds
            const legalRoutes = await this.filterLegalRoutes(routes, vehicleType);
            
            // Add cart path detection
            for (const route of legalRoutes) {
                route.cartPaths = await this.detectCartPaths(route);
            }
            
            return {
                success: true,
                routes: legalRoutes,
                source: 'openstreetmap'
            };
            
        } catch (error) {
            console.error('OSM routing failed:', error);
            return {
                success: false,
                error: error.message,
                routes: []
            };
        }
    }
    
    /**
     * Get routes from OSRM (Open Source Routing Machine)
     */
    async getOSRMRoutes(start, end, vehicleType) {
        // OSRM free public server
        const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&alternatives=true&steps=true&annotations=true`;
        
        const response = await fetch(osrmUrl);
        const data = await response.json();
        
        if (data.code !== 'Ok') {
            throw new Error('OSRM routing failed');
        }
        
        return data.routes.map(route => this.convertOSRMRoute(route, vehicleType));
    }
    
    /**
     * Convert OSRM route to our format
     */
    convertOSRMRoute(osrmRoute, vehicleType) {
        const route = {
            summary: 'Route via ' + (osrmRoute.legs[0].summary || 'local roads'),
            distance: osrmRoute.distance,
            duration: osrmRoute.duration,
            vehicleType: vehicleType,
            geometry: osrmRoute.geometry,
            legs: []
        };
        
        // Convert legs
        for (const leg of osrmRoute.legs) {
            const convertedLeg = {
                distance: { 
                    value: leg.distance, 
                    text: `${(leg.distance / 1609.34).toFixed(1)} mi` 
                },
                duration: { 
                    value: leg.duration, 
                    text: `${Math.round(leg.duration / 60)} mins` 
                },
                steps: []
            };
            
            // Convert steps
            for (const step of leg.steps) {
                const roadInfo = this.extractRoadInfoFromOSM(step);
                
                convertedLeg.steps.push({
                    instruction: this.formatInstruction(step),
                    distance: { 
                        value: step.distance, 
                        text: `${(step.distance / 1609.34).toFixed(2)} mi` 
                    },
                    duration: { 
                        value: step.duration, 
                        text: `${Math.round(step.duration / 60)} mins` 
                    },
                    roadInfo: roadInfo,
                    geometry: step.geometry
                });
            }
            
            route.legs.push(convertedLeg);
        }
        
        return route;
    }
    
    /**
     * Extract road information from OSM step
     */
    extractRoadInfoFromOSM(step) {
        const roadInfo = {
            name: step.name || 'Unnamed Road',
            type: 'local',
            speedLimit: 25,
            isResidential: false,
            isPrivate: false,
            ref: step.ref || null
        };
        
        // Use OSM road classification
        const name = (step.name || '').toLowerCase();
        const ref = (step.ref || '').toLowerCase();
        
        // Check for highway types
        if (ref.includes('i-') || ref.includes('us-') || name.includes('interstate')) {
            roadInfo.type = 'highway';
            roadInfo.speedLimit = 65;
        } else if (ref.includes('sr-') || ref.includes('state route')) {
            roadInfo.type = 'state_route';
            roadInfo.speedLimit = 55;
        } else if (name.includes('boulevard') || name.includes('blvd') || 
                   name.includes('avenue') || name.includes('ave')) {
            roadInfo.type = 'arterial';
            roadInfo.speedLimit = 35;
        } else if (name.includes('street') || name.includes('st') || 
                   name.includes('road') || name.includes('rd')) {
            roadInfo.type = 'local';
            roadInfo.speedLimit = 25;
        } else if (name.includes('drive') || name.includes('dr') || 
                   name.includes('lane') || name.includes('ln') ||
                   name.includes('court') || name.includes('ct')) {
            roadInfo.type = 'residential';
            roadInfo.speedLimit = 25;
            roadInfo.isResidential = true;
        } else if (name.includes('path') || name.includes('trail') || 
                   name.includes('cart')) {
            roadInfo.type = 'path';
            roadInfo.speedLimit = 15;
        }
        
        // Check for private roads
        if (name.includes('private') || name.includes('gated')) {
            roadInfo.isPrivate = true;
        }
        
        return roadInfo;
    }
    
    /**
     * Format instruction from OSRM step
     */
    formatInstruction(step) {
        const maneuver = step.maneuver;
        let instruction = '';
        
        switch (maneuver.type) {
            case 'depart':
                instruction = `Head ${maneuver.modifier || 'straight'} on ${step.name || 'the road'}`;
                break;
            case 'turn':
                instruction = `Turn ${maneuver.modifier} onto ${step.name || 'the road'}`;
                break;
            case 'continue':
                instruction = `Continue on ${step.name || 'the road'}`;
                break;
            case 'arrive':
                instruction = 'Arrive at your destination';
                break;
            default:
                instruction = `${maneuver.type} on ${step.name || 'the road'}`;
        }
        
        return instruction;
    }
    
    /**
     * Filter routes for legal vehicle speeds
     */
    async filterLegalRoutes(routes, vehicleType) {
        const speedLimits = {
            'golf_cart': 25,
            'lsv': 35,
            'nev': 35,
            'any': 45
        };
        
        const maxSpeed = speedLimits[vehicleType] || 35;
        
        return routes.map(route => {
            let totalDistance = 0;
            let legalDistance = 0;
            let warnings = [];
            
            for (const leg of route.legs) {
                for (const step of leg.steps) {
                    const stepDistance = step.distance.value;
                    totalDistance += stepDistance;
                    
                    if (step.roadInfo.speedLimit <= maxSpeed) {
                        legalDistance += stepDistance;
                        step.isLegal = true;
                    } else {
                        step.isLegal = false;
                        if (!warnings.includes(step.roadInfo.name)) {
                            warnings.push(`${step.roadInfo.name} (${step.roadInfo.speedLimit} MPH limit)`);
                        }
                    }
                }
            }
            
            const legalityScore = totalDistance > 0 ? legalDistance / totalDistance : 0;
            
            return {
                ...route,
                isFullyLegal: legalityScore === 1,
                legalityScore: legalityScore,
                warnings: warnings.length > 0 ? 
                    [`Route includes roads exceeding ${maxSpeed} MPH: ${warnings.join(', ')}`] : 
                    []
            };
        });
    }
    
    /**
     * Detect cart paths along route
     */
    async detectCartPaths(route) {
        const cartPaths = [];
        
        // Query Overpass API for golf cart paths near route
        if (route.geometry) {
            const bounds = this.getRouteBounds(route);
            const overpassQuery = this.buildOverpassQuery(bounds);
            
            try {
                const response = await fetch('https://overpass-api.de/api/interpreter', {
                    method: 'POST',
                    body: overpassQuery
                });
                
                const data = await response.json();
                
                // Process cart paths from OSM data
                for (const element of data.elements) {
                    if (element.type === 'way' && element.tags) {
                        cartPaths.push({
                            id: element.id,
                            name: element.tags.name || 'Golf Cart Path',
                            type: 'cart_path',
                            coordinates: element.geometry ? 
                                element.geometry.map(coord => [coord.lat, coord.lon]) : 
                                []
                        });
                    }
                }
            } catch (error) {
                console.warn('Failed to fetch cart paths from Overpass:', error);
            }
        }
        
        // Also check for path indicators in route steps
        for (const leg of route.legs) {
            for (const step of leg.steps) {
                if (step.roadInfo.type === 'path' || 
                    step.instruction.toLowerCase().includes('cart') ||
                    step.instruction.toLowerCase().includes('path')) {
                    cartPaths.push({
                        name: step.roadInfo.name,
                        type: 'detected_path',
                        instruction: step.instruction
                    });
                }
            }
        }
        
        return cartPaths;
    }
    
    /**
     * Build Overpass query for cart paths
     */
    buildOverpassQuery(bounds) {
        const bbox = `${bounds.south},${bounds.west},${bounds.north},${bounds.east}`;
        
        return `
            [out:json];
            (
                way["highway"="path"]["golf_cart"="yes"](${bbox});
                way["highway"="service"]["service"="golf_cart"](${bbox});
                way["golf"="cart_path"](${bbox});
                way["highway"="track"]["access"="golf_cart"](${bbox});
            );
            out geom;
        `;
    }
    
    /**
     * Get bounds from route geometry
     */
    getRouteBounds(route) {
        // Decode polyline if needed
        const coordinates = this.decodePolyline(route.geometry);
        
        let north = -90, south = 90, east = -180, west = 180;
        
        for (const coord of coordinates) {
            north = Math.max(north, coord[0]);
            south = Math.min(south, coord[0]);
            east = Math.max(east, coord[1]);
            west = Math.min(west, coord[1]);
        }
        
        // Add padding
        const padding = 0.01; // ~1km
        return {
            north: north + padding,
            south: south - padding,
            east: east + padding,
            west: west - padding
        };
    }
    
    /**
     * Decode polyline from OSRM
     */
    decodePolyline(encoded) {
        // OSRM uses polyline encoding
        const coordinates = [];
        let index = 0, lat = 0, lng = 0;
        
        while (index < encoded.length) {
            let shift = 0, result = 0, byte;
            
            do {
                byte = encoded.charCodeAt(index++) - 63;
                result |= (byte & 0x1f) << shift;
                shift += 5;
            } while (byte >= 0x20);
            
            const deltaLat = ((result & 1) ? ~(result >> 1) : (result >> 1));
            lat += deltaLat;
            
            shift = 0;
            result = 0;
            
            do {
                byte = encoded.charCodeAt(index++) - 63;
                result |= (byte & 0x1f) << shift;
                shift += 5;
            } while (byte >= 0x20);
            
            const deltaLng = ((result & 1) ? ~(result >> 1) : (result >> 1));
            lng += deltaLng;
            
            coordinates.push([lat / 1e5, lng / 1e5]);
        }
        
        return coordinates;
    }
    
    /**
     * Geocode location using Nominatim
     */
    async geocodeLocation(location) {
        if (typeof location === 'object' && location.lat && location.lng) {
            return location;
        }
        
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}&limit=1`;
        
        try {
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'GEM-T2-Optimizer'
                }
            });
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
     * Add cart path layer to map
     */
    addCartPathLayer() {
        if (!this.map) return;
        
        // Custom style for cart paths
        const cartPathStyle = {
            color: '#10B981',
            weight: 3,
            opacity: 0.8,
            dashArray: '5, 10'
        };
        
        // You can add a custom layer for cart paths here
        // This would typically load from a GeoJSON source
    }
    
    /**
     * Display route on map
     */
    displayRoute(route) {
        if (!this.map || !route.geometry) return;
        
        // Clear existing routes
        this.clearRoutes();
        
        // Decode and display route
        const coordinates = this.decodePolyline(route.geometry);
        const latLngs = coordinates.map(coord => [coord[0], coord[1]]);
        
        // Create polyline
        const routeLine = this.leaflet.polyline(latLngs, {
            color: route.isFullyLegal ? '#10B981' : '#EF4444',
            weight: 5,
            opacity: 0.8
        }).addTo(this.map);
        
        this.routes.push(routeLine);
        
        // Fit map to route
        this.map.fitBounds(routeLine.getBounds(), { padding: [50, 50] });
        
        // Add markers for start and end
        if (latLngs.length > 0) {
            // Start marker
            const startMarker = this.leaflet.marker(latLngs[0], {
                icon: this.createCustomIcon('start')
            }).addTo(this.map);
            startMarker.bindPopup('Start');
            this.markers.push(startMarker);
            
            // End marker
            const endMarker = this.leaflet.marker(latLngs[latLngs.length - 1], {
                icon: this.createCustomIcon('end')
            }).addTo(this.map);
            endMarker.bindPopup('Destination');
            this.markers.push(endMarker);
        }
        
        // Add cart path markers
        if (route.cartPaths && route.cartPaths.length > 0) {
            this.displayCartPaths(route.cartPaths);
        }
    }
    
    /**
     * Create custom icon
     */
    createCustomIcon(type) {
        const colors = {
            start: '#10B981',
            end: '#EF4444',
            cart_path: '#3B82F6'
        };
        
        return this.leaflet.divIcon({
            className: 'custom-div-icon',
            html: `<div style="background-color:${colors[type] || '#6B7280'};width:24px;height:24px;border-radius:50%;border:2px solid white;"></div>`,
            iconSize: [24, 24],
            iconAnchor: [12, 12]
        });
    }
    
    /**
     * Display cart paths on map
     */
    displayCartPaths(cartPaths) {
        cartPaths.forEach(path => {
            if (path.coordinates && path.coordinates.length > 0) {
                // Display as polyline
                const pathLine = this.leaflet.polyline(path.coordinates, {
                    color: '#10B981',
                    weight: 3,
                    opacity: 0.8,
                    dashArray: '5, 10'
                }).addTo(this.map);
                
                pathLine.bindPopup(path.name || 'Golf Cart Path');
                this.cartPaths.push(pathLine);
            }
        });
    }
    
    /**
     * Clear all routes from map
     */
    clearRoutes() {
        this.routes.forEach(route => this.map.removeLayer(route));
        this.routes = [];
    }
    
    /**
     * Clear all markers from map
     */
    clearMarkers() {
        this.markers.forEach(marker => this.map.removeLayer(marker));
        this.markers = [];
    }
    
    /**
     * Clear all cart paths from map
     */
    clearCartPaths() {
        this.cartPaths.forEach(path => this.map.removeLayer(path));
        this.cartPaths = [];
    }
    
    /**
     * Clear entire map
     */
    clearMap() {
        this.clearRoutes();
        this.clearMarkers();
        this.clearCartPaths();
    }
}

// Create global instance
window.osmMapService = new OSMMapService();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OSMMapService;
}
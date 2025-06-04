/**
 * Legal Routing System for GEM Vehicles
 * Provides route filtering based on vehicle classification and road legality
 */
class LegalRoutingSystem {
    constructor() {
        this.map = null;
        this.vehicleClassification = null;
        this.currentRoute = null;
        this.routeLayers = {
            legal: null,
            caution: null,
            illegal: null,
            cartPaths: null,
            lsvLanes: null
        };
        
        // Road type classifications
        this.roadTypes = {
            highway: {
                names: ['Interstate', 'I-', 'US-', 'Highway', 'Hwy', 'Freeway', 'Expressway'],
                speedLimit: 55,
                golfCartLegal: false,
                lsvLegal: false,
                color: '#dc2626' // Red
            },
            arterial: {
                names: ['Blvd', 'Boulevard', 'Ave', 'Avenue', 'Pkwy', 'Parkway'],
                speedLimit: 45,
                golfCartLegal: false,
                lsvLegal: false,
                color: '#f59e0b' // Orange
            },
            collector: {
                names: ['St', 'Street', 'Rd', 'Road', 'Dr', 'Drive'],
                speedLimit: 35,
                golfCartLegal: false,
                lsvLegal: true,
                color: '#eab308' // Yellow
            },
            local: {
                names: ['Ln', 'Lane', 'Ct', 'Court', 'Pl', 'Place', 'Cir', 'Circle'],
                speedLimit: 25,
                golfCartLegal: true,
                lsvLegal: true,
                color: '#22c55e' // Green
            },
            cartPath: {
                names: ['Cart Path', 'Golf Path', 'Trail', 'Greenway'],
                speedLimit: 15,
                golfCartLegal: true,
                lsvLegal: true,
                color: '#3b82f6' // Blue
            },
            private: {
                names: ['Private', 'Community', 'Resort', 'Campus'],
                speedLimit: 15,
                golfCartLegal: true,
                lsvLegal: true,
                color: '#8b5cf6' // Purple
            }
        };
        
        // Classification thresholds
        this.classifications = {
            'golf-cart': {
                name: 'Golf Cart',
                maxSpeed: 19,
                legalRoads: ['local', 'cartPath', 'private'],
                maxRoadSpeed: 25,
                requirements: 'Private roads, cart paths, and local streets only',
                icon: '⛳'
            },
            'lsv': {
                name: 'Low Speed Vehicle',
                minSpeed: 20,
                maxSpeed: 25,
                legalRoads: ['local', 'collector', 'cartPath', 'private'],
                maxRoadSpeed: 35,
                requirements: 'Roads with speed limits ≤35 MPH',
                icon: '🚗'
            },
            'nev': {
                name: 'Neighborhood Electric Vehicle',
                minSpeed: 20,
                maxSpeed: 25,
                legalRoads: ['local', 'collector', 'cartPath', 'private'],
                maxRoadSpeed: 35,
                requirements: 'Same as LSV with state-specific regulations',
                icon: '🏘️'
            }
        };
        
        // Map styles for different road types
        this.mapStyles = {
            legal: {
                color: '#22c55e',
                weight: 4,
                opacity: 0.8,
                dashArray: null
            },
            caution: {
                color: '#eab308',
                weight: 3,
                opacity: 0.7,
                dashArray: '10, 5'
            },
            illegal: {
                color: '#dc2626',
                weight: 2,
                opacity: 0.5,
                dashArray: '5, 10'
            },
            cartPath: {
                color: '#3b82f6',
                weight: 3,
                opacity: 0.9,
                dashArray: '2, 4'
            },
            lsvLane: {
                color: '#8b5cf6',
                weight: 3,
                opacity: 0.8,
                dashArray: '8, 4'
            }
        };
    }

    /**
     * Initialize the routing system
     * @param {Object} vehicleData - Vehicle information including speed
     * @param {Object} mapContainer - DOM element for map
     */
    async init(vehicleData, mapContainer) {
        // Classify vehicle
        this.vehicleClassification = this.classifyVehicle(vehicleData.currentSpeed || 25);
        
        // Initialize map if container provided
        if (mapContainer) {
            await this.initializeMap(mapContainer);
        }
        
        return this.vehicleClassification;
    }

    /**
     * Classify vehicle based on speed
     * @param {number} speed - Vehicle top speed in MPH
     * @returns {Object} Classification details
     */
    classifyVehicle(speed) {
        if (speed < 20) {
            return {
                type: 'golf-cart',
                ...this.classifications['golf-cart'],
                actualSpeed: speed,
                warnings: speed < 15 ? ['Speed below typical golf cart minimum'] : []
            };
        } else if (speed >= 20 && speed <= 25) {
            return {
                type: 'lsv',
                ...this.classifications['lsv'],
                actualSpeed: speed,
                warnings: []
            };
        } else {
            return {
                type: 'modified',
                name: 'Modified Vehicle',
                actualSpeed: speed,
                maxRoadSpeed: 35,
                legalRoads: [],
                requirements: 'May not be street legal - check local laws',
                icon: '⚠️',
                warnings: ['Speed exceeds LSV maximum of 25 MPH']
            };
        }
    }

    /**
     * Initialize map using unified maps service
     * @param {Object} container - DOM element for map
     */
    async initializeMap(container) {
        // Use unified maps service if available
        if (window.unifiedMapsService) {
            this.mapsService = window.unifiedMapsService;
            this.map = await this.mapsService.initializeMap(container.id || 'route-map', {
                center: [32.7157, -117.1611],
                zoom: 13
            });
            
            // The unified service handles map initialization
            // We just need to handle our custom overlays
            if (this.mapsService.getCurrentService() === 'osm') {
                // For OSM/Leaflet, add our custom layers
                this.routeLayers.legal = L.layerGroup().addTo(this.map);
                this.routeLayers.caution = L.layerGroup().addTo(this.map);
                this.routeLayers.illegal = L.layerGroup().addTo(this.map);
                this.routeLayers.cartPaths = L.layerGroup().addTo(this.map);
                this.routeLayers.lsvLanes = L.layerGroup().addTo(this.map);

                // Add layer control
                const overlays = {
                    "Legal Routes": this.routeLayers.legal,
                    "Caution Routes": this.routeLayers.caution,
                    "Illegal Routes": this.routeLayers.illegal,
                    "Cart Paths": this.routeLayers.cartPaths,
                    "LSV Lanes": this.routeLayers.lsvLanes
                };
                L.control.layers(null, overlays).addTo(this.map);
            }
        } else {
            // Fallback to direct Leaflet initialization
            // Load Leaflet if not already loaded
            if (typeof L === 'undefined') {
                await this.loadLeaflet();
            }

            // Create map centered on San Diego
            this.map = L.map(container).setView([32.7157, -117.1611], 13);

            // Add OpenStreetMap tiles
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
                maxZoom: 19
            }).addTo(this.map);

            // Initialize route layers
            this.routeLayers.legal = L.layerGroup().addTo(this.map);
            this.routeLayers.caution = L.layerGroup().addTo(this.map);
            this.routeLayers.illegal = L.layerGroup().addTo(this.map);
            this.routeLayers.cartPaths = L.layerGroup().addTo(this.map);
            this.routeLayers.lsvLanes = L.layerGroup().addTo(this.map);

            // Add layer control
            const overlays = {
                "Legal Routes": this.routeLayers.legal,
                "Caution Routes": this.routeLayers.caution,
                "Illegal Routes": this.routeLayers.illegal,
                "Cart Paths": this.routeLayers.cartPaths,
                "LSV Lanes": this.routeLayers.lsvLanes
            };
            L.control.layers(null, overlays).addTo(this.map);
        }

        // Add legend
        this.addMapLegend();
    }

    /**
     * Load Leaflet library dynamically
     */
    async loadLeaflet() {
        return new Promise((resolve, reject) => {
            // Add CSS
            const css = document.createElement('link');
            css.rel = 'stylesheet';
            css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
            document.head.appendChild(css);

            // Add JS
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    /**
     * Add legend to map
     */
    addMapLegend() {
        const legend = L.control({ position: 'bottomright' });

        legend.onAdd = () => {
            const div = L.DomUtil.create('div', 'map-legend');
            div.style.backgroundColor = 'white';
            div.style.padding = '10px';
            div.style.borderRadius = '5px';
            div.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';

            div.innerHTML = `
                <h4 style="margin: 0 0 5px 0; font-size: 14px;">Road Types</h4>
                <div style="font-size: 12px;">
                    <div><span style="color: #22c55e;">━━</span> Legal (≤${this.vehicleClassification.maxRoadSpeed} MPH)</div>
                    <div><span style="color: #eab308;">┅┅</span> Caution (Check local laws)</div>
                    <div><span style="color: #dc2626;">┅┅</span> Illegal (Too fast)</div>
                    <div><span style="color: #3b82f6;">••</span> Cart Paths</div>
                    <div><span style="color: #8b5cf6;">━━</span> LSV Lanes</div>
                </div>
            `;

            return div;
        };

        legend.addTo(this.map);
    }

    /**
     * Check if a road is legal for the vehicle
     * @param {Object} road - Road information
     * @returns {Object} Legality status and details
     */
    checkRoadLegality(road) {
        const roadType = this.identifyRoadType(road);
        const speedLimit = road.maxspeed || roadType.speedLimit;
        
        const isLegal = this.vehicleClassification.legalRoads.includes(roadType.type) &&
                       speedLimit <= this.vehicleClassification.maxRoadSpeed;
        
        let status, color, message;
        
        if (isLegal) {
            status = 'legal';
            color = this.mapStyles.legal.color;
            message = `✅ Legal: ${speedLimit} MPH road`;
        } else if (speedLimit <= this.vehicleClassification.maxRoadSpeed + 10) {
            status = 'caution';
            color = this.mapStyles.caution.color;
            message = `⚠️ Caution: ${speedLimit} MPH - Check local regulations`;
        } else {
            status = 'illegal';
            color = this.mapStyles.illegal.color;
            message = `❌ Illegal: ${speedLimit} MPH exceeds vehicle limits`;
        }

        return {
            status,
            color,
            message,
            speedLimit,
            roadType: roadType.type,
            isCartPath: roadType.type === 'cartPath',
            isLSVLane: road.tags?.['golf_cart'] === 'yes' || road.tags?.['lsv'] === 'yes'
        };
    }

    /**
     * Identify road type based on name and tags
     * @param {Object} road - Road data
     * @returns {Object} Road type information
     */
    identifyRoadType(road) {
        const name = road.name || '';
        const highway = road.highway || road.tags?.highway || '';
        
        // Check highway tags first
        if (highway.includes('motorway') || highway.includes('trunk')) {
            return { type: 'highway', ...this.roadTypes.highway };
        }
        
        if (highway.includes('primary') || highway.includes('secondary')) {
            return { type: 'arterial', ...this.roadTypes.arterial };
        }
        
        if (highway.includes('tertiary') || highway.includes('unclassified')) {
            return { type: 'collector', ...this.roadTypes.collector };
        }
        
        if (highway.includes('residential') || highway.includes('living_street')) {
            return { type: 'local', ...this.roadTypes.local };
        }
        
        if (highway.includes('path') || highway.includes('track')) {
            return { type: 'cartPath', ...this.roadTypes.cartPath };
        }
        
        // Check road name patterns
        for (const [type, info] of Object.entries(this.roadTypes)) {
            if (info.names.some(pattern => name.includes(pattern))) {
                return { type, ...info };
            }
        }
        
        // Default to local road
        return { type: 'local', ...this.roadTypes.local };
    }

    /**
     * Plan a legal route between two points
     * @param {Object} start - Start coordinates {lat, lon}
     * @param {Object} end - End coordinates {lat, lon}
     * @returns {Object} Route with legality information
     */
    async planLegalRoute(start, end) {
        try {
            // Use unified maps service if available
            if (window.unifiedMapsService) {
                // Convert coordinates to format expected by unified service
                const origin = { lat: start.lat, lng: start.lon };
                const destination = { lat: end.lat, lng: end.lon };
                
                // Get legal routes using unified service
                const result = await window.unifiedMapsService.findLegalRoutes(
                    origin, 
                    destination, 
                    this.vehicleClassification.type
                );
                
                if (result.success && result.routes.length > 0) {
                    // Use the first (best) route
                    const route = result.routes[0];
                    const segments = this.analyzeUnifiedRouteSegments(route);
                    
                    // Check if route is legal
                    const illegalSegments = segments.filter(s => s.legality.status === 'illegal');
                    const cautionSegments = segments.filter(s => s.legality.status === 'caution');
                    
                    return {
                        success: true,
                        route: route,
                        distance: this.extractDistance(route),
                        duration: this.extractDuration(route),
                        segments: segments,
                        isLegal: route.isFullyLegal || illegalSegments.length === 0,
                        hasCautions: cautionSegments.length > 0,
                        illegalCount: illegalSegments.length,
                        cautionCount: cautionSegments.length,
                        alternativeNeeded: illegalSegments.length > 0,
                        mapService: result.mapService
                    };
                } else {
                    throw new Error(result.error || 'No routes found');
                }
            } else {
                // Fallback to direct OSRM routing
                const url = `https://router.project-osrm.org/route/v1/driving/${start.lon},${start.lat};${end.lon},${end.lat}?overview=full&geometries=geojson&steps=true`;
                
                const response = await fetch(url);
                const data = await response.json();
                
                if (data.code !== 'Ok') {
                    throw new Error('Route not found');
                }
                
                const route = data.routes[0];
                const segments = this.analyzeRouteSegments(route);
                
                // Check if route is legal
                const illegalSegments = segments.filter(s => s.legality.status === 'illegal');
                const cautionSegments = segments.filter(s => s.legality.status === 'caution');
                
                return {
                    success: true,
                    route: route,
                    distance: (route.distance / 1609.34).toFixed(1), // Convert to miles
                    duration: Math.round(route.duration / 60), // Convert to minutes
                    segments: segments,
                    isLegal: illegalSegments.length === 0,
                    hasCautions: cautionSegments.length > 0,
                    illegalCount: illegalSegments.length,
                    cautionCount: cautionSegments.length,
                    alternativeNeeded: illegalSegments.length > 0,
                    mapService: 'osm'
                };
            }
            
        } catch (error) {
            console.error('Routing error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Analyze route segments for legality
     * @param {Object} route - OSRM route object
     * @returns {Array} Analyzed segments
     */
    analyzeRouteSegments(route) {
        const segments = [];
        
        route.legs.forEach(leg => {
            leg.steps.forEach(step => {
                // Skip very short segments
                if (step.distance < 10) return;
                
                const road = {
                    name: step.name || 'Unnamed Road',
                    distance: (step.distance / 1609.34).toFixed(2),
                    duration: Math.round(step.duration / 60),
                    instruction: step.maneuver.instruction
                };
                
                // Check legality
                road.legality = this.checkRoadLegality({
                    name: road.name,
                    highway: step.ref || road.name
                });
                
                segments.push(road);
            });
        });
        
        return segments;
    }

    /**
     * Analyze unified route segments for legality
     * @param {Object} route - Route from unified maps service
     * @returns {Array} Analyzed segments
     */
    analyzeUnifiedRouteSegments(route) {
        const segments = [];
        
        // Handle segments if already analyzed
        if (route.segments) {
            return route.segments.map(segment => ({
                name: segment.roadInfo?.name || segment.instruction || 'Unnamed Road',
                distance: this.extractSegmentDistance(segment),
                duration: this.extractSegmentDuration(segment),
                instruction: segment.instruction,
                legality: segment.isLegal !== undefined ? {
                    status: segment.isLegal ? 'legal' : 'illegal',
                    message: segment.isLegal ? '✅ Legal road' : '❌ Illegal - exceeds speed limit',
                    speedLimit: segment.roadInfo?.speedLimit || 25
                } : this.checkRoadLegality(segment.roadInfo || { name: segment.instruction })
            }));
        }
        
        // Otherwise analyze legs and steps
        if (route.legs) {
            route.legs.forEach(leg => {
                if (leg.steps) {
                    leg.steps.forEach(step => {
                        const distance = this.extractSegmentDistance(step);
                        
                        // Skip very short segments
                        if (distance < 0.01) return; // Less than 0.01 miles
                        
                        const road = {
                            name: step.roadInfo?.name || step.instruction || 'Unnamed Road',
                            distance: distance.toFixed(2),
                            duration: this.extractSegmentDuration(step),
                            instruction: step.instruction
                        };
                        
                        // Check legality
                        road.legality = step.roadInfo ? 
                            this.checkRoadLegality(step.roadInfo) :
                            this.checkRoadLegality({ name: road.name });
                        
                        segments.push(road);
                    });
                }
            });
        }
        
        return segments;
    }

    /**
     * Extract distance from various route formats
     */
    extractDistance(route) {
        if (route.distance) {
            if (typeof route.distance === 'number') {
                return (route.distance / 1609.34).toFixed(1); // Convert meters to miles
            } else if (route.distance.value) {
                return (route.distance.value / 1609.34).toFixed(1);
            } else if (route.distance.text) {
                return parseFloat(route.distance.text).toFixed(1);
            }
        }
        
        // Sum up leg distances
        let totalDistance = 0;
        if (route.legs) {
            route.legs.forEach(leg => {
                if (leg.distance) {
                    if (typeof leg.distance === 'number') {
                        totalDistance += leg.distance;
                    } else if (leg.distance.value) {
                        totalDistance += leg.distance.value;
                    }
                }
            });
        }
        
        return (totalDistance / 1609.34).toFixed(1);
    }

    /**
     * Extract duration from various route formats
     */
    extractDuration(route) {
        if (route.duration) {
            if (typeof route.duration === 'number') {
                return Math.round(route.duration / 60); // Convert seconds to minutes
            } else if (route.duration.value) {
                return Math.round(route.duration.value / 60);
            } else if (route.duration.text) {
                return parseInt(route.duration.text);
            }
        }
        
        // Sum up leg durations
        let totalDuration = 0;
        if (route.legs) {
            route.legs.forEach(leg => {
                if (leg.duration) {
                    if (typeof leg.duration === 'number') {
                        totalDuration += leg.duration;
                    } else if (leg.duration.value) {
                        totalDuration += leg.duration.value;
                    }
                }
            });
        }
        
        return Math.round(totalDuration / 60);
    }

    /**
     * Extract segment distance
     */
    extractSegmentDistance(segment) {
        if (segment.distance) {
            if (typeof segment.distance === 'number') {
                return segment.distance / 1609.34; // Convert meters to miles
            } else if (segment.distance.value) {
                return segment.distance.value / 1609.34;
            } else if (segment.distance.text) {
                return parseFloat(segment.distance.text);
            }
        }
        return 0;
    }

    /**
     * Extract segment duration
     */
    extractSegmentDuration(segment) {
        if (segment.duration) {
            if (typeof segment.duration === 'number') {
                return Math.round(segment.duration / 60); // Convert seconds to minutes
            } else if (segment.duration.value) {
                return Math.round(segment.duration.value / 60);
            } else if (segment.duration.text) {
                return parseInt(segment.duration.text);
            }
        }
        return 0;
    }

    /**
     * Display route on map with color coding
     * @param {Object} routeData - Route data from planLegalRoute
     */
    displayRoute(routeData) {
        if (!this.map || !routeData.success) return;
        
        // Clear existing routes
        this.clearRoutes();
        
        // Draw route segments with appropriate colors
        const coordinates = routeData.route.geometry.coordinates;
        const segments = routeData.segments;
        
        let segmentIndex = 0;
        let currentCoords = [];
        
        coordinates.forEach((coord, index) => {
            currentCoords.push([coord[1], coord[0]]); // Leaflet uses [lat, lon]
            
            // Check if we've reached the end of a segment
            if (segmentIndex < segments.length - 1 && index > 0 && index % Math.floor(coordinates.length / segments.length) === 0) {
                // Draw the segment
                const segment = segments[segmentIndex];
                const style = this.getSegmentStyle(segment.legality.status);
                
                const polyline = L.polyline(currentCoords, style)
                    .bindPopup(`
                        <strong>${segment.name}</strong><br>
                        ${segment.legality.message}<br>
                        Distance: ${segment.distance} mi
                    `);
                
                // Add to appropriate layer
                this.addToLayer(polyline, segment.legality.status);
                
                // Start new segment
                currentCoords = [[coord[1], coord[0]]];
                segmentIndex++;
            }
        });
        
        // Draw any remaining coordinates
        if (currentCoords.length > 1 && segmentIndex < segments.length) {
            const segment = segments[segmentIndex];
            const style = this.getSegmentStyle(segment.legality.status);
            const polyline = L.polyline(currentCoords, style);
            this.addToLayer(polyline, segment.legality.status);
        }
        
        // Add start and end markers
        this.addRouteMarkers(routeData);
        
        // Fit map to route
        const bounds = L.latLngBounds(coordinates.map(c => [c[1], c[0]]));
        this.map.fitBounds(bounds, { padding: [50, 50] });
    }

    /**
     * Get style for route segment based on legality
     * @param {string} status - Legal status
     * @returns {Object} Leaflet style object
     */
    getSegmentStyle(status) {
        return this.mapStyles[status] || this.mapStyles.legal;
    }

    /**
     * Add polyline to appropriate layer
     * @param {Object} polyline - Leaflet polyline
     * @param {string} status - Legal status
     */
    addToLayer(polyline, status) {
        switch (status) {
            case 'legal':
                this.routeLayers.legal.addLayer(polyline);
                break;
            case 'caution':
                this.routeLayers.caution.addLayer(polyline);
                break;
            case 'illegal':
                this.routeLayers.illegal.addLayer(polyline);
                break;
        }
    }

    /**
     * Add start and end markers to route
     * @param {Object} routeData - Route data
     */
    addRouteMarkers(routeData) {
        const coords = routeData.route.geometry.coordinates;
        
        // Start marker
        const startIcon = L.divIcon({
            html: '<div style="background: #22c55e; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-weight: bold;">A</div>',
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        });
        
        L.marker([coords[0][1], coords[0][0]], { icon: startIcon })
            .bindPopup('Start')
            .addTo(this.routeLayers.legal);
        
        // End marker
        const endIcon = L.divIcon({
            html: '<div style="background: #dc2626; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-weight: bold;">B</div>',
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        });
        
        L.marker([coords[coords.length - 1][1], coords[coords.length - 1][0]], { icon: endIcon })
            .bindPopup('Destination')
            .addTo(this.routeLayers.legal);
    }

    /**
     * Clear all routes from map
     */
    clearRoutes() {
        Object.values(this.routeLayers).forEach(layer => {
            if (layer) layer.clearLayers();
        });
    }

    /**
     * Find nearby cart paths and LSV lanes
     * @param {Object} location - Center location {lat, lon}
     * @param {number} radius - Search radius in miles
     * @returns {Array} Nearby special routes
     */
    async findSpecialRoutes(location, radius) {
        // This would query OSM Overpass API for cart paths and LSV lanes
        // For now, return sample data
        return [
            {
                type: 'cartPath',
                name: 'Balboa Park Cart Path',
                distance: 2.3,
                access: 'public',
                hours: 'Sunrise to sunset',
                description: 'Scenic path through the park'
            },
            {
                type: 'lsvLane',
                name: 'Coronado LSV Route',
                distance: 3.5,
                access: 'public',
                speedLimit: 25,
                description: 'Dedicated LSV lane along Silver Strand'
            }
        ];
    }

    /**
     * Generate route report with legality details
     * @param {Object} routeData - Route data
     * @returns {Object} Detailed report
     */
    generateRouteReport(routeData) {
        const report = {
            summary: {
                totalDistance: routeData.distance,
                totalTime: routeData.duration,
                isLegal: routeData.isLegal,
                vehicleType: this.vehicleClassification.name,
                maxAllowedSpeed: this.vehicleClassification.maxRoadSpeed
            },
            segments: {
                total: routeData.segments.length,
                legal: routeData.segments.filter(s => s.legality.status === 'legal').length,
                caution: routeData.cautionCount,
                illegal: routeData.illegalCount
            },
            recommendations: []
        };
        
        // Add recommendations
        if (!routeData.isLegal) {
            report.recommendations.push('This route contains illegal road segments for your vehicle');
            report.recommendations.push('Consider upgrading to LSV classification (20+ MPH) for more route options');
        }
        
        if (routeData.hasCautions) {
            report.recommendations.push('Some roads require checking local GEM/LSV regulations');
        }
        
        if (routeData.distance > 10) {
            report.recommendations.push('Plan for charging stops on longer routes');
        }
        
        // Add problem segments
        report.problemSegments = routeData.segments
            .filter(s => s.legality.status !== 'legal')
            .map(s => ({
                road: s.name,
                status: s.legality.status,
                reason: s.legality.message
            }));
        
        return report;
    }

    /**
     * Get visual indicator for road/route
     * @param {string} status - Legal status
     * @returns {Object} Visual indicator details
     */
    getVisualIndicator(status) {
        const indicators = {
            legal: {
                color: '#22c55e',
                icon: '✅',
                text: 'Legal',
                bgClass: 'bg-green-50',
                textClass: 'text-green-700',
                borderClass: 'border-green-200'
            },
            caution: {
                color: '#eab308',
                icon: '⚠️',
                text: 'Caution',
                bgClass: 'bg-yellow-50',
                textClass: 'text-yellow-700',
                borderClass: 'border-yellow-200'
            },
            illegal: {
                color: '#dc2626',
                icon: '❌',
                text: 'Illegal',
                bgClass: 'bg-red-50',
                textClass: 'text-red-700',
                borderClass: 'border-red-200'
            }
        };
        
        return indicators[status] || indicators.caution;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LegalRoutingSystem;
}
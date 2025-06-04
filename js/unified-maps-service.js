/**
 * Unified Maps Service
 * Provides a single interface for both Google Maps and OpenStreetMap
 */

class UnifiedMapsService {
    constructor() {
        this.mapsConfig = window.mapsConfig || new MapsConfig();
        this.googleMapsService = window.googleMapsService;
        this.osmMapService = window.osmMapService;
        this.currentService = null;
        this.activeService = null;
        
        this.initialize();
    }
    
    /**
     * Initialize unified maps service
     */
    async initialize() {
        // Wait for configuration to load
        await this.mapsConfig.initialize();
        
        // Determine which service to use
        this.currentService = this.mapsConfig.getCurrentService();
        
        // Initialize the selected service
        if (this.currentService === 'google' && this.googleMapsService) {
            this.activeService = this.googleMapsService;
        } else {
            this.activeService = this.osmMapService;
            // Ensure OSM is initialized
            if (!this.osmMapService) {
                await this.loadOSMService();
            }
        }
        
        console.log(`Unified Maps Service initialized with: ${this.currentService}`);
        
        // Listen for service changes
        window.addEventListener('mapsServiceChanged', (e) => {
            this.handleServiceChange(e.detail.service);
        });
    }
    
    /**
     * Load OSM service if not already loaded
     */
    async loadOSMService() {
        const script = document.createElement('script');
        script.src = 'js/osm-maps-service.js';
        document.head.appendChild(script);
        
        return new Promise((resolve) => {
            script.onload = () => {
                this.osmMapService = window.osmMapService;
                resolve();
            };
        });
    }
    
    /**
     * Handle service change
     */
    handleServiceChange(newService) {
        this.currentService = newService;
        
        if (newService === 'google' && this.googleMapsService) {
            this.activeService = this.googleMapsService;
        } else {
            this.activeService = this.osmMapService;
        }
        
        console.log(`Switched to ${newService} maps service`);
    }
    
    /**
     * Initialize map on element
     */
    initializeMap(elementId, options = {}) {
        if (!this.activeService) {
            console.error('No active map service available');
            return null;
        }
        
        // Add service indicator to map
        this.addServiceIndicator(elementId);
        
        return this.activeService.initializeMap(elementId, options);
    }
    
    /**
     * Find legal routes
     */
    async findLegalRoutes(origin, destination, vehicleType = 'lsv') {
        if (!this.activeService) {
            console.error('No active map service available');
            return {
                success: false,
                error: 'No mapping service configured',
                routes: []
            };
        }
        
        try {
            const result = await this.activeService.findLegalRoutes(origin, destination, vehicleType);
            
            // Add service information to result
            result.mapService = this.currentService;
            
            return result;
        } catch (error) {
            console.error('Route finding failed:', error);
            
            // Try fallback service if available
            if (this.currentService === 'google' && this.osmMapService) {
                console.log('Falling back to OpenStreetMap...');
                const fallbackResult = await this.osmMapService.findLegalRoutes(origin, destination, vehicleType);
                fallbackResult.mapService = 'osm';
                fallbackResult.fallback = true;
                return fallbackResult;
            }
            
            return {
                success: false,
                error: error.message,
                routes: [],
                mapService: this.currentService
            };
        }
    }
    
    /**
     * Display route on map
     */
    displayRoute(route) {
        if (!this.activeService) {
            console.error('No active map service available');
            return;
        }
        
        this.activeService.displayRoute(route);
    }
    
    /**
     * Clear map
     */
    clearMap() {
        if (!this.activeService) return;
        
        this.activeService.clearMap();
    }
    
    /**
     * Add service indicator to map
     */
    addServiceIndicator(elementId) {
        const mapElement = document.getElementById(elementId);
        if (!mapElement) return;
        
        // Remove existing indicator
        const existingIndicator = mapElement.querySelector('.map-service-indicator');
        if (existingIndicator) {
            existingIndicator.remove();
        }
        
        // Create service indicator
        const indicator = document.createElement('div');
        indicator.className = 'map-service-indicator absolute top-2 right-2 z-10 bg-white rounded-lg shadow-md p-2 flex items-center space-x-2';
        indicator.innerHTML = `
            <span class="text-xs text-gray-600">Powered by:</span>
            <span class="text-xs font-semibold ${this.currentService === 'google' ? 'text-blue-600' : 'text-green-600'}">
                ${this.currentService === 'google' ? 'Google Maps' : 'OpenStreetMap'}
            </span>
            <button onclick="mapsConfig.showConfigUI()" class="text-gray-400 hover:text-gray-600" title="Configure Maps">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                </svg>
            </button>
        `;
        
        // Make sure parent has relative positioning
        if (getComputedStyle(mapElement).position === 'static') {
            mapElement.style.position = 'relative';
        }
        
        mapElement.appendChild(indicator);
    }
    
    /**
     * Get service status
     */
    getServiceStatus() {
        return {
            current: this.currentService,
            available: {
                google: this.mapsConfig.isGoogleMapsAvailable(),
                osm: true // Always available
            },
            configured: {
                google: this.mapsConfig.apiManager.apis.googleMaps.isConfigured,
                osm: true
            }
        };
    }
    
    /**
     * Show configuration UI
     */
    showConfigUI() {
        this.mapsConfig.showConfigUI();
    }
}

// Create global instance
window.unifiedMapsService = new UnifiedMapsService();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UnifiedMapsService;
}
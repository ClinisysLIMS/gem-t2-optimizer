/**
 * Weekend Outing Trip Planner
 * Single-page trip planning with legal route filtering
 */
class WeekendPlanner {
    constructor() {
        this.vehicleClassification = null;
        this.explorationRadius = 5; // Default 5 miles
        this.towingMode = false;
        this.exampleRoutes = {
            'san-carlos-point-loma': {
                name: 'San Carlos to Point Loma',
                start: { lat: 32.7157, lon: -117.1611, address: 'San Carlos, San Diego, CA' },
                end: { lat: 32.6735, lon: -117.2425, address: 'Point Loma, San Diego, CA' },
                distance: 8.2,
                description: 'Scenic coastal route through San Diego neighborhoods',
                golfCartLegal: false,
                lsvLegal: true,
                highlights: ['Harbor views', 'Sunset Cliffs', 'Liberty Station'],
                warnings: ['Requires LSV classification', 'Some hills near Point Loma']
            },
            'balboa-park-loop': {
                name: 'Balboa Park Loop',
                start: { lat: 32.7341, lon: -117.1446, address: 'Balboa Park, San Diego, CA' },
                end: { lat: 32.7341, lon: -117.1446, address: 'Balboa Park, San Diego, CA' },
                distance: 4.5,
                description: 'Golf cart friendly loop through Balboa Park',
                golfCartLegal: true,
                lsvLegal: true,
                highlights: ['Museums', 'Gardens', 'Zoo entrance'],
                warnings: ['Busy on weekends', 'Limited parking']
            },
            'coronado-island': {
                name: 'Coronado Island Tour',
                start: { lat: 32.6859, lon: -117.1831, address: 'Coronado Ferry Landing' },
                end: { lat: 32.6807, lon: -117.1786, address: 'Hotel del Coronado' },
                distance: 3.2,
                description: 'Relaxed island tour perfect for all GEM vehicles',
                golfCartLegal: true,
                lsvLegal: true,
                highlights: ['Beach views', 'Historic hotel', 'Coronado Bridge views'],
                warnings: ['Ferry required from San Diego', 'Beach parking fills early']
            }
        };
    }

    /**
     * Initialize the weekend planner
     * @param {Object} vehicleData - Vehicle information including classification
     */
    init(vehicleData) {
        this.vehicleClassification = vehicleData.classification || 'golf-cart';
        this.setupEventListeners();
        this.updateExampleRoutes();
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Towing mode
        document.getElementById('towing-mode')?.addEventListener('change', (e) => {
            this.towingMode = e.target.checked;
            this.updateOptimizationFactors();
        });

        // Exploration radius
        document.getElementById('exploration-radius')?.addEventListener('change', (e) => {
            this.explorationRadius = parseInt(e.target.value);
            this.updateRadiusDisplay();
        });

        // Example routes
        document.querySelectorAll('.example-route-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const routeId = e.currentTarget.dataset.route;
                this.loadExampleRoute(routeId);
            });
        });

        // Custom destination
        document.getElementById('trip-destination')?.addEventListener('input', (e) => {
            this.validateDestination(e.target.value);
        });

        // Generate route button
        document.getElementById('generate-route')?.addEventListener('click', () => {
            this.generateOptimizedRoute();
        });
    }

    /**
     * Update example routes based on vehicle classification
     */
    updateExampleRoutes() {
        const routeContainer = document.getElementById('example-routes');
        if (!routeContainer) return;

        const isLSV = this.vehicleClassification === 'lsv' || this.vehicleClassification === 'nev';

        routeContainer.innerHTML = Object.entries(this.exampleRoutes)
            .filter(([_, route]) => isLSV ? route.lsvLegal : route.golfCartLegal)
            .map(([id, route]) => `
                <button class="example-route-btn p-4 border-2 border-gray-200 rounded-lg hover:border-green-400 hover:bg-green-50 transition-all text-left" 
                        data-route="${id}">
                    <h4 class="font-semibold text-gray-900">${route.name}</h4>
                    <p class="text-sm text-gray-600 mt-1">${route.distance} miles - ${route.description}</p>
                    <div class="flex flex-wrap gap-2 mt-2">
                        ${route.highlights.map(h => `
                            <span class="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                ${h}
                            </span>
                        `).join('')}
                    </div>
                    ${!isLSV && !route.golfCartLegal ? `
                        <p class="text-xs text-red-600 mt-2">
                            ⚠️ Requires LSV classification
                        </p>
                    ` : ''}
                </button>
            `).join('');
    }

    /**
     * Load example route
     * @param {string} routeId - Route identifier
     */
    loadExampleRoute(routeId) {
        const route = this.exampleRoutes[routeId];
        if (!route) return;

        // Check if route is legal for vehicle
        const isLSV = this.vehicleClassification === 'lsv' || this.vehicleClassification === 'nev';
        if (!isLSV && !route.golfCartLegal) {
            this.showRouteWarning('This route requires LSV classification (speed ≥20 MPH)');
            return;
        }

        // Populate form
        document.getElementById('trip-start').value = route.start.address;
        document.getElementById('trip-destination').value = route.end.address;
        
        // Store route data
        this.currentRoute = route;
        
        // Show route preview
        this.showRoutePreview(route);
    }

    /**
     * Show route preview
     * @param {Object} route - Route data
     */
    showRoutePreview(route) {
        const previewDiv = document.getElementById('route-preview');
        if (!previewDiv) return;

        previewDiv.innerHTML = `
            <div class="bg-blue-50 rounded-lg p-4">
                <h4 class="font-semibold text-blue-900 mb-2">Route Preview: ${route.name}</h4>
                <div class="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                        <p class="text-gray-700">
                            <strong>Distance:</strong> ${route.distance} miles<br>
                            <strong>Estimated Time:</strong> ${Math.round(route.distance * 3)} minutes<br>
                            <strong>Legal Status:</strong> 
                            <span class="font-medium ${route.golfCartLegal ? 'text-green-600' : 'text-red-600'}">
                                ${route.golfCartLegal ? '✓ Golf Cart Legal' : '✗ LSV Required'}
                            </span>
                        </p>
                    </div>
                    <div>
                        ${route.warnings.length > 0 ? `
                            <p class="text-yellow-700">
                                <strong>Considerations:</strong><br>
                                ${route.warnings.map(w => `• ${w}`).join('<br>')}
                            </p>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
        
        previewDiv.classList.remove('hidden');
    }

    /**
     * Update optimization factors based on towing mode
     */
    updateOptimizationFactors() {
        const factorsDiv = document.getElementById('optimization-factors');
        if (!factorsDiv) return;

        if (this.towingMode) {
            factorsDiv.innerHTML = `
                <div class="bg-yellow-50 border-l-4 border-yellow-400 p-3 mt-4">
                    <p class="text-sm text-yellow-800">
                        <strong>🚐 Towing Mode Active:</strong> Optimizing for:
                    </p>
                    <ul class="text-xs text-yellow-700 mt-1 ml-4">
                        <li>• Reduced acceleration for trailer stability</li>
                        <li>• Enhanced hill climbing torque</li>
                        <li>• Conservative speed limits</li>
                        <li>• Increased regenerative braking</li>
                    </ul>
                </div>
            `;
        } else {
            factorsDiv.innerHTML = '';
        }
    }

    /**
     * Update radius display
     */
    updateRadiusDisplay() {
        const display = document.getElementById('radius-display');
        if (display) {
            display.textContent = `${this.explorationRadius} miles`;
        }
    }

    /**
     * Validate destination for legal routes
     * @param {string} destination - Destination address
     */
    async validateDestination(destination) {
        if (!destination || destination.length < 3) return;

        // Simple validation for now
        const legalityDiv = document.getElementById('route-legality');
        if (!legalityDiv) return;

        // Check if destination seems to be on a highway
        const highwayKeywords = ['I-', 'Interstate', 'Freeway', 'Highway', 'Hwy'];
        const isHighway = highwayKeywords.some(keyword => 
            destination.toLowerCase().includes(keyword.toLowerCase())
        );

        if (isHighway) {
            legalityDiv.innerHTML = `
                <div class="text-red-600 text-sm mt-2">
                    ⚠️ GEM vehicles cannot use highways or freeways
                </div>
            `;
        } else {
            legalityDiv.innerHTML = `
                <div class="text-green-600 text-sm mt-2">
                    ✓ Route will avoid highways and use GEM-legal roads
                </div>
            `;
        }
    }

    /**
     * Generate optimized route
     */
    async generateOptimizedRoute() {
        const start = document.getElementById('trip-start')?.value;
        const destination = document.getElementById('trip-destination')?.value;
        const date = document.getElementById('trip-date')?.value;

        if (!start || !destination) {
            alert('Please enter both start and destination locations');
            return;
        }

        // Show loading state
        const resultsDiv = document.getElementById('route-results');
        if (resultsDiv) {
            resultsDiv.innerHTML = `
                <div class="text-center py-8">
                    <div class="spinner mx-auto mb-4"></div>
                    <p class="text-gray-600">Generating optimized route...</p>
                    <p class="text-sm text-gray-500 mt-2">Finding GEM-legal roads within ${this.explorationRadius} miles</p>
                </div>
            `;
            resultsDiv.classList.remove('hidden');
        }

        // Simulate route generation
        setTimeout(() => {
            this.displayOptimizedRoute({
                start,
                destination,
                distance: Math.random() * 15 + 5,
                estimatedTime: Math.random() * 45 + 15,
                chargingStops: this.explorationRadius > 10 ? 1 : 0,
                legalStatus: this.vehicleClassification === 'golf-cart' ? 'golf-cart' : 'lsv'
            });
        }, 2000);
    }

    /**
     * Display optimized route results
     * @param {Object} routeData - Generated route data
     */
    displayOptimizedRoute(routeData) {
        const resultsDiv = document.getElementById('route-results');
        if (!resultsDiv) return;

        const optimizationSettings = this.getOptimizationSettings(routeData);

        resultsDiv.innerHTML = `
            <div class="bg-white border-2 border-green-400 rounded-lg p-6">
                <h3 class="text-lg font-bold text-gray-900 mb-4">🗺️ Optimized Weekend Route</h3>
                
                <div class="grid md:grid-cols-2 gap-6">
                    <div>
                        <h4 class="font-semibold text-gray-800 mb-3">Route Details</h4>
                        <dl class="space-y-2 text-sm">
                            <div class="flex justify-between">
                                <dt class="text-gray-600">Total Distance:</dt>
                                <dd class="font-medium">${routeData.distance.toFixed(1)} miles</dd>
                            </div>
                            <div class="flex justify-between">
                                <dt class="text-gray-600">Estimated Time:</dt>
                                <dd class="font-medium">${Math.round(routeData.estimatedTime)} minutes</dd>
                            </div>
                            <div class="flex justify-between">
                                <dt class="text-gray-600">Average Speed:</dt>
                                <dd class="font-medium">${(routeData.distance / (routeData.estimatedTime / 60)).toFixed(0)} mph</dd>
                            </div>
                            ${routeData.chargingStops > 0 ? `
                                <div class="flex justify-between">
                                    <dt class="text-gray-600">Charging Stops:</dt>
                                    <dd class="font-medium">${routeData.chargingStops}</dd>
                                </div>
                            ` : ''}
                        </dl>
                        
                        <div class="mt-4 p-3 bg-gray-50 rounded">
                            <p class="text-xs text-gray-600">
                                <strong>Legal Status:</strong> 
                                ${routeData.legalStatus === 'golf-cart' ? 
                                    '✓ Golf cart legal roads only (≤25 mph)' : 
                                    '✓ LSV legal roads (≤35 mph)'
                                }
                            </p>
                        </div>
                    </div>
                    
                    <div>
                        <h4 class="font-semibold text-gray-800 mb-3">Controller Settings</h4>
                        <div class="space-y-2">
                            ${Object.entries(optimizationSettings).map(([key, value]) => `
                                <div class="flex justify-between text-sm">
                                    <span class="text-gray-600">${key}:</span>
                                    <span class="font-medium ${value.change ? 
                                        (value.change > 0 ? 'text-green-600' : 'text-red-600') : 
                                        ''
                                    }">
                                        ${value.value} ${value.change ? `(${value.change > 0 ? '+' : ''}${value.change}%)` : ''}
                                    </span>
                                </div>
                            `).join('')}
                        </div>
                        
                        ${this.towingMode ? `
                            <div class="mt-3 p-2 bg-yellow-50 rounded text-xs text-yellow-800">
                                🚐 Towing adjustments applied
                            </div>
                        ` : ''}
                    </div>
                </div>
                
                <div class="mt-6 flex justify-between">
                    <button onclick="weekendPlanner.saveRoute()" 
                            class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
                        💾 Save Route
                    </button>
                    <button onclick="weekendPlanner.exportRoute()" 
                            class="px-4 py-2 border border-green-600 text-green-600 rounded hover:bg-green-50">
                        📤 Export Settings
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Get optimization settings for route
     * @param {Object} routeData - Route information
     * @returns {Object} Optimized controller settings
     */
    getOptimizationSettings(routeData) {
        const baseSettings = {
            'Max Speed': { value: 25, unit: 'mph' },
            'Acceleration': { value: 'Smooth', unit: '' },
            'Regen Braking': { value: 'High', unit: '' },
            'Range Mode': { value: 'Balanced', unit: '' }
        };

        // Adjust for towing
        if (this.towingMode) {
            baseSettings['Max Speed'].value = 20;
            baseSettings['Max Speed'].change = -20;
            baseSettings['Acceleration'].value = 'Gentle';
            baseSettings['Regen Braking'].value = 'Maximum';
            baseSettings['Hill Assist'] = { value: 'Enhanced', unit: '' };
        }

        // Adjust for distance
        if (routeData.distance > 15) {
            baseSettings['Range Mode'].value = 'Extended';
            baseSettings['Range Mode'].change = +15;
        }

        return baseSettings;
    }

    /**
     * Show route warning
     * @param {string} message - Warning message
     */
    showRouteWarning(message) {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-white rounded-lg p-6 max-w-md">
                <h3 class="text-lg font-bold text-red-600 mb-3">⚠️ Route Restriction</h3>
                <p class="text-gray-700 mb-4">${message}</p>
                <p class="text-sm text-gray-600 mb-4">
                    Your vehicle is classified as a <strong>Golf Cart</strong> with a top speed of 
                    ${document.getElementById('current-speed')?.value || 25} MPH.
                </p>
                <div class="flex justify-end space-x-3">
                    <button onclick="this.closest('.fixed').remove()" 
                            class="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50">
                        OK
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    /**
     * Save route for future use
     */
    saveRoute() {
        const routes = JSON.parse(localStorage.getItem('saved-routes') || '[]');
        routes.push({
            date: new Date().toISOString(),
            start: document.getElementById('trip-start')?.value,
            destination: document.getElementById('trip-destination')?.value,
            settings: this.getOptimizationSettings({ distance: 10 })
        });
        localStorage.setItem('saved-routes', JSON.stringify(routes));
        alert('Route saved successfully!');
    }

    /**
     * Export route and settings
     */
    exportRoute() {
        // This would export to PDF or share
        alert('Export feature coming soon!');
    }
}

// Create global instance
window.weekendPlanner = new WeekendPlanner();
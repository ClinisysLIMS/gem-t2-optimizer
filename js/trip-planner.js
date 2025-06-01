/**
 * GEM T2 Controller Optimizer - Trip Planner
 * Advanced trip planning wizard with weather and terrain integration
 */
class TripPlanner {
    constructor() {
        this.currentStep = 1;
        this.totalSteps = 4;
        this.tripData = {
            location: {
                destination: '',
                startPoint: '',
                coordinates: null
            },
            date: {
                startDate: '',
                endDate: '',
                duration: 1
            },
            details: {
                eventType: '',
                description: '',
                estimatedDistance: 0
            },
            passengers: {
                count: 2,
                cargoLoad: 'light',
                specialRequirements: []
            }
        };
        this.weatherData = null;
        this.terrainData = null;
        this.isModalOpen = false;
        
        // API configuration
        this.apis = {
            weather: {
                baseUrl: 'https://api.openweathermap.org/data/2.5',
                apiKey: 'YOUR_API_KEY_HERE',
                endpoints: {
                    current: '/weather',
                    forecast: '/forecast'
                }
            },
            terrain: {
                baseUrl: 'https://api.mapbox.com',
                apiKey: 'YOUR_API_KEY_HERE',
                endpoints: {
                    elevation: '/v4/mapbox.mapbox-terrain-v2/tilequery',
                    geocoding: '/geocoding/v5/mapbox.places'
                }
            }
        };
        
        this.initializeModal();
    }
    
    /**
     * Initialize the trip planner modal
     */
    initializeModal() {
        // Create modal HTML if it doesn't exist
        if (!document.getElementById('trip-planner-modal')) {
            this.createModalHTML();
        }
        
        this.attachModalEventListeners();
    }
    
    /**
     * Create the modal HTML structure
     */
    createModalHTML() {
        const modalHTML = `
            <div id="trip-planner-modal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 hidden">
                <div class="relative top-20 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
                    <div class="mt-3">
                        <!-- Modal Header -->
                        <div class="flex justify-between items-center mb-6">
                            <div>
                                <h3 class="text-2xl font-bold text-gray-900">📅 Weekend Outing Trip Planner</h3>
                                <p class="text-sm text-gray-600 mt-1">Plan your GEM outing with weather and terrain optimization</p>
                            </div>
                            <button id="close-trip-modal" class="text-gray-400 hover:text-gray-600">
                                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                                </svg>
                            </button>
                        </div>
                        
                        <!-- Progress Bar -->
                        <div class="mb-8">
                            <div class="flex justify-between text-xs text-gray-500 mb-2">
                                <span>Step <span id="trip-current-step">1</span> of ${this.totalSteps}</span>
                                <span id="trip-step-name">Location</span>
                            </div>
                            <div class="w-full bg-gray-200 rounded-full h-2">
                                <div id="trip-progress-bar" class="bg-blue-600 h-2 rounded-full transition-all duration-300" style="width: 25%"></div>
                            </div>
                        </div>
                        
                        <!-- Step Content -->
                        <div id="trip-modal-content">
                            ${this.generateStepHTML(1)}
                        </div>
                        
                        <!-- Modal Footer -->
                        <div class="flex justify-between items-center mt-8 pt-6 border-t">
                            <button id="trip-prev-btn" class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed" disabled>
                                Previous
                            </button>
                            <div class="flex space-x-3">
                                <button id="trip-cancel-btn" class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
                                    Cancel
                                </button>
                                <button id="trip-next-btn" class="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                                    Next Step
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }
    
    /**
     * Generate HTML for a specific step
     * @param {number} step - Step number
     * @returns {string} HTML string
     */
    generateStepHTML(step) {
        switch (step) {
            case 1:
                return this.generateLocationStepHTML();
            case 2:
                return this.generateDateStepHTML();
            case 3:
                return this.generateDetailsStepHTML();
            case 4:
                return this.generatePassengersStepHTML();
            default:
                return '';
        }
    }
    
    /**
     * Generate location step HTML
     */
    generateLocationStepHTML() {
        return `
            <div class="space-y-6">
                <div>
                    <h4 class="text-lg font-semibold mb-4">🗺️ Trip Location</h4>
                    <p class="text-sm text-gray-600 mb-6">Enter your starting point and destination for route analysis</p>
                </div>
                
                <div class="grid md:grid-cols-2 gap-6">
                    <div>
                        <label for="trip-start-point" class="block text-sm font-medium text-gray-700 mb-2">
                            Starting Point
                        </label>
                        <input type="text" id="trip-start-point" 
                               class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                               placeholder="e.g., San Francisco, CA"
                               value="${this.tripData.location.startPoint}">
                        <p class="text-xs text-gray-500 mt-1">Your current location or trip starting point</p>
                    </div>
                    
                    <div>
                        <label for="trip-destination" class="block text-sm font-medium text-gray-700 mb-2">
                            Destination *
                        </label>
                        <input type="text" id="trip-destination" 
                               class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                               placeholder="e.g., Yosemite National Park"
                               value="${this.tripData.location.destination}" required>
                        <p class="text-xs text-gray-500 mt-1">Your primary destination</p>
                    </div>
                </div>
                
                <div id="location-suggestions" class="hidden">
                    <h5 class="font-medium text-gray-700 mb-2">Popular GEM Destinations:</h5>
                    <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
                        ${this.getPopularDestinations().map(dest => `
                            <button type="button" class="destination-suggestion text-left p-2 text-sm border border-gray-200 rounded hover:bg-blue-50 hover:border-blue-300">
                                ${dest}
                            </button>
                        `).join('')}
                    </div>
                </div>
                
                <div class="bg-blue-50 border-l-4 border-blue-400 p-4">
                    <div class="flex">
                        <div class="flex-shrink-0">
                            <svg class="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
                            </svg>
                        </div>
                        <div class="ml-3">
                            <p class="text-sm text-blue-700">
                                <strong>Tip:</strong> We'll analyze the route between your starting point and destination to optimize controller settings for terrain and distance.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Generate date step HTML
     */
    generateDateStepHTML() {
        const today = new Date().toISOString().split('T')[0];
        const maxDate = new Date();
        maxDate.setMonth(maxDate.getMonth() + 6);
        const maxDateStr = maxDate.toISOString().split('T')[0];
        
        const isWeatherConfigured = window.weatherService && window.weatherService.isConfigured();
        const isTerrainConfigured = window.terrainService && window.terrainService.isMapboxConfigured();
        
        return `
            <div class="space-y-6">
                <div>
                    <h4 class="text-lg font-semibold mb-4">📅 Trip Dates</h4>
                    <p class="text-sm text-gray-600 mb-6">Select your trip dates for weather forecasting</p>
                </div>
                
                ${!isWeatherConfigured ? `
                    <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
                        <div class="flex">
                            <div class="flex-shrink-0">
                                <svg class="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                                </svg>
                            </div>
                            <div class="ml-3">
                                <h4 class="text-sm font-medium text-yellow-800">Weather API Configuration</h4>
                                <p class="mt-1 text-sm text-yellow-700">
                                    Configure your OpenWeatherMap API key for real weather data
                                </p>
                                <div class="mt-3">
                                    <div class="flex space-x-2">
                                        <input type="text" id="weather-api-key" 
                                               class="flex-1 px-3 py-2 border border-yellow-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                               placeholder="Enter your OpenWeatherMap API key">
                                        <button id="save-weather-key" 
                                                class="px-4 py-2 bg-yellow-600 text-white text-sm rounded-md hover:bg-yellow-700">
                                            Save
                                        </button>
                                    </div>
                                    <p class="mt-1 text-xs text-yellow-600">
                                        Get a free API key at <a href="https://openweathermap.org/api" target="_blank" class="underline">openweathermap.org</a>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                ` : ''}
                
                ${!isTerrainConfigured ? `
                    <div class="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
                        <div class="flex">
                            <div class="flex-shrink-0">
                                <svg class="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
                                </svg>
                            </div>
                            <div class="ml-3">
                                <h4 class="text-sm font-medium text-blue-800">Enhanced Terrain Analysis (Optional)</h4>
                                <p class="mt-1 text-sm text-blue-700">
                                    Configure Mapbox API key for detailed elevation analysis and precise route grading
                                </p>
                                <div class="mt-3">
                                    <div class="flex space-x-2">
                                        <input type="text" id="mapbox-api-key" 
                                               class="flex-1 px-3 py-2 border border-blue-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                               placeholder="Enter your Mapbox API key (optional)">
                                        <button id="save-mapbox-key" 
                                                class="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700">
                                            Save
                                        </button>
                                    </div>
                                    <p class="mt-1 text-xs text-blue-600">
                                        Get a free API key at <a href="https://account.mapbox.com/" target="_blank" class="underline">mapbox.com</a>. Free tier includes 50,000 requests/month.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                ` : ''}
                
                <div class="grid md:grid-cols-2 gap-6">
                    <div>
                        <label for="trip-start-date" class="block text-sm font-medium text-gray-700 mb-2">
                            Start Date *
                        </label>
                        <input type="date" id="trip-start-date" 
                               class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                               min="${today}" max="${maxDateStr}"
                               value="${this.tripData.date.startDate}" required>
                    </div>
                    
                    <div>
                        <label for="trip-end-date" class="block text-sm font-medium text-gray-700 mb-2">
                            End Date
                        </label>
                        <input type="date" id="trip-end-date" 
                               class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                               min="${today}" max="${maxDateStr}"
                               value="${this.tripData.date.endDate}">
                        <p class="text-xs text-gray-500 mt-1">Leave blank for single-day trip</p>
                    </div>
                </div>
                
                <div id="weather-preview" class="hidden bg-gray-50 rounded-lg p-4">
                    <h5 class="font-medium text-gray-700 mb-2">🌤️ Weather Preview</h5>
                    <div id="weather-preview-content">
                        <!-- Weather data will be loaded here -->
                    </div>
                </div>
                
                <div class="bg-green-50 border-l-4 border-green-400 p-4">
                    <div class="flex">
                        <div class="flex-shrink-0">
                            <svg class="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
                            </svg>
                        </div>
                        <div class="ml-3">
                            <p class="text-sm text-green-700">
                                <strong>Trip Analysis:</strong> ${isWeatherConfigured ? 
                                    'Real-time weather data from OpenWeatherMap.' :
                                    'Weather estimates based on season and location.'
                                } ${isTerrainConfigured ?
                                    'Detailed terrain analysis via Mapbox elevation data.' :
                                    'Basic terrain analysis using free elevation services.'
                                }
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Generate trip details step HTML
     */
    generateDetailsStepHTML() {
        return `
            <div class="space-y-6">
                <div>
                    <h4 class="text-lg font-semibold mb-4">🎯 Trip Details</h4>
                    <p class="text-sm text-gray-600 mb-6">Tell us about your outing type and requirements</p>
                </div>
                
                <div>
                    <label for="trip-event-type" class="block text-sm font-medium text-gray-700 mb-2">
                        Event Type *
                    </label>
                    <select id="trip-event-type" 
                            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" required>
                        <option value="">Select event type...</option>
                        <option value="camping" ${this.tripData.details.eventType === 'camping' ? 'selected' : ''}>🏕️ Camping Trip</option>
                        <option value="touring" ${this.tripData.details.eventType === 'touring' ? 'selected' : ''}>🗺️ Sightseeing Tour</option>
                        <option value="parade" ${this.tripData.details.eventType === 'parade' ? 'selected' : ''}>🎉 Parade/Festival</option>
                        <option value="beach" ${this.tripData.details.eventType === 'beach' ? 'selected' : ''}>🏖️ Beach Outing</option>
                        <option value="mountains" ${this.tripData.details.eventType === 'mountains' ? 'selected' : ''}>⛰️ Mountain Adventure</option>
                        <option value="shopping" ${this.tripData.details.eventType === 'shopping' ? 'selected' : ''}>🛍️ Shopping Trip</option>
                        <option value="family" ${this.tripData.details.eventType === 'family' ? 'selected' : ''}>👨‍👩‍👧‍👦 Family Outing</option>
                        <option value="photography" ${this.tripData.details.eventType === 'photography' ? 'selected' : ''}>📸 Photography Trip</option>
                        <option value="other" ${this.tripData.details.eventType === 'other' ? 'selected' : ''}>🎭 Other</option>
                    </select>
                </div>
                
                <div>
                    <label for="trip-description" class="block text-sm font-medium text-gray-700 mb-2">
                        Trip Description
                    </label>
                    <textarea id="trip-description" rows="3"
                              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="Describe your trip activities, special requirements, or any additional details...">${this.tripData.details.description}</textarea>
                </div>
                
                <div>
                    <label for="trip-estimated-distance" class="block text-sm font-medium text-gray-700 mb-2">
                        Estimated Total Distance (miles)
                    </label>
                    <input type="number" id="trip-estimated-distance" min="1" max="200"
                           class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                           placeholder="e.g., 25"
                           value="${this.tripData.details.estimatedDistance || ''}">
                    <p class="text-xs text-gray-500 mt-1">Total driving distance for the entire trip (will be auto-calculated if left blank)</p>
                </div>
                
                <div id="event-specific-tips" class="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                    <div class="flex">
                        <div class="flex-shrink-0">
                            <svg class="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                            </svg>
                        </div>
                        <div class="ml-3">
                            <p class="text-sm text-yellow-700" id="event-tip-text">
                                Select an event type to see specific optimization tips.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Generate passengers step HTML
     */
    generatePassengersStepHTML() {
        return `
            <div class="space-y-6">
                <div>
                    <h4 class="text-lg font-semibold mb-4">👥 Passengers & Cargo</h4>
                    <p class="text-sm text-gray-600 mb-6">Configure passenger count and cargo load for optimal performance</p>
                </div>
                
                <div class="grid md:grid-cols-2 gap-6">
                    <div>
                        <label for="trip-passenger-count" class="block text-sm font-medium text-gray-700 mb-2">
                            Total Passengers
                        </label>
                        <select id="trip-passenger-count" 
                                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                            <option value="1" ${this.tripData.passengers.count === 1 ? 'selected' : ''}>1 Person</option>
                            <option value="2" ${this.tripData.passengers.count === 2 ? 'selected' : ''}>2 People</option>
                            <option value="3" ${this.tripData.passengers.count === 3 ? 'selected' : ''}>3 People</option>
                            <option value="4" ${this.tripData.passengers.count === 4 ? 'selected' : ''}>4 People</option>
                            <option value="5" ${this.tripData.passengers.count === 5 ? 'selected' : ''}>5 People</option>
                            <option value="6" ${this.tripData.passengers.count === 6 ? 'selected' : ''}>6 People</option>
                        </select>
                    </div>
                    
                    <div>
                        <label for="trip-cargo-load" class="block text-sm font-medium text-gray-700 mb-2">
                            Cargo Load
                        </label>
                        <select id="trip-cargo-load" 
                                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                            <option value="light" ${this.tripData.passengers.cargoLoad === 'light' ? 'selected' : ''}>🎒 Light (personal items only)</option>
                            <option value="medium" ${this.tripData.passengers.cargoLoad === 'medium' ? 'selected' : ''}>🧳 Medium (day trip supplies)</option>
                            <option value="heavy" ${this.tripData.passengers.cargoLoad === 'heavy' ? 'selected' : ''}>📦 Heavy (camping gear, coolers)</option>
                            <option value="maximum" ${this.tripData.passengers.cargoLoad === 'maximum' ? 'selected' : ''}>🚛 Maximum (full cargo capacity)</option>
                        </select>
                    </div>
                </div>
                
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-3">
                        Special Requirements
                    </label>
                    <div class="space-y-2">
                        ${this.getSpecialRequirements().map(req => `
                            <label class="flex items-center">
                                <input type="checkbox" class="special-requirement h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" 
                                       value="${req.value}" ${this.tripData.passengers.specialRequirements.includes(req.value) ? 'checked' : ''}>
                                <span class="ml-2 text-sm text-gray-700">${req.icon} ${req.label}</span>
                            </label>
                        `).join('')}
                    </div>
                </div>
                
                <div id="load-analysis" class="bg-gray-50 rounded-lg p-4">
                    <h5 class="font-medium text-gray-700 mb-2">📊 Load Analysis</h5>
                    <div id="load-analysis-content">
                        <!-- Load analysis will be calculated here -->
                    </div>
                </div>
                
                <div class="bg-purple-50 border-l-4 border-purple-400 p-4">
                    <div class="flex">
                        <div class="flex-shrink-0">
                            <svg class="h-5 w-5 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
                            </svg>
                        </div>
                        <div class="ml-3">
                            <p class="text-sm text-purple-700">
                                <strong>Performance Impact:</strong> Higher passenger count and cargo load will reduce acceleration and hill climbing ability, but we'll optimize settings accordingly.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Get popular destinations for suggestions
     */
    getPopularDestinations() {
        return [
            'Yosemite National Park',
            'Lake Tahoe',
            'Monterey Bay',
            'Big Sur',
            'Napa Valley',
            'Santa Barbara'
        ];
    }
    
    /**
     * Get special requirements options
     */
    getSpecialRequirements() {
        return [
            { value: 'mobility', icon: '♿', label: 'Mobility assistance needed' },
            { value: 'elderly', icon: '👴', label: 'Elderly passengers' },
            { value: 'children', icon: '👶', label: 'Small children/car seats' },
            { value: 'pets', icon: '🐕', label: 'Pets accompanying' },
            { value: 'medical', icon: '⚕️', label: 'Medical equipment' },
            { value: 'photography', icon: '📷', label: 'Photography equipment' }
        ];
    }
    
    /**
     * Attach modal event listeners
     */
    attachModalEventListeners() {
        // Close modal events
        document.getElementById('close-trip-modal')?.addEventListener('click', () => {
            this.closeModal();
        });
        
        document.getElementById('trip-cancel-btn')?.addEventListener('click', () => {
            this.closeModal();
        });
        
        // Navigation events
        document.getElementById('trip-next-btn')?.addEventListener('click', () => {
            this.nextStep();
        });
        
        document.getElementById('trip-prev-btn')?.addEventListener('click', () => {
            this.previousStep();
        });
        
        // Close modal when clicking outside
        document.getElementById('trip-planner-modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'trip-planner-modal') {
                this.closeModal();
            }
        });
        
        // Dynamic content events
        this.attachStepEventListeners();
    }
    
    /**
     * Attach event listeners for current step
     */
    attachStepEventListeners() {
        // Location step events
        document.getElementById('trip-destination')?.addEventListener('input', () => {
            this.showLocationSuggestions();
        });
        
        document.querySelectorAll('.destination-suggestion').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.getElementById('trip-destination').value = e.target.textContent.trim();
                this.hideLocationSuggestions();
            });
        });
        
        // Date step events
        document.getElementById('trip-start-date')?.addEventListener('change', () => {
            this.updateEndDateMin();
            this.loadWeatherPreview();
        });
        
        document.getElementById('trip-end-date')?.addEventListener('change', () => {
            this.calculateTripDuration();
        });
        
        // Weather API key configuration
        document.getElementById('save-weather-key')?.addEventListener('click', () => {
            this.saveWeatherApiKey();
        });
        
        document.getElementById('weather-api-key')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.saveWeatherApiKey();
            }
        });
        
        // Mapbox API key configuration
        document.getElementById('save-mapbox-key')?.addEventListener('click', () => {
            this.saveMapboxApiKey();
        });
        
        document.getElementById('mapbox-api-key')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.saveMapboxApiKey();
            }
        });
        
        // Details step events
        document.getElementById('trip-event-type')?.addEventListener('change', () => {
            this.updateEventSpecificTips();
        });
        
        // Passengers step events
        document.getElementById('trip-passenger-count')?.addEventListener('change', () => {
            this.updateLoadAnalysis();
        });
        
        document.getElementById('trip-cargo-load')?.addEventListener('change', () => {
            this.updateLoadAnalysis();
        });
        
        document.querySelectorAll('.special-requirement').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.updateLoadAnalysis();
            });
        });
    }
    
    /**
     * Open the trip planner modal
     */
    openModal() {
        this.isModalOpen = true;
        document.getElementById('trip-planner-modal').classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        
        // Focus on first input
        setTimeout(() => {
            const firstInput = document.querySelector('#trip-planner-modal input, #trip-planner-modal select');
            if (firstInput) {
                firstInput.focus();
            }
        }, 100);
    }
    
    /**
     * Close the trip planner modal
     */
    closeModal() {
        this.isModalOpen = false;
        document.getElementById('trip-planner-modal').classList.add('hidden');
        document.body.style.overflow = '';
        
        // Reset to first step
        this.currentStep = 1;
        this.updateModalContent();
    }
    
    /**
     * Navigate to next step
     */
    nextStep() {
        if (this.validateCurrentStep()) {
            this.saveCurrentStepData();
            
            if (this.currentStep < this.totalSteps) {
                this.currentStep++;
                this.updateModalContent();
            } else {
                this.finalizeTripPlan();
            }
        }
    }
    
    /**
     * Navigate to previous step
     */
    previousStep() {
        if (this.currentStep > 1) {
            this.currentStep--;
            this.updateModalContent();
        }
    }
    
    /**
     * Update modal content for current step
     */
    updateModalContent() {
        // Update progress bar
        const progress = (this.currentStep / this.totalSteps) * 100;
        document.getElementById('trip-progress-bar').style.width = `${progress}%`;
        document.getElementById('trip-current-step').textContent = this.currentStep;
        
        // Update step name
        const stepNames = ['Location', 'Dates', 'Details', 'Passengers'];
        document.getElementById('trip-step-name').textContent = stepNames[this.currentStep - 1];
        
        // Update content
        document.getElementById('trip-modal-content').innerHTML = this.generateStepHTML(this.currentStep);
        
        // Update navigation buttons
        document.getElementById('trip-prev-btn').disabled = this.currentStep === 1;
        document.getElementById('trip-next-btn').textContent = this.currentStep === this.totalSteps ? 'Plan Trip' : 'Next Step';
        
        // Reattach event listeners for new content
        this.attachStepEventListeners();
        
        // Load step-specific data
        this.loadStepSpecificData();
    }
    
    /**
     * Validate current step
     */
    validateCurrentStep() {
        const errors = [];
        
        switch (this.currentStep) {
            case 1:
                if (!document.getElementById('trip-destination')?.value) {
                    errors.push('Destination is required');
                }
                break;
            case 2:
                if (!document.getElementById('trip-start-date')?.value) {
                    errors.push('Start date is required');
                }
                break;
            case 3:
                if (!document.getElementById('trip-event-type')?.value) {
                    errors.push('Event type is required');
                }
                break;
            case 4:
                // No required fields for passengers step
                break;
        }
        
        if (errors.length > 0) {
            alert('Please complete all required fields:\n' + errors.join('\n'));
            return false;
        }
        
        return true;
    }
    
    /**
     * Save current step data
     */
    saveCurrentStepData() {
        switch (this.currentStep) {
            case 1:
                this.tripData.location.startPoint = document.getElementById('trip-start-point')?.value || '';
                this.tripData.location.destination = document.getElementById('trip-destination')?.value || '';
                break;
            case 2:
                this.tripData.date.startDate = document.getElementById('trip-start-date')?.value || '';
                this.tripData.date.endDate = document.getElementById('trip-end-date')?.value || '';
                this.calculateTripDuration();
                break;
            case 3:
                this.tripData.details.eventType = document.getElementById('trip-event-type')?.value || '';
                this.tripData.details.description = document.getElementById('trip-description')?.value || '';
                this.tripData.details.estimatedDistance = parseInt(document.getElementById('trip-estimated-distance')?.value) || 0;
                break;
            case 4:
                this.tripData.passengers.count = parseInt(document.getElementById('trip-passenger-count')?.value) || 2;
                this.tripData.passengers.cargoLoad = document.getElementById('trip-cargo-load')?.value || 'light';
                this.tripData.passengers.specialRequirements = Array.from(document.querySelectorAll('.special-requirement:checked')).map(cb => cb.value);
                break;
        }
    }
    
    /**
     * Load step-specific data
     */
    loadStepSpecificData() {
        switch (this.currentStep) {
            case 2:
                this.loadWeatherPreview();
                break;
            case 3:
                this.updateEventSpecificTips();
                break;
            case 4:
                this.updateLoadAnalysis();
                break;
        }
    }
    
    /**
     * Show location suggestions
     */
    showLocationSuggestions() {
        const suggestions = document.getElementById('location-suggestions');
        if (suggestions) {
            suggestions.classList.remove('hidden');
        }
    }
    
    /**
     * Hide location suggestions
     */
    hideLocationSuggestions() {
        const suggestions = document.getElementById('location-suggestions');
        if (suggestions) {
            suggestions.classList.add('hidden');
        }
    }
    
    /**
     * Update minimum end date based on start date
     */
    updateEndDateMin() {
        const startDate = document.getElementById('trip-start-date')?.value;
        const endDateInput = document.getElementById('trip-end-date');
        
        if (startDate && endDateInput) {
            endDateInput.min = startDate;
            if (endDateInput.value && endDateInput.value < startDate) {
                endDateInput.value = startDate;
            }
        }
    }
    
    /**
     * Calculate trip duration
     */
    calculateTripDuration() {
        const startDate = document.getElementById('trip-start-date')?.value;
        const endDate = document.getElementById('trip-end-date')?.value;
        
        if (startDate) {
            if (endDate && endDate !== startDate) {
                const start = new Date(startDate);
                const end = new Date(endDate);
                this.tripData.date.duration = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
            } else {
                this.tripData.date.duration = 1;
            }
        }
    }
    
    /**
     * Save weather API key
     */
    saveWeatherApiKey() {
        const apiKeyInput = document.getElementById('weather-api-key');
        const saveButton = document.getElementById('save-weather-key');
        
        if (!apiKeyInput || !saveButton) return;
        
        const apiKey = apiKeyInput.value.trim();
        
        if (!apiKey) {
            alert('Please enter a valid API key');
            return;
        }
        
        // Validate API key format (basic check)
        if (!/^[a-f0-9]{32}$/i.test(apiKey)) {
            alert('Invalid API key format. OpenWeatherMap API keys are 32-character hexadecimal strings.');
            return;
        }
        
        // Save API key
        if (window.weatherService) {
            window.weatherService.setApiKey(apiKey);
            
            // Update button text temporarily
            const originalText = saveButton.textContent;
            saveButton.textContent = 'Saved!';
            saveButton.className = saveButton.className.replace('bg-yellow-600 hover:bg-yellow-700', 'bg-green-600 hover:bg-green-700');
            
            setTimeout(() => {
                saveButton.textContent = originalText;
                saveButton.className = saveButton.className.replace('bg-green-600 hover:bg-green-700', 'bg-yellow-600 hover:bg-yellow-700');
                
                // Refresh the step content to hide the configuration
                this.updateModalContent();
            }, 2000);
            
            // Clear the input
            apiKeyInput.value = '';
        }
    }
    
    /**
     * Save Mapbox API key
     */
    saveMapboxApiKey() {
        const apiKeyInput = document.getElementById('mapbox-api-key');
        const saveButton = document.getElementById('save-mapbox-key');
        
        if (!apiKeyInput || !saveButton) return;
        
        const apiKey = apiKeyInput.value.trim();
        
        if (!apiKey) {
            alert('Please enter a valid API key');
            return;
        }
        
        // Validate API key format (basic check for Mapbox)
        if (!/^pk\.[a-zA-Z0-9._-]+$/.test(apiKey)) {
            alert('Invalid Mapbox API key format. Mapbox keys start with "pk." followed by alphanumeric characters.');
            return;
        }
        
        // Save API key
        if (window.terrainService) {
            window.terrainService.setMapboxApiKey(apiKey);
            
            // Update button text temporarily
            const originalText = saveButton.textContent;
            saveButton.textContent = 'Saved!';
            saveButton.className = saveButton.className.replace('bg-blue-600 hover:bg-blue-700', 'bg-green-600 hover:bg-green-700');
            
            setTimeout(() => {
                saveButton.textContent = originalText;
                saveButton.className = saveButton.className.replace('bg-green-600 hover:bg-green-700', 'bg-blue-600 hover:bg-blue-700');
                
                // Refresh the step content to hide the configuration
                this.updateModalContent();
            }, 2000);
            
            // Clear the input
            apiKeyInput.value = '';
        }
    }
    
    /**
     * Load weather preview
     */
    async loadWeatherPreview() {
        const destination = this.tripData.location.destination;
        const startDate = document.getElementById('trip-start-date')?.value;
        
        if (destination && startDate) {
            const previewDiv = document.getElementById('weather-preview');
            const contentDiv = document.getElementById('weather-preview-content');
            
            if (previewDiv && contentDiv) {
                previewDiv.classList.remove('hidden');
                contentDiv.innerHTML = '<div class="text-center text-gray-500">Loading weather data...</div>';
                
                try {
                    let weatherData;
                    
                    // Use real weather service if configured
                    if (window.weatherService && window.weatherService.isConfigured()) {
                        weatherData = await window.weatherService.getWeatherForDate(destination, startDate);
                    } else {
                        // Fall back to simulated data
                        weatherData = await this.getWeatherData(destination, startDate);
                    }
                    
                    contentDiv.innerHTML = this.formatWeatherPreview(weatherData);
                } catch (error) {
                    console.error('Weather preview error:', error);
                    contentDiv.innerHTML = `
                        <div class="text-red-500 text-sm">
                            <div class="font-medium">Weather data unavailable</div>
                            <div class="text-xs mt-1">${error.message || 'Unknown error'}</div>
                        </div>
                    `;
                }
            }
        }
    }
    
    /**
     * Format weather preview HTML
     */
    formatWeatherPreview(weatherData) {
        // Handle different data formats from weather service vs simulated data
        const temperature = weatherData.temperature || weatherData.temperature?.avg || 'N/A';
        const tempRange = weatherData.temperatureRange ? 
            ` (${weatherData.temperatureRange.min}-${weatherData.temperatureRange.max}°F)` : '';
        
        const conditions = weatherData.conditions || weatherData.description || 'N/A';
        const precipitation = weatherData.precipitation?.probability || weatherData.precipitation || 0;
        const windSpeed = weatherData.wind?.speed || weatherData.windSpeed || 'N/A';
        const humidity = weatherData.humidity || 'N/A';
        
        const sourceLabel = weatherData.source === 'openweathermap' ? '🌐 Live Data' :
                           weatherData.source === 'openweathermap-forecast' ? '🌐 Forecast' :
                           weatherData.isEstimate ? '📊 Estimate' : '🔮 Simulated';
        
        return `
            <div class="space-y-3">
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div class="text-center">
                        <div class="font-medium">${temperature}°F${tempRange}</div>
                        <div class="text-gray-500">Temperature</div>
                    </div>
                    <div class="text-center">
                        <div class="font-medium">${conditions}</div>
                        <div class="text-gray-500">Conditions</div>
                    </div>
                    <div class="text-center">
                        <div class="font-medium">${typeof precipitation === 'number' ? 
                            (precipitation > 1 ? precipitation.toFixed(1) + ' in' : Math.round(precipitation * 100) + '%') : 
                            precipitation
                        }</div>
                        <div class="text-gray-500">Precipitation</div>
                    </div>
                    <div class="text-center">
                        <div class="font-medium">${windSpeed} mph</div>
                        <div class="text-gray-500">Wind</div>
                    </div>
                </div>
                
                ${humidity !== 'N/A' ? `
                    <div class="text-center text-xs text-gray-500">
                        Humidity: ${humidity}% | ${sourceLabel}
                    </div>
                ` : `
                    <div class="text-center text-xs text-gray-500">
                        ${sourceLabel}
                    </div>
                `}
                
                ${weatherData.error ? `
                    <div class="text-xs text-yellow-600 text-center">
                        ⚠️ ${weatherData.error}
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    /**
     * Update event-specific tips
     */
    updateEventSpecificTips() {
        const eventType = document.getElementById('trip-event-type')?.value;
        const tipElement = document.getElementById('event-tip-text');
        
        if (tipElement) {
            const tips = {
                camping: 'Camping trips require heavy load optimization and extended range settings for remote areas.',
                touring: 'Touring trips benefit from balanced settings with emphasis on comfort and moderate speed.',
                parade: 'Parade events need low-speed optimization with enhanced motor protection for stop-and-go driving.',
                beach: 'Beach trips may involve sand and salt air - consider motor protection and corrosion resistance.',
                mountains: 'Mountain adventures require maximum hill climbing power and regenerative braking optimization.',
                shopping: 'Shopping trips involve frequent stops and urban driving - optimize for acceleration and efficiency.',
                family: 'Family outings prioritize safety and comfort with gentle acceleration and stable handling.',
                photography: 'Photography trips need quiet operation and precise speed control for stable shots.',
                other: 'Custom event - settings will be optimized based on your specific requirements.'
            };
            
            tipElement.textContent = tips[eventType] || 'Select an event type to see specific optimization tips.';
        }
    }
    
    /**
     * Update load analysis
     */
    updateLoadAnalysis() {
        const passengerCount = parseInt(document.getElementById('trip-passenger-count')?.value) || 2;
        const cargoLoad = document.getElementById('trip-cargo-load')?.value || 'light';
        const specialReqs = Array.from(document.querySelectorAll('.special-requirement:checked')).map(cb => cb.value);
        
        const analysisDiv = document.getElementById('load-analysis-content');
        if (analysisDiv) {
            const loadFactors = this.calculateLoadFactors(passengerCount, cargoLoad, specialReqs);
            analysisDiv.innerHTML = this.formatLoadAnalysis(loadFactors);
        }
    }
    
    /**
     * Calculate load factors
     */
    calculateLoadFactors(passengerCount, cargoLoad, specialReqs) {
        let totalWeight = passengerCount * 160; // Average person weight
        
        const cargoWeights = {
            light: 50,
            medium: 150,
            heavy: 300,
            maximum: 500
        };
        
        totalWeight += cargoWeights[cargoLoad] || 0;
        
        // Add weight for special requirements
        if (specialReqs.includes('medical')) totalWeight += 30;
        if (specialReqs.includes('photography')) totalWeight += 20;
        if (specialReqs.includes('pets')) totalWeight += 25;
        
        const maxCapacity = 1200; // Typical GEM capacity
        const loadPercentage = Math.min((totalWeight / maxCapacity) * 100, 100);
        
        return {
            totalWeight,
            loadPercentage,
            accelerationImpact: Math.round((loadPercentage / 100) * 30),
            hillClimbingImpact: Math.round((loadPercentage / 100) * 25),
            rangeImpact: Math.round((loadPercentage / 100) * 15)
        };
    }
    
    /**
     * Format load analysis HTML
     */
    formatLoadAnalysis(factors) {
        return `
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div class="text-center">
                    <div class="font-medium">${factors.totalWeight} lbs</div>
                    <div class="text-gray-500">Total Load</div>
                </div>
                <div class="text-center">
                    <div class="font-medium">${Math.round(factors.loadPercentage)}%</div>
                    <div class="text-gray-500">Capacity</div>
                </div>
                <div class="text-center">
                    <div class="font-medium text-orange-600">-${factors.accelerationImpact}%</div>
                    <div class="text-gray-500">Acceleration</div>
                </div>
                <div class="text-center">
                    <div class="font-medium text-red-600">-${factors.hillClimbingImpact}%</div>
                    <div class="text-gray-500">Hill Climbing</div>
                </div>
            </div>
        `;
    }
    
    /**
     * Finalize trip plan and generate optimization
     */
    async finalizeTripPlan() {
        this.saveCurrentStepData();
        
        // Show loading state
        document.getElementById('trip-modal-content').innerHTML = `
            <div class="text-center py-8">
                <div class="spinner mb-4"></div>
                <h4 class="text-lg font-semibold mb-2">Planning Your Trip</h4>
                <p class="text-gray-600">Analyzing weather, terrain, and optimizing controller settings...</p>
            </div>
        `;
        
        try {
            // Get weather data
            if (window.weatherService && window.weatherService.isConfigured()) {
                this.weatherData = await window.weatherService.getWeatherForDate(
                    this.tripData.location.destination,
                    this.tripData.date.startDate
                );
            } else {
                this.weatherData = await this.getWeatherData(
                    this.tripData.location.destination,
                    this.tripData.date.startDate
                );
            }
            
            // Get terrain data
            if (window.terrainService) {
                this.terrainData = await window.terrainService.analyzeRoute(
                    this.tripData.location.startPoint || 'Current Location',
                    this.tripData.location.destination
                );
            } else {
                this.terrainData = await this.getTerrainData(
                    this.tripData.location.startPoint,
                    this.tripData.location.destination
                );
            }
            
            // Generate optimization
            const optimization = await this.generateTripOptimization();
            
            // Show results
            this.showTripPlanResults(optimization);
            
        } catch (error) {
            console.error('Error finalizing trip plan:', error);
            this.showTripPlanError();
        }
    }
    
    /**
     * Show trip plan results
     */
    showTripPlanResults(optimization) {
        document.getElementById('trip-modal-content').innerHTML = `
            <div class="space-y-6">
                <div class="text-center">
                    <h4 class="text-xl font-bold text-green-600 mb-2">🎉 Trip Plan Complete!</h4>
                    <p class="text-gray-600">Your GEM has been optimized for the perfect outing</p>
                    ${optimization.confidence ? `<p class="text-sm text-gray-500 mt-1">Optimization confidence: ${optimization.confidence}%</p>` : ''}
                </div>
                
                <div class="grid md:grid-cols-2 gap-6">
                    <div class="bg-blue-50 rounded-lg p-4">
                        <h5 class="font-semibold mb-2">🌤️ Weather Forecast</h5>
                        <div class="text-sm space-y-1">
                            <div>Temperature: ${this.weatherData.temperature?.avg || this.weatherData.temperature || 'N/A'}°F</div>
                            <div>Conditions: ${this.weatherData.conditions || 'Clear'}</div>
                            <div>Precipitation: ${this.weatherData.precipitation?.probability || this.weatherData.precipitation || 0}%</div>
                        </div>
                    </div>
                    
                    <div class="bg-green-50 rounded-lg p-4">
                        <h5 class="font-semibold mb-2">⛰️ Terrain Analysis</h5>
                        <div class="text-sm space-y-1">
                            <div>Distance: ${this.terrainData.distance || this.terrainData.totalDistance || 'N/A'} miles</div>
                            <div>Elevation Gain: ${this.terrainData.elevationGain || 'N/A'} ft</div>
                            <div>Max Grade: ${this.terrainData.maxGrade || 'N/A'}%</div>
                            <div>Difficulty: ${this.terrainData.classification?.level || this.terrainData.terrainType || 'Unknown'}</div>
                            ${this.terrainData.difficultyScore ? `<div>Score: ${this.terrainData.difficultyScore}/100</div>` : ''}
                        </div>
                    </div>
                </div>
                
                <div class="bg-purple-50 rounded-lg p-4">
                    <h5 class="font-semibold mb-3">⚙️ Controller Optimization</h5>
                    <div class="text-sm space-y-2">
                        ${optimization.changes.map(change => `
                            <div class="flex justify-between">
                                <span>${change.description}</span>
                                <span class="font-medium">${change.value}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                ${optimization.report?.expectedPerformance ? `
                <div class="bg-indigo-50 rounded-lg p-4">
                    <h5 class="font-semibold mb-2">📊 Expected Performance</h5>
                    <div class="text-sm space-y-1">
                        <div>Estimated Range: ${optimization.report.expectedPerformance.estimatedRange} miles</div>
                        <div>Top Speed: ${optimization.report.expectedPerformance.topSpeed} mph</div>
                        <div>Hill Climbing: ${optimization.report.expectedPerformance.hillClimbingAbility}%</div>
                        <div>Efficiency Rating: ${optimization.report.expectedPerformance.efficiencyRating}%</div>
                    </div>
                </div>
                ` : ''}
                
                <div class="bg-yellow-50 rounded-lg p-4">
                    <h5 class="font-semibold mb-2">💡 Trip Recommendations</h5>
                    <ul class="text-sm space-y-1">
                        ${optimization.recommendations.map(rec => `<li>• ${rec}</li>`).join('')}
                    </ul>
                </div>
            </div>
        `;
        
        // Update button to apply settings
        document.getElementById('trip-next-btn').textContent = 'Apply Settings';
        document.getElementById('trip-next-btn').onclick = () => {
            this.applyTripOptimization(optimization);
        };
    }
    
    /**
     * Show trip plan error
     */
    showTripPlanError() {
        document.getElementById('trip-modal-content').innerHTML = `
            <div class="text-center py-8">
                <div class="text-red-500 mb-4">
                    <svg class="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.93L13.732 4.242a2 2 0 00-3.464 0L3.34 16.07c-.77 1.263.192 2.93 1.732 2.93z"></path>
                    </svg>
                </div>
                <h4 class="text-lg font-semibold mb-2">Planning Error</h4>
                <p class="text-gray-600 mb-4">Unable to complete trip analysis. Using default weekend outing settings.</p>
                <button onclick="window.uiController.selectPreset('weekend-outing')" 
                        class="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                    Use Default Settings
                </button>
            </div>
        `;
    }
    
    /**
     * Apply trip optimization and close modal
     */
    applyTripOptimization(optimization) {
        // Store the trip data and optimization for the main UI controller
        if (window.uiController) {
            window.uiController.inputData.tripPlanning = this.tripData;
            window.uiController.inputData.tripOptimization = optimization;
            window.uiController.inputData.weatherData = this.weatherData;
            window.uiController.inputData.terrainData = this.terrainData;
            
            // If we have optimized settings from TripOptimizer, store them
            if (optimization.optimizedSettings) {
                window.uiController.tripOptimizedSettings = optimization.optimizedSettings;
            }
            
            // Apply the weekend outing preset with trip-specific modifications
            window.uiController.selectPreset('weekend-outing');
        }
        
        this.closeModal();
    }
    
    /**
     * Generate trip-specific optimization
     */
    async generateTripOptimization() {
        // Use TripOptimizer if available
        if (window.tripOptimizer) {
            try {
                // Prepare trip data in the format expected by TripOptimizer
                const tripData = {
                    vehicle: {
                        model: window.uiController?.inputData?.vehicle?.model || 'e4',
                        topSpeed: window.uiController?.inputData?.vehicle?.topSpeed || 25,
                        motorCondition: window.uiController?.inputData?.vehicle?.motorCondition || 'good'
                    },
                    battery: window.uiController?.inputData?.battery || {
                        type: 'lead',
                        voltage: 72,
                        capacity: 150,
                        age: 'good'
                    },
                    wheel: window.uiController?.inputData?.wheel || {
                        tireDiameter: 22,
                        gearRatio: 8.91
                    },
                    weather: this.weatherData,
                    terrain: this.terrainData,
                    location: this.tripData.location,
                    date: this.tripData.date,
                    details: this.tripData.details,
                    passengers: this.tripData.passengers
                };
                
                // Run optimization through TripOptimizer
                const result = await window.tripOptimizer.optimizeForTrip(tripData);
                
                if (result.success) {
                    // Convert TripOptimizer format to expected format
                    const changes = [];
                    const recommendations = [];
                    
                    // Extract key optimizations
                    if (result.report?.keyOptimizations) {
                        result.report.keyOptimizations.forEach(opt => {
                            changes.push({
                                description: opt.function,
                                value: opt.adjustment,
                                reason: opt.reason
                            });
                        });
                    }
                    
                    // Extract recommendations
                    if (result.report?.recommendations) {
                        result.report.recommendations.forEach(rec => {
                            if (rec.items) {
                                recommendations.push(...rec.items);
                            }
                        });
                    }
                    
                    // Add warnings
                    if (result.report?.warnings) {
                        result.report.warnings.forEach(warning => {
                            recommendations.push(`⚠️ ${warning.message}`);
                        });
                    }
                    
                    // Add performance metrics
                    if (result.report?.expectedPerformance) {
                        const perf = result.report.expectedPerformance;
                        recommendations.push(`Expected range: ${perf.estimatedRange} miles (${perf.efficiencyRating}% efficiency)`);
                    }
                    
                    return {
                        changes: changes.slice(0, 10), // Limit to top 10 changes
                        recommendations: recommendations.slice(0, 8), // Limit to top 8 recommendations
                        optimizedSettings: result.optimization?.optimizedSettings || {},
                        confidence: result.confidence || 85,
                        analysis: result.analysis,
                        report: result.report
                    };
                }
            } catch (error) {
                console.error('TripOptimizer error:', error);
                // Fall back to legacy optimization
            }
        }
        
        // Legacy optimization code (fallback)
        const changes = [];
        const recommendations = [];
        
        // Weather-based optimizations
        if (this.weatherData) {
            const temp = this.weatherData.temperature?.avg || this.weatherData.temperature;
            if (temp < 40) {
                changes.push({ description: 'F4 (Max Current) reduced for cold weather', value: '-10' });
                recommendations.push('Cold weather detected: Battery performance may be reduced by 15-20%');
            } else if (temp > 85) {
                changes.push({ description: 'F4 (Max Current) reduced for heat protection', value: '-15' });
                changes.push({ description: 'F6 (Acceleration) gentler for motor cooling', value: '+5' });
                recommendations.push('Hot weather: Monitor motor temperature and take breaks as needed');
            }
            
            const precipitation = this.weatherData.precipitation?.probability || this.weatherData.precipitation || 0;
            if (precipitation > 30) {
                changes.push({ description: 'F9 (Regen) enhanced for wet conditions', value: '+10' });
                recommendations.push('Rain expected: Reduce speed and increase following distance');
            }
        }
        
        // Terrain-based optimizations
        if (this.terrainData) {
            const maxGrade = this.terrainData.maxGrade;
            const elevationGain = this.terrainData.elevationGain;
            const difficultyScore = this.terrainData.difficultyScore;
            const distance = this.terrainData.distance || this.terrainData.totalDistance;
            
            // Grade-based optimizations
            if (maxGrade > 20) {
                changes.push({ description: 'F7 (Min Field) maximized for extreme climbs', value: '+12' });
                changes.push({ description: 'F4 (Max Current) boosted for power', value: '+15' });
                changes.push({ description: 'F24 (Field Weakening) minimized for torque', value: '+15' });
                recommendations.push('Extreme grades detected: Verify route is suitable for GEM vehicle');
                recommendations.push('Consider alternative route if possible');
            } else if (maxGrade > 15) {
                changes.push({ description: 'F7 (Min Field) increased for hill climbing', value: '+8' });
                changes.push({ description: 'F24 (Field Weakening) delayed for torque', value: '+10' });
                recommendations.push('Steep terrain: Use low gear and monitor motor temperature on climbs');
            } else if (maxGrade > 10) {
                changes.push({ description: 'F7 (Min Field) optimized for moderate hills', value: '+5' });
                recommendations.push('Moderate hills: Maintain steady speed on climbs');
            }
            
            // Elevation gain optimizations
            if (elevationGain > 2000) {
                changes.push({ description: 'F10 (Regen Field) maximized for descents', value: '+20' });
                changes.push({ description: 'F9 (Regen) enhanced for energy recovery', value: '+12' });
                recommendations.push('Significant elevation gain: Take advantage of regenerative braking');
                recommendations.push('Plan for 20-30% range reduction due to climbing');
            } else if (elevationGain > 1000) {
                changes.push({ description: 'F9 (Regen) optimized for energy recovery', value: '+8' });
                recommendations.push('Moderate elevation gain: Use regenerative braking on descents');
            }
            
            // Distance optimizations
            if (distance > 40) {
                changes.push({ description: 'F3 (Acceleration) tuned for efficiency', value: '+3' });
                changes.push({ description: 'F6 (Accel Rate) gentled for range', value: '+2' });
                recommendations.push('Long distance: Plan charging stops and drive conservatively');
            }
            
            // Difficulty-based recommendations
            if (difficultyScore > 80) {
                recommendations.push('Extreme terrain difficulty: Consider professional route assessment');
                recommendations.push('Ensure emergency communication devices are available');
            } else if (difficultyScore > 60) {
                recommendations.push('Challenging terrain: Allow extra time and plan rest stops');
                recommendations.push('Monitor battery levels closely throughout journey');
            }
            
            // Add terrain-specific tips from service
            if (this.terrainData.recommendations) {
                recommendations.push(...this.terrainData.recommendations.slice(0, 3));
            }
        }
        
        // Load-based optimizations
        const loadFactors = this.calculateLoadFactors(
            this.tripData.passengers.count,
            this.tripData.passengers.cargoLoad,
            this.tripData.passengers.specialRequirements
        );
        
        if (loadFactors.loadPercentage > 70) {
            changes.push({ description: 'F4 (Max Current) increased for heavy load', value: '+10' });
            changes.push({ description: 'F10 (Regen Field) enhanced for braking', value: '+15' });
            recommendations.push('Heavy load: Allow extra distance for braking and reduced acceleration');
        }
        
        // Event-specific optimizations
        if (this.tripData.details.eventType === 'parade') {
            changes.push({ description: 'F3 (Acceleration) gentled for parade speeds', value: '+5' });
            recommendations.push('Parade driving: Maintain steady low speeds and avoid sudden movements');
        } else if (this.tripData.details.eventType === 'camping') {
            changes.push({ description: 'F26 (Field Ratio) optimized for loaded touring', value: '+1' });
            recommendations.push('Camping trip: Check tire pressure and secure all cargo before departure');
        }
        
        // Default recommendations
        if (recommendations.length === 0) {
            recommendations.push('Enjoy your trip! Settings have been optimized for your specific conditions');
        }
        
        recommendations.push('Always save your original settings before making changes');
        recommendations.push('Test drive at low speeds first to verify optimal performance');
        
        return {
            changes: changes,
            recommendations: recommendations
        };
    }
    
    // Legacy API methods for compatibility
    async getWeatherData(location, date) {
        try {
            const coords = await this.geocodeLocation(location);
            const dateObj = new Date(date);
            const daysFromNow = Math.ceil((dateObj - new Date()) / (1000 * 60 * 60 * 24));
            
            if (daysFromNow <= 5) {
                return await this.getWeatherForecast(coords.lat, coords.lon, dateObj);
            } else {
                return this.getHistoricalWeather(coords.lat, coords.lon, dateObj);
            }
        } catch (error) {
            console.error('Weather API error:', error);
            return this.getDefaultWeather();
        }
    }
    
    async getWeatherForecast(lat, lon, date) {
        // Simulate API response
        const baseTemp = this.getSeasonalTemp(date);
        const conditions = ['Clear', 'Partly Cloudy', 'Cloudy', 'Light Rain'][Math.floor(Math.random() * 4)];
        
        return {
            temperature: Math.round(baseTemp + (Math.random() * 20 - 10)),
            conditions: conditions,
            precipitation: conditions.includes('Rain') ? Math.round(Math.random() * 60 + 20) : Math.round(Math.random() * 20),
            windSpeed: Math.round(Math.random() * 15 + 5),
            humidity: Math.round(Math.random() * 30 + 40)
        };
    }
    
    async getTerrainData(start, end) {
        // Simulate API response
        const destination = end.toLowerCase();
        let classification = 'mixed';
        let maxGrade = 8;
        let distance = Math.round(Math.random() * 50 + 20);
        
        if (destination.includes('mountain') || destination.includes('yosemite')) {
            classification = 'steep';
            maxGrade = 18;
        } else if (destination.includes('hill')) {
            classification = 'moderate';
            maxGrade = 12;
        } else if (destination.includes('beach') || destination.includes('coast')) {
            classification = 'flat';
            maxGrade = 4;
        }
        
        return {
            distance: distance,
            maxGrade: maxGrade,
            avgGrade: Math.round(maxGrade * 0.4),
            elevationGain: Math.round(maxGrade * 50),
            classification: classification
        };
    }
    
    async geocodeLocation(location) {
        // Simulate geocoding
        const locations = {
            'yosemite': { lat: 37.8651, lng: -119.5383 },
            'san francisco': { lat: 37.7749, lng: -122.4194 },
            'los angeles': { lat: 34.0522, lng: -118.2437 },
            'default': { lat: 37.3861, lng: -122.0839 }
        };
        
        const key = location.toLowerCase();
        for (const [name, coords] of Object.entries(locations)) {
            if (key.includes(name)) {
                return { lat: coords.lat, lon: coords.lng };
            }
        }
        
        return locations.default;
    }
    
    getSeasonalTemp(dateStr) {
        const date = new Date(dateStr);
        const month = date.getMonth();
        
        if (month >= 11 || month <= 2) return 45; // Winter
        if (month >= 3 && month <= 5) return 65;  // Spring
        if (month >= 6 && month <= 8) return 85;  // Summer
        return 60; // Fall
    }
    
    getDefaultWeather() {
        return {
            temperature: { min: 60, max: 75, avg: 68 },
            conditions: 'clear',
            precipitation: { probability: 10, amount: 0 },
            wind: { speed: 5, direction: 'W' },
            humidity: 50
        };
    }
    
    getDefaultTerrain() {
        return {
            totalDistance: 10,
            elevationGain: 100,
            elevationLoss: 100,
            maxGrade: 8,
            avgGrade: 4,
            terrainType: 'rolling'
        };
    }
    
    generateRecommendations(tripData, vehicleData) {
        const recommendations = {
            settings: {},
            tips: [],
            warnings: []
        };
        
        // Weather-based recommendations
        if (tripData.weather) {
            if (tripData.weather.temperature.max > 85) {
                recommendations.tips.push('High temperatures expected - consider reducing acceleration settings to prevent motor overheating');
                recommendations.settings.temperatureMode = 'hot';
            }
            
            if (tripData.weather.precipitation.probability > 50) {
                recommendations.tips.push('Rain likely - regenerative braking may be less effective on wet surfaces');
                recommendations.warnings.push('Wet conditions - allow extra stopping distance');
            }
        }
        
        // Terrain-based recommendations
        if (tripData.terrain) {
            if (tripData.terrain.maxGrade > 15) {
                recommendations.tips.push('Steep hills detected - ensure battery is fully charged');
                recommendations.settings.hillMode = 'steep';
            }
            
            if (tripData.terrain.totalDistance > 20) {
                recommendations.tips.push('Long distance trip - optimize for range over performance');
                recommendations.settings.rangeMode = 'extended';
            }
        }
        
        return recommendations;
    }
}

// Make TripPlanner available globally
window.TripPlanner = TripPlanner;

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TripPlanner;
}
/**
 * Maps Configuration and Service Manager
 * Handles backend-proxied Google Maps API and OpenStreetMap/Leaflet alternatives
 */

class MapsConfig {
    constructor() {
        this.backendAPI = window.backendAPI || new BackendAPIClient();
        this.preferredService = 'auto'; // 'google', 'osm', or 'auto'
        this.googleMapsAvailable = false;
        this.leafletLoaded = false;
        this.currentService = null;
        
        this.initialize();
    }
    
    /**
     * Initialize maps configuration
     */
    async initialize() {
        // Load preferred service from storage
        this.preferredService = localStorage.getItem('maps_preferred_service') || 'auto';
        
        // Check which services are available
        await this.checkAvailableServices();
        
        // Auto-select best available service
        if (this.preferredService === 'auto') {
            this.currentService = this.selectBestService();
        } else {
            this.currentService = this.preferredService;
        }
        
        console.log(`Maps Config initialized. Using: ${this.currentService}`);
    }
    
    /**
     * Check which mapping services are available
     */
    async checkAvailableServices() {
        // Check if backend has Google Maps support
        try {
            const features = await this.backendAPI.getSupportedFeatures();
            this.googleMapsAvailable = features.maps === true;
        } catch (error) {
            console.warn('Could not check backend maps support:', error.message);
            this.googleMapsAvailable = false;
        }
        
        // Leaflet/OpenStreetMap is always available (no API key needed)
        this.leafletLoaded = true;
    }
    
    /**
     * Select best available service
     */
    selectBestService() {
        // Prefer Google Maps if configured
        if (this.googleMapsLoaded) {
            return 'google';
        }
        
        // Fallback to OpenStreetMap
        return 'osm';
    }
    
    /**
     * Set preferred mapping service
     */
    setPreferredService(service) {
        if (['google', 'osm', 'auto'].includes(service)) {
            this.preferredService = service;
            localStorage.setItem('maps_preferred_service', service);
            
            if (service !== 'auto') {
                this.currentService = service;
            } else {
                this.currentService = this.selectBestService();
            }
            
            // Dispatch event for UI updates
            window.dispatchEvent(new CustomEvent('mapsServiceChanged', {
                detail: { service: this.currentService }
            }));
        }
    }
    
    /**
     * Get current mapping service
     */
    getCurrentService() {
        return this.currentService;
    }
    
    /**
     * Check if Google Maps is available
     */
    isGoogleMapsAvailable() {
        return this.googleMapsLoaded;
    }
    
    /**
     * Show configuration UI
     */
    showConfigUI() {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
                <div class="p-6">
                    <h2 class="text-2xl font-bold mb-4">Maps Configuration</h2>
                    
                    <!-- Service Selection -->
                    <div class="mb-6">
                        <h3 class="text-lg font-semibold mb-3">Select Mapping Service</h3>
                        <div class="space-y-3">
                            <label class="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                                <input type="radio" name="maps-service" value="auto" 
                                    ${this.preferredService === 'auto' ? 'checked' : ''} 
                                    class="mr-3">
                                <div>
                                    <div class="font-medium">Auto-select (Recommended)</div>
                                    <div class="text-sm text-gray-600">Use Google Maps if available, otherwise OpenStreetMap</div>
                                </div>
                            </label>
                            
                            <label class="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                                <input type="radio" name="maps-service" value="google" 
                                    ${this.preferredService === 'google' ? 'checked' : ''} 
                                    class="mr-3">
                                <div>
                                    <div class="font-medium">Google Maps</div>
                                    <div class="text-sm text-gray-600">
                                        Premium features, requires API key
                                        ${this.googleMapsLoaded ? 
                                            '<span class="text-green-600">(Configured)</span>' : 
                                            '<span class="text-red-600">(Not configured)</span>'}
                                    </div>
                                </div>
                            </label>
                            
                            <label class="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                                <input type="radio" name="maps-service" value="osm" 
                                    ${this.preferredService === 'osm' ? 'checked' : ''} 
                                    class="mr-3">
                                <div>
                                    <div class="font-medium">OpenStreetMap</div>
                                    <div class="text-sm text-gray-600">Free, no API key required</div>
                                </div>
                            </label>
                        </div>
                    </div>
                    
                    <!-- Google Maps API Configuration -->
                    <div class="mb-6" id="google-maps-config">
                        <h3 class="text-lg font-semibold mb-3">Google Maps API Configuration</h3>
                        
                        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                            <h4 class="font-medium text-blue-900 mb-2">Setup Instructions:</h4>
                            <ol class="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                                <li>Go to <a href="https://console.cloud.google.com/" target="_blank" class="underline">Google Cloud Console</a></li>
                                <li>Create a new project or select existing</li>
                                <li>Enable "Maps JavaScript API" and "Places API"</li>
                                <li>Create credentials (API Key)</li>
                                <li>Restrict the key to your domain for security</li>
                                <li>Copy and paste the API key below</li>
                            </ol>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium mb-1">Google Maps API Key</label>
                            <div class="flex space-x-2">
                                <input type="password" 
                                    id="google-maps-api-key" 
                                    placeholder="Enter your Google Maps API key"
                                    value="${this.apiManager.apis.googleMaps.key || ''}"
                                    class="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                                <button onclick="mapsConfig.testGoogleMapsKey()" 
                                    class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                                    Test
                                </button>
                            </div>
                            <div id="google-maps-test-result" class="mt-2 text-sm"></div>
                        </div>
                    </div>
                    
                    <!-- OSM Information -->
                    <div class="mb-6">
                        <h3 class="text-lg font-semibold mb-3">OpenStreetMap Information</h3>
                        <div class="bg-green-50 border border-green-200 rounded-lg p-4">
                            <h4 class="font-medium text-green-900 mb-2">✓ No Configuration Required</h4>
                            <p class="text-sm text-green-800">
                                OpenStreetMap is free and doesn't require an API key. It provides:
                            </p>
                            <ul class="text-sm text-green-800 mt-2 space-y-1 list-disc list-inside">
                                <li>Legal route calculation for LSVs and golf carts</li>
                                <li>Street maps and satellite imagery</li>
                                <li>Community-maintained cart path data</li>
                                <li>No usage limits or fees</li>
                            </ul>
                        </div>
                    </div>
                    
                    <!-- Current Status -->
                    <div class="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <h4 class="font-medium mb-2">Current Status</h4>
                        <p class="text-sm">Active Service: <span class="font-semibold">${this.currentService === 'google' ? 'Google Maps' : 'OpenStreetMap'}</span></p>
                    </div>
                    
                    <!-- Actions -->
                    <div class="mt-6 flex justify-end space-x-3">
                        <button onclick="mapsConfig.closeConfigUI()" 
                            class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                            Cancel
                        </button>
                        <button onclick="mapsConfig.saveConfiguration()" 
                            class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                            Save Configuration
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        this.configModal = modal;
        
        // Add event listeners
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeConfigUI();
            }
        });
    }
    
    /**
     * Test Google Maps API key
     */
    async testGoogleMapsKey() {
        const keyInput = document.getElementById('google-maps-api-key');
        const resultDiv = document.getElementById('google-maps-test-result');
        const key = keyInput.value.trim();
        
        if (!key) {
            resultDiv.innerHTML = '<span class="text-red-600">Please enter an API key</span>';
            return;
        }
        
        resultDiv.innerHTML = '<span class="text-gray-600">Testing API key...</span>';
        
        try {
            const testUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=test&key=${key}`;
            const response = await fetch(testUrl);
            const data = await response.json();
            
            if (data.status === 'OK' || data.status === 'ZERO_RESULTS') {
                resultDiv.innerHTML = '<span class="text-green-600">✓ API key is valid</span>';
                this.apiManager.setAPIKey('googleMaps', key);
            } else if (data.status === 'REQUEST_DENIED') {
                resultDiv.innerHTML = '<span class="text-red-600">✗ Invalid API key or not properly configured</span>';
            } else {
                resultDiv.innerHTML = `<span class="text-yellow-600">⚠ Unexpected response: ${data.status}</span>`;
            }
        } catch (error) {
            resultDiv.innerHTML = '<span class="text-red-600">✗ Failed to test API key</span>';
        }
    }
    
    /**
     * Save configuration
     */
    saveConfiguration() {
        // Get selected service
        const selectedService = document.querySelector('input[name="maps-service"]:checked').value;
        
        // Save Google Maps API key if provided
        const googleMapsKey = document.getElementById('google-maps-api-key').value.trim();
        if (googleMapsKey) {
            this.apiManager.setAPIKey('googleMaps', googleMapsKey);
        }
        
        // Update preferred service
        this.setPreferredService(selectedService);
        
        // Close modal
        this.closeConfigUI();
        
        // Show success message
        this.showMessage('Maps configuration saved successfully', 'success');
        
        // Reload mapping service if needed
        if (window.location.pathname.includes('route') || window.location.pathname.includes('map')) {
            setTimeout(() => window.location.reload(), 1000);
        }
    }
    
    /**
     * Close configuration UI
     */
    closeConfigUI() {
        if (this.configModal) {
            this.configModal.remove();
            this.configModal = null;
        }
    }
    
    /**
     * Show message
     */
    showMessage(message, type = 'info') {
        const messageDiv = document.createElement('div');
        messageDiv.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
            type === 'success' ? 'bg-green-500 text-white' :
            type === 'error' ? 'bg-red-500 text-white' :
            'bg-blue-500 text-white'
        }`;
        messageDiv.textContent = message;
        
        document.body.appendChild(messageDiv);
        
        setTimeout(() => messageDiv.remove(), 3000);
    }
}

// Create global instance
window.mapsConfig = new MapsConfig();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MapsConfig;
}
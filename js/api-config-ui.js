/**
 * API Configuration UI
 * Comprehensive interface for managing all API integrations
 */
class APIConfigUI {
    constructor() {
        this.apiManager = window.apiManager || new APIManager();
        this.modal = null;
        this.statusIndicators = new Map();
        
        this.apiInfo = {
            googleMaps: {
                name: 'Google Maps',
                description: 'Legal route filtering, cart paths, traffic data',
                docsUrl: 'https://developers.google.com/maps',
                requiredFeatures: ['Directions API', 'Places API', 'Elevation API'],
                icon: '🗺️'
            },
            openai: {
                name: 'OpenAI',
                description: 'Advanced PDF analysis and text extraction',
                docsUrl: 'https://platform.openai.com/docs',
                requiredModel: 'GPT-4 Vision',
                icon: '🤖'
            },
            claude: {
                name: 'Claude (Anthropic)',
                description: 'Superior PDF understanding and analysis',
                docsUrl: 'https://docs.anthropic.com',
                requiredModel: 'Claude 3',
                icon: '🧠'
            },
            mapbox: {
                name: 'Mapbox',
                description: 'Elevation data and terrain analysis',
                docsUrl: 'https://docs.mapbox.com',
                requiredFeatures: ['Tilequery API'],
                icon: '🏔️'
            },
            openweather: {
                name: 'OpenWeatherMap',
                description: 'Weather conditions affecting vehicle performance',
                docsUrl: 'https://openweathermap.org/api',
                requiredPlan: 'Free tier available',
                icon: '🌤️'
            }
        };
        
        this.initialize();
    }
    
    /**
     * Initialize API Configuration UI
     */
    initialize() {
        this.createModal();
        this.attachEventListeners();
        this.updateAllStatusIndicators();
        
        // Add global keyboard shortcut
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'A') {
                this.showModal();
            }
        });
    }
    
    /**
     * Create configuration modal
     */
    createModal() {
        const modal = document.createElement('div');
        modal.id = 'api-config-modal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 hidden flex items-center justify-center p-4';
        modal.innerHTML = `
            <div class="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
                <div class="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
                    <div class="flex items-center justify-between">
                        <div>
                            <h2 class="text-2xl font-bold">API Configuration Center</h2>
                            <p class="text-sm opacity-90 mt-1">Configure external services for enhanced functionality</p>
                        </div>
                        <button id="close-api-modal" class="text-white hover:text-gray-200 transition-colors">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>
                </div>
                
                <div class="p-6 overflow-y-auto" style="max-height: calc(90vh - 180px)">
                    <!-- Overview Section -->
                    <div class="mb-6">
                        <div class="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
                            <div class="flex items-start">
                                <div class="flex-shrink-0">
                                    <svg class="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                                        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
                                    </svg>
                                </div>
                                <div class="ml-3">
                                    <p class="text-sm text-blue-700">
                                        <strong>Enhanced Features:</strong> Configure API keys to unlock advanced capabilities like real-time traffic, 
                                        AI-powered PDF analysis, and comprehensive terrain data. All features have built-in fallbacks.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- API Status Overview -->
                    <div class="mb-6">
                        <h3 class="text-lg font-semibold mb-3">Service Status</h3>
                        <div class="grid grid-cols-2 md:grid-cols-3 gap-3" id="api-status-grid">
                            <!-- Status cards will be inserted here -->
                        </div>
                    </div>
                    
                    <!-- API Configuration Forms -->
                    <div class="space-y-6" id="api-config-forms">
                        <!-- Configuration forms will be inserted here -->
                    </div>
                    
                    <!-- Test All APIs Button -->
                    <div class="mt-6 pt-6 border-t">
                        <button id="test-all-apis" class="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors font-medium">
                            🔄 Test All Configured APIs
                        </button>
                    </div>
                </div>
                
                <div class="bg-gray-50 px-6 py-4 border-t">
                    <div class="flex items-center justify-between">
                        <p class="text-sm text-gray-600">
                            <span class="font-medium">Tip:</span> Press <kbd class="px-2 py-1 bg-gray-200 rounded text-xs">Ctrl+Shift+A</kbd> to open this dialog anytime
                        </p>
                        <button id="save-api-config" class="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium">
                            Save Configuration
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        this.modal = modal;
        
        // Generate configuration forms
        this.generateConfigForms();
        this.generateStatusCards();
    }
    
    /**
     * Generate API configuration forms
     */
    generateConfigForms() {
        const container = document.getElementById('api-config-forms');
        
        Object.entries(this.apiInfo).forEach(([apiKey, info]) => {
            const form = document.createElement('div');
            form.className = 'bg-gray-50 rounded-lg p-4';
            form.innerHTML = `
                <div class="flex items-start justify-between mb-3">
                    <div class="flex items-center">
                        <span class="text-2xl mr-3">${info.icon}</span>
                        <div>
                            <h4 class="font-semibold">${info.name}</h4>
                            <p class="text-sm text-gray-600">${info.description}</p>
                        </div>
                    </div>
                    <a href="${info.docsUrl}" target="_blank" class="text-blue-600 hover:text-blue-800 text-sm">
                        Documentation →
                    </a>
                </div>
                
                <div class="space-y-3">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">
                            API Key
                            <span class="text-xs text-gray-500 ml-1">${info.requiredModel || info.requiredPlan || ''}</span>
                        </label>
                        <div class="relative">
                            <input type="password" 
                                   id="api-key-${apiKey}" 
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                   placeholder="Enter your ${info.name} API key"
                                   value="${this.apiManager.apis[apiKey]?.key || ''}">
                            <button class="absolute right-2 top-2 text-gray-500 hover:text-gray-700" 
                                    onclick="this.previousElementSibling.type = this.previousElementSibling.type === 'password' ? 'text' : 'password'">
                                👁️
                            </button>
                        </div>
                    </div>
                    
                    ${info.requiredFeatures ? `
                    <div class="text-xs text-gray-600">
                        <strong>Required features:</strong> ${info.requiredFeatures.join(', ')}
                    </div>
                    ` : ''}
                    
                    <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-2">
                            <span id="status-${apiKey}" class="inline-flex items-center text-sm">
                                <span class="w-2 h-2 rounded-full bg-gray-400 mr-1"></span>
                                <span>Not configured</span>
                            </span>
                        </div>
                        <button class="test-api-btn text-sm bg-gray-200 hover:bg-gray-300 px-3 py-1 rounded transition-colors"
                                data-api="${apiKey}">
                            Test Connection
                        </button>
                    </div>
                </div>
            `;
            
            container.appendChild(form);
        });
    }
    
    /**
     * Generate status cards
     */
    generateStatusCards() {
        const container = document.getElementById('api-status-grid');
        
        Object.entries(this.apiInfo).forEach(([apiKey, info]) => {
            const card = document.createElement('div');
            card.className = 'bg-white border rounded-lg p-3 shadow-sm';
            card.innerHTML = `
                <div class="flex items-center justify-between">
                    <div class="flex items-center">
                        <span class="text-xl mr-2">${info.icon}</span>
                        <span class="font-medium text-sm">${info.name}</span>
                    </div>
                    <span id="card-status-${apiKey}" class="w-3 h-3 rounded-full bg-gray-400"></span>
                </div>
            `;
            
            container.appendChild(card);
            this.statusIndicators.set(apiKey, {
                card: document.getElementById(`card-status-${apiKey}`),
                text: document.getElementById(`status-${apiKey}`)
            });
        });
    }
    
    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Close modal
        document.getElementById('close-api-modal')?.addEventListener('click', () => {
            this.hideModal();
        });
        
        // Click outside to close
        this.modal?.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.hideModal();
            }
        });
        
        // Save configuration
        document.getElementById('save-api-config')?.addEventListener('click', () => {
            this.saveConfiguration();
        });
        
        // Test all APIs
        document.getElementById('test-all-apis')?.addEventListener('click', () => {
            this.testAllAPIs();
        });
        
        // Individual API tests
        document.querySelectorAll('.test-api-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const apiKey = e.target.dataset.api;
                this.testAPI(apiKey);
            });
        });
        
        // API key input changes
        Object.keys(this.apiInfo).forEach(apiKey => {
            const input = document.getElementById(`api-key-${apiKey}`);
            input?.addEventListener('input', () => {
                this.updateAPIKey(apiKey, input.value);
            });
        });
    }
    
    /**
     * Show configuration modal
     */
    showModal() {
        this.modal?.classList.remove('hidden');
        this.updateAllStatusIndicators();
    }
    
    /**
     * Hide configuration modal
     */
    hideModal() {
        this.modal?.classList.add('hidden');
    }
    
    /**
     * Save configuration
     */
    async saveConfiguration() {
        const button = document.getElementById('save-api-config');
        const originalText = button.textContent;
        
        button.textContent = 'Saving...';
        button.disabled = true;
        
        try {
            // Save all API keys
            Object.keys(this.apiInfo).forEach(apiKey => {
                const input = document.getElementById(`api-key-${apiKey}`);
                if (input && input.value) {
                    this.apiManager.setAPIKey(apiKey, input.value);
                }
            });
            
            // Test all configured APIs
            await this.apiManager.testAllAPIs();
            
            // Update status
            this.updateAllStatusIndicators();
            
            // Show success message
            this.showNotification('API configuration saved successfully!', 'success');
            
            // Update external status indicators
            this.updateExternalIndicators();
            
            setTimeout(() => {
                this.hideModal();
            }, 1500);
            
        } catch (error) {
            console.error('Failed to save configuration:', error);
            this.showNotification('Failed to save configuration', 'error');
        } finally {
            button.textContent = originalText;
            button.disabled = false;
        }
    }
    
    /**
     * Update API key temporarily
     */
    updateAPIKey(apiKey, value) {
        // Just update the UI, don't save yet
        const indicators = this.statusIndicators.get(apiKey);
        if (indicators && value) {
            indicators.text.innerHTML = `
                <span class="w-2 h-2 rounded-full bg-yellow-400 mr-1"></span>
                <span>Pending save</span>
            `;
        }
    }
    
    /**
     * Test specific API
     */
    async testAPI(apiKey) {
        const button = document.querySelector(`[data-api="${apiKey}"]`);
        const originalText = button.textContent;
        
        button.textContent = 'Testing...';
        button.disabled = true;
        
        try {
            const input = document.getElementById(`api-key-${apiKey}`);
            if (input && input.value) {
                this.apiManager.setAPIKey(apiKey, input.value);
            }
            
            const result = await this.apiManager.testAPI(apiKey);
            
            this.updateStatusIndicator(apiKey, result);
            
            if (result) {
                this.showNotification(`${this.apiInfo[apiKey].name} connected successfully!`, 'success');
            } else {
                this.showNotification(`${this.apiInfo[apiKey].name} connection failed`, 'error');
            }
            
        } catch (error) {
            console.error(`API test failed for ${apiKey}:`, error);
            this.updateStatusIndicator(apiKey, false);
            this.showNotification(`${this.apiInfo[apiKey].name} test failed`, 'error');
        } finally {
            button.textContent = originalText;
            button.disabled = false;
        }
    }
    
    /**
     * Test all APIs
     */
    async testAllAPIs() {
        const button = document.getElementById('test-all-apis');
        const originalText = button.textContent;
        
        button.textContent = '🔄 Testing all APIs...';
        button.disabled = true;
        
        try {
            await this.apiManager.testAllAPIs();
            this.updateAllStatusIndicators();
            
            const configured = this.apiManager.getConfiguredAPIs();
            this.showNotification(`Tested ${configured.length} APIs successfully`, 'success');
            
        } catch (error) {
            console.error('Failed to test all APIs:', error);
            this.showNotification('Some API tests failed', 'error');
        } finally {
            button.textContent = originalText;
            button.disabled = false;
        }
    }
    
    /**
     * Update status indicator for specific API
     */
    updateStatusIndicator(apiKey, isActive) {
        const indicators = this.statusIndicators.get(apiKey);
        if (!indicators) return;
        
        const color = isActive ? 'bg-green-500' : 'bg-red-500';
        const text = isActive ? 'Connected' : 'Not connected';
        
        indicators.card.className = `w-3 h-3 rounded-full ${color}`;
        indicators.text.innerHTML = `
            <span class="w-2 h-2 rounded-full ${color} mr-1"></span>
            <span>${text}</span>
        `;
    }
    
    /**
     * Update all status indicators
     */
    updateAllStatusIndicators() {
        const apiStatus = this.apiManager.getAPIStatus();
        
        apiStatus.forEach(({ name, configured }) => {
            this.updateStatusIndicator(name, configured);
        });
    }
    
    /**
     * Update external status indicators
     */
    updateExternalIndicators() {
        // Update weather API status
        const weatherIcon = document.getElementById('weather-status-icon');
        if (weatherIcon) {
            weatherIcon.textContent = this.apiManager.apis.openweather.isConfigured ? '✅' : '❌';
        }
        
        // Update terrain API status
        const terrainIcon = document.getElementById('terrain-status-icon');
        if (terrainIcon) {
            const hasTerrainAPI = this.apiManager.apis.mapbox.isConfigured || 
                                 this.apiManager.apis.googleMaps.isConfigured;
            terrainIcon.textContent = hasTerrainAPI ? '✅' : '❌';
        }
        
        // Dispatch event for other components
        window.dispatchEvent(new CustomEvent('apiConfigurationUpdated', {
            detail: {
                configured: this.apiManager.getConfiguredAPIs()
            }
        }));
    }
    
    /**
     * Show notification
     */
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 transform transition-all duration-300 ${
            type === 'success' ? 'bg-green-500 text-white' :
            type === 'error' ? 'bg-red-500 text-white' :
            'bg-blue-500 text-white'
        }`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateY(-10px)';
        }, 100);
        
        // Remove after delay
        setTimeout(() => {
            notification.style.transform = 'translateY(100px)';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
    
    /**
     * Get API configuration summary
     */
    getConfigurationSummary() {
        const configured = this.apiManager.getConfiguredAPIs();
        const total = Object.keys(this.apiInfo).length;
        
        return {
            configured: configured.length,
            total: total,
            percentage: Math.round((configured.length / total) * 100),
            details: configured.map(api => ({
                name: this.apiInfo[api]?.name || api,
                icon: this.apiInfo[api]?.icon || '🔌'
            }))
        };
    }
}

// Create global instance
window.apiConfigUI = new APIConfigUI();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = APIConfigUI;
}
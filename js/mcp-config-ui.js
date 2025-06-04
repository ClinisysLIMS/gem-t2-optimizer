/**
 * MCP Configuration UI
 * User interface for configuring Model Context Protocol server settings
 */
class MCPConfigUI {
    constructor(mcpManager) {
        this.mcpManager = mcpManager || window.mcpConfig;
        this.modal = null;
        this.isVisible = false;
        
        this.createUI();
        this.attachEventListeners();
    }
    
    /**
     * Create the configuration UI
     */
    createUI() {
        // Create modal container
        const modal = document.createElement('div');
        modal.id = 'mcp-config-modal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 hidden flex items-center justify-center p-4';
        
        modal.innerHTML = `
            <div class="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
                <!-- Header -->
                <div class="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6">
                    <div class="flex items-center justify-between">
                        <div>
                            <h2 class="text-2xl font-bold">MCP Server Configuration</h2>
                            <p class="text-sm opacity-90 mt-1">Configure AI assistant backend connection</p>
                        </div>
                        <button id="close-mcp-modal" class="text-white hover:text-gray-200 transition-colors">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>
                </div>
                
                <div class="p-6 overflow-y-auto" style="max-height: calc(90vh - 180px)">
                    <!-- Status Display -->
                    <div class="mb-6">
                        <h3 class="text-lg font-semibold mb-3">Current Status</h3>
                        <div id="mcp-status-display" class="bg-gray-50 rounded-lg p-4">
                            <!-- Status content will be inserted here -->
                        </div>
                    </div>
                    
                    <!-- Configuration Form -->
                    <form id="mcp-config-form" class="space-y-6">
                        <!-- Server URL -->
                        <div>
                            <label for="mcp-server-url" class="block text-sm font-medium text-gray-700 mb-1">
                                MCP Server URL *
                            </label>
                            <input type="url" 
                                   id="mcp-server-url" 
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                   placeholder="http://localhost:3000 or https://your-mcp-server.com"
                                   required>
                            <p class="text-xs text-gray-500 mt-1">
                                URL of your MCP server endpoint. Leave empty to use local calculations only.
                            </p>
                        </div>
                        
                        <!-- API Key -->
                        <div>
                            <label for="mcp-api-key" class="block text-sm font-medium text-gray-700 mb-1">
                                API Key (Optional)
                            </label>
                            <div class="relative">
                                <input type="password" 
                                       id="mcp-api-key" 
                                       class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                       placeholder="Enter API key if required">
                                <button type="button" 
                                        id="toggle-api-key-visibility"
                                        class="absolute right-2 top-2 text-gray-500 hover:text-gray-700">
                                    👁️
                                </button>
                            </div>
                            <p class="text-xs text-gray-500 mt-1">
                                Authentication key if your MCP server requires it.
                            </p>
                        </div>
                        
                        <!-- Enable/Disable MCP -->
                        <div class="border-t pt-6">
                            <h4 class="font-medium text-gray-800 mb-3">MCP Features</h4>
                            
                            <div class="mb-4">
                                <label class="flex items-center">
                                    <input type="checkbox" 
                                           id="mcp-enabled" 
                                           class="mr-3 rounded border-gray-300 text-purple-600 focus:ring-purple-500">
                                    <span class="text-sm font-medium text-gray-700">
                                        Enable MCP AI assistance
                                    </span>
                                </label>
                                <p class="text-xs text-gray-500 mt-1 ml-6">
                                    When disabled, the optimizer will use local calculations only, regardless of server configuration.
                                </p>
                            </div>
                        </div>
                        
                        <!-- Advanced Settings -->
                        <div class="border-t pt-6">
                            <h4 class="font-medium text-gray-800 mb-3">Advanced Settings</h4>
                            
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <!-- Timeout -->
                                <div>
                                    <label for="mcp-timeout" class="block text-sm font-medium text-gray-700 mb-1">
                                        Request Timeout (ms)
                                    </label>
                                    <input type="number" 
                                           id="mcp-timeout" 
                                           min="5000" 
                                           max="120000" 
                                           step="1000"
                                           class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500">
                                </div>
                                
                                <!-- Retry Attempts -->
                                <div>
                                    <label for="mcp-retry" class="block text-sm font-medium text-gray-700 mb-1">
                                        Retry Attempts
                                    </label>
                                    <input type="number" 
                                           id="mcp-retry" 
                                           min="0" 
                                           max="5"
                                           class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500">
                                </div>
                            </div>
                            
                            <!-- Local Fallback -->
                            <div class="mt-4">
                                <label class="flex items-center">
                                    <input type="checkbox" 
                                           id="mcp-local-fallback" 
                                           class="mr-3 rounded border-gray-300 text-purple-600 focus:ring-purple-500">
                                    <span class="text-sm font-medium text-gray-700">
                                        Enable local fallback if server is unavailable
                                    </span>
                                </label>
                                <p class="text-xs text-gray-500 mt-1 ml-6">
                                    Use local calculations when MCP server cannot be reached.
                                </p>
                            </div>
                        </div>
                        
                        <!-- Test Connection -->
                        <div class="border-t pt-6">
                            <button type="button" 
                                    id="test-mcp-connection" 
                                    class="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium">
                                🔄 Test Connection
                            </button>
                            
                            <div id="connection-test-result" class="hidden mt-3 p-3 rounded-lg">
                                <!-- Test results will appear here -->
                            </div>
                        </div>
                        
                        <!-- Information Box -->
                        <div class="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
                            <div class="flex">
                                <div class="flex-shrink-0">
                                    <svg class="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                                        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
                                    </svg>
                                </div>
                                <div class="ml-3">
                                    <h3 class="text-sm font-medium text-blue-800">About MCP</h3>
                                    <p class="mt-1 text-sm text-blue-700">
                                        The Model Context Protocol enables AI assistants to access external tools and data.
                                        With MCP configured, the optimizer can use real-time weather, traffic, and terrain data
                                        for more accurate optimizations. Without MCP, local calculations are used.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
                
                <!-- Footer -->
                <div class="bg-gray-50 px-6 py-4 border-t flex items-center justify-between">
                    <div class="flex space-x-3">
                        <button id="reset-mcp-config" 
                                class="px-4 py-2 border border-red-300 rounded-lg text-red-700 hover:bg-red-50 transition-colors">
                            Reset to Local
                        </button>
                        <button id="clear-mcp-config" 
                                class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
                            Clear All
                        </button>
                    </div>
                    <button id="save-mcp-config" 
                            class="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium">
                        Save Configuration
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        this.modal = modal;
    }
    
    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Close modal
        document.getElementById('close-mcp-modal')?.addEventListener('click', () => {
            this.hide();
        });
        
        // Click outside to close
        this.modal?.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.hide();
            }
        });
        
        // Toggle API key visibility
        document.getElementById('toggle-api-key-visibility')?.addEventListener('click', () => {
            const input = document.getElementById('mcp-api-key');
            const type = input.type === 'password' ? 'text' : 'password';
            input.type = type;
        });
        
        // Test connection
        document.getElementById('test-mcp-connection')?.addEventListener('click', () => {
            this.testConnection();
        });
        
        // Save configuration
        document.getElementById('save-mcp-config')?.addEventListener('click', () => {
            this.saveConfiguration();
        });
        
        // Reset to local
        document.getElementById('reset-mcp-config')?.addEventListener('click', () => {
            this.resetToLocal();
        });
        
        // Clear all
        document.getElementById('clear-mcp-config')?.addEventListener('click', () => {
            this.clearConfiguration();
        });
    }
    
    /**
     * Show the configuration modal
     */
    show() {
        this.loadCurrentConfig();
        this.updateStatusDisplay();
        this.modal?.classList.remove('hidden');
        this.isVisible = true;
    }
    
    /**
     * Hide the configuration modal
     */
    hide() {
        this.modal?.classList.add('hidden');
        this.isVisible = false;
    }
    
    /**
     * Load current configuration into the form
     */
    loadCurrentConfig() {
        const status = this.mcpManager.getStatus();
        const config = this.mcpManager.config;
        
        document.getElementById('mcp-server-url').value = config.serverUrl || '';
        document.getElementById('mcp-api-key').value = config.apiKey || '';
        document.getElementById('mcp-timeout').value = config.timeout || 30000;
        document.getElementById('mcp-retry').value = config.retryAttempts || 3;
        document.getElementById('mcp-local-fallback').checked = config.enableLocalFallback !== false;
        document.getElementById('mcp-enabled').checked = config.enabled !== false;
    }
    
    /**
     * Update status display
     */
    updateStatusDisplay() {
        const status = this.mcpManager.getStatus();
        const statusDisplay = document.getElementById('mcp-status-display');
        
        let statusColor = 'gray';
        let statusText = 'Not configured';
        let statusIcon = '⚫';
        
        if (!status.config.enabled) {
            statusColor = 'gray';
            statusText = 'MCP disabled - using local calculations only';
            statusIcon = '⚪';
        } else {
            switch (status.connectionStatus) {
                case 'connected':
                    statusColor = 'green';
                    statusText = 'Connected to MCP server';
                    statusIcon = '🟢';
                    break;
                case 'local':
                    statusColor = 'blue';
                    statusText = 'Using local calculations';
                    statusIcon = '🔵';
                    break;
                case 'local_fallback':
                    statusColor = 'yellow';
                    statusText = 'Using local fallback (server unavailable)';
                    statusIcon = '🟡';
                    break;
                case 'error':
                    statusColor = 'red';
                    statusText = 'Connection error';
                    statusIcon = '🔴';
                    break;
            }
        }
        
        statusDisplay.innerHTML = `
            <div class="flex items-center justify-between">
                <div class="flex items-center">
                    <span class="text-lg mr-2">${statusIcon}</span>
                    <div>
                        <div class="font-medium text-${statusColor}-800">${statusText}</div>
                        <div class="text-xs text-gray-600">
                            Mode: ${status.isLocal ? 'Local' : 'Remote'} | 
                            Enabled: ${status.config.enabled ? 'Yes' : 'No'} |
                            Server: ${status.config.serverUrl || 'Not configured'} |
                            Auth: ${status.config.hasApiKey ? 'Configured' : 'None'}
                        </div>
                    </div>
                </div>
                <div class="text-right">
                    <div class="text-sm font-medium">AI Features</div>
                    <div class="text-xs text-gray-600">
                        ${!status.config.enabled ? 'Disabled' : (status.isLocal ? 'Basic' : 'Enhanced')}
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Test MCP server connection
     */
    async testConnection() {
        const button = document.getElementById('test-mcp-connection');
        const resultDiv = document.getElementById('connection-test-result');
        const originalText = button.textContent;
        
        // Update form values before testing
        this.updateConfigFromForm();
        
        button.textContent = '🔄 Testing...';
        button.disabled = true;
        resultDiv.classList.add('hidden');
        
        try {
            const result = await this.mcpManager.testConnection();
            
            resultDiv.className = 'mt-3 p-3 rounded-lg bg-green-50 border border-green-200';
            resultDiv.innerHTML = `
                <div class="flex items-center">
                    <span class="text-green-500 mr-2">✅</span>
                    <div>
                        <div class="font-medium text-green-800">Connection successful!</div>
                        <div class="text-xs text-green-600 mt-1">
                            Status: ${result.status} | 
                            Server: ${result.serverInfo?.name || 'Unknown'} |
                            Version: ${result.serverInfo?.version || 'Unknown'}
                        </div>
                    </div>
                </div>
            `;
            resultDiv.classList.remove('hidden');
            
            this.updateStatusDisplay();
            
        } catch (error) {
            resultDiv.className = 'mt-3 p-3 rounded-lg bg-red-50 border border-red-200';
            resultDiv.innerHTML = `
                <div class="flex items-center">
                    <span class="text-red-500 mr-2">❌</span>
                    <div>
                        <div class="font-medium text-red-800">Connection failed</div>
                        <div class="text-xs text-red-600 mt-1">${error.message}</div>
                        ${this.mcpManager.config.enableLocalFallback ? 
                            '<div class="text-xs text-yellow-600 mt-1">Using local fallback mode</div>' : ''}
                    </div>
                </div>
            `;
            resultDiv.classList.remove('hidden');
            
            this.updateStatusDisplay();
        } finally {
            button.textContent = originalText;
            button.disabled = false;
        }
    }
    
    /**
     * Update config from form values
     */
    updateConfigFromForm() {
        const config = {
            serverUrl: document.getElementById('mcp-server-url').value.trim(),
            apiKey: document.getElementById('mcp-api-key').value.trim(),
            timeout: parseInt(document.getElementById('mcp-timeout').value) || 30000,
            retryAttempts: parseInt(document.getElementById('mcp-retry').value) || 3,
            enableLocalFallback: document.getElementById('mcp-local-fallback').checked,
            enabled: document.getElementById('mcp-enabled').checked
        };
        
        this.mcpManager.updateConfig(config);
    }
    
    /**
     * Save configuration
     */
    async saveConfiguration() {
        const button = document.getElementById('save-mcp-config');
        const originalText = button.textContent;
        
        button.textContent = 'Saving...';
        button.disabled = true;
        
        try {
            this.updateConfigFromForm();
            
            // If server URL is provided, test the connection
            if (this.mcpManager.config.serverUrl) {
                await this.mcpManager.testConnection();
            } else {
                this.mcpManager.resetToLocal();
            }
            
            this.showNotification('MCP configuration saved successfully!', 'success');
            this.updateStatusDisplay();
            
            // Update external components
            this.notifyConfigUpdate();
            
            setTimeout(() => {
                this.hide();
            }, 1500);
            
        } catch (error) {
            this.showNotification(`Configuration error: ${error.message}`, 'error');
        } finally {
            button.textContent = originalText;
            button.disabled = false;
        }
    }
    
    /**
     * Reset to local mode
     */
    resetToLocal() {
        if (confirm('Reset to local calculation mode? This will disconnect from any MCP server.')) {
            this.mcpManager.resetToLocal();
            this.loadCurrentConfig();
            this.updateStatusDisplay();
            this.showNotification('Reset to local calculation mode', 'info');
        }
    }
    
    /**
     * Clear all configuration
     */
    clearConfiguration() {
        if (confirm('Clear all MCP configuration? This will reset everything to defaults.')) {
            this.mcpManager.clearConfig();
            this.loadCurrentConfig();
            this.updateStatusDisplay();
            this.showNotification('MCP configuration cleared', 'info');
        }
    }
    
    /**
     * Show notification
     */
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 transform transition-all duration-300 ${
            type === 'success' ? 'bg-green-500 text-white' :
            type === 'error' ? 'bg-red-500 text-white' :
            type === 'warning' ? 'bg-yellow-500 text-white' :
            'bg-blue-500 text-white'
        }`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.transform = 'translateY(-10px)';
        }, 100);
        
        setTimeout(() => {
            notification.style.transform = 'translateY(100px)';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
    
    /**
     * Notify other components of config update
     */
    notifyConfigUpdate() {
        window.dispatchEvent(new CustomEvent('mcpConfigUpdated', {
            detail: {
                status: this.mcpManager.getStatus(),
                isLocal: this.mcpManager.isLocal
            }
        }));
    }
    
    /**
     * Get current MCP status for external use
     */
    getStatus() {
        return this.mcpManager.getStatus();
    }
}

// Create global instance
window.mcpConfigUI = new MCPConfigUI();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MCPConfigUI;
}
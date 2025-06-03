/**
 * MCP Configuration Manager
 * Handles Model Context Protocol server configuration and connection testing
 */
class MCPConfigManager {
    constructor() {
        this.storage = window.localStorage;
        this.cache = new Map();
        this.connectionStatus = 'disconnected';
        this.isLocal = true; // Start with local calculations
        
        this.config = {
            serverUrl: '',
            apiKey: '',
            timeout: 30000, // 30 second timeout
            retryAttempts: 3,
            enableLocalFallback: true
        };
        
        this.loadConfig();
        this.initializeLocalMode();
    }
    
    /**
     * Initialize local calculation mode
     */
    initializeLocalMode() {
        this.isLocal = true;
        this.connectionStatus = 'local';
        console.log('MCP initialized in local calculation mode');
    }
    
    /**
     * Load configuration from storage
     */
    loadConfig() {
        try {
            const stored = this.storage.getItem('mcp_config');
            if (stored) {
                const parsed = JSON.parse(stored);
                this.config = { ...this.config, ...parsed };
            }
        } catch (error) {
            console.error('Failed to load MCP config:', error);
        }
    }
    
    /**
     * Save configuration to storage
     */
    saveConfig() {
        try {
            this.storage.setItem('mcp_config', JSON.stringify(this.config));
            console.log('MCP configuration saved');
        } catch (error) {
            console.error('Failed to save MCP config:', error);
        }
    }
    
    /**
     * Update configuration
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        this.saveConfig();
    }
    
    /**
     * Test MCP server connection
     */
    async testConnection() {
        if (!this.config.serverUrl) {
            throw new Error('Server URL is required');
        }
        
        const testUrl = `${this.config.serverUrl}/health`;
        const headers = {};
        
        if (this.config.apiKey) {
            headers['Authorization'] = `Bearer ${this.config.apiKey}`;
        }
        
        try {
            const response = await fetch(testUrl, {
                method: 'GET',
                headers: headers,
                timeout: this.config.timeout
            });
            
            if (!response.ok) {
                throw new Error(`Server responded with status: ${response.status}`);
            }
            
            const data = await response.json();
            
            this.connectionStatus = 'connected';
            this.isLocal = false;
            
            return {
                success: true,
                status: 'connected',
                serverInfo: data,
                latency: Date.now() // Simple latency measurement
            };
            
        } catch (error) {
            this.connectionStatus = 'error';
            
            if (this.config.enableLocalFallback) {
                this.isLocal = true;
                this.connectionStatus = 'local_fallback';
            }
            
            throw new Error(`Connection failed: ${error.message}`);
        }
    }
    
    /**
     * Call MCP tool (with local fallback)
     */
    async callTool(toolName, parameters) {
        if (this.isLocal || this.connectionStatus !== 'connected') {
            return this.executeLocalTool(toolName, parameters);
        }
        
        try {
            const response = await this.callRemoteTool(toolName, parameters);
            return response;
        } catch (error) {
            console.warn('Remote MCP call failed, falling back to local:', error);
            
            if (this.config.enableLocalFallback) {
                return this.executeLocalTool(toolName, parameters);
            }
            
            throw error;
        }
    }
    
    /**
     * Call remote MCP tool
     */
    async callRemoteTool(toolName, parameters) {
        const url = `${this.config.serverUrl}/tools/${toolName}`;
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (this.config.apiKey) {
            headers['Authorization'] = `Bearer ${this.config.apiKey}`;
        }
        
        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(parameters),
            timeout: this.config.timeout
        });
        
        if (!response.ok) {
            throw new Error(`MCP call failed: ${response.status} ${response.statusText}`);
        }
        
        return await response.json();
    }
    
    /**
     * Execute tool locally (fallback mode)
     */
    async executeLocalTool(toolName, parameters) {
        console.log(`Executing ${toolName} locally with parameters:`, parameters);
        
        // Use API integration layer for comprehensive fallback support
        if (window.apiIntegration) {
            switch (toolName) {
                case 'optimize_controller':
                    return this.localOptimizeController(parameters);
                    
                case 'analyze_trip':
                    return this.localAnalyzeTripEnhanced(parameters);
                    
                case 'get_weather':
                    return this.localGetWeatherEnhanced(parameters);
                    
                case 'get_terrain':
                    return this.localGetTerrain(parameters);
                    
                case 'get_traffic':
                    return this.localGetTraffic(parameters);
                    
                case 'get_elevation':
                    return this.localGetElevation(parameters);
                    
                case 'optimize_route':
                    return this.localOptimizeRoute(parameters);
                    
                case 'validate_settings':
                    return this.localValidateSettings(parameters);
                    
                default:
                    throw new Error(`Unknown tool: ${toolName}`);
            }
        }
        
        // Fallback to basic implementation
        switch (toolName) {
            case 'optimize_controller':
                return this.localOptimizeController(parameters);
                
            case 'analyze_trip':
                return this.localAnalyzeTrip(parameters);
                
            case 'get_weather':
                return this.localGetWeather(parameters);
                
            case 'validate_settings':
                return this.localValidateSettings(parameters);
                
            default:
                throw new Error(`Unknown tool: ${toolName}`);
        }
    }
    
    /**
     * Local controller optimization
     */
    async localOptimizeController(parameters) {
        const { vehicleData, priorities, baseline } = parameters;
        
        // Use the existing GEMOptimizer
        if (window.GEMOptimizer?.optimizer) {
            const inputData = {
                vehicle: vehicleData.vehicle || {},
                battery: vehicleData.battery || {},
                wheel: vehicleData.wheel || {},
                environment: vehicleData.environment || {},
                priorities: priorities || {}
            };
            
            const results = window.GEMOptimizer.optimizer.optimizeSettings(inputData, baseline);
            
            return {
                success: true,
                source: 'local',
                optimizedSettings: results.optimizedSettings,
                performanceChanges: results.performanceChanges || [],
                analysis: {
                    method: 'local_optimization',
                    confidence: 0.85,
                    warnings: results.warnings || []
                }
            };
        }
        
        // Fallback basic optimization
        return {
            success: true,
            source: 'local_fallback',
            optimizedSettings: baseline || {},
            performanceChanges: ['Local optimization completed'],
            analysis: {
                method: 'basic_fallback',
                confidence: 0.6,
                warnings: ['Using basic local calculations']
            }
        };
    }
    
    /**
     * Local trip analysis
     */
    async localAnalyzeTrip(parameters) {
        const { destination, date, vehicleModel } = parameters;
        
        return {
            success: true,
            source: 'local',
            analysis: {
                destination: destination,
                estimatedDistance: 'Unknown (local mode)',
                terrainDifficulty: 'moderate',
                weatherConditions: 'Clear (estimated)',
                recommendations: [
                    'Configure MCP server for real-time weather and terrain data',
                    'Use balanced settings for unknown terrain',
                    'Monitor battery levels during trip'
                ]
            },
            optimizations: {
                terrainAdjustments: {},
                weatherAdjustments: {},
                rangeOptimizations: {}
            }
        };
    }
    
    /**
     * Enhanced local weather using fallback calculations
     */
    async localGetWeatherEnhanced(parameters) {
        const { location, date } = parameters;
        
        if (window.apiIntegration) {
            const weather = await window.apiIntegration.getWeather(location, new Date(date));
            
            return {
                success: true,
                source: 'local_enhanced',
                weather: weather,
                impact: {
                    rangeEffect: weather.temperature < 40 || weather.temperature > 95 ? 'negative' : 'neutral',
                    performanceEffect: weather.windSpeed > 20 ? 'reduced' : 'optimal',
                    recommendations: this.generateWeatherRecommendations(weather)
                }
            };
        }
        
        return this.localGetWeather(parameters);
    }
    
    /**
     * Local weather simulation (basic fallback)
     */
    async localGetWeather(parameters) {
        const { location, date } = parameters;
        
        return {
            success: true,
            source: 'local_simulation',
            weather: {
                temperature: 72,
                humidity: 55,
                windSpeed: 8,
                conditions: 'Clear (simulated)',
                precipitation: 0
            },
            impact: {
                rangeEffect: 'neutral',
                performanceEffect: 'optimal',
                recommendations: ['Weather data simulated - configure MCP for real data']
            }
        };
    }
    
    /**
     * Local settings validation
     */
    async localValidateSettings(parameters) {
        const { settings } = parameters;
        
        // Use existing validation system
        if (window.GEMOptimizer?.validation) {
            const result = window.GEMOptimizer.validation.validateControllerSettings(settings);
            return {
                success: true,
                source: 'local',
                validation: result
            };
        }
        
        return {
            success: true,
            source: 'local_basic',
            validation: {
                isValid: true,
                warnings: [],
                errors: []
            }
        };
    }
    
    /**
     * Get current configuration status
     */
    getStatus() {
        return {
            isConfigured: !!this.config.serverUrl,
            connectionStatus: this.connectionStatus,
            isLocal: this.isLocal,
            config: {
                serverUrl: this.config.serverUrl ? '***configured***' : '',
                hasApiKey: !!this.config.apiKey,
                timeout: this.config.timeout,
                enableLocalFallback: this.config.enableLocalFallback
            }
        };
    }
    
    /**
     * Enhanced local trip analysis
     */
    async localAnalyzeTripEnhanced(parameters) {
        const { destination, date, vehicleModel } = parameters;
        
        if (window.apiIntegration) {
            const analysis = await window.apiIntegration.analyzeTripConditions({
                start: 'Current Location',
                destination: destination,
                date: new Date(date),
                vehicleConfig: { model: vehicleModel },
                preferences: {}
            });
            
            return {
                success: true,
                source: 'local_enhanced',
                analysis: {
                    destination: destination,
                    conditions: analysis,
                    recommendations: this.generateTripRecommendations(analysis),
                    optimizations: this.generateTripOptimizations(analysis)
                }
            };
        }
        
        return this.localAnalyzeTrip(parameters);
    }
    
    /**
     * Local terrain analysis
     */
    async localGetTerrain(parameters) {
        const { location } = parameters;
        
        if (window.apiIntegration) {
            const terrain = await window.apiIntegration.getTerrain(location);
            
            return {
                success: true,
                source: 'local_enhanced',
                terrain: terrain
            };
        }
        
        return {
            success: true,
            source: 'local_basic',
            terrain: {
                type: 'mixed',
                difficulty: 0.5,
                grade: 5,
                surface: 'paved'
            }
        };
    }
    
    /**
     * Local traffic analysis
     */
    async localGetTraffic(parameters) {
        const { location, dateTime } = parameters;
        
        if (window.apiIntegration) {
            const traffic = await window.apiIntegration.getTraffic(location, new Date(dateTime));
            
            return {
                success: true,
                source: 'local_enhanced',
                traffic: traffic
            };
        }
        
        return {
            success: true,
            source: 'local_basic',
            traffic: {
                congestionLevel: 'moderate',
                estimatedDelay: 5
            }
        };
    }
    
    /**
     * Local elevation analysis
     */
    async localGetElevation(parameters) {
        const { start, end, distance } = parameters;
        
        if (window.apiIntegration) {
            const elevation = await window.apiIntegration.getElevationProfile(start, end, distance);
            
            return {
                success: true,
                source: 'local_enhanced',
                elevation: elevation
            };
        }
        
        return {
            success: true,
            source: 'local_basic',
            elevation: {
                profile: 'rolling',
                maxGrade: 8,
                avgGrade: 4
            }
        };
    }
    
    /**
     * Local route optimization
     */
    async localOptimizeRoute(parameters) {
        const { start, destination, preferences } = parameters;
        
        if (window.apiIntegration) {
            const route = await window.apiIntegration.optimizeRoute(start, destination, preferences);
            
            return {
                success: true,
                source: 'local_enhanced',
                route: route
            };
        }
        
        return {
            success: true,
            source: 'local_basic',
            route: {
                distance: { value: 5, text: '5 miles' },
                duration: { value: 15, text: '15 minutes' },
                waypoints: []
            }
        };
    }
    
    /**
     * Generate weather recommendations
     */
    generateWeatherRecommendations(weather) {
        const recommendations = [];
        
        if (weather.temperature < 50) {
            recommendations.push('Cold weather may reduce battery efficiency');
        } else if (weather.temperature > 85) {
            recommendations.push('Hot weather - ensure adequate cooling');
        }
        
        if (weather.windSpeed > 15) {
            recommendations.push('High winds may affect stability and range');
        }
        
        if (weather.precipitation > 0.3) {
            recommendations.push('Wet conditions - reduce speed for safety');
        }
        
        return recommendations;
    }
    
    /**
     * Generate trip recommendations
     */
    generateTripRecommendations(analysis) {
        const recommendations = [];
        
        if (analysis.combinedImpact?.overall < 0.7) {
            recommendations.push('Challenging conditions - consider route alternatives');
        }
        
        if (analysis.weather?.temperature < 40) {
            recommendations.push('Pre-warm battery for better performance');
        }
        
        if (analysis.terrain?.difficulty > 0.7) {
            recommendations.push('Difficult terrain - ensure full charge');
        }
        
        return recommendations;
    }
    
    /**
     * Generate trip optimizations
     */
    generateTripOptimizations(analysis) {
        const optimizations = {
            controllerSettings: {},
            vehiclePrep: [],
            routeOptions: []
        };
        
        // Controller adjustments based on conditions
        if (analysis.terrain?.grade > 10) {
            optimizations.controllerSettings.fieldWeakening = 'increase';
            optimizations.controllerSettings.regenBraking = 'maximize';
        }
        
        if (analysis.weather?.temperature < 50) {
            optimizations.controllerSettings.acceleration = 'gentle';
        }
        
        // Vehicle preparation
        if (analysis.weather?.precipitation > 0.3) {
            optimizations.vehiclePrep.push('Check tire tread depth');
        }
        
        // Route options
        if (analysis.traffic?.congestionLevel === 'Heavy') {
            optimizations.routeOptions.push('Consider alternate departure time');
        }
        
        return optimizations;
    }
    
    /**
     * Reset to local mode
     */
    resetToLocal() {
        this.isLocal = true;
        this.connectionStatus = 'local';
        console.log('MCP reset to local mode');
    }
    
    /**
     * Clear all configuration
     */
    clearConfig() {
        this.config = {
            serverUrl: '',
            apiKey: '',
            timeout: 30000,
            retryAttempts: 3,
            enableLocalFallback: true
        };
        this.storage.removeItem('mcp_config');
        this.resetToLocal();
    }
}

// Create global instance
window.mcpConfig = new MCPConfigManager();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MCPConfigManager;
}
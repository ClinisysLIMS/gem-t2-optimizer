#!/usr/bin/env node

/**
 * GEM Optimizer MCP Server
 * Model Context Protocol server for AI assistant integration
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
    CallToolRequestSchema, 
    ErrorCode, 
    ListToolsRequestSchema, 
    McpError 
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import winston from 'winston';
import NodeCache from 'node-cache';
import axios from 'axios';
import dotenv from 'dotenv';

import NLPProcessor from './nlp-processor.js';
import GEMOptimizer from './gem-optimizer.js';

// Load environment variables
dotenv.config();

// Configure logging
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ 
            filename: 'logs/mcp-server.log',
            maxsize: 5242880, // 5MB
            maxFiles: 5
        }),
        new winston.transports.Console({
            format: winston.format.simple()
        })
    ]
});

// Initialize components
const nlpProcessor = new NLPProcessor();
const gemOptimizer = new GEMOptimizer();
const cache = new NodeCache({ stdTTL: 3600 }); // 1 hour cache

// Backend API configuration
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const WEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
const MAPBOX_API_KEY = process.env.MAPBOX_API_KEY;

class GEMOptimizerMCPServer {
    constructor() {
        this.server = new Server(
            {
                name: 'gem-optimizer',
                version: '1.0.0',
            },
            {
                capabilities: {
                    tools: {},
                    resources: {},
                    prompts: {}
                }
            }
        );

        this.setupToolHandlers();
        this.setupResourceHandlers();
        this.setupPromptHandlers();
    }

    /**
     * Set up tool handlers for MCP
     */
    setupToolHandlers() {
        // List available tools
        this.server.setRequestHandler(ListToolsRequestSchema, async () => {
            return {
                tools: [
                    {
                        name: 'optimize_gem_controller',
                        description: 'Optimize GEM T2 controller settings based on natural language description',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                query: {
                                    type: 'string',
                                    description: 'Natural language description of optimization requirements (e.g., "optimize my GEM e4 for camping trip to Yosemite next weekend")'
                                },
                                vehicle_info: {
                                    type: 'object',
                                    properties: {
                                        model: { type: 'string', enum: ['e2', 'e4', 'e6', 'eS', 'eL', 'elXD'] },
                                        condition: { type: 'string', enum: ['good', 'fair', 'poor'] },
                                        battery_voltage: { type: 'number' }
                                    },
                                    description: 'Optional specific vehicle information'
                                }
                            },
                            required: ['query']
                        }
                    },
                    {
                        name: 'plan_gem_trip',
                        description: 'Plan a GEM trip with weather and terrain analysis',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                destination: {
                                    type: 'string',
                                    description: 'Trip destination'
                                },
                                start_location: {
                                    type: 'string',
                                    description: 'Starting location (optional)'
                                },
                                date: {
                                    type: 'string',
                                    description: 'Trip date (YYYY-MM-DD format or natural language like "next weekend")'
                                },
                                trip_type: {
                                    type: 'string',
                                    enum: ['camping', 'touring', 'parade', 'beach', 'mountains', 'shopping', 'family'],
                                    description: 'Type of trip'
                                },
                                vehicle_model: {
                                    type: 'string',
                                    enum: ['e2', 'e4', 'e6', 'eS', 'eL', 'elXD'],
                                    description: 'GEM vehicle model'
                                }
                            },
                            required: ['destination', 'date']
                        }
                    },
                    {
                        name: 'get_weather_forecast',
                        description: 'Get weather forecast for a location and date',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                location: {
                                    type: 'string',
                                    description: 'Location name or coordinates'
                                },
                                date: {
                                    type: 'string',
                                    description: 'Date for forecast (YYYY-MM-DD)'
                                }
                            },
                            required: ['location', 'date']
                        }
                    },
                    {
                        name: 'analyze_terrain',
                        description: 'Analyze terrain and elevation for a route',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                start_location: {
                                    type: 'string',
                                    description: 'Starting location'
                                },
                                end_location: {
                                    type: 'string',
                                    description: 'Destination location'
                                }
                            },
                            required: ['start_location', 'end_location']
                        }
                    },
                    {
                        name: 'compare_optimizations',
                        description: 'Compare different optimization scenarios',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                scenario1: {
                                    type: 'string',
                                    description: 'First optimization scenario description'
                                },
                                scenario2: {
                                    type: 'string',
                                    description: 'Second optimization scenario description'
                                }
                            },
                            required: ['scenario1', 'scenario2']
                        }
                    },
                    {
                        name: 'get_preset_configurations',
                        description: 'Get predefined optimization presets',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                category: {
                                    type: 'string',
                                    enum: ['all', 'performance', 'efficiency', 'terrain', 'load'],
                                    description: 'Category of presets to return'
                                }
                            }
                        }
                    },
                    {
                        name: 'save_trip_configuration',
                        description: 'Save a trip configuration to the backend',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                title: {
                                    type: 'string',
                                    description: 'Trip title'
                                },
                                optimization_result: {
                                    type: 'object',
                                    description: 'Optimization result from optimize_gem_controller'
                                },
                                make_public: {
                                    type: 'boolean',
                                    description: 'Whether to make this trip public'
                                }
                            },
                            required: ['title', 'optimization_result']
                        }
                    }
                ]
            };
        });

        // Handle tool calls
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;
            
            try {
                logger.info(`Tool called: ${name}`, { args });
                
                switch (name) {
                    case 'optimize_gem_controller':
                        return await this.handleOptimizeController(args);
                    
                    case 'plan_gem_trip':
                        return await this.handlePlanTrip(args);
                    
                    case 'get_weather_forecast':
                        return await this.handleGetWeather(args);
                    
                    case 'analyze_terrain':
                        return await this.handleAnalyzeTerrain(args);
                    
                    case 'compare_optimizations':
                        return await this.handleCompareOptimizations(args);
                    
                    case 'get_preset_configurations':
                        return await this.handleGetPresets(args);
                    
                    case 'save_trip_configuration':
                        return await this.handleSaveTrip(args);
                    
                    default:
                        throw new McpError(
                            ErrorCode.MethodNotFound,
                            `Unknown tool: ${name}`
                        );
                }
            } catch (error) {
                logger.error(`Error in tool ${name}:`, error);
                throw new McpError(
                    ErrorCode.InternalError,
                    `Tool execution failed: ${error.message}`
                );
            }
        });
    }

    /**
     * Handle controller optimization
     */
    async handleOptimizeController(args) {
        const { query, vehicle_info } = args;
        
        // Check cache first
        const cacheKey = `optimize:${query}:${JSON.stringify(vehicle_info || {})}`;
        const cached = cache.get(cacheKey);
        if (cached) {
            logger.info('Returning cached optimization result');
            return { content: [{ type: 'text', text: JSON.stringify(cached, null, 2) }] };
        }
        
        // Process natural language query
        const parameters = nlpProcessor.processQuery(query);
        
        // Override with any specific vehicle info provided
        if (vehicle_info) {
            Object.assign(parameters.vehicle, vehicle_info);
        }
        
        // Generate optimization
        const optimization = gemOptimizer.optimizeFromNLP(parameters);
        
        // Format response
        const response = {
            success: true,
            optimization: optimization,
            nlp_analysis: {
                extracted_parameters: parameters,
                confidence: parameters.confidence,
                suggestions: nlpProcessor.generateSuggestions(parameters)
            },
            explanation: this.generateOptimizationExplanation(optimization, parameters)
        };
        
        // Cache result
        cache.set(cacheKey, response);
        
        return {
            content: [{
                type: 'text',
                text: JSON.stringify(response, null, 2)
            }]
        };
    }

    /**
     * Handle trip planning
     */
    async handlePlanTrip(args) {
        const { destination, start_location, date, trip_type, vehicle_model } = args;
        
        try {
            // Parse date if it's natural language
            const parsedDate = nlpProcessor.processQuery(`trip on ${date}`).dates.start || new Date(date);
            
            // Get weather forecast
            let weatherData = null;
            if (WEATHER_API_KEY) {
                try {
                    weatherData = await this.fetchWeatherData(destination, parsedDate);
                } catch (error) {
                    logger.warn('Weather fetch failed:', error.message);
                }
            }
            
            // Get terrain analysis
            let terrainData = null;
            if (start_location) {
                try {
                    terrainData = await this.fetchTerrainData(start_location, destination);
                } catch (error) {
                    logger.warn('Terrain fetch failed:', error.message);
                }
            }
            
            // Create optimization query based on trip parameters
            const optimizationQuery = this.buildTripOptimizationQuery({
                destination,
                start_location,
                date: parsedDate,
                trip_type,
                vehicle_model,
                weather: weatherData,
                terrain: terrainData
            });
            
            // Get optimization
            const optimizationResult = await this.handleOptimizeController({ 
                query: optimizationQuery,
                vehicle_info: { model: vehicle_model }
            });
            
            const response = {
                success: true,
                trip_plan: {
                    destination,
                    start_location,
                    date: parsedDate.toISOString().split('T')[0],
                    trip_type,
                    vehicle_model
                },
                weather_forecast: weatherData,
                terrain_analysis: terrainData,
                optimization: JSON.parse(optimizationResult.content[0].text).optimization,
                recommendations: this.generateTripRecommendations({
                    weather: weatherData,
                    terrain: terrainData,
                    trip_type
                })
            };
            
            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify(response, null, 2)
                }]
            };
            
        } catch (error) {
            logger.error('Trip planning error:', error);
            throw new McpError(ErrorCode.InternalError, `Trip planning failed: ${error.message}`);
        }
    }

    /**
     * Handle weather forecast requests
     */
    async handleGetWeather(args) {
        const { location, date } = args;
        
        if (!WEATHER_API_KEY) {
            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify({
                        error: 'Weather API key not configured',
                        fallback: this.generateFallbackWeather(location, date)
                    }, null, 2)
                }]
            };
        }
        
        try {
            const weatherData = await this.fetchWeatherData(location, new Date(date));
            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify(weatherData, null, 2)
                }]
            };
        } catch (error) {
            logger.error('Weather fetch error:', error);
            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify({
                        error: error.message,
                        fallback: this.generateFallbackWeather(location, date)
                    }, null, 2)
                }]
            };
        }
    }

    /**
     * Handle terrain analysis requests
     */
    async handleAnalyzeTerrain(args) {
        const { start_location, end_location } = args;
        
        try {
            const terrainData = await this.fetchTerrainData(start_location, end_location);
            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify(terrainData, null, 2)
                }]
            };
        } catch (error) {
            logger.error('Terrain analysis error:', error);
            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify({
                        error: error.message,
                        fallback: this.generateFallbackTerrain(start_location, end_location)
                    }, null, 2)
                }]
            };
        }
    }

    /**
     * Handle optimization comparisons
     */
    async handleCompareOptimizations(args) {
        const { scenario1, scenario2 } = args;
        
        // Get optimizations for both scenarios
        const opt1Result = await this.handleOptimizeController({ query: scenario1 });
        const opt2Result = await this.handleOptimizeController({ query: scenario2 });
        
        const opt1 = JSON.parse(opt1Result.content[0].text).optimization;
        const opt2 = JSON.parse(opt2Result.content[0].text).optimization;
        
        // Compare the optimizations
        const comparison = gemOptimizer.compareOptimizations(opt1, opt2);
        
        const response = {
            success: true,
            scenario1: {
                description: scenario1,
                optimization: opt1
            },
            scenario2: {
                description: scenario2,
                optimization: opt2
            },
            comparison: comparison,
            recommendation: this.generateComparisonRecommendation(comparison, scenario1, scenario2)
        };
        
        return {
            content: [{
                type: 'text',
                text: JSON.stringify(response, null, 2)
            }]
        };
    }

    /**
     * Handle preset configuration requests
     */
    async handleGetPresets(args) {
        const { category = 'all' } = args;
        
        const presets = gemOptimizer.getPresetConfigurations();
        let filteredPresets = presets;
        
        if (category !== 'all') {
            // Filter presets by category (this would need to be implemented in GEMOptimizer)
            // For now, return all presets
        }
        
        return {
            content: [{
                type: 'text',
                text: JSON.stringify({
                    success: true,
                    category: category,
                    presets: filteredPresets
                }, null, 2)
            }]
        };
    }

    /**
     * Handle saving trip configurations
     */
    async handleSaveTrip(args) {
        const { title, optimization_result, make_public = false } = args;
        
        try {
            const tripData = {
                title,
                description: `Trip optimized via MCP server: ${optimization_result.nlp_analysis?.extracted_parameters?.originalQuery || 'Natural language optimization'}`,
                start_location: optimization_result.nlp_analysis?.extracted_parameters?.location?.start,
                end_location: optimization_result.nlp_analysis?.extracted_parameters?.location?.destination,
                start_date: optimization_result.nlp_analysis?.extracted_parameters?.dates?.start || new Date().toISOString().split('T')[0],
                trip_data: optimization_result.nlp_analysis?.extracted_parameters || {},
                optimization_results: optimization_result.optimization,
                is_public: make_public
            };
            
            const response = await axios.post(`${BACKEND_URL}/api/trips`, tripData);
            
            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify({
                        success: true,
                        message: 'Trip configuration saved successfully',
                        trip_id: response.data.data.id,
                        backend_response: response.data
                    }, null, 2)
                }]
            };
            
        } catch (error) {
            logger.error('Save trip error:', error);
            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify({
                        success: false,
                        error: `Failed to save trip: ${error.message}`
                    }, null, 2)
                }]
            };
        }
    }

    /**
     * Set up resource handlers
     */
    setupResourceHandlers() {
        // Resources would be implemented here for accessing saved configurations, etc.
    }

    /**
     * Set up prompt handlers
     */
    setupPromptHandlers() {
        // Prompt templates would be implemented here
    }

    /**
     * Generate optimization explanation
     */
    generateOptimizationExplanation(optimization, parameters) {
        const explanations = [];
        
        explanations.push(`Based on your query: "${parameters.originalQuery}"`);
        
        if (parameters.vehicle.model) {
            explanations.push(`Optimized for ${parameters.vehicle.model} vehicle type`);
        }
        
        if (parameters.trip.type) {
            explanations.push(`Configured for ${parameters.trip.type} trip type`);
        }
        
        if (parameters.terrain.type) {
            explanations.push(`Adjusted for ${parameters.terrain.type} terrain`);
        }
        
        if (Object.keys(parameters.priorities).length > 0) {
            const topPriority = Object.entries(parameters.priorities)
                .sort(([,a], [,b]) => b - a)[0];
            explanations.push(`Prioritizing ${topPriority[0]} (level ${topPriority[1]})`);
        }
        
        explanations.push(`${optimization.changes.length} controller parameters adjusted`);
        explanations.push(`Confidence score: ${Math.round(parameters.confidence * 100)}%`);
        
        return explanations.join('. ');
    }

    /**
     * Build trip optimization query
     */
    buildTripOptimizationQuery(tripParams) {
        const parts = ['optimize my GEM'];
        
        if (tripParams.vehicle_model) {
            parts.push(tripParams.vehicle_model);
        }
        
        parts.push('for');
        
        if (tripParams.trip_type) {
            parts.push(tripParams.trip_type);
        }
        
        parts.push('trip to', tripParams.destination);
        
        if (tripParams.date) {
            parts.push('on', tripParams.date.toDateString());
        }
        
        if (tripParams.weather) {
            if (tripParams.weather.conditions) {
                parts.push('with', tripParams.weather.conditions, 'weather');
            }
        }
        
        if (tripParams.terrain) {
            if (tripParams.terrain.classification) {
                parts.push('on', tripParams.terrain.classification, 'terrain');
            }
        }
        
        return parts.join(' ');
    }

    /**
     * Fetch weather data from OpenWeatherMap
     */
    async fetchWeatherData(location, date) {
        // This would integrate with the weather service
        // For now, return mock data
        return this.generateFallbackWeather(location, date);
    }

    /**
     * Fetch terrain data from mapping service
     */
    async fetchTerrainData(startLocation, endLocation) {
        // This would integrate with the terrain service
        // For now, return mock data
        return this.generateFallbackTerrain(startLocation, endLocation);
    }

    /**
     * Generate fallback weather data
     */
    generateFallbackWeather(location, date) {
        const targetDate = new Date(date);
        const month = targetDate.getMonth();
        
        let temp = 70;
        if (month >= 11 || month <= 2) temp = 50; // Winter
        else if (month >= 3 && month <= 5) temp = 65; // Spring
        else if (month >= 6 && month <= 8) temp = 85; // Summer
        else temp = 60; // Fall
        
        return {
            location,
            date: targetDate.toISOString().split('T')[0],
            temperature: temp,
            conditions: 'Partly Cloudy',
            precipitation: 20,
            wind: { speed: 5 },
            source: 'fallback_estimate'
        };
    }

    /**
     * Generate fallback terrain data
     */
    generateFallbackTerrain(startLocation, endLocation) {
        return {
            start_location: startLocation,
            end_location: endLocation,
            distance: 25,
            elevationGain: 500,
            maxGrade: 8,
            terrainType: 'mixed',
            difficultyScore: 40,
            source: 'fallback_estimate'
        };
    }

    /**
     * Generate trip recommendations
     */
    generateTripRecommendations(params) {
        const recommendations = [];
        
        if (params.weather) {
            if (params.weather.temperature > 85) {
                recommendations.push('Hot weather expected - monitor motor temperature');
            }
            if (params.weather.precipitation > 50) {
                recommendations.push('Rain likely - drive carefully and allow extra stopping distance');
            }
        }
        
        if (params.terrain) {
            if (params.terrain.maxGrade > 15) {
                recommendations.push('Steep terrain detected - ensure battery is fully charged');
            }
        }
        
        if (params.trip_type === 'camping') {
            recommendations.push('Pack emergency supplies and check charging options');
        }
        
        recommendations.push('Always save original controller settings before making changes');
        
        return recommendations;
    }

    /**
     * Generate comparison recommendation
     */
    generateComparisonRecommendation(comparison, scenario1, scenario2) {
        if (comparison.differences.length === 0) {
            return 'Both scenarios result in identical optimizations';
        }
        
        return `${comparison.differences.length} parameter differences found. Review the specific function changes to determine which scenario better fits your needs.`;
    }

    /**
     * Start the MCP server
     */
    async start() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        
        logger.info('GEM Optimizer MCP Server started');
        logger.info('Available tools: optimize_gem_controller, plan_gem_trip, get_weather_forecast, analyze_terrain, compare_optimizations, get_preset_configurations, save_trip_configuration');
    }
}

// Start the server
if (import.meta.url === `file://${process.argv[1]}`) {
    const server = new GEMOptimizerMCPServer();
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
        logger.info('Shutting down MCP server...');
        process.exit(0);
    });
    
    process.on('SIGTERM', () => {
        logger.info('Shutting down MCP server...');
        process.exit(0);
    });
    
    server.start().catch((error) => {
        logger.error('Failed to start MCP server:', error);
        process.exit(1);
    });
}

export default GEMOptimizerMCPServer;
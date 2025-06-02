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
                    },
                    {
                        name: 'optimize_for_beach_driving',
                        description: 'Optimize GEM controller settings specifically for beach driving conditions',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                vehicle_model: {
                                    type: 'string',
                                    enum: ['e2', 'e4', 'e6', 'eS', 'eL', 'elXD'],
                                    description: 'GEM vehicle model'
                                },
                                sand_type: {
                                    type: 'string',
                                    enum: ['soft', 'packed', 'mixed'],
                                    description: 'Type of sand conditions expected'
                                },
                                temperature: {
                                    type: 'number',
                                    description: 'Expected temperature in Fahrenheit'
                                },
                                load_weight: {
                                    type: 'number',
                                    description: 'Additional load weight in pounds'
                                }
                            },
                            required: ['vehicle_model']
                        }
                    },
                    {
                        name: 'optimize_for_hill_climbing',
                        description: 'Optimize GEM controller settings for steep terrain and hill climbing',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                vehicle_model: {
                                    type: 'string',
                                    enum: ['e2', 'e4', 'e6', 'eS', 'eL', 'elXD'],
                                    description: 'GEM vehicle model'
                                },
                                max_grade: {
                                    type: 'number',
                                    description: 'Maximum grade percentage expected'
                                },
                                elevation_gain: {
                                    type: 'number',
                                    description: 'Total elevation gain in feet'
                                },
                                distance: {
                                    type: 'number',
                                    description: 'Total distance in miles'
                                }
                            },
                            required: ['vehicle_model', 'max_grade']
                        }
                    },
                    {
                        name: 'optimize_for_cold_weather',
                        description: 'Optimize GEM controller settings for cold weather conditions',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                vehicle_model: {
                                    type: 'string',
                                    enum: ['e2', 'e4', 'e6', 'eS', 'eL', 'elXD'],
                                    description: 'GEM vehicle model'
                                },
                                temperature: {
                                    type: 'number',
                                    description: 'Expected temperature in Fahrenheit'
                                },
                                snow_conditions: {
                                    type: 'boolean',
                                    description: 'Whether snow or ice conditions are expected'
                                },
                                battery_age: {
                                    type: 'string',
                                    enum: ['new', 'good', 'fair', 'old'],
                                    description: 'Battery condition'
                                }
                            },
                            required: ['vehicle_model', 'temperature']
                        }
                    },
                    {
                        name: 'optimize_for_towing',
                        description: 'Optimize GEM controller settings for towing trailers or heavy loads',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                vehicle_model: {
                                    type: 'string',
                                    enum: ['e4', 'e6', 'eS', 'eL', 'elXD'],
                                    description: 'GEM vehicle model (towing capable)'
                                },
                                trailer_weight: {
                                    type: 'number',
                                    description: 'Trailer weight in pounds'
                                },
                                load_type: {
                                    type: 'string',
                                    enum: ['light_cargo', 'heavy_cargo', 'utility_trailer', 'passengers'],
                                    description: 'Type of load being towed'
                                },
                                terrain_type: {
                                    type: 'string',
                                    enum: ['flat', 'hilly', 'mixed'],
                                    description: 'Expected terrain type'
                                }
                            },
                            required: ['vehicle_model', 'trailer_weight']
                        }
                    },
                    {
                        name: 'optimize_for_maximum_range',
                        description: 'Optimize GEM controller settings for maximum battery range and efficiency',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                vehicle_model: {
                                    type: 'string',
                                    enum: ['e2', 'e4', 'e6', 'eS', 'eL', 'elXD'],
                                    description: 'GEM vehicle model'
                                },
                                target_distance: {
                                    type: 'number',
                                    description: 'Target distance to travel in miles'
                                },
                                speed_priority: {
                                    type: 'string',
                                    enum: ['efficiency', 'balance', 'performance'],
                                    description: 'Priority between efficiency and speed'
                                },
                                accessories: {
                                    type: 'array',
                                    items: { type: 'string' },
                                    description: 'List of accessories that will be used'
                                }
                            },
                            required: ['vehicle_model']
                        }
                    },
                    {
                        name: 'analyze_radius_terrain',
                        description: 'Analyze terrain within a radius for exploration planning',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                center_location: {
                                    type: 'string',
                                    description: 'Center location for radius analysis'
                                },
                                radius: {
                                    type: 'number',
                                    description: 'Analysis radius in miles (default: 5)'
                                },
                                vehicle_type: {
                                    type: 'string',
                                    enum: ['golf_cart', 'lsv', 'any'],
                                    description: 'Vehicle type for legal route filtering'
                                }
                            },
                            required: ['center_location']
                        }
                    },
                    {
                        name: 'get_real_time_weather_impact',
                        description: 'Get real-time weather conditions and their impact on vehicle performance',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                location: {
                                    type: 'string',
                                    description: 'Location for weather analysis'
                                },
                                vehicle_model: {
                                    type: 'string',
                                    enum: ['e2', 'e4', 'e6', 'eS', 'eL', 'elXD'],
                                    description: 'GEM vehicle model'
                                }
                            },
                            required: ['location']
                        }
                    },
                    {
                        name: 'natural_language_optimization',
                        description: 'Process any natural language optimization request with advanced AI analysis',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                query: {
                                    type: 'string',
                                    description: 'Natural language description of what you want to optimize (e.g., "make my GEM go faster for racing", "optimize for camping trip in mountains")'
                                },
                                context: {
                                    type: 'object',
                                    properties: {
                                        current_location: { type: 'string' },
                                        vehicle_condition: { type: 'string' },
                                        weather_conditions: { type: 'string' },
                                        time_of_day: { type: 'string' },
                                        urgency: { type: 'string', enum: ['low', 'medium', 'high'] }
                                    },
                                    description: 'Additional context for the optimization'
                                }
                            },
                            required: ['query']
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
                    
                    case 'optimize_for_beach_driving':
                        return await this.handleBeachOptimization(args);
                    
                    case 'optimize_for_hill_climbing':
                        return await this.handleHillClimbingOptimization(args);
                    
                    case 'optimize_for_cold_weather':
                        return await this.handleColdWeatherOptimization(args);
                    
                    case 'optimize_for_towing':
                        return await this.handleTowingOptimization(args);
                    
                    case 'optimize_for_maximum_range':
                        return await this.handleMaxRangeOptimization(args);
                    
                    case 'analyze_radius_terrain':
                        return await this.handleRadiusTerrainAnalysis(args);
                    
                    case 'get_real_time_weather_impact':
                        return await this.handleRealTimeWeatherImpact(args);
                    
                    case 'natural_language_optimization':
                        return await this.handleNaturalLanguageOptimization(args);
                    
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
     * Handle beach driving optimization
     */
    async handleBeachOptimization(args) {
        const { vehicle_model, sand_type = 'mixed', temperature = 75, load_weight = 0 } = args;
        
        const beachSettings = {
            1: 85,   // Reduced speed for sand
            3: 20,   // Higher pot gain for sand traction
            4: 280,  // Higher current for sand resistance
            6: 45,   // Slower acceleration for sand
            7: 85,   // Stronger deceleration for stopping in sand
            8: 280,  // Higher field current
            9: 180,  // Moderate regen to avoid wheel slip
            10: 95,  // Adjusted map select
            11: 8,   // Lower turf mode for beach conditions
            12: 8,   // Higher temp limit for beach heat
            20: 3    // Lower overspeed for safety
        };
        
        // Adjust for sand type
        if (sand_type === 'soft') {
            beachSettings[4] += 20; // More current for soft sand
            beachSettings[6] -= 10; // Even slower acceleration
        } else if (sand_type === 'packed') {
            beachSettings[1] += 10; // Slightly higher speed on packed sand
            beachSettings[6] += 10; // Faster acceleration
        }
        
        // Adjust for temperature
        if (temperature > 90) {
            beachSettings[4] -= 15; // Reduce current in extreme heat
            beachSettings[12] += 1; // Higher temp limit
        }
        
        // Adjust for load
        if (load_weight > 200) {
            beachSettings[4] += Math.round(load_weight / 50); // More current for load
            beachSettings[6] -= 5; // Slower acceleration with load
        }
        
        const response = {
            success: true,
            optimization_type: 'beach_driving',
            settings: beachSettings,
            conditions: {
                sand_type,
                temperature,
                load_weight,
                vehicle_model
            },
            recommendations: [
                'Check tire pressure - lower pressure improves sand traction',
                'Avoid sudden acceleration to prevent wheel spin',
                'Monitor battery temperature in hot sand conditions',
                'Consider salt air protection for electrical components',
                'Clean vehicle thoroughly after beach use'
            ],
            analysis: {
                optimized_for: 'Beach and sand driving conditions',
                key_adjustments: [
                    'Reduced top speed for safety on sand',
                    'Increased motor current for sand resistance',
                    'Optimized acceleration for traction control',
                    'Enhanced cooling for beach heat conditions'
                ]
            }
        };
        
        return {
            content: [{
                type: 'text',
                text: JSON.stringify(response, null, 2)
            }]
        };
    }

    /**
     * Handle hill climbing optimization
     */
    async handleHillClimbingOptimization(args) {
        const { vehicle_model, max_grade, elevation_gain = 0, distance = 0 } = args;
        
        const hillSettings = {
            1: 95,   // Slightly reduced speed for control
            3: 25,   // Higher pot gain for hill control
            4: 320,  // High current for hill climbing
            6: 35,   // Slower acceleration for control
            7: 90,   // Strong deceleration for downhill control
            8: 320,  // High field current for torque
            9: 250,  // Strong regen for downhill braking
            10: 110, // Higher map select for power
            11: 15,  // Higher turf mode for traction
            12: 9,   // Higher temp limit for sustained climbs
            20: 2    // Very low overspeed for safety
        };
        
        // Adjust for grade severity
        if (max_grade > 20) {
            hillSettings[4] = 350; // Maximum current for extreme grades
            hillSettings[8] = 350; // Maximum field current
            hillSettings[6] = 25;  // Very slow acceleration
        } else if (max_grade > 15) {
            hillSettings[4] += 20; // More current for steep grades
            hillSettings[6] -= 5;  // Slower acceleration
        }
        
        // Adjust for elevation gain
        if (elevation_gain > 1000) {
            hillSettings[9] += 20; // More regen for long descents
            hillSettings[12] += 1; // Higher temp limit for sustained use
        }
        
        // Vehicle-specific adjustments
        const vehicleAdjustments = {
            'e2': { 4: -20, 8: -20 }, // Less current for smaller motor
            'e6': { 4: +10, 8: +10 }, // More current for heavier vehicle
            'elXD': { 4: +30, 8: +30 } // Maximum for extra duty
        };
        
        if (vehicleAdjustments[vehicle_model]) {
            Object.keys(vehicleAdjustments[vehicle_model]).forEach(key => {
                hillSettings[key] += vehicleAdjustments[vehicle_model][key];
            });
        }
        
        const response = {
            success: true,
            optimization_type: 'hill_climbing',
            settings: hillSettings,
            conditions: {
                max_grade,
                elevation_gain,
                distance,
                vehicle_model
            },
            recommendations: [
                'Ensure battery is fully charged before attempting steep climbs',
                'Monitor motor temperature during extended climbs',
                'Take advantage of regenerative braking on descents',
                'Consider zig-zag pattern on extremely steep grades',
                'Allow motor cooling time between major climbs'
            ],
            warnings: max_grade > 20 ? [
                'EXTREME GRADE WARNING: Verify vehicle capability before attempting',
                'Consider alternative route if possible',
                'Have emergency plan in case of power loss'
            ] : max_grade > 15 ? [
                'Steep grade detected - drive carefully and monitor systems'
            ] : [],
            analysis: {
                optimized_for: `Hill climbing up to ${max_grade}% grade`,
                key_adjustments: [
                    'Increased motor current for climbing power',
                    'Enhanced regenerative braking for descents',
                    'Optimized acceleration for traction control',
                    'Adjusted temperature limits for sustained operation'
                ]
            }
        };
        
        return {
            content: [{
                type: 'text',
                text: JSON.stringify(response, null, 2)
            }]
        };
    }

    /**
     * Handle cold weather optimization
     */
    async handleColdWeatherOptimization(args) {
        const { vehicle_model, temperature, snow_conditions = false, battery_age = 'good' } = args;
        
        const coldSettings = {
            1: 105,  // Slightly higher speed to compensate for efficiency loss
            3: 18,   // Higher pot gain for cold conditions
            4: 270,  // Higher current for cold battery compensation
            6: 50,   // Slower acceleration for cold conditions
            7: 75,   // Moderate deceleration for cold weather
            8: 270,  // Higher field current for cold compensation
            9: 200,  // Reduced regen in very cold conditions
            10: 105, // Higher map select for power
            11: 12,  // Standard turf mode
            12: 5,   // Lower temp limit (motor stays cooler in cold)
            20: 6    // Standard overspeed
        };
        
        // Severe cold adjustments
        if (temperature < 32) {
            coldSettings[4] += 30; // Much more current for freezing conditions
            coldSettings[6] -= 10; // Even slower acceleration
            coldSettings[9] -= 25; // Less regen to avoid battery stress
            coldSettings[12] -= 1; // Even lower temp limit
        } else if (temperature < 50) {
            coldSettings[4] += 15; // More current for cold conditions
            coldSettings[6] -= 5;  // Slightly slower acceleration
        }
        
        // Snow/ice conditions
        if (snow_conditions) {
            coldSettings[1] -= 15;  // Much lower speed for safety
            coldSettings[6] -= 15;  // Very gentle acceleration
            coldSettings[7] += 15;  // More deceleration capability
            coldSettings[11] -= 3;  // Lower turf mode for traction
        }
        
        // Battery age adjustments
        const batteryAdjustments = {
            'new': { 4: 0, 9: 0 },
            'good': { 4: +5, 9: -5 },
            'fair': { 4: +15, 9: -15 },
            'old': { 4: +25, 9: -25 }
        };
        
        if (batteryAdjustments[battery_age]) {
            Object.keys(batteryAdjustments[battery_age]).forEach(key => {
                coldSettings[key] += batteryAdjustments[battery_age][key];
            });
        }
        
        const response = {
            success: true,
            optimization_type: 'cold_weather',
            settings: coldSettings,
            conditions: {
                temperature,
                snow_conditions,
                battery_age,
                vehicle_model
            },
            recommendations: [
                'Allow extra warm-up time before driving',
                'Monitor battery voltage closely in cold weather',
                'Keep vehicle in heated garage when possible',
                'Check tire pressure - cold air reduces pressure',
                'Consider battery blanket for extreme cold',
                snow_conditions ? 'Use tire chains or winter tires if available' : '',
                'Plan for reduced range in cold conditions'
            ].filter(Boolean),
            analysis: {
                optimized_for: `Cold weather operation at ${temperature}°F`,
                expected_range_reduction: temperature < 32 ? '30-40%' : temperature < 50 ? '15-25%' : '5-15%',
                key_adjustments: [
                    'Increased motor current to compensate for cold battery',
                    'Reduced regenerative braking to protect cold battery',
                    'Gentle acceleration for traction in cold conditions',
                    'Adjusted temperature limits for cold operation'
                ]
            }
        };
        
        return {
            content: [{
                type: 'text',
                text: JSON.stringify(response, null, 2)
            }]
        };
    }

    /**
     * Handle towing optimization
     */
    async handleTowingOptimization(args) {
        const { vehicle_model, trailer_weight, load_type = 'light_cargo', terrain_type = 'flat' } = args;
        
        // Verify vehicle is capable of towing
        const towingCapableModels = ['e4', 'e6', 'eS', 'eL', 'elXD'];
        if (!towingCapableModels.includes(vehicle_model)) {
            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify({
                        success: false,
                        error: `${vehicle_model} model is not recommended for towing. Consider e4, e6, eS, eL, or elXD models.`
                    }, null, 2)
                }]
            };
        }
        
        const towingSettings = {
            1: 90,   // Reduced speed for towing safety
            3: 22,   // Higher pot gain for load control
            4: 300,  // High current for pulling power
            6: 40,   // Slower acceleration for trailer stability
            7: 95,   // Enhanced deceleration for stopping with load
            8: 300,  // High field current for torque
            9: 220,  // Moderate regen (not too aggressive with trailer)
            10: 110, // Higher map select for power
            11: 13,  // Moderate turf mode
            12: 8,   // Higher temp limit for sustained towing
            20: 3    // Low overspeed for safety
        };
        
        // Adjust for trailer weight
        const weightFactor = trailer_weight / 500; // Base adjustment per 500 lbs
        towingSettings[4] += Math.round(weightFactor * 20); // More current for heavier loads
        towingSettings[8] += Math.round(weightFactor * 20); // More field current
        towingSettings[6] -= Math.round(weightFactor * 5);  // Slower acceleration
        
        // Load type adjustments
        const loadAdjustments = {
            'heavy_cargo': { 4: +30, 6: -10, 7: +10 },
            'utility_trailer': { 4: +20, 6: -5, 9: +10 },
            'passengers': { 4: +10, 6: +5, 7: +15 } // Gentler for passenger comfort
        };
        
        if (loadAdjustments[load_type]) {
            Object.keys(loadAdjustments[load_type]).forEach(key => {
                towingSettings[key] += loadAdjustments[load_type][key];
            });
        }
        
        // Terrain adjustments
        if (terrain_type === 'hilly') {
            towingSettings[4] += 25; // Much more current for hills with trailer
            towingSettings[8] += 25; // More field current
            towingSettings[6] -= 10; // Even slower acceleration
            towingSettings[9] += 30; // More regen for downhill control
        }
        
        // Vehicle-specific towing capacity adjustments
        const vehicleCapacities = {
            'e4': { max_weight: 800, 4: 0, 8: 0 },
            'e6': { max_weight: 1000, 4: +10, 8: +10 },
            'eS': { max_weight: 750, 4: -10, 8: -10 },
            'eL': { max_weight: 900, 4: +5, 8: +5 },
            'elXD': { max_weight: 1200, 4: +20, 8: +20 }
        };
        
        const capacity = vehicleCapacities[vehicle_model];
        if (capacity) {
            // Apply vehicle-specific adjustments
            towingSettings[4] += capacity[4];
            towingSettings[8] += capacity[8];
            
            // Check weight limits
            if (trailer_weight > capacity.max_weight) {
                return {
                    content: [{
                        type: 'text',
                        text: JSON.stringify({
                            success: false,
                            error: `Trailer weight ${trailer_weight} lbs exceeds ${vehicle_model} towing capacity of ${capacity.max_weight} lbs`,
                            recommendation: 'Reduce load or consider a more capable vehicle model'
                        }, null, 2)
                    }]
                };
            }
        }
        
        const response = {
            success: true,
            optimization_type: 'towing',
            settings: towingSettings,
            conditions: {
                vehicle_model,
                trailer_weight,
                load_type,
                terrain_type,
                towing_capacity: capacity?.max_weight
            },
            recommendations: [
                'Perform pre-trip inspection of trailer connections',
                'Check tire pressure on both vehicle and trailer',
                'Allow extra stopping distance when towing',
                'Use lower gears on hills and avoid sudden maneuvers',
                'Monitor motor temperature during extended towing',
                'Practice backing up with trailer in safe area first',
                terrain_type === 'hilly' ? 'Take breaks on long climbs to prevent overheating' : ''
            ].filter(Boolean),
            safety_notes: [
                `Maximum recommended trailer weight: ${capacity?.max_weight || 'See manual'} lbs`,
                'Always use proper hitch and safety chains',
                'Verify brake lights and turn signals work on trailer',
                'Check local regulations for towing requirements'
            ],
            analysis: {
                optimized_for: `Towing ${trailer_weight} lb ${load_type} on ${terrain_type} terrain`,
                expected_range_reduction: '25-40%',
                key_adjustments: [
                    'Increased motor current for pulling power',
                    'Enhanced deceleration for safe stopping with load',
                    'Reduced acceleration for trailer stability',
                    'Optimized regeneration for load control'
                ]
            }
        };
        
        return {
            content: [{
                type: 'text',
                text: JSON.stringify(response, null, 2)
            }]
        };
    }

    /**
     * Handle maximum range optimization
     */
    async handleMaxRangeOptimization(args) {
        const { vehicle_model, target_distance = 0, speed_priority = 'efficiency', accessories = [] } = args;
        
        const efficiencySettings = {
            1: 85,   // Reduced speed for efficiency
            3: 12,   // Lower pot gain for smooth operation
            4: 220,  // Reduced current for efficiency
            6: 70,   // Gentle acceleration
            7: 80,   // Moderate deceleration
            8: 220,  // Reduced field current
            9: 240,  // High regen for energy recovery
            10: 95,  // Lower map select for efficiency
            11: 9,   // Lower turf mode
            12: 7,   // Standard temp limit
            20: 4    // Low overspeed
        };
        
        // Speed priority adjustments
        if (speed_priority === 'performance') {
            efficiencySettings[1] += 15;  // Higher speed
            efficiencySettings[4] += 25;  // More current
            efficiencySettings[6] += 15;  // Faster acceleration
        } else if (speed_priority === 'balance') {
            efficiencySettings[1] += 8;   // Moderate speed increase
            efficiencySettings[4] += 10;  // Slight current increase
            efficiencySettings[6] += 8;   // Moderate acceleration
        }
        
        // Accessory power compensation
        let accessoryPowerDraw = 0;
        const accessoryPowerMap = {
            'lights': 50,
            'radio': 25,
            'heater': 200,
            'air_conditioning': 300,
            'winch': 500,
            'work_lights': 100
        };
        
        accessories.forEach(accessory => {
            accessoryPowerDraw += accessoryPowerMap[accessory] || 0;
        });
        
        if (accessoryPowerDraw > 100) {
            const powerFactor = accessoryPowerDraw / 100;
            efficiencySettings[9] += Math.round(powerFactor * 10); // More regen to offset power draw
        }
        
        // Target distance adjustments
        if (target_distance > 30) {
            efficiencySettings[1] -= 5;   // Even lower speed for long distance
            efficiencySettings[4] -= 10;  // Less current
            efficiencySettings[6] += 10;  // Even gentler acceleration
        }
        
        // Vehicle-specific efficiency adjustments
        const vehicleEfficiency = {
            'e2': { baseline_range: 35, 4: -15, 8: -15 }, // Lighter, less current needed
            'e4': { baseline_range: 30, 4: 0, 8: 0 },     // Standard
            'e6': { baseline_range: 25, 4: +10, 8: +10 }, // Heavier, needs more current
            'eS': { baseline_range: 32, 4: -5, 8: -5 },   // Utility but efficient
            'eL': { baseline_range: 28, 4: +5, 8: +5 },   // Larger utility
            'elXD': { baseline_range: 22, 4: +15, 8: +15 } // Heavy duty, shorter range
        };
        
        const vehicleData = vehicleEfficiency[vehicle_model] || vehicleEfficiency['e4'];
        efficiencySettings[4] += vehicleData[4];
        efficiencySettings[8] += vehicleData[8];
        
        // Calculate estimated range
        let estimatedRange = vehicleData.baseline_range;
        
        // Adjust for speed priority
        if (speed_priority === 'performance') {
            estimatedRange *= 0.85; // 15% reduction
        } else if (speed_priority === 'balance') {
            estimatedRange *= 0.92; // 8% reduction
        } else {
            estimatedRange *= 1.05; // 5% improvement for pure efficiency
        }
        
        // Adjust for accessories
        if (accessoryPowerDraw > 0) {
            const accessoryImpact = 1 - (accessoryPowerDraw / 1000); // Rough calculation
            estimatedRange *= Math.max(accessoryImpact, 0.6); // Minimum 40% reduction
        }
        
        const response = {
            success: true,
            optimization_type: 'maximum_range',
            settings: efficiencySettings,
            conditions: {
                vehicle_model,
                target_distance,
                speed_priority,
                accessories,
                accessory_power_draw: accessoryPowerDraw
            },
            range_analysis: {
                baseline_range: vehicleData.baseline_range,
                estimated_range: Math.round(estimatedRange),
                range_factors: {
                    speed_priority_impact: speed_priority === 'efficiency' ? '+5%' : 
                                          speed_priority === 'balance' ? '-8%' : '-15%',
                    accessory_impact: accessoryPowerDraw > 0 ? `-${Math.round((1 - (1 - accessoryPowerDraw/1000)) * 100)}%` : '0%'
                }
            },
            recommendations: [
                'Maintain steady speed and avoid rapid acceleration',
                'Use regenerative braking whenever possible',
                'Plan route to minimize hills and stops',
                'Turn off unnecessary accessories to maximize range',
                'Check tire pressure regularly for optimal efficiency',
                'Consider charging opportunities along longer routes',
                target_distance > estimatedRange ? 
                    `WARNING: Target distance ${target_distance} miles exceeds estimated range ${Math.round(estimatedRange)} miles` : ''
            ].filter(Boolean),
            efficiency_tips: [
                'Coast to red lights and stop signs when possible',
                'Use the most direct route available',
                'Avoid peak traffic hours to reduce stop-and-go driving',
                'Remove unnecessary weight from vehicle',
                'Combine multiple errands into single trip'
            ],
            analysis: {
                optimized_for: `Maximum range with ${speed_priority} speed priority`,
                estimated_range: `${Math.round(estimatedRange)} miles`,
                key_adjustments: [
                    'Reduced motor current for efficiency',
                    'Enhanced regenerative braking for energy recovery',
                    'Optimized acceleration for smooth operation',
                    'Balanced speed settings for range vs usability'
                ]
            }
        };
        
        return {
            content: [{
                type: 'text',
                text: JSON.stringify(response, null, 2)
            }]
        };
    }

    /**
     * Handle radius terrain analysis
     */
    async handleRadiusTerrainAnalysis(args) {
        const { center_location, radius = 5, vehicle_type = 'any' } = args;
        
        try {
            // This would integrate with the enhanced terrain service
            // For now, simulate the analysis
            const analysis = {
                center: center_location,
                radius: radius,
                vehicle_type: vehicle_type,
                terrain_zones: {
                    flat: { percentage: 45, suitable_for_golf_cart: true },
                    rolling: { percentage: 35, suitable_for_golf_cart: true },
                    hilly: { percentage: 15, suitable_for_golf_cart: false },
                    steep: { percentage: 5, suitable_for_golf_cart: false }
                },
                elevation_analysis: {
                    min_elevation: 500,
                    max_elevation: 1200,
                    elevation_range: 700,
                    average_grade: 4.2,
                    max_grade: 12.5
                },
                legal_routes: [
                    {
                        id: 'route_1',
                        destination: 'Scenic overlook',
                        distance: 3.2,
                        estimated_grade: 5.5,
                        suitable_for: vehicle_type === 'golf_cart' ? 'Golf Cart & LSV' : 'LSV only'
                    },
                    {
                        id: 'route_2', 
                        destination: 'Valley loop',
                        distance: 4.8,
                        estimated_grade: 2.1,
                        suitable_for: 'All vehicles'
                    }
                ],
                recommendations: this.generateRadiusRecommendations(radius, vehicle_type)
            };
            
            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify({
                        success: true,
                        analysis: analysis
                    }, null, 2)
                }]
            };
            
        } catch (error) {
            logger.error('Radius terrain analysis error:', error);
            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify({
                        success: false,
                        error: error.message,
                        fallback: 'Use conservative settings for unknown terrain'
                    }, null, 2)
                }]
            };
        }
    }

    /**
     * Handle real-time weather impact analysis
     */
    async handleRealTimeWeatherImpact(args) {
        const { location, vehicle_model } = args;
        
        try {
            // Get current weather (would integrate with weather service)
            const weather = await this.fetchWeatherData(location, new Date());
            
            // Calculate performance impact
            const impact = this.calculateWeatherPerformanceImpact(weather, vehicle_model);
            
            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify({
                        success: true,
                        weather: weather,
                        performance_impact: impact,
                        controller_adjustments: impact.recommended_adjustments,
                        recommendations: impact.recommendations
                    }, null, 2)
                }]
            };
            
        } catch (error) {
            logger.error('Weather impact analysis error:', error);
            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify({
                        success: false,
                        error: error.message,
                        fallback: this.generateFallbackWeatherImpact(location)
                    }, null, 2)
                }]
            };
        }
    }

    /**
     * Handle natural language optimization with advanced AI
     */
    async handleNaturalLanguageOptimization(args) {
        const { query, context = {} } = args;
        
        try {
            // Enhanced NLP processing with context
            const enhancedParameters = nlpProcessor.processQueryWithContext(query, context);
            
            // Generate AI-driven optimization
            const optimization = gemOptimizer.optimizeFromAdvancedNLP(enhancedParameters);
            
            // Add real-time adjustments if location is provided
            if (context.current_location) {
                const weatherImpact = await this.handleRealTimeWeatherImpact({
                    location: context.current_location,
                    vehicle_model: enhancedParameters.vehicle.model || 'e4'
                });
                
                if (weatherImpact.success) {
                    optimization.weather_adjustments = JSON.parse(weatherImpact.content[0].text).controller_adjustments;
                }
            }
            
            const response = {
                success: true,
                original_query: query,
                context_used: context,
                optimization: optimization,
                nlp_analysis: {
                    extracted_parameters: enhancedParameters,
                    confidence: enhancedParameters.confidence,
                    interpretation: enhancedParameters.interpretation,
                    suggestions: nlpProcessor.generateAdvancedSuggestions(enhancedParameters)
                },
                explanation: this.generateAdvancedExplanation(optimization, enhancedParameters, query),
                follow_up_suggestions: [
                    'Would you like me to explain any specific controller setting?',
                    'Should I save this optimization for future use?',
                    'Would you like to compare with other optimization scenarios?'
                ]
            };
            
            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify(response, null, 2)
                }]
            };
            
        } catch (error) {
            logger.error('Natural language optimization error:', error);
            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify({
                        success: false,
                        error: error.message,
                        suggestion: 'Try rephrasing your request or providing more specific details about your vehicle and intended use.'
                    }, null, 2)
                }]
            };
        }
    }

    /**
     * Generate radius exploration recommendations
     */
    generateRadiusRecommendations(radius, vehicle_type) {
        const recommendations = [];
        
        if (radius > 8) {
            recommendations.push('Large exploration area - plan multiple shorter trips');
            recommendations.push('Identify charging opportunities for longer range needs');
        }
        
        if (vehicle_type === 'golf_cart') {
            recommendations.push('Stick to flatter areas and local roads only');
            recommendations.push('Verify speed limit compliance (≤25 MPH zones)');
        } else if (vehicle_type === 'lsv') {
            recommendations.push('Can handle more challenging terrain up to 25 MPH roads');
            recommendations.push('Check local LSV regulations and requirements');
        }
        
        recommendations.push('Use legal routing system to verify road access');
        recommendations.push('Check weather conditions before longer explorations');
        recommendations.push('Inform others of your planned route and return time');
        
        return recommendations;
    }

    /**
     * Calculate weather performance impact
     */
    calculateWeatherPerformanceImpact(weather, vehicle_model) {
        const impact = {
            temperature_effect: 'normal',
            range_impact: 0,
            recommended_adjustments: {},
            recommendations: []
        };
        
        // Temperature impact
        if (weather.temperature < 32) {
            impact.temperature_effect = 'severe_cold';
            impact.range_impact = -35;
            impact.recommended_adjustments = { 4: +25, 6: -10, 9: -20, 12: -2 };
            impact.recommendations.push('Allow extra warm-up time');
            impact.recommendations.push('Monitor battery voltage closely');
        } else if (weather.temperature < 50) {
            impact.temperature_effect = 'cold';
            impact.range_impact = -20;
            impact.recommended_adjustments = { 4: +15, 6: -5, 9: -10 };
            impact.recommendations.push('Cold weather reduces battery efficiency');
        } else if (weather.temperature > 95) {
            impact.temperature_effect = 'extreme_heat';
            impact.range_impact = -15;
            impact.recommended_adjustments = { 4: -15, 7: +10, 12: +2 };
            impact.recommendations.push('Monitor motor temperature closely');
            impact.recommendations.push('Take breaks to allow cooling');
        } else if (weather.temperature > 85) {
            impact.temperature_effect = 'hot';
            impact.range_impact = -8;
            impact.recommended_adjustments = { 4: -8, 12: +1 };
            impact.recommendations.push('Hot weather increases cooling needs');
        }
        
        // Precipitation impact
        if (weather.precipitation > 20) {
            impact.recommended_adjustments[1] = (impact.recommended_adjustments[1] || 0) - 10; // Reduce speed
            impact.recommended_adjustments[6] = (impact.recommended_adjustments[6] || 0) - 10; // Slower acceleration
            impact.recommendations.push('Wet conditions - drive carefully and allow extra stopping distance');
        }
        
        return impact;
    }

    /**
     * Generate fallback weather impact
     */
    generateFallbackWeatherImpact(location) {
        return {
            temperature_effect: 'unknown',
            range_impact: 0,
            recommended_adjustments: {},
            recommendations: [
                'Weather data unavailable - use conservative settings',
                'Monitor vehicle performance for any issues',
                'Check local weather conditions manually'
            ]
        };
    }

    /**
     * Generate advanced explanation for natural language optimization
     */
    generateAdvancedExplanation(optimization, parameters, originalQuery) {
        const explanations = [];
        
        explanations.push(`I analyzed your request: "${originalQuery}"`);
        
        if (parameters.interpretation) {
            explanations.push(`My interpretation: ${parameters.interpretation}`);
        }
        
        if (parameters.vehicle.model) {
            explanations.push(`Optimized for ${parameters.vehicle.model} vehicle`);
        }
        
        if (parameters.priorities && Object.keys(parameters.priorities).length > 0) {
            const priorityList = Object.entries(parameters.priorities)
                .sort(([,a], [,b]) => b - a)
                .map(([key, value]) => `${key} (${value}/10)`)
                .slice(0, 3);
            explanations.push(`Priorities identified: ${priorityList.join(', ')}`);
        }
        
        if (optimization.changes && optimization.changes.length > 0) {
            explanations.push(`Modified ${optimization.changes.length} controller parameters`);
        }
        
        explanations.push(`Analysis confidence: ${Math.round(parameters.confidence * 100)}%`);
        
        return explanations.join('. ') + '.';
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
/**
 * AI-Driven Calculation Engine
 * Replaces all manual calculations with intelligent AI-powered computations
 * Integrates weather, terrain, and real-time data for optimal settings
 */
class AICalculationEngine {
    constructor() {
        this.weatherService = typeof WeatherService !== 'undefined' ? new WeatherService() : null;
        this.terrainService = typeof TerrainService !== 'undefined' ? new TerrainService() : null;
        this.aiAssistant = typeof AIAssistant !== 'undefined' ? new AIAssistant() : null;
        
        this.calculationCache = new Map();
        this.realTimeFactors = {
            temperature: 70,
            humidity: 50,
            windSpeed: 0,
            elevation: 0,
            grade: 0,
            batteryTemp: 70,
            motorTemp: 70
        };
        
        this.initialize();
    }
    
    /**
     * Initialize AI calculation engine
     */
    async initialize() {
        try {
            // Initialize sub-services
            if (this.weatherService) await this.weatherService.initialize?.();
            if (this.terrainService) await this.terrainService.initialize?.();
            if (this.aiAssistant) await this.aiAssistant.init?.();
            
            // Start real-time monitoring
            this.startRealTimeMonitoring();
            
            console.log('AI Calculation Engine initialized successfully');
        } catch (error) {
            console.error('AI Calculation Engine initialization failed:', error);
        }
    }
    
    /**
     * AI-powered controller settings calculation
     */
    async calculateOptimalSettings(inputData, context = {}) {
        const cacheKey = this.generateCacheKey('optimal-settings', inputData, context);
        
        if (this.calculationCache.has(cacheKey)) {
            const cached = this.calculationCache.get(cacheKey);
            if (Date.now() - cached.timestamp < 300000) { // 5 minutes
                return cached.result;
            }
        }
        
        try {
            // Gather comprehensive environmental data
            const environmentalData = await this.gatherEnvironmentalData(context);
            
            // Get AI-powered base calculations
            const baseSettings = await this.calculateAIBaseSettings(inputData);
            
            // Apply real-time environmental adjustments
            const environmentalAdjustments = await this.calculateEnvironmentalAdjustments(
                environmentalData, inputData
            );
            
            // Apply motor condition adjustments
            const motorAdjustments = await this.calculateMotorConditionAdjustments(inputData);
            
            // Apply accessory load adjustments
            const accessoryAdjustments = await this.calculateAccessoryLoadAdjustments(
                inputData.accessories || []
            );
            
            // Apply terrain-specific adjustments
            const terrainAdjustments = await this.calculateTerrainAdjustments(
                environmentalData.terrain, inputData
            );
            
            // Combine all adjustments using AI weighting
            const finalSettings = await this.combineAdjustmentsWithAI({
                base: baseSettings,
                environmental: environmentalAdjustments,
                motor: motorAdjustments,
                accessories: accessoryAdjustments,
                terrain: terrainAdjustments
            }, inputData, environmentalData);
            
            // Cache result
            this.calculationCache.set(cacheKey, {
                result: finalSettings,
                timestamp: Date.now()
            });
            
            return finalSettings;
            
        } catch (error) {
            console.error('AI calculation failed:', error);
            return this.fallbackCalculation(inputData);
        }
    }
    
    /**
     * Gather comprehensive environmental data
     */
    async gatherEnvironmentalData(context) {
        const data = {
            weather: null,
            terrain: null,
            location: context.location || null,
            timestamp: new Date()
        };
        
        try {
            // Get real-time weather data
            if (this.weatherService && context.location) {
                data.weather = await this.weatherService.getCurrentWeather(context.location);
                
                // Update real-time factors
                if (data.weather) {
                    this.realTimeFactors.temperature = data.weather.temperature;
                    this.realTimeFactors.humidity = data.weather.humidity;
                    this.realTimeFactors.windSpeed = data.weather.windSpeed || 0;
                }
            }
            
            // Get terrain data
            if (this.terrainService && context.coordinates) {
                data.terrain = await this.terrainService.analyzeRoute({
                    coordinates: context.coordinates,
                    radius: context.radius || 5
                });
                
                if (data.terrain) {
                    this.realTimeFactors.elevation = data.terrain.averageElevation || 0;
                    this.realTimeFactors.grade = data.terrain.averageGrade || 0;
                }
            }
            
        } catch (error) {
            console.warn('Failed to gather environmental data:', error);
        }
        
        return data;
    }
    
    /**
     * AI-powered base settings calculation
     */
    async calculateAIBaseSettings(inputData) {
        const { vehicleModel, year, motorType, currentSpeed, weight } = inputData;
        
        // Use AI assistant for intelligent base calculation
        if (this.aiAssistant) {
            const aiResult = await this.aiAssistant.suggestOptimalSettings({
                vehicleData: inputData,
                accessories: inputData.accessories || [],
                conditions: this.realTimeFactors,
                drivingMode: inputData.drivingMode || 'normal'
            });
            
            if (aiResult.success) {
                return {
                    settings: aiResult.settings,
                    confidence: aiResult.confidence,
                    reasoning: aiResult.explanations
                };
            }
        }
        
        // Enhanced fallback with AI-like logic
        return this.calculateIntelligentFallback(inputData);
    }
    
    /**
     * Calculate environmental adjustments based on real-time data
     */
    async calculateEnvironmentalAdjustments(environmentalData, inputData) {
        const adjustments = {};
        
        // Temperature-based adjustments
        if (environmentalData.weather) {
            const temp = environmentalData.weather.temperature;
            
            // Cold weather adjustments (< 50°F)
            if (temp < 50) {
                adjustments[4] = Math.ceil((50 - temp) * 0.5); // Increase armature current
                adjustments[6] = Math.ceil((50 - temp) * 0.3); // Slower acceleration in cold
                adjustments[12] = Math.max(5, 7 - Math.floor((50 - temp) / 10)); // Lower temp limit
            }
            
            // Hot weather adjustments (> 85°F)
            if (temp > 85) {
                adjustments[4] = -Math.ceil((temp - 85) * 0.4); // Reduce current to prevent overheating
                adjustments[7] = Math.ceil((temp - 85) * 0.2); // Increase deceleration for cooling
                adjustments[12] = Math.min(12, 7 + Math.floor((temp - 85) / 10)); // Higher temp limit
            }
            
            // Humidity adjustments
            const humidity = environmentalData.weather.humidity;
            if (humidity > 80) {
                adjustments[9] = Math.ceil((humidity - 80) * 0.1); // Increase regen for efficiency
            }
            
            // Wind adjustments
            const windSpeed = environmentalData.weather.windSpeed || 0;
            if (windSpeed > 15) {
                adjustments[1] = -Math.ceil(windSpeed * 0.2); // Reduce speed scaling for headwinds
                adjustments[4] = Math.ceil(windSpeed * 0.3); // Increase current for wind resistance
            }
        }
        
        return {
            adjustments,
            reasoning: this.generateEnvironmentalReasoning(environmentalData),
            confidence: environmentalData.weather ? 0.9 : 0.6
        };
    }
    
    /**
     * Calculate motor condition-based adjustments
     */
    async calculateMotorConditionAdjustments(inputData) {
        const motorCondition = inputData.motorCondition || {};
        const adjustments = {};
        
        // Age-based adjustments
        const age = motorCondition.age || 'unknown';
        const ageFactors = {
            'new': 1.0,
            'low': 0.95,
            'moderate': 0.85,
            'high': 0.75,
            'very-high': 0.65,
            'unknown': 0.8
        };
        
        const ageFactor = ageFactors[age] || 0.8;
        
        // Condition indicator adjustments
        if (motorCondition.sparking) {
            adjustments[4] = -15; // Reduce armature current
            adjustments[8] = -10; // Reduce field current
        }
        
        if (motorCondition.noise) {
            adjustments[6] = -5; // Gentler acceleration
            adjustments[7] = 5; // Faster deceleration
        }
        
        if (motorCondition.overheating) {
            adjustments[4] = -20; // Significant current reduction
            adjustments[12] = Math.max(3, 7 - 2); // Lower temperature limit
        }
        
        if (motorCondition.vibration) {
            adjustments[6] = -10; // Much gentler acceleration
            adjustments[1] = -5; // Reduce top speed
        }
        
        if (motorCondition.powerLoss) {
            adjustments[3] = 3; // Increase pot gain
            adjustments[6] = 5; // Slightly faster acceleration to compensate
        }
        
        // Apply age factor to all positive adjustments
        Object.keys(adjustments).forEach(key => {
            if (adjustments[key] > 0) {
                adjustments[key] = Math.ceil(adjustments[key] * ageFactor);
            }
        });
        
        return {
            adjustments,
            ageFactor,
            confidence: Object.keys(motorCondition).length > 2 ? 0.95 : 0.7
        };
    }
    
    /**
     * Calculate accessory load adjustments
     */
    async calculateAccessoryLoadAdjustments(accessories) {
        let totalPowerDraw = 0;
        let totalWeight = 0;
        let aeroImpact = 0;
        const adjustments = {};
        
        accessories.forEach(accessory => {
            if (accessory.installed) {
                const config = accessory.currentConfig || accessory.variants?.basic || {};
                totalPowerDraw += config.powerDraw || 0;
                totalWeight += config.weight || 0;
                aeroImpact += config.aeroImpact || 0;
            }
        });
        
        // Power draw adjustments
        if (totalPowerDraw > 100) {
            const powerFactor = totalPowerDraw / 100;
            adjustments[9] = Math.ceil(powerFactor * 5); // Increase regen
            adjustments[7] = Math.ceil(powerFactor * 3); // Increase deceleration rate
        }
        
        // Weight adjustments
        if (totalWeight > 100) {
            const weightFactor = totalWeight / 100;
            adjustments[4] = Math.ceil(weightFactor * 8); // Increase armature current
            adjustments[6] = Math.max(5, 60 - Math.ceil(weightFactor * 5)); // Reduce acceleration rate
        }
        
        // Aerodynamic adjustments
        if (aeroImpact > 5) {
            adjustments[1] = -Math.ceil(aeroImpact); // Reduce speed scaling
            adjustments[4] = Math.ceil(aeroImpact * 1.5); // Increase current for wind resistance
        }
        
        return {
            adjustments,
            totalPowerDraw,
            totalWeight,
            aeroImpact,
            confidence: 0.9
        };
    }
    
    /**
     * Calculate terrain-specific adjustments
     */
    async calculateTerrainAdjustments(terrainData, inputData) {
        const adjustments = {};
        
        if (!terrainData) return { adjustments, confidence: 0.3 };
        
        // Elevation adjustments
        const elevation = terrainData.averageElevation || 0;
        if (elevation > 3000) { // High altitude
            const altitudeFactor = (elevation - 3000) / 1000;
            adjustments[4] = Math.ceil(altitudeFactor * 5); // Increase current for thin air
            adjustments[6] = -Math.ceil(altitudeFactor * 2); // Gentler acceleration
        }
        
        // Grade adjustments
        const grade = terrainData.averageGrade || 0;
        if (Math.abs(grade) > 3) {
            if (grade > 3) { // Uphill
                adjustments[4] = Math.ceil(grade * 2); // More current for hills
                adjustments[6] = Math.max(20, 60 - Math.ceil(grade * 3)); // Slower acceleration
                adjustments[8] = Math.ceil(grade * 1.5); // More field current
            } else if (grade < -3) { // Downhill
                adjustments[7] = Math.ceil(Math.abs(grade) * 2); // More aggressive deceleration
                adjustments[9] = Math.ceil(Math.abs(grade) * 3); // More regenerative braking
            }
        }
        
        // Terrain difficulty adjustments
        const difficulty = terrainData.difficulty || 'moderate';
        const difficultyAdjustments = {
            'easy': { 6: 5, 7: -3 }, // Faster acceleration, gentler braking
            'moderate': {}, // No adjustments
            'hard': { 4: 10, 6: -10, 12: 1 }, // More current, slower accel, higher temp limit
            'extreme': { 4: 20, 6: -20, 7: 10, 12: 2 } // Significant adjustments
        };
        
        Object.assign(adjustments, difficultyAdjustments[difficulty] || {});
        
        return {
            adjustments,
            elevation,
            grade,
            difficulty,
            confidence: terrainData.confidence || 0.8
        };
    }
    
    /**
     * Combine all adjustments using AI weighting
     */
    async combineAdjustmentsWithAI(adjustmentSets, inputData, environmentalData) {
        const finalSettings = { ...adjustmentSets.base.settings };
        const combinedAdjustments = {};
        const weights = {
            environmental: 0.25,
            motor: 0.30,
            accessories: 0.20,
            terrain: 0.25
        };
        
        // Combine adjustments with intelligent conflict resolution
        const allAdjustments = [
            { adj: adjustmentSets.environmental?.adjustments || {}, weight: weights.environmental },
            { adj: adjustmentSets.motor?.adjustments || {}, weight: weights.motor },
            { adj: adjustmentSets.accessories?.adjustments || {}, weight: weights.accessories },
            { adj: adjustmentSets.terrain?.adjustments || {}, weight: weights.terrain }
        ];
        
        // For each function parameter
        for (let func = 1; func <= 26; func++) {
            let totalAdjustment = 0;
            let totalWeight = 0;
            
            allAdjustments.forEach(({ adj, weight }) => {
                if (adj[func] !== undefined) {
                    totalAdjustment += adj[func] * weight;
                    totalWeight += weight;
                }
            });
            
            if (totalWeight > 0) {
                combinedAdjustments[func] = Math.round(totalAdjustment / totalWeight);
            }
        }
        
        // Apply adjustments to final settings
        Object.keys(combinedAdjustments).forEach(func => {
            const baseValue = finalSettings[func] || this.getDefaultValue(func);
            finalSettings[func] = this.validateSettingValue(
                func, 
                baseValue + combinedAdjustments[func]
            );
        });
        
        // Generate comprehensive analysis
        const analysis = {
            adjustmentSummary: combinedAdjustments,
            environmentalFactors: environmentalData,
            motorCondition: adjustmentSets.motor,
            accessoryImpact: adjustmentSets.accessories,
            terrainAnalysis: adjustmentSets.terrain,
            confidence: this.calculateOverallConfidence(adjustmentSets),
            recommendations: await this.generateAIRecommendations(finalSettings, adjustmentSets)
        };
        
        return {
            settings: finalSettings,
            analysis: analysis,
            timestamp: new Date(),
            source: 'ai_calculation_engine'
        };
    }
    
    /**
     * Real-time monitoring and updates
     */
    startRealTimeMonitoring() {
        // Monitor for environmental changes every 5 minutes
        setInterval(async () => {
            try {
                await this.updateRealTimeFactors();
            } catch (error) {
                console.warn('Real-time monitoring update failed:', error);
            }
        }, 300000); // 5 minutes
        
        // Clear cache every 30 minutes
        setInterval(() => {
            this.clearOldCache();
        }, 1800000); // 30 minutes
    }
    
    /**
     * Update real-time environmental factors
     */
    async updateRealTimeFactors() {
        const currentLocation = this.getCurrentLocation();
        if (currentLocation && this.weatherService) {
            try {
                const weather = await this.weatherService.getCurrentWeather(currentLocation);
                if (weather) {
                    this.realTimeFactors.temperature = weather.temperature;
                    this.realTimeFactors.humidity = weather.humidity;
                    this.realTimeFactors.windSpeed = weather.windSpeed || 0;
                    
                    // Trigger recalculation for active sessions
                    this.triggerRecalculationForActiveUsers();
                }
            } catch (error) {
                console.warn('Failed to update real-time weather:', error);
            }
        }
    }
    
    /**
     * Natural language query processing
     */
    async processNaturalLanguageQuery(query, context = {}) {
        const normalizedQuery = query.toLowerCase();
        
        // Parse intent and extract parameters
        const intent = this.parseQueryIntent(normalizedQuery);
        const parameters = this.extractQueryParameters(normalizedQuery, context);
        
        switch (intent.type) {
            case 'optimize_for_conditions':
                return await this.optimizeForConditions(intent.conditions, parameters);
                
            case 'beach_driving':
                return await this.optimizeForBeachDriving(parameters);
                
            case 'hill_climbing':
                return await this.optimizeForHillClimbing(parameters);
                
            case 'cold_weather':
                return await this.optimizeForColdWeather(parameters);
                
            case 'hot_weather':
                return await this.optimizeForHotWeather(parameters);
                
            case 'towing':
                return await this.optimizeForTowing(parameters);
                
            case 'maximum_range':
                return await this.optimizeForMaximumRange(parameters);
                
            case 'maximum_performance':
                return await this.optimizeForMaximumPerformance(parameters);
                
            default:
                return await this.handleGenericOptimization(query, parameters);
        }
    }
    
    /**
     * Optimize for beach driving
     */
    async optimizeForBeachDriving(parameters) {
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
        
        return {
            settings: beachSettings,
            conditions: ['sandy_terrain', 'high_resistance', 'moderate_temperature'],
            tips: [
                'Check tire pressure - lower pressure improves sand traction',
                'Avoid sudden acceleration to prevent wheel spin',
                'Monitor battery temperature in hot sand conditions',
                'Consider salt air protection for electrical components'
            ],
            analysis: {
                optimizedFor: 'Beach and sand driving conditions',
                keyAdjustments: [
                    'Reduced top speed for safety on sand',
                    'Increased motor current for sand resistance',
                    'Optimized acceleration for traction control',
                    'Enhanced cooling for beach heat conditions'
                ]
            }
        };
    }
    
    /**
     * Utility functions
     */
    parseQueryIntent(query) {
        const intentPatterns = {
            beach_driving: /beach|sand|shore|coastal/,
            hill_climbing: /hill|mountain|climb|steep|grade/,
            cold_weather: /cold|winter|snow|ice|freeze/,
            hot_weather: /hot|summer|heat|desert/,
            towing: /tow|pull|haul|trailer|cargo/,
            maximum_range: /range|efficiency|distance|battery/,
            maximum_performance: /performance|speed|power|fast/
        };
        
        for (const [type, pattern] of Object.entries(intentPatterns)) {
            if (pattern.test(query)) {
                return { type, confidence: 0.9 };
            }
        }
        
        return { type: 'generic', confidence: 0.5 };
    }
    
    extractQueryParameters(query, context) {
        const parameters = { ...context };
        
        // Extract numerical values
        const numbers = query.match(/\d+/g);
        if (numbers) {
            parameters.extractedNumbers = numbers.map(n => parseInt(n));
        }
        
        // Extract conditions
        const conditions = [];
        if (/hot|heat|warm/.test(query)) conditions.push('hot_weather');
        if (/cold|cool|freeze/.test(query)) conditions.push('cold_weather');
        if (/wet|rain|humid/.test(query)) conditions.push('wet_conditions');
        if (/dry|arid|desert/.test(query)) conditions.push('dry_conditions');
        if (/wind|windy|gusty/.test(query)) conditions.push('windy_conditions');
        
        parameters.detectedConditions = conditions;
        
        return parameters;
    }
    
    generateCacheKey(...args) {
        return JSON.stringify(args).replace(/[^a-zA-Z0-9]/g, '').substring(0, 50);
    }
    
    validateSettingValue(func, value) {
        const ranges = {
            1: [50, 150], 3: [5, 50], 4: [100, 350], 6: [10, 100], 7: [10, 100],
            8: [100, 350], 9: [50, 300], 10: [50, 150], 11: [5, 40], 12: [3, 12], 20: [1, 15]
        };
        
        const range = ranges[func];
        if (range) {
            return Math.max(range[0], Math.min(range[1], Math.round(value)));
        }
        
        return Math.max(0, Math.min(1000, Math.round(value)));
    }
    
    getDefaultValue(func) {
        const defaults = {
            1: 100, 3: 15, 4: 245, 6: 60, 7: 70, 8: 245, 9: 225, 10: 100, 11: 11, 12: 7, 20: 5
        };
        return defaults[func] || 100;
    }
    
    clearOldCache() {
        const now = Date.now();
        for (const [key, value] of this.calculationCache.entries()) {
            if (now - value.timestamp > 1800000) { // 30 minutes
                this.calculationCache.delete(key);
            }
        }
    }
    
    getCurrentLocation() {
        // Get current location from various sources
        return localStorage.getItem('current-location') || 
               sessionStorage.getItem('user-location') || 
               null;
    }
    
    triggerRecalculationForActiveUsers() {
        // Dispatch event for active calculation updates
        window.dispatchEvent(new CustomEvent('aiCalculationUpdate', {
            detail: { factors: this.realTimeFactors }
        }));
    }
    
    calculateOverallConfidence(adjustmentSets) {
        const confidences = Object.values(adjustmentSets)
            .map(set => set?.confidence || 0.5)
            .filter(c => c > 0);
        
        return confidences.length > 0 ? 
            confidences.reduce((sum, c) => sum + c, 0) / confidences.length : 0.7;
    }
    
    async generateAIRecommendations(settings, adjustmentSets) {
        const recommendations = [];
        
        // Analyze settings for potential improvements
        if (settings[4] > 300) {
            recommendations.push('High motor current detected - monitor temperature closely');
        }
        
        if (settings[1] > 120) {
            recommendations.push('High speed setting - ensure legal compliance for your area');
        }
        
        if (adjustmentSets.motor?.ageFactor < 0.8) {
            recommendations.push('Motor showing age - consider professional inspection');
        }
        
        return recommendations;
    }
    
    calculateIntelligentFallback(inputData) {
        // AI-like fallback calculation
        const baseSettings = {
            1: 100, 3: 15, 4: 245, 6: 60, 7: 70, 8: 245, 9: 225, 10: 100, 11: 11, 12: 7, 20: 5
        };
        
        // Apply basic vehicle-specific adjustments
        if (inputData.vehicleModel === 'e6') {
            baseSettings[4] += 20; // More current for heavier vehicle
            baseSettings[8] += 20;
        }
        
        if (inputData.motorType === 'dc-upgrade') {
            baseSettings[1] += 10; // Higher speed potential
            baseSettings[4] += 30; // More current capability
        }
        
        return {
            settings: baseSettings,
            confidence: 0.7,
            reasoning: 'Fallback calculation based on vehicle specifications'
        };
    }
    
    generateEnvironmentalReasoning(environmentalData) {
        const reasons = [];
        
        if (environmentalData.weather) {
            const temp = environmentalData.weather.temperature;
            if (temp < 50) reasons.push(`Cold weather (${temp}°F) requires increased current`);
            if (temp > 85) reasons.push(`Hot weather (${temp}°F) requires thermal protection`);
            
            const humidity = environmentalData.weather.humidity;
            if (humidity > 80) reasons.push(`High humidity (${humidity}%) increases efficiency needs`);
        }
        
        return reasons;
    }
    
    async fallbackCalculation(inputData) {
        return {
            settings: this.calculateIntelligentFallback(inputData).settings,
            analysis: {
                source: 'fallback',
                note: 'Calculated using fallback logic due to AI service unavailability'
            }
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AICalculationEngine;
}
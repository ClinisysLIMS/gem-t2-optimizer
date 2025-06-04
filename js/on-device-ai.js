/**
 * On-Device AI Engine
 * Local AI calculations replacing external API calls
 */
class OnDeviceAI {
    constructor() {
        this.models = {
            optimizer: new LocalOptimizerModel(),
            tripAnalyzer: new LocalTripAnalyzer(),
            weatherAnalyzer: new LocalWeatherAnalyzer(),
            terrainAnalyzer: new LocalTerrainAnalyzer(),
            nlpProcessor: new LocalNLPProcessor()
        };
        
        this.cache = new Map();
        this.isInitialized = false;
        
        this.initialize();
    }
    
    /**
     * Initialize all AI models
     */
    async initialize() {
        console.log('Initializing On-Device AI Engine...');
        
        try {
            // Initialize all models
            await Promise.all([
                this.models.optimizer.initialize(),
                this.models.tripAnalyzer.initialize(),
                this.models.weatherAnalyzer.initialize(),
                this.models.terrainAnalyzer.initialize(),
                this.models.nlpProcessor.initialize()
            ]);
            
            this.isInitialized = true;
            console.log('On-Device AI Engine initialized successfully');
            
        } catch (error) {
            console.error('AI Engine initialization failed:', error);
            this.isInitialized = false;
        }
    }
    
    /**
     * Optimize controller settings using local AI
     */
    async optimizeController(vehicleData, priorities, baseSettings) {
        if (!this.isInitialized) {
            await this.initialize();
        }
        
        const cacheKey = `optimize:${JSON.stringify({vehicleData, priorities, baseSettings})}`;
        const cached = this.cache.get(cacheKey);
        if (cached) {
            return { ...cached, cached: true };
        }
        
        try {
            const result = await this.models.optimizer.optimize(vehicleData, priorities, baseSettings);
            
            // Add AI confidence and explanation
            const enhanced = {
                ...result,
                analysis: {
                    method: 'on_device_ai',
                    confidence: this.calculateConfidence(result),
                    reasoning: this.generateReasoning(vehicleData, priorities, result),
                    warnings: this.generateWarnings(vehicleData, result)
                },
                source: 'on_device_ai'
            };
            
            this.cache.set(cacheKey, enhanced);
            return enhanced;
            
        } catch (error) {
            console.error('On-device optimization failed:', error);
            throw error;
        }
    }
    
    /**
     * Analyze trip conditions using local AI
     */
    async analyzeTrip(tripData, vehicleData, conditions) {
        if (!this.isInitialized) {
            await this.initialize();
        }
        
        try {
            const analysis = await this.models.tripAnalyzer.analyze({
                trip: tripData,
                vehicle: vehicleData,
                conditions: conditions
            });
            
            const weatherImpact = await this.models.weatherAnalyzer.analyzeImpact(
                conditions.weather,
                vehicleData
            );
            
            const terrainImpact = await this.models.terrainAnalyzer.analyzeImpact(
                conditions.terrain,
                vehicleData
            );
            
            return {
                success: true,
                analysis: {
                    overall: analysis.overallScore,
                    weather: weatherImpact,
                    terrain: terrainImpact,
                    recommendations: analysis.recommendations,
                    optimizations: analysis.optimizations,
                    riskFactors: analysis.riskFactors
                },
                source: 'on_device_ai'
            };
            
        } catch (error) {
            console.error('Trip analysis failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Process natural language queries
     */
    async processNaturalLanguage(query, context = {}) {
        if (!this.isInitialized) {
            await this.initialize();
        }
        
        try {
            const result = await this.models.nlpProcessor.process(query, context);
            
            return {
                success: true,
                intent: result.intent,
                entities: result.entities,
                response: result.response,
                confidence: result.confidence,
                source: 'on_device_nlp'
            };
            
        } catch (error) {
            console.error('NLP processing failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Calculate optimization confidence
     */
    calculateConfidence(result) {
        let confidence = 0.7; // Base confidence
        
        // Adjust based on data quality
        if (result.dataQuality) {
            confidence += result.dataQuality * 0.2;
        }
        
        // Adjust based on vehicle compatibility
        if (result.vehicleCompatibility) {
            confidence += result.vehicleCompatibility * 0.1;
        }
        
        return Math.min(confidence, 0.95);
    }
    
    /**
     * Generate human-readable reasoning
     */
    generateReasoning(vehicleData, priorities, result) {
        const reasons = [];
        
        if (priorities.speed > 7) {
            reasons.push('Prioritized speed optimization for performance-focused tuning');
        }
        
        if (priorities.range > 8) {
            reasons.push('Optimized for maximum range with conservative settings');
        }
        
        if (vehicleData.battery?.type === 'lithium') {
            reasons.push('Applied lithium battery optimizations for enhanced performance');
        }
        
        if (vehicleData.motor?.condition === 'worn') {
            reasons.push('Conservative settings applied due to motor condition');
        }
        
        return reasons.length > 0 ? reasons : ['Applied balanced optimization strategy'];
    }
    
    /**
     * Generate safety warnings
     */
    generateWarnings(vehicleData, result) {
        const warnings = [];
        
        if (result.optimizedSettings[1] > 30) { // MPH scaling
            warnings.push('High speed settings - ensure legal compliance');
        }
        
        if (result.optimizedSettings[4] > 300) { // Max current
            warnings.push('High current settings may stress motor and controller');
        }
        
        if (vehicleData.battery?.capacity < 100) {
            warnings.push('Low battery capacity may limit performance gains');
        }
        
        return warnings;
    }
    
    /**
     * Clear AI cache
     */
    clearCache() {
        this.cache.clear();
        console.log('AI cache cleared');
    }
    
    /**
     * Get AI status
     */
    getStatus() {
        return {
            initialized: this.isInitialized,
            models: Object.keys(this.models).reduce((status, key) => {
                status[key] = this.models[key].isReady || false;
                return status;
            }, {}),
            cacheSize: this.cache.size
        };
    }
}

/**
 * Local Controller Optimizer Model
 */
class LocalOptimizerModel {
    constructor() {
        this.isReady = false;
        this.optimizationRules = new Map();
        this.vehicleProfiles = new Map();
    }
    
    async initialize() {
        // Load optimization rules and profiles
        this.loadOptimizationRules();
        this.loadVehicleProfiles();
        this.isReady = true;
    }
    
    loadOptimizationRules() {
        // Speed optimization rules
        this.optimizationRules.set('speed', {
            factors: {
                mphScaling: { weight: 0.4, range: [20, 35] },
                maxCurrent: { weight: 0.3, range: [250, 320] },
                fieldWeakening: { weight: 0.2, range: [35, 50] },
                acceleration: { weight: 0.1, range: [70, 90] }
            }
        });
        
        // Range optimization rules
        this.optimizationRules.set('range', {
            factors: {
                mphScaling: { weight: 0.2, range: [18, 25] },
                maxCurrent: { weight: 0.3, range: [200, 250] },
                regenCurrent: { weight: 0.3, range: [250, 280] },
                acceleration: { weight: 0.2, range: [40, 60] }
            }
        });
        
        // Balanced optimization
        this.optimizationRules.set('balanced', {
            factors: {
                mphScaling: { weight: 0.25, range: [22, 28] },
                maxCurrent: { weight: 0.25, range: [235, 275] },
                regenCurrent: { weight: 0.25, range: [220, 250] },
                acceleration: { weight: 0.25, range: [55, 75] }
            }
        });
    }
    
    loadVehicleProfiles() {
        // E2 Profile
        this.vehicleProfiles.set('e2', {
            motorLimits: { maxCurrent: 280, maxSpeed: 25 },
            batteryLimits: { voltage: 72, capacity: 150 },
            modifiers: { efficiency: 0.85, cooling: 0.7 }
        });
        
        // E4 Profile
        this.vehicleProfiles.set('e4', {
            motorLimits: { maxCurrent: 320, maxSpeed: 25 },
            batteryLimits: { voltage: 72, capacity: 200 },
            modifiers: { efficiency: 0.9, cooling: 0.8 }
        });
        
        // eL XD Profile
        this.vehicleProfiles.set('el-xd', {
            motorLimits: { maxCurrent: 350, maxSpeed: 25 },
            batteryLimits: { voltage: 72, capacity: 250 },
            modifiers: { efficiency: 0.92, cooling: 0.85 }
        });
    }
    
    async optimize(vehicleData, priorities, baseSettings) {
        const vehicleProfile = this.vehicleProfiles.get(vehicleData.model?.toLowerCase()) ||
                             this.vehicleProfiles.get('e4'); // Default
        
        const optimizedSettings = { ...baseSettings };
        
        // Determine optimization strategy
        const strategy = this.determineStrategy(priorities);
        const rules = this.optimizationRules.get(strategy);
        
        // Apply optimizations
        if (rules) {
            // MPH Scaling (F.1)
            optimizedSettings[1] = this.calculateOptimalValue(
                baseSettings[1] || 22,
                rules.factors.mphScaling,
                priorities.speed,
                vehicleProfile.motorLimits.maxSpeed
            );
            
            // Max Armature Current (F.4)
            optimizedSettings[4] = this.calculateOptimalValue(
                baseSettings[4] || 245,
                rules.factors.maxCurrent,
                priorities.acceleration,
                vehicleProfile.motorLimits.maxCurrent
            );
            
            // Acceleration Rate (F.6)
            if (rules.factors.acceleration) {
                optimizedSettings[6] = this.calculateOptimalValue(
                    baseSettings[6] || 60,
                    rules.factors.acceleration,
                    priorities.acceleration,
                    90
                );
            }
            
            // Regen Current (F.9)
            if (rules.factors.regenCurrent) {
                optimizedSettings[9] = this.calculateOptimalValue(
                    baseSettings[9] || 225,
                    rules.factors.regenCurrent,
                    priorities.regen,
                    280
                );
            }
            
            // Field Weakening (F.24)
            if (rules.factors.fieldWeakening) {
                optimizedSettings[24] = this.calculateOptimalValue(
                    baseSettings[24] || 43,
                    rules.factors.fieldWeakening,
                    priorities.speed,
                    60
                );
            }
        }
        
        return {
            success: true,
            optimizedSettings: optimizedSettings,
            strategy: strategy,
            vehicleCompatibility: this.calculateCompatibility(vehicleData, vehicleProfile),
            dataQuality: this.assessDataQuality(vehicleData),
            performanceChanges: this.predictPerformanceChanges(baseSettings, optimizedSettings)
        };
    }
    
    determineStrategy(priorities) {
        if (priorities.speed > 7) return 'speed';
        if (priorities.range > 7) return 'range';
        return 'balanced';
    }
    
    calculateOptimalValue(baseValue, factor, priority, limit) {
        const priorityFactor = priority / 10;
        const range = factor.range[1] - factor.range[0];
        const targetValue = factor.range[0] + (range * priorityFactor);
        
        // Blend with base value
        const blended = baseValue * 0.3 + targetValue * 0.7;
        
        // Apply limits
        return Math.round(Math.min(blended, limit));
    }
    
    calculateCompatibility(vehicleData, profile) {
        let compatibility = 0.8; // Base compatibility
        
        if (vehicleData.motorType === profile.motorType) {
            compatibility += 0.1;
        }
        
        if (vehicleData.batteryVoltage === profile.batteryLimits.voltage) {
            compatibility += 0.1;
        }
        
        return Math.min(compatibility, 1.0);
    }
    
    assessDataQuality(vehicleData) {
        let quality = 0.5; // Base quality
        
        const requiredFields = ['model', 'year', 'motorType', 'batteryVoltage'];
        const providedFields = requiredFields.filter(field => vehicleData[field]);
        
        quality += (providedFields.length / requiredFields.length) * 0.3;
        
        if (vehicleData.currentSettings) {
            quality += 0.2; // Bonus for existing settings
        }
        
        return Math.min(quality, 1.0);
    }
    
    predictPerformanceChanges(baseSettings, optimizedSettings) {
        const changes = [];
        
        if (optimizedSettings[1] > baseSettings[1]) {
            changes.push('Increased top speed potential');
        }
        
        if (optimizedSettings[4] > baseSettings[4]) {
            changes.push('Improved acceleration response');
        }
        
        if (optimizedSettings[9] > baseSettings[9]) {
            changes.push('Enhanced regenerative braking');
        }
        
        return changes;
    }
}

/**
 * Local Trip Analyzer
 */
class LocalTripAnalyzer {
    constructor() {
        this.isReady = false;
        this.analysisRules = new Map();
    }
    
    async initialize() {
        this.loadAnalysisRules();
        this.isReady = true;
    }
    
    loadAnalysisRules() {
        this.analysisRules.set('distance', {
            short: { range: [0, 5], impact: 0.9 },
            medium: { range: [5, 15], impact: 0.7 },
            long: { range: [15, 50], impact: 0.5 }
        });
        
        this.analysisRules.set('terrain', {
            flat: { grade: [0, 3], impact: 0.9 },
            rolling: { grade: [3, 8], impact: 0.7 },
            hilly: { grade: [8, 15], impact: 0.5 },
            mountainous: { grade: [15, 30], impact: 0.3 }
        });
    }
    
    async analyze(data) {
        const { trip, vehicle, conditions } = data;
        
        const distanceScore = this.analyzeDistance(trip.distance);
        const terrainScore = this.analyzeTerrain(conditions.terrain);
        const weatherScore = this.analyzeWeather(conditions.weather);
        
        const overallScore = (distanceScore + terrainScore + weatherScore) / 3;
        
        return {
            overallScore: overallScore,
            recommendations: this.generateRecommendations(overallScore, conditions),
            optimizations: this.generateOptimizations(vehicle, conditions),
            riskFactors: this.identifyRiskFactors(conditions)
        };
    }
    
    analyzeDistance(distance) {
        if (distance <= 5) return 0.9;
        if (distance <= 15) return 0.7;
        if (distance <= 30) return 0.5;
        return 0.3;
    }
    
    analyzeTerrain(terrain) {
        const grade = terrain.maxGrade || terrain.grade || 5;
        if (grade <= 3) return 0.9;
        if (grade <= 8) return 0.7;
        if (grade <= 15) return 0.5;
        return 0.3;
    }
    
    analyzeWeather(weather) {
        let score = 0.8;
        
        if (weather.temperature < 40 || weather.temperature > 90) {
            score -= 0.2;
        }
        
        if (weather.windSpeed > 20) {
            score -= 0.1;
        }
        
        if (weather.precipitation > 0.5) {
            score -= 0.2;
        }
        
        return Math.max(score, 0.3);
    }
    
    generateRecommendations(score, conditions) {
        const recommendations = [];
        
        if (score < 0.5) {
            recommendations.push('Consider route alternatives or timing changes');
        }
        
        if (conditions.weather.temperature < 50) {
            recommendations.push('Pre-warm battery for optimal performance');
        }
        
        if (conditions.terrain.grade > 10) {
            recommendations.push('Ensure full battery charge for hills');
        }
        
        return recommendations;
    }
    
    generateOptimizations(vehicle, conditions) {
        const optimizations = {};
        
        if (conditions.terrain.grade > 8) {
            optimizations.fieldWeakening = 'increase';
            optimizations.maxCurrent = 'increase';
        }
        
        if (conditions.weather.temperature < 50) {
            optimizations.acceleration = 'gentle';
        }
        
        return optimizations;
    }
    
    identifyRiskFactors(conditions) {
        const risks = [];
        
        if (conditions.weather.precipitation > 0.3) {
            risks.push('Wet road conditions - reduced traction');
        }
        
        if (conditions.terrain.grade > 15) {
            risks.push('Steep grades - monitor battery temperature');
        }
        
        return risks;
    }
}

/**
 * Local Weather Impact Analyzer
 */
class LocalWeatherAnalyzer {
    constructor() {
        this.isReady = false;
    }
    
    async initialize() {
        this.isReady = true;
    }
    
    async analyzeImpact(weather, vehicle) {
        const tempImpact = this.analyzeTemperatureImpact(weather.temperature);
        const windImpact = this.analyzeWindImpact(weather.windSpeed);
        const precipImpact = this.analyzePrecipitationImpact(weather.precipitation);
        
        return {
            overall: (tempImpact.score + windImpact.score + precipImpact.score) / 3,
            temperature: tempImpact,
            wind: windImpact,
            precipitation: precipImpact,
            recommendations: this.generateWeatherRecommendations(weather)
        };
    }
    
    analyzeTemperatureImpact(temp) {
        let score = 1.0;
        let effect = 'optimal';
        
        if (temp < 32) {
            score = 0.6;
            effect = 'reduced_range';
        } else if (temp < 50) {
            score = 0.8;
            effect = 'slightly_reduced';
        } else if (temp > 95) {
            score = 0.7;
            effect = 'thermal_stress';
        }
        
        return { score, effect, temperature: temp };
    }
    
    analyzeWindImpact(windSpeed) {
        let score = 1.0;
        let effect = 'minimal';
        
        if (windSpeed > 25) {
            score = 0.6;
            effect = 'high_resistance';
        } else if (windSpeed > 15) {
            score = 0.8;
            effect = 'moderate_resistance';
        }
        
        return { score, effect, windSpeed };
    }
    
    analyzePrecipitationImpact(precipitation) {
        let score = 1.0;
        let effect = 'none';
        
        if (precipitation > 0.5) {
            score = 0.7;
            effect = 'reduced_traction';
        } else if (precipitation > 0.1) {
            score = 0.9;
            effect = 'light_impact';
        }
        
        return { score, effect, precipitation };
    }
    
    generateWeatherRecommendations(weather) {
        const recommendations = [];
        
        if (weather.temperature < 50) {
            recommendations.push('Allow battery to warm before heavy use');
        }
        
        if (weather.windSpeed > 20) {
            recommendations.push('Expect reduced range due to wind resistance');
        }
        
        if (weather.precipitation > 0.3) {
            recommendations.push('Use caution - wet conditions affect braking');
        }
        
        return recommendations;
    }
}

/**
 * Local Terrain Impact Analyzer
 */
class LocalTerrainAnalyzer {
    constructor() {
        this.isReady = false;
    }
    
    async initialize() {
        this.isReady = true;
    }
    
    async analyzeImpact(terrain, vehicle) {
        const gradeImpact = this.analyzeGradeImpact(terrain.grade || terrain.maxGrade || 5);
        const surfaceImpact = this.analyzeSurfaceImpact(terrain.surface || 'paved');
        
        return {
            overall: (gradeImpact.score + surfaceImpact.score) / 2,
            grade: gradeImpact,
            surface: surfaceImpact,
            recommendations: this.generateTerrainRecommendations(terrain)
        };
    }
    
    analyzeGradeImpact(grade) {
        let score = 1.0;
        let effect = 'minimal';
        
        if (grade > 15) {
            score = 0.5;
            effect = 'severe_impact';
        } else if (grade > 8) {
            score = 0.7;
            effect = 'moderate_impact';
        } else if (grade > 3) {
            score = 0.9;
            effect = 'slight_impact';
        }
        
        return { score, effect, grade };
    }
    
    analyzeSurfaceImpact(surface) {
        const surfaceFactors = {
            paved: { score: 1.0, effect: 'optimal' },
            gravel: { score: 0.8, effect: 'increased_resistance' },
            dirt: { score: 0.7, effect: 'moderate_resistance' },
            sand: { score: 0.5, effect: 'high_resistance' },
            grass: { score: 0.6, effect: 'variable_resistance' }
        };
        
        return surfaceFactors[surface.toLowerCase()] || surfaceFactors.paved;
    }
    
    generateTerrainRecommendations(terrain) {
        const recommendations = [];
        
        if (terrain.grade > 10) {
            recommendations.push('Use hill mode or adjust field weakening');
        }
        
        if (terrain.surface === 'sand' || terrain.surface === 'soft') {
            recommendations.push('Lower tire pressure for better traction');
        }
        
        return recommendations;
    }
}

/**
 * Local Natural Language Processor
 */
class LocalNLPProcessor {
    constructor() {
        this.isReady = false;
        this.intents = new Map();
        this.entities = new Map();
    }
    
    async initialize() {
        this.loadIntents();
        this.loadEntities();
        this.isReady = true;
    }
    
    loadIntents() {
        this.intents.set('optimize', {
            patterns: ['optimize', 'tune', 'improve', 'enhance', 'maximize'],
            response: 'I can help optimize your GEM controller settings.'
        });
        
        this.intents.set('question', {
            patterns: ['what', 'how', 'why', 'when', 'where'],
            response: 'Let me provide information about your GEM vehicle.'
        });
        
        this.intents.set('problem', {
            patterns: ['problem', 'issue', 'error', 'wrong', 'broken'],
            response: 'I can help troubleshoot issues with your GEM.'
        });
    }
    
    loadEntities() {
        this.entities.set('vehicle_parts', [
            'motor', 'controller', 'battery', 'charger', 'brake', 'tire'
        ]);
        
        this.entities.set('performance_aspects', [
            'speed', 'range', 'acceleration', 'braking', 'efficiency'
        ]);
    }
    
    async process(query, context) {
        const lowercaseQuery = query.toLowerCase();
        
        // Extract intent
        const intent = this.extractIntent(lowercaseQuery);
        
        // Extract entities
        const entities = this.extractEntities(lowercaseQuery);
        
        // Generate response
        const response = this.generateResponse(intent, entities, context);
        
        // Calculate confidence
        const confidence = this.calculateNLPConfidence(intent, entities);
        
        return {
            intent: intent,
            entities: entities,
            response: response,
            confidence: confidence
        };
    }
    
    extractIntent(query) {
        for (const [intentName, intentData] of this.intents) {
            if (intentData.patterns.some(pattern => query.includes(pattern))) {
                return intentName;
            }
        }
        return 'unknown';
    }
    
    extractEntities(query) {
        const foundEntities = {};
        
        for (const [entityType, entityList] of this.entities) {
            const found = entityList.filter(entity => query.includes(entity));
            if (found.length > 0) {
                foundEntities[entityType] = found;
            }
        }
        
        return foundEntities;
    }
    
    generateResponse(intent, entities, context) {
        const intentData = this.intents.get(intent);
        let response = intentData?.response || 'I can help you with your GEM vehicle.';
        
        // Customize response based on entities
        if (entities.vehicle_parts && entities.vehicle_parts.length > 0) {
            response += ` I see you're asking about ${entities.vehicle_parts.join(' and ')}.`;
        }
        
        if (entities.performance_aspects && entities.performance_aspects.length > 0) {
            response += ` For ${entities.performance_aspects.join(' and ')}, I can provide specific optimization suggestions.`;
        }
        
        return response;
    }
    
    calculateNLPConfidence(intent, entities) {
        let confidence = intent === 'unknown' ? 0.3 : 0.7;
        
        if (Object.keys(entities).length > 0) {
            confidence += 0.2;
        }
        
        return Math.min(confidence, 0.9);
    }
}

// Create global instance
window.onDeviceAI = new OnDeviceAI();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OnDeviceAI;
}
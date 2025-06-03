/**
 * GEM T2 Controller Trip Optimizer
 * Combines weather, terrain, and trip data to generate optimal controller settings
 */
class TripOptimizer {
    constructor(optimizer) {
        this.optimizer = optimizer || new GEMOptimizer();
        this.weatherService = window.weatherService || new WeatherService();
        this.terrainService = window.terrainService || new TerrainService();
        this.apiIntegration = window.apiIntegration || null;
        
        // Weight factors for different optimization aspects
        this.weights = {
            weather: 0.25,
            terrain: 0.35,
            load: 0.20,
            distance: 0.20
        };
        
        // Optimization rules based on conditions
        this.rules = {
            weather: {
                temperature: {
                    hot: { // > 85°F
                        motorTemp: -15,      // Reduce motor stress
                        efficiency: +10,     // Prioritize efficiency
                        acceleration: -5     // Gentler acceleration
                    },
                    cold: { // < 50°F
                        batteryProtect: +10, // Protect battery
                        warmup: +5,         // Gradual warmup
                        regen: -5           // Reduce regen stress
                    },
                    optimal: { // 50-85°F
                        performance: +5,     // Balanced performance
                        efficiency: +5       // Balanced efficiency
                    }
                },
                conditions: {
                    rain: {
                        safety: +15,         // Prioritize safety
                        traction: +10,       // Better traction control
                        acceleration: -10,   // Reduce acceleration
                        braking: +10        // Enhanced braking
                    },
                    wind: {
                        stability: +5,       // Better stability
                        power: +5           // Compensate for resistance
                    },
                    clear: {
                        performance: +5      // Normal performance
                    }
                }
            },
            terrain: {
                grade: {
                    steep: { // > 15%
                        hillClimbing: +20,   // Maximum hill climbing
                        torque: +15,         // Maximum torque
                        cooling: +10         // Better cooling
                    },
                    moderate: { // 8-15%
                        hillClimbing: +10,   // Good hill climbing
                        torque: +8,          // More torque
                        regen: +10           // Good regen on descents
                    },
                    gentle: { // 3-8%
                        balance: +5,         // Balanced settings
                        regen: +5            // Moderate regen
                    },
                    flat: { // < 3%
                        efficiency: +10,     // Maximum efficiency
                        speed: +5            // Higher speed capability
                    }
                },
                surface: {
                    paved: {
                        speed: +5,           // Higher speeds safe
                        efficiency: +5       // Better efficiency
                    },
                    gravel: {
                        traction: +10,       // Better traction
                        acceleration: -5     // Controlled acceleration
                    },
                    dirt: {
                        traction: +15,       // Maximum traction
                        acceleration: -10,   // Gentle acceleration
                        safety: +10          // Safety priority
                    }
                }
            },
            load: {
                passengers: {
                    full: { // 80-100% capacity
                        power: +15,          // More power needed
                        cooling: +10,        // Better cooling
                        acceleration: -5     // Controlled acceleration
                    },
                    moderate: { // 40-80% capacity
                        balance: +5,         // Balanced settings
                        power: +5            // Slight power increase
                    },
                    light: { // < 40% capacity
                        efficiency: +10,     // Focus on efficiency
                        performance: +5      // Better performance
                    }
                },
                cargo: {
                    heavy: {
                        power: +10,          // Extra power
                        braking: +10,        // Better braking
                        stability: +10       // Better stability
                    },
                    moderate: {
                        balance: +5          // Balanced adjustments
                    },
                    light: {
                        efficiency: +5       // Efficiency focus
                    }
                }
            },
            distance: {
                long: { // > 20 miles
                    efficiency: +15,     // Maximum efficiency
                    range: +20,          // Maximum range
                    comfort: +10         // Comfort for long trips
                },
                medium: { // 10-20 miles
                    balance: +10,        // Balanced settings
                    efficiency: +5       // Good efficiency
                },
                short: { // < 10 miles
                    performance: +10,    // Can prioritize performance
                    comfort: +5          // Still comfortable
                }
            }
        };
    }
    
    /**
     * Generate optimal settings based on trip data
     * @param {Object} tripData - Complete trip data including weather and terrain
     * @returns {Object} Optimized controller settings
     */
    async optimizeForTrip(tripData) {
        try {
            // Extract and analyze all factors
            const analysis = await this.analyzeTripFactors(tripData);
            
            // Calculate priority scores based on analysis
            const priorities = this.calculatePriorities(analysis);
            
            // Generate base input data for optimizer
            const inputData = this.generateOptimizerInput(tripData, analysis, priorities);
            
            // Run the main optimization
            const baseOptimization = this.optimizer.optimizeSettings(inputData);
            
            // Apply trip-specific adjustments
            const tripAdjustments = this.applyTripSpecificAdjustments(baseOptimization, analysis);
            
            // Validate and finalize settings
            const finalSettings = this.validateAndFinalize(tripAdjustments, analysis);
            
            // Generate comprehensive report
            const report = this.generateOptimizationReport(finalSettings, analysis, tripData);
            
            return {
                success: true,
                optimization: finalSettings,
                analysis: analysis,
                report: report,
                confidence: this.calculateConfidence(analysis)
            };
            
        } catch (error) {
            console.error('Trip optimization error:', error);
            return {
                success: false,
                error: error.message,
                fallback: this.generateFallbackSettings(tripData)
            };
        }
    }
    
    /**
     * Analyze all trip factors
     * @param {Object} tripData - Trip data
     * @returns {Object} Comprehensive analysis
     */
    async analyzeTripFactors(tripData) {
        const analysis = {
            weather: await this.analyzeWeather(tripData),
            terrain: await this.analyzeTerrain(tripData),
            load: this.analyzeLoad(tripData),
            distance: this.analyzeDistance(tripData),
            schedule: this.analyzeSchedule(tripData),
            special: this.analyzeSpecialRequirements(tripData)
        };
        
        return analysis;
    }
    
    /**
     * Analyze weather conditions
     * @param {Object} tripData - Trip data
     * @returns {Object} Weather analysis
     */
    async analyzeWeather(tripData) {
        const analysis = {
            temperature: null,
            conditions: null,
            severity: 'normal',
            impacts: []
        };
        
        if (tripData.weather) {
            // Temperature analysis
            const temp = tripData.weather.temperature;
            if (temp > 85) {
                analysis.temperature = 'hot';
                analysis.impacts.push('motor_cooling', 'battery_stress');
            } else if (temp < 50) {
                analysis.temperature = 'cold';
                analysis.impacts.push('battery_capacity', 'motor_warmup');
            } else {
                analysis.temperature = 'optimal';
            }
            
            // Conditions analysis
            const conditions = tripData.weather.conditions?.toLowerCase() || '';
            if (conditions.includes('rain') || conditions.includes('storm')) {
                analysis.conditions = 'rain';
                analysis.severity = 'moderate';
                analysis.impacts.push('traction', 'visibility', 'braking_distance');
            } else if (conditions.includes('wind')) {
                analysis.conditions = 'wind';
                analysis.impacts.push('stability', 'efficiency');
            } else {
                analysis.conditions = 'clear';
            }
            
            // Wind analysis
            if (tripData.weather.wind?.speed > 15) {
                analysis.windSpeed = 'high';
                analysis.impacts.push('range_reduction');
            }
        }
        
        return analysis;
    }
    
    /**
     * Analyze terrain conditions
     * @param {Object} tripData - Trip data
     * @returns {Object} Terrain analysis
     */
    async analyzeTerrain(tripData) {
        const analysis = {
            maxGrade: 0,
            avgGrade: 0,
            elevationGain: 0,
            difficulty: 'easy',
            surface: 'paved',
            challenges: []
        };
        
        if (tripData.terrain) {
            // Grade analysis
            analysis.maxGrade = tripData.terrain.maxGrade || 0;
            analysis.avgGrade = tripData.terrain.avgGrade || 0;
            analysis.elevationGain = tripData.terrain.totalElevationGain || 0;
            
            // Difficulty classification
            if (analysis.maxGrade > 15) {
                analysis.difficulty = 'extreme';
                analysis.challenges.push('steep_climbs', 'motor_stress', 'brake_heat');
            } else if (analysis.maxGrade > 10) {
                analysis.difficulty = 'hard';
                analysis.challenges.push('sustained_climbs', 'range_impact');
            } else if (analysis.maxGrade > 5) {
                analysis.difficulty = 'moderate';
                analysis.challenges.push('occasional_climbs');
            } else {
                analysis.difficulty = 'easy';
            }
            
            // Surface type
            if (tripData.terrain.surface) {
                analysis.surface = tripData.terrain.surface;
                if (analysis.surface !== 'paved') {
                    analysis.challenges.push('traction_management');
                }
            }
            
            // Special terrain features
            if (tripData.terrain.features) {
                analysis.features = tripData.terrain.features;
                if (analysis.features.includes('switchbacks')) {
                    analysis.challenges.push('tight_turns', 'speed_management');
                }
            }
        }
        
        return analysis;
    }
    
    /**
     * Analyze vehicle load
     * @param {Object} tripData - Trip data
     * @returns {Object} Load analysis
     */
    analyzeLoad(tripData) {
        const analysis = {
            passengerLoad: 'light',
            cargoLoad: 'light',
            totalWeight: 'normal',
            impacts: []
        };
        
        // Passenger load analysis
        const passengers = tripData.passengers?.count || 1;
        const vehicleCapacity = this.getVehicleCapacity(tripData.vehicle?.model);
        const loadPercent = (passengers / vehicleCapacity) * 100;
        
        if (loadPercent >= 80) {
            analysis.passengerLoad = 'full';
            analysis.impacts.push('acceleration_reduced', 'range_reduced');
        } else if (loadPercent >= 40) {
            analysis.passengerLoad = 'moderate';
            analysis.impacts.push('slight_performance_impact');
        } else {
            analysis.passengerLoad = 'light';
        }
        
        // Cargo load analysis
        const cargo = tripData.passengers?.cargoLoad || 'light';
        analysis.cargoLoad = cargo;
        
        if (cargo === 'heavy') {
            analysis.impacts.push('significant_range_impact', 'brake_stress');
            analysis.totalWeight = 'heavy';
        } else if (cargo === 'moderate') {
            analysis.impacts.push('moderate_range_impact');
            analysis.totalWeight = 'moderate';
        }
        
        return analysis;
    }
    
    /**
     * Analyze trip distance
     * @param {Object} tripData - Trip data
     * @returns {Object} Distance analysis
     */
    analyzeDistance(tripData) {
        const analysis = {
            category: 'short',
            estimatedMiles: 0,
            rangeRequirement: 'normal',
            chargingNeeded: false
        };
        
        const distance = tripData.details?.estimatedDistance || 0;
        analysis.estimatedMiles = distance;
        
        if (distance > 20) {
            analysis.category = 'long';
            analysis.rangeRequirement = 'maximum';
            analysis.chargingNeeded = distance > 30;
        } else if (distance > 10) {
            analysis.category = 'medium';
            analysis.rangeRequirement = 'good';
        } else {
            analysis.category = 'short';
            analysis.rangeRequirement = 'normal';
        }
        
        // Round trip consideration
        if (tripData.details?.roundTrip) {
            analysis.totalDistance = distance * 2;
            if (analysis.totalDistance > 30) {
                analysis.chargingNeeded = true;
            }
        }
        
        return analysis;
    }
    
    /**
     * Analyze trip schedule
     * @param {Object} tripData - Trip data
     * @returns {Object} Schedule analysis
     */
    analyzeSchedule(tripData) {
        const analysis = {
            duration: 'day',
            timeOfDay: 'daytime',
            flexibility: 'flexible'
        };
        
        if (tripData.date?.duration) {
            if (tripData.date.duration > 1) {
                analysis.duration = 'multi-day';
            }
        }
        
        if (tripData.details?.departureTime) {
            const hour = new Date(tripData.details.departureTime).getHours();
            if (hour < 6 || hour > 20) {
                analysis.timeOfDay = 'night';
            } else if (hour < 10 || hour > 16) {
                analysis.timeOfDay = 'twilight';
            }
        }
        
        if (tripData.details?.eventType === 'parade' || tripData.details?.eventType === 'scheduled') {
            analysis.flexibility = 'strict';
        }
        
        return analysis;
    }
    
    /**
     * Analyze special requirements
     * @param {Object} tripData - Trip data
     * @returns {Object} Special requirements analysis
     */
    analyzeSpecialRequirements(tripData) {
        const requirements = [];
        
        // Event type specific requirements
        const eventType = tripData.details?.eventType;
        if (eventType === 'parade') {
            requirements.push({
                type: 'parade_mode',
                settings: {
                    acceleration: 'ultra_smooth',
                    speed: 'consistent_low',
                    regen: 'minimal'
                }
            });
        } else if (eventType === 'camping') {
            requirements.push({
                type: 'camping_mode',
                settings: {
                    range: 'maximum',
                    cargo: 'heavy_duty',
                    terrain: 'variable'
                }
            });
        }
        
        // Special passenger requirements
        if (tripData.passengers?.specialRequirements) {
            if (tripData.passengers.specialRequirements.includes('elderly')) {
                requirements.push({
                    type: 'comfort_priority',
                    settings: {
                        acceleration: 'gentle',
                        braking: 'smooth',
                        suspension: 'soft'
                    }
                });
            }
            if (tripData.passengers.specialRequirements.includes('motion_sensitive')) {
                requirements.push({
                    type: 'motion_comfort',
                    settings: {
                        acceleration: 'very_gentle',
                        turning: 'gradual'
                    }
                });
            }
        }
        
        return requirements;
    }
    
    /**
     * Calculate optimization priorities based on analysis
     * @param {Object} analysis - Trip analysis
     * @returns {Object} Priority scores
     */
    calculatePriorities(analysis) {
        const priorities = {
            range: 5,
            speed: 5,
            acceleration: 5,
            hillClimbing: 5,
            regen: 5,
            safety: 5,
            comfort: 5,
            efficiency: 5
        };
        
        // Weather-based priority adjustments
        if (analysis.weather.temperature === 'hot') {
            priorities.efficiency += 3;
            priorities.range += 2;
            priorities.acceleration -= 2;
        } else if (analysis.weather.temperature === 'cold') {
            priorities.efficiency += 2;
            priorities.comfort += 2;
        }
        
        if (analysis.weather.conditions === 'rain') {
            priorities.safety += 4;
            priorities.acceleration -= 3;
            priorities.speed -= 2;
        }
        
        // Terrain-based priority adjustments
        if (analysis.terrain.difficulty === 'extreme') {
            priorities.hillClimbing = 10;
            priorities.safety += 3;
            priorities.range -= 2;
        } else if (analysis.terrain.difficulty === 'hard') {
            priorities.hillClimbing = 8;
            priorities.regen += 3;
        }
        
        // Load-based priority adjustments
        if (analysis.load.totalWeight === 'heavy') {
            priorities.hillClimbing += 2;
            priorities.acceleration -= 2;
            priorities.safety += 2;
        }
        
        // Distance-based priority adjustments
        if (analysis.distance.category === 'long') {
            priorities.range = 9;
            priorities.efficiency = 8;
            priorities.comfort += 2;
        }
        
        // Normalize priorities (0-10 scale)
        Object.keys(priorities).forEach(key => {
            priorities[key] = Math.max(0, Math.min(10, priorities[key]));
        });
        
        return priorities;
    }
    
    /**
     * Generate optimizer input data
     * @param {Object} tripData - Trip data
     * @param {Object} analysis - Trip analysis
     * @param {Object} priorities - Calculated priorities
     * @returns {Object} Input data for optimizer
     */
    generateOptimizerInput(tripData, analysis, priorities) {
        const inputData = {
            vehicle: {
                model: tripData.vehicle?.model || 'e4',
                topSpeed: tripData.vehicle?.topSpeed || 25,
                motorCondition: tripData.vehicle?.motorCondition || 'good'
            },
            battery: {
                type: tripData.battery?.type || 'lead',
                voltage: tripData.battery?.voltage || 72,
                capacity: tripData.battery?.capacity || 150,
                age: tripData.battery?.age || 'good'
            },
            wheel: {
                tireDiameter: tripData.wheel?.tireDiameter || 22,
                gearRatio: tripData.wheel?.gearRatio || 8.91
            },
            environment: {
                terrain: this.mapTerrainDifficulty(analysis.terrain.difficulty),
                vehicleLoad: this.mapLoadCategory(analysis.load.totalWeight),
                temperatureRange: this.mapTemperatureRange(analysis.weather.temperature),
                hillGrade: analysis.terrain.maxGrade
            },
            priorities: {
                range: priorities.range,
                speed: priorities.speed,
                acceleration: priorities.acceleration,
                hillClimbing: priorities.hillClimbing,
                regen: priorities.regen
            }
        };
        
        return inputData;
    }
    
    /**
     * Apply trip-specific adjustments to base optimization
     * @param {Object} baseOptimization - Base optimization results
     * @param {Object} analysis - Trip analysis
     * @returns {Object} Adjusted optimization
     */
    applyTripSpecificAdjustments(baseOptimization, analysis) {
        const adjusted = JSON.parse(JSON.stringify(baseOptimization));
        
        // Weather adjustments
        if (analysis.weather.temperature === 'hot') {
            // Reduce max current to prevent overheating
            if (adjusted.optimizedSettings[4]) {
                adjusted.optimizedSettings[4] = Math.max(200, adjusted.optimizedSettings[4] - 15);
            }
            // Increase controlled acceleration time
            if (adjusted.optimizedSettings[3]) {
                adjusted.optimizedSettings[3] = Math.min(25, adjusted.optimizedSettings[3] + 2);
            }
        }
        
        if (analysis.weather.conditions === 'rain') {
            // Increase controlled acceleration for safety
            if (adjusted.optimizedSettings[3]) {
                adjusted.optimizedSettings[3] = Math.min(25, adjusted.optimizedSettings[3] + 3);
            }
            // Reduce top speed limit
            if (adjusted.optimizedSettings[11]) {
                adjusted.optimizedSettings[11] = Math.max(5, adjusted.optimizedSettings[11] - 3);
            }
        }
        
        // Terrain adjustments
        if (analysis.terrain.maxGrade > 15) {
            // Maximize field current for hill climbing
            adjusted.optimizedSettings[7] = 70; // Max minimum field current
            adjusted.optimizedSettings[8] = 255; // Max maximum field current
            // Delay field weakening for more torque
            adjusted.optimizedSettings[24] = Math.min(80, adjusted.optimizedSettings[24] + 10);
        }
        
        // Special requirements adjustments
        analysis.special.forEach(requirement => {
            if (requirement.type === 'parade_mode') {
                adjusted.optimizedSettings[3] = 25; // Maximum controlled acceleration
                adjusted.optimizedSettings[6] = 80; // Gentle armature acceleration
                adjusted.optimizedSettings[11] = 8; // Low turf speed
            } else if (requirement.type === 'comfort_priority') {
                adjusted.optimizedSettings[6] = Math.min(100, adjusted.optimizedSettings[6] + 10);
                adjusted.optimizedSettings[9] = Math.max(150, adjusted.optimizedSettings[9] - 10);
            }
        });
        
        return adjusted;
    }
    
    /**
     * Validate and finalize settings
     * @param {Object} settings - Adjusted settings
     * @param {Object} analysis - Trip analysis
     * @returns {Object} Validated settings
     */
    validateAndFinalize(settings, analysis) {
        const validated = JSON.parse(JSON.stringify(settings));
        
        // Ensure safety constraints for weather conditions
        if (analysis.weather.conditions === 'rain' || analysis.weather.severity !== 'normal') {
            // Enforce safety limits
            const safetyLimits = {
                3: { min: 20, max: 25 },    // Controlled acceleration
                11: { min: 5, max: 15 },    // Turf speed limit
                12: { min: 5, max: 15 }     // Reverse speed limit
            };
            
            Object.entries(safetyLimits).forEach(([func, limits]) => {
                if (validated.optimizedSettings[func]) {
                    validated.optimizedSettings[func] = Math.max(
                        limits.min,
                        Math.min(limits.max, validated.optimizedSettings[func])
                    );
                }
            });
        }
        
        // Ensure load constraints
        if (analysis.load.totalWeight === 'heavy') {
            // Ensure adequate current for heavy loads
            if (validated.optimizedSettings[4] < 240) {
                validated.optimizedSettings[4] = 240;
            }
            // Ensure adequate field current
            if (validated.optimizedSettings[7] < 65) {
                validated.optimizedSettings[7] = 65;
            }
        }
        
        // Final validation against absolute limits
        this.enforceAbsoluteLimits(validated.optimizedSettings);
        
        return validated;
    }
    
    /**
     * Enforce absolute safety limits
     * @param {Object} settings - Controller settings
     */
    enforceAbsoluteLimits(settings) {
        const limits = {
            1: { min: 50, max: 150 },     // MPH Scaling
            3: { min: 5, max: 25 },       // Controlled Acceleration
            4: { min: 200, max: 300 },    // Max Armature Current
            5: { min: 1, max: 20 },       // Plug Current
            6: { min: 30, max: 100 },     // Armature Accel Rate
            7: { min: 50, max: 70 },      // Minimum Field Current
            8: { min: 200, max: 300 },    // Maximum Field Current
            9: { min: 150, max: 275 },    // Regen Armature Current
            10: { min: 50, max: 250 },    // Regen Max Field Current
            11: { min: 5, max: 25 },      // Turf Speed Limit
            12: { min: 5, max: 25 },      // Reverse Speed Limit
            14: { min: 0, max: 15 },      // IR Compensation
            15: { min: 48, max: 100 },    // Battery Volts
            19: { min: 1, max: 20 },      // Field Ramp Rate
            20: { min: 1, max: 50 },      // MPH Overspeed
            22: { min: 15, max: 30 },     // Odometer Calibration
            23: { min: 0, max: 10 },      // Error Compensation
            24: { min: 40, max: 80 },     // Field Weakening Start
            26: { min: 1, max: 5 }        // Ratio Field to Arm
        };
        
        Object.entries(limits).forEach(([func, limit]) => {
            if (settings[func] !== undefined) {
                settings[func] = Math.max(limit.min, Math.min(limit.max, settings[func]));
            }
        });
    }
    
    /**
     * Generate comprehensive optimization report
     * @param {Object} settings - Final settings
     * @param {Object} analysis - Trip analysis
     * @param {Object} tripData - Original trip data
     * @returns {Object} Detailed report
     */
    generateOptimizationReport(settings, analysis, tripData) {
        const report = {
            summary: this.generateSummary(analysis, tripData),
            keyOptimizations: this.identifyKeyOptimizations(settings, analysis),
            warnings: this.generateWarnings(analysis),
            recommendations: this.generateRecommendations(analysis, tripData),
            expectedPerformance: this.calculateExpectedPerformance(settings, analysis),
            safetyNotes: this.generateSafetyNotes(analysis)
        };
        
        return report;
    }
    
    /**
     * Generate trip summary
     * @param {Object} analysis - Trip analysis
     * @param {Object} tripData - Trip data
     * @returns {String} Summary text
     */
    generateSummary(analysis, tripData) {
        const parts = [];
        
        parts.push(`Optimization for ${tripData.details?.eventType || 'general'} trip`);
        parts.push(`to ${tripData.location?.destination || 'destination'}`);
        
        if (analysis.distance.estimatedMiles) {
            parts.push(`(${analysis.distance.estimatedMiles} miles)`);
        }
        
        if (analysis.weather.temperature) {
            parts.push(`in ${analysis.weather.temperature} weather`);
        }
        
        if (analysis.terrain.difficulty !== 'easy') {
            parts.push(`with ${analysis.terrain.difficulty} terrain`);
        }
        
        return parts.join(' ');
    }
    
    /**
     * Identify key optimizations made
     * @param {Object} settings - Final settings
     * @param {Object} analysis - Trip analysis
     * @returns {Array} Key optimizations
     */
    identifyKeyOptimizations(settings, analysis) {
        const optimizations = [];
        
        // Compare with factory defaults
        const defaults = this.optimizer.getFactoryDefaults();
        const changes = settings.changes || [];
        
        // Group changes by impact
        const significantChanges = changes.filter(change => 
            Math.abs(change.newValue - change.oldValue) / change.oldValue > 0.1
        );
        
        significantChanges.forEach(change => {
            optimizations.push({
                function: change.description,
                adjustment: `${change.change > 0 ? '+' : ''}${change.change}`,
                reason: this.explainChange(change, analysis)
            });
        });
        
        return optimizations;
    }
    
    /**
     * Generate warnings based on conditions
     * @param {Object} analysis - Trip analysis
     * @returns {Array} Warning messages
     */
    generateWarnings(analysis) {
        const warnings = [];
        
        if (analysis.weather.conditions === 'rain') {
            warnings.push({
                type: 'weather',
                message: 'Wet conditions detected - drive with extra caution',
                severity: 'moderate'
            });
        }
        
        if (analysis.terrain.maxGrade > 20) {
            warnings.push({
                type: 'terrain',
                message: 'Extreme grades detected - monitor motor temperature',
                severity: 'high'
            });
        }
        
        if (analysis.distance.chargingNeeded) {
            warnings.push({
                type: 'range',
                message: 'Trip distance may exceed single charge range',
                severity: 'moderate'
            });
        }
        
        if (analysis.load.totalWeight === 'heavy' && analysis.terrain.difficulty !== 'easy') {
            warnings.push({
                type: 'performance',
                message: 'Heavy load on difficult terrain - expect reduced performance',
                severity: 'moderate'
            });
        }
        
        return warnings;
    }
    
    /**
     * Generate recommendations
     * @param {Object} analysis - Trip analysis
     * @param {Object} tripData - Trip data
     * @returns {Array} Recommendations
     */
    generateRecommendations(analysis, tripData) {
        const recommendations = [];
        
        // Pre-trip recommendations
        recommendations.push({
            category: 'pre-trip',
            items: [
                'Save current controller settings before applying changes',
                'Perform visual inspection of vehicle',
                'Check tire pressure (add 2-3 PSI for heavy loads)'
            ]
        });
        
        // Weather-specific recommendations
        if (analysis.weather.temperature === 'hot') {
            recommendations.push({
                category: 'hot-weather',
                items: [
                    'Start trip early to avoid peak heat',
                    'Monitor motor temperature frequently',
                    'Take breaks every 30 minutes in extreme heat'
                ]
            });
        }
        
        // Terrain-specific recommendations
        if (analysis.terrain.difficulty === 'extreme') {
            recommendations.push({
                category: 'steep-terrain',
                items: [
                    'Use low gear mode if available',
                    'Avoid sudden speed changes on grades',
                    'Allow extra cooling time after climbs'
                ]
            });
        }
        
        // Load-specific recommendations
        if (analysis.load.totalWeight === 'heavy') {
            recommendations.push({
                category: 'heavy-load',
                items: [
                    'Distribute weight evenly',
                    'Secure all cargo properly',
                    'Allow extra distance for braking'
                ]
            });
        }
        
        return recommendations;
    }
    
    /**
     * Calculate expected performance metrics
     * @param {Object} settings - Final settings
     * @param {Object} analysis - Trip analysis
     * @returns {Object} Performance metrics
     */
    calculateExpectedPerformance(settings, analysis) {
        const baseRange = this.calculateBaseRange(settings);
        
        // Apply modifiers based on conditions
        let rangeModifier = 1.0;
        
        // Weather impact
        if (analysis.weather.temperature === 'hot') rangeModifier *= 0.9;
        if (analysis.weather.temperature === 'cold') rangeModifier *= 0.85;
        if (analysis.weather.windSpeed === 'high') rangeModifier *= 0.9;
        
        // Terrain impact
        if (analysis.terrain.difficulty === 'extreme') rangeModifier *= 0.7;
        else if (analysis.terrain.difficulty === 'hard') rangeModifier *= 0.8;
        else if (analysis.terrain.difficulty === 'moderate') rangeModifier *= 0.9;
        
        // Load impact
        if (analysis.load.totalWeight === 'heavy') rangeModifier *= 0.85;
        else if (analysis.load.totalWeight === 'moderate') rangeModifier *= 0.92;
        
        return {
            estimatedRange: Math.round(baseRange * rangeModifier),
            topSpeed: this.calculateTopSpeed(settings),
            acceleration: this.calculateAcceleration(settings),
            hillClimbingAbility: this.calculateHillClimbing(settings, analysis),
            efficiencyRating: Math.round(rangeModifier * 100)
        };
    }
    
    /**
     * Generate safety notes
     * @param {Object} analysis - Trip analysis
     * @returns {Array} Safety notes
     */
    generateSafetyNotes(analysis) {
        const notes = [];
        
        notes.push('Always test new settings at low speed first');
        notes.push('Keep original settings saved for quick restoration');
        
        if (analysis.weather.conditions === 'rain') {
            notes.push('Reduce speed by 25% in wet conditions');
            notes.push('Increase following distance');
        }
        
        if (analysis.terrain.difficulty !== 'easy') {
            notes.push('Use engine braking on descents');
            notes.push('Monitor brake temperature on long descents');
        }
        
        return notes;
    }
    
    /**
     * Calculate confidence score
     * @param {Object} analysis - Trip analysis
     * @returns {Number} Confidence percentage
     */
    calculateConfidence(analysis) {
        let confidence = 100;
        
        // Reduce confidence for missing data
        if (!analysis.weather.temperature) confidence -= 10;
        if (!analysis.terrain.maxGrade) confidence -= 15;
        if (!analysis.distance.estimatedMiles) confidence -= 10;
        
        // Reduce confidence for extreme conditions
        if (analysis.weather.severity !== 'normal') confidence -= 10;
        if (analysis.terrain.difficulty === 'extreme') confidence -= 10;
        
        return Math.max(50, confidence);
    }
    
    /**
     * Generate fallback settings for errors
     * @param {Object} tripData - Trip data
     * @returns {Object} Safe fallback settings
     */
    generateFallbackSettings(tripData) {
        // Return safe, conservative settings
        return {
            optimizedSettings: {
                3: 20,   // Moderate controlled acceleration
                4: 235,  // Conservative max current
                6: 60,   // Smooth acceleration
                7: 65,   // Good torque
                9: 225,  // Good regen
                10: 200, // Good regen field
                11: 15,  // Safe turf speed
                12: 10,  // Safe reverse speed
                24: 60   // Balanced field weakening
            },
            message: 'Using conservative settings due to optimization error',
            isFlightmode: true
        };
    }
    
    // Helper methods
    
    getVehicleCapacity(model) {
        const capacities = {
            'e2': 2,
            'e4': 4,
            'e6': 6,
            'eS': 2,
            'eL': 2,
            'elXD': 2
        };
        return capacities[model] || 4;
    }
    
    mapTerrainDifficulty(difficulty) {
        const mapping = {
            'easy': 'flat',
            'moderate': 'mixed',
            'hard': 'moderate',
            'extreme': 'steep'
        };
        return mapping[difficulty] || 'mixed';
    }
    
    mapLoadCategory(weight) {
        const mapping = {
            'light': 'light',
            'normal': 'medium',
            'moderate': 'heavy',
            'heavy': 'max'
        };
        return mapping[weight] || 'medium';
    }
    
    mapTemperatureRange(temp) {
        const mapping = {
            'cold': 'cold',
            'optimal': 'mild',
            'hot': 'hot'
        };
        return mapping[temp] || 'mild';
    }
    
    calculateBaseRange(settings) {
        // Simplified range calculation based on settings
        let baseRange = 25; // Default range in miles
        
        // Current draw affects range
        const maxCurrent = settings.optimizedSettings[4] || 245;
        baseRange *= (245 / maxCurrent);
        
        // Regen helps range
        const regenCurrent = settings.optimizedSettings[9] || 225;
        baseRange *= (1 + (regenCurrent - 200) / 200);
        
        return Math.round(baseRange);
    }
    
    calculateTopSpeed(settings) {
        const turfSpeed = settings.optimizedSettings[11] || 11;
        const fieldWeakening = settings.optimizedSettings[24] || 55;
        
        // Simplified calculation
        const baseSpeed = 25;
        const speedModifier = (100 - fieldWeakening) / 100;
        
        return Math.round(baseSpeed * (1 + speedModifier * 0.2));
    }
    
    calculateAcceleration(settings) {
        const controlledAccel = settings.optimizedSettings[3] || 15;
        const armatureAccel = settings.optimizedSettings[6] || 60;
        
        // Lower values = faster acceleration
        const accelRating = 10 - ((controlledAccel - 5) / 20 * 5) - ((armatureAccel - 30) / 70 * 5);
        
        return Math.round(Math.max(1, Math.min(10, accelRating)));
    }
    
    calculateHillClimbing(settings, analysis) {
        const minField = settings.optimizedSettings[7] || 70;
        const maxCurrent = settings.optimizedSettings[4] || 245;
        
        // Base capability
        let capability = (minField / 70 * 50) + (maxCurrent / 300 * 50);
        
        // Adjust for load
        if (analysis.load.totalWeight === 'heavy') capability *= 0.8;
        
        return Math.round(capability);
    }
    
    explainChange(change, analysis) {
        const explanations = {
            'Controlled Acceleration': {
                increase: 'Increased for smoother, safer acceleration',
                decrease: 'Decreased for quicker response'
            },
            'Max Armature Current': {
                increase: 'Increased for more power',
                decrease: 'Decreased to prevent overheating'
            },
            'Minimum Field Current': {
                increase: 'Increased for better torque',
                decrease: 'Decreased for higher top speed'
            },
            'Regen Armature Current': {
                increase: 'Increased for better energy recovery',
                decrease: 'Decreased for smoother coasting'
            }
        };
        
        const direction = change.change > 0 ? 'increase' : 'decrease';
        return explanations[change.description]?.[direction] || `Adjusted for ${analysis.terrain.difficulty} terrain`;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TripOptimizer;
}
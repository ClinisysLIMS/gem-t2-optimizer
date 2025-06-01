/**
 * GEM Optimizer Integration Module
 * Provides controller optimization logic for MCP server
 */

export class GEMOptimizer {
    constructor() {
        this.initializeDefaults();
        this.initializeOptimizationRules();
    }
    
    /**
     * Initialize factory default settings and constraints
     */
    initializeDefaults() {
        this.factoryDefaults = {
            1: 100,   // MPH Scaling
            3: 15,    // Controlled Acceleration
            4: 245,   // Max Armature Current
            5: 5,     // Plug Current
            6: 60,    // Armature Accel Rate
            7: 70,    // Minimum Field Current
            8: 245,   // Maximum Field Current
            9: 225,   // Regen Armature Current
            10: 100,  // Regen Max Field Current
            11: 11,   // Turf Speed Limit
            12: 11,   // Reverse Speed Limit
            14: 5,    // IR Compensation
            15: 72,   // Battery Volts
            19: 8,    // Field Ramp Rate
            20: 5,    // MPH Overspeed
            22: 22,   // Odometer Calibration
            23: 0,    // Error Compensation
            24: 55,   // Field Weakening Start
            26: 1     // Ratio Field to Arm
        };
        
        this.constraints = {
            1: { min: 50, max: 150 },     // MPH Scaling
            3: { min: 5, max: 25 },       // Controlled Acceleration
            4: { min: 200, max: 300 },    // Max Armature Current
            5: { min: 1, max: 20 },       // Plug Current
            6: { min: 30, max: 100 },     // Armature Accel Rate
            7: { min: 50, max: 100 },     // Minimum Field Current
            8: { min: 200, max: 300 },    // Maximum Field Current
            9: { min: 150, max: 275 },    // Regen Armature Current
            10: { min: 50, max: 200 },    // Regen Max Field Current
            11: { min: 5, max: 25 },      // Turf Speed Limit
            12: { min: 5, max: 25 },      // Reverse Speed Limit
            14: { min: 0, max: 15 },      // IR Compensation
            15: { min: 48, max: 100 },    // Battery Volts
            19: { min: 1, max: 20 },      // Field Ramp Rate
            20: { min: 1, max: 15 },      // MPH Overspeed
            22: { min: 15, max: 30 },     // Odometer Calibration
            23: { min: 0, max: 10 },      // Error Compensation
            24: { min: 40, max: 80 },     // Field Weakening Start
            26: { min: 1, max: 5 }        // Ratio Field to Arm
        };
        
        this.functionDescriptions = {
            1: "MPH Scaling",
            3: "Controlled Acceleration",
            4: "Max Armature Current",
            5: "Plug Current",
            6: "Armature Accel Rate",
            7: "Minimum Field Current",
            8: "Maximum Field Current",
            9: "Regen Armature Current",
            10: "Regen Max Field Current",
            11: "Turf Speed Limit",
            12: "Reverse Speed Limit",
            14: "IR Compensation",
            15: "Battery Volts",
            19: "Field Ramp Rate",
            20: "MPH Overspeed",
            22: "Odometer Calibration",
            23: "Error Compensation",
            24: "Field Weakening Start",
            26: "Ratio Field to Arm"
        };
    }
    
    /**
     * Initialize optimization rules based on different scenarios
     */
    initializeOptimizationRules() {
        this.optimizationRules = {
            // Vehicle type specific adjustments
            vehicleTypes: {
                'e2': { // 2-passenger, lighter weight
                    4: -10,  // Reduce max current
                    6: +5,   // Increase acceleration rate
                    9: -5    // Reduce regen current
                },
                'e4': { // 4-passenger, standard
                    // Use defaults
                },
                'e6': { // 6-passenger, heavier
                    4: +15,  // Increase max current for power
                    7: +5,   // Increase min field for torque
                    6: -5    // Slower acceleration for safety
                },
                'eS': { // Short utility
                    4: +10,  // More current for cargo
                    11: -2   // Lower turf speed for precision
                },
                'eL': { // Long utility
                    4: +20,  // Max current for heavy loads
                    7: +10,  // More field current
                    24: +5   // Delay field weakening
                },
                'elXD': { // Extra duty
                    4: +25,  // Maximum current
                    7: +15,  // Maximum field current
                    8: +20,  // Increase max field
                    24: +10  // Significant field weakening delay
                }
            },
            
            // Terrain type adjustments
            terrainTypes: {
                'flat': {
                    3: -2,   // Less controlled acceleration needed
                    24: -5,  // Earlier field weakening for efficiency
                    9: +5    // More regen for efficiency
                },
                'hilly': {
                    7: +8,   // More min field for climbing
                    4: +10,  // More current for hills
                    24: +8,  // Delay field weakening for torque
                    9: +10   // More regen for descents
                },
                'steep': {
                    7: +15,  // Maximum min field
                    4: +20,  // Maximum current
                    24: +15, // Maximum field weakening delay
                    6: -10   // Slower acceleration for control
                },
                'mixed': {
                    7: +5,   // Moderate field increase
                    4: +5,   // Moderate current increase
                    24: +3   // Slight field weakening delay
                }
            },
            
            // Weather condition adjustments
            weatherConditions: {
                'hot': {
                    4: -15,  // Reduce current to prevent overheating
                    6: +5,   // Gentler acceleration
                    19: +2   // Slower field ramp for cooling
                },
                'cold': {
                    4: -10,  // Reduce current for battery protection
                    6: -5,   // Slower acceleration in cold
                    15: -2   // Account for voltage drop
                },
                'rainy': {
                    6: +8,   // Much gentler acceleration
                    9: +5,   // More regen (but be careful)
                    3: +3    // More controlled acceleration
                },
                'windy': {
                    4: +5,   // Slight current increase for wind resistance
                    6: +2    // Slight acceleration adjustment
                }
            },
            
            // Priority-based adjustments
            priorities: {
                'range': {
                    3: +3,   // More controlled acceleration
                    4: -10,  // Less current for efficiency
                    9: +15,  // Maximum regen
                    24: -8   // Earlier field weakening
                },
                'speed': {
                    1: +10,  // Higher MPH scaling
                    4: +15,  // More current for power
                    24: -10, // Earlier field weakening for top speed
                    6: -5    // Quick acceleration
                },
                'acceleration': {
                    4: +20,  // Maximum current
                    6: -15,  // Fastest acceleration rate
                    7: +10,  // More field for torque
                    3: -5    // Less controlled acceleration
                },
                'hillClimbing': {
                    7: +15,  // Maximum field current
                    4: +20,  // Maximum armature current
                    24: +15, // Maximum field weakening delay
                    8: +15   // Increase max field
                },
                'regen': {
                    9: +20,  // Maximum regen current
                    10: +15, // Maximum regen field
                    6: +5    // Gentler acceleration for more regen opportunities
                }
            },
            
            // Load type adjustments
            loadTypes: {
                'light': {
                    4: -8,   // Less current needed
                    6: +3,   // Quicker acceleration
                    9: -3    // Less regen needed
                },
                'medium': {
                    // Use defaults mostly
                    4: +2    // Slight current increase
                },
                'heavy': {
                    4: +15,  // More current for heavy load
                    7: +10,  // More field current
                    6: -8,   // Slower acceleration
                    24: +8,  // Delay field weakening
                    9: +10   // More regen for braking assist
                }
            },
            
            // Trip type specific adjustments
            tripTypes: {
                'camping': {
                    4: +15,  // Heavy load expected
                    7: +8,   // More torque for climbing
                    9: +12,  // More regen for efficiency
                    6: -5    // Gentler for cargo
                },
                'touring': {
                    3: +2,   // Smooth controlled acceleration
                    9: +8,   // Good regen for efficiency
                    6: +2    // Comfortable acceleration
                },
                'parade': {
                    3: +8,   // Very controlled acceleration
                    6: +10,  // Very gentle acceleration
                    11: -3,  // Lower turf speed
                    12: -2   // Lower reverse speed
                },
                'beach': {
                    4: +8,   // Extra current for sand
                    6: +5,   // Gentler for sand traction
                    3: +5    // More controlled for loose surface
                },
                'mountains': {
                    7: +15,  // Maximum hill climbing
                    4: +20,  // Maximum current
                    24: +12, // Delay field weakening
                    9: +15   // Maximum regen for descents
                },
                'shopping': {
                    3: +5,   // Controlled for stop-and-go
                    6: +3,   // Gentle acceleration
                    9: +5    // Good regen for frequent stops
                }
            }
        };
    }
    
    /**
     * Optimize controller settings based on NLP-extracted parameters
     * @param {Object} parameters - Extracted parameters from NLP
     * @returns {Object} Optimization results
     */
    optimizeFromNLP(parameters) {
        let settings = { ...this.factoryDefaults };
        const changes = [];
        const recommendations = [];
        
        // Apply vehicle type optimizations
        if (parameters.vehicle.model) {
            const vehicleAdjustments = this.optimizationRules.vehicleTypes[parameters.vehicle.model];
            if (vehicleAdjustments) {
                this.applyAdjustments(settings, vehicleAdjustments, changes, 
                    `Vehicle type (${parameters.vehicle.model}) optimizations`);
            }
        }
        
        // Apply terrain optimizations
        if (parameters.terrain.type) {
            const terrainAdjustments = this.optimizationRules.terrainTypes[parameters.terrain.type];
            if (terrainAdjustments) {
                this.applyAdjustments(settings, terrainAdjustments, changes,
                    `Terrain (${parameters.terrain.type}) optimizations`);
            }
        }
        
        // Apply weather optimizations
        if (parameters.weather.conditions) {
            const weatherAdjustments = this.optimizationRules.weatherConditions[parameters.weather.conditions];
            if (weatherAdjustments) {
                this.applyAdjustments(settings, weatherAdjustments, changes,
                    `Weather (${parameters.weather.conditions}) optimizations`);
            }
        }
        
        // Apply priority optimizations
        for (const [priority, level] of Object.entries(parameters.priorities)) {
            if (level > 6) { // Only apply if priority is high
                const priorityAdjustments = this.optimizationRules.priorities[priority];
                if (priorityAdjustments) {
                    // Scale adjustments based on priority level
                    const scaledAdjustments = {};
                    for (const [func, adj] of Object.entries(priorityAdjustments)) {
                        scaledAdjustments[func] = Math.round(adj * (level / 10));
                    }
                    this.applyAdjustments(settings, scaledAdjustments, changes,
                        `High priority (${priority}) optimizations`);
                }
            }
        }
        
        // Apply load optimizations
        if (parameters.load.type) {
            const loadAdjustments = this.optimizationRules.loadTypes[parameters.load.type];
            if (loadAdjustments) {
                this.applyAdjustments(settings, loadAdjustments, changes,
                    `Load (${parameters.load.type}) optimizations`);
            }
        }
        
        // Apply trip type optimizations
        if (parameters.trip.type) {
            const tripAdjustments = this.optimizationRules.tripTypes[parameters.trip.type];
            if (tripAdjustments) {
                this.applyAdjustments(settings, tripAdjustments, changes,
                    `Trip type (${parameters.trip.type}) optimizations`);
            }
        }
        
        // Ensure all settings are within constraints
        this.enforceConstraints(settings);
        
        // Generate recommendations based on parameters
        this.generateRecommendations(parameters, recommendations);
        
        return {
            factorySettings: this.factoryDefaults,
            optimizedSettings: settings,
            changes: changes,
            recommendations: recommendations,
            confidence: parameters.confidence,
            inputParameters: parameters
        };
    }
    
    /**
     * Apply adjustments to settings and track changes
     */
    applyAdjustments(settings, adjustments, changes, category) {
        for (const [funcNum, adjustment] of Object.entries(adjustments)) {
            const func = parseInt(funcNum);
            const oldValue = settings[func];
            const newValue = oldValue + adjustment;
            
            settings[func] = newValue;
            
            changes.push({
                function: func,
                description: this.functionDescriptions[func],
                oldValue: oldValue,
                newValue: newValue,
                change: adjustment,
                category: category
            });
        }
    }
    
    /**
     * Enforce constraints on all settings
     */
    enforceConstraints(settings) {
        for (const [func, constraints] of Object.entries(this.constraints)) {
            const funcNum = parseInt(func);
            if (settings[funcNum] < constraints.min) {
                settings[funcNum] = constraints.min;
            } else if (settings[funcNum] > constraints.max) {
                settings[funcNum] = constraints.max;
            }
        }
    }
    
    /**
     * Generate recommendations based on parameters
     */
    generateRecommendations(parameters, recommendations) {
        // General recommendations
        recommendations.push("Always save your original settings before making changes");
        recommendations.push("Test drive at low speeds first to verify performance");
        
        // Weather-based recommendations
        if (parameters.weather.conditions === 'hot') {
            recommendations.push("Monitor motor temperature closely in hot weather");
            recommendations.push("Consider driving during cooler parts of the day");
        } else if (parameters.weather.conditions === 'cold') {
            recommendations.push("Allow battery to warm up before heavy use");
            recommendations.push("Expect reduced range in cold conditions");
        } else if (parameters.weather.conditions === 'rainy') {
            recommendations.push("Drive slower and allow extra stopping distance");
            recommendations.push("Avoid sudden acceleration or braking");
        }
        
        // Terrain-based recommendations
        if (parameters.terrain.type === 'steep') {
            recommendations.push("Use low gear on steep hills if available");
            recommendations.push("Plan route to avoid steepest grades if possible");
            recommendations.push("Monitor motor temperature on long climbs");
        } else if (parameters.terrain.type === 'hilly') {
            recommendations.push("Take advantage of regenerative braking on descents");
            recommendations.push("Maintain steady speeds on climbs");
        }
        
        // Load-based recommendations
        if (parameters.load.type === 'heavy') {
            recommendations.push("Check tire pressure before departure");
            recommendations.push("Secure all cargo properly");
            recommendations.push("Allow extra time for acceleration and braking");
        }
        
        // Trip-specific recommendations
        if (parameters.trip.type === 'camping') {
            recommendations.push("Plan charging opportunities for extended trips");
            recommendations.push("Bring emergency contact information");
        } else if (parameters.trip.type === 'parade') {
            recommendations.push("Practice smooth, steady speeds before the event");
            recommendations.push("Keep safety equipment visible and accessible");
        }
        
        // Priority-based recommendations
        if (parameters.priorities.range > 7) {
            recommendations.push("Drive conservatively to maximize range");
            recommendations.push("Plan route with charging stations if needed");
        } else if (parameters.priorities.speed > 7) {
            recommendations.push("Ensure tires are properly inflated for efficiency");
            recommendations.push("Regular maintenance for optimal performance");
        }
    }
    
    /**
     * Get preset configurations for common scenarios
     */
    getPresetConfigurations() {
        return {
            'eco-mode': {
                name: 'Eco Mode',
                description: 'Maximum range and efficiency',
                priorities: { range: 10, regen: 8, speed: 3, acceleration: 3, hillClimbing: 5 }
            },
            'sport-mode': {
                name: 'Sport Mode', 
                description: 'Maximum performance and acceleration',
                priorities: { acceleration: 10, speed: 9, hillClimbing: 8, range: 4, regen: 5 }
            },
            'hill-climbing': {
                name: 'Hill Climbing',
                description: 'Optimized for steep terrain',
                priorities: { hillClimbing: 10, range: 6, acceleration: 7, speed: 5, regen: 8 }
            },
            'city-driving': {
                name: 'City Driving',
                description: 'Stop-and-go traffic optimization',
                priorities: { regen: 9, acceleration: 6, range: 7, speed: 4, hillClimbing: 4 }
            },
            'heavy-load': {
                name: 'Heavy Load',
                description: 'Optimized for maximum cargo',
                load: { type: 'heavy' },
                priorities: { hillClimbing: 8, regen: 7, range: 6, acceleration: 4, speed: 5 }
            },
            'weekend-touring': {
                name: 'Weekend Touring',
                description: 'Balanced settings for recreational driving',
                trip: { type: 'touring' },
                priorities: { range: 7, regen: 6, speed: 6, acceleration: 5, hillClimbing: 6 }
            }
        };
    }
    
    /**
     * Compare two optimization results
     */
    compareOptimizations(result1, result2) {
        const comparison = {
            differences: [],
            improvements: [],
            tradeoffs: []
        };
        
        for (const func of Object.keys(result1.optimizedSettings)) {
            const val1 = result1.optimizedSettings[func];
            const val2 = result2.optimizedSettings[func];
            
            if (val1 !== val2) {
                comparison.differences.push({
                    function: func,
                    description: this.functionDescriptions[func],
                    value1: val1,
                    value2: val2,
                    difference: val2 - val1
                });
            }
        }
        
        return comparison;
    }
}

export default GEMOptimizer;
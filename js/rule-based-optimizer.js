/**
 * Rule-Based Optimization Engine
 * Deterministic optimization algorithms based on GEM vehicle engineering principles
 * Replaces LLM calls with expert-system rules and mathematical models
 */
class RuleBasedOptimizer {
    constructor() {
        this.vehicleProfiles = new Map();
        this.optimizationRules = new Map();
        this.performanceModels = new Map();
        this.safetyConstraints = new Map();
        
        // Initialize knowledge base
        this.loadVehicleProfiles();
        this.loadOptimizationRules();
        this.loadPerformanceModels();
        this.loadSafetyConstraints();
        
        console.log('Rule-Based Optimizer initialized with expert knowledge');
    }
    
    /**
     * Load vehicle-specific profiles and characteristics
     */
    loadVehicleProfiles() {
        // GEM e2 Profile
        this.vehicleProfiles.set('e2', {
            motor: {
                type: 'AC',
                maxCurrent: 280,
                nominalVoltage: 72,
                maxRPM: 2800,
                efficiency: 0.85
            },
            battery: {
                nominalVoltage: 72,
                capacity: 150, // Ah
                chemistry: 'AGM',
                maxChargeRate: 25
            },
            drivetrain: {
                gearRatio: 12.44,
                wheelDiameter: 18,
                maxSpeed: 25
            },
            weight: {
                curb: 1250, // lbs
                maxGVW: 2000
            },
            aerodynamics: {
                dragCoefficient: 0.6,
                frontalArea: 2.2 // m²
            },
            defaultSettings: {
                1: 22,   // MPH scaling
                4: 245,  // Max armature current
                6: 60,   // Acceleration rate
                9: 225,  // Regen current
                24: 43   // Field weakening
            }
        });
        
        // GEM e4 Profile
        this.vehicleProfiles.set('e4', {
            motor: {
                type: 'AC',
                maxCurrent: 320,
                nominalVoltage: 72,
                maxRPM: 2800,
                efficiency: 0.88
            },
            battery: {
                nominalVoltage: 72,
                capacity: 200, // Ah
                chemistry: 'AGM',
                maxChargeRate: 25
            },
            drivetrain: {
                gearRatio: 12.44,
                wheelDiameter: 18,
                maxSpeed: 25
            },
            weight: {
                curb: 1400, // lbs
                maxGVW: 2200
            },
            aerodynamics: {
                dragCoefficient: 0.62,
                frontalArea: 2.4 // m²
            },
            defaultSettings: {
                1: 22,   // MPH scaling
                4: 260,  // Max armature current
                6: 65,   // Acceleration rate
                9: 240,  // Regen current
                24: 43   // Field weakening
            }
        });
        
        // GEM eL XD Profile
        this.vehicleProfiles.set('el-xd', {
            motor: {
                type: 'AC',
                maxCurrent: 350,
                nominalVoltage: 72,
                maxRPM: 2800,
                efficiency: 0.90
            },
            battery: {
                nominalVoltage: 72,
                capacity: 250, // Ah
                chemistry: 'Lithium',
                maxChargeRate: 40
            },
            drivetrain: {
                gearRatio: 10.35,
                wheelDiameter: 18,
                maxSpeed: 25
            },
            weight: {
                curb: 1350, // lbs
                maxGVW: 2150
            },
            aerodynamics: {
                dragCoefficient: 0.58,
                frontalArea: 2.3 // m²
            },
            defaultSettings: {
                1: 22,   // MPH scaling
                4: 280,  // Max armature current
                6: 70,   // Acceleration rate
                9: 260,  // Regen current
                24: 45   // Field weakening
            }
        });
    }
    
    /**
     * Load optimization rules and algorithms
     */
    loadOptimizationRules() {
        // Speed optimization rules
        this.optimizationRules.set('speed', {
            priority: 'maximum_speed',
            adjustments: {
                1: { factor: 1.2, min: 20, max: 30 }, // Increase MPH scaling
                4: { factor: 1.15, min: 200, max: 320 }, // Increase max current
                6: { factor: 1.1, min: 60, max: 90 }, // Increase acceleration
                24: { factor: 1.1, min: 35, max: 55 }, // Optimize field weakening
                9: { factor: 0.95, min: 180, max: 280 } // Slight regen reduction
            },
            constraints: ['thermal_limits', 'motor_limits', 'legal_speed'],
            tradeoffs: ['range_reduction', 'efficiency_loss']
        });
        
        // Range optimization rules
        this.optimizationRules.set('range', {
            priority: 'maximum_range',
            adjustments: {
                1: { factor: 0.85, min: 18, max: 25 }, // Reduce MPH scaling
                4: { factor: 0.9, min: 180, max: 250 }, // Reduce max current
                6: { factor: 0.85, min: 40, max: 70 }, // Gentler acceleration
                9: { factor: 1.15, min: 220, max: 300 }, // Increase regen
                24: { factor: 0.95, min: 30, max: 50 } // Conservative field weakening
            },
            constraints: ['minimum_performance', 'drivability'],
            tradeoffs: ['speed_reduction', 'acceleration_loss']
        });
        
        // Balanced optimization rules
        this.optimizationRules.set('balanced', {
            priority: 'optimal_balance',
            adjustments: {
                1: { factor: 1.0, min: 20, max: 26 }, // Maintain MPH scaling
                4: { factor: 1.05, min: 220, max: 280 }, // Slight current increase
                6: { factor: 1.0, min: 55, max: 75 }, // Balanced acceleration
                9: { factor: 1.05, min: 210, max: 270 }, // Slight regen increase
                24: { factor: 1.0, min: 38, max: 48 } // Maintain field weakening
            },
            constraints: ['all_limits'],
            tradeoffs: ['minor_compromises']
        });
        
        // Efficiency optimization rules
        this.optimizationRules.set('efficiency', {
            priority: 'maximum_efficiency',
            adjustments: {
                1: { factor: 0.9, min: 18, max: 24 }, // Reduce speed
                4: { factor: 0.85, min: 160, max: 230 }, // Reduce current
                6: { factor: 0.8, min: 35, max: 65 }, // Gentle acceleration
                9: { factor: 1.2, min: 240, max: 300 }, // Maximize regen
                24: { factor: 0.9, min: 32, max: 45 } // Conservative field weakening
            },
            constraints: ['minimum_usability'],
            tradeoffs: ['performance_reduction']
        });
        
        // Hill climbing optimization
        this.optimizationRules.set('hills', {
            priority: 'hill_performance',
            adjustments: {
                1: { factor: 0.95, min: 20, max: 26 }, // Slight speed reduction
                4: { factor: 1.2, min: 250, max: 320 }, // Increase max current
                6: { factor: 1.15, min: 70, max: 90 }, // Increase acceleration
                24: { factor: 1.15, min: 45, max: 60 }, // Increase field weakening
                9: { factor: 1.1, min: 230, max: 280 } // Increase regen for descents
            },
            constraints: ['thermal_protection', 'motor_limits'],
            tradeoffs: ['range_on_flats']
        });
    }
    
    /**
     * Load performance prediction models
     */
    loadPerformanceModels() {
        // Speed prediction model
        this.performanceModels.set('speed', (settings, vehicle, conditions) => {
            const mphScaling = settings[1] || vehicle.defaultSettings[1];
            const maxCurrent = settings[4] || vehicle.defaultSettings[4];
            const fieldWeakening = settings[24] || vehicle.defaultSettings[24];
            
            // Base speed calculation
            let maxSpeed = mphScaling * (1 + (fieldWeakening - 43) * 0.01);
            
            // Environmental adjustments
            if (conditions.temperature < 40) maxSpeed *= 0.95; // Cold weather
            if (conditions.windSpeed > 15) maxSpeed *= 0.92; // Headwind
            if (conditions.grade > 5) maxSpeed *= (1 - conditions.grade * 0.02); // Hills
            
            // Load adjustments
            const loadFactor = 1 - (conditions.load || 0) * 0.0002;
            maxSpeed *= loadFactor;
            
            return Math.min(25, Math.max(10, maxSpeed)); // Legal and practical limits
        });
        
        // Range prediction model
        this.performanceModels.set('range', (settings, vehicle, conditions) => {
            const mphScaling = settings[1] || vehicle.defaultSettings[1];
            const maxCurrent = settings[4] || vehicle.defaultSettings[4];
            const regenCurrent = settings[9] || vehicle.defaultSettings[9];
            
            // Base energy consumption (Wh/mile)
            let consumption = 150 + (maxCurrent - 245) * 0.8 + (mphScaling - 22) * 5;
            
            // Environmental adjustments
            if (conditions.temperature < 50) consumption *= 1.15; // Cold weather penalty
            if (conditions.temperature > 85) consumption *= 1.1; // Hot weather penalty
            if (conditions.windSpeed > 10) consumption *= (1 + conditions.windSpeed * 0.01);
            if (conditions.grade > 0) consumption *= (1 + conditions.grade * 0.02);
            
            // Regeneration benefit
            const regenEfficiency = Math.min(0.3, (regenCurrent - 200) * 0.001);
            consumption *= (1 - regenEfficiency);
            
            // Calculate range
            const batteryCapacity = vehicle.battery.capacity * vehicle.battery.nominalVoltage; // Wh
            const usableCapacity = batteryCapacity * 0.8; // 80% DOD
            
            return Math.max(8, usableCapacity / consumption); // Minimum 8 mile range
        });
        
        // Efficiency prediction model
        this.performanceModels.set('efficiency', (settings, vehicle, conditions) => {
            const mphScaling = settings[1] || vehicle.defaultSettings[1];
            const maxCurrent = settings[4] || vehicle.defaultSettings[4];
            const acceleration = settings[6] || vehicle.defaultSettings[6];
            
            // Base efficiency (motor + inverter)
            let efficiency = vehicle.motor.efficiency;
            
            // Current efficiency curve (motors are less efficient at very high/low currents)
            const currentRatio = maxCurrent / vehicle.motor.maxCurrent;
            if (currentRatio > 0.9) efficiency *= 0.95; // High current penalty
            if (currentRatio < 0.6) efficiency *= 0.92; // Low current penalty
            
            // Speed efficiency (aerodynamic losses increase with speed²)
            const speedFactor = Math.pow(mphScaling / 22, 2);
            efficiency *= (1 - speedFactor * 0.1);
            
            // Acceleration efficiency (aggressive acceleration wastes energy)
            const accelFactor = (acceleration - 60) / 30;
            efficiency *= (1 - Math.abs(accelFactor) * 0.05);
            
            // Environmental factors
            if (conditions.temperature < 60 || conditions.temperature > 80) {
                efficiency *= 0.95; // Temperature penalty
            }
            
            return Math.max(0.5, Math.min(0.95, efficiency)) * 100; // 50-95% range
        });
        
        // Acceleration prediction model
        this.performanceModels.set('acceleration', (settings, vehicle, conditions) => {
            const maxCurrent = settings[4] || vehicle.defaultSettings[4];
            const acceleration = settings[6] || vehicle.defaultSettings[6];
            
            // Base acceleration (0-20 mph time in seconds)
            const currentFactor = maxCurrent / vehicle.motor.maxCurrent;
            const accelFactor = acceleration / 100;
            
            let time0to20 = 8.0; // Base time
            time0to20 *= (1 / Math.sqrt(currentFactor)); // More current = faster
            time0to20 *= (1 / accelFactor); // Higher accel setting = faster
            
            // Weight penalty
            const weightFactor = (vehicle.weight.curb + (conditions.load || 0)) / vehicle.weight.curb;
            time0to20 *= Math.sqrt(weightFactor);
            
            // Environmental factors
            if (conditions.grade > 0) time0to20 *= (1 + conditions.grade * 0.1);
            if (conditions.temperature < 40) time0to20 *= 1.1; // Cold battery penalty
            
            return Math.max(4, Math.min(15, time0to20)); // 4-15 second range
        });
    }
    
    /**
     * Load safety constraints and limits
     */
    loadSafetyConstraints() {
        this.safetyConstraints.set('thermal_limits', {
            description: 'Prevent motor/controller overheating',
            checks: [
                (settings, vehicle) => {
                    const maxCurrent = settings[4] || 245;
                    const continuous = vehicle.motor.maxCurrent * 0.8;
                    return maxCurrent <= continuous + 50; // Allow 50A burst
                }
            ]
        });
        
        this.safetyConstraints.set('motor_limits', {
            description: 'Stay within motor specifications',
            checks: [
                (settings, vehicle) => {
                    const maxCurrent = settings[4] || 245;
                    return maxCurrent <= vehicle.motor.maxCurrent;
                },
                (settings, vehicle) => {
                    const fieldWeakening = settings[24] || 43;
                    return fieldWeakening >= 25 && fieldWeakening <= 60;
                }
            ]
        });
        
        this.safetyConstraints.set('legal_speed', {
            description: 'Comply with speed regulations',
            checks: [
                (settings, vehicle) => {
                    const mphScaling = settings[1] || 22;
                    const estimatedMaxSpeed = mphScaling * 1.2; // Rough estimate
                    return estimatedMaxSpeed <= 25; // Legal limit
                }
            ]
        });
        
        this.safetyConstraints.set('battery_protection', {
            description: 'Protect battery from damage',
            checks: [
                (settings, vehicle) => {
                    const regenCurrent = settings[9] || 225;
                    return regenCurrent <= vehicle.battery.maxChargeRate * 10; // 10x safety factor
                }
            ]
        });
        
        this.safetyConstraints.set('drivability', {
            description: 'Maintain minimum drivability',
            checks: [
                (settings, vehicle) => {
                    const acceleration = settings[6] || 60;
                    return acceleration >= 30; // Minimum responsiveness
                },
                (settings, vehicle) => {
                    const mphScaling = settings[1] || 22;
                    return mphScaling >= 18; // Minimum useful speed
                }
            ]
        });
    }
    
    /**
     * Main optimization function
     */
    optimize(vehicleData, priorities = {}, currentSettings = [], conditions = {}) {
        try {
            // Normalize inputs
            const vehicle = this.getVehicleProfile(vehicleData);
            const normalizedPriorities = this.normalizePriorities(priorities);
            const baseSettings = this.getBaseSettings(vehicle, currentSettings);
            const envConditions = this.normalizeConditions(conditions);
            
            // Determine optimization strategy
            const strategy = this.selectOptimizationStrategy(normalizedPriorities, envConditions);
            
            // Apply optimization rules
            const optimizedSettings = this.applyOptimizationRules(strategy, baseSettings, vehicle, envConditions);
            
            // Validate constraints
            const validatedSettings = this.validateConstraints(optimizedSettings, vehicle);
            
            // Predict performance
            const performance = this.predictPerformance(validatedSettings, vehicle, envConditions);
            
            // Generate recommendations
            const recommendations = this.generateRecommendations(validatedSettings, vehicle, strategy, performance);
            
            return {
                success: true,
                optimizedSettings: validatedSettings,
                strategy: strategy,
                performance: performance,
                recommendations: recommendations,
                confidence: this.calculateConfidence(vehicle, normalizedPriorities, envConditions),
                method: 'rule_based_expert_system',
                source: 'local_rules'
            };
            
        } catch (error) {
            console.error('Rule-based optimization failed:', error);
            return this.getEmergencyFallback(vehicleData, priorities, currentSettings);
        }
    }
    
    /**
     * Get vehicle profile with fallback
     */
    getVehicleProfile(vehicleData) {
        const modelKey = (vehicleData.model || '').toLowerCase().replace(/\s+/g, '-');
        
        if (this.vehicleProfiles.has(modelKey)) {
            return this.vehicleProfiles.get(modelKey);
        }
        
        // Fallback to e4 profile for unknown vehicles
        console.warn(`Unknown vehicle model: ${vehicleData.model}, using e4 profile`);
        return this.vehicleProfiles.get('e4');
    }
    
    /**
     * Normalize priority inputs
     */
    normalizePriorities(priorities) {
        return {
            speed: Math.max(0, Math.min(10, priorities.speed || 5)),
            range: Math.max(0, Math.min(10, priorities.range || 5)),
            acceleration: Math.max(0, Math.min(10, priorities.acceleration || 5)),
            efficiency: Math.max(0, Math.min(10, priorities.efficiency || 5)),
            hills: Math.max(0, Math.min(10, priorities.hills || 0))
        };
    }
    
    /**
     * Get base settings
     */
    getBaseSettings(vehicle, currentSettings) {
        const settings = new Array(25).fill(0);
        
        // Use current settings if provided
        if (currentSettings && currentSettings.length > 0) {
            for (let i = 0; i < Math.min(25, currentSettings.length); i++) {
                settings[i] = currentSettings[i] || 0;
            }
        }
        
        // Apply vehicle defaults for key settings
        Object.entries(vehicle.defaultSettings).forEach(([index, value]) => {
            const i = parseInt(index) - 1; // Convert to 0-based index
            if (i >= 0 && i < 25 && settings[i] === 0) {
                settings[i] = value;
            }
        });
        
        return settings;
    }
    
    /**
     * Normalize environmental conditions
     */
    normalizeConditions(conditions) {
        return {
            temperature: conditions.temperature || 70,
            windSpeed: conditions.windSpeed || 0,
            grade: conditions.grade || 0,
            load: conditions.load || 0,
            surface: conditions.surface || 'paved',
            humidity: conditions.humidity || 50
        };
    }
    
    /**
     * Select optimization strategy based on priorities
     */
    selectOptimizationStrategy(priorities, conditions) {
        // Calculate priority scores
        const scores = {
            speed: priorities.speed,
            range: priorities.range,
            efficiency: priorities.efficiency,
            balanced: (priorities.speed + priorities.range + priorities.acceleration) / 3
        };
        
        // Check for hills priority
        if (priorities.hills > 6 || conditions.grade > 8) {
            scores.hills = priorities.hills + conditions.grade * 0.5;
        }
        
        // Find highest priority
        const maxScore = Math.max(...Object.values(scores));
        const strategy = Object.keys(scores).find(key => scores[key] === maxScore);
        
        return strategy || 'balanced';
    }
    
    /**
     * Apply optimization rules
     */
    applyOptimizationRules(strategy, baseSettings, vehicle, conditions) {
        const rules = this.optimizationRules.get(strategy);
        if (!rules) {
            console.warn(`No rules found for strategy: ${strategy}`);
            return baseSettings;
        }
        
        const optimized = [...baseSettings];
        
        // Apply rule adjustments
        Object.entries(rules.adjustments).forEach(([settingIndex, adjustment]) => {
            const index = parseInt(settingIndex) - 1; // Convert to 0-based
            if (index >= 0 && index < 25) {
                const baseValue = baseSettings[index] || vehicle.defaultSettings[settingIndex] || 50;
                const adjustedValue = baseValue * adjustment.factor;
                
                // Apply constraints
                optimized[index] = Math.max(
                    adjustment.min,
                    Math.min(adjustment.max, Math.round(adjustedValue))
                );
            }
        });
        
        // Apply environmental adjustments
        this.applyEnvironmentalAdjustments(optimized, conditions, vehicle);
        
        return optimized;
    }
    
    /**
     * Apply environmental condition adjustments
     */
    applyEnvironmentalAdjustments(settings, conditions, vehicle) {
        // Cold weather adjustments
        if (conditions.temperature < 50) {
            settings[4 - 1] = Math.max(settings[4 - 1] * 1.1, settings[4 - 1] + 20); // Increase current
            settings[6 - 1] = Math.max(30, settings[6 - 1] * 0.9); // Reduce aggressive acceleration
        }
        
        // Hot weather adjustments
        if (conditions.temperature > 85) {
            settings[4 - 1] = Math.min(settings[4 - 1] * 0.95, vehicle.motor.maxCurrent * 0.9); // Reduce current
        }
        
        // Hill adjustments
        if (conditions.grade > 5) {
            settings[4 - 1] = Math.min(settings[4 - 1] * 1.15, vehicle.motor.maxCurrent); // More current
            settings[24 - 1] = Math.min(settings[24 - 1] * 1.1, 60); // More field weakening
        }
        
        // High load adjustments
        if (conditions.load > 500) {
            settings[4 - 1] = Math.min(settings[4 - 1] * 1.1, vehicle.motor.maxCurrent);
            settings[6 - 1] = Math.max(settings[6 - 1] * 0.95, 40); // Gentler acceleration
        }
    }
    
    /**
     * Validate safety constraints
     */
    validateConstraints(settings, vehicle) {
        const validated = [...settings];
        
        // Check all constraint categories
        for (const [categoryName, constraint] of this.safetyConstraints.entries()) {
            for (const check of constraint.checks) {
                if (!check(validated, vehicle)) {
                    console.warn(`Constraint violation: ${constraint.description}`);
                    // Apply conservative fallback for this constraint
                    this.applyConservativeFallback(validated, vehicle, categoryName);
                }
            }
        }
        
        return validated;
    }
    
    /**
     * Apply conservative fallback for constraint violations
     */
    applyConservativeFallback(settings, vehicle, constraintCategory) {
        switch (constraintCategory) {
            case 'thermal_limits':
            case 'motor_limits':
                settings[4 - 1] = Math.min(settings[4 - 1], vehicle.motor.maxCurrent * 0.8);
                break;
            case 'legal_speed':
                settings[1 - 1] = Math.min(settings[1 - 1], 24);
                break;
            case 'battery_protection':
                settings[9 - 1] = Math.min(settings[9 - 1], vehicle.battery.maxChargeRate * 8);
                break;
            case 'drivability':
                settings[6 - 1] = Math.max(settings[6 - 1], 40);
                settings[1 - 1] = Math.max(settings[1 - 1], 20);
                break;
        }
    }
    
    /**
     * Predict performance with all models
     */
    predictPerformance(settings, vehicle, conditions) {
        const performance = {};
        
        for (const [metricName, model] of this.performanceModels.entries()) {
            try {
                performance[metricName] = model(settings, vehicle, conditions);
            } catch (error) {
                console.error(`Performance prediction failed for ${metricName}:`, error);
                performance[metricName] = this.getDefaultPerformance(metricName);
            }
        }
        
        return performance;
    }
    
    /**
     * Get default performance values
     */
    getDefaultPerformance(metric) {
        const defaults = {
            speed: 22,
            range: 25,
            efficiency: 75,
            acceleration: 8
        };
        return defaults[metric] || 50;
    }
    
    /**
     * Generate optimization recommendations
     */
    generateRecommendations(settings, vehicle, strategy, performance) {
        const recommendations = [];
        
        // Strategy-specific recommendations
        switch (strategy) {
            case 'speed':
                recommendations.push('Optimized for maximum speed - monitor motor temperature');
                if (performance.range < 20) {
                    recommendations.push('Range reduced significantly - consider carrying spare battery');
                }
                break;
                
            case 'range':
                recommendations.push('Optimized for maximum range - gentle acceleration recommended');
                if (performance.speed < 20) {
                    recommendations.push('Top speed reduced - plan for longer travel times');
                }
                break;
                
            case 'hills':
                recommendations.push('Optimized for hill climbing - excellent for hilly terrain');
                recommendations.push('Monitor motor temperature on extended climbs');
                break;
                
            case 'efficiency':
                recommendations.push('Optimized for maximum efficiency - ideal for daily commuting');
                break;
                
            default:
                recommendations.push('Balanced optimization - good all-around performance');
        }
        
        // Performance-based recommendations
        if (performance.acceleration > 10) {
            recommendations.push('Slow acceleration - consider increasing acceleration setting');
        }
        
        if (settings[4 - 1] > vehicle.motor.maxCurrent * 0.9) {
            recommendations.push('High motor current - ensure adequate cooling');
        }
        
        if (settings[24 - 1] > 50) {
            recommendations.push('High field weakening - monitor for motor overheating');
        }
        
        return recommendations;
    }
    
    /**
     * Calculate optimization confidence
     */
    calculateConfidence(vehicle, priorities, conditions) {
        let confidence = 0.8; // Base confidence for rule-based system
        
        // Increase confidence for known vehicle profiles
        if (this.vehicleProfiles.has(vehicle)) {
            confidence += 0.1;
        }
        
        // Adjust for priority clarity
        const priorityVariance = this.calculatePriorityVariance(priorities);
        confidence += (1 - priorityVariance) * 0.1;
        
        // Adjust for standard conditions
        if (conditions.temperature >= 50 && conditions.temperature <= 80) {
            confidence += 0.05;
        }
        
        return Math.min(0.95, confidence);
    }
    
    /**
     * Calculate priority variance (how clear the priorities are)
     */
    calculatePriorityVariance(priorities) {
        const values = Object.values(priorities);
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;
        return variance / 25; // Normalize to 0-1 range
    }
    
    /**
     * Emergency fallback for complete failures
     */
    getEmergencyFallback(vehicleData, priorities, currentSettings) {
        console.warn('Using emergency fallback optimization');
        
        // Safe, conservative settings
        const safeSettings = [
            20,  // F.1 - Conservative speed
            200, // F.4 - Low current
            50,  // F.6 - Moderate acceleration
            220, // F.9 - Moderate regen
            40,  // F.24 - Conservative field weakening
            ...new Array(20).fill(50) // Default for remaining settings
        ];
        
        return {
            success: true,
            optimizedSettings: safeSettings,
            strategy: 'emergency_safe',
            performance: {
                speed: 18,
                range: 20,
                efficiency: 70,
                acceleration: 10
            },
            recommendations: [
                'Emergency safe settings applied',
                'Performance may be limited',
                'Review vehicle configuration'
            ],
            confidence: 0.6,
            method: 'emergency_fallback',
            source: 'safety_defaults'
        };
    }
    
    /**
     * Get optimization status
     */
    getStatus() {
        return {
            vehicleProfiles: this.vehicleProfiles.size,
            optimizationRules: this.optimizationRules.size,
            performanceModels: this.performanceModels.size,
            safetyConstraints: this.safetyConstraints.size,
            ready: true
        };
    }
}

// Create global instance
window.ruleBasedOptimizer = new RuleBasedOptimizer();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RuleBasedOptimizer;
}
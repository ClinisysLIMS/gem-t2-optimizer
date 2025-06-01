// js/optimizer.js
/**
 * GEM T2 Controller Optimizer Engine
 * Core logic for calculating optimal controller settings based on vehicle configuration
 */
class GEMControllerOptimizer {
    constructor() {
        // Factory default settings for GEM T2 controllers
        this.factoryDefaults = {
            1: 22,   // MPH Scaling
            3: 20,   // Controlled Acceleration  
            4: 255,  // Max Armature Current Limit
            5: 255,  // Plug Current
            6: 60,   // Armature Acceleration Rate
            7: 59,   // Minimum Field Current
            8: 241,  // Maximum Field Current
            9: 221,  // Regen Armature Current
            10: 180, // Regen Maximum Field Current
            11: 122, // Turf Speed Limit
            12: 149, // Reverse Speed Limit
            14: 3,   // IR Compensation
            15: 72,  // Battery Volts
            19: 12,  // Field Ramp Rate Plug/Regen
            20: 40,  // MPH Overspeed
            22: 122, // Odometer Calibration
            23: 10,  // Error Compensation
            24: 43,  // Field Weakening Start
            26: 3    // Ratio of Field to Arm
        };
        
        // Function descriptions for UI display
        this.functionDescriptions = {
            1: "MPH Scaling",
            3: "Controlled Acceleration",
            4: "Max Armature Current Limit",
            5: "Plug Current",
            6: "Armature Acceleration Rate",
            7: "Minimum Field Current",
            8: "Maximum Field Current",
            9: "Regen Armature Current",
            10: "Regen Maximum Field Current",
            11: "Turf Speed Limit",
            12: "Reverse Speed Limit",
            14: "IR Compensation",
            15: "Battery Volts",
            19: "Field Ramp Rate Plug/Regen",
            20: "MPH Overspeed",
            22: "Odometer Calibration",
            23: "Error Compensation",
            24: "Field Weakening Start",
            26: "Ratio of Field to Arm"
        };
        
        // Vehicle-specific parameters by model
        this.vehicleParameters = {
            'e2': { weight: 1200, passengers: 2, gearRatio: 8.91 },
            'e4': { weight: 1350, passengers: 4, gearRatio: 8.91 },
            'eS': { weight: 1250, passengers: 2, gearRatio: 8.91 },
            'eL': { weight: 1400, passengers: 2, gearRatio: 8.91 },
            'e6': { weight: 1500, passengers: 6, gearRatio: 8.91 },
            'elXD': { weight: 1600, passengers: 2, gearRatio: 8.91 }
        };
        
        // Safety constraints to prevent dangerous settings
        this.safetyConstraints = {
            1: { min: 15, max: 35 },    // MPH Scaling
            3: { min: 8, max: 40 },     // Controlled Acceleration
            4: { min: 180, max: 255 },  // Max Armature Current
            5: { min: 180, max: 255 },  // Plug Current
            6: { min: 30, max: 100 },   // Armature Acceleration Rate
            7: { min: 51, max: 120 },   // Minimum Field Current
            8: { min: 200, max: 255 },  // Maximum Field Current
            9: { min: 150, max: 255 },  // Regen Armature Current
            10: { min: 51, max: 255 },  // Regen Maximum Field Current
            11: { min: 100, max: 170 }, // Turf Speed Limit
            12: { min: 120, max: 170 }, // Reverse Speed Limit
            14: { min: 2, max: 15 },    // IR Compensation
            15: { min: 60, max: 90 },   // Battery Volts
            19: { min: 5, max: 25 },    // Field Ramp Rate
            20: { min: 25, max: 50 },   // MPH Overspeed
            22: { min: 80, max: 180 },  // Odometer Calibration
            23: { min: 3, max: 15 },    // Error Compensation
            24: { min: 25, max: 85 },   // Field Weakening Start
            26: { min: 1, max: 8 }      // Ratio of Field to Arm
        };
    }
    
    /**
     * Main optimization function
     * @param {Object} inputData - User input configuration
     * @param {Object} baselineSettings - Optional baseline settings (e.g., from PDF import)
     * @returns {Object} Optimization results
     */
    optimizeSettings(inputData, baselineSettings = null) {
        // Start with baseline settings if provided, otherwise use factory defaults
        const startingSettings = baselineSettings || this.factoryDefaults;
        const optimizedSettings = { ...startingSettings };
        
        // Analyze the input configuration
        const analysisData = this.analyzeConfiguration(inputData);
        
        // Apply optimizations in order of priority
        this.optimizeTireSettings(optimizedSettings, inputData, analysisData);
        this.optimizeBatterySettings(optimizedSettings, inputData, analysisData);
        this.optimizeMotorProtection(optimizedSettings, inputData, analysisData);
        this.optimizeTerrainSettings(optimizedSettings, inputData, analysisData);
        this.optimizePerformanceSettings(optimizedSettings, inputData, analysisData);
        
        // Apply safety constraints
        this.applySafetyConstraints(optimizedSettings);
        
        // Calculate performance changes
        const performanceChanges = this.calculatePerformanceChanges(
            optimizedSettings, 
            this.factoryDefaults,
            inputData, 
            analysisData
        );
        
        return {
            factorySettings: this.factoryDefaults,
            baselineSettings: baselineSettings || this.factoryDefaults,
            isUsingImportedBaseline: baselineSettings !== null,
            optimizedSettings,
            performanceChanges,
            analysisData,
            inputData
        };
    }
    
    /**
     * Analyze vehicle configuration to determine optimization parameters
     * @param {Object} inputData - User input configuration
     * @returns {Object} Analysis results
     */
    analyzeConfiguration(inputData) {
        const vehicleParams = this.vehicleParameters[inputData.vehicle.model] || 
                              this.vehicleParameters['e4'];
        
        const analysis = {
            vehicleWeight: vehicleParams.weight,
            gearRatio: parseFloat(inputData.wheel.gearRatio) || vehicleParams.gearRatio,
            tireSizeRatio: parseFloat(inputData.wheel.tireDiameter) / 22 || 1,
            batteryVoltage: parseInt(inputData.battery.voltage) || 72,
            isLithium: inputData.battery.type === 'lithium',
            motorRisk: this.assessMotorRisk(inputData.vehicle.motorCondition),
            terrainDifficulty: this.assessTerrainDifficulty(inputData.environment.terrain),
            loadFactor: this.calculateLoadFactor(inputData.environment.vehicleLoad, vehicleParams),
            temperatureFactor: this.calculateTemperatureFactor(inputData.environment.temperatureRange),
            priorityWeights: this.calculatePriorityWeights(inputData.priorities)
        };
        
        return analysis;
    }
    
    /**
     * Assess motor risk level based on condition
     * @param {string} motorCondition - User-selected motor condition
     * @returns {number} Risk factor (0-1)
     */
    assessMotorRisk(motorCondition) {
        switch (motorCondition) {
            case 'sparking': return 1;
            case 'fair': return 0.5;
            case 'good':
            default: return 0;
        }
    }
    
    /**
     * Assess terrain difficulty
     * @param {string} terrain - User-selected terrain type
     * @returns {number} Difficulty factor (0-1)
     */
    assessTerrainDifficulty(terrain) {
        switch (terrain) {
            case 'steep': return 1;
            case 'moderate': return 0.6;
            case 'mixed': return 0.4;
            case 'flat':
            default: return 0.1;
        }
    }
    
    /**
     * Calculate load factor based on vehicle load and parameters
     * @param {string} vehicleLoad - User-selected vehicle load
     * @param {Object} vehicleParams - Vehicle parameters
     * @returns {number} Load factor (1-2)
     */
    calculateLoadFactor(vehicleLoad, vehicleParams) {
        const baseWeight = vehicleParams.weight;
        
        switch (vehicleLoad) {
            case 'max': return 2;
            case 'heavy': return 1.75;
            case 'medium': return 1.4;
            case 'light':
            default: return 1;
        }
    }
    
    /**
     * Calculate temperature factor
     * @param {string} temperatureRange - User-selected temperature range
     * @returns {number} Temperature factor (0-1)
     */
    calculateTemperatureFactor(temperatureRange) {
        switch (temperatureRange) {
            case 'extreme': return 1;
            case 'hot': return 0.8;
            case 'cold': return 0.7;
            case 'mild':
            default: return 0.3;
        }
    }
    
    /**
     * Calculate priority weights
     * @param {Object} priorities - User priorities
     * @returns {Object} Priority weights
     */
    calculatePriorityWeights(priorities) {
        // Default balanced weights if no priorities are set
        if (!priorities) {
            return {
                range: 0.5,
                speed: 0.5,
                acceleration: 0.5,
                hillClimbing: 0.5,
                regen: 0.5
            };
        }
        
        // Normalize values to 0-1 range
        return {
            range: priorities.range / 10 || 0.5,
            speed: priorities.speed / 10 || 0.5,
            acceleration: priorities.acceleration / 10 || 0.5,
            hillClimbing: priorities.hillClimbing / 10 || 0.5,
            regen: priorities.regen / 10 || 0.5
        };
    }
    
    /**
     * Optimize tire-related settings
     * @param {Object} settings - Current settings
     * @param {Object} inputData - User input data
     * @param {Object} analysis - Analysis data
     */
    optimizeTireSettings(settings, inputData, analysis) {
        const { tireSizeRatio } = analysis;
        
        // Adjust MPH Scaling based on tire size
        settings[1] = Math.round(this.factoryDefaults[1] * tireSizeRatio);
        
        // Adjust Odometer Calibration based on tire size
        settings[22] = Math.round(this.factoryDefaults[22] * tireSizeRatio);
        
        // Adjust field weakening for larger tires
        if (tireSizeRatio > 1.1) {
            settings[7] = Math.min(Math.round(settings[7] * 1.2), this.safetyConstraints[7].max);
        }
    }
    
    /**
     * Optimize battery-related settings
     * @param {Object} settings - Current settings
     * @param {Object} inputData - User input data
     * @param {Object} analysis - Analysis data
     */
    optimizeBatterySettings(settings, inputData, analysis) {
        const { batteryVoltage, isLithium } = analysis;
        
        // Set battery voltage
        settings[15] = batteryVoltage;
        
        // Adjust IR Compensation for lithium batteries
        if (isLithium) {
            settings[14] = isLithium ? 7 : settings[14];
            
            // Enhance regenerative braking for lithium
            settings[9] = Math.min(Math.round(settings[9] * 1.1), this.safetyConstraints[9].max);
            settings[10] = Math.min(Math.round(settings[10] * 1.15), this.safetyConstraints[10].max);
        }
    }
    
    /**
     * Optimize motor protection settings
     * @param {Object} settings - Current settings
     * @param {Object} inputData - User input data
     * @param {Object} analysis - Analysis data
     */
    optimizeMotorProtection(settings, inputData, analysis) {
        const { motorRisk } = analysis;
        
        if (motorRisk > 0) {
            // Protect motor from sparking
            const riskFactor = 1 + (motorRisk * 0.5);
            
            // Increase minimum field current to prevent sparking
            settings[7] = Math.min(Math.round(settings[7] * riskFactor), this.safetyConstraints[7].max);
            
            // Delay field weakening to prevent sparking
            settings[24] = Math.min(Math.round(settings[24] * riskFactor), this.safetyConstraints[24].max);
            
            // Reduce top speed slightly for motor protection
            settings[20] = Math.max(Math.round(settings[20] / riskFactor), this.safetyConstraints[20].min);
            
            // Improve field control stability
            settings[23] = Math.max(Math.round(settings[23] / 2), this.safetyConstraints[23].min);
        }
    }
    
    /**
     * Optimize terrain-related settings
     * @param {Object} settings - Current settings
     * @param {Object} inputData - User input data
     * @param {Object} analysis - Analysis data
     */
    optimizeTerrainSettings(settings, inputData, analysis) {
        const { terrainDifficulty, loadFactor } = analysis;
        
        if (terrainDifficulty > 0.5 || loadFactor > 1.4) {
            // Enhance hill climbing ability
            const terrainFactor = terrainDifficulty * loadFactor;
            
            // Improve acceleration for hills
            settings[3] = Math.max(Math.round(settings[3] * (1 - terrainDifficulty * 0.2)), 
                                  this.safetyConstraints[3].min);
            
            // Maintain maximum torque for hills
            settings[4] = this.factoryDefaults[4]; // Max armature current
            
            // Enhance regenerative braking for descents
            settings[9] = Math.min(Math.round(settings[9] * (1 + terrainDifficulty * 0.1)), 
                                  this.safetyConstraints[9].max);
            
            // Better field control for varied loads
            settings[26] = Math.min(settings[26] + Math.round(terrainDifficulty), 
                                   this.safetyConstraints[26].max);
        }
    }
    
    /**
     * Optimize performance-related settings
     * @param {Object} settings - Current settings
     * @param {Object} inputData - User input data
     * @param {Object} analysis - Analysis data
     */
    optimizePerformanceSettings(settings, inputData, analysis) {
        const { priorityWeights } = analysis;
        
        // Optimize for speed if prioritized
        if (priorityWeights.speed > 0.7) {
            settings[7] = Math.round(settings[7] * 0.9); // Lower minimum field current
            settings[11] = Math.min(Math.round(settings[11] * 1.1), this.safetyConstraints[11].max); // Higher turf speed
        }
        
        // Optimize for acceleration if prioritized
        if (priorityWeights.acceleration > 0.7) {
            settings[3] = Math.max(Math.round(settings[3] * 0.8), this.safetyConstraints[3].min); // Faster acceleration
            settings[6] = Math.max(Math.round(settings[6] * 0.85), this.safetyConstraints[6].min); // Faster armature accel
        }
        
        // Optimize for range if prioritized
        if (priorityWeights.range > 0.7) {
            settings[3] = Math.min(Math.round(settings[3] * 1.2), this.safetyConstraints[3].max); // Slower acceleration
            settings[4] = Math.round(settings[4] * 0.95); // Lower max current
        }
        
        // Optimize for regen if prioritized
        if (priorityWeights.regen > 0.7) {
            settings[9] = Math.min(Math.round(settings[9] * 1.15), this.safetyConstraints[9].max); // Stronger regen
            settings[10] = Math.min(Math.round(settings[10] * 1.2), this.safetyConstraints[10].max); // Stronger field regen
            settings[19] = Math.max(Math.round(settings[19] * 0.7), this.safetyConstraints[19].min); // Faster regen engage
        }
    }
    
    /**
     * Apply safety constraints to settings
     * @param {Object} settings - Current settings
     */
    applySafetyConstraints(settings) {
        Object.keys(settings).forEach(functionNum => {
            const constraints = this.safetyConstraints[functionNum];
            if (constraints) {
                settings[functionNum] = Math.max(
                    constraints.min,
                    Math.min(settings[functionNum], constraints.max)
                );
            }
        });
    }
    
    /**
     * Calculate performance changes based on optimized settings
     * @param {Object} optimized - Optimized settings
     * @param {Object} factory - Factory settings
     * @param {Object} inputData - User input data
     * @param {Object} analysis - Analysis data
     * @returns {Array} Array of performance change descriptions
     */
    calculatePerformanceChanges(optimized, factory, inputData, analysis) {
        const changes = [];
        
        // Calculate top speed change
        const speedChange = this.calculateSpeedChange(optimized, factory, analysis);
        if (speedChange > 5) {
            changes.push(`Top speed increased by approximately ${speedChange}%`);
        } else if (speedChange < -5) {
            changes.push(`Top speed reduced by approximately ${Math.abs(speedChange)}% for motor protection`);
        }
        
        // Calculate acceleration change
        const accelChange = this.calculateAccelerationChange(optimized, factory);
        if (accelChange > 10) {
            changes.push(`Acceleration improved by approximately ${accelChange}%`);
        } else if (accelChange < -10) {
            changes.push(`Acceleration smoothed by approximately ${Math.abs(accelChange)}% for better control`);
        }
        
        // Calculate hill climbing change
        const hillChange = this.calculateHillClimbingChange(optimized, factory);
        if (hillChange > 5) {
            changes.push(`Hill climbing ability improved by approximately ${hillChange}%`);
        }
        
        // Calculate range change
        const rangeChange = this.calculateRangeChange(optimized, factory, analysis);
        if (rangeChange > 5) {
            changes.push(`Range improved by approximately ${rangeChange}%`);
        } else if (rangeChange < -5) {
            changes.push(`Range slightly reduced in favor of performance`);
        }
        
        // Calculate motor protection change
        const motorProtection = this.calculateMotorProtectionChange(optimized, factory);
        if (motorProtection > 20) {
            changes.push(`Motor protection significantly improved, reducing risk of brush wear and sparking`);
        } else if (motorProtection > 5) {
            changes.push(`Motor protection improved, may extend motor life`);
        }
        
        // Calculate regenerative braking change
        const regenChange = this.calculateRegenChange(optimized, factory);
        if (regenChange > 10) {
            changes.push(`Regenerative braking strength increased by approximately ${regenChange}%`);
        }
        
        return changes;
    }
    
    /**
     * Calculate speed change percentage
     * @param {Object} optimized - Optimized settings
     * @param {Object} factory - Factory settings
     * @param {Object} analysis - Analysis data
     * @returns {number} Speed change percentage
     */
    calculateSpeedChange(optimized, factory, analysis) {
        // Speed is primarily affected by field weakening (F7) and tire size
        const fieldWeakeningEffect = (factory[7] / optimized[7]) - 1;
        const tireSizeEffect = analysis.tireSizeRatio - 1;
        
        return Math.round((fieldWeakeningEffect + tireSizeEffect) * 100);
    }
    
    /**
     * Calculate acceleration change percentage
     * @param {Object} optimized - Optimized settings
     * @param {Object} factory - Factory settings
     * @returns {number} Acceleration change percentage
     */
    calculateAccelerationChange(optimized, factory) {
        // Acceleration is primarily affected by controlled acceleration (F3)
        // Lower value = faster acceleration
        const accelRatio = factory[3] / optimized[3];
        return Math.round((accelRatio - 1) * 100);
    }
    
    /**
     * Calculate hill climbing change percentage
     * @param {Object} optimized - Optimized settings
     * @param {Object} factory - Factory settings
     * @returns {number} Hill climbing change percentage
     */
    calculateHillClimbingChange(optimized, factory) {
        // Hill climbing is affected by max armature current (F4) and field control ratio (F26)
        const currentEffect = (optimized[4] / factory[4]) - 1;
        const fieldRatioEffect = (optimized[26] / factory[26]) - 1;
        
        return Math.round((currentEffect + fieldRatioEffect * 0.5) * 100);
    }
    
    /**
     * Calculate range change percentage
     * @param {Object} optimized - Optimized settings
     * @param {Object} factory - Factory settings
     * @param {Object} analysis - Analysis data
     * @returns {number} Range change percentage
     */
    calculateRangeChange(optimized, factory, analysis) {
        // Range is affected by acceleration rate, max current, and battery type
        const accelEffect = (factory[3] / optimized[3]) - 1;
        const currentEffect = (factory[4] / optimized[4]) - 1;
        const batteryFactor = analysis.isLithium ? 0.15 : 0;
        
        return Math.round((-accelEffect * 50 - currentEffect * 30 + batteryFactor) * 100);
    }
    
    /**
     * Calculate motor protection change percentage
     * @param {Object} optimized - Optimized settings
     * @param {Object} factory - Factory settings
     * @returns {number} Motor protection change percentage
     */
    calculateMotorProtectionChange(optimized, factory) {
        // Motor protection is affected by minimum field current (F7) and field weakening start (F24)
        const minFieldEffect = (optimized[7] / factory[7]) - 1;
        const weakenStartEffect = (optimized[24] / factory[24]) - 1;
        
        return Math.round((minFieldEffect + weakenStartEffect) * 100);
    }
    
    /**
     * Calculate regenerative braking change percentage
     * @param {Object} optimized - Optimized settings
     * @param {Object} factory - Factory settings
     * @returns {number} Regenerative braking change percentage
     */
    calculateRegenChange(optimized, factory) {
        // Regen braking is affected by regen armature current (F9) and regen field current (F10)
        const armatureEffect = (optimized[9] / factory[9]) - 1;
        const fieldEffect = (optimized[10] / factory[10]) - 1;
        
        return Math.round((armatureEffect + fieldEffect) * 50);
    }
}
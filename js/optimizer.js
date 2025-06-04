// js/optimizer.js
/**
 * GEM T2 Controller Optimizer Engine
 * Core logic for calculating optimal controller settings based on vehicle configuration
 */
class GEMOptimizer {
    constructor() {
        // Factory default settings for GEM T2 controllers (all 128 functions)
        this.factoryDefaults = {
            1: 22,   // MPH Scaling
            2: 0,    // Creep Speed
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
            13: 0,   // Reserved
            14: 3,   // IR Compensation
            15: 72,  // Battery Volts
            16: 63,  // Low Battery Volts
            17: 0,   // Pack Over Temp
            18: 0,   // Reserved
            19: 12,  // Field Ramp Rate Plug/Regen
            20: 40,  // MPH Overspeed
            21: 40,  // Arm Current Ramp (Handbrake)
            22: 122, // Odometer Calibration
            23: 10,  // Error Compensation
            24: 43,  // Field Weakening Start
            25: 1,   // Pedal Enable
            26: 3    // Ratio of Field to Arm
        };
        
        // Initialize remaining functions (27-128) with default 0
        for (let i = 27; i <= 128; i++) {
            this.factoryDefaults[i] = 0;
        }
        
        // Function descriptions for UI display
        this.functionDescriptions = {
            1: "MPH Scaling",
            2: "Creep Speed",
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
            16: "Low Battery Volts",
            19: "Field Ramp Rate Plug/Regen",
            20: "MPH Overspeed",
            21: "Arm Current Ramp",
            22: "Odometer Calibration",
            23: "Error Compensation",
            24: "Field Weakening Start",
            25: "Pedal Enable",
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
            2: { min: 0, max: 10 },     // Creep Speed
            3: { min: 8, max: 40 },     // Controlled Acceleration
            4: { min: 180, max: 255 },  // Max Armature Current
            5: { min: 50, max: 255 },   // Plug Current
            6: { min: 30, max: 100 },   // Armature Acceleration Rate
            7: { min: 51, max: 120 },   // Minimum Field Current
            8: { min: 200, max: 255 },  // Maximum Field Current
            9: { min: 150, max: 255 },  // Regen Armature Current
            10: { min: 51, max: 255 },  // Regen Maximum Field Current
            11: { min: 100, max: 170 }, // Turf Speed Limit
            12: { min: 120, max: 170 }, // Reverse Speed Limit
            14: { min: 2, max: 20 },    // IR Compensation
            15: { min: 48, max: 96 },   // Battery Volts
            16: { min: 40, max: 80 },   // Low Battery Volts
            19: { min: 5, max: 30 },    // Field Ramp Rate
            20: { min: 25, max: 50 },   // MPH Overspeed
            21: { min: 20, max: 80 },   // Arm Current Ramp
            22: { min: 80, max: 180 },  // Odometer Calibration
            23: { min: 0, max: 20 },    // Error Compensation
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
        try {
            // Input validation
            if (!inputData || typeof inputData !== 'object') {
                throw new Error('Invalid input data: must be object');
            }
            
            if (!inputData.vehicle || !inputData.vehicle.model) {
                throw new Error('Vehicle model is required');
            }
            
            // Validate baseline settings if provided
            if (baselineSettings && (!Array.isArray(baselineSettings) || baselineSettings.length !== 128)) {
                console.warn('Invalid baseline settings format, using factory defaults');
                baselineSettings = null;
            }
            
            // Start with baseline settings if provided, otherwise use factory defaults
            const startingSettings = baselineSettings || this.factoryDefaults;
            const optimizedSettings = { ...startingSettings };
            
            // Analyze the input configuration with error handling
            let analysisData;
            try {
                analysisData = this.analyzeConfiguration(inputData);
            } catch (error) {
                console.error('Configuration analysis failed:', error);
                analysisData = this.getDefaultAnalysisData();
            }
            
            // Apply optimizations with individual error handling
            const optimizationSteps = [
                { func: 'optimizeTireSettings', name: 'tire settings' },
                { func: 'optimizeBatterySettings', name: 'battery settings' },
                { func: 'optimizeMotorProtection', name: 'motor protection' },
                { func: 'optimizeTerrainSettings', name: 'terrain settings' },
                { func: 'optimizePerformanceSettings', name: 'performance settings' },
                { func: 'optimizeCreepSpeed', name: 'creep speed' },
                { func: 'optimizePlugCurrent', name: 'plug current' },
                { func: 'optimizeFieldRampRate', name: 'field ramp rate' },
                { func: 'optimizeArmCurrentRamp', name: 'armature current ramp' },
                { func: 'optimizeErrorCompensation', name: 'error compensation' }
            ];
            
            for (const step of optimizationSteps) {
                try {
                    this[step.func](optimizedSettings, inputData, analysisData);
                } catch (error) {
                    console.warn(`${step.name} optimization failed:`, error);
                    // Continue with other optimizations
                }
            }
            
            // Apply safety constraints with error handling
            try {
                this.applySafetyConstraints(optimizedSettings);
            } catch (error) {
                console.error('Safety constraints application failed:', error);
                // Apply emergency safety defaults
                this.applyEmergencySafetyDefaults(optimizedSettings);
            }
            
            // Calculate performance changes with error handling
            let performanceChanges;
            try {
                performanceChanges = this.calculatePerformanceChanges(
                    optimizedSettings, 
                    this.factoryDefaults,
                    inputData, 
                    analysisData
                );
            } catch (error) {
                console.error('Performance calculation failed:', error);
                performanceChanges = this.getDefaultPerformanceChanges();
            }
            
            return {
                success: true,
                factorySettings: this.factoryDefaults,
                baselineSettings: baselineSettings || this.factoryDefaults,
                isUsingImportedBaseline: baselineSettings !== null,
                optimizedSettings,
                performanceChanges,
                analysisData,
                inputData,
                warnings: this.getOptimizationWarnings(optimizedSettings, inputData)
            };
            
        } catch (error) {
            console.error('Optimization failed:', error);
            return this.getEmergencyFallback(inputData, baselineSettings, error);
        }
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
            gearRatio: this.parseGearRatio(inputData.wheel.gearRatio) || vehicleParams.gearRatio,
            tireSizeRatio: parseFloat(inputData.wheel.tireDiameter) / 22 || 1,
            batteryVoltage: parseInt(inputData.battery.voltage) || 72,
            batteryCapacity: parseInt(inputData.battery.capacity) || 105,
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
     * Parse gear ratio string (e.g., "10.35:1" to 10.35)
     * @param {string} gearRatioStr - Gear ratio string
     * @returns {number} Numeric gear ratio
     */
    parseGearRatio(gearRatioStr) {
        if (!gearRatioStr) return null;
        const match = gearRatioStr.match(/^([\d.]+):1$/);
        return match ? parseFloat(match[1]) : parseFloat(gearRatioStr);
    }
    
    /**
     * Optimize tire-related settings
     * @param {Object} settings - Current settings
     * @param {Object} inputData - User input data
     * @param {Object} analysis - Analysis data
     */
    optimizeTireSettings(settings, inputData, analysis) {
        const { tireSizeRatio, gearRatio } = analysis;
        
        // Adjust MPH Scaling based on tire size and gear ratio
        // Standard gear ratio is 8.91:1 for most GEMs
        const gearRatioFactor = 8.91 / gearRatio;
        settings[1] = Math.round(this.factoryDefaults[1] * tireSizeRatio * gearRatioFactor);
        
        // Adjust Odometer Calibration based on tire size (gear ratio doesn't affect odometer)
        settings[22] = Math.round(this.factoryDefaults[22] * tireSizeRatio);
        
        // Adjust field weakening for larger tires or different gear ratios
        if (tireSizeRatio > 1.1 || gearRatio < 8.0) {
            // Larger tires or lower gear ratios need more field weakening for speed
            settings[7] = Math.min(Math.round(settings[7] * 1.2), this.safetyConstraints[7].max);
        } else if (gearRatio > 10.0) {
            // Higher gear ratios provide more torque but less speed
            // Reduce field weakening to maintain motor integrity
            settings[7] = Math.max(Math.round(settings[7] * 0.9), this.safetyConstraints[7].min);
            // Boost acceleration for better low-speed performance
            settings[3] = Math.max(Math.round(settings[3] * 0.85), this.safetyConstraints[3].min);
        }
        
        // Adjust MPH overspeed based on combined effect
        const speedCapabilityFactor = tireSizeRatio * gearRatioFactor;
        if (speedCapabilityFactor < 0.9) {
            // Reduce overspeed protection if mechanically limited
            settings[20] = Math.max(Math.round(settings[20] * 0.8), this.safetyConstraints[20].min);
        }
    }
    
    /**
     * Optimize battery-related settings
     * @param {Object} settings - Current settings
     * @param {Object} inputData - User input data
     * @param {Object} analysis - Analysis data
     */
    optimizeBatterySettings(settings, inputData, analysis) {
        const { batteryVoltage, isLithium, batteryCapacity } = analysis;
        
        // Set battery voltage
        settings[15] = batteryVoltage;
        
        // Set Low Battery Volts cutoff based on battery type and voltage
        if (isLithium) {
            // Lithium batteries need higher cutoff to prevent damage
            const lithiumCutoffMap = {
                48: 42,  // 3.5V per cell for 13S
                60: 52,  // 3.5V per cell for 16S  
                72: 63,  // 3.5V per cell for 20S
                82: 72,  // 3.5V per cell for 23S
                96: 84   // 3.5V per cell for 26S
            };
            settings[16] = lithiumCutoffMap[batteryVoltage] || 63;
        } else {
            // Lead acid batteries - approximately 87.5% of nominal
            settings[16] = Math.round(batteryVoltage * 0.875);
        }
        
        // Adjust IR Compensation based on battery type and capacity
        if (isLithium) {
            settings[14] = 7; // Higher compensation for lithium
            
            // Enhance regenerative braking for lithium
            settings[9] = Math.min(Math.round(settings[9] * 1.1), this.safetyConstraints[9].max);
            settings[10] = Math.min(Math.round(settings[10] * 1.15), this.safetyConstraints[10].max);
        } else {
            // Adjust IR compensation based on battery capacity for lead-acid
            // Higher capacity batteries have lower internal resistance
            if (batteryCapacity > 150) {
                settings[14] = Math.max(settings[14] - 1, 2);
            } else if (batteryCapacity < 100) {
                settings[14] = Math.min(settings[14] + 1, 8);
            }
        }
        
        // Adjust plug braking current based on battery capacity
        // Larger batteries can handle more regen current
        const capacityFactor = batteryCapacity / 105; // Normalize to standard 105Ah
        settings[5] = Math.round(settings[5] * Math.min(capacityFactor, 1.2));
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
     * Optimize Creep Speed (F2) - Speed when pedal is barely pressed
     * @param {Object} settings - Current settings
     * @param {Object} inputData - User input data
     * @param {Object} analysis - Analysis data
     */
    optimizeCreepSpeed(settings, inputData, analysis) {
        const { terrainDifficulty, loadFactor, priorityWeights } = analysis;
        
        // Base creep speed on usage scenario
        if (terrainDifficulty > 0.7 || inputData.environment.terrain === 'steep') {
            // Higher creep speed for hill starting
            settings[2] = 5;
        } else if (priorityWeights.range > 0.7) {
            // Lower creep speed for efficiency
            settings[2] = 0;
        } else if (loadFactor > 1.5) {
            // Moderate creep for heavy loads
            settings[2] = 3;
        } else {
            // Standard creep for parking maneuvers
            settings[2] = 2;
        }
        
        // Ensure within constraints
        settings[2] = Math.max(this.safetyConstraints[2].min, 
                              Math.min(settings[2], this.safetyConstraints[2].max));
    }
    
    /**
     * Optimize Plug Current (F5) - Current during plug braking
     * @param {Object} settings - Current settings
     * @param {Object} inputData - User input data
     * @param {Object} analysis - Analysis data
     */
    optimizePlugCurrent(settings, inputData, analysis) {
        const { batteryCapacity, isLithium, terrainDifficulty } = analysis;
        
        // Base plug current on battery capacity and type
        const capacityFactor = batteryCapacity / 105; // Normalize to standard capacity
        
        if (isLithium) {
            // Lithium can handle higher plug currents
            settings[5] = Math.round(220 * capacityFactor);
        } else {
            // Lead acid needs gentler plug braking
            settings[5] = Math.round(180 * Math.min(capacityFactor, 1.1));
        }
        
        // Adjust for terrain - steeper terrain needs stronger plug braking
        if (terrainDifficulty > 0.6) {
            settings[5] = Math.round(settings[5] * 1.1);
        }
        
        // Ensure within constraints
        settings[5] = Math.max(this.safetyConstraints[5].min, 
                              Math.min(settings[5], this.safetyConstraints[5].max));
    }
    
    /**
     * Optimize Field Ramp Rate (F19) - How quickly field current changes
     * @param {Object} settings - Current settings
     * @param {Object} inputData - User input data
     * @param {Object} analysis - Analysis data
     */
    optimizeFieldRampRate(settings, inputData, analysis) {
        const { motorRisk, priorityWeights, temperatureFactor } = analysis;
        
        // Base ramp rate on motor condition and priorities
        if (motorRisk > 0.7) {
            // Slower ramp rate to protect damaged motor
            settings[19] = 18;
        } else if (priorityWeights.acceleration > 0.7) {
            // Faster ramp for snappy performance
            settings[19] = 8;
        } else if (priorityWeights.range > 0.7) {
            // Moderate ramp for efficiency
            settings[19] = 14;
        } else {
            // Balanced ramp rate
            settings[19] = 12;
        }
        
        // Adjust for temperature conditions
        if (temperatureFactor > 0.8) {
            // Slower ramp in extreme temperatures
            settings[19] = Math.round(settings[19] * 1.2);
        }
        
        // Ensure within constraints
        settings[19] = Math.max(this.safetyConstraints[19].min, 
                               Math.min(settings[19], this.safetyConstraints[19].max));
    }
    
    /**
     * Optimize Arm Current Ramp (F21) - Armature current rate of change
     * @param {Object} settings - Current settings
     * @param {Object} inputData - User input data
     * @param {Object} analysis - Analysis data
     */
    optimizeArmCurrentRamp(settings, inputData, analysis) {
        const { loadFactor, motorRisk, priorityWeights } = analysis;
        
        // Base arm current ramp on load and motor condition
        if (motorRisk > 0.5) {
            // Gentler ramp for motor protection
            settings[21] = 60;
        } else if (loadFactor > 1.6) {
            // Moderate ramp for heavy loads
            settings[21] = 50;
        } else if (priorityWeights.acceleration > 0.8) {
            // Aggressive ramp for performance
            settings[21] = 30;
        } else {
            // Balanced ramp rate
            settings[21] = 40;
        }
        
        // Ensure within constraints
        settings[21] = Math.max(this.safetyConstraints[21].min, 
                               Math.min(settings[21], this.safetyConstraints[21].max));
    }
    
    /**
     * Optimize Error Compensation (F23) - Error detection sensitivity
     * @param {Object} settings - Current settings
     * @param {Object} inputData - User input data
     * @param {Object} analysis - Analysis data
     */
    optimizeErrorCompensation(settings, inputData, analysis) {
        const { motorRisk, batteryVoltage, temperatureFactor } = analysis;
        
        // Base error compensation on system health
        if (motorRisk > 0.7 || temperatureFactor > 0.8) {
            // More sensitive error detection for at-risk systems
            settings[23] = 5;
        } else if (batteryVoltage >= 82) {
            // Higher voltage systems need different compensation
            settings[23] = 12;
        } else if (inputData.vehicle.model === 'e2' || inputData.vehicle.model === 'eS') {
            // Lighter vehicles can use standard compensation
            settings[23] = 10;
        } else {
            // Heavy duty vehicles need less sensitive detection
            settings[23] = 15;
        }
        
        // Ensure within constraints
        settings[23] = Math.max(this.safetyConstraints[23].min, 
                               Math.min(settings[23], this.safetyConstraints[23].max));
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
        
        // Report on new function optimizations
        if (optimized[2] !== factory[2]) {
            if (optimized[2] > 0) {
                changes.push(`Creep speed enabled for easier parking and hill starts`);
            } else {
                changes.push(`Creep speed disabled for maximum efficiency`);
            }
        }
        
        if (optimized[5] !== factory[5]) {
            const plugChange = Math.round(((optimized[5] - factory[5]) / factory[5]) * 100);
            if (Math.abs(plugChange) > 10) {
                changes.push(`Plug braking ${plugChange > 0 ? 'strengthened' : 'reduced'} by ${Math.abs(plugChange)}% for ${plugChange > 0 ? 'better control' : 'battery protection'}`);
            }
        }
        
        if (optimized[19] !== factory[19]) {
            const rampChange = factory[19] - optimized[19]; // Lower is faster
            if (rampChange > 2) {
                changes.push(`Field response quickened for snappier acceleration`);
            } else if (rampChange < -2) {
                changes.push(`Field response smoothed for motor protection`);
            }
        }
        
        if (optimized[21] !== factory[21]) {
            const armRampChange = factory[21] - optimized[21]; // Lower is faster
            if (armRampChange > 5) {
                changes.push(`Armature response improved for better acceleration feel`);
            } else if (armRampChange < -5) {
                changes.push(`Armature response gentled for smoother operation`);
            }
        }
        
        if (optimized[23] !== factory[23]) {
            const errorChange = optimized[23] - factory[23];
            if (Math.abs(errorChange) > 3) {
                changes.push(`Error detection ${errorChange < 0 ? 'sensitivity increased' : 'tolerance improved'} for ${errorChange < 0 ? 'enhanced protection' : 'reduced nuisance trips'}`);
            }
        }
        
        // Battery-specific changes
        if (analysis.isLithium && optimized[14] !== factory[14]) {
            changes.push(`Battery compensation optimized for lithium chemistry`);
        }
        
        if (optimized[16] !== factory[16]) {
            changes.push(`Low battery cutoff adjusted to protect ${analysis.isLithium ? 'lithium' : 'lead-acid'} battery pack`);
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
    
    /**
     * Get factory default settings
     * @returns {Object} Factory default controller settings
     */
    getFactoryDefaults() {
        return this.factoryDefaults;
    }
    
    /**
     * Get function descriptions
     * @returns {Object} Function number to description mapping
     */
    getFunctionDescriptions() {
        return this.functionDescriptions;
    }
    
    /**
     * Optimize settings with simplified API
     * @param {Object} settings - Current settings
     * @param {string} mode - Optimization mode
     * @param {Object} vehicleData - Vehicle specifications
     * @returns {Object} Optimized settings
     */
    optimizeByMode(settings, mode, vehicleData = {}) {
        // Map mode to priorities
        const priorityMap = {
            'performance': { speed: 10, acceleration: 8, hillClimbing: 6, range: 2, regen: 3 },
            'efficiency': { speed: 3, acceleration: 3, hillClimbing: 5, range: 10, regen: 8 },
            'balanced': { speed: 5, acceleration: 5, hillClimbing: 5, range: 5, regen: 5 },
            'commute': { speed: 4, acceleration: 3, hillClimbing: 4, range: 8, regen: 7 },
            'weekend': { speed: 6, acceleration: 5, hillClimbing: 7, range: 6, regen: 5 }
        };
        
        const priorities = priorityMap[mode] || priorityMap['balanced'];
        
        // Create input data structure
        const inputData = {
            vehicle: {
                model: vehicleData.model || 'e4',
                motorCondition: vehicleData.motorCondition || 'good'
            },
            battery: {
                type: vehicleData.batteryType?.includes('lithium') ? 'lithium' : 'lead',
                voltage: vehicleData.batteryVoltage || 72,
                capacity: vehicleData.batteryCapacity || 150,
                age: vehicleData.batteryAge || 'good'
            },
            wheel: {
                tireDiameter: vehicleData.tireDiameter || 22,
                gearRatio: vehicleData.gearRatio || 8.91
            },
            environment: {
                terrain: vehicleData.terrain || 'mixed',
                vehicleLoad: vehicleData.vehicleLoad || 'medium',
                temperatureRange: vehicleData.temperatureRange || 'mild',
                hillGrade: vehicleData.hillGrade || 10
            },
            priorities
        };
        
        // Run optimization using the main optimization method
        const result = this.optimizeSettings(inputData, settings);
        return result;
    }
    
    /**
     * Get default analysis data for error fallback
     */
    getDefaultAnalysisData() {
        return {
            vehicleCharacteristics: {
                type: 'e4',
                motor: 'ac',
                battery: 'lead',
                drivetrain: 'standard'
            },
            performanceWeights: {
                speed: 5,
                range: 5,
                acceleration: 5,
                efficiency: 5,
                hills: 5
            },
            environmentalFactors: {
                terrain: 'mixed',
                temperature: 'mild',
                load: 'medium'
            }
        };
    }
    
    /**
     * Apply emergency safety defaults
     */
    applyEmergencySafetyDefaults(settings) {
        // Apply extremely conservative settings for safety
        settings[1] = Math.min(settings[1] || 22, 20);    // Very conservative speed
        settings[4] = Math.min(settings[4] || 245, 200);  // Very conservative current
        settings[6] = Math.min(settings[6] || 60, 40);    // Gentle acceleration
        settings[24] = Math.min(settings[24] || 43, 35);  // Conservative field weakening
        
        console.warn('Emergency safety defaults applied due to constraint validation failure');
    }
    
    /**
     * Get default performance changes for error fallback
     */
    getDefaultPerformanceChanges() {
        return {
            speed: { value: 0, unit: 'mph', description: 'No change calculated' },
            range: { value: 0, unit: 'miles', description: 'No change calculated' },
            acceleration: { value: 0, unit: 'seconds', description: 'No change calculated' },
            efficiency: { value: 0, unit: '%', description: 'No change calculated' },
            hillClimbing: { value: 0, unit: '%', description: 'No change calculated' }
        };
    }
    
    /**
     * Get optimization warnings
     */
    getOptimizationWarnings(settings, inputData) {
        const warnings = [];
        
        // Check for potentially risky settings
        if (settings[1] > 25) {
            warnings.push('Speed setting may exceed legal limits for some areas');
        }
        
        if (settings[4] > 300) {
            warnings.push('High motor current - monitor temperature closely');
        }
        
        if (settings[24] > 50) {
            warnings.push('High field weakening - ensure adequate motor cooling');
        }
        
        // Check for motor condition concerns
        if (inputData.vehicle?.motorCondition === 'worn') {
            warnings.push('Motor condition is worn - consider more conservative settings');
        }
        
        return warnings;
    }
    
    /**
     * Get emergency fallback result
     */
    getEmergencyFallback(inputData, baselineSettings, error) {
        console.error('Using emergency fallback optimization due to error:', error);
        
        return {
            success: false,
            error: SharedUtils.formatUserError(error, 'Optimization'),
            factorySettings: this.factoryDefaults,
            baselineSettings: baselineSettings || this.factoryDefaults,
            isUsingImportedBaseline: baselineSettings !== null,
            optimizedSettings: baselineSettings || this.factoryDefaults,
            performanceChanges: this.getDefaultPerformanceChanges(),
            analysisData: this.getDefaultAnalysisData(),
            inputData: inputData || {},
            warnings: ['Emergency fallback used - settings may not be optimized'],
            emergencyFallback: true
        };
    }
}
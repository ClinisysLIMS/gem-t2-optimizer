/**
 * GEM T2 Controller Optimizer Validation
 * Input validation and safety checks
 */
class ValidationSystem {
    constructor() {
        this.warnings = [];
        this.errors = [];
    }
    
    /**
     * Validate user input configuration
     * @param {Object} inputData - User input data
     * @returns {Object} Validation results
     */
    validateConfiguration(inputData) {
        this.warnings = [];
        this.errors = [];
        
        // Required fields validation
        this.validateRequiredFields(inputData);
        
        // Specific validations
        if (inputData.vehicle) this.validateVehicleConfig(inputData.vehicle);
        if (inputData.battery) this.validateBatteryConfig(inputData.battery);
        if (inputData.wheel) this.validateWheelConfig(inputData.wheel);
        if (inputData.environment) this.validateEnvironmentConfig(inputData.environment);
        
        // Cross-field validations
        this.validateCrossFieldCompatibility(inputData);
        
        return {
            isValid: this.errors.length === 0,
            warnings: this.warnings,
            errors: this.errors
        };
    }
    
    /**
     * Validate required fields
     * @param {Object} inputData - User input data
     */
    validateRequiredFields(inputData) {
        // Only validate sections that are present in the input data
        // This allows for partial validation during step-by-step form completion
        
        // If vehicle section exists, validate its required fields
        if (inputData.vehicle !== undefined) {
            if (!inputData.vehicle.model) {
                this.errors.push({
                    field: 'vehicle.model',
                    message: 'Vehicle model is required'
                });
            }
            if (!inputData.vehicle.motorCondition) {
                this.errors.push({
                    field: 'vehicle.motorCondition',
                    message: 'Motor condition is required'
                });
            }
        }
        
        // If battery section exists, validate its required fields
        if (inputData.battery !== undefined) {
            if (!inputData.battery.voltage) {
                this.errors.push({
                    field: 'battery.voltage',
                    message: 'Battery voltage is required'
                });
            }
            if (!inputData.battery.type) {
                this.errors.push({
                    field: 'battery.type',
                    message: 'Battery type is required'
                });
            }
            if (!inputData.battery.capacity) {
                this.errors.push({
                    field: 'battery.capacity',
                    message: 'Battery capacity is required'
                });
            }
        }
        
        // If wheel section exists, validate its required fields
        if (inputData.wheel !== undefined) {
            if (!inputData.wheel.tireDiameter) {
                this.errors.push({
                    field: 'wheel.tireDiameter',
                    message: 'Tire diameter is required'
                });
            }
            if (!inputData.wheel.gearRatio) {
                this.errors.push({
                    field: 'wheel.gearRatio',
                    message: 'Gear ratio is required'
                });
            }
        }
        
        // For complete validation (e.g., final submission), check all sections are present
        // This is only enforced if all sections are expected (inputData has all keys)
        const allSections = ['vehicle', 'battery', 'wheel', 'environment', 'priorities'];
        const providedSections = Object.keys(inputData);
        
        // If all sections are provided, ensure none are empty
        if (providedSections.length === allSections.length) {
            allSections.forEach(section => {
                if (!inputData[section] || Object.keys(inputData[section]).length === 0) {
                    this.errors.push({
                        field: section,
                        message: `${section.charAt(0).toUpperCase() + section.slice(1)} configuration is required`
                    });
                }
            });
        }
    }
    
    /**
     * Validate vehicle configuration
     * @param {Object} vehicleConfig - Vehicle configuration
     */
    validateVehicleConfig(vehicleConfig) {
        const validModels = ['e2', 'e4', 'eS', 'eL', 'e6', 'elXD'];
        
        if (vehicleConfig.model && !validModels.includes(vehicleConfig.model)) {
            this.errors.push({
                field: 'vehicle.model',
                message: 'Invalid vehicle model'
            });
        }
        
        if (vehicleConfig.topSpeed && (vehicleConfig.topSpeed < 15 || vehicleConfig.topSpeed > 40)) {
            this.warnings.push({
                field: 'vehicle.topSpeed',
                message: 'Top speed seems unusual (expected 15-40 MPH)'
            });
        }
    }
    
    /**
     * Validate battery configuration
     * @param {Object} batteryConfig - Battery configuration
     */
    validateBatteryConfig(batteryConfig) {
        // Validate battery voltage
        if (batteryConfig.voltage) {
            const voltage = parseInt(batteryConfig.voltage);
            
            if (isNaN(voltage)) {
                this.errors.push({
                    field: 'battery.voltage',
                    message: 'Battery voltage must be a number'
                });
            } else if (voltage < 36 || voltage > 120) {
                this.warnings.push({
                    field: 'battery.voltage',
                    message: 'Battery voltage seems unusual (expected 36-120V)'
                });
            }
        }
        
        // Validate battery capacity
        if (batteryConfig.capacity) {
            const capacity = parseInt(batteryConfig.capacity);
            
            if (isNaN(capacity)) {
                this.errors.push({
                    field: 'battery.capacity',
                    message: 'Battery capacity must be a number'
                });
            } else if (capacity < 50 || capacity > 500) {
                this.warnings.push({
                    field: 'battery.capacity',
                    message: 'Battery capacity seems unusual (expected 50-500 Ah)'
                });
            }
        }
        
        // Validate battery type
        if (batteryConfig.type && !['lead', 'agm', 'lithium'].includes(batteryConfig.type)) {
            this.errors.push({
                field: 'battery.type',
                message: 'Battery type must be Lead Acid, AGM, or Lithium'
            });
        }
        
        // Validate lithium compatibility
        if (batteryConfig.type === 'lithium' && batteryConfig.voltage < 80) {
            this.warnings.push({
                field: 'battery.voltage',
                message: 'Lithium batteries typically have higher voltage (80-100V)'
            });
        }
        
        // Validate AGM compatibility
        if (batteryConfig.type === 'agm' && batteryConfig.voltage > 96) {
            this.warnings.push({
                field: 'battery.voltage',
                message: 'AGM batteries typically use standard voltage systems (48-96V)'
            });
        }
    }
    
    /**
     * Validate wheel configuration
     * @param {Object} wheelConfig - Wheel configuration
     */
    validateWheelConfig(wheelConfig) {
        // Validate tire diameter
        if (wheelConfig.tireDiameter) {
            const diameter = parseFloat(wheelConfig.tireDiameter);
            
            if (isNaN(diameter)) {
                this.errors.push({
                    field: 'wheel.tireDiameter',
                    message: 'Tire diameter must be a number'
                });
            } else if (diameter < 18 || diameter > 28) {
                this.warnings.push({
                    field: 'wheel.tireDiameter',
                    message: 'Tire diameter seems unusual (expected 18-28 inches)'
                });
            }
        }
        
        // Validate gear ratio if provided
        if (wheelConfig.gearRatio) {
            const ratio = parseFloat(wheelConfig.gearRatio);
            
            if (isNaN(ratio)) {
                this.errors.push({
                    field: 'wheel.gearRatio',
                    message: 'Gear ratio must be a number'
                });
            } else if (ratio < 4 || ratio > 20) {
                this.warnings.push({
                    field: 'wheel.gearRatio',
                    message: 'Gear ratio seems unusual (expected 4-20)'
                });
            }
        }
    }
    
    /**
     * Validate environment configuration
     * @param {Object} envConfig - Environment configuration
     */
    validateEnvironmentConfig(envConfig) {
        // Validate hill grade if provided
        if (envConfig.hillGrade) {
            const grade = parseInt(envConfig.hillGrade);
            
            if (isNaN(grade)) {
                this.errors.push({
                    field: 'environment.hillGrade',
                    message: 'Hill grade must be a number'
                });
            } else if (grade < 0 || grade > 30) {
                this.warnings.push({
                    field: 'environment.hillGrade',
                    message: 'Hill grade seems unusual (expected 0-30%)'
                });
            }
        }
    }
    
    /**
     * Validate cross-field compatibility
     * @param {Object} inputData - User input data
     */
    validateCrossFieldCompatibility(inputData) {
        // Battery-motor compatibility
        if (inputData.battery && inputData.battery.type === 'lithium' && 
            inputData.vehicle && inputData.vehicle.motorCondition === 'sparking') {
            this.warnings.push({
                level: 'high',
                message: 'Lithium battery with sparking motor requires careful current limiting',
                suggestion: 'Consider motor service before lithium upgrade'
            });
        }
        
        // Tire size limits
        if (inputData.wheel && inputData.wheel.tireDiameter) {
            const tireDiameter = parseFloat(inputData.wheel.tireDiameter);
            if (tireDiameter > 24) {
                this.warnings.push({
                    level: 'medium',
                    message: 'Large tire diameter may reduce acceleration and hill climbing',
                    suggestion: 'Consider gear ratio modification for tires over 24"'
                });
            }
        }
        
        // Terrain-battery compatibility
        if (inputData.environment && inputData.environment.terrain === 'steep' && 
            inputData.battery && inputData.battery.age === 'old') {
            this.warnings.push({
                level: 'high',
                message: 'Old batteries may struggle with steep terrain',
                suggestion: 'Battery replacement recommended for optimal hill performance'
            });
        }
    }
}
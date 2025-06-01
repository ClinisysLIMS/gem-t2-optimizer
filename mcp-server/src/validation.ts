/**
 * GEM T2 Controller Optimizer Validation System - TypeScript version
 */

interface ValidationError {
  field: string;
  message: string;
}

interface ValidationWarning {
  level?: string;
  field?: string;
  message: string;
  suggestion?: string;
}

interface ValidationResult {
  isValid: boolean;
  warnings: ValidationWarning[];
  errors: ValidationError[];
}

export class ValidationSystem {
  private warnings: ValidationWarning[] = [];
  private errors: ValidationError[] = [];

  validateConfiguration(inputData: any): ValidationResult {
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

  private validateRequiredFields(inputData: any): void {
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
    }
    
    // If battery section exists, validate its required fields
    if (inputData.battery !== undefined) {
      if (!inputData.battery.voltage) {
        this.errors.push({
          field: 'battery.voltage',
          message: 'Battery voltage is required'
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

  private validateVehicleConfig(vehicleConfig: any): void {
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

  private validateBatteryConfig(batteryConfig: any): void {
    // Validate battery voltage
    if (batteryConfig.voltage) {
      const voltage = parseInt(batteryConfig.voltage);
      
      if (isNaN(voltage)) {
        this.errors.push({
          field: 'battery.voltage',
          message: 'Battery voltage must be a number'
        });
      } else if (voltage < 48 || voltage > 100) {
        this.warnings.push({
          field: 'battery.voltage',
          message: 'Battery voltage seems unusual (expected 48-100V)'
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
      } else if (capacity < 50 || capacity > 300) {
        this.warnings.push({
          field: 'battery.capacity',
          message: 'Battery capacity seems unusual (expected 50-300 Ah)'
        });
      }
    }
    
    // Validate lithium compatibility
    if (batteryConfig.type === 'lithium' && batteryConfig.voltage < 80) {
      this.warnings.push({
        field: 'battery.voltage',
        message: 'Lithium batteries typically have higher voltage (80-100V)'
      });
    }
  }

  private validateWheelConfig(wheelConfig: any): void {
    // Validate tire diameter
    if (wheelConfig.tireDiameter) {
      const diameter = parseFloat(wheelConfig.tireDiameter);
      
      if (isNaN(diameter)) {
        this.errors.push({
          field: 'wheel.tireDiameter',
          message: 'Tire diameter must be a number'
        });
      } else if (diameter < 20 || diameter > 26) {
        this.warnings.push({
          field: 'wheel.tireDiameter',
          message: 'Tire diameter seems unusual (expected 20-26 inches)'
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
      } else if (ratio < 5 || ratio > 15) {
        this.warnings.push({
          field: 'wheel.gearRatio',
          message: 'Gear ratio seems unusual (expected 5-15)'
        });
      }
    }
  }

  private validateEnvironmentConfig(envConfig: any): void {
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

  private validateCrossFieldCompatibility(inputData: any): void {
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
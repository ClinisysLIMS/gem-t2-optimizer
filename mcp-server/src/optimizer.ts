/**
 * GEM T2 Controller Optimizer Engine - TypeScript version
 */

interface VehicleParameters {
  weight: number;
  passengers: number;
  gearRatio: number;
}

interface SafetyConstraint {
  min: number;
  max: number;
}

interface InputData {
  vehicle: {
    model: string;
    topSpeed: number;
    motorCondition: string;
  };
  battery: {
    type: string;
    voltage: number;
    capacity: number;
    age: string;
  };
  wheel: {
    tireDiameter: number;
    gearRatio: number;
  };
  environment: {
    terrain: string;
    vehicleLoad: string;
    temperatureRange: string;
    hillGrade: number;
  };
  priorities: {
    range: number;
    speed: number;
    acceleration: number;
    hillClimbing: number;
    regen: number;
  };
}

export class GEMControllerOptimizer {
  public factoryDefaults: Record<number, number> = {
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

  public functionDescriptions: Record<number, string> = {
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

  private vehicleParameters: Record<string, VehicleParameters> = {
    'e2': { weight: 1200, passengers: 2, gearRatio: 8.91 },
    'e4': { weight: 1350, passengers: 4, gearRatio: 8.91 },
    'eS': { weight: 1250, passengers: 2, gearRatio: 8.91 },
    'eL': { weight: 1400, passengers: 2, gearRatio: 8.91 },
    'e6': { weight: 1500, passengers: 6, gearRatio: 8.91 },
    'elXD': { weight: 1600, passengers: 2, gearRatio: 8.91 }
  };

  private safetyConstraints: Record<number, SafetyConstraint> = {
    1: { min: 15, max: 35 },
    3: { min: 8, max: 40 },
    4: { min: 180, max: 255 },
    5: { min: 180, max: 255 },
    6: { min: 30, max: 100 },
    7: { min: 51, max: 120 },
    8: { min: 200, max: 255 },
    9: { min: 150, max: 255 },
    10: { min: 51, max: 255 },
    11: { min: 100, max: 170 },
    12: { min: 120, max: 170 },
    14: { min: 2, max: 15 },
    15: { min: 60, max: 90 },
    19: { min: 5, max: 25 },
    20: { min: 25, max: 50 },
    22: { min: 80, max: 180 },
    23: { min: 3, max: 15 },
    24: { min: 25, max: 85 },
    26: { min: 1, max: 8 }
  };

  optimizeSettings(inputData: InputData) {
    const optimizedSettings = { ...this.factoryDefaults };
    const analysisData = this.analyzeConfiguration(inputData);
    
    this.optimizeTireSettings(optimizedSettings, inputData, analysisData);
    this.optimizeBatterySettings(optimizedSettings, inputData, analysisData);
    this.optimizeMotorProtection(optimizedSettings, inputData, analysisData);
    this.optimizeTerrainSettings(optimizedSettings, inputData, analysisData);
    this.optimizePerformanceSettings(optimizedSettings, inputData, analysisData);
    
    this.applySafetyConstraints(optimizedSettings);
    
    const performanceChanges = this.calculatePerformanceChanges(
      optimizedSettings, 
      this.factoryDefaults,
      inputData, 
      analysisData
    );
    
    return {
      factorySettings: this.factoryDefaults,
      optimizedSettings,
      performanceChanges,
      analysisData,
      inputData
    };
  }

  private analyzeConfiguration(inputData: InputData) {
    const vehicleParams = this.vehicleParameters[inputData.vehicle.model] || 
                          this.vehicleParameters['e4'];
    
    return {
      vehicleWeight: vehicleParams.weight,
      gearRatio: inputData.wheel.gearRatio || vehicleParams.gearRatio,
      tireSizeRatio: inputData.wheel.tireDiameter / 22 || 1,
      batteryVoltage: inputData.battery.voltage || 72,
      isLithium: inputData.battery.type === 'lithium',
      motorRisk: this.assessMotorRisk(inputData.vehicle.motorCondition),
      terrainDifficulty: this.assessTerrainDifficulty(inputData.environment.terrain),
      loadFactor: this.calculateLoadFactor(inputData.environment.vehicleLoad, vehicleParams),
      temperatureFactor: this.calculateTemperatureFactor(inputData.environment.temperatureRange),
      priorityWeights: this.calculatePriorityWeights(inputData.priorities)
    };
  }

  private assessMotorRisk(motorCondition: string): number {
    switch (motorCondition) {
      case 'sparking': return 1;
      case 'fair': return 0.5;
      case 'good':
      default: return 0;
    }
  }

  private assessTerrainDifficulty(terrain: string): number {
    switch (terrain) {
      case 'steep': return 1;
      case 'moderate': return 0.6;
      case 'mixed': return 0.4;
      case 'flat':
      default: return 0.1;
    }
  }

  private calculateLoadFactor(vehicleLoad: string, vehicleParams: VehicleParameters): number {
    switch (vehicleLoad) {
      case 'max': return 2;
      case 'heavy': return 1.75;
      case 'medium': return 1.4;
      case 'light':
      default: return 1;
    }
  }

  private calculateTemperatureFactor(temperatureRange: string): number {
    switch (temperatureRange) {
      case 'extreme': return 1;
      case 'hot': return 0.8;
      case 'cold': return 0.7;
      case 'mild':
      default: return 0.3;
    }
  }

  private calculatePriorityWeights(priorities: any) {
    if (!priorities) {
      return {
        range: 0.5,
        speed: 0.5,
        acceleration: 0.5,
        hillClimbing: 0.5,
        regen: 0.5
      };
    }
    
    return {
      range: priorities.range / 10 || 0.5,
      speed: priorities.speed / 10 || 0.5,
      acceleration: priorities.acceleration / 10 || 0.5,
      hillClimbing: priorities.hillClimbing / 10 || 0.5,
      regen: priorities.regen / 10 || 0.5
    };
  }

  private optimizeTireSettings(settings: Record<number, number>, inputData: InputData, analysis: any) {
    const { tireSizeRatio } = analysis;
    
    settings[1] = Math.round(this.factoryDefaults[1] * tireSizeRatio);
    settings[22] = Math.round(this.factoryDefaults[22] * tireSizeRatio);
    
    if (tireSizeRatio > 1.1) {
      settings[7] = Math.min(Math.round(settings[7] * 1.2), this.safetyConstraints[7].max);
    }
  }

  private optimizeBatterySettings(settings: Record<number, number>, inputData: InputData, analysis: any) {
    const { batteryVoltage, isLithium } = analysis;
    
    settings[15] = batteryVoltage;
    
    if (isLithium) {
      settings[14] = 7;
      settings[9] = Math.min(Math.round(settings[9] * 1.1), this.safetyConstraints[9].max);
      settings[10] = Math.min(Math.round(settings[10] * 1.15), this.safetyConstraints[10].max);
    }
  }

  private optimizeMotorProtection(settings: Record<number, number>, inputData: InputData, analysis: any) {
    const { motorRisk } = analysis;
    
    if (motorRisk > 0) {
      const riskFactor = 1 + (motorRisk * 0.5);
      
      settings[7] = Math.min(Math.round(settings[7] * riskFactor), this.safetyConstraints[7].max);
      settings[24] = Math.min(Math.round(settings[24] * riskFactor), this.safetyConstraints[24].max);
      settings[20] = Math.max(Math.round(settings[20] / riskFactor), this.safetyConstraints[20].min);
      settings[23] = Math.max(Math.round(settings[23] / 2), this.safetyConstraints[23].min);
    }
  }

  private optimizeTerrainSettings(settings: Record<number, number>, inputData: InputData, analysis: any) {
    const { terrainDifficulty, loadFactor } = analysis;
    
    if (terrainDifficulty > 0.5 || loadFactor > 1.4) {
      settings[3] = Math.max(Math.round(settings[3] * (1 - terrainDifficulty * 0.2)), 
                            this.safetyConstraints[3].min);
      settings[4] = this.factoryDefaults[4];
      settings[9] = Math.min(Math.round(settings[9] * (1 + terrainDifficulty * 0.1)), 
                            this.safetyConstraints[9].max);
      settings[26] = Math.min(settings[26] + Math.round(terrainDifficulty), 
                             this.safetyConstraints[26].max);
    }
  }

  private optimizePerformanceSettings(settings: Record<number, number>, inputData: InputData, analysis: any) {
    const { priorityWeights } = analysis;
    
    if (priorityWeights.speed > 0.7) {
      settings[7] = Math.round(settings[7] * 0.9);
      settings[11] = Math.min(Math.round(settings[11] * 1.1), this.safetyConstraints[11].max);
    }
    
    if (priorityWeights.acceleration > 0.7) {
      settings[3] = Math.max(Math.round(settings[3] * 0.8), this.safetyConstraints[3].min);
      settings[6] = Math.max(Math.round(settings[6] * 0.85), this.safetyConstraints[6].min);
    }
    
    if (priorityWeights.range > 0.7) {
      settings[3] = Math.min(Math.round(settings[3] * 1.2), this.safetyConstraints[3].max);
      settings[4] = Math.round(settings[4] * 0.95);
    }
    
    if (priorityWeights.regen > 0.7) {
      settings[9] = Math.min(Math.round(settings[9] * 1.15), this.safetyConstraints[9].max);
      settings[10] = Math.min(Math.round(settings[10] * 1.2), this.safetyConstraints[10].max);
      settings[19] = Math.max(Math.round(settings[19] * 0.7), this.safetyConstraints[19].min);
    }
  }

  public applySafetyConstraints(settings: Record<number, number>) {
    Object.keys(settings).forEach(key => {
      const functionNum = parseInt(key);
      const constraints = this.safetyConstraints[functionNum];
      if (constraints) {
        settings[functionNum] = Math.max(
          constraints.min,
          Math.min(settings[functionNum], constraints.max)
        );
      }
    });
  }

  private calculatePerformanceChanges(optimized: any, factory: any, inputData: InputData, analysis: any) {
    const changes = [];
    
    const speedChange = this.calculateSpeedChange(optimized, factory, analysis);
    if (speedChange > 5) {
      changes.push(`Top speed increased by approximately ${speedChange}%`);
    } else if (speedChange < -5) {
      changes.push(`Top speed reduced by approximately ${Math.abs(speedChange)}% for motor protection`);
    }
    
    const accelChange = this.calculateAccelerationChange(optimized, factory);
    if (accelChange > 10) {
      changes.push(`Acceleration improved by approximately ${accelChange}%`);
    } else if (accelChange < -10) {
      changes.push(`Acceleration smoothed by approximately ${Math.abs(accelChange)}% for better control`);
    }
    
    const hillChange = this.calculateHillClimbingChange(optimized, factory);
    if (hillChange > 5) {
      changes.push(`Hill climbing ability improved by approximately ${hillChange}%`);
    }
    
    const rangeChange = this.calculateRangeChange(optimized, factory, analysis);
    if (rangeChange > 5) {
      changes.push(`Range improved by approximately ${rangeChange}%`);
    } else if (rangeChange < -5) {
      changes.push(`Range slightly reduced in favor of performance`);
    }
    
    const motorProtection = this.calculateMotorProtectionChange(optimized, factory);
    if (motorProtection > 20) {
      changes.push(`Motor protection significantly improved, reducing risk of brush wear and sparking`);
    } else if (motorProtection > 5) {
      changes.push(`Motor protection improved, may extend motor life`);
    }
    
    const regenChange = this.calculateRegenChange(optimized, factory);
    if (regenChange > 10) {
      changes.push(`Regenerative braking strength increased by approximately ${regenChange}%`);
    }
    
    return changes;
  }

  private calculateSpeedChange(optimized: any, factory: any, analysis: any): number {
    const fieldWeakeningEffect = (factory[7] / optimized[7]) - 1;
    const tireSizeEffect = analysis.tireSizeRatio - 1;
    return Math.round((fieldWeakeningEffect + tireSizeEffect) * 100);
  }

  private calculateAccelerationChange(optimized: any, factory: any): number {
    const accelRatio = factory[3] / optimized[3];
    return Math.round((accelRatio - 1) * 100);
  }

  private calculateHillClimbingChange(optimized: any, factory: any): number {
    const currentEffect = (optimized[4] / factory[4]) - 1;
    const fieldRatioEffect = (optimized[26] / factory[26]) - 1;
    return Math.round((currentEffect + fieldRatioEffect * 0.5) * 100);
  }

  private calculateRangeChange(optimized: any, factory: any, analysis: any): number {
    const accelEffect = (factory[3] / optimized[3]) - 1;
    const currentEffect = (factory[4] / optimized[4]) - 1;
    const batteryFactor = analysis.isLithium ? 0.15 : 0;
    return Math.round((-accelEffect * 50 - currentEffect * 30 + batteryFactor) * 100);
  }

  private calculateMotorProtectionChange(optimized: any, factory: any): number {
    const minFieldEffect = (optimized[7] / factory[7]) - 1;
    const weakenStartEffect = (optimized[24] / factory[24]) - 1;
    return Math.round((minFieldEffect + weakenStartEffect) * 100);
  }

  private calculateRegenChange(optimized: any, factory: any): number {
    const armatureEffect = (optimized[9] / factory[9]) - 1;
    const fieldEffect = (optimized[10] / factory[10]) - 1;
    return Math.round((armatureEffect + fieldEffect) * 50);
  }
}
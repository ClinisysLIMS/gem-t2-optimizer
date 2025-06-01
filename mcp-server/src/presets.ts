/**
 * GEM T2 Controller Optimizer Presets - TypeScript version
 */
import { GEMControllerOptimizer } from './optimizer.js';

interface Preset {
  name: string;
  description: string;
  features: string[];
  settings: Record<number, number>;
  inputData?: any;
}

export class PresetsManager {
  private optimizer: GEMControllerOptimizer;
  private presets: Record<string, Preset>;

  constructor(optimizer: GEMControllerOptimizer) {
    this.optimizer = optimizer;
    
    this.presets = {
      'performance': {
        name: '🏁 Performance',
        description: 'Maximum speed and acceleration for sport driving',
        features: [
          'Top speed: +15-20%',
          'Acceleration: +25%',
          'Best for: Flat terrain'
        ],
        settings: {
          3: 16,   // Faster controlled acceleration
          6: 45,   // Faster armature acceleration
          7: 54,   // Lower minimum field current for higher speed
          11: 135, // Higher turf speed limit
          20: 45,  // Higher top speed limit
          24: 38   // Earlier field weakening
        },
        inputData: {
          priorities: {
            speed: 9,
            acceleration: 9,
            hillClimbing: 3,
            range: 3,
            regen: 5
          }
        }
      },
      'hill-climber': {
        name: '⛰️ Hill Climber',
        description: 'Optimized for steep terrain and heavy loads',
        features: [
          'Hill grade: +30%',
          'Torque: Maximum',
          'Best for: Hilly areas'
        ],
        settings: {
          3: 16,   // Faster controlled acceleration for hills
          4: 255,  // Maximum armature current
          6: 50,   // Smoother armature acceleration
          7: 70,   // Higher minimum field current for more torque
          8: 255,  // Maximum field current
          9: 245,  // Strong regen for downhills
          10: 240, // High regen field current
          19: 8,   // Faster regen engagement
          24: 70,  // Delayed field weakening
          26: 5    // Better field-to-armature ratio
        },
        inputData: {
          environment: {
            terrain: 'steep'
          },
          priorities: {
            hillClimbing: 10,
            acceleration: 7,
            speed: 4,
            range: 4,
            regen: 8
          }
        }
      },
      'range-extender': {
        name: '🔋 Range Extender',
        description: 'Maximum efficiency and battery life',
        features: [
          'Range: +15-20%',
          'Gentle acceleration',
          'Best for: Long routes'
        ],
        settings: {
          3: 25,   // Slower controlled acceleration
          4: 235,  // Reduced max armature current
          6: 70,   // Gentler armature acceleration
          7: 65,   // Higher minimum field current
          9: 240,  // Strong regen for energy recovery
          10: 210, // Higher regen field current
          19: 10,  // Smoother regen engagement
          24: 55   // Delayed field weakening
        },
        inputData: {
          priorities: {
            range: 10,
            regen: 8,
            speed: 3,
            acceleration: 2,
            hillClimbing: 5
          }
        }
      },
      'lithium-optimized': {
        name: '⚡ Lithium Optimized',
        description: 'Tuned for lithium battery upgrades',
        features: [
          'Voltage: 82V capable',
          'Enhanced regen',
          'Best for: Li upgrades'
        ],
        settings: {
          7: 75,   // Higher minimum field for 82V
          9: 245,  // Strong regen for lithium
          10: 225, // Higher regen field current
          14: 7,   // IR Compensation for lithium
          15: 82,  // Lithium battery voltage
          19: 8,   // Faster regen engagement
          24: 60   // Adjusted field weakening
        },
        inputData: {
          battery: {
            type: 'lithium',
            voltage: 82
          },
          priorities: {
            range: 7,
            regen: 8,
            speed: 7,
            acceleration: 6,
            hillClimbing: 6
          }
        }
      },
      'motor-protection': {
        name: '🛡️ Motor Protection',
        description: 'Conservative settings for aging motors',
        features: [
          'Reduced sparking',
          'Lower heat buildup',
          'Best for: Old motors'
        ],
        settings: {
          3: 24,   // Gentler acceleration
          4: 240,  // Reduced max armature current
          6: 65,   // Gentler armature acceleration
          7: 85,   // Much higher minimum field current
          20: 35,  // Lower top speed
          23: 5,   // Improved field current stability
          24: 75,  // Much delayed field weakening
          26: 4    // Better field-to-armature ratio
        },
        inputData: {
          vehicle: {
            motorCondition: 'sparking'
          },
          priorities: {
            range: 5,
            regen: 5,
            speed: 3,
            acceleration: 3,
            hillClimbing: 5
          }
        }
      },
      'balanced': {
        name: '⚖️ Balanced',
        description: 'Well-rounded for general use',
        features: [
          'Moderate improvements',
          'Safe & reliable',
          'Best for: Most users'
        ],
        settings: {
          3: 18,   // Slightly faster acceleration
          4: 245,  // Slightly reduced max current
          6: 55,   // Slightly smoother acceleration
          7: 65,   // Slightly higher minimum field
          9: 235,  // Slightly stronger regen
          10: 200, // Slightly higher regen field
          19: 10,  // Smoother regen engagement
          24: 55,  // Slightly delayed field weakening
          26: 4    // Slightly better field ratio
        },
        inputData: {
          priorities: {
            range: 5,
            regen: 5,
            speed: 5,
            acceleration: 5,
            hillClimbing: 5
          }
        }
      },
      'weekend-outing': {
        name: '📅 Weekend Outing',
        description: 'Optimized for group trips and jamborees',
        features: [
          'Weather-aware tuning',
          'Group load handling',
          'Best for: Events & trips'
        ],
        settings: {
          3: 19,   // Balanced acceleration
          4: 250,  // Good power for loaded vehicle
          6: 52,   // Smooth acceleration
          7: 68,   // Good field for varying conditions
          9: 238,  // Strong regen for descents
          10: 215, // Good regen field
          19: 9,   // Balanced regen engagement
          24: 52,  // Balanced field weakening
          26: 4    // Good field ratio
        },
        inputData: {
          priorities: {
            range: 7,
            regen: 7,
            speed: 5,
            acceleration: 5,
            hillClimbing: 7
          }
        }
      }
    };
  }

  getPreset(presetName: string): Preset | null {
    return this.presets[presetName] || null;
  }

  getPresetNames(): string[] {
    return Object.keys(this.presets);
  }

  getPresetSettings(presetName: string, inputData: any = {}): Record<number, number> | null {
    const preset = this.getPreset(presetName);
    if (!preset) return null;
    
    const settings = { ...this.optimizer.factoryDefaults };
    
    if (preset.settings) {
      Object.keys(preset.settings).forEach(key => {
        const functionNum = parseInt(key);
        settings[functionNum] = preset.settings[functionNum];
      });
    }
    
    this.optimizer.applySafetyConstraints(settings);
    
    return settings;
  }

  getMergedInputData(presetName: string, baseInputData: any): any {
    const preset = this.getPreset(presetName);
    if (!preset || !preset.inputData) return baseInputData;
    
    const mergedData = JSON.parse(JSON.stringify(baseInputData));
    
    const presetData = preset.inputData;
    Object.keys(presetData).forEach(category => {
      if (!mergedData[category]) mergedData[category] = {};
      
      Object.keys(presetData[category]).forEach(key => {
        mergedData[category][key] = presetData[category][key];
      });
    });
    
    return mergedData;
  }
}
// js/presets.js
/**
 * GEM T2 Controller Optimizer Presets
 * Predefined configurations for common optimization scenarios
 */
class PresetsManager {
    constructor(optimizer) {
        this.optimizer = optimizer;
        
        // Define preset configurations
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
            'max-performance': {
                name: '🚀 Max Performance',
                description: 'Absolute maximum speed and acceleration - use with caution',
                features: [
                    'Top speed: +25-30%',
                    'Acceleration: +35%',
                    'Best for: Experienced users only'
                ],
                settings: {
                    3: 12,   // Very fast controlled acceleration
                    6: 40,   // Very fast armature acceleration
                    7: 51,   // Minimum field current for maximum speed
                    11: 150, // Very high turf speed limit
                    20: 50,  // Maximum top speed limit
                    24: 30   // Very early field weakening
                },
                inputData: {
                    priorities: {
                        speed: 10,
                        acceleration: 10,
                        hillClimbing: 2,
                        range: 2,
                        regen: 4
                    }
                }
            },
            'daily-commute': {
                name: '🚗 Daily Commute',
                description: 'Balanced efficiency and reliability for daily use',
                features: [
                    'Range: +10-15%',
                    'Smooth operation',
                    'Best for: Regular commuting'
                ],
                settings: {
                    3: 20,   // Moderate controlled acceleration
                    4: 240,  // Slightly reduced max current for efficiency
                    6: 60,   // Smooth armature acceleration
                    7: 68,   // Higher minimum field current for stability
                    9: 230,  // Good regen for stop-and-go traffic
                    10: 205, // Higher regen field current
                    19: 10,  // Smooth regen engagement
                    24: 55,  // Balanced field weakening
                    26: 4    // Good field ratio
                },
                inputData: {
                    priorities: {
                        range: 8,
                        regen: 7,
                        speed: 5,
                        acceleration: 4,
                        hillClimbing: 5
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
                description: 'Interactive trip planner for group outings and jamborees',
                features: [
                    '🗺️ Trip planning wizard',
                    '🌤️ Weather integration',
                    '⛰️ Terrain analysis',
                    '👥 Group optimization'
                ],
                isInteractive: true,
                requiresTripPlanning: true,
                category: 'trip-planner',
                settings: {
                    3: 20,   // Balanced acceleration for mixed driving
                    4: 240,  // Moderate max current for efficiency
                    6: 60,   // Smooth acceleration for comfort
                    7: 68,   // Higher field current for range
                    9: 240,  // Strong regen for downhills
                    10: 215, // Higher regen field current
                    19: 9,   // Smooth regen engagement
                    24: 58,  // Balanced field weakening
                    26: 4    // Good field ratio
                },
                inputData: {
                    priorities: {
                        range: 8,
                        regen: 7,
                        speed: 6,
                        acceleration: 5,
                        hillClimbing: 6
                    }
                }
            }
        };
    }
    
    /**
     * Get a preset configuration
     * @param {string} presetName - Name of the preset
     * @returns {Object} Preset configuration or null if not found
     */
    getPreset(presetName) {
        return this.presets[presetName] || null;
    }
    
    /**
     * Get all preset names
     * @returns {Array} Array of preset names
     */
    getPresetNames() {
        return Object.keys(this.presets);
    }
    
    /**
     * Get optimized settings for a preset
     * @param {string} presetName - Name of the preset
     * @param {Object} inputData - Base input data to merge with preset
     * @returns {Object} Optimized settings
     */
    getPresetSettings(presetName, inputData = {}) {
        const preset = this.getPreset(presetName);
        if (!preset) return null;
        
        // Create a deep copy of factory defaults
        const settings = { ...this.optimizer.factoryDefaults };
        
        // Apply preset settings
        if (preset.settings) {
            Object.keys(preset.settings).forEach(functionNum => {
                settings[functionNum] = preset.settings[functionNum];
            });
        }
        
        // Apply safety constraints
        this.optimizer.applySafetyConstraints(settings);
        
        return settings;
    }
    
    /**
     * Get HTML for preset cards
     * @returns {string} HTML string for preset cards
     */
    getPresetCardsHTML() {
        return Object.keys(this.presets).map(key => {
            const preset = this.presets[key];
            const isInteractive = preset.isInteractive || false;
            const cardClass = isInteractive ? 'preset-card interactive-preset bg-blue-50 border-2 border-blue-200 rounded-lg p-4' : 'preset-card bg-gray-50 rounded-lg p-4';
            const buttonText = isInteractive ? 'Launch Trip Planner' : 'Apply Preset';
            const buttonClass = isInteractive ? 'mt-3 px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors' : 'mt-3 px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors';
            
            return `
                <div class="${cardClass}" data-preset="${key}" data-interactive="${isInteractive}">
                    <h3 class="font-bold text-lg mb-2">${preset.name}</h3>
                    <p class="text-sm text-gray-600 mb-2">${preset.description}</p>
                    ${isInteractive ? '<div class="text-xs text-blue-600 font-medium mb-2">🚀 Interactive Experience</div>' : ''}
                    <ul class="text-xs text-gray-500 mt-2">
                        ${preset.features.map(feature => `<li>• ${feature}</li>`).join('')}
                    </ul>
                    <button class="${buttonClass}" onclick="handlePresetSelection('${key}', ${isInteractive})">
                        ${buttonText}
                    </button>
                </div>
            `;
        }).join('');
    }
    
    /**
     * Get merged input data for a preset
     * @param {string} presetName - Name of the preset
     * @param {Object} baseInputData - Base input data
     * @returns {Object} Merged input data
     */
    getMergedInputData(presetName, baseInputData) {
        const preset = this.getPreset(presetName);
        if (!preset || !preset.inputData) return baseInputData;
        
        // Create a deep copy of base input data
        const mergedData = JSON.parse(JSON.stringify(baseInputData));
        
        // Merge preset input data
        const presetData = preset.inputData;
        Object.keys(presetData).forEach(category => {
            if (!mergedData[category]) mergedData[category] = {};
            
            Object.keys(presetData[category]).forEach(key => {
                mergedData[category][key] = presetData[category][key];
            });
        });
        
        return mergedData;
    }
    
    /**
     * Check if a preset requires interactive trip planning
     * @param {string} presetName - Name of the preset
     * @returns {boolean} True if preset is interactive
     */
    isInteractivePreset(presetName) {
        const preset = this.getPreset(presetName);
        return preset && preset.isInteractive === true;
    }
    
    /**
     * Check if a preset requires trip planning
     * @param {string} presetName - Name of the preset
     * @returns {boolean} True if preset requires trip planning
     */
    requiresTripPlanning(presetName) {
        const preset = this.getPreset(presetName);
        return preset && preset.requiresTripPlanning === true;
    }
}
/**
 * Driving Modes Manager
 * Implements special driving modes with optimized controller settings
 */
class DrivingModesManager {
    constructor() {
        this.modes = {
            parade: {
                name: 'Parade Mode',
                icon: '🎪',
                description: 'Smooth, quiet operation perfect for parades and public events',
                color: '#8B5CF6',
                settings: {
                    maxSpeed: 8, // MPH
                    acceleration: 'gentle',
                    regeneration: 'minimal',
                    smoothness: 'maximum'
                },
                controllerAdjustments: {
                    1: 60,   // MPH Scaling - reduced for parade speed
                    3: 25,   // Acceleration Pot Gain - very gentle
                    4: 180,  // Max Armature Current - reduced for smoothness
                    6: 25,   // Acceleration Rate - very slow
                    7: 40,   // Deceleration Rate - gentle
                    8: 180,  // Max Field Current - standard
                    9: 150,  // Regen Current - minimal for smoothness
                    10: 80,  // Map Select - efficiency focused
                    11: 20,  // Turf Mode - extended for ultra-smooth
                    12: 5,   // Motor Temp Limit - conservative
                    20: 2    // MPH Overspeed - minimal safety buffer
                },
                accessorySettings: {
                    lights: 'enhanced', // More visibility for crowd safety
                    sound: 'moderate',  // Background music
                    climate: 'comfort'  // Comfortable for long slow rides
                },
                features: [
                    'Ultra-smooth acceleration',
                    'Maximum regenerative smoothness',
                    'Enhanced lighting for visibility',
                    'Optimized for 5-10 MPH operation',
                    'Minimal noise generation'
                ],
                useCase: 'Parades, public demonstrations, slow tours',
                tips: [
                    'Perfect for community events',
                    'Maintains consistent slow speed',
                    'Enhanced safety features active',
                    'Optimized battery efficiency at low speeds'
                ]
            },
            
            showOff: {
                name: 'Show Off Mode',
                icon: '⭐',
                description: 'Maximum performance and visual impact for demonstrations',
                color: '#EF4444',
                settings: {
                    maxSpeed: 'maximum',
                    acceleration: 'aggressive',
                    regeneration: 'performance',
                    smoothness: 'responsive'
                },
                controllerAdjustments: {
                    1: 130,  // MPH Scaling - maximum available
                    3: 35,   // Acceleration Pot Gain - responsive
                    4: 275,  // Max Armature Current - high performance
                    6: 95,   // Acceleration Rate - aggressive
                    7: 85,   // Deceleration Rate - strong
                    8: 275,  // Max Field Current - maximum
                    9: 260,  // Regen Current - strong for demonstrations
                    10: 120, // Map Select - performance
                    11: 8,   // Turf Mode - minimal delay
                    12: 8,   // Motor Temp Limit - allow higher temps
                    20: 8    // MPH Overspeed - higher limit
                },
                accessorySettings: {
                    lights: 'maximum',  // All lights blazing
                    sound: 'maximum',   // Full volume
                    climate: 'standard' // Normal operation
                },
                features: [
                    'Maximum acceleration and top speed',
                    'Aggressive throttle response',
                    'All accessories at maximum output',
                    'Enhanced visual and audio presence',
                    'Performance-focused regeneration'
                ],
                useCase: 'Car shows, demonstrations, performance testing',
                tips: [
                    'Monitor motor temperature closely',
                    'Use in short bursts to prevent overheating',
                    'Ensure adequate battery charge',
                    'Not recommended for daily use'
                ]
            },
            
            valet: {
                name: 'Valet Mode',
                icon: '🔐',
                description: 'Limited performance and features for secure valet parking',
                color: '#6B7280',
                settings: {
                    maxSpeed: 15, // MPH
                    acceleration: 'limited',
                    regeneration: 'gentle',
                    smoothness: 'controlled'
                },
                controllerAdjustments: {
                    1: 75,   // MPH Scaling - limited speed
                    3: 20,   // Acceleration Pot Gain - reduced response
                    4: 200,  // Max Armature Current - limited power
                    6: 35,   // Acceleration Rate - slow
                    7: 60,   // Deceleration Rate - controlled
                    8: 200,  // Max Field Current - limited
                    9: 180,  // Regen Current - gentle
                    10: 85,  // Map Select - efficiency
                    11: 15,  // Turf Mode - extended protection
                    12: 6,   // Motor Temp Limit - conservative
                    20: 3    // MPH Overspeed - minimal
                },
                accessorySettings: {
                    lights: 'minimal',   // Basic lighting only
                    sound: 'muted',      // Very quiet operation
                    climate: 'minimal'   // Limited climate control
                },
                features: [
                    'Speed limited to 15 MPH',
                    'Reduced acceleration capability',
                    'Minimal accessory operation',
                    'Enhanced protection settings',
                    'Gentle operation characteristics'
                ],
                useCase: 'Valet parking, untrusted operators, theft protection',
                tips: [
                    'PIN protection recommended',
                    'GPS tracking suggested',
                    'Limited range to prevent joy rides',
                    'Easy to override for owner'
                ],
                security: {
                    speedLimit: 15,
                    timeLimit: 30, // minutes
                    geofence: true,
                    logging: true
                }
            },
            
            beachCruiser: {
                name: 'Beach Cruiser',
                icon: '🏖️',
                description: 'Relaxed cruising optimized for beach and coastal environments',
                color: '#06B6D4',
                settings: {
                    maxSpeed: 20, // MPH
                    acceleration: 'relaxed',
                    regeneration: 'comfort',
                    smoothness: 'cruise'
                },
                controllerAdjustments: {
                    1: 95,   // MPH Scaling - comfortable cruising speed
                    3: 28,   // Acceleration Pot Gain - relaxed response
                    4: 235,  // Max Armature Current - adequate power
                    6: 55,   // Acceleration Rate - smooth
                    7: 65,   // Deceleration Rate - comfortable
                    8: 235,  // Max Field Current - standard
                    9: 210,  // Regen Current - smooth braking
                    10: 95,  // Map Select - balanced
                    11: 12,  // Turf Mode - moderate protection
                    12: 7,   // Motor Temp Limit - warm weather ready
                    20: 5    // MPH Overspeed - safety margin
                },
                accessorySettings: {
                    lights: 'standard',  // Normal lighting
                    sound: 'enhanced',   // Beach tunes
                    climate: 'cooling'   // A/C priority for hot weather
                },
                features: [
                    'Optimized for relaxed cruising',
                    'Enhanced cooling for hot weather',
                    'Smooth acceleration and braking',
                    'Comfortable speed range',
                    'Salt air protection settings'
                ],
                useCase: 'Beach driving, coastal cruising, leisure rides',
                tips: [
                    'Rinse vehicle after beach use',
                    'Monitor tire pressure in sand',
                    'Extra attention to salt corrosion',
                    'Optimal for scenic routes'
                ],
                environmentalSettings: {
                    saltProtection: true,
                    temperatureMonitoring: 'enhanced',
                    humidityCompensation: true
                }
            },
            
            snowMode: {
                name: 'Snow Mode',
                icon: '❄️',
                description: 'Winter driving with traction control and cold weather optimization',
                color: '#F1F5F9',
                settings: {
                    maxSpeed: 18, // MPH - reduced for safety
                    acceleration: 'gentle',
                    regeneration: 'reduced',
                    smoothness: 'traction'
                },
                controllerAdjustments: {
                    1: 85,   // MPH Scaling - winter speed limit
                    3: 22,   // Acceleration Pot Gain - gentle for traction
                    4: 210,  // Max Armature Current - controlled power
                    6: 30,   // Acceleration Rate - very gentle
                    7: 45,   // Deceleration Rate - reduced regen
                    8: 210,  // Max Field Current - cold weather setting
                    9: 160,  // Regen Current - minimal for ice safety
                    10: 75,  // Map Select - traction focused
                    11: 25,  // Turf Mode - extended for slippery surfaces
                    12: 4,   // Motor Temp Limit - cold start protection
                    20: 3    // MPH Overspeed - safety priority
                },
                accessorySettings: {
                    lights: 'enhanced',  // Better visibility
                    sound: 'reduced',    // Quieter for safety awareness
                    climate: 'heating'   // Maximum heating
                },
                features: [
                    'Gentle acceleration for traction',
                    'Reduced regenerative braking',
                    'Cold weather motor protection',
                    'Enhanced lighting for visibility',
                    'Maximum heating performance'
                ],
                useCase: 'Snow, ice, cold weather driving',
                tips: [
                    'Warm up motor before driving',
                    'Carry emergency supplies',
                    'Check tire pressure frequently',
                    'Avoid sudden movements'
                ],
                coldWeatherSettings: {
                    preHeat: true,
                    batteryWarming: true,
                    tractionControl: 'maximum',
                    emergencyFeatures: true
                }
            },
            
            golfTournament: {
                name: 'Golf Tournament',
                icon: '⛳',
                description: 'Ultra-quiet operation for golf course and tournament use',
                color: '#22C55E',
                settings: {
                    maxSpeed: 15, // MPH - course speed limit
                    acceleration: 'whisper',
                    regeneration: 'silent',
                    smoothness: 'premium'
                },
                controllerAdjustments: {
                    1: 70,   // MPH Scaling - golf course speed
                    3: 18,   // Acceleration Pot Gain - very gentle
                    4: 185,  // Max Armature Current - quiet operation
                    6: 20,   // Acceleration Rate - whisper quiet
                    7: 35,   // Deceleration Rate - silent braking
                    8: 185,  // Max Field Current - efficient
                    9: 140,  // Regen Current - minimal noise
                    10: 70,  // Map Select - efficiency focused
                    11: 30,  // Turf Mode - maximum turf protection
                    12: 5,   // Motor Temp Limit - conservative
                    20: 2    // MPH Overspeed - course compliance
                },
                accessorySettings: {
                    lights: 'minimal',   // Dawn/dusk only
                    sound: 'silent',     // Absolute quiet
                    climate: 'efficient' // Minimal power draw
                },
                features: [
                    'Whisper-quiet operation',
                    'Maximum turf protection',
                    'Golf course speed compliance',
                    'Ultra-smooth acceleration',
                    'Minimal environmental impact'
                ],
                useCase: 'Golf courses, tournaments, quiet zones',
                tips: [
                    'Respect course rules and etiquette',
                    'Stay on designated paths',
                    'Avoid wet or soft areas',
                    'Yield to golfers always'
                ],
                golfSpecific: {
                    noiseLevel: 'minimal',
                    turfProtection: 'maximum',
                    pathCompliance: true,
                    etiquetteMode: true
                }
            },
            
            securityPatrol: {
                name: 'Security Patrol',
                icon: '🚨',
                description: 'Enhanced visibility and communication for security operations',
                color: '#F59E0B',
                settings: {
                    maxSpeed: 22, // MPH - patrol speed
                    acceleration: 'responsive',
                    regeneration: 'efficient',
                    smoothness: 'professional'
                },
                controllerAdjustments: {
                    1: 100,  // MPH Scaling - professional speed range
                    3: 30,   // Acceleration Pot Gain - responsive
                    4: 245,  // Max Armature Current - reliable power
                    6: 65,   // Acceleration Rate - professional response
                    7: 75,   // Deceleration Rate - controlled stops
                    8: 245,  // Max Field Current - reliable
                    9: 225,  // Regen Current - efficient
                    10: 100, // Map Select - balanced performance
                    11: 10,  // Turf Mode - normal operation
                    12: 7,   // Motor Temp Limit - extended duty
                    20: 5    // MPH Overspeed - professional margin
                },
                accessorySettings: {
                    lights: 'professional', // High visibility lighting
                    sound: 'communication', // Radio/communication priority
                    climate: 'comfort'      // Extended duty comfort
                },
                features: [
                    'Enhanced visibility lighting',
                    'Professional acceleration response',
                    'Reliable extended-duty operation',
                    'Communication system priority',
                    'Efficient power management'
                ],
                useCase: 'Security patrols, law enforcement, emergency response',
                tips: [
                    'Regular equipment checks',
                    'Maintain communication readiness',
                    'Monitor battery level closely',
                    'Practice emergency procedures'
                ],
                securityFeatures: {
                    emergencyMode: true,
                    communicationPriority: true,
                    extendedDuty: true,
                    quickResponse: true
                }
            }
        };
        
        this.currentMode = null;
        this.customModes = new Map();
        this.modeHistory = [];
        
        this.init();
    }
    
    /**
     * Initialize driving modes manager
     */
    init() {
        this.loadSavedModes();
        this.loadModeHistory();
    }
    
    /**
     * Activate a driving mode
     */
    activateMode(modeId, options = {}) {
        const mode = this.modes[modeId] || this.customModes.get(modeId);
        if (!mode) {
            throw new Error(`Unknown driving mode: ${modeId}`);
        }
        
        // Check security requirements
        if (mode.security && !this.validateSecurity(mode.security, options)) {
            throw new Error('Security validation failed for this mode');
        }
        
        // Store previous mode
        const previousMode = this.currentMode;
        
        // Activate new mode
        this.currentMode = {
            id: modeId,
            mode: mode,
            activatedAt: new Date(),
            options: options,
            previousMode: previousMode?.id
        };
        
        // Add to history
        this.modeHistory.unshift({
            mode: modeId,
            activatedAt: new Date(),
            duration: null,
            deactivatedAt: null
        });
        
        // Keep only last 50 entries
        this.modeHistory = this.modeHistory.slice(0, 50);
        
        // Save state
        this.saveModeState();
        
        return {
            success: true,
            mode: mode.name,
            settings: this.getCurrentModeSettings(),
            message: `${mode.name} activated successfully`
        };
    }
    
    /**
     * Deactivate current mode
     */
    deactivateMode() {
        if (!this.currentMode) {
            return { success: false, message: 'No active mode to deactivate' };
        }
        
        // Update history
        if (this.modeHistory.length > 0) {
            const lastEntry = this.modeHistory[0];
            lastEntry.deactivatedAt = new Date();
            lastEntry.duration = lastEntry.deactivatedAt - lastEntry.activatedAt;
        }
        
        const previousMode = this.currentMode.mode.name;
        this.currentMode = null;
        
        this.saveModeState();
        
        return {
            success: true,
            message: `${previousMode} deactivated`,
            settings: this.getDefaultSettings()
        };
    }
    
    /**
     * Get current mode settings
     */
    getCurrentModeSettings() {
        if (!this.currentMode) {
            return this.getDefaultSettings();
        }
        
        return {
            mode: this.currentMode.mode.name,
            controllerSettings: this.currentMode.mode.controllerAdjustments,
            accessorySettings: this.currentMode.mode.accessorySettings,
            features: this.currentMode.mode.features,
            activatedAt: this.currentMode.activatedAt
        };
    }
    
    /**
     * Get default controller settings
     */
    getDefaultSettings() {
        return {
            mode: 'Default',
            controllerSettings: {
                1: 100,  // Factory defaults
                3: 15,
                4: 245,
                6: 60,
                7: 70,
                8: 245,
                9: 225,
                10: 100,
                11: 11,
                12: 7,
                20: 5
            },
            accessorySettings: {
                lights: 'standard',
                sound: 'standard',
                climate: 'standard'
            },
            features: ['Standard operation'],
            activatedAt: null
        };
    }
    
    /**
     * Create custom mode
     */
    createCustomMode(name, baseMode, modifications) {
        const baseModeConfig = this.modes[baseMode];
        if (!baseModeConfig) {
            throw new Error(`Base mode ${baseMode} not found`);
        }
        
        const customMode = {
            ...baseModeConfig,
            name: name,
            description: `Custom mode based on ${baseModeConfig.name}`,
            isCustom: true,
            baseMode: baseMode,
            createdAt: new Date(),
            controllerAdjustments: {
                ...baseModeConfig.controllerAdjustments,
                ...modifications.controllerAdjustments
            },
            accessorySettings: {
                ...baseModeConfig.accessorySettings,
                ...modifications.accessorySettings
            }
        };
        
        const customId = `custom_${Date.now()}`;
        this.customModes.set(customId, customMode);
        
        this.saveCustomModes();
        
        return {
            success: true,
            id: customId,
            mode: customMode
        };
    }
    
    /**
     * Get mode recommendations
     */
    getModeRecommendations(context) {
        const recommendations = [];
        
        // Time-based recommendations
        const hour = new Date().getHours();
        if (hour >= 6 && hour <= 8) {
            recommendations.push({
                mode: 'golfTournament',
                reason: 'Quiet morning hours - perfect for golf course use',
                priority: 'medium'
            });
        }
        
        if (hour >= 17 && hour <= 20) {
            recommendations.push({
                mode: 'beachCruiser',
                reason: 'Evening cruise time - ideal for relaxed driving',
                priority: 'medium'
            });
        }
        
        // Weather-based recommendations
        if (context.weather) {
            if (context.weather.temperature < 40) {
                recommendations.push({
                    mode: 'snowMode',
                    reason: 'Cold weather detected - snow mode recommended',
                    priority: 'high'
                });
            }
            
            if (context.weather.temperature > 85) {
                recommendations.push({
                    mode: 'beachCruiser',
                    reason: 'Hot weather - enhanced cooling recommended',
                    priority: 'medium'
                });
            }
        }
        
        // Location-based recommendations
        if (context.location) {
            if (context.location.includes('golf')) {
                recommendations.push({
                    mode: 'golfTournament',
                    reason: 'Golf course location detected',
                    priority: 'high'
                });
            }
            
            if (context.location.includes('beach') || context.location.includes('coast')) {
                recommendations.push({
                    mode: 'beachCruiser',
                    reason: 'Beach/coastal location detected',
                    priority: 'high'
                });
            }
        }
        
        // Event-based recommendations
        if (context.event) {
            if (context.event.includes('parade')) {
                recommendations.push({
                    mode: 'parade',
                    reason: 'Parade event detected',
                    priority: 'high'
                });
            }
            
            if (context.event.includes('show')) {
                recommendations.push({
                    mode: 'showOff',
                    reason: 'Show event detected',
                    priority: 'high'
                });
            }
        }
        
        return recommendations;
    }
    
    /**
     * Get mode impact analysis
     */
    getModeImpactAnalysis(modeId, vehicleData) {
        const mode = this.modes[modeId] || this.customModes.get(modeId);
        if (!mode) return null;
        
        const baseSettings = this.getDefaultSettings().controllerSettings;
        const modeSettings = mode.controllerAdjustments;
        
        const analysis = {
            performance: this.analyzePerformanceImpact(baseSettings, modeSettings),
            efficiency: this.analyzeEfficiencyImpact(baseSettings, modeSettings, mode.accessorySettings),
            safety: this.analyzeSafetyImpact(mode),
            compatibility: this.analyzeCompatibility(mode, vehicleData)
        };
        
        return analysis;
    }
    
    /**
     * Analyze performance impact
     */
    analyzePerformanceImpact(baseSettings, modeSettings) {
        const speedChange = ((modeSettings[1] - baseSettings[1]) / baseSettings[1]) * 100;
        const accelChange = ((modeSettings[6] - baseSettings[6]) / baseSettings[6]) * 100;
        const powerChange = ((modeSettings[4] - baseSettings[4]) / baseSettings[4]) * 100;
        
        return {
            topSpeed: {
                change: speedChange,
                description: speedChange > 0 ? 'Increased top speed' : 'Reduced top speed'
            },
            acceleration: {
                change: accelChange,
                description: accelChange > 0 ? 'Faster acceleration' : 'Gentler acceleration'
            },
            power: {
                change: powerChange,
                description: powerChange > 0 ? 'Higher power output' : 'Reduced power output'
            }
        };
    }
    
    /**
     * Analyze efficiency impact
     */
    analyzeEfficiencyImpact(baseSettings, modeSettings, accessorySettings) {
        // Calculate motor efficiency changes
        const regenChange = ((modeSettings[9] - baseSettings[9]) / baseSettings[9]) * 100;
        
        // Estimate accessory power impact
        let accessoryImpact = 0;
        Object.entries(accessorySettings).forEach(([category, setting]) => {
            const multipliers = {
                minimal: 0.3, standard: 1.0, enhanced: 1.5,
                maximum: 2.0, professional: 1.8, communication: 1.2
            };
            accessoryImpact += (multipliers[setting] || 1.0) - 1.0;
        });
        
        const rangeImpact = (regenChange * 0.1) + (accessoryImpact * 10);
        
        return {
            regeneration: {
                change: regenChange,
                description: regenChange > 0 ? 'Enhanced energy recovery' : 'Reduced regeneration'
            },
            accessories: {
                impact: accessoryImpact,
                description: accessoryImpact > 0 ? 'Increased accessory usage' : 'Reduced accessory usage'
            },
            estimatedRange: {
                change: -rangeImpact,
                description: rangeImpact > 0 ? 'Reduced range' : 'Extended range'
            }
        };
    }
    
    /**
     * Analyze safety impact
     */
    analyzeSafetyImpact(mode) {
        const safetyFeatures = [];
        
        if (mode.settings.maxSpeed <= 15) {
            safetyFeatures.push('Low speed operation for enhanced safety');
        }
        
        if (mode.settings.acceleration === 'gentle' || mode.settings.acceleration === 'whisper') {
            safetyFeatures.push('Gentle acceleration reduces traction loss');
        }
        
        if (mode.accessorySettings?.lights === 'enhanced' || mode.accessorySettings?.lights === 'professional') {
            safetyFeatures.push('Enhanced lighting for better visibility');
        }
        
        if (mode.security) {
            safetyFeatures.push('Security features active');
        }
        
        return {
            level: safetyFeatures.length >= 3 ? 'high' : safetyFeatures.length >= 1 ? 'medium' : 'standard',
            features: safetyFeatures
        };
    }
    
    /**
     * Analyze mode compatibility
     */
    analyzeCompatibility(mode, vehicleData) {
        const issues = [];
        const warnings = [];
        
        // Check motor compatibility
        if (mode.controllerAdjustments[4] > 275 && vehicleData.motorType === 'dc-stock') {
            warnings.push('High current settings may stress stock DC motor');
        }
        
        // Check speed compatibility
        if (mode.controllerAdjustments[1] > 120 && vehicleData.currentSpeed < 25) {
            issues.push('Mode requires higher speed capability than vehicle supports');
        }
        
        // Check accessory compatibility
        if (mode.accessorySettings?.climate === 'heating' && !vehicleData.hasClimateControl) {
            warnings.push('Heating features require climate control accessory');
        }
        
        return {
            compatible: issues.length === 0,
            issues: issues,
            warnings: warnings
        };
    }
    
    /**
     * Validate security requirements
     */
    validateSecurity(securityConfig, options) {
        if (securityConfig.speedLimit && options.bypassSpeedLimit && !options.securityPin) {
            return false;
        }
        
        if (securityConfig.geofence && !options.geofenceApproval) {
            return false;
        }
        
        return true;
    }
    
    /**
     * Get mode usage statistics
     */
    getModeUsageStats() {
        const stats = {};
        
        this.modeHistory.forEach(entry => {
            if (!stats[entry.mode]) {
                stats[entry.mode] = {
                    count: 0,
                    totalDuration: 0,
                    lastUsed: null
                };
            }
            
            stats[entry.mode].count++;
            if (entry.duration) {
                stats[entry.mode].totalDuration += entry.duration;
            }
            if (!stats[entry.mode].lastUsed || entry.activatedAt > stats[entry.mode].lastUsed) {
                stats[entry.mode].lastUsed = entry.activatedAt;
            }
        });
        
        return stats;
    }
    
    /**
     * Save mode state
     */
    saveModeState() {
        const state = {
            currentMode: this.currentMode,
            modeHistory: this.modeHistory,
            lastUpdated: new Date().toISOString()
        };
        
        localStorage.setItem('gem-driving-modes-state', JSON.stringify(state));
    }
    
    /**
     * Load saved modes
     */
    loadSavedModes() {
        try {
            const saved = localStorage.getItem('gem-custom-modes');
            if (saved) {
                const customModes = JSON.parse(saved);
                Object.entries(customModes).forEach(([id, mode]) => {
                    this.customModes.set(id, mode);
                });
            }
        } catch (error) {
            console.error('Error loading custom modes:', error);
        }
    }
    
    /**
     * Save custom modes
     */
    saveCustomModes() {
        const customModes = {};
        this.customModes.forEach((mode, id) => {
            customModes[id] = mode;
        });
        
        localStorage.setItem('gem-custom-modes', JSON.stringify(customModes));
    }
    
    /**
     * Load mode history
     */
    loadModeHistory() {
        try {
            const saved = localStorage.getItem('gem-driving-modes-state');
            if (saved) {
                const state = JSON.parse(saved);
                this.modeHistory = state.modeHistory || [];
                this.currentMode = state.currentMode;
            }
        } catch (error) {
            console.error('Error loading mode history:', error);
        }
    }
    
    /**
     * Export modes configuration
     */
    exportConfiguration() {
        return {
            predefinedModes: this.modes,
            customModes: Array.from(this.customModes.entries()),
            currentMode: this.currentMode,
            usageStats: this.getModeUsageStats(),
            exportDate: new Date().toISOString()
        };
    }
    
    /**
     * Get all available modes
     */
    getAllModes() {
        const allModes = {};
        
        // Add predefined modes
        Object.entries(this.modes).forEach(([id, mode]) => {
            allModes[id] = { ...mode, isPredefined: true };
        });
        
        // Add custom modes
        this.customModes.forEach((mode, id) => {
            allModes[id] = { ...mode, isCustom: true };
        });
        
        return allModes;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DrivingModesManager;
}
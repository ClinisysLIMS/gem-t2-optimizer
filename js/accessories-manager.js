/**
 * Accessories Manager
 * Manages vehicle accessories and their impact on power calculations
 */
class AccessoriesManager {
    constructor() {
        this.accessories = {
            liftKit: {
                name: 'Lift Kit',
                category: 'suspension',
                powerDraw: 0,
                weightChange: 25, // lbs
                aerodynamicImpact: 15, // % increase in drag
                description: 'Raises vehicle height, affects aerodynamics and handling',
                impacts: ['speed', 'handling', 'range'],
                icon: '🏔️',
                installed: false,
                variants: {
                    '2inch': { name: '2" Lift', weight: 20, aeroImpact: 10, cost: 300 },
                    '4inch': { name: '4" Lift', weight: 25, aeroImpact: 15, cost: 500 },
                    '6inch': { name: '6" Lift', weight: 35, aeroImpact: 25, cost: 800 }
                }
            },
            ledLights: {
                name: 'LED Light Package',
                category: 'lighting',
                powerDraw: 45, // watts
                weightChange: 8,
                description: 'Front/rear LED bars, underbody lighting, interior accents',
                impacts: ['range', 'visibility'],
                icon: '💡',
                installed: false,
                variants: {
                    basic: { name: 'Basic Package', powerDraw: 25, weight: 5, cost: 150 },
                    premium: { name: 'Premium Package', powerDraw: 45, weight: 8, cost: 350 },
                    extreme: { name: 'Extreme Package', powerDraw: 85, weight: 12, cost: 600 }
                }
            },
            soundSystem: {
                name: 'Sound System',
                category: 'entertainment',
                powerDraw: 120, // watts at moderate volume
                weightChange: 15,
                description: 'Amplifier, speakers, subwoofer, Bluetooth connectivity',
                impacts: ['range', 'enjoyment'],
                icon: '🔊',
                installed: false,
                variants: {
                    basic: { name: 'Basic Audio', powerDraw: 60, weight: 8, cost: 200 },
                    premium: { name: 'Premium Sound', powerDraw: 120, weight: 15, cost: 500 },
                    concert: { name: 'Concert System', powerDraw: 200, weight: 25, cost: 1200 }
                }
            },
            climateControl: {
                name: 'Climate Control',
                category: 'comfort',
                powerDraw: 800, // watts when active
                weightChange: 35,
                description: 'Heating and A/C system for passenger comfort',
                impacts: ['range', 'comfort', 'season'],
                icon: '🌡️',
                installed: false,
                variants: {
                    heaterOnly: { name: 'Heater Only', powerDraw: 400, weight: 20, cost: 400 },
                    heatAC: { name: 'Heat & A/C', powerDraw: 800, weight: 35, cost: 800 },
                    premium: { name: 'Premium Climate', powerDraw: 600, weight: 30, cost: 1200 }
                }
            },
            cargoBox: {
                name: 'Cargo Box/Rack',
                category: 'utility',
                powerDraw: 0,
                weightChange: 20,
                aerodynamicImpact: 8,
                description: 'Roof box, rear cargo rack, or utility bed accessories',
                impacts: ['range', 'storage', 'aerodynamics'],
                icon: '📦',
                installed: false,
                variants: {
                    roofBox: { name: 'Roof Cargo Box', weight: 25, aeroImpact: 12, cost: 300 },
                    rearRack: { name: 'Rear Cargo Rack', weight: 15, aeroImpact: 5, cost: 150 },
                    utilityBed: { name: 'Utility Bed Kit', weight: 40, aeroImpact: 8, cost: 500 }
                }
            },
            windshield: {
                name: 'Windshield & Doors',
                category: 'protection',
                powerDraw: 0,
                weightChange: 30,
                aerodynamicImpact: -5, // Better aerodynamics
                description: 'Full windshield, doors, weather protection',
                impacts: ['comfort', 'weather', 'aerodynamics'],
                icon: '🛡️',
                installed: false,
                variants: {
                    windshieldOnly: { name: 'Windshield Only', weight: 15, aeroImpact: -2, cost: 200 },
                    halfDoors: { name: 'Windshield + Half Doors', weight: 25, aeroImpact: -3, cost: 400 },
                    fullEnclosure: { name: 'Full Enclosure', weight: 45, aeroImpact: -5, cost: 800 }
                }
            },
            winch: {
                name: 'Electric Winch',
                category: 'utility',
                powerDraw: 1500, // watts when active
                weightChange: 40,
                description: 'Front-mounted electric winch for recovery operations',
                impacts: ['utility', 'range'],
                icon: '⛓️',
                installed: false,
                variants: {
                    light: { name: '2000lb Winch', powerDraw: 1200, weight: 30, cost: 300 },
                    medium: { name: '3000lb Winch', powerDraw: 1500, weight: 40, cost: 500 },
                    heavy: { name: '4500lb Winch', powerDraw: 2000, weight: 55, cost: 800 }
                }
            },
            gpsTracker: {
                name: 'GPS Tracking System',
                category: 'security',
                powerDraw: 5, // watts continuous
                weightChange: 2,
                description: 'Real-time GPS tracking with theft alerts',
                impacts: ['security', 'range'],
                icon: '📍',
                installed: false,
                variants: {
                    basic: { name: 'Basic Tracker', powerDraw: 3, weight: 1, cost: 100 },
                    advanced: { name: 'Advanced Security', powerDraw: 5, weight: 2, cost: 250 },
                    premium: { name: 'Full Monitoring', powerDraw: 8, weight: 3, cost: 500 }
                }
            },
            brushGuard: {
                name: 'Brush Guard/Bumper',
                category: 'protection',
                powerDraw: 0,
                weightChange: 45,
                aerodynamicImpact: 8,
                description: 'Front brush guard or heavy-duty bumper',
                impacts: ['protection', 'weight', 'aerodynamics'],
                icon: '🛡️',
                installed: false,
                variants: {
                    light: { name: 'Light Brush Guard', weight: 25, aeroImpact: 5, cost: 200 },
                    standard: { name: 'Standard Bumper', weight: 45, aeroImpact: 8, cost: 400 },
                    heavyDuty: { name: 'Heavy Duty', weight: 65, aeroImpact: 12, cost: 700 }
                }
            },
            workLights: {
                name: 'Work Light Package',
                category: 'lighting',
                powerDraw: 150, // watts when active
                weightChange: 12,
                description: 'High-intensity work lights for utility operations',
                impacts: ['utility', 'range'],
                icon: '🔦',
                installed: false,
                variants: {
                    basic: { name: 'Basic Work Lights', powerDraw: 80, weight: 8, cost: 150 },
                    professional: { name: 'Pro Work Package', powerDraw: 150, weight: 12, cost: 300 },
                    industrial: { name: 'Industrial Grade', powerDraw: 250, weight: 18, cost: 600 }
                }
            }
        };
        
        this.installationHistory = [];
        this.maintenanceSchedule = new Map();
        
        this.init();
    }
    
    /**
     * Initialize accessories manager
     */
    init() {
        this.loadSavedConfiguration();
        this.calculateTotalImpact();
        this.setupMaintenanceSchedule();
    }
    
    /**
     * Install an accessory
     */
    installAccessory(accessoryId, variant = 'basic', installDate = new Date()) {
        if (!this.accessories[accessoryId]) {
            throw new Error(`Unknown accessory: ${accessoryId}`);
        }
        
        const accessory = this.accessories[accessoryId];
        const variantConfig = accessory.variants[variant];
        
        if (!variantConfig) {
            throw new Error(`Unknown variant ${variant} for ${accessoryId}`);
        }
        
        // Update accessory configuration
        accessory.installed = true;
        accessory.selectedVariant = variant;
        accessory.installDate = installDate;
        accessory.currentConfig = {
            ...variantConfig,
            powerDraw: variantConfig.powerDraw || accessory.powerDraw,
            weightChange: variantConfig.weight || accessory.weightChange,
            aerodynamicImpact: variantConfig.aeroImpact || accessory.aerodynamicImpact
        };
        
        // Add to installation history
        this.installationHistory.push({
            id: accessoryId,
            name: accessory.name,
            variant: variantConfig.name,
            date: installDate,
            cost: variantConfig.cost
        });
        
        // Update maintenance schedule
        this.scheduleMaintenanceForAccessory(accessoryId, installDate);
        
        // Recalculate total impact
        this.calculateTotalImpact();
        
        // Save configuration
        this.saveConfiguration();
        
        return {
            success: true,
            accessory: accessory.name,
            variant: variantConfig.name,
            impact: this.getAccessoryImpact(accessoryId)
        };
    }
    
    /**
     * Remove an accessory
     */
    removeAccessory(accessoryId) {
        if (!this.accessories[accessoryId]?.installed) {
            throw new Error(`Accessory ${accessoryId} is not installed`);
        }
        
        const accessory = this.accessories[accessoryId];
        
        // Reset accessory configuration
        accessory.installed = false;
        delete accessory.selectedVariant;
        delete accessory.installDate;
        delete accessory.currentConfig;
        
        // Remove from maintenance schedule
        this.maintenanceSchedule.delete(accessoryId);
        
        // Recalculate impact
        this.calculateTotalImpact();
        this.saveConfiguration();
        
        return {
            success: true,
            accessory: accessory.name,
            message: 'Accessory removed successfully'
        };
    }
    
    /**
     * Get impact of specific accessory
     */
    getAccessoryImpact(accessoryId) {
        const accessory = this.accessories[accessoryId];
        if (!accessory?.installed) return null;
        
        const config = accessory.currentConfig;
        return {
            powerDraw: config.powerDraw || 0,
            weightChange: config.weightChange || 0,
            aerodynamicImpact: config.aerodynamicImpact || 0,
            rangeImpact: this.calculateRangeImpact(accessoryId),
            performanceImpact: this.calculatePerformanceImpact(accessoryId)
        };
    }
    
    /**
     * Calculate total impact of all accessories
     */
    calculateTotalImpact() {
        this.totalImpact = {
            powerDraw: 0,
            weightChange: 0,
            aerodynamicImpact: 0,
            cost: 0,
            rangeReduction: 0,
            accelerationImpact: 0,
            topSpeedImpact: 0
        };
        
        Object.entries(this.accessories).forEach(([id, accessory]) => {
            if (accessory.installed && accessory.currentConfig) {
                const config = accessory.currentConfig;
                
                this.totalImpact.powerDraw += config.powerDraw || 0;
                this.totalImpact.weightChange += config.weightChange || 0;
                this.totalImpact.aerodynamicImpact += config.aerodynamicImpact || 0;
                this.totalImpact.cost += config.cost || 0;
            }
        });
        
        // Calculate derived impacts
        this.totalImpact.rangeReduction = this.calculateTotalRangeImpact();
        this.totalImpact.accelerationImpact = this.calculateAccelerationImpact();
        this.totalImpact.topSpeedImpact = this.calculateTopSpeedImpact();
        
        return this.totalImpact;
    }
    
    /**
     * Calculate range impact
     */
    calculateRangeImpact(accessoryId) {
        const accessory = this.accessories[accessoryId];
        if (!accessory?.installed) return 0;
        
        const config = accessory.currentConfig;
        const powerDraw = config.powerDraw || 0;
        const aeroImpact = config.aerodynamicImpact || 0;
        
        // Power draw impact (continuous load)
        const powerImpact = powerDraw * 0.1; // 10% range reduction per 100W
        
        // Aerodynamic impact (speed-dependent)
        const aeroRangeImpact = aeroImpact * 0.5; // 0.5% range reduction per 1% aero penalty
        
        return powerImpact + aeroRangeImpact;
    }
    
    /**
     * Calculate total range impact
     */
    calculateTotalRangeImpact() {
        // Base range impact from power draw
        const powerImpact = this.totalImpact.powerDraw * 0.08; // 8% per 100W
        
        // Aerodynamic impact
        const aeroImpact = this.totalImpact.aerodynamicImpact * 0.4;
        
        // Weight impact
        const weightImpact = (this.totalImpact.weightChange / 100) * 2; // 2% per 100lbs
        
        return Math.min(powerImpact + aeroImpact + weightImpact, 40); // Cap at 40%
    }
    
    /**
     * Calculate acceleration impact
     */
    calculateAccelerationImpact() {
        // Weight primarily affects acceleration
        const weightImpact = (this.totalImpact.weightChange / 100) * 5; // 5% slower per 100lbs
        
        // Power draw affects available motor power
        const powerImpact = (this.totalImpact.powerDraw / 1000) * 3; // 3% per 1kW
        
        return Math.min(weightImpact + powerImpact, 25); // Cap at 25%
    }
    
    /**
     * Calculate top speed impact
     */
    calculateTopSpeedImpact() {
        // Aerodynamics and weight affect top speed
        const aeroImpact = this.totalImpact.aerodynamicImpact * 0.3;
        const weightImpact = (this.totalImpact.weightChange / 100) * 1.5;
        
        return Math.min(aeroImpact + weightImpact, 15); // Cap at 15%
    }
    
    /**
     * Calculate performance impact
     */
    calculatePerformanceImpact(accessoryId) {
        const accessory = this.accessories[accessoryId];
        if (!accessory?.installed) return {};
        
        const config = accessory.currentConfig;
        const weight = config.weightChange || 0;
        const powerDraw = config.powerDraw || 0;
        const aeroImpact = config.aerodynamicImpact || 0;
        
        return {
            acceleration: (weight / 100) * 5 + (powerDraw / 1000) * 3,
            topSpeed: aeroImpact * 0.3 + (weight / 100) * 1.5,
            range: this.calculateRangeImpact(accessoryId),
            handling: weight > 30 ? (weight / 100) * 2 : 0
        };
    }
    
    /**
     * Get power requirements for driving mode
     */
    getPowerRequirementsForMode(mode, conditions = {}) {
        const baseRequirements = this.totalImpact.powerDraw;
        
        const modeMultipliers = {
            'parade': {
                lights: 1.5, // More lights on
                sound: 2.0,  // Music louder
                climate: 0.5 // Lower climate usage
            },
            'show-off': {
                lights: 2.0, // All lights blazing
                sound: 2.5,  // Maximum volume
                climate: 1.0
            },
            'valet': {
                lights: 0.3, // Minimal lights
                sound: 0.1,  // Very quiet
                climate: 0.2 // Minimal climate
            },
            'beach': {
                lights: 0.8, // Normal lighting
                sound: 1.5,  // Beach tunes
                climate: 1.8 // A/C working hard
            },
            'snow': {
                lights: 1.2, // Better visibility
                sound: 0.8,  // Quieter for safety
                climate: 2.0 // Heater at maximum
            },
            'golf': {
                lights: 0.5, // Quiet operation
                sound: 0.2,  // Very quiet
                climate: 0.8 // Comfortable but not distracting
            },
            'security': {
                lights: 1.8, // High visibility
                sound: 0.3,  // Radio only
                climate: 0.6 // Minimal for alertness
            }
        };
        
        const multiplier = modeMultipliers[mode] || { lights: 1.0, sound: 1.0, climate: 1.0 };
        
        let adjustedPower = 0;
        
        // Calculate power for each accessory category
        Object.entries(this.accessories).forEach(([id, accessory]) => {
            if (!accessory.installed) return;
            
            const basePower = accessory.currentConfig?.powerDraw || 0;
            let categoryMultiplier = 1.0;
            
            switch (accessory.category) {
                case 'lighting':
                    categoryMultiplier = multiplier.lights;
                    break;
                case 'entertainment':
                    categoryMultiplier = multiplier.sound;
                    break;
                case 'comfort':
                    categoryMultiplier = multiplier.climate;
                    break;
                default:
                    categoryMultiplier = 1.0;
            }
            
            adjustedPower += basePower * categoryMultiplier;
        });
        
        return {
            basePower: baseRequirements,
            adjustedPower: adjustedPower,
            breakdown: this.getPowerBreakdown(mode, multiplier)
        };
    }
    
    /**
     * Get power breakdown by category
     */
    getPowerBreakdown(mode, multiplier) {
        const breakdown = {
            lighting: 0,
            entertainment: 0,
            comfort: 0,
            utility: 0,
            security: 0,
            protection: 0
        };
        
        Object.entries(this.accessories).forEach(([id, accessory]) => {
            if (!accessory.installed) return;
            
            const basePower = accessory.currentConfig?.powerDraw || 0;
            const category = accessory.category;
            
            let categoryMultiplier = 1.0;
            switch (category) {
                case 'lighting':
                    categoryMultiplier = multiplier.lights;
                    break;
                case 'entertainment':
                    categoryMultiplier = multiplier.sound;
                    break;
                case 'comfort':
                    categoryMultiplier = multiplier.climate;
                    break;
            }
            
            breakdown[category] += basePower * categoryMultiplier;
        });
        
        return breakdown;
    }
    
    /**
     * Get maintenance schedule
     */
    getMaintenanceSchedule() {
        const schedule = [];
        
        this.maintenanceSchedule.forEach((intervals, accessoryId) => {
            const accessory = this.accessories[accessoryId];
            if (!accessory?.installed) return;
            
            intervals.forEach(interval => {
                schedule.push({
                    accessoryId,
                    accessoryName: accessory.name,
                    task: interval.task,
                    nextDue: interval.nextDue,
                    intervalMonths: interval.intervalMonths,
                    priority: interval.priority,
                    estimated_cost: interval.cost
                });
            });
        });
        
        return schedule.sort((a, b) => a.nextDue - b.nextDue);
    }
    
    /**
     * Schedule maintenance for accessory
     */
    scheduleMaintenanceForAccessory(accessoryId, installDate) {
        const accessory = this.accessories[accessoryId];
        if (!accessory) return;
        
        const maintenanceIntervals = this.getMaintenanceIntervalsForAccessory(accessoryId);
        this.maintenanceSchedule.set(accessoryId, maintenanceIntervals.map(interval => ({
            ...interval,
            nextDue: new Date(installDate.getTime() + interval.intervalMonths * 30 * 24 * 60 * 60 * 1000)
        })));
    }
    
    /**
     * Get maintenance intervals for specific accessory
     */
    getMaintenanceIntervalsForAccessory(accessoryId) {
        const intervals = {
            liftKit: [
                { task: 'Inspect mounting bolts', intervalMonths: 6, priority: 'high', cost: 50 },
                { task: 'Check alignment', intervalMonths: 12, priority: 'medium', cost: 75 }
            ],
            ledLights: [
                { task: 'Clean lenses', intervalMonths: 3, priority: 'low', cost: 0 },
                { task: 'Check connections', intervalMonths: 6, priority: 'medium', cost: 25 }
            ],
            soundSystem: [
                { task: 'Update firmware', intervalMonths: 6, priority: 'low', cost: 0 },
                { task: 'Check wiring', intervalMonths: 12, priority: 'medium', cost: 50 }
            ],
            climateControl: [
                { task: 'Replace cabin filter', intervalMonths: 6, priority: 'medium', cost: 30 },
                { task: 'Service refrigerant', intervalMonths: 24, priority: 'high', cost: 150 }
            ],
            winch: [
                { task: 'Lubricate winch', intervalMonths: 3, priority: 'high', cost: 25 },
                { task: 'Inspect cable', intervalMonths: 6, priority: 'high', cost: 0 }
            ]
        };
        
        return intervals[accessoryId] || [];
    }
    
    /**
     * Get accessory recommendations
     */
    getRecommendations(vehicleData, usageProfile) {
        const recommendations = [];
        
        // Analyze usage patterns
        if (usageProfile.includes('utility')) {
            recommendations.push({
                accessory: 'cargoBox',
                variant: 'utilityBed',
                reason: 'Utility usage detected - cargo capacity recommended',
                priority: 'high'
            });
            
            recommendations.push({
                accessory: 'workLights',
                variant: 'professional',
                reason: 'Work lighting for utility operations',
                priority: 'medium'
            });
        }
        
        if (usageProfile.includes('recreation')) {
            recommendations.push({
                accessory: 'soundSystem',
                variant: 'premium',
                reason: 'Enhanced entertainment for recreational use',
                priority: 'medium'
            });
        }
        
        if (usageProfile.includes('security')) {
            recommendations.push({
                accessory: 'gpsTracker',
                variant: 'advanced',
                reason: 'Security tracking recommended',
                priority: 'high'
            });
            
            recommendations.push({
                accessory: 'workLights',
                variant: 'professional',
                reason: 'High-visibility lighting for security patrols',
                priority: 'medium'
            });
        }
        
        // Climate-based recommendations
        if (vehicleData.climate === 'hot') {
            recommendations.push({
                accessory: 'climateControl',
                variant: 'heatAC',
                reason: 'A/C recommended for hot climate',
                priority: 'high'
            });
        }
        
        if (vehicleData.climate === 'cold') {
            recommendations.push({
                accessory: 'climateControl',
                variant: 'heaterOnly',
                reason: 'Heating recommended for cold climate',
                priority: 'high'
            });
            
            recommendations.push({
                accessory: 'windshield',
                variant: 'fullEnclosure',
                reason: 'Weather protection for cold climate',
                priority: 'medium'
            });
        }
        
        return recommendations;
    }
    
    /**
     * Save configuration
     */
    saveConfiguration() {
        const config = {
            accessories: {},
            installationHistory: this.installationHistory,
            totalImpact: this.totalImpact,
            lastUpdated: new Date().toISOString()
        };
        
        Object.entries(this.accessories).forEach(([id, accessory]) => {
            if (accessory.installed) {
                config.accessories[id] = {
                    installed: true,
                    selectedVariant: accessory.selectedVariant,
                    installDate: accessory.installDate,
                    currentConfig: accessory.currentConfig
                };
            }
        });
        
        localStorage.setItem('gem-accessories-config', JSON.stringify(config));
    }
    
    /**
     * Load saved configuration
     */
    loadSavedConfiguration() {
        try {
            const saved = localStorage.getItem('gem-accessories-config');
            if (!saved) return;
            
            const config = JSON.parse(saved);
            
            // Restore installed accessories
            Object.entries(config.accessories || {}).forEach(([id, savedAccessory]) => {
                if (this.accessories[id] && savedAccessory.installed) {
                    this.accessories[id].installed = true;
                    this.accessories[id].selectedVariant = savedAccessory.selectedVariant;
                    this.accessories[id].installDate = new Date(savedAccessory.installDate);
                    this.accessories[id].currentConfig = savedAccessory.currentConfig;
                }
            });
            
            // Restore installation history
            this.installationHistory = config.installationHistory || [];
            
        } catch (error) {
            console.error('Error loading accessories configuration:', error);
        }
    }
    
    /**
     * Setup maintenance schedule
     */
    setupMaintenanceSchedule() {
        Object.entries(this.accessories).forEach(([id, accessory]) => {
            if (accessory.installed && accessory.installDate) {
                this.scheduleMaintenanceForAccessory(id, accessory.installDate);
            }
        });
    }
    
    /**
     * Get installed accessories list
     */
    getInstalledAccessories() {
        return Object.entries(this.accessories)
            .filter(([id, accessory]) => accessory.installed)
            .map(([id, accessory]) => ({
                id,
                name: accessory.name,
                variant: accessory.selectedVariant,
                variantName: accessory.variants[accessory.selectedVariant]?.name,
                category: accessory.category,
                icon: accessory.icon,
                installDate: accessory.installDate,
                impact: this.getAccessoryImpact(id)
            }));
    }
    
    /**
     * Get accessory categories
     */
    getAccessoryCategories() {
        const categories = new Set();
        Object.values(this.accessories).forEach(accessory => {
            categories.add(accessory.category);
        });
        return Array.from(categories);
    }
    
    /**
     * Export configuration
     */
    exportConfiguration() {
        return {
            accessories: this.getInstalledAccessories(),
            totalImpact: this.totalImpact,
            installationHistory: this.installationHistory,
            maintenanceSchedule: this.getMaintenanceSchedule(),
            exportDate: new Date().toISOString()
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AccessoriesManager;
}
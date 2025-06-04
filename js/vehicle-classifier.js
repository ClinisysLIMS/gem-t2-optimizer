/**
 * Vehicle Classification System
 * Determines vehicle type based on speed and provides regulatory information
 */
class VehicleClassifier {
    constructor() {
        this.classifications = {
            'golf-cart': {
                name: 'Golf Cart',
                maxSpeed: 25,
                requirements: 'Local roads only, daylight hours typical',
                features: 'Basic safety equipment',
                icon: '⛳',
                color: 'blue'
            },
            'lsv': {
                name: 'Low Speed Vehicle (LSV)',
                minSpeed: 20,
                maxSpeed: 25,
                requirements: 'Street legal, requires VIN, license, registration',
                features: 'DOT approved: lights, mirrors, seatbelts, windshield',
                icon: '🚗',
                color: 'green'
            },
            'nev': {
                name: 'Neighborhood Electric Vehicle (NEV)',
                minSpeed: 20,
                maxSpeed: 25,
                requirements: 'Same as LSV, state-specific regulations',
                features: 'Full safety equipment package',
                icon: '🏘️',
                color: 'purple'
            },
            'modified': {
                name: 'Street Legal Status',
                minSpeed: 26,
                requirements: 'Exceeds LSV speed limits',
                features: 'Enhanced performance capabilities',
                icon: 'ℹ️',
                color: 'orange'
            }
        };

        this.motorSpecs = {
            'dc-stock': {
                name: 'Stock DC Motor (3.5HP)',
                power: 3.5,
                torque: 'moderate',
                efficiency: 'good',
                maintenance: 'brushes every 2-3 years',
                maxSafeSpeed: 25
            },
            'dc-upgrade': {
                name: 'Upgraded DC Motor (5HP+)',
                power: 5.0,
                torque: 'high',
                efficiency: 'moderate',
                maintenance: 'brushes every 1-2 years',
                maxSafeSpeed: 30
            },
            'ac-stock': {
                name: 'Stock AC Motor',
                power: 5.0,
                torque: 'very high',
                efficiency: 'excellent',
                maintenance: 'minimal',
                maxSafeSpeed: 25
            },
            'ac-performance': {
                name: 'Performance AC Motor',
                power: 7.5,
                torque: 'extreme',
                efficiency: 'very good',
                maintenance: 'minimal',
                maxSafeSpeed: 35
            },
            'custom': {
                name: 'Custom/Modified Motor',
                power: 'varies',
                torque: 'varies',
                efficiency: 'varies',
                maintenance: 'varies',
                maxSafeSpeed: 40
            }
        };

        this.controllerLimits = {
            'T1': {
                name: 'T1 Controller',
                maxCurrent: 300,
                features: 'Basic functions',
                compatibility: ['dc-stock']
            },
            'T2': {
                name: 'T2 Controller',
                maxCurrent: 350,
                features: 'Advanced programming, regen braking',
                compatibility: ['dc-stock', 'dc-upgrade']
            },
            'T4': {
                name: 'T4 Controller',
                maxCurrent: 450,
                features: 'High performance, AC motor support',
                compatibility: ['dc-stock', 'dc-upgrade', 'ac-stock', 'ac-performance']
            }
        };
    }

    /**
     * Classify vehicle based on speed
     * @param {number} speed - Current top speed in MPH
     * @returns {Object} Classification details
     */
    classifyBySpeed(speed) {
        if (speed <= 19) {
            return {
                ...this.classifications['golf-cart'],
                note: 'Speed below LSV minimum - Golf cart classification'
            };
        } else if (speed >= 20 && speed <= 25) {
            return {
                ...this.classifications['lsv'],
                note: 'Meets LSV/NEV requirements for street legal operation'
            };
        } else {
            return {
                ...this.classifications['modified'],
                note: `Based on ${speed} MPH speed, your vehicle exceeds LSV limits (25 MPH max)`,
                guidance: 'Suggested routes will follow local speed limits. Please verify local regulations for your area.',
                legalLink: 'https://www.nhtsa.gov/laws-regulations/low-speed-vehicles',
                info: true
            };
        }
    }

    /**
     * Validate motor and controller compatibility
     * @param {string} motorType - Selected motor type
     * @param {string} controllerType - Selected controller type
     * @returns {Object} Compatibility information
     */
    validateCompatibility(motorType, controllerType) {
        const motor = this.motorSpecs[motorType];
        const controller = this.controllerLimits[controllerType];

        if (!motor || !controller) {
            return {
                compatible: false,
                message: 'Invalid motor or controller selection'
            };
        }

        const compatible = controller.compatibility.includes(motorType);
        
        return {
            compatible,
            message: compatible 
                ? `✅ ${motor.name} is compatible with ${controller.name}`
                : `❌ ${motor.name} is NOT compatible with ${controller.name}`,
            recommendation: !compatible 
                ? this.getCompatibleController(motorType)
                : null,
            performance: compatible 
                ? this.estimatePerformance(motorType, controllerType)
                : null
        };
    }

    /**
     * Get compatible controller recommendation
     * @param {string} motorType - Motor type
     * @returns {string} Recommended controller
     */
    getCompatibleController(motorType) {
        for (const [type, controller] of Object.entries(this.controllerLimits)) {
            if (controller.compatibility.includes(motorType)) {
                return `Recommended: ${controller.name}`;
            }
        }
        return 'No standard controller supports this motor configuration';
    }

    /**
     * Estimate performance characteristics
     * @param {string} motorType - Motor type
     * @param {string} controllerType - Controller type
     * @returns {Object} Performance estimates
     */
    estimatePerformance(motorType, controllerType) {
        const motor = this.motorSpecs[motorType];
        const controller = this.controllerLimits[controllerType];

        // Base performance calculations
        const basePerformance = {
            topSpeed: Math.min(motor.maxSafeSpeed, 25), // Default limited to 25
            acceleration: 'moderate',
            hillClimbing: 'good',
            range: 'standard'
        };

        // Adjust based on motor type
        if (motorType.includes('ac')) {
            basePerformance.acceleration = 'excellent';
            basePerformance.hillClimbing = 'excellent';
            basePerformance.range = 'extended';
        } else if (motorType.includes('upgrade')) {
            basePerformance.acceleration = 'good';
            basePerformance.hillClimbing = 'very good';
            basePerformance.range = 'slightly reduced';
        }

        // Adjust based on controller
        if (controllerType === 'T4') {
            basePerformance.topSpeed = motor.maxSafeSpeed;
            basePerformance.features = ['Advanced regen', 'Custom profiles', 'Enhanced diagnostics'];
        } else if (controllerType === 'T2') {
            basePerformance.features = ['Basic regen', 'Standard profiles'];
        } else {
            basePerformance.features = ['Basic operation'];
        }

        return basePerformance;
    }

    /**
     * Get safety recommendations based on vehicle setup
     * @param {Object} vehicleData - Vehicle configuration
     * @returns {Array} Safety recommendations
     */
    getSafetyRecommendations(vehicleData) {
        const recommendations = [];
        const { speed, motorType, controllerType, classification } = vehicleData;

        // Speed-based recommendations
        if (speed > 25) {
            recommendations.push({
                priority: 'high',
                category: 'legal',
                message: 'Vehicle exceeds LSV speed limit - may not be street legal',
                action: 'Verify local regulations and consider speed limiting'
            });
        }

        // Motor-specific recommendations
        if (motorType && motorType.includes('upgrade') || motorType === 'custom') {
            recommendations.push({
                priority: 'medium',
                category: 'mechanical',
                message: 'Upgraded motor detected - ensure proper cooling',
                action: 'Check motor temperature regularly, consider additional cooling'
            });
        }

        // Classification-based recommendations
        if (classification === 'lsv') {
            recommendations.push({
                priority: 'medium',
                category: 'equipment',
                message: 'LSV classification requires full safety equipment',
                action: 'Verify lights, mirrors, seatbelts, and horn are functional'
            });
        }

        // Controller recommendations
        if (controllerType === 'T4' && motorType && motorType.includes('dc')) {
            recommendations.push({
                priority: 'low',
                category: 'optimization',
                message: 'T4 controller with DC motor',
                action: 'Consider AC motor upgrade for full T4 capabilities'
            });
        }

        // General safety
        recommendations.push({
            priority: 'high',
            category: 'safety',
            message: 'Regular maintenance required',
            action: 'Check brakes, tires, and battery connections monthly'
        });

        return recommendations;
    }

    /**
     * Generate vehicle profile summary
     * @param {Object} vehicleData - Complete vehicle information
     * @returns {Object} Vehicle profile
     */
    generateVehicleProfile(vehicleData) {
        const classification = this.classifyBySpeed(vehicleData.speed);
        const compatibility = this.validateCompatibility(vehicleData.motorType, vehicleData.controllerType);
        const recommendations = this.getSafetyRecommendations({
            ...vehicleData,
            classification: classification.name.toLowerCase().replace(/\s+/g, '-')
        });

        return {
            summary: {
                model: vehicleData.model,
                year: vehicleData.year,
                classification: classification,
                motor: this.motorSpecs[vehicleData.motorType],
                controller: this.controllerLimits[vehicleData.controllerType]
            },
            compatibility,
            performance: compatibility.compatible 
                ? compatibility.performance 
                : null,
            recommendations,
            optimizationPotential: this.calculateOptimizationPotential(vehicleData)
        };
    }

    /**
     * Calculate optimization potential
     * @param {Object} vehicleData - Vehicle configuration
     * @returns {Object} Optimization potential analysis
     */
    calculateOptimizationPotential(vehicleData) {
        const currentSpeed = vehicleData.speed || 25;
        const motor = this.motorSpecs[vehicleData.motorType];
        const controller = this.controllerLimits[vehicleData.controllerType];

        if (!motor || !controller) {
            return { available: false, reason: 'Invalid configuration' };
        }

        const maxPotentialSpeed = Math.min(motor.maxSafeSpeed, 35);
        const speedIncreasePotential = maxPotentialSpeed - currentSpeed;

        return {
            available: speedIncreasePotential > 0,
            currentSpeed,
            maxSafeSpeed: maxPotentialSpeed,
            potentialIncrease: Math.max(0, speedIncreasePotential),
            percentage: Math.round((speedIncreasePotential / currentSpeed) * 100),
            warnings: speedIncreasePotential > 5 ? [
                'Significant speed increase may affect vehicle stability',
                'Ensure brake system is in excellent condition',
                'Consider tire upgrade for higher speeds'
            ] : [],
            efficiency: {
                current: 'standard',
                optimized: speedIncreasePotential > 0 ? 'reduced' : 'improved',
                tradeoff: 'Higher speed typically reduces range'
            }
        };
    }
    
    /**
     * Suggest motor type based on vehicle year and model
     * @param {string} year - Vehicle year range
     * @param {string} model - Vehicle model
     * @returns {Object} Motor suggestion with reasoning
     */
    suggestMotorType(year, model) {
        const yearData = this.motorSuggestions[year];
        if (!yearData) {
            return {
                suggested: 'dc-stock',
                confidence: 'low',
                reason: 'Unable to determine - defaulting to stock DC',
                details: 'Please verify motor type manually'
            };
        }
        
        // Check if specific model has different motor
        const suggested = yearData[model] || yearData.default;
        const motor = this.motorSpecs[suggested];
        
        return {
            suggested,
            confidence: yearData[model] ? 'high' : 'medium',
            reason: yearData.reason,
            details: yearData.details,
            motorInfo: motor,
            alternates: this.getAlternateMotors(year, model)
        };
    }
    
    /**
     * Get alternate motor options
     * @param {string} year - Vehicle year
     * @param {string} model - Vehicle model
     * @returns {Array} Alternate motor options
     */
    getAlternateMotors(year, model) {
        const alternates = [];
        
        // Common upgrades
        if (year === 'pre-1999' || year === '1999-2004') {
            alternates.push({
                type: 'dc-upgrade',
                reason: 'Popular upgrade for more power',
                benefits: ['50% more power', 'Better hill climbing', 'Higher top speed']
            });
        }
        
        if (year === '2005-2009' || year === '2010-2015') {
            if (model !== 'elXD') {
                alternates.push({
                    type: 'ac-stock',
                    reason: 'Retrofit for better efficiency',
                    benefits: ['Better efficiency', 'Less maintenance', 'Smoother operation']
                });
            }
        }
        
        return alternates;
    }
    
    /**
     * Calculate motor health score based on condition indicators
     * @param {Object} conditions - Motor condition indicators
     * @returns {Object} Health score and recommendations
     */
    calculateMotorHealth(conditions) {
        let score = 100;
        const issues = [];
        const recommendations = [];
        
        // Deduct points for each issue
        if (conditions.sparking) {
            score -= 30;
            issues.push('Sparking indicates worn brushes or commutator');
            recommendations.push('Inspect and replace brushes immediately');
        }
        
        if (conditions.noise) {
            score -= 20;
            issues.push('Noise suggests bearing wear or misalignment');
            recommendations.push('Check bearings and motor alignment');
        }
        
        if (conditions.overheating) {
            score -= 25;
            issues.push('Overheating can damage windings');
            recommendations.push('Check cooling system and reduce load');
        }
        
        if (conditions.vibration) {
            score -= 15;
            issues.push('Vibration indicates imbalance or loose mounting');
            recommendations.push('Check motor mounts and balance');
        }
        
        if (conditions.powerLoss) {
            score -= 20;
            issues.push('Power loss suggests worn components');
            recommendations.push('Full motor inspection recommended');
        }
        
        // Factor in age
        const ageScores = {
            'new': 0,
            'low': 5,
            'moderate': 10,
            'high': 20,
            'very-high': 30,
            'unknown': 15
        };
        score -= (ageScores[conditions.age] || 0);
        
        // Factor in service history
        if (conditions.lastService) {
            const daysSinceService = (Date.now() - new Date(conditions.lastService)) / (1000 * 60 * 60 * 24);
            if (daysSinceService > 365) {
                score -= 10;
                recommendations.push('Motor service overdue (> 1 year)');
            }
        } else {
            score -= 5;
            recommendations.push('No service history - schedule inspection');
        }
        
        // Ensure score stays in valid range
        score = Math.max(0, Math.min(100, score));
        
        // Determine status
        let status, color;
        if (score >= 80) {
            status = 'Excellent';
            color = 'green';
        } else if (score >= 60) {
            status = 'Good';
            color = 'yellow';
        } else if (score >= 40) {
            status = 'Fair';
            color = 'orange';
        } else {
            status = 'Poor';
            color = 'red';
        }
        
        return {
            score,
            status,
            color,
            issues,
            recommendations,
            criticalIssues: score < 40,
            maintenanceNeeded: score < 70
        };
    }
    
    /**
     * Get motor-specific optimization adjustments
     * @param {string} motorType - Type of motor
     * @param {Object} health - Motor health assessment
     * @returns {Object} Optimization adjustments
     */
    getMotorOptimizationAdjustments(motorType, health) {
        const adjustments = {
            currentLimits: {},
            acceleration: {},
            fieldControl: {},
            protection: {}
        };
        
        const motor = this.motorSpecs[motorType];
        if (!motor) return adjustments;
        
        // DC Motor adjustments
        if (motorType.includes('dc')) {
            if (health.score < 60) {
                // Reduce stress on worn motor
                adjustments.currentLimits.armature = -10; // Reduce by 10%
                adjustments.acceleration.rate = -20; // Slower acceleration
                adjustments.protection.temperature = 'enhanced';
            }
            
            if (health.issues.includes('sparking')) {
                adjustments.currentLimits.field = -15; // Reduce field current
                adjustments.fieldControl.weakening = 'conservative';
            }
        }
        
        // AC Motor adjustments
        if (motorType.includes('ac')) {
            if (health.score < 70) {
                adjustments.currentLimits.peak = -5; // Small reduction
                adjustments.acceleration.torque = -10;
            }
            
            if (health.issues.includes('overheating')) {
                adjustments.protection.thermalDerate = 'aggressive';
                adjustments.currentLimits.continuous = -15;
            }
        }
        
        // Power-based adjustments
        if (motor.power >= 7.5) {
            adjustments.acceleration.smoothing = 'enhanced';
            adjustments.protection.overcurrent = 'strict';
        }
        
        return adjustments;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VehicleClassifier;
} else if (typeof window !== 'undefined') {
    // Make VehicleClassifier available globally in browser environment
    window.VehicleClassifier = VehicleClassifier;
}
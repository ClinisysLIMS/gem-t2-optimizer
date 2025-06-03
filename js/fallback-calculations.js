/**
 * Comprehensive Fallback Calculations System
 * Provides complete offline functionality for GEM optimizer
 */
class FallbackCalculations {
    constructor() {
        // Built-in data for various scenarios
        this.scenarioData = {
            // Beach scenarios
            beach: {
                terrain: {
                    type: 'sandy',
                    difficulty: 0.7,
                    grade: 2,
                    surface: 'soft',
                    traction: 0.6
                },
                typical_weather: {
                    temp: 78,
                    humidity: 75,
                    wind: 12,
                    salt_air: true
                },
                traffic_patterns: {
                    peak: { hours: [10, 11, 12, 13, 14, 15], congestion: 0.8 },
                    offpeak: { congestion: 0.3 }
                },
                elevation_profile: 'flat',
                special_considerations: ['salt corrosion', 'sand resistance', 'sun exposure']
            },
            
            // Mountain scenarios
            mountain: {
                terrain: {
                    type: 'steep',
                    difficulty: 0.9,
                    grade: 12,
                    surface: 'paved',
                    traction: 0.8
                },
                typical_weather: {
                    temp: 55,
                    humidity: 40,
                    wind: 15,
                    altitude_effect: true
                },
                traffic_patterns: {
                    peak: { hours: [8, 9, 16, 17, 18], congestion: 0.6 },
                    offpeak: { congestion: 0.2 }
                },
                elevation_profile: 'mountainous',
                special_considerations: ['steep grades', 'altitude', 'temperature variations']
            },
            
            // City scenarios
            city: {
                terrain: {
                    type: 'urban',
                    difficulty: 0.3,
                    grade: 3,
                    surface: 'paved',
                    traction: 0.9
                },
                typical_weather: {
                    temp: 70,
                    humidity: 50,
                    wind: 5,
                    heat_island: true
                },
                traffic_patterns: {
                    peak: { hours: [7, 8, 9, 16, 17, 18, 19], congestion: 0.9 },
                    offpeak: { congestion: 0.4 }
                },
                elevation_profile: 'flat',
                special_considerations: ['frequent stops', 'traffic lights', 'pedestrians']
            },
            
            // Golf course scenarios
            golfcourse: {
                terrain: {
                    type: 'manicured',
                    difficulty: 0.2,
                    grade: 5,
                    surface: 'grass',
                    traction: 0.7
                },
                typical_weather: {
                    temp: 72,
                    humidity: 55,
                    wind: 8,
                    morning_dew: true
                },
                traffic_patterns: {
                    peak: { hours: [8, 9, 10, 11], congestion: 0.5 },
                    offpeak: { congestion: 0.1 }
                },
                elevation_profile: 'rolling',
                special_considerations: ['cart paths', 'wet grass', 'hills']
            },
            
            // Retirement community scenarios
            retirement: {
                terrain: {
                    type: 'residential',
                    difficulty: 0.1,
                    grade: 2,
                    surface: 'paved',
                    traction: 0.95
                },
                typical_weather: {
                    temp: 75,
                    humidity: 60,
                    wind: 5,
                    controlled_environment: true
                },
                traffic_patterns: {
                    peak: { hours: [8, 9, 10, 15, 16, 17], congestion: 0.3 },
                    offpeak: { congestion: 0.1 }
                },
                elevation_profile: 'flat',
                special_considerations: ['speed limits', 'crosswalks', 'medical facilities']
            },
            
            // Campus scenarios
            campus: {
                terrain: {
                    type: 'mixed',
                    difficulty: 0.4,
                    grade: 4,
                    surface: 'mixed',
                    traction: 0.85
                },
                typical_weather: {
                    temp: 68,
                    humidity: 52,
                    wind: 7,
                    seasonal_variation: true
                },
                traffic_patterns: {
                    peak: { hours: [8, 10, 12, 14, 16], congestion: 0.7 },
                    offpeak: { congestion: 0.2 }
                },
                elevation_profile: 'rolling',
                special_considerations: ['pedestrian traffic', 'class schedules', 'events']
            }
        };
        
        // Seasonal weather adjustments
        this.seasonalAdjustments = {
            winter: { temp: -20, humidity: +10, wind: +5, precipitation: 0.4 },
            spring: { temp: 0, humidity: +5, wind: +3, precipitation: 0.3 },
            summer: { temp: +15, humidity: +15, wind: -2, precipitation: 0.2 },
            fall: { temp: -5, humidity: 0, wind: +2, precipitation: 0.25 }
        };
        
        // Time-based traffic patterns
        this.trafficPatterns = {
            weekday: {
                0: 0.1, 1: 0.05, 2: 0.05, 3: 0.05, 4: 0.1, 5: 0.2,
                6: 0.4, 7: 0.8, 8: 0.9, 9: 0.7, 10: 0.4, 11: 0.5,
                12: 0.7, 13: 0.6, 14: 0.5, 15: 0.6, 16: 0.8, 17: 0.9,
                18: 0.8, 19: 0.6, 20: 0.4, 21: 0.3, 22: 0.2, 23: 0.15
            },
            weekend: {
                0: 0.15, 1: 0.1, 2: 0.05, 3: 0.05, 4: 0.05, 5: 0.1,
                6: 0.15, 7: 0.2, 8: 0.3, 9: 0.4, 10: 0.6, 11: 0.7,
                12: 0.8, 13: 0.7, 14: 0.6, 15: 0.5, 16: 0.5, 17: 0.6,
                18: 0.5, 19: 0.4, 20: 0.3, 21: 0.25, 22: 0.2, 23: 0.15
            }
        };
        
        // Elevation profile templates
        this.elevationProfiles = {
            flat: { variance: 20, maxGrade: 3, avgGrade: 1 },
            rolling: { variance: 100, maxGrade: 8, avgGrade: 4 },
            hilly: { variance: 300, maxGrade: 15, avgGrade: 8 },
            mountainous: { variance: 800, maxGrade: 25, avgGrade: 12 }
        };
    }
    
    /**
     * Estimate weather based on location and date
     */
    estimateWeather(location, date = new Date()) {
        // Detect scenario from location name
        const scenario = this.detectScenario(location);
        const baseWeather = this.scenarioData[scenario].typical_weather;
        
        // Apply seasonal adjustments
        const season = this.getSeason(date);
        const seasonal = this.seasonalAdjustments[season];
        
        // Apply time of day adjustments
        const hour = date.getHours();
        const timeAdjustment = this.getTimeOfDayWeatherAdjustment(hour);
        
        // Calculate final weather
        const weather = {
            temperature: Math.round(baseWeather.temp + seasonal.temp + timeAdjustment.temp),
            humidity: Math.min(100, Math.max(0, baseWeather.humidity + seasonal.humidity)),
            windSpeed: Math.max(0, baseWeather.wind + seasonal.wind + timeAdjustment.wind),
            precipitation: seasonal.precipitation,
            conditions: this.getWeatherConditions(seasonal.precipitation),
            pressure: 1013 + Math.round((Math.random() - 0.5) * 20),
            visibility: seasonal.precipitation > 0.3 ? 'moderate' : 'good',
            uvIndex: this.calculateUVIndex(hour, season),
            source: 'fallback_estimation',
            confidence: 0.75
        };
        
        // Add scenario-specific factors
        if (baseWeather.salt_air) weather.saltAir = true;
        if (baseWeather.heat_island) weather.heatIsland = true;
        if (baseWeather.altitude_effect) weather.altitudeEffect = true;
        
        return weather;
    }
    
    /**
     * Estimate terrain difficulty based on location
     */
    estimateTerrain(location) {
        const scenario = this.detectScenario(location);
        const terrain = this.scenarioData[scenario].terrain;
        
        return {
            type: terrain.type,
            difficulty: terrain.difficulty,
            grade: terrain.grade,
            surface: terrain.surface,
            traction: terrain.traction,
            elevationProfile: this.scenarioData[scenario].elevation_profile,
            specialConsiderations: this.scenarioData[scenario].special_considerations,
            recommendations: this.getTerrainRecommendations(terrain),
            source: 'fallback_estimation',
            confidence: 0.8
        };
    }
    
    /**
     * Estimate traffic patterns based on time
     */
    estimateTraffic(location, dateTime = new Date()) {
        const scenario = this.detectScenario(location);
        const trafficData = this.scenarioData[scenario].traffic_patterns;
        
        const hour = dateTime.getHours();
        const dayType = this.isWeekday(dateTime) ? 'weekday' : 'weekend';
        
        // Check if it's peak hours for this scenario
        const isPeak = trafficData.peak.hours.includes(hour);
        const baseCongestion = isPeak ? trafficData.peak.congestion : trafficData.offpeak.congestion;
        
        // Apply general traffic pattern
        const generalPattern = this.trafficPatterns[dayType][hour];
        const finalCongestion = (baseCongestion + generalPattern) / 2;
        
        return {
            congestionLevel: this.getCongestionLevel(finalCongestion),
            congestionScore: finalCongestion,
            estimatedDelay: Math.round(finalCongestion * 15), // minutes
            alternativeRoutes: this.suggestAlternativeRoutes(scenario, finalCongestion),
            peakHours: trafficData.peak.hours,
            recommendations: this.getTrafficRecommendations(finalCongestion, scenario),
            source: 'fallback_estimation',
            confidence: 0.7
        };
    }
    
    /**
     * Estimate elevation profile for a route
     */
    estimateElevationProfile(startLocation, endLocation, distance) {
        const startScenario = this.detectScenario(startLocation);
        const endScenario = this.detectScenario(endLocation);
        
        // Average the elevation profiles if different
        const startProfile = this.elevationProfiles[this.scenarioData[startScenario].elevation_profile];
        const endProfile = this.elevationProfiles[this.scenarioData[endScenario].elevation_profile];
        
        const avgVariance = (startProfile.variance + endProfile.variance) / 2;
        const avgMaxGrade = (startProfile.maxGrade + endProfile.maxGrade) / 2;
        const avgGrade = (startProfile.avgGrade + endProfile.avgGrade) / 2;
        
        // Generate elevation points
        const numPoints = Math.min(50, Math.max(10, Math.round(distance * 5)));
        const elevations = this.generateElevationPoints(numPoints, avgVariance, avgMaxGrade);
        
        return {
            elevations: elevations,
            totalAscent: this.calculateTotalAscent(elevations),
            totalDescent: this.calculateTotalDescent(elevations),
            maxGrade: avgMaxGrade,
            avgGrade: avgGrade,
            difficulty: this.calculateElevationDifficulty(avgMaxGrade, avgGrade),
            energyImpact: this.calculateEnergyImpact(elevations),
            source: 'fallback_estimation',
            confidence: 0.65
        };
    }
    
    /**
     * Optimize route without maps API
     */
    optimizeRoute(start, destination, preferences = {}) {
        const distance = this.estimateDistance(start, destination);
        const terrain = this.estimateTerrain(destination);
        const elevationProfile = this.estimateElevationProfile(start, destination, distance);
        
        // Calculate route metrics
        const baseSpeed = 20; // MPH for LSV
        const terrainSpeedFactor = 1 - (terrain.difficulty * 0.3);
        const gradeSpeedFactor = 1 - (elevationProfile.avgGrade / 100);
        const effectiveSpeed = baseSpeed * terrainSpeedFactor * gradeSpeedFactor;
        
        const duration = (distance / effectiveSpeed) * 60; // minutes
        
        // Energy consumption estimate
        const baseConsumption = 0.15; // kWh per mile
        const terrainConsumptionFactor = 1 + (terrain.difficulty * 0.4);
        const gradeConsumptionFactor = 1 + (elevationProfile.avgGrade / 50);
        const totalConsumption = distance * baseConsumption * terrainConsumptionFactor * gradeConsumptionFactor;
        
        return {
            distance: {
                value: distance,
                text: `${distance.toFixed(1)} miles`
            },
            duration: {
                value: Math.round(duration),
                text: `${Math.round(duration)} minutes`
            },
            efficiency: {
                energyConsumption: totalConsumption.toFixed(2),
                estimatedRange: (distance / totalConsumption * 10).toFixed(1), // Assuming 10kWh battery
                speedProfile: {
                    average: effectiveSpeed.toFixed(1),
                    max: baseSpeed,
                    terrainAdjusted: (baseSpeed * terrainSpeedFactor).toFixed(1)
                }
            },
            route: {
                type: this.determineRouteType(terrain, preferences),
                suitability: this.calculateRouteSuitability(terrain, elevationProfile, preferences),
                warnings: this.generateRouteWarnings(terrain, elevationProfile),
                waypoints: this.generateWaypoints(start, destination, 5)
            },
            optimization: {
                recommendations: this.generateOptimizationRecommendations(terrain, elevationProfile, preferences),
                alternativeOptions: this.suggestRouteAlternatives(terrain, preferences)
            },
            source: 'fallback_calculation',
            confidence: 0.7
        };
    }
    
    /**
     * Detect scenario from location name
     */
    detectScenario(location) {
        const locationLower = location.toLowerCase();
        
        if (locationLower.includes('beach') || locationLower.includes('coast') || locationLower.includes('shore')) {
            return 'beach';
        } else if (locationLower.includes('mountain') || locationLower.includes('hill') || locationLower.includes('peak')) {
            return 'mountain';
        } else if (locationLower.includes('city') || locationLower.includes('downtown') || locationLower.includes('urban')) {
            return 'city';
        } else if (locationLower.includes('golf') || locationLower.includes('course') || locationLower.includes('club')) {
            return 'golfcourse';
        } else if (locationLower.includes('retirement') || locationLower.includes('senior') || locationLower.includes('village')) {
            return 'retirement';
        } else if (locationLower.includes('campus') || locationLower.includes('university') || locationLower.includes('college')) {
            return 'campus';
        }
        
        // Default to city scenario
        return 'city';
    }
    
    /**
     * Get season from date
     */
    getSeason(date) {
        const month = date.getMonth();
        if (month >= 11 || month <= 1) return 'winter';
        if (month >= 2 && month <= 4) return 'spring';
        if (month >= 5 && month <= 7) return 'summer';
        return 'fall';
    }
    
    /**
     * Get time of day weather adjustment
     */
    getTimeOfDayWeatherAdjustment(hour) {
        if (hour >= 6 && hour < 10) {
            return { temp: -5, wind: -2 }; // Morning
        } else if (hour >= 10 && hour < 16) {
            return { temp: +5, wind: 0 }; // Midday
        } else if (hour >= 16 && hour < 20) {
            return { temp: 0, wind: +2 }; // Evening
        } else {
            return { temp: -8, wind: -3 }; // Night
        }
    }
    
    /**
     * Calculate UV index
     */
    calculateUVIndex(hour, season) {
        const baseUV = {
            winter: 2,
            spring: 5,
            summer: 8,
            fall: 4
        };
        
        let uv = baseUV[season];
        
        // Adjust for time of day
        if (hour < 10 || hour > 16) uv *= 0.3;
        else if (hour >= 11 && hour <= 15) uv *= 1.2;
        
        return Math.round(Math.min(11, Math.max(0, uv)));
    }
    
    /**
     * Get weather conditions description
     */
    getWeatherConditions(precipitation) {
        if (precipitation > 0.7) return 'Heavy Rain';
        if (precipitation > 0.5) return 'Rain';
        if (precipitation > 0.3) return 'Light Rain';
        if (precipitation > 0.1) return 'Partly Cloudy';
        return 'Clear';
    }
    
    /**
     * Check if date is weekday
     */
    isWeekday(date) {
        const day = date.getDay();
        return day >= 1 && day <= 5;
    }
    
    /**
     * Get congestion level description
     */
    getCongestionLevel(score) {
        if (score > 0.8) return 'Heavy';
        if (score > 0.6) return 'Moderate';
        if (score > 0.3) return 'Light';
        return 'None';
    }
    
    /**
     * Suggest alternative routes
     */
    suggestAlternativeRoutes(scenario, congestion) {
        const alternatives = [];
        
        if (scenario === 'city' && congestion > 0.6) {
            alternatives.push({
                name: 'Residential Route',
                description: 'Through quiet neighborhoods',
                estimatedDelay: -5,
                suitability: 'excellent'
            });
        }
        
        if (scenario === 'beach' && congestion > 0.5) {
            alternatives.push({
                name: 'Coastal Path',
                description: 'Scenic route along the shore',
                estimatedDelay: 3,
                suitability: 'good'
            });
        }
        
        if (scenario === 'golfcourse') {
            alternatives.push({
                name: 'Cart Path Network',
                description: 'Dedicated golf cart paths',
                estimatedDelay: -2,
                suitability: 'perfect'
            });
        }
        
        return alternatives;
    }
    
    /**
     * Get terrain recommendations
     */
    getTerrainRecommendations(terrain) {
        const recommendations = [];
        
        if (terrain.difficulty > 0.7) {
            recommendations.push('Reduce speed on difficult terrain');
            recommendations.push('Monitor battery levels closely');
        }
        
        if (terrain.traction < 0.7) {
            recommendations.push('Exercise caution on low-traction surfaces');
            recommendations.push('Consider tire pressure adjustment');
        }
        
        if (terrain.grade > 10) {
            recommendations.push('Use regenerative braking on descents');
            recommendations.push('Avoid sudden acceleration on inclines');
        }
        
        return recommendations;
    }
    
    /**
     * Get traffic recommendations
     */
    getTrafficRecommendations(congestion, scenario) {
        const recommendations = [];
        
        if (congestion > 0.7) {
            recommendations.push('Consider traveling during off-peak hours');
            recommendations.push('Allow extra time for journey');
        }
        
        if (scenario === 'city' && congestion > 0.5) {
            recommendations.push('Use side streets when possible');
            recommendations.push('Avoid main thoroughfares');
        }
        
        if (scenario === 'campus') {
            recommendations.push('Be alert for pedestrians');
            recommendations.push('Follow campus speed limits');
        }
        
        return recommendations;
    }
    
    /**
     * Generate elevation points
     */
    generateElevationPoints(numPoints, variance, maxGrade) {
        const points = [];
        let currentElevation = 100; // Start at 100m
        
        for (let i = 0; i < numPoints; i++) {
            // Create realistic elevation changes
            const change = (Math.random() - 0.5) * variance / 10;
            currentElevation += change;
            
            // Ensure elevation stays positive
            currentElevation = Math.max(0, currentElevation);
            
            points.push({
                distance: i / (numPoints - 1),
                elevation: Math.round(currentElevation),
                grade: Math.min(maxGrade, Math.abs(change) / 10)
            });
        }
        
        return points;
    }
    
    /**
     * Calculate total ascent
     */
    calculateTotalAscent(elevations) {
        let total = 0;
        for (let i = 1; i < elevations.length; i++) {
            const diff = elevations[i].elevation - elevations[i-1].elevation;
            if (diff > 0) total += diff;
        }
        return Math.round(total);
    }
    
    /**
     * Calculate total descent
     */
    calculateTotalDescent(elevations) {
        let total = 0;
        for (let i = 1; i < elevations.length; i++) {
            const diff = elevations[i-1].elevation - elevations[i].elevation;
            if (diff > 0) total += diff;
        }
        return Math.round(total);
    }
    
    /**
     * Calculate elevation difficulty
     */
    calculateElevationDifficulty(maxGrade, avgGrade) {
        if (maxGrade > 20 || avgGrade > 10) return 'Very Difficult';
        if (maxGrade > 15 || avgGrade > 7) return 'Difficult';
        if (maxGrade > 10 || avgGrade > 5) return 'Moderate';
        if (maxGrade > 5 || avgGrade > 3) return 'Easy';
        return 'Very Easy';
    }
    
    /**
     * Calculate energy impact of elevation
     */
    calculateEnergyImpact(elevations) {
        const ascent = this.calculateTotalAscent(elevations);
        const descent = this.calculateTotalDescent(elevations);
        
        // Energy cost for climbing (kWh per 100m)
        const climbCost = 0.05;
        // Energy recovery from descending (kWh per 100m)
        const descentRecovery = 0.02;
        
        const netEnergy = (ascent * climbCost / 100) - (descent * descentRecovery / 100);
        
        return {
            climbingCost: (ascent * climbCost / 100).toFixed(3),
            regenerativeGain: (descent * descentRecovery / 100).toFixed(3),
            netImpact: netEnergy.toFixed(3),
            efficiencyFactor: 1 + (netEnergy / 10)
        };
    }
    
    /**
     * Estimate distance between two locations
     */
    estimateDistance(start, destination) {
        // Simple estimation based on location types
        const startScenario = this.detectScenario(start);
        const endScenario = this.detectScenario(destination);
        
        // Base distances for common trips
        const distances = {
            'beach-beach': 2.5,
            'beach-city': 5.0,
            'city-city': 3.0,
            'city-mountain': 10.0,
            'golfcourse-golfcourse': 1.5,
            'retirement-city': 2.0,
            'campus-campus': 1.0
        };
        
        const key = `${startScenario}-${endScenario}`;
        const reverseKey = `${endScenario}-${startScenario}`;
        
        let baseDistance = distances[key] || distances[reverseKey] || 4.0;
        
        // Add some variation
        const variation = (Math.random() - 0.5) * 0.4;
        return Math.max(0.5, baseDistance * (1 + variation));
    }
    
    /**
     * Determine route type
     */
    determineRouteType(terrain, preferences) {
        if (preferences.scenic && terrain.type === 'beach') return 'Scenic Coastal';
        if (preferences.fastest) return 'Direct Route';
        if (preferences.easiest && terrain.difficulty < 0.3) return 'Easy Path';
        if (terrain.type === 'urban') return 'City Streets';
        return 'Standard Route';
    }
    
    /**
     * Calculate route suitability
     */
    calculateRouteSuitability(terrain, elevation, preferences) {
        let score = 1.0;
        
        // Terrain factors
        score *= (1 - terrain.difficulty * 0.3);
        
        // Elevation factors
        if (elevation.avgGrade > 10) score *= 0.8;
        if (elevation.maxGrade > 20) score *= 0.7;
        
        // Preference adjustments
        if (preferences.comfort && terrain.surface !== 'paved') score *= 0.9;
        if (preferences.speed && terrain.difficulty > 0.5) score *= 0.8;
        
        if (score > 0.8) return 'Excellent';
        if (score > 0.6) return 'Good';
        if (score > 0.4) return 'Fair';
        return 'Challenging';
    }
    
    /**
     * Generate route warnings
     */
    generateRouteWarnings(terrain, elevation) {
        const warnings = [];
        
        if (terrain.grade > 15) {
            warnings.push('Steep grades ahead - use caution');
        }
        
        if (terrain.traction < 0.6) {
            warnings.push('Low traction surface - reduce speed');
        }
        
        if (elevation.maxGrade > 20) {
            warnings.push('Very steep sections - check brakes');
        }
        
        if (terrain.type === 'sandy') {
            warnings.push('Soft surface may increase energy consumption');
        }
        
        return warnings;
    }
    
    /**
     * Generate waypoints
     */
    generateWaypoints(start, destination, count) {
        const waypoints = [];
        
        for (let i = 0; i <= count; i++) {
            const progress = i / count;
            waypoints.push({
                instruction: i === 0 ? `Start from ${start}` : 
                           i === count ? `Arrive at ${destination}` :
                           `Continue on route (${Math.round(progress * 100)}% complete)`,
                distance: progress,
                landmark: this.generateLandmark(start, destination, progress)
            });
        }
        
        return waypoints;
    }
    
    /**
     * Generate landmark descriptions
     */
    generateLandmark(start, destination, progress) {
        const landmarks = [
            'Golf cart crossing',
            'Residential area',
            'Shopping center',
            'Park entrance',
            'Community center'
        ];
        
        return landmarks[Math.floor(progress * landmarks.length)];
    }
    
    /**
     * Generate optimization recommendations
     */
    generateOptimizationRecommendations(terrain, elevation, preferences) {
        const recommendations = [];
        
        // Speed recommendations
        if (terrain.difficulty > 0.6) {
            recommendations.push('Reduce maximum speed to conserve energy');
        }
        
        // Acceleration recommendations
        if (elevation.avgGrade > 8) {
            recommendations.push('Use gentle acceleration on inclines');
        }
        
        // Regeneration recommendations
        if (elevation.totalDescent > 100) {
            recommendations.push('Maximize regenerative braking on descents');
        }
        
        // Comfort recommendations
        if (preferences.comfort && terrain.surface !== 'paved') {
            recommendations.push('Adjust tire pressure for comfort');
        }
        
        return recommendations;
    }
    
    /**
     * Suggest route alternatives
     */
    suggestRouteAlternatives(terrain, preferences) {
        const alternatives = [];
        
        if (terrain.difficulty > 0.5 && !preferences.fastest) {
            alternatives.push({
                name: 'Easy Route',
                description: 'Longer but easier path',
                distanceIncrease: '20%',
                difficultyReduction: '50%'
            });
        }
        
        if (!preferences.scenic && terrain.type !== 'urban') {
            alternatives.push({
                name: 'Direct Route',
                description: 'Shortest path available',
                distanceReduction: '15%',
                scenicValue: 'Low'
            });
        }
        
        return alternatives;
    }
}

// Create global instance
window.fallbackCalculations = new FallbackCalculations();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FallbackCalculations;
}
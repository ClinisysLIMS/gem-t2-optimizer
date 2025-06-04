/**
 * Optimization Cache System
 * Pre-computed optimizations for common scenarios to provide instant results
 * Eliminates need for external AI API calls with fast local lookup
 */
class OptimizationCache {
    constructor() {
        this.cache = new Map();
        this.scenarios = new Map();
        this.lookupTable = new Map();
        this.cacheHits = 0;
        this.cacheMisses = 0;
        
        // Initialize cache with common optimizations
        this.generateCommonOptimizations();
        this.buildLookupTable();
        
        console.log('Optimization Cache initialized with', this.cache.size, 'pre-computed scenarios');
    }
    
    /**
     * Generate pre-computed optimizations for common scenarios
     */
    generateCommonOptimizations() {
        const vehicles = ['e2', 'e4', 'el-xd'];
        const priorities = [
            { name: 'speed_focused', speed: 9, range: 3, acceleration: 7, efficiency: 2 },
            { name: 'range_focused', speed: 2, range: 9, acceleration: 3, efficiency: 8 },
            { name: 'balanced', speed: 6, range: 6, acceleration: 6, efficiency: 6 },
            { name: 'efficiency_focused', speed: 3, range: 7, acceleration: 4, efficiency: 9 },
            { name: 'performance', speed: 8, range: 4, acceleration: 9, efficiency: 3 },
            { name: 'economy', speed: 4, range: 8, acceleration: 5, efficiency: 8 },
            { name: 'hill_climbing', speed: 6, range: 5, acceleration: 8, efficiency: 5 }
        ];
        
        const conditions = [
            { name: 'ideal', temperature: 70, grade: 0, load: 0, surface: 'paved' },
            { name: 'cold', temperature: 35, grade: 0, load: 0, surface: 'paved' },
            { name: 'hot', temperature: 95, grade: 0, load: 0, surface: 'paved' },
            { name: 'hills', temperature: 70, grade: 8, load: 0, surface: 'paved' },
            { name: 'loaded', temperature: 70, grade: 0, load: 800, surface: 'paved' },
            { name: 'rough', temperature: 70, grade: 0, load: 0, surface: 'gravel' },
            { name: 'challenging', temperature: 85, grade: 6, load: 500, surface: 'paved' }
        ];
        
        // Generate optimizations for all combinations
        vehicles.forEach(vehicle => {
            priorities.forEach(priority => {
                conditions.forEach(condition => {
                    const key = this.generateCacheKey(vehicle, priority, condition);
                    const optimization = this.computeOptimization(vehicle, priority, condition);
                    this.cache.set(key, optimization);
                    
                    // Store scenario metadata
                    this.scenarios.set(key, {
                        vehicle: vehicle,
                        priority: priority.name,
                        condition: condition.name,
                        timestamp: Date.now()
                    });
                });
            });
        });
        
        // Add some common quick-access scenarios
        this.addQuickAccessScenarios();
    }
    
    /**
     * Add commonly requested scenarios for instant access
     */
    addQuickAccessScenarios() {
        // Default scenarios that users commonly request
        const quickScenarios = [
            {
                name: 'factory_default_e4',
                vehicle: 'e4',
                priority: { speed: 5, range: 5, acceleration: 5, efficiency: 5 },
                condition: { temperature: 70, grade: 0, load: 0 },
                settings: [22, 260, 65, 240, 43, 75, 85, 45, 35, 25, 15, 25, 35, 45, 55, 65, 75, 85, 95, 10, 20, 30, 40, 50, 60]
            },
            {
                name: 'max_speed_e4',
                vehicle: 'e4',
                priority: { speed: 10, range: 2, acceleration: 8, efficiency: 2 },
                condition: { temperature: 70, grade: 0, load: 0 },
                settings: [28, 300, 85, 220, 52, 90, 95, 55, 45, 30, 20, 30, 40, 50, 60, 70, 80, 90, 100, 15, 25, 35, 45, 55, 65]
            },
            {
                name: 'max_range_e4',
                vehicle: 'e4',
                priority: { speed: 2, range: 10, acceleration: 3, efficiency: 9 },
                condition: { temperature: 70, grade: 0, load: 0 },
                settings: [19, 200, 45, 280, 36, 55, 65, 30, 20, 15, 10, 20, 25, 35, 45, 55, 65, 75, 85, 5, 15, 25, 35, 45, 55]
            },
            {
                name: 'winter_e4',
                vehicle: 'e4',
                priority: { speed: 5, range: 6, acceleration: 5, efficiency: 6 },
                condition: { temperature: 35, grade: 0, load: 0 },
                settings: [21, 275, 58, 245, 44, 72, 82, 42, 32, 22, 14, 24, 34, 44, 54, 64, 74, 84, 94, 9, 19, 29, 39, 49, 59]
            },
            {
                name: 'hill_climber_e4',
                vehicle: 'e4',
                priority: { speed: 6, range: 5, acceleration: 8, efficiency: 4 },
                condition: { temperature: 70, grade: 10, load: 0 },
                settings: [24, 315, 82, 250, 50, 88, 92, 52, 42, 28, 18, 28, 38, 48, 58, 68, 78, 88, 98, 13, 23, 33, 43, 53, 63]
            }
        ];
        
        quickScenarios.forEach(scenario => {
            const key = `quick_${scenario.name}`;
            this.cache.set(key, {
                success: true,
                optimizedSettings: scenario.settings,
                strategy: scenario.name,
                performance: this.estimatePerformance(scenario.settings, scenario.vehicle),
                recommendations: this.generateQuickRecommendations(scenario.name),
                confidence: 0.95,
                method: 'pre_computed_cache',
                source: 'optimization_cache',
                cached: true
            });
            
            this.scenarios.set(key, {
                vehicle: scenario.vehicle,
                priority: scenario.name,
                condition: 'optimal',
                timestamp: Date.now(),
                quickAccess: true
            });
        });
    }
    
    /**
     * Generate cache key for lookup
     */
    generateCacheKey(vehicle, priority, condition) {
        // Create normalized key for consistent lookup
        const vehicleKey = typeof vehicle === 'string' ? vehicle : vehicle.model?.toLowerCase() || 'e4';
        const priorityKey = typeof priority === 'string' ? priority : this.hashPriorities(priority);
        const conditionKey = typeof condition === 'string' ? condition : this.hashConditions(condition);
        
        return `${vehicleKey}_${priorityKey}_${conditionKey}`;
    }
    
    /**
     * Hash priorities into a consistent string
     */
    hashPriorities(priorities) {
        const speed = Math.round(priorities.speed || 5);
        const range = Math.round(priorities.range || 5);
        const accel = Math.round(priorities.acceleration || 5);
        const eff = Math.round(priorities.efficiency || 5);
        
        // Create priority profile key
        if (speed >= 8) return 'speed_focused';
        if (range >= 8) return 'range_focused';
        if (eff >= 8) return 'efficiency_focused';
        if (accel >= 8) return 'performance';
        if (Math.abs(speed - range) <= 2 && Math.abs(speed - accel) <= 2) return 'balanced';
        
        return `s${speed}r${range}a${accel}e${eff}`;
    }
    
    /**
     * Hash conditions into a consistent string
     */
    hashConditions(conditions) {
        const temp = conditions.temperature || 70;
        const grade = conditions.grade || 0;
        const load = conditions.load || 0;
        
        // Categorize conditions
        if (temp < 45) return 'cold';
        if (temp > 85) return 'hot';
        if (grade > 6) return 'hills';
        if (load > 600) return 'loaded';
        if (temp >= 60 && temp <= 80 && grade <= 3 && load <= 200) return 'ideal';
        
        return `t${Math.round(temp/10)}g${Math.round(grade)}l${Math.round(load/100)}`;
    }
    
    /**
     * Compute optimization for caching
     */
    computeOptimization(vehicle, priority, condition) {
        // Use rule-based optimizer for computation
        const ruleOptimizer = window.ruleBasedOptimizer || new RuleBasedOptimizer();
        
        const vehicleData = { model: vehicle };
        const result = ruleOptimizer.optimize(vehicleData, priority, [], condition);
        
        // Add cache metadata
        result.cached = true;
        result.cacheGenerated = Date.now();
        result.method = 'pre_computed_cache';
        
        return result;
    }
    
    /**
     * Build lookup table for fast searches
     */
    buildLookupTable() {
        // Create reverse lookup by vehicle and priority type
        for (const [key, scenario] of this.scenarios.entries()) {
            const vehicle = scenario.vehicle;
            const priority = scenario.priority;
            
            if (!this.lookupTable.has(vehicle)) {
                this.lookupTable.set(vehicle, new Map());
            }
            
            if (!this.lookupTable.get(vehicle).has(priority)) {
                this.lookupTable.get(vehicle).set(priority, []);
            }
            
            this.lookupTable.get(vehicle).get(priority).push(key);
        }
    }
    
    /**
     * Get optimization from cache
     */
    getOptimization(vehicleData, priorities, conditions = {}) {
        // Try exact match first
        const exactKey = this.generateCacheKey(vehicleData, priorities, conditions);
        
        if (this.cache.has(exactKey)) {
            this.cacheHits++;
            const result = { ...this.cache.get(exactKey) };
            result.cacheHit = 'exact';
            return result;
        }
        
        // Try fuzzy match
        const fuzzyResult = this.findFuzzyMatch(vehicleData, priorities, conditions);
        if (fuzzyResult) {
            this.cacheHits++;
            fuzzyResult.cacheHit = 'fuzzy';
            return fuzzyResult;
        }
        
        // Try quick access scenarios
        const quickResult = this.findQuickMatch(vehicleData, priorities);
        if (quickResult) {
            this.cacheHits++;
            quickResult.cacheHit = 'quick';
            return quickResult;
        }
        
        this.cacheMisses++;
        return null;
    }
    
    /**
     * Find fuzzy match in cache
     */
    findFuzzyMatch(vehicleData, priorities, conditions) {
        const vehicle = vehicleData.model?.toLowerCase() || 'e4';
        const priorityType = this.hashPriorities(priorities);
        
        // Look for same vehicle and priority type with different conditions
        if (this.lookupTable.has(vehicle) && this.lookupTable.get(vehicle).has(priorityType)) {
            const candidates = this.lookupTable.get(vehicle).get(priorityType);
            
            // Find best condition match
            let bestMatch = null;
            let bestScore = 0;
            
            for (const candidateKey of candidates) {
                const score = this.calculateConditionSimilarity(candidateKey, conditions);
                if (score > bestScore) {
                    bestScore = score;
                    bestMatch = candidateKey;
                }
            }
            
            if (bestMatch && bestScore > 0.6) {
                const result = { ...this.cache.get(bestMatch) };
                result.confidence *= 0.9; // Slightly reduce confidence for fuzzy match
                return result;
            }
        }
        
        return null;
    }
    
    /**
     * Find quick access match
     */
    findQuickMatch(vehicleData, priorities) {
        const vehicle = vehicleData.model?.toLowerCase() || 'e4';
        const priorityType = this.hashPriorities(priorities);
        
        // Map priority types to quick scenarios
        const quickMappings = {
            'speed_focused': `quick_max_speed_${vehicle}`,
            'range_focused': `quick_max_range_${vehicle}`,
            'balanced': `quick_factory_default_${vehicle}`,
            'performance': `quick_max_speed_${vehicle}`,
            'efficiency_focused': `quick_max_range_${vehicle}`
        };
        
        const quickKey = quickMappings[priorityType];
        if (quickKey && this.cache.has(quickKey)) {
            const result = { ...this.cache.get(quickKey) };
            result.confidence *= 0.85; // Reduce confidence for quick match
            return result;
        }
        
        return null;
    }
    
    /**
     * Calculate similarity between conditions
     */
    calculateConditionSimilarity(cacheKey, targetConditions) {
        const scenario = this.scenarios.get(cacheKey);
        if (!scenario) return 0;
        
        // Simple similarity scoring
        let score = 1.0;
        
        const cached = this.parseConditionFromKey(cacheKey);
        const target = {
            temperature: targetConditions.temperature || 70,
            grade: targetConditions.grade || 0,
            load: targetConditions.load || 0
        };
        
        // Temperature similarity
        const tempDiff = Math.abs(cached.temperature - target.temperature);
        score *= Math.max(0, 1 - tempDiff / 50);
        
        // Grade similarity
        const gradeDiff = Math.abs(cached.grade - target.grade);
        score *= Math.max(0, 1 - gradeDiff / 10);
        
        // Load similarity
        const loadDiff = Math.abs(cached.load - target.load);
        score *= Math.max(0, 1 - loadDiff / 1000);
        
        return score;
    }
    
    /**
     * Parse conditions from cache key (reverse engineering)
     */
    parseConditionFromKey(key) {
        // Extract condition part from key and reverse the hashing
        const parts = key.split('_');
        const conditionPart = parts[parts.length - 1];
        
        // Default conditions for known condition types
        const knownConditions = {
            'ideal': { temperature: 70, grade: 0, load: 0 },
            'cold': { temperature: 35, grade: 0, load: 0 },
            'hot': { temperature: 95, grade: 0, load: 0 },
            'hills': { temperature: 70, grade: 8, load: 0 },
            'loaded': { temperature: 70, grade: 0, load: 800 }
        };
        
        return knownConditions[conditionPart] || { temperature: 70, grade: 0, load: 0 };
    }
    
    /**
     * Add new optimization to cache
     */
    addToCache(vehicleData, priorities, conditions, optimization) {
        const key = this.generateCacheKey(vehicleData, priorities, conditions);
        
        // Add cache metadata
        const cachedOptimization = {
            ...optimization,
            cached: true,
            cacheGenerated: Date.now(),
            method: 'runtime_cached'
        };
        
        this.cache.set(key, cachedOptimization);
        
        // Update scenario metadata
        this.scenarios.set(key, {
            vehicle: vehicleData.model?.toLowerCase() || 'unknown',
            priority: this.hashPriorities(priorities),
            condition: this.hashConditions(conditions),
            timestamp: Date.now(),
            userGenerated: true
        });
        
        // Limit cache size
        if (this.cache.size > 1000) {
            this.pruneCache();
        }
    }
    
    /**
     * Prune old cache entries
     */
    pruneCache() {
        const now = Date.now();
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours
        
        for (const [key, scenario] of this.scenarios.entries()) {
            if (scenario.userGenerated && now - scenario.timestamp > maxAge) {
                this.cache.delete(key);
                this.scenarios.delete(key);
            }
        }
        
        console.log('Cache pruned, size:', this.cache.size);
    }
    
    /**
     * Estimate performance for quick scenarios
     */
    estimatePerformance(settings, vehicle) {
        // Simple performance estimation based on settings
        const mphScaling = settings[1] || 22;
        const maxCurrent = settings[4] || 245;
        const acceleration = settings[6] || 60;
        const regen = settings[9] || 225;
        
        return {
            speed: Math.min(25, mphScaling * 1.1),
            range: Math.max(15, 40 - (maxCurrent - 200) * 0.08),
            efficiency: Math.max(60, 85 - (maxCurrent - 200) * 0.1),
            acceleration: Math.max(5, 12 - (acceleration - 40) * 0.05)
        };
    }
    
    /**
     * Generate recommendations for quick scenarios
     */
    generateQuickRecommendations(scenarioName) {
        const recommendations = {
            'factory_default_e4': [
                'Factory default settings provide balanced performance',
                'Good starting point for most driving conditions'
            ],
            'max_speed_e4': [
                'Optimized for maximum speed performance',
                'Monitor motor temperature during extended high-speed operation',
                'Range will be reduced compared to default settings'
            ],
            'max_range_e4': [
                'Optimized for maximum driving range',
                'Use gentle acceleration for best results',
                'Top speed will be limited to conserve energy'
            ],
            'winter_e4': [
                'Cold weather optimizations applied',
                'Allow extra time for battery warm-up',
                'Performance may improve as battery warms'
            ],
            'hill_climber_e4': [
                'Enhanced settings for hill climbing',
                'Monitor motor temperature on long climbs',
                'Excellent regenerative braking on descents'
            ]
        };
        
        return recommendations[scenarioName] || ['Pre-computed optimization applied'];
    }
    
    /**
     * Get available quick scenarios
     */
    getQuickScenarios(vehicle = 'e4') {
        const scenarios = [];
        
        for (const [key, scenario] of this.scenarios.entries()) {
            if (scenario.quickAccess && scenario.vehicle === vehicle) {
                scenarios.push({
                    key: key,
                    name: scenario.priority,
                    description: this.getScenarioDescription(scenario.priority),
                    vehicle: scenario.vehicle
                });
            }
        }
        
        return scenarios;
    }
    
    /**
     * Get scenario description
     */
    getScenarioDescription(scenarioName) {
        const descriptions = {
            'factory_default_e4': 'Balanced factory settings',
            'max_speed_e4': 'Maximum speed performance',
            'max_range_e4': 'Maximum driving range',
            'winter_e4': 'Cold weather optimization',
            'hill_climber_e4': 'Hill climbing performance'
        };
        
        return descriptions[scenarioName] || 'Custom optimization';
    }
    
    /**
     * Get cache statistics
     */
    getCacheStats() {
        const hitRate = this.cacheHits + this.cacheMisses > 0 ? 
            (this.cacheHits / (this.cacheHits + this.cacheMisses)) * 100 : 0;
        
        return {
            size: this.cache.size,
            scenarios: this.scenarios.size,
            cacheHits: this.cacheHits,
            cacheMisses: this.cacheMisses,
            hitRate: Math.round(hitRate * 100) / 100,
            memoryUsage: this.estimateMemoryUsage()
        };
    }
    
    /**
     * Estimate memory usage
     */
    estimateMemoryUsage() {
        const sampleEntry = Array.from(this.cache.values())[0];
        if (!sampleEntry) return 0;
        
        const entrySize = JSON.stringify(sampleEntry).length;
        return Math.round((entrySize * this.cache.size) / 1024); // KB
    }
    
    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
        this.scenarios.clear();
        this.lookupTable.clear();
        this.cacheHits = 0;
        this.cacheMisses = 0;
        
        // Regenerate essential cache
        this.generateCommonOptimizations();
        this.buildLookupTable();
        
        console.log('Cache cleared and regenerated');
    }
}

// Create global instance
window.optimizationCache = new OptimizationCache();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OptimizationCache;
}
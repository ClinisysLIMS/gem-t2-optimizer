/**
 * Natural Language Processing Module for GEM Optimizer
 * Processes natural language queries and extracts optimization parameters
 */

import natural from 'natural';
import nlp from 'compromise';
import chrono from 'chrono-node';

export class NLPProcessor {
    constructor() {
        this.stemmer = natural.PorterStemmer;
        this.tokenizer = new natural.WordTokenizer();
        this.sentiment = new natural.SentimentAnalyzer('English', 
            natural.PorterStemmer, []);
        
        // Initialize patterns and vocabularies
        this.initializePatterns();
        this.initializeVocabulary();
    }
    
    /**
     * Initialize pattern matching for GEM optimization queries
     */
    initializePatterns() {
        this.patterns = {
            // Vehicle types
            vehicleTypes: {
                'e2': ['e2', '2 passenger', 'two passenger', 'compact'],
                'e4': ['e4', '4 passenger', 'four passenger', 'standard'],
                'e6': ['e6', '6 passenger', 'six passenger', 'large'],
                'eS': ['eS', 'short utility', 'utility short', 'work cart'],
                'eL': ['eL', 'long utility', 'utility long', 'cargo'],
                'elXD': ['elXD', 'extra duty', 'heavy duty', 'industrial']
            },
            
            // Trip types
            tripTypes: {
                'camping': ['camp', 'camping', 'outdoor', 'wilderness', 'tent'],
                'touring': ['tour', 'touring', 'sightseeing', 'scenic', 'drive'],
                'parade': ['parade', 'festival', 'celebration', 'procession'],
                'beach': ['beach', 'coastal', 'seaside', 'ocean', 'sand'],
                'mountains': ['mountain', 'hills', 'elevation', 'steep', 'climbing'],
                'shopping': ['shop', 'shopping', 'mall', 'store', 'errands'],
                'family': ['family', 'kids', 'children', 'relatives'],
                'photography': ['photo', 'photography', 'pictures', 'scenic']
            },
            
            // Terrain types
            terrainTypes: {
                'flat': ['flat', 'level', 'smooth', 'paved', 'easy'],
                'hilly': ['hill', 'hilly', 'rolling', 'moderate', 'undulating'],
                'steep': ['steep', 'mountain', 'climb', 'grade', 'incline'],
                'mixed': ['mixed', 'varied', 'combination', 'different']
            },
            
            // Weather conditions
            weatherConditions: {
                'hot': ['hot', 'warm', 'summer', 'heat', 'sunny'],
                'cold': ['cold', 'winter', 'freeze', 'snow', 'ice'],
                'rainy': ['rain', 'wet', 'storm', 'precipitation'],
                'windy': ['wind', 'windy', 'breezy', 'gusty']
            },
            
            // Optimization priorities
            priorities: {
                'range': ['range', 'distance', 'efficiency', 'battery', 'mileage'],
                'speed': ['speed', 'fast', 'quick', 'velocity', 'mph'],
                'acceleration': ['acceleration', 'pickup', 'responsive', 'quick start'],
                'hillClimbing': ['hill', 'climb', 'uphill', 'grade', 'slope', 'mountain'],
                'regen': ['regen', 'regenerative', 'braking', 'recovery', 'charging']
            },
            
            // Load descriptions
            loadTypes: {
                'light': ['light', 'minimal', 'personal', 'basic'],
                'medium': ['medium', 'moderate', 'average', 'normal'],
                'heavy': ['heavy', 'full', 'loaded', 'maximum', 'cargo']
            }
        };
    }
    
    /**
     * Initialize vocabulary for intent classification
     */
    initializeVocabulary() {
        this.intents = {
            'optimize': ['optimize', 'tune', 'adjust', 'configure', 'set', 'improve'],
            'plan_trip': ['plan', 'trip', 'journey', 'travel', 'go to', 'visit'],
            'get_weather': ['weather', 'forecast', 'temperature', 'conditions'],
            'analyze_terrain': ['terrain', 'elevation', 'grade', 'route', 'path'],
            'compare': ['compare', 'versus', 'vs', 'difference', 'better'],
            'recommend': ['recommend', 'suggest', 'advise', 'best', 'ideal']
        };
        
        this.locations = [
            'yosemite', 'san francisco', 'los angeles', 'san diego', 'sacramento',
            'lake tahoe', 'monterey', 'big sur', 'napa valley', 'santa barbara',
            'death valley', 'sequoia', 'joshua tree', 'marin county'
        ];
    }
    
    /**
     * Process natural language query and extract structured parameters
     * @param {string} query - Natural language query
     * @returns {Object} Structured parameters for optimization
     */
    processQuery(query) {
        const normalizedQuery = query.toLowerCase().trim();
        const tokens = this.tokenizer.tokenize(normalizedQuery);
        const doc = nlp(query);
        
        const result = {
            intent: this.extractIntent(normalizedQuery, tokens),
            vehicle: this.extractVehicleInfo(normalizedQuery, doc),
            trip: this.extractTripInfo(normalizedQuery, doc),
            terrain: this.extractTerrainInfo(normalizedQuery, tokens),
            weather: this.extractWeatherInfo(normalizedQuery, tokens),
            priorities: this.extractPriorities(normalizedQuery, tokens),
            load: this.extractLoadInfo(normalizedQuery, tokens),
            dates: this.extractDates(query),
            location: this.extractLocation(normalizedQuery, doc),
            confidence: 0.0,
            originalQuery: query
        };
        
        result.confidence = this.calculateConfidence(result, tokens);
        
        return result;
    }
    
    /**
     * Extract intent from query
     */
    extractIntent(query, tokens) {
        const intents = [];
        
        for (const [intent, keywords] of Object.entries(this.intents)) {
            const matches = keywords.filter(keyword => 
                query.includes(keyword) || tokens.includes(keyword)
            );
            if (matches.length > 0) {
                intents.push({
                    name: intent,
                    confidence: matches.length / keywords.length,
                    matches
                });
            }
        }
        
        // Sort by confidence and return highest
        intents.sort((a, b) => b.confidence - a.confidence);
        return intents.length > 0 ? intents[0].name : 'optimize';
    }
    
    /**
     * Extract vehicle information
     */
    extractVehicleInfo(query, doc) {
        const vehicle = {
            model: null,
            passengerCount: null,
            condition: 'good'
        };
        
        // Extract vehicle model
        for (const [model, patterns] of Object.entries(this.patterns.vehicleTypes)) {
            if (patterns.some(pattern => query.includes(pattern))) {
                vehicle.model = model;
                break;
            }
        }
        
        // Extract passenger count from numbers
        const numbers = doc.numbers().out('array');
        const passengerKeywords = ['passenger', 'people', 'person', 'seat'];
        
        for (const num of numbers) {
            if (passengerKeywords.some(keyword => 
                query.includes(`${num} ${keyword}`) || 
                query.includes(`${keyword} ${num}`)
            )) {
                vehicle.passengerCount = parseInt(num);
                break;
            }
        }
        
        // Extract condition keywords
        if (query.includes('old') || query.includes('worn')) {
            vehicle.condition = 'fair';
        } else if (query.includes('new') || query.includes('excellent')) {
            vehicle.condition = 'good';
        }
        
        return vehicle;
    }
    
    /**
     * Extract trip information
     */
    extractTripInfo(query, doc) {
        const trip = {
            type: null,
            duration: null,
            groupSize: null,
            purpose: null
        };
        
        // Extract trip type
        for (const [type, patterns] of Object.entries(this.patterns.tripTypes)) {
            if (patterns.some(pattern => query.includes(pattern))) {
                trip.type = type;
                break;
            }
        }
        
        // Extract duration
        const timeExpressions = ['day', 'days', 'week', 'weekend', 'hour', 'hours'];
        const numbers = doc.numbers().out('array');
        
        for (const expr of timeExpressions) {
            if (query.includes(expr)) {
                const match = query.match(new RegExp(`(\\d+)\\s*${expr}`));
                if (match) {
                    trip.duration = {
                        value: parseInt(match[1]),
                        unit: expr
                    };
                }
                break;
            }
        }
        
        // Special case for weekend
        if (query.includes('weekend')) {
            trip.duration = { value: 2, unit: 'days' };
        }
        
        // Extract group size
        const groupKeywords = ['group', 'family', 'people', 'passengers'];
        for (const num of numbers) {
            if (groupKeywords.some(keyword => 
                query.includes(`${num} ${keyword}`) || 
                query.includes(`${keyword} ${num}`)
            )) {
                trip.groupSize = parseInt(num);
                break;
            }
        }
        
        return trip;
    }
    
    /**
     * Extract terrain information
     */
    extractTerrainInfo(query, tokens) {
        const terrain = {
            type: null,
            difficulty: null,
            surface: null
        };
        
        // Extract terrain type
        for (const [type, patterns] of Object.entries(this.patterns.terrainTypes)) {
            if (patterns.some(pattern => query.includes(pattern))) {
                terrain.type = type;
                break;
            }
        }
        
        // Extract surface type
        const surfaces = ['paved', 'gravel', 'dirt', 'sand', 'concrete'];
        for (const surface of surfaces) {
            if (query.includes(surface)) {
                terrain.surface = surface;
                break;
            }
        }
        
        // Extract difficulty indicators
        if (query.includes('difficult') || query.includes('challenging')) {
            terrain.difficulty = 'hard';
        } else if (query.includes('easy') || query.includes('simple')) {
            terrain.difficulty = 'easy';
        } else if (query.includes('moderate')) {
            terrain.difficulty = 'moderate';
        }
        
        return terrain;
    }
    
    /**
     * Extract weather information
     */
    extractWeatherInfo(query, tokens) {
        const weather = {
            conditions: null,
            temperature: null,
            season: null
        };
        
        // Extract weather conditions
        for (const [condition, patterns] of Object.entries(this.patterns.weatherConditions)) {
            if (patterns.some(pattern => query.includes(pattern))) {
                weather.conditions = condition;
                break;
            }
        }
        
        // Extract season
        const seasons = ['spring', 'summer', 'fall', 'autumn', 'winter'];
        for (const season of seasons) {
            if (query.includes(season)) {
                weather.season = season;
                break;
            }
        }
        
        // Extract temperature if mentioned
        const tempMatch = query.match(/(\d+)\s*(?:degrees?|°|f|fahrenheit)/i);
        if (tempMatch) {
            weather.temperature = parseInt(tempMatch[1]);
        }
        
        return weather;
    }
    
    /**
     * Extract optimization priorities
     */
    extractPriorities(query, tokens) {
        const priorities = {};
        
        for (const [priority, keywords] of Object.entries(this.patterns.priorities)) {
            const matches = keywords.filter(keyword => 
                query.includes(keyword) || tokens.includes(keyword)
            );
            
            if (matches.length > 0) {
                // Determine priority level based on context
                let level = 5; // default
                
                if (query.includes('maximize') || query.includes('most important')) {
                    level = 10;
                } else if (query.includes('important') || query.includes('focus')) {
                    level = 8;
                } else if (query.includes('minimize') || query.includes('not important')) {
                    level = 2;
                } else if (query.includes('moderate') || query.includes('balanced')) {
                    level = 5;
                }
                
                priorities[priority] = level;
            }
        }
        
        return priorities;
    }
    
    /**
     * Extract load information
     */
    extractLoadInfo(query, tokens) {
        const load = {
            type: null,
            cargoDescription: null
        };
        
        // Extract load type
        for (const [type, patterns] of Object.entries(this.patterns.loadTypes)) {
            if (patterns.some(pattern => query.includes(pattern))) {
                load.type = type;
                break;
            }
        }
        
        // Extract cargo descriptions
        const cargoKeywords = ['cargo', 'luggage', 'equipment', 'gear', 'supplies'];
        for (const keyword of cargoKeywords) {
            if (query.includes(keyword)) {
                load.cargoDescription = keyword;
                break;
            }
        }
        
        return load;
    }
    
    /**
     * Extract dates and times using chrono-node
     */
    extractDates(query) {
        const results = chrono.parse(query);
        const dates = {};
        
        if (results.length > 0) {
            const firstDate = results[0];
            dates.start = firstDate.start.date();
            
            if (firstDate.end) {
                dates.end = firstDate.end.date();
            }
            
            // Check for relative dates
            if (query.includes('next weekend')) {
                const nextWeekend = this.getNextWeekend();
                dates.start = nextWeekend.start;
                dates.end = nextWeekend.end;
            }
        }
        
        return dates;
    }
    
    /**
     * Extract location information
     */
    extractLocation(query, doc) {
        const locations = {
            start: null,
            destination: null,
            waypoints: []
        };
        
        // Extract known locations
        for (const location of this.locations) {
            if (query.includes(location)) {
                if (query.includes('to ' + location) || query.includes('going to ' + location)) {
                    locations.destination = location;
                } else if (query.includes('from ' + location)) {
                    locations.start = location;
                } else {
                    locations.destination = location; // Default to destination
                }
            }
        }
        
        // Extract places using NLP
        const places = doc.places().out('array');
        if (places.length > 0 && !locations.destination) {
            locations.destination = places[0];
        }
        
        return locations;
    }
    
    /**
     * Calculate confidence score for the extracted parameters
     */
    calculateConfidence(result, tokens) {
        let score = 0;
        let factors = 0;
        
        // Intent confidence
        if (result.intent) {
            score += 0.2;
            factors++;
        }
        
        // Vehicle info confidence
        if (result.vehicle.model) {
            score += 0.15;
            factors++;
        }
        
        // Trip info confidence
        if (result.trip.type) {
            score += 0.15;
            factors++;
        }
        
        // Location confidence
        if (result.location.destination) {
            score += 0.15;
            factors++;
        }
        
        // Priorities confidence
        if (Object.keys(result.priorities).length > 0) {
            score += 0.1;
            factors++;
        }
        
        // Dates confidence
        if (result.dates.start) {
            score += 0.1;
            factors++;
        }
        
        // Terrain/weather confidence
        if (result.terrain.type || result.weather.conditions) {
            score += 0.1;
            factors++;
        }
        
        // Load confidence
        if (result.load.type) {
            score += 0.05;
            factors++;
        }
        
        return factors > 0 ? score / factors : 0;
    }
    
    /**
     * Get next weekend dates
     */
    getNextWeekend() {
        const now = new Date();
        const daysUntilSaturday = (6 - now.getDay()) % 7;
        const saturday = new Date(now);
        saturday.setDate(now.getDate() + daysUntilSaturday);
        
        const sunday = new Date(saturday);
        sunday.setDate(saturday.getDate() + 1);
        
        return {
            start: saturday,
            end: sunday
        };
    }
    
    /**
     * Generate suggestions for incomplete queries
     */
    generateSuggestions(result) {
        const suggestions = [];
        
        if (!result.vehicle.model) {
            suggestions.push("What type of GEM vehicle do you have? (e2, e4, e6, eS, eL, elXD)");
        }
        
        if (!result.location.destination && result.intent === 'plan_trip') {
            suggestions.push("Where would you like to go?");
        }
        
        if (!result.trip.type && result.intent === 'plan_trip') {
            suggestions.push("What type of trip is this? (camping, touring, parade, etc.)");
        }
        
        if (Object.keys(result.priorities).length === 0) {
            suggestions.push("What's most important: range, speed, hill climbing, or acceleration?");
        }
        
        return suggestions;
    }
}

export default NLPProcessor;
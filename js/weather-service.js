/**
 * Weather Service - OpenWeatherMap API Integration
 * Provides real weather data for trip planning optimization
 */
class WeatherService {
    constructor() {
        // Initialize secure storage
        this.secureStorage = window.secureStorage || (window.secureStorage = new SecureStorage());
        
        this.apiKey = this.getStoredApiKey() || '';
        this.baseUrl = 'https://api.openweathermap.org/data/2.5';
        this.geocodingUrl = 'https://api.openweathermap.org/geo/1.0';
        this.cache = new Map();
        this.cacheTimeout = 10 * 60 * 1000; // 10 minutes
        
        // Rate limiting
        this.requestQueue = [];
        this.isProcessingQueue = false;
        this.maxRequestsPerMinute = 60; // Free tier limit
        this.requestTimestamps = [];
    }
    
    /**
     * Set API key and store it
     * @param {string} apiKey - OpenWeatherMap API key
     */
    setApiKey(apiKey) {
        this.apiKey = apiKey;
        try {
            if (apiKey && apiKey.trim()) {
                this.secureStorage.setItem('api_openweather', apiKey.trim());
            } else {
                this.secureStorage.removeItem('api_openweather');
            }
        } catch (error) {
            console.warn('Could not store API key:', error);
        }
    }
    
    /**
     * Get stored API key from secure storage
     * @returns {string|null} Stored API key
     */
    getStoredApiKey() {
        try {
            // First try secure storage
            const secureKey = this.secureStorage.getItem('api_openweather');
            if (secureKey) return secureKey;
            
            // Fallback to old storage and migrate
            const oldKey = localStorage.getItem('weather-api-key');
            if (oldKey) {
                this.setApiKey(oldKey); // This will store it securely
                localStorage.removeItem('weather-api-key'); // Remove old key
                return oldKey;
            }
            
            return null;
        } catch (error) {
            console.warn('Could not retrieve API key:', error);
            return null;
        }
    }
    
    /**
     * Check if API key is configured
     * @returns {boolean} True if API key is set
     */
    isConfigured() {
        return !!this.apiKey && this.apiKey.length > 0;
    }
    
    /**
     * Geocode a location to get coordinates
     * @param {string} location - Location name (city, state, country)
     * @returns {Promise<Object>} Coordinates and location info
     */
    async geocodeLocation(location) {
        // Try API integration layer first if available
        if (window.apiIntegration && !this.isConfigured()) {
            try {
                const weather = await window.apiIntegration.getWeather(location);
                return {
                    name: location,
                    country: 'US',
                    state: '',
                    lat: 0, // Placeholder
                    lon: 0, // Placeholder
                    isFallback: true
                };
            } catch (error) {
                console.warn('API integration fallback failed:', error);
            }
        }
        
        if (!this.isConfigured()) {
            throw new Error('Weather API key not configured');
        }
        
        const cacheKey = `geocode:${location.toLowerCase()}`;
        const cached = this.getFromCache(cacheKey);
        if (cached) {
            return cached;
        }
        
        const url = `${this.geocodingUrl}/direct?q=${encodeURIComponent(location)}&limit=1&appid=${this.apiKey}`;
        
        try {
            const response = await this.makeRequest(url);
            
            if (!response.ok) {
                throw new Error(`Geocoding failed: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data.length === 0) {
                throw new Error(`Location not found: ${location}`);
            }
            
            const result = {
                lat: data[0].lat,
                lon: data[0].lon,
                name: data[0].name,
                state: data[0].state,
                country: data[0].country,
                displayName: `${data[0].name}${data[0].state ? ', ' + data[0].state : ''}, ${data[0].country}`
            };
            
            this.setCache(cacheKey, result);
            return result;
            
        } catch (error) {
            console.error('Geocoding error:', error);
            throw error;
        }
    }
    
    /**
     * Get current weather for coordinates or location string
     * @param {number|string} lat - Latitude or location string
     * @param {number} lon - Longitude (if lat is number)
     * @returns {Promise<Object>} Current weather data
     */
    async getCurrentWeather(lat, lon) {
        // Handle location string input
        if (typeof lat === 'string') {
            try {
                const coords = await this.geocodeLocation(lat);
                return await this.getCurrentWeather(coords.lat, coords.lon);
            } catch (error) {
                console.warn('Geocoding failed, using fallback weather');
                return this.getFallbackWeather(lat, new Date());
            }
        }
        
        if (!this.isConfigured()) {
            console.warn('Weather API key not configured, using fallback');
            return this.getFallbackWeather(`${lat},${lon}`, new Date());
        }
        
        const cacheKey = `current:${lat},${lon}`;
        const cached = this.getFromCache(cacheKey);
        if (cached) {
            return cached;
        }
        
        const url = `${this.baseUrl}/weather?lat=${lat}&lon=${lon}&appid=${this.apiKey}&units=imperial`;
        
        try {
            const response = await this.makeRequest(url);
            
            if (!response.ok) {
                throw new Error(`Weather API failed: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            const result = this.formatWeatherData(data);
            
            this.setCache(cacheKey, result, 5 * 60 * 1000); // Cache for 5 minutes
            return result;
            
        } catch (error) {
            console.error('Current weather error:', error);
            return this.getFallbackWeather(`${lat},${lon}`, new Date());
        }
    }
    
    /**
     * Get real-time weather conditions that affect vehicle settings
     * @param {string|number} location - Location string or latitude
     * @param {number} lon - Longitude (if location is latitude)
     * @returns {Promise<Object>} Weather conditions affecting vehicle performance
     */
    async getPerformanceWeather(location, lon) {
        try {
            const weather = await this.getCurrentWeather(location, lon);
            
            // Calculate performance impact factors
            const performanceImpact = this.calculatePerformanceImpact(weather);
            
            return {
                ...weather,
                performanceImpact,
                recommendations: this.generateWeatherRecommendations(weather, performanceImpact)
            };
            
        } catch (error) {
            console.error('Performance weather error:', error);
            return this.getFallbackPerformanceWeather();
        }
    }
    
    /**
     * Calculate how weather affects vehicle performance
     * @param {Object} weather - Weather data
     * @returns {Object} Performance impact analysis
     */
    calculatePerformanceImpact(weather) {
        const impact = {
            temperature: this.analyzeTemperatureImpact(weather.temperature),
            humidity: this.analyzeHumidityImpact(weather.humidity),
            wind: this.analyzeWindImpact(weather.wind),
            precipitation: this.analyzePrecipitationImpact(weather.precipitation || 0),
            overall: 'normal'
        };
        
        // Calculate overall impact
        const factors = [impact.temperature, impact.humidity, impact.wind, impact.precipitation];
        const severeCounts = factors.filter(f => f.severity === 'severe').length;
        const moderateCounts = factors.filter(f => f.severity === 'moderate').length;
        
        if (severeCounts > 0) {
            impact.overall = 'severe';
        } else if (moderateCounts >= 2) {
            impact.overall = 'moderate';
        } else if (moderateCounts >= 1) {
            impact.overall = 'minor';
        }
        
        return impact;
    }
    
    analyzeTemperatureImpact(temperature) {
        if (temperature < 32) {
            return {
                severity: 'severe',
                factor: 'freezing',
                impact: 'Reduced battery capacity, increased current draw',
                adjustment: { current: +20, acceleration: -10, tempLimit: -2 }
            };
        } else if (temperature < 50) {
            return {
                severity: 'moderate',
                factor: 'cold',
                impact: 'Reduced battery efficiency, slower acceleration',
                adjustment: { current: +10, acceleration: -5, tempLimit: -1 }
            };
        } else if (temperature > 95) {
            return {
                severity: 'severe',
                factor: 'extreme_heat',
                impact: 'Overheating risk, reduced performance',
                adjustment: { current: -15, deceleration: +10, tempLimit: +2 }
            };
        } else if (temperature > 85) {
            return {
                severity: 'moderate',
                factor: 'hot',
                impact: 'Increased cooling needs, thermal stress',
                adjustment: { current: -8, deceleration: +5, tempLimit: +1 }
            };
        }
        
        return {
            severity: 'none',
            factor: 'optimal',
            impact: 'Optimal temperature conditions',
            adjustment: {}
        };
    }
    
    analyzeHumidityImpact(humidity) {
        if (humidity > 90) {
            return {
                severity: 'moderate',
                factor: 'high_humidity',
                impact: 'Increased electrical resistance, corrosion risk',
                adjustment: { regen: +5 }
            };
        } else if (humidity < 20) {
            return {
                severity: 'minor',
                factor: 'low_humidity',
                impact: 'Static electricity buildup risk',
                adjustment: {}
            };
        }
        
        return {
            severity: 'none',
            factor: 'normal',
            impact: 'Normal humidity conditions',
            adjustment: {}
        };
    }
    
    analyzeWindImpact(wind) {
        const windSpeed = wind.speed || 0;
        
        if (windSpeed > 25) {
            return {
                severity: 'severe',
                factor: 'high_wind',
                impact: 'Significant drag increase, stability concerns',
                adjustment: { speed: -10, current: +15 }
            };
        } else if (windSpeed > 15) {
            return {
                severity: 'moderate',
                factor: 'moderate_wind',
                impact: 'Increased power consumption from drag',
                adjustment: { speed: -5, current: +8 }
            };
        }
        
        return {
            severity: 'none',
            factor: 'calm',
            impact: 'Minimal wind resistance',
            adjustment: {}
        };
    }
    
    analyzePrecipitationImpact(precipitation) {
        if (precipitation > 0.5) {
            return {
                severity: 'severe',
                factor: 'heavy_rain',
                impact: 'Reduced traction, visibility, electrical risks',
                adjustment: { speed: -15, acceleration: -15, deceleration: +10 }
            };
        } else if (precipitation > 0.1) {
            return {
                severity: 'moderate',
                factor: 'light_rain',
                impact: 'Reduced traction, increased stopping distance',
                adjustment: { speed: -5, acceleration: -8, deceleration: +5 }
            };
        }
        
        return {
            severity: 'none',
            factor: 'dry',
            impact: 'Optimal traction conditions',
            adjustment: {}
        };
    }
    
    /**
     * Generate weather-based recommendations
     * @param {Object} weather - Weather data
     * @param {Object} impact - Performance impact analysis
     * @returns {Array} Array of recommendations
     */
    generateWeatherRecommendations(weather, impact) {
        const recommendations = [];
        
        if (impact.temperature.severity !== 'none') {
            recommendations.push({
                type: 'temperature',
                priority: impact.temperature.severity,
                message: impact.temperature.impact,
                action: 'Adjust current and temperature settings based on conditions'
            });
        }
        
        if (impact.wind.severity !== 'none') {
            recommendations.push({
                type: 'wind',
                priority: impact.wind.severity,
                message: impact.wind.impact,
                action: 'Reduce speed and increase power for wind resistance'
            });
        }
        
        if (impact.precipitation.severity !== 'none') {
            recommendations.push({
                type: 'precipitation',
                priority: impact.precipitation.severity,
                message: impact.precipitation.impact,
                action: 'Enable conservative driving mode for safety'
            });
        }
        
        // Add general recommendations
        if (weather.temperature < 50) {
            recommendations.push({
                type: 'cold_weather',
                priority: 'moderate',
                message: 'Cold weather reduces battery performance',
                action: 'Allow extra warm-up time and monitor battery levels'
            });
        }
        
        if (weather.temperature > 85) {
            recommendations.push({
                type: 'hot_weather',
                priority: 'moderate',
                message: 'High temperature increases overheating risk',
                action: 'Take breaks to allow cooling and monitor motor temperature'
            });
        }
        
        return recommendations;
    }
    
    /**
     * Get fallback performance weather when API is unavailable
     * @returns {Object} Fallback performance weather data
     */
    getFallbackPerformanceWeather() {
        const fallbackWeather = this.getFallbackWeather('Unknown', new Date());
        
        return {
            ...fallbackWeather,
            performanceImpact: {
                temperature: { severity: 'none', factor: 'unknown', impact: 'Unknown conditions', adjustment: {} },
                humidity: { severity: 'none', factor: 'unknown', impact: 'Unknown conditions', adjustment: {} },
                wind: { severity: 'none', factor: 'unknown', impact: 'Unknown conditions', adjustment: {} },
                precipitation: { severity: 'none', factor: 'unknown', impact: 'Unknown conditions', adjustment: {} },
                overall: 'unknown'
            },
            recommendations: [{
                type: 'no_data',
                priority: 'minor',
                message: 'Weather data unavailable',
                action: 'Use conservative settings until weather conditions are known'
            }]
        };
    }
    
    /**
     * Get 5-day weather forecast
     * @param {number} lat - Latitude
     * @param {number} lon - Longitude
     * @returns {Promise<Object>} Weather forecast data
     */
    async getForecast(lat, lon) {
        if (!this.isConfigured()) {
            throw new Error('Weather API key not configured');
        }
        
        const cacheKey = `forecast:${lat},${lon}`;
        const cached = this.getFromCache(cacheKey);
        if (cached) {
            return cached;
        }
        
        const url = `${this.baseUrl}/forecast?lat=${lat}&lon=${lon}&appid=${this.apiKey}&units=imperial`;
        
        try {
            const response = await this.makeRequest(url);
            
            if (!response.ok) {
                throw new Error(`Forecast API failed: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            const result = this.formatForecastData(data);
            
            this.setCache(cacheKey, result);
            return result;
            
        } catch (error) {
            console.error('Forecast error:', error);
            throw error;
        }
    }
    
    /**
     * Get weather for a specific location and date
     * @param {string} location - Location name
     * @param {string|Date} date - Target date
     * @returns {Promise<Object>} Weather data for the date
     */
    async getWeatherForDate(location, date) {
        try {
            // Geocode location
            const coords = await this.geocodeLocation(location);
            
            // Determine if we need current weather or forecast
            const targetDate = new Date(date);
            const now = new Date();
            const daysFromNow = Math.ceil((targetDate - now) / (1000 * 60 * 60 * 24));
            
            if (daysFromNow <= 0) {
                // Past or today - get current weather
                return await this.getCurrentWeather(coords.lat, coords.lon);
            } else if (daysFromNow <= 5) {
                // Within 5 days - get forecast
                const forecast = await this.getForecast(coords.lat, coords.lon);
                return this.extractDateFromForecast(forecast, targetDate);
            } else {
                // Beyond 5 days - return historical average/estimate
                return this.generateHistoricalEstimate(coords, targetDate);
            }
            
        } catch (error) {
            console.error('Weather for date error:', error);
            // Return fallback data
            return this.getFallbackWeather(location, date);
        }
    }
    
    /**
     * Format raw weather API data into standardized format
     * @param {Object} data - Raw API response
     * @returns {Object} Formatted weather data
     */
    formatWeatherData(data) {
        return {
            temperature: Math.round(data.main.temp),
            feelsLike: Math.round(data.main.feels_like),
            humidity: data.main.humidity,
            pressure: data.main.pressure,
            conditions: data.weather[0].main,
            description: data.weather[0].description,
            cloudiness: data.clouds.all,
            precipitation: this.calculatePrecipitation(data),
            wind: {
                speed: Math.round(data.wind?.speed || 0),
                direction: this.getWindDirection(data.wind?.deg || 0),
                gust: Math.round(data.wind?.gust || 0)
            },
            visibility: data.visibility ? Math.round(data.visibility / 1609.34) : null, // Convert to miles
            sunrise: new Date(data.sys.sunrise * 1000),
            sunset: new Date(data.sys.sunset * 1000),
            location: {
                name: data.name,
                country: data.sys.country
            },
            timestamp: new Date(data.dt * 1000),
            source: 'openweathermap'
        };
    }
    
    /**
     * Format forecast data
     * @param {Object} data - Raw forecast API response
     * @returns {Object} Formatted forecast data
     */
    formatForecastData(data) {
        const dailyForecasts = this.groupForecastByDay(data.list);
        
        return {
            location: {
                name: data.city.name,
                country: data.city.country,
                coordinates: {
                    lat: data.city.coord.lat,
                    lon: data.city.coord.lon
                }
            },
            daily: dailyForecasts,
            source: 'openweathermap'
        };
    }
    
    /**
     * Group 3-hour forecast data into daily summaries
     * @param {Array} forecastList - 3-hour forecast data points
     * @returns {Array} Daily forecast summaries
     */
    groupForecastByDay(forecastList) {
        const dailyData = {};
        
        forecastList.forEach(item => {
            const date = new Date(item.dt * 1000);
            const dateKey = date.toISOString().split('T')[0];
            
            if (!dailyData[dateKey]) {
                dailyData[dateKey] = {
                    date: dateKey,
                    temps: [],
                    conditions: [],
                    precipitation: 0,
                    wind: [],
                    humidity: [],
                    pressure: []
                };
            }
            
            dailyData[dateKey].temps.push(item.main.temp);
            dailyData[dateKey].conditions.push(item.weather[0].main);
            dailyData[dateKey].precipitation += this.calculatePrecipitation(item);
            dailyData[dateKey].wind.push(item.wind?.speed || 0);
            dailyData[dateKey].humidity.push(item.main.humidity);
            dailyData[dateKey].pressure.push(item.main.pressure);
        });
        
        // Convert to daily summaries
        return Object.values(dailyData).map(day => ({
            date: day.date,
            temperature: {
                min: Math.round(Math.min(...day.temps)),
                max: Math.round(Math.max(...day.temps)),
                avg: Math.round(day.temps.reduce((a, b) => a + b, 0) / day.temps.length)
            },
            conditions: this.getMostCommonCondition(day.conditions),
            precipitation: Math.round(day.precipitation * 100) / 100,
            wind: {
                avg: Math.round(day.wind.reduce((a, b) => a + b, 0) / day.wind.length),
                max: Math.round(Math.max(...day.wind))
            },
            humidity: Math.round(day.humidity.reduce((a, b) => a + b, 0) / day.humidity.length),
            pressure: Math.round(day.pressure.reduce((a, b) => a + b, 0) / day.pressure.length)
        }));
    }
    
    /**
     * Extract weather data for a specific date from forecast
     * @param {Object} forecast - Forecast data
     * @param {Date} targetDate - Target date
     * @returns {Object} Weather data for the date
     */
    extractDateFromForecast(forecast, targetDate) {
        const targetDateStr = targetDate.toISOString().split('T')[0];
        const dayData = forecast.daily.find(day => day.date === targetDateStr);
        
        if (!dayData) {
            throw new Error(`No forecast data available for ${targetDateStr}`);
        }
        
        return {
            temperature: dayData.temperature.avg,
            temperatureRange: {
                min: dayData.temperature.min,
                max: dayData.temperature.max
            },
            conditions: dayData.conditions,
            precipitation: dayData.precipitation,
            wind: {
                speed: dayData.wind.avg,
                maxSpeed: dayData.wind.max
            },
            humidity: dayData.humidity,
            pressure: dayData.pressure,
            date: dayData.date,
            source: 'openweathermap-forecast'
        };
    }
    
    /**
     * Generate historical weather estimate for dates beyond forecast range
     * @param {Object} coords - Location coordinates
     * @param {Date} date - Target date
     * @returns {Object} Estimated weather data
     */
    generateHistoricalEstimate(coords, date) {
        const month = date.getMonth();
        
        // Seasonal temperature estimates (in Fahrenheit)
        const seasonalData = {
            winter: { temp: 45, precipitation: 30, wind: 10 },
            spring: { temp: 65, precipitation: 25, wind: 8 },
            summer: { temp: 85, precipitation: 15, wind: 6 },
            fall: { temp: 60, precipitation: 20, wind: 9 }
        };
        
        let season;
        if (month >= 11 || month <= 1) season = 'winter';
        else if (month >= 2 && month <= 4) season = 'spring';
        else if (month >= 5 && month <= 7) season = 'summer';
        else season = 'fall';
        
        const data = seasonalData[season];
        
        return {
            temperature: data.temp,
            temperatureRange: {
                min: data.temp - 10,
                max: data.temp + 10
            },
            conditions: 'Variable',
            precipitation: data.precipitation,
            wind: {
                speed: data.wind
            },
            humidity: 60,
            date: date.toISOString().split('T')[0],
            source: 'historical-estimate',
            isEstimate: true
        };
    }
    
    /**
     * Get fallback weather data when API fails
     * @param {string} location - Location name
     * @param {string|Date} date - Target date
     * @returns {Object} Fallback weather data
     */
    getFallbackWeather(location, date) {
        const targetDate = new Date(date);
        const month = targetDate.getMonth();
        
        // Simple seasonal fallback
        let temp = 70;
        if (month >= 11 || month <= 2) temp = 50; // Winter
        else if (month >= 3 && month <= 5) temp = 65; // Spring
        else if (month >= 6 && month <= 8) temp = 85; // Summer
        else temp = 60; // Fall
        
        return {
            temperature: temp,
            conditions: 'Unknown',
            precipitation: 20,
            wind: { speed: 5 },
            humidity: 50,
            date: targetDate.toISOString().split('T')[0],
            source: 'fallback',
            error: 'Weather data unavailable'
        };
    }
    
    /**
     * Calculate precipitation from weather data
     * @param {Object} data - Weather data item
     * @returns {number} Precipitation in inches
     */
    calculatePrecipitation(data) {
        let precipitation = 0;
        
        if (data.rain) {
            precipitation += (data.rain['1h'] || data.rain['3h'] || 0) / 25.4; // Convert mm to inches
        }
        
        if (data.snow) {
            precipitation += (data.snow['1h'] || data.snow['3h'] || 0) / 25.4; // Convert mm to inches
        }
        
        return Math.round(precipitation * 100) / 100;
    }
    
    /**
     * Convert wind direction from degrees to cardinal direction
     * @param {number} degrees - Wind direction in degrees
     * @returns {string} Cardinal direction (N, NE, E, etc.)
     */
    getWindDirection(degrees) {
        const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
        const index = Math.round(degrees / 22.5) % 16;
        return directions[index];
    }
    
    /**
     * Get most common weather condition from array
     * @param {Array} conditions - Array of weather conditions
     * @returns {string} Most common condition
     */
    getMostCommonCondition(conditions) {
        const counts = {};
        conditions.forEach(condition => {
            counts[condition] = (counts[condition] || 0) + 1;
        });
        
        return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
    }
    
    /**
     * Make rate-limited API request
     * @param {string} url - API endpoint URL
     * @returns {Promise<Response>} Fetch response
     */
    async makeRequest(url) {
        return new Promise((resolve, reject) => {
            this.requestQueue.push({ url, resolve, reject });
            this.processQueue();
        });
    }
    
    /**
     * Process request queue with rate limiting
     */
    async processQueue() {
        if (this.isProcessingQueue || this.requestQueue.length === 0) {
            return;
        }
        
        this.isProcessingQueue = true;
        
        while (this.requestQueue.length > 0) {
            // Check rate limit
            const now = Date.now();
            this.requestTimestamps = this.requestTimestamps.filter(time => now - time < 60000); // Last minute
            
            if (this.requestTimestamps.length >= this.maxRequestsPerMinute) {
                // Wait until we can make another request
                const oldestRequest = Math.min(...this.requestTimestamps);
                const waitTime = 60000 - (now - oldestRequest) + 100; // Add 100ms buffer
                await new Promise(resolve => setTimeout(resolve, waitTime));
                continue;
            }
            
            const request = this.requestQueue.shift();
            this.requestTimestamps.push(now);
            
            try {
                const response = await fetch(request.url);
                request.resolve(response);
            } catch (error) {
                request.reject(error);
            }
            
            // Small delay between requests
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        this.isProcessingQueue = false;
    }
    
    /**
     * Get data from cache
     * @param {string} key - Cache key
     * @returns {*} Cached data or null
     */
    getFromCache(key) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < cached.timeout) {
            return cached.data;
        }
        
        this.cache.delete(key);
        return null;
    }
    
    /**
     * Set data in cache
     * @param {string} key - Cache key
     * @param {*} data - Data to cache
     * @param {number} timeout - Cache timeout in milliseconds
     */
    setCache(key, data, timeout = this.cacheTimeout) {
        this.cache.set(key, {
            data: data,
            timestamp: Date.now(),
            timeout: timeout
        });
        
        // Clean up old cache entries
        if (this.cache.size > 100) {
            const oldestKey = this.cache.keys().next().value;
            this.cache.delete(oldestKey);
        }
    }
    
    /**
     * Clear all cached data
     */
    clearCache() {
        this.cache.clear();
    }
    
    /**
     * Get API usage statistics
     * @returns {Object} Usage statistics
     */
    getUsageStats() {
        const now = Date.now();
        const recentRequests = this.requestTimestamps.filter(time => now - time < 60000);
        
        return {
            requestsLastMinute: recentRequests.length,
            maxRequestsPerMinute: this.maxRequestsPerMinute,
            cacheSize: this.cache.size,
            isConfigured: this.isConfigured(),
            queueLength: this.requestQueue.length
        };
    }
}

// Create global instance
window.weatherService = new WeatherService();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WeatherService;
}
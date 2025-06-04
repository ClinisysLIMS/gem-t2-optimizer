/**
 * Free Weather Service
 * Uses Open-Meteo API (completely free, no API key required)
 */
class FreeWeatherService {
    constructor() {
        this.baseUrl = 'https://api.open-meteo.com/v1';
        this.geocodingUrl = 'https://geocoding-api.open-meteo.com/v1';
        this.cache = new Map();
        this.cacheTimeout = 30 * 60 * 1000; // 30 minutes for weather data
        this.geocodingCacheTimeout = 24 * 60 * 60 * 1000; // 24 hours for geocoding
        this.requestQueue = new Map();
        
        // Weather code mappings
        this.weatherCodes = {
            0: 'Clear sky',
            1: 'Mainly clear',
            2: 'Partly cloudy',
            3: 'Overcast',
            45: 'Fog',
            48: 'Depositing rime fog',
            51: 'Light drizzle',
            53: 'Moderate drizzle',
            55: 'Dense drizzle',
            56: 'Light freezing drizzle',
            57: 'Dense freezing drizzle',
            61: 'Slight rain',
            63: 'Moderate rain',
            65: 'Heavy rain',
            66: 'Light freezing rain',
            67: 'Heavy freezing rain',
            71: 'Slight snow fall',
            73: 'Moderate snow fall',
            75: 'Heavy snow fall',
            77: 'Snow grains',
            80: 'Slight rain showers',
            81: 'Moderate rain showers',
            82: 'Violent rain showers',
            85: 'Slight snow showers',
            86: 'Heavy snow showers',
            95: 'Thunderstorm',
            96: 'Thunderstorm with slight hail',
            99: 'Thunderstorm with heavy hail'
        };
        
        console.log('Free Weather Service initialized with Open-Meteo');
    }
    
    /**
     * Geocode location using Open-Meteo geocoding API
     */
    async geocodeLocation(location) {
        if (typeof location === 'object' && location.lat && location.lng) {
            return location;
        }
        
        const cacheKey = `geocode:${location}`;
        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.geocodingCacheTimeout) {
            return cached.data;
        }
        
        try {
            const url = `${this.geocodingUrl}/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`Geocoding failed: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data.results || data.results.length === 0) {
                throw new Error(`Location not found: ${location}`);
            }
            
            const result = {
                lat: data.results[0].latitude,
                lng: data.results[0].longitude,
                name: data.results[0].name,
                country: data.results[0].country,
                admin1: data.results[0].admin1,
                timezone: data.results[0].timezone
            };
            
            // Cache the result
            this.cache.set(cacheKey, {
                data: result,
                timestamp: Date.now()
            });
            
            return result;
            
        } catch (error) {
            console.error('Geocoding error:', error);
            throw new Error(`Failed to geocode location: ${location}`);
        }
    }
    
    /**
     * Get current weather for a location
     */
    async getCurrentWeather(location, units = 'imperial') {
        const cacheKey = `current:${location}:${units}`;
        
        // Check cache first
        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return { ...cached.data, cached: true };
        }
        
        // Check if request is in progress
        if (this.requestQueue.has(cacheKey)) {
            return await this.requestQueue.get(cacheKey);
        }
        
        // Create request promise
        const requestPromise = this.executeCurrentWeatherRequest(location, units);
        this.requestQueue.set(cacheKey, requestPromise);
        
        try {
            const result = await requestPromise;
            
            // Cache successful results
            if (result.success) {
                this.cache.set(cacheKey, {
                    data: result,
                    timestamp: Date.now()
                });
            }
            
            return result;
            
        } finally {
            this.requestQueue.delete(cacheKey);
        }
    }
    
    /**
     * Execute current weather request
     */
    async executeCurrentWeatherRequest(location, units) {
        try {
            // Geocode location first
            const coords = await this.geocodeLocation(location);
            
            // Determine temperature unit
            const tempUnit = units === 'metric' ? 'celsius' : 'fahrenheit';
            const windUnit = units === 'metric' ? 'ms' : 'mph';
            const precipUnit = units === 'metric' ? 'mm' : 'inch';
            
            // Build API URL
            const params = new URLSearchParams({
                latitude: coords.lat,
                longitude: coords.lng,
                current: [
                    'temperature_2m',
                    'relative_humidity_2m',
                    'apparent_temperature',
                    'is_day',
                    'precipitation',
                    'rain',
                    'showers',
                    'snowfall',
                    'weather_code',
                    'cloud_cover',
                    'pressure_msl',
                    'surface_pressure',
                    'wind_speed_10m',
                    'wind_direction_10m',
                    'wind_gusts_10m'
                ].join(','),
                temperature_unit: tempUnit,
                wind_speed_unit: windUnit,
                precipitation_unit: precipUnit,
                timezone: 'auto'
            });
            
            const url = `${this.baseUrl}/forecast?${params}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`Weather API failed: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data.current) {
                throw new Error('No current weather data received');
            }
            
            // Transform to standard format
            const weatherData = this.transformCurrentWeather(data, coords, units);
            
            return {
                success: true,
                data: weatherData,
                source: 'open-meteo',
                cached: false
            };
            
        } catch (error) {
            console.error('Current weather error:', error);
            return {
                success: false,
                error: error.message,
                data: null
            };
        }
    }
    
    /**
     * Get weather forecast for a location
     */
    async getWeatherForecast(location, days = 7, units = 'imperial') {
        const cacheKey = `forecast:${location}:${days}:${units}`;
        
        // Check cache first
        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return { ...cached.data, cached: true };
        }
        
        try {
            // Geocode location first
            const coords = await this.geocodeLocation(location);
            
            // Determine units
            const tempUnit = units === 'metric' ? 'celsius' : 'fahrenheit';
            const windUnit = units === 'metric' ? 'ms' : 'mph';
            const precipUnit = units === 'metric' ? 'mm' : 'inch';
            
            // Build API URL for daily forecast
            const params = new URLSearchParams({
                latitude: coords.lat,
                longitude: coords.lng,
                daily: [
                    'weather_code',
                    'temperature_2m_max',
                    'temperature_2m_min',
                    'apparent_temperature_max',
                    'apparent_temperature_min',
                    'sunrise',
                    'sunset',
                    'daylight_duration',
                    'sunshine_duration',
                    'uv_index_max',
                    'precipitation_sum',
                    'rain_sum',
                    'showers_sum',
                    'snowfall_sum',
                    'precipitation_hours',
                    'precipitation_probability_max',
                    'wind_speed_10m_max',
                    'wind_gusts_10m_max',
                    'wind_direction_10m_dominant'
                ].join(','),
                temperature_unit: tempUnit,
                wind_speed_unit: windUnit,
                precipitation_unit: precipUnit,
                forecast_days: Math.min(days, 16), // Open-Meteo supports up to 16 days
                timezone: 'auto'
            });
            
            const url = `${this.baseUrl}/forecast?${params}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`Forecast API failed: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data.daily) {
                throw new Error('No forecast data received');
            }
            
            // Transform to standard format
            const forecastData = this.transformForecast(data, coords, units);
            
            const result = {
                success: true,
                data: forecastData,
                source: 'open-meteo',
                cached: false
            };
            
            // Cache the result
            this.cache.set(cacheKey, {
                data: result,
                timestamp: Date.now()
            });
            
            return result;
            
        } catch (error) {
            console.error('Forecast error:', error);
            return {
                success: false,
                error: error.message,
                data: null
            };
        }
    }
    
    /**
     * Get weather for a specific date
     */
    async getWeatherForDate(location, date, units = 'imperial') {
        const targetDate = new Date(date);
        const today = new Date();
        const daysDiff = Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24));
        
        // If it's today or yesterday, get current weather
        if (daysDiff >= -1 && daysDiff <= 0) {
            const current = await this.getCurrentWeather(location, units);
            if (current.success) {
                return {
                    ...current,
                    requestedDate: date,
                    isCurrentWeather: true
                };
            }
        }
        
        // If it's in the future (up to 16 days), get from forecast
        if (daysDiff > 0 && daysDiff <= 16) {
            const forecast = await this.getWeatherForecast(location, daysDiff + 1, units);
            if (forecast.success && forecast.data.forecast && forecast.data.forecast.length > daysDiff) {
                const dayForecast = forecast.data.forecast[daysDiff];
                return {
                    success: true,
                    data: {
                        location: forecast.data.location,
                        weather: {
                            temperature: Math.round((dayForecast.temperatureMax + dayForecast.temperatureMin) / 2),
                            temperatureMax: dayForecast.temperatureMax,
                            temperatureMin: dayForecast.temperatureMin,
                            humidity: 60, // Open-Meteo doesn't provide daily humidity
                            windSpeed: dayForecast.windSpeedMax,
                            conditions: dayForecast.conditions,
                            description: dayForecast.description,
                            precipitation: dayForecast.precipitation,
                            precipitationProbability: dayForecast.precipitationProbability
                        },
                        forecast: true,
                        requestedDate: date,
                        timestamp: new Date().toISOString(),
                        source: 'open-meteo'
                    },
                    source: 'open-meteo',
                    cached: forecast.cached
                };
            }
        }
        
        // For historical data or far future, return estimation
        return {
            success: true,
            data: {
                location: { name: location },
                weather: this.estimateWeatherForDate(location, targetDate, units),
                estimated: true,
                requestedDate: date,
                timestamp: new Date().toISOString(),
                source: 'estimation'
            },
            source: 'estimation',
            cached: false
        };
    }
    
    /**
     * Transform current weather to standard format
     */
    transformCurrentWeather(data, coords, units) {
        const current = data.current;
        
        return {
            location: {
                name: coords.name,
                country: coords.country,
                coordinates: {
                    lat: coords.lat,
                    lng: coords.lng
                },
                timezone: data.timezone
            },
            current: {
                temperature: Math.round(current.temperature_2m),
                humidity: current.relative_humidity_2m,
                pressure: current.pressure_msl,
                windSpeed: Math.round(current.wind_speed_10m),
                windDirection: current.wind_direction_10m,
                windGusts: Math.round(current.wind_gusts_10m || 0),
                visibility: null, // Not available in Open-Meteo
                uvIndex: null, // Not available in current endpoint
                conditions: this.getWeatherConditions(current.weather_code),
                description: this.weatherCodes[current.weather_code] || 'Unknown',
                icon: this.getWeatherIcon(current.weather_code, current.is_day),
                isDay: current.is_day === 1,
                precipitation: current.precipitation || 0,
                rain: current.rain || 0,
                snow: current.snowfall || 0,
                cloudCover: current.cloud_cover
            },
            timestamp: new Date().toISOString(),
            source: 'open-meteo',
            units: units
        };
    }
    
    /**
     * Transform forecast data to standard format
     */
    transformForecast(data, coords, units) {
        const daily = data.daily;
        const dates = daily.time;
        
        const forecast = dates.map((date, index) => ({
            date: date,
            temperatureMax: Math.round(daily.temperature_2m_max[index]),
            temperatureMin: Math.round(daily.temperature_2m_min[index]),
            conditions: this.getWeatherConditions(daily.weather_code[index]),
            description: this.weatherCodes[daily.weather_code[index]] || 'Unknown',
            icon: this.getWeatherIcon(daily.weather_code[index], true),
            precipitation: daily.precipitation_sum[index] || 0,
            precipitationProbability: daily.precipitation_probability_max[index] || 0,
            windSpeedMax: Math.round(daily.wind_speed_10m_max[index]),
            windDirection: daily.wind_direction_10m_dominant[index],
            windGusts: Math.round(daily.wind_gusts_10m_max[index] || 0),
            uvIndex: daily.uv_index_max[index],
            sunrise: daily.sunrise[index],
            sunset: daily.sunset[index],
            daylightDuration: daily.daylight_duration[index],
            sunshineDuration: daily.sunshine_duration[index]
        }));
        
        return {
            location: {
                name: coords.name,
                country: coords.country,
                coordinates: {
                    lat: coords.lat,
                    lng: coords.lng
                },
                timezone: data.timezone
            },
            forecast: forecast,
            timestamp: new Date().toISOString(),
            source: 'open-meteo',
            units: units
        };
    }
    
    /**
     * Get simplified weather conditions from weather code
     */
    getWeatherConditions(code) {
        if (code === 0 || code === 1) return 'Clear';
        if (code === 2 || code === 3) return 'Cloudy';
        if (code === 45 || code === 48) return 'Fog';
        if (code >= 51 && code <= 57) return 'Drizzle';
        if (code >= 61 && code <= 67) return 'Rain';
        if (code >= 71 && code <= 77) return 'Snow';
        if (code >= 80 && code <= 82) return 'Showers';
        if (code >= 85 && code <= 86) return 'Snow Showers';
        if (code >= 95 && code <= 99) return 'Thunderstorm';
        return 'Unknown';
    }
    
    /**
     * Get weather icon based on code and time of day
     */
    getWeatherIcon(code, isDay) {
        const dayIcons = {
            0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️',
            45: '🌫️', 48: '🌫️',
            51: '🌦️', 53: '🌦️', 55: '🌦️', 56: '🌦️', 57: '🌦️',
            61: '🌧️', 63: '🌧️', 65: '🌧️', 66: '🌧️', 67: '🌧️',
            71: '🌨️', 73: '🌨️', 75: '🌨️', 77: '🌨️',
            80: '🌦️', 81: '🌦️', 82: '🌦️',
            85: '🌨️', 86: '🌨️',
            95: '⛈️', 96: '⛈️', 99: '⛈️'
        };
        
        const nightIcons = {
            0: '🌙', 1: '🌙', 2: '☁️', 3: '☁️'
        };
        
        if (!isDay && nightIcons[code]) {
            return nightIcons[code];
        }
        
        return dayIcons[code] || '❓';
    }
    
    /**
     * Estimate weather for dates outside API range
     */
    estimateWeatherForDate(location, date, units) {
        // Simple seasonal estimation based on month and location
        const month = date.getMonth(); // 0-11
        
        // Base temperatures (rough estimates)
        let baseTemp = 70; // Fahrenheit
        if (units === 'metric') baseTemp = 21; // Celsius
        
        // Seasonal adjustments
        const seasonalAdj = Math.sin((month - 2) * Math.PI / 6) * 20;
        const temperature = Math.round(baseTemp + seasonalAdj);
        
        // Estimate other conditions
        const isWinter = month === 11 || month === 0 || month === 1;
        const isSummer = month >= 5 && month <= 8;
        
        return {
            temperature: temperature,
            humidity: isWinter ? 45 : (isSummer ? 65 : 55),
            windSpeed: Math.round(8 + Math.random() * 12),
            conditions: isWinter ? 'Cloudy' : (isSummer ? 'Clear' : 'Partly Cloudy'),
            precipitation: Math.random() * (isWinter ? 0.5 : 0.2)
        };
    }
    
    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
        console.log('Weather cache cleared');
    }
    
    /**
     * Get cache statistics
     */
    getCacheStats() {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys()),
            memoryUsage: JSON.stringify(Array.from(this.cache.values())).length
        };
    }
    
    /**
     * Test service availability
     */
    async testConnection() {
        try {
            const startTime = Date.now();
            const result = await this.getCurrentWeather('New York');
            const latency = Date.now() - startTime;
            
            return {
                available: result.success,
                latency: latency,
                message: result.success ? 'Service operational' : result.error
            };
        } catch (error) {
            return {
                available: false,
                latency: null,
                message: error.message
            };
        }
    }
}

// Create global instance
window.freeWeatherService = new FreeWeatherService();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FreeWeatherService;
}
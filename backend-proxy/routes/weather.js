/**
 * Weather API Routes
 * Proxy for OpenWeatherMap and other weather services
 */

const express = require('express');
const axios = require('axios');
const { body, param, validationResult } = require('express-validator');
const router = express.Router();

// Validation middleware
const validateWeatherRequest = [
    body('location').notEmpty().isLength({ min: 2, max: 100 }).trim(),
    body('date').optional().isISO8601(),
    body('units').optional().isIn(['metric', 'imperial', 'kelvin']),
];

const validateLocationParam = [
    param('location').notEmpty().isLength({ min: 2, max: 100 }).trim()
];

// Helper function to handle validation errors
function handleValidationErrors(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Validation failed',
            details: errors.array(),
            timestamp: new Date().toISOString()
        });
    }
    next();
}

// Get current weather for location
router.get('/current/:location', validateLocationParam, handleValidationErrors, async (req, res) => {
    if (process.env.ENABLE_WEATHER_API !== 'true') {
        return res.status(503).json({
            error: 'Weather API disabled',
            message: 'Weather service is currently disabled'
        });
    }

    if (!process.env.OPENWEATHER_API_KEY) {
        return res.status(503).json({
            error: 'Weather API not configured',
            message: 'OpenWeather API key not found'
        });
    }

    try {
        const { location } = req.params;
        const units = req.query.units || 'imperial';

        const response = await axios.get('http://api.openweathermap.org/data/2.5/weather', {
            params: {
                q: location,
                appid: process.env.OPENWEATHER_API_KEY,
                units: units
            },
            timeout: 10000
        });

        const weatherData = response.data;
        
        // Transform to our standard format
        const standardWeather = {
            location: {
                name: weatherData.name,
                country: weatherData.sys.country,
                coordinates: {
                    lat: weatherData.coord.lat,
                    lng: weatherData.coord.lon
                }
            },
            current: {
                temperature: Math.round(weatherData.main.temp),
                humidity: weatherData.main.humidity,
                pressure: weatherData.main.pressure,
                windSpeed: Math.round(weatherData.wind?.speed || 0),
                windDirection: weatherData.wind?.deg || 0,
                visibility: weatherData.visibility ? Math.round(weatherData.visibility / 1000) : null,
                uvIndex: null, // Not available in current weather API
                conditions: weatherData.weather[0].main,
                description: weatherData.weather[0].description,
                icon: weatherData.weather[0].icon
            },
            timestamp: new Date().toISOString(),
            source: 'openweathermap',
            units: units
        };

        res.json({
            success: true,
            data: standardWeather,
            cached: false
        });

    } catch (error) {
        console.error('Weather API error:', error.message);
        
        if (error.response?.status === 404) {
            return res.status(404).json({
                error: 'Location not found',
                message: 'The specified location could not be found'
            });
        }

        if (error.response?.status === 401) {
            return res.status(503).json({
                error: 'Weather API authentication failed',
                message: 'Invalid or expired API key'
            });
        }

        res.status(500).json({
            error: 'Weather service error',
            message: 'Failed to fetch weather data',
            details: process.env.NODE_ENV !== 'production' ? error.message : undefined
        });
    }
});

// Get weather forecast for location
router.get('/forecast/:location', validateLocationParam, handleValidationErrors, async (req, res) => {
    if (process.env.ENABLE_WEATHER_API !== 'true') {
        return res.status(503).json({
            error: 'Weather API disabled',
            message: 'Weather service is currently disabled'
        });
    }

    if (!process.env.OPENWEATHER_API_KEY) {
        return res.status(503).json({
            error: 'Weather API not configured',
            message: 'OpenWeather API key not found'
        });
    }

    try {
        const { location } = req.params;
        const units = req.query.units || 'imperial';
        const days = Math.min(parseInt(req.query.days) || 5, 5); // Max 5 days

        const response = await axios.get('http://api.openweathermap.org/data/2.5/forecast', {
            params: {
                q: location,
                appid: process.env.OPENWEATHER_API_KEY,
                units: units,
                cnt: days * 8 // 8 forecasts per day (3-hour intervals)
            },
            timeout: 10000
        });

        const forecastData = response.data;
        
        // Transform to our standard format
        const standardForecast = {
            location: {
                name: forecastData.city.name,
                country: forecastData.city.country,
                coordinates: {
                    lat: forecastData.city.coord.lat,
                    lng: forecastData.city.coord.lon
                }
            },
            forecast: forecastData.list.map(item => ({
                datetime: new Date(item.dt * 1000).toISOString(),
                temperature: Math.round(item.main.temp),
                temperatureMin: Math.round(item.main.temp_min),
                temperatureMax: Math.round(item.main.temp_max),
                humidity: item.main.humidity,
                pressure: item.main.pressure,
                windSpeed: Math.round(item.wind?.speed || 0),
                windDirection: item.wind?.deg || 0,
                conditions: item.weather[0].main,
                description: item.weather[0].description,
                icon: item.weather[0].icon,
                precipitation: item.rain?.['3h'] || item.snow?.['3h'] || 0
            })),
            timestamp: new Date().toISOString(),
            source: 'openweathermap',
            units: units
        };

        res.json({
            success: true,
            data: standardForecast,
            cached: false
        });

    } catch (error) {
        console.error('Weather forecast API error:', error.message);
        
        if (error.response?.status === 404) {
            return res.status(404).json({
                error: 'Location not found',
                message: 'The specified location could not be found'
            });
        }

        res.status(500).json({
            error: 'Weather forecast service error',
            message: 'Failed to fetch weather forecast data',
            details: process.env.NODE_ENV !== 'production' ? error.message : undefined
        });
    }
});

// POST endpoint for detailed weather requests
router.post('/detailed', validateWeatherRequest, handleValidationErrors, async (req, res) => {
    if (process.env.ENABLE_WEATHER_API !== 'true') {
        return res.status(503).json({
            error: 'Weather API disabled',
            message: 'Weather service is currently disabled'
        });
    }

    try {
        const { location, date, units = 'imperial' } = req.body;
        
        // If specific date is requested and it's in the future, use forecast
        if (date) {
            const requestDate = new Date(date);
            const now = new Date();
            const daysDiff = Math.ceil((requestDate - now) / (1000 * 60 * 60 * 24));
            
            if (daysDiff > 0 && daysDiff <= 5) {
                // Use forecast API for future dates
                const forecastResponse = await axios.get('http://api.openweathermap.org/data/2.5/forecast', {
                    params: {
                        q: location,
                        appid: process.env.OPENWEATHER_API_KEY,
                        units: units
                    },
                    timeout: 10000
                });
                
                // Find closest forecast to requested date
                const targetTime = requestDate.getTime();
                const closest = forecastResponse.data.list.reduce((prev, curr) => {
                    const prevDiff = Math.abs(new Date(prev.dt * 1000).getTime() - targetTime);
                    const currDiff = Math.abs(new Date(curr.dt * 1000).getTime() - targetTime);
                    return currDiff < prevDiff ? curr : prev;
                });
                
                const weatherData = {
                    location: {
                        name: forecastResponse.data.city.name,
                        country: forecastResponse.data.city.country
                    },
                    weather: {
                        temperature: Math.round(closest.main.temp),
                        humidity: closest.main.humidity,
                        windSpeed: Math.round(closest.wind?.speed || 0),
                        conditions: closest.weather[0].description,
                        precipitation: closest.rain?.['3h'] || closest.snow?.['3h'] || 0
                    },
                    forecast: true,
                    requestedDate: date,
                    timestamp: new Date().toISOString(),
                    source: 'openweathermap_forecast'
                };
                
                return res.json({
                    success: true,
                    data: weatherData,
                    cached: false
                });
            }
        }
        
        // Use current weather for today or past dates
        const response = await axios.get('http://api.openweathermap.org/data/2.5/weather', {
            params: {
                q: location,
                appid: process.env.OPENWEATHER_API_KEY,
                units: units
            },
            timeout: 10000
        });

        const weatherData = {
            location: {
                name: response.data.name,
                country: response.data.sys.country
            },
            weather: {
                temperature: Math.round(response.data.main.temp),
                humidity: response.data.main.humidity,
                windSpeed: Math.round(response.data.wind?.speed || 0),
                conditions: response.data.weather[0].description,
                precipitation: response.data.rain?.['1h'] || response.data.snow?.['1h'] || 0
            },
            current: true,
            timestamp: new Date().toISOString(),
            source: 'openweathermap_current'
        };

        res.json({
            success: true,
            data: weatherData,
            cached: false
        });

    } catch (error) {
        console.error('Detailed weather API error:', error.message);
        res.status(500).json({
            error: 'Weather service error',
            message: 'Failed to fetch detailed weather data',
            details: process.env.NODE_ENV !== 'production' ? error.message : undefined
        });
    }
});

module.exports = router;
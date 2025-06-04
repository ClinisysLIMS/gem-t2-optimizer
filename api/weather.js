/**
 * Serverless Weather API Function
 * Handles weather requests using Open-Meteo and other weather APIs
 * Works with both Netlify and Vercel
 */

// Environment variables for API keys (when needed)
const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
const WEATHERAPI_KEY = process.env.WEATHERAPI_KEY;

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json'
};

// Handle CORS preflight requests
const handleCORS = (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }
  return null;
};

// Parse query parameters
const parseQuery = (event) => {
  return event.queryStringParameters || {};
};

// Geocode location using Open-Meteo
async function geocodeLocation(location) {
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Geocoding failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.results || data.results.length === 0) {
      throw new Error(`Location not found: ${location}`);
    }
    
    return {
      lat: data.results[0].latitude,
      lng: data.results[0].longitude,
      name: data.results[0].name,
      country: data.results[0].country,
      timezone: data.results[0].timezone
    };
  } catch (error) {
    console.error('Geocoding error:', error);
    throw error;
  }
}

// Get current weather from Open-Meteo (free)
async function getCurrentWeatherOpenMeteo(location, units = 'imperial') {
  try {
    // Geocode location first if it's a string
    let coords;
    if (typeof location === 'string') {
      coords = await geocodeLocation(location);
    } else {
      coords = location;
    }
    
    // Determine units
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
    
    const url = `https://api.open-meteo.com/v1/forecast?${params}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Weather API failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.current) {
      throw new Error('No current weather data received');
    }
    
    // Weather code mappings
    const weatherCodes = {
      0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
      45: 'Fog', 48: 'Depositing rime fog',
      51: 'Light drizzle', 53: 'Moderate drizzle', 55: 'Dense drizzle',
      61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain',
      71: 'Slight snow fall', 73: 'Moderate snow fall', 75: 'Heavy snow fall',
      80: 'Slight rain showers', 81: 'Moderate rain showers', 82: 'Violent rain showers',
      95: 'Thunderstorm', 96: 'Thunderstorm with slight hail', 99: 'Thunderstorm with heavy hail'
    };
    
    const current = data.current;
    
    return {
      success: true,
      data: {
        location: {
          name: coords.name || 'Unknown',
          country: coords.country || '',
          coordinates: { lat: coords.lat, lng: coords.lng },
          timezone: data.timezone
        },
        current: {
          temperature: Math.round(current.temperature_2m),
          humidity: current.relative_humidity_2m,
          pressure: current.pressure_msl,
          windSpeed: Math.round(current.wind_speed_10m),
          windDirection: current.wind_direction_10m,
          windGusts: Math.round(current.wind_gusts_10m || 0),
          visibility: null,
          uvIndex: null,
          conditions: getWeatherConditions(current.weather_code),
          description: weatherCodes[current.weather_code] || 'Unknown',
          icon: getWeatherIcon(current.weather_code, current.is_day),
          isDay: current.is_day === 1,
          precipitation: current.precipitation || 0,
          rain: current.rain || 0,
          snow: current.snowfall || 0,
          cloudCover: current.cloud_cover
        },
        timestamp: new Date().toISOString(),
        source: 'open-meteo',
        units: units
      }
    };
  } catch (error) {
    console.error('Open-Meteo weather error:', error);
    throw error;
  }
}

// Get weather forecast from Open-Meteo
async function getWeatherForecastOpenMeteo(location, days = 7, units = 'imperial') {
  try {
    // Geocode location first if it's a string
    let coords;
    if (typeof location === 'string') {
      coords = await geocodeLocation(location);
    } else {
      coords = location;
    }
    
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
        'uv_index_max',
        'precipitation_sum',
        'rain_sum',
        'showers_sum',
        'snowfall_sum',
        'precipitation_probability_max',
        'wind_speed_10m_max',
        'wind_gusts_10m_max',
        'wind_direction_10m_dominant'
      ].join(','),
      temperature_unit: tempUnit,
      wind_speed_unit: windUnit,
      precipitation_unit: precipUnit,
      forecast_days: Math.min(days, 16),
      timezone: 'auto'
    });
    
    const url = `https://api.open-meteo.com/v1/forecast?${params}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Forecast API failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.daily) {
      throw new Error('No forecast data received');
    }
    
    const daily = data.daily;
    const dates = daily.time;
    
    const forecast = dates.map((date, index) => ({
      date: date,
      temperatureMax: Math.round(daily.temperature_2m_max[index]),
      temperatureMin: Math.round(daily.temperature_2m_min[index]),
      conditions: getWeatherConditions(daily.weather_code[index]),
      description: getWeatherDescription(daily.weather_code[index]),
      icon: getWeatherIcon(daily.weather_code[index], true),
      precipitation: daily.precipitation_sum[index] || 0,
      precipitationProbability: daily.precipitation_probability_max[index] || 0,
      windSpeedMax: Math.round(daily.wind_speed_10m_max[index]),
      windDirection: daily.wind_direction_10m_dominant[index],
      windGusts: Math.round(daily.wind_gusts_10m_max[index] || 0),
      uvIndex: daily.uv_index_max[index],
      sunrise: daily.sunrise[index],
      sunset: daily.sunset[index]
    }));
    
    return {
      success: true,
      data: {
        location: {
          name: coords.name || 'Unknown',
          country: coords.country || '',
          coordinates: { lat: coords.lat, lng: coords.lng },
          timezone: data.timezone
        },
        forecast: forecast,
        timestamp: new Date().toISOString(),
        source: 'open-meteo',
        units: units
      }
    };
  } catch (error) {
    console.error('Forecast error:', error);
    throw error;
  }
}

// Get current weather from OpenWeatherMap (if API key provided)
async function getCurrentWeatherOpenWeather(location, units = 'imperial') {
  if (!OPENWEATHER_API_KEY) {
    throw new Error('OpenWeatherMap API key not configured');
  }
  
  try {
    const unitParam = units === 'metric' ? 'metric' : 'imperial';
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(location)}&appid=${OPENWEATHER_API_KEY}&units=${unitParam}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`OpenWeatherMap API failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    return {
      success: true,
      data: {
        location: {
          name: data.name,
          country: data.sys.country,
          coordinates: { lat: data.coord.lat, lng: data.coord.lon }
        },
        current: {
          temperature: Math.round(data.main.temp),
          humidity: data.main.humidity,
          pressure: data.main.pressure,
          windSpeed: Math.round(data.wind.speed),
          windDirection: data.wind.deg,
          windGusts: Math.round(data.wind.gust || 0),
          visibility: data.visibility ? Math.round(data.visibility / 1000) : null,
          uvIndex: null,
          conditions: data.weather[0].main,
          description: data.weather[0].description,
          icon: data.weather[0].icon,
          precipitation: data.rain ? data.rain['1h'] || 0 : 0,
          cloudCover: data.clouds.all
        },
        timestamp: new Date().toISOString(),
        source: 'openweathermap',
        units: units
      }
    };
  } catch (error) {
    console.error('OpenWeatherMap error:', error);
    throw error;
  }
}

// Helper functions
function getWeatherConditions(code) {
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

function getWeatherDescription(code) {
  const descriptions = {
    0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
    45: 'Fog', 48: 'Depositing rime fog',
    51: 'Light drizzle', 53: 'Moderate drizzle', 55: 'Dense drizzle',
    61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain',
    71: 'Slight snow fall', 73: 'Moderate snow fall', 75: 'Heavy snow fall',
    80: 'Slight rain showers', 81: 'Moderate rain showers', 82: 'Violent rain showers',
    95: 'Thunderstorm', 96: 'Thunderstorm with slight hail', 99: 'Thunderstorm with heavy hail'
  };
  return descriptions[code] || 'Unknown';
}

function getWeatherIcon(code, isDay) {
  const dayIcons = {
    0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️',
    45: '🌫️', 48: '🌫️',
    51: '🌦️', 53: '🌦️', 55: '🌦️',
    61: '🌧️', 63: '🌧️', 65: '🌧️',
    71: '🌨️', 73: '🌨️', 75: '🌨️',
    80: '🌦️', 81: '🌦️', 82: '🌦️',
    95: '⛈️', 96: '⛈️', 99: '⛈️'
  };
  
  const nightIcons = { 0: '🌙', 1: '🌙', 2: '☁️', 3: '☁️' };
  
  if (!isDay && nightIcons[code]) {
    return nightIcons[code];
  }
  
  return dayIcons[code] || '❓';
}

// Main handler function
exports.handler = async (event, context) => {
  // Handle CORS
  const corsResponse = handleCORS(event);
  if (corsResponse) return corsResponse;
  
  try {
    const query = parseQuery(event);
    const { location, type = 'current', units = 'imperial', days = '7', source = 'auto' } = query;
    
    if (!location) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          error: 'Location parameter is required'
        })
      };
    }
    
    let result;
    
    // Determine which API to use
    const useOpenWeather = source === 'openweather' && OPENWEATHER_API_KEY;
    const useOpenMeteo = source === 'openmeteo' || source === 'auto' || !useOpenWeather;
    
    if (type === 'current') {
      if (useOpenWeather) {
        result = await getCurrentWeatherOpenWeather(location, units);
      } else {
        result = await getCurrentWeatherOpenMeteo(location, units);
      }
    } else if (type === 'forecast') {
      if (useOpenWeather) {
        // OpenWeatherMap forecast would go here
        result = await getWeatherForecastOpenMeteo(location, parseInt(days), units);
      } else {
        result = await getWeatherForecastOpenMeteo(location, parseInt(days), units);
      }
    } else {
      throw new Error(`Unsupported weather type: ${type}`);
    }
    
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(result)
    };
    
  } catch (error) {
    console.error('Weather API error:', error);
    
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};

// For Vercel (default export)
export default exports.handler;
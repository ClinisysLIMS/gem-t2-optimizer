/**
 * Serverless Elevation API Function
 * Handles elevation requests using OpenTopoData, Open-Elevation, and Google Elevation API
 * Works with both Netlify and Vercel
 */

// Environment variables for API keys
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const MAPBOX_API_KEY = process.env.MAPBOX_API_KEY;

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

// Parse request body
const parseBody = (event) => {
  if (!event.body) return {};
  try {
    return JSON.parse(event.body);
  } catch {
    return {};
  }
};

// Free elevation sources (no API key required)
const freeElevationSources = [
  {
    name: 'opentopo',
    baseUrl: 'https://api.opentopodata.org/v1',
    dataset: 'aster30m',
    maxLocations: 100
  },
  {
    name: 'open-elevation',
    baseUrl: 'https://api.open-elevation.com/api/v1',
    dataset: 'srtm',
    maxLocations: 100
  }
];

// Rate limiting for free services
let lastElevationRequest = 0;
const ELEVATION_RATE_LIMIT = 500; // 500ms between requests

async function enforceElevationRateLimit() {
  const now = Date.now();
  const timeSinceLastRequest = now - lastElevationRequest;
  
  if (timeSinceLastRequest < ELEVATION_RATE_LIMIT) {
    const delay = ELEVATION_RATE_LIMIT - timeSinceLastRequest;
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  
  lastElevationRequest = Date.now();
}

// Get elevation using OpenTopoData
async function getElevationOpenTopo(locations) {
  try {
    await enforceElevationRateLimit();
    
    const locationString = locations.map(loc => `${loc.lat},${loc.lng}`).join('|');
    const url = `https://api.opentopodata.org/v1/aster30m?locations=${locationString}`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'GEM-T2-Optimizer/1.0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`OpenTopoData API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.status !== 'OK') {
      throw new Error(`OpenTopoData error: ${data.error || data.status}`);
    }
    
    return {
      success: true,
      results: data.results.map((result, index) => ({
        elevation: Math.round(result.elevation * 3.28084), // Convert to feet
        elevationMeters: result.elevation,
        location: {
          lat: locations[index].lat,
          lng: locations[index].lng
        },
        dataset: result.dataset,
        resolution: null
      })),
      source: 'opentopo'
    };
  } catch (error) {
    console.error('OpenTopoData error:', error);
    throw error;
  }
}

// Get elevation using Open-Elevation
async function getElevationOpenElevation(locations) {
  try {
    await enforceElevationRateLimit();
    
    const requestBody = {
      locations: locations.map(loc => ({
        latitude: loc.lat,
        longitude: loc.lng
      }))
    };
    
    const response = await fetch('https://api.open-elevation.com/api/v1/lookup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'GEM-T2-Optimizer/1.0'
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      throw new Error(`Open-Elevation API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.results) {
      throw new Error('No elevation results received');
    }
    
    return {
      success: true,
      results: data.results.map(result => ({
        elevation: Math.round(result.elevation * 3.28084), // Convert to feet
        elevationMeters: result.elevation,
        location: {
          lat: result.latitude,
          lng: result.longitude
        },
        dataset: 'srtm',
        resolution: null
      })),
      source: 'open-elevation'
    };
  } catch (error) {
    console.error('Open-Elevation error:', error);
    throw error;
  }
}

// Get elevation using Google Elevation API
async function getElevationGoogle(locations) {
  if (!GOOGLE_MAPS_API_KEY) {
    throw new Error('Google Maps API key not configured');
  }
  
  try {
    const locationString = locations.map(loc => `${loc.lat},${loc.lng}`).join('|');
    const url = `https://maps.googleapis.com/maps/api/elevation/json?locations=${locationString}&key=${GOOGLE_MAPS_API_KEY}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Google Elevation API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.status !== 'OK') {
      throw new Error(`Google Elevation API error: ${data.status}`);
    }
    
    return {
      success: true,
      results: data.results.map(result => ({
        elevation: Math.round(result.elevation * 3.28084), // Convert to feet
        elevationMeters: result.elevation,
        location: {
          lat: result.location.lat,
          lng: result.location.lng
        },
        dataset: 'google',
        resolution: result.resolution
      })),
      source: 'google_maps'
    };
  } catch (error) {
    console.error('Google Elevation error:', error);
    throw error;
  }
}

// Get elevation with fallback between sources
async function getElevationWithFallback(locations, preferredSource = 'auto') {
  if (!Array.isArray(locations) || locations.length === 0) {
    throw new Error('Locations must be a non-empty array');
  }
  
  if (locations.length > 100) {
    throw new Error('Maximum 100 locations allowed per request');
  }
  
  // Format locations
  const formattedLocations = locations.map(location => {
    if (typeof location === 'string') {
      const [lat, lng] = location.split(',').map(coord => parseFloat(coord.trim()));
      if (isNaN(lat) || isNaN(lng)) {
        throw new Error(`Invalid location format: ${location}`);
      }
      return { lat, lng };
    } else if (typeof location === 'object') {
      const lat = location.lat || location.latitude;
      const lng = location.lng || location.longitude;
      if (isNaN(lat) || isNaN(lng)) {
        throw new Error(`Invalid location object: ${JSON.stringify(location)}`);
      }
      return { lat: parseFloat(lat), lng: parseFloat(lng) };
    } else {
      throw new Error(`Invalid location type: ${typeof location}`);
    }
  });
  
  // Try elevation sources in order
  const sources = [
    { name: 'google', fn: () => getElevationGoogle(formattedLocations) },
    { name: 'opentopo', fn: () => getElevationOpenTopo(formattedLocations) },
    { name: 'open-elevation', fn: () => getElevationOpenElevation(formattedLocations) }
  ];
  
  // If preferred source is specified, try it first
  if (preferredSource !== 'auto') {
    const preferredIndex = sources.findIndex(s => s.name === preferredSource);
    if (preferredIndex > 0) {
      const preferred = sources.splice(preferredIndex, 1)[0];
      sources.unshift(preferred);
    }
  }
  
  // Try each source until one succeeds
  for (const source of sources) {
    try {
      // Skip Google if no API key and not preferred
      if (source.name === 'google' && !GOOGLE_MAPS_API_KEY && preferredSource !== 'google') {
        continue;
      }
      
      const result = await source.fn();
      if (result.success) {
        return result;
      }
    } catch (error) {
      console.warn(`${source.name} elevation failed:`, error.message);
      continue;
    }
  }
  
  // If all sources fail, return estimation
  return getElevationEstimation(formattedLocations);
}

// Estimate elevation when APIs fail
function getElevationEstimation(locations) {
  console.log('Using elevation estimation for', locations.length, 'locations');
  
  const results = locations.map(location => {
    // Simple elevation estimation based on latitude (very rough)
    let estimatedElevation = 1000; // Base elevation in feet
    
    // Rough adjustments based on latitude
    const lat = Math.abs(location.lat);
    if (lat > 60) estimatedElevation += 500; // Higher latitudes tend to be higher
    if (lat < 30) estimatedElevation -= 300; // Lower latitudes tend to be lower
    
    // Add some variation based on longitude
    const variation = Math.sin(location.lng * Math.PI / 180) * 200;
    estimatedElevation += variation;
    
    return {
      elevation: Math.round(estimatedElevation),
      elevationMeters: Math.round(estimatedElevation / 3.28084),
      location: location,
      dataset: 'estimated',
      resolution: null,
      estimated: true
    };
  });
  
  return {
    success: true,
    results: results,
    source: 'estimation',
    warning: 'Using estimated elevation data - external services unavailable'
  };
}

// Get elevation profile along a path
async function getElevationProfile(path, samples = 100, source = 'auto') {
  if (!Array.isArray(path) || path.length < 2) {
    throw new Error('Path must contain at least 2 points');
  }
  
  // Sample points along the path
  const sampledPath = samplePath(path, Math.min(samples, 100));
  
  // Get elevation for sampled points
  const elevationResult = await getElevationWithFallback(sampledPath, source);
  
  if (!elevationResult.success) {
    throw new Error(elevationResult.error);
  }
  
  // Calculate grades and statistics
  const results = calculatePathGrades(elevationResult.results);
  const summary = calculateElevationSummary(results);
  
  return {
    success: true,
    results: results,
    summary: summary,
    source: elevationResult.source,
    warning: elevationResult.warning
  };
}

// Sample points along a path
function samplePath(path, samples) {
  const formattedPath = path.map(point => {
    if (typeof point === 'string') {
      const [lat, lng] = point.split(',').map(coord => parseFloat(coord.trim()));
      return { lat, lng };
    }
    return {
      lat: point.lat || point.latitude,
      lng: point.lng || point.longitude
    };
  });
  
  if (formattedPath.length <= samples) {
    return formattedPath;
  }
  
  const sampledPoints = [];
  const step = (formattedPath.length - 1) / (samples - 1);
  
  for (let i = 0; i < samples; i++) {
    const index = Math.round(i * step);
    sampledPoints.push(formattedPath[index]);
  }
  
  return sampledPoints;
}

// Calculate grades between elevation points
function calculatePathGrades(elevationResults) {
  return elevationResults.map((result, index) => {
    let grade = 0;
    let distance = 0;
    
    if (index > 0) {
      const prev = elevationResults[index - 1];
      const elevationDiff = result.elevationMeters - prev.elevationMeters;
      distance = calculateDistance(
        prev.location.lat, prev.location.lng,
        result.location.lat, result.location.lng
      );
      
      if (distance > 0) {
        grade = (elevationDiff / distance) * 100; // Grade as percentage
      }
    }
    
    return {
      ...result,
      grade: Math.round(grade * 100) / 100, // Round to 2 decimal places
      distanceFromStart: distance,
      segmentDistance: distance
    };
  });
}

// Calculate elevation summary statistics
function calculateElevationSummary(results) {
  const elevations = results.map(r => r.elevation);
  const grades = results.map(r => Math.abs(r.grade)).filter(g => g > 0);
  
  let totalElevationGain = 0;
  let totalElevationLoss = 0;
  
  for (let i = 1; i < results.length; i++) {
    const diff = results[i].elevation - results[i-1].elevation;
    if (diff > 0) {
      totalElevationGain += diff;
    } else {
      totalElevationLoss += Math.abs(diff);
    }
  }
  
  return {
    minElevation: Math.min(...elevations),
    maxElevation: Math.max(...elevations),
    totalElevationGain: Math.round(totalElevationGain),
    totalElevationLoss: Math.round(totalElevationLoss),
    maxGrade: grades.length > 0 ? Math.max(...grades) : 0,
    avgGrade: grades.length > 0 ? grades.reduce((a, b) => a + b, 0) / grades.length : 0,
    totalDistance: results.reduce((sum, result) => sum + (result.segmentDistance || 0), 0)
  };
}

// Calculate distance between two points (Haversine formula)
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
          Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Main handler function
exports.handler = async (event, context) => {
  // Handle CORS
  const corsResponse = handleCORS(event);
  if (corsResponse) return corsResponse;
  
  try {
    const query = parseQuery(event);
    const body = parseBody(event);
    
    // Get parameters from query or body
    const {
      type = 'point',
      locations: queryLocations,
      path: queryPath,
      lat,
      lng,
      samples = '100',
      source = 'auto'
    } = { ...query, ...body };
    
    let result;
    
    if (type === 'point') {
      let locations;
      
      if (queryLocations) {
        // Handle locations parameter (array or comma-separated string)
        if (typeof queryLocations === 'string') {
          locations = queryLocations.split(';').map(loc => {
            const [lat, lng] = loc.split(',');
            return { lat: parseFloat(lat), lng: parseFloat(lng) };
          });
        } else {
          locations = queryLocations;
        }
      } else if (lat && lng) {
        // Handle single point
        locations = [{ lat: parseFloat(lat), lng: parseFloat(lng) }];
      } else {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({
            success: false,
            error: 'Locations parameter or lat/lng coordinates are required'
          })
        };
      }
      
      result = await getElevationWithFallback(locations, source);
      
    } else if (type === 'profile') {
      const path = queryPath;
      if (!path || !Array.isArray(path)) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({
            success: false,
            error: 'Path parameter is required for elevation profile'
          })
        };
      }
      
      result = await getElevationProfile(path, parseInt(samples), source);
      
    } else {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          error: 'Invalid type parameter. Use: point or profile'
        })
      };
    }
    
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(result)
    };
    
  } catch (error) {
    console.error('Elevation API error:', error);
    
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
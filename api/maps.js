/**
 * Serverless Maps/Routing API Function
 * Handles routing, directions, and map-related requests
 * Works with both Netlify and Vercel
 */

// Environment variables for API keys
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const MAPBOX_API_KEY = process.env.MAPBOX_API_KEY;
const HERE_API_KEY = process.env.HERE_API_KEY;

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

// Get directions using Google Maps API
async function getDirectionsGoogle(origin, destination, options = {}) {
  if (!GOOGLE_MAPS_API_KEY) {
    throw new Error('Google Maps API key not configured');
  }
  
  try {
    const params = new URLSearchParams({
      origin: typeof origin === 'string' ? origin : `${origin.lat},${origin.lng}`,
      destination: typeof destination === 'string' ? destination : `${destination.lat},${destination.lng}`,
      key: GOOGLE_MAPS_API_KEY,
      mode: options.mode || 'driving',
      alternatives: options.alternatives || 'true',
      avoid: options.avoid || '',
      units: options.units || 'imperial'
    });
    
    if (options.waypoints) {
      params.append('waypoints', options.waypoints);
    }
    
    const url = `https://maps.googleapis.com/maps/api/directions/json?${params}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Google Directions API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.status !== 'OK') {
      return {
        success: false,
        error: data.error_message || data.status,
        routes: []
      };
    }
    
    return {
      success: true,
      routes: data.routes.map(route => formatGoogleRoute(route)),
      source: 'google_maps'
    };
  } catch (error) {
    console.error('Google Directions error:', error);
    throw error;
  }
}

// Get directions using Mapbox API
async function getDirectionsMapbox(origin, destination, options = {}) {
  if (!MAPBOX_API_KEY) {
    throw new Error('Mapbox API key not configured');
  }
  
  try {
    const originCoords = typeof origin === 'string' ? origin : `${origin.lng},${origin.lat}`;
    const destCoords = typeof destination === 'string' ? destination : `${destination.lng},${destination.lat}`;
    
    const profile = options.mode === 'walking' ? 'walking' : 'driving';
    const url = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${originCoords};${destCoords}`;
    
    const params = new URLSearchParams({
      access_token: MAPBOX_API_KEY,
      alternatives: options.alternatives || 'true',
      geometries: 'geojson',
      steps: 'true',
      overview: 'full'
    });
    
    const response = await fetch(`${url}?${params}`);
    
    if (!response.ok) {
      throw new Error(`Mapbox Directions API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.code !== 'Ok') {
      return {
        success: false,
        error: data.message || data.code,
        routes: []
      };
    }
    
    return {
      success: true,
      routes: data.routes.map(route => formatMapboxRoute(route)),
      source: 'mapbox'
    };
  } catch (error) {
    console.error('Mapbox Directions error:', error);
    throw error;
  }
}

// Get directions using OpenRouteService (free alternative)
async function getDirectionsOpenRoute(origin, destination, options = {}) {
  try {
    const originCoords = typeof origin === 'string' ? 
      await geocodeLocation(origin) : 
      [origin.lng, origin.lat];
    const destCoords = typeof destination === 'string' ? 
      await geocodeLocation(destination) : 
      [destination.lng, destination.lat];
    
    const profile = options.mode === 'walking' ? 'foot-walking' : 'driving-car';
    const url = `https://api.openrouteservice.org/v2/directions/${profile}`;
    
    const requestBody = {
      coordinates: [originCoords, destCoords],
      format: 'json',
      instructions: true,
      elevation: true
    };
    
    if (options.alternatives) {
      requestBody.alternative_routes = { target_count: 2 };
    }
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': process.env.OPENROUTESERVICE_API_KEY || ''
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      throw new Error(`OpenRouteService API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    return {
      success: true,
      routes: data.routes.map(route => formatOpenRouteRoute(route)),
      source: 'openrouteservice'
    };
  } catch (error) {
    console.error('OpenRouteService error:', error);
    throw error;
  }
}

// Geocode location for routing
async function geocodeLocation(location) {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'GEM-T2-Optimizer/1.0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Geocoding failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data || data.length === 0) {
      throw new Error(`Location not found: ${location}`);
    }
    
    return [parseFloat(data[0].lon), parseFloat(data[0].lat)];
  } catch (error) {
    console.error('Geocoding error:', error);
    throw error;
  }
}

// Get route with fallback between services
async function getRouteWithFallback(origin, destination, options = {}) {
  const { source = 'auto', ...routeOptions } = options;
  
  // Try route sources in order of preference
  const sources = [
    { 
      name: 'google', 
      fn: () => getDirectionsGoogle(origin, destination, routeOptions),
      available: !!GOOGLE_MAPS_API_KEY
    },
    { 
      name: 'mapbox', 
      fn: () => getDirectionsMapbox(origin, destination, routeOptions),
      available: !!MAPBOX_API_KEY
    },
    { 
      name: 'openroute', 
      fn: () => getDirectionsOpenRoute(origin, destination, routeOptions),
      available: true // Free service
    }
  ];
  
  // If preferred source is specified, try it first
  if (source !== 'auto') {
    const preferredIndex = sources.findIndex(s => s.name === source);
    if (preferredIndex > 0) {
      const preferred = sources.splice(preferredIndex, 1)[0];
      sources.unshift(preferred);
    }
  }
  
  // Try each source until one succeeds
  for (const sourceConfig of sources) {
    if (!sourceConfig.available) continue;
    
    try {
      const result = await sourceConfig.fn();
      if (result.success) {
        return result;
      }
    } catch (error) {
      console.warn(`${sourceConfig.name} routing failed:`, error.message);
      continue;
    }
  }
  
  // If all sources fail, return basic route estimation
  return getBasicRouteEstimation(origin, destination);
}

// Basic route estimation when APIs fail
function getBasicRouteEstimation(origin, destination) {
  // Simple straight-line distance calculation
  const originCoords = typeof origin === 'string' ? 
    { lat: 37.7749, lng: -122.4194 } : // San Francisco as default
    origin;
  const destCoords = typeof destination === 'string' ? 
    { lat: 37.7849, lng: -122.4094 } : // Nearby point as default
    destination;
  
  const distance = calculateDistance(
    originCoords.lat, originCoords.lng,
    destCoords.lat, destCoords.lng
  );
  
  const duration = Math.round(distance * 2); // Estimate 2 minutes per mile
  
  return {
    success: true,
    routes: [{
      summary: 'Estimated route',
      distance: {
        value: distance,
        text: `${distance.toFixed(1)} mi`
      },
      duration: {
        value: duration,
        text: `${duration} min`
      },
      legs: [{
        distance: { value: distance, text: `${distance.toFixed(1)} mi` },
        duration: { value: duration, text: `${duration} min` },
        start_location: originCoords,
        end_location: destCoords,
        steps: [{
          distance: { value: distance, text: `${distance.toFixed(1)} mi` },
          duration: { value: duration, text: `${duration} min` },
          html_instructions: `Head to ${typeof destination === 'string' ? destination : 'destination'}`,
          maneuver: 'straight',
          start_location: originCoords,
          end_location: destCoords
        }]
      }],
      warnings: [],
      estimated: true
    }],
    source: 'estimation',
    warning: 'Using estimated route data - external services unavailable'
  };
}

// Format Google Maps route to standard format
function formatGoogleRoute(route) {
  const leg = route.legs[0];
  
  return {
    summary: route.summary,
    distance: {
      value: convertMetersToMiles(leg.distance.value),
      text: leg.distance.text
    },
    duration: {
      value: Math.round(leg.duration.value / 60), // Convert seconds to minutes
      text: leg.duration.text
    },
    legs: route.legs.map(leg => ({
      distance: {
        value: convertMetersToMiles(leg.distance.value),
        text: leg.distance.text
      },
      duration: {
        value: Math.round(leg.duration.value / 60),
        text: leg.duration.text
      },
      start_location: leg.start_location,
      end_location: leg.end_location,
      steps: leg.steps.map(step => ({
        distance: {
          value: convertMetersToMiles(step.distance.value),
          text: step.distance.text
        },
        duration: {
          value: Math.round(step.duration.value / 60),
          text: step.duration.text
        },
        html_instructions: step.html_instructions,
        maneuver: step.maneuver,
        start_location: step.start_location,
        end_location: step.end_location
      }))
    })),
    warnings: route.warnings || [],
    polyline: route.overview_polyline?.points
  };
}

// Format Mapbox route to standard format
function formatMapboxRoute(route) {
  return {
    summary: 'Mapbox route',
    distance: {
      value: convertMetersToMiles(route.distance),
      text: `${convertMetersToMiles(route.distance).toFixed(1)} mi`
    },
    duration: {
      value: Math.round(route.duration / 60),
      text: `${Math.round(route.duration / 60)} min`
    },
    legs: route.legs.map(leg => ({
      distance: {
        value: convertMetersToMiles(leg.distance),
        text: `${convertMetersToMiles(leg.distance).toFixed(1)} mi`
      },
      duration: {
        value: Math.round(leg.duration / 60),
        text: `${Math.round(leg.duration / 60)} min`
      },
      start_location: {
        lat: leg.steps[0].maneuver.location[1],
        lng: leg.steps[0].maneuver.location[0]
      },
      end_location: {
        lat: leg.steps[leg.steps.length - 1].maneuver.location[1],
        lng: leg.steps[leg.steps.length - 1].maneuver.location[0]
      },
      steps: leg.steps.map(step => ({
        distance: {
          value: convertMetersToMiles(step.distance),
          text: `${convertMetersToMiles(step.distance).toFixed(1)} mi`
        },
        duration: {
          value: Math.round(step.duration / 60),
          text: `${Math.round(step.duration / 60)} min`
        },
        html_instructions: step.maneuver.instruction,
        maneuver: step.maneuver.type,
        start_location: {
          lat: step.maneuver.location[1],
          lng: step.maneuver.location[0]
        },
        end_location: {
          lat: step.maneuver.location[1],
          lng: step.maneuver.location[0]
        }
      }))
    })),
    warnings: [],
    polyline: route.geometry
  };
}

// Format OpenRouteService route to standard format
function formatOpenRouteRoute(route) {
  const summary = route.summary;
  
  return {
    summary: 'OpenRoute route',
    distance: {
      value: convertMetersToMiles(summary.distance),
      text: `${convertMetersToMiles(summary.distance).toFixed(1)} mi`
    },
    duration: {
      value: Math.round(summary.duration / 60),
      text: `${Math.round(summary.duration / 60)} min`
    },
    legs: [{
      distance: {
        value: convertMetersToMiles(summary.distance),
        text: `${convertMetersToMiles(summary.distance).toFixed(1)} mi`
      },
      duration: {
        value: Math.round(summary.duration / 60),
        text: `${Math.round(summary.duration / 60)} min`
      },
      start_location: {
        lat: route.geometry.coordinates[0][1],
        lng: route.geometry.coordinates[0][0]
      },
      end_location: {
        lat: route.geometry.coordinates[route.geometry.coordinates.length - 1][1],
        lng: route.geometry.coordinates[route.geometry.coordinates.length - 1][0]
      },
      steps: route.segments[0].steps.map(step => ({
        distance: {
          value: convertMetersToMiles(step.distance),
          text: `${convertMetersToMiles(step.distance).toFixed(1)} mi`
        },
        duration: {
          value: Math.round(step.duration / 60),
          text: `${Math.round(step.duration / 60)} min`
        },
        html_instructions: step.instruction,
        maneuver: step.type.toString(),
        start_location: {
          lat: route.geometry.coordinates[step.way_points[0]][1],
          lng: route.geometry.coordinates[step.way_points[0]][0]
        },
        end_location: {
          lat: route.geometry.coordinates[step.way_points[1]][1],
          lng: route.geometry.coordinates[step.way_points[1]][0]
        }
      }))
    }],
    warnings: [],
    polyline: route.geometry
  };
}

// Utility functions
function convertMetersToMiles(meters) {
  return meters * 0.000621371;
}

function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 3959; // Earth's radius in miles
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
      type = 'directions',
      origin,
      destination,
      mode = 'driving',
      alternatives = 'true',
      avoid = '',
      waypoints = '',
      source = 'auto',
      units = 'imperial'
    } = { ...query, ...body };
    
    if (type === 'directions') {
      if (!origin || !destination) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({
            success: false,
            error: 'Origin and destination parameters are required'
          })
        };
      }
      
      const options = {
        mode,
        alternatives: alternatives === 'true',
        avoid,
        waypoints: waypoints || undefined,
        source,
        units
      };
      
      const result = await getRouteWithFallback(origin, destination, options);
      
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify(result)
      };
      
    } else {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          error: 'Invalid type parameter. Currently supported: directions'
        })
      };
    }
    
  } catch (error) {
    console.error('Maps API error:', error);
    
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
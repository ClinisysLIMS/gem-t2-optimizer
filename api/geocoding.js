/**
 * Serverless Geocoding API Function
 * Handles geocoding requests using Nominatim and Google Maps API
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

// Rate limiting for Nominatim (required by their terms)
let lastNominatimRequest = 0;
const NOMINATIM_RATE_LIMIT = 1000; // 1 second between requests

async function enforceNominatimRateLimit() {
  const now = Date.now();
  const timeSinceLastRequest = now - lastNominatimRequest;
  
  if (timeSinceLastRequest < NOMINATIM_RATE_LIMIT) {
    const delay = NOMINATIM_RATE_LIMIT - timeSinceLastRequest;
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  
  lastNominatimRequest = Date.now();
}

// Forward geocoding using Nominatim (free)
async function geocodeWithNominatim(address, options = {}) {
  try {
    await enforceNominatimRateLimit();
    
    const params = new URLSearchParams({
      q: address,
      format: 'json',
      addressdetails: 1,
      limit: options.limit || 5,
      ...options
    });
    
    const url = `https://nominatim.openstreetmap.org/search?${params}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'GEM-T2-Optimizer/1.0 (https://github.com/gem-optimizer)'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data || data.length === 0) {
      return {
        success: false,
        error: 'No results found',
        results: []
      };
    }
    
    const results = data.map(item => formatNominatimResult(item));
    
    return {
      success: true,
      results: results,
      source: 'nominatim'
    };
  } catch (error) {
    console.error('Nominatim geocoding error:', error);
    throw error;
  }
}

// Reverse geocoding using Nominatim
async function reverseGeocodeWithNominatim(lat, lng, options = {}) {
  try {
    await enforceNominatimRateLimit();
    
    const params = new URLSearchParams({
      lat: lat,
      lon: lng,
      format: 'json',
      addressdetails: 1,
      zoom: options.zoom || 18,
      ...options
    });
    
    const url = `https://nominatim.openstreetmap.org/reverse?${params}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'GEM-T2-Optimizer/1.0 (https://github.com/gem-optimizer)'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Nominatim reverse API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data || data.error) {
      return {
        success: false,
        error: data?.error || 'No results found',
        results: []
      };
    }
    
    const result = formatNominatimResult(data);
    
    return {
      success: true,
      results: [result],
      source: 'nominatim'
    };
  } catch (error) {
    console.error('Nominatim reverse geocoding error:', error);
    throw error;
  }
}

// Forward geocoding using Google Maps API
async function geocodeWithGoogle(address, options = {}) {
  if (!GOOGLE_MAPS_API_KEY) {
    throw new Error('Google Maps API key not configured');
  }
  
  try {
    const params = new URLSearchParams({
      address: address,
      key: GOOGLE_MAPS_API_KEY,
      ...options
    });
    
    const url = `https://maps.googleapis.com/maps/api/geocode/json?${params}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Google Maps API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.status !== 'OK') {
      return {
        success: false,
        error: data.error_message || data.status,
        results: []
      };
    }
    
    const results = data.results.map(item => formatGoogleResult(item));
    
    return {
      success: true,
      results: results,
      source: 'google_maps'
    };
  } catch (error) {
    console.error('Google Maps geocoding error:', error);
    throw error;
  }
}

// Reverse geocoding using Google Maps API
async function reverseGeocodeWithGoogle(lat, lng, options = {}) {
  if (!GOOGLE_MAPS_API_KEY) {
    throw new Error('Google Maps API key not configured');
  }
  
  try {
    const params = new URLSearchParams({
      latlng: `${lat},${lng}`,
      key: GOOGLE_MAPS_API_KEY,
      ...options
    });
    
    const url = `https://maps.googleapis.com/maps/api/geocode/json?${params}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Google Maps reverse API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.status !== 'OK') {
      return {
        success: false,
        error: data.error_message || data.status,
        results: []
      };
    }
    
    const results = data.results.map(item => formatGoogleResult(item));
    
    return {
      success: true,
      results: results,
      source: 'google_maps'
    };
  } catch (error) {
    console.error('Google Maps reverse geocoding error:', error);
    throw error;
  }
}

// Format Nominatim result to standard format
function formatNominatimResult(item) {
  return {
    formattedAddress: item.display_name,
    location: {
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon)
    },
    placeId: item.place_id,
    types: [item.type, item.class].filter(Boolean),
    importance: item.importance,
    addressComponents: parseNominatimAddress(item.address || {}),
    bounds: item.boundingbox ? {
      northeast: {
        lat: parseFloat(item.boundingbox[1]),
        lng: parseFloat(item.boundingbox[3])
      },
      southwest: {
        lat: parseFloat(item.boundingbox[0]),
        lng: parseFloat(item.boundingbox[2])
      }
    } : null,
    source: 'nominatim'
  };
}

// Format Google Maps result to standard format
function formatGoogleResult(item) {
  return {
    formattedAddress: item.formatted_address,
    location: {
      lat: item.geometry.location.lat,
      lng: item.geometry.location.lng
    },
    placeId: item.place_id,
    types: item.types,
    importance: null,
    addressComponents: item.address_components.map(component => ({
      longName: component.long_name,
      shortName: component.short_name,
      types: component.types
    })),
    bounds: item.geometry.bounds || item.geometry.viewport,
    source: 'google_maps'
  };
}

// Parse Nominatim address components
function parseNominatimAddress(address) {
  const components = [];
  
  const mappings = {
    house_number: ['street_number'],
    road: ['route', 'street'],
    suburb: ['sublocality', 'neighborhood'],
    city: ['locality'],
    town: ['locality'],
    village: ['locality'],
    county: ['administrative_area_level_2'],
    state: ['administrative_area_level_1'],
    postcode: ['postal_code'],
    country: ['country'],
    country_code: ['country_code']
  };
  
  Object.entries(address).forEach(([key, value]) => {
    if (value && mappings[key]) {
      components.push({
        longName: value,
        shortName: key === 'country_code' ? value.toUpperCase() : value,
        types: mappings[key]
      });
    }
  });
  
  return components;
}

// Batch geocoding with rate limiting
async function batchGeocode(addresses, options = {}) {
  if (!Array.isArray(addresses) || addresses.length === 0) {
    throw new Error('Addresses must be a non-empty array');
  }
  
  if (addresses.length > 20) {
    throw new Error('Maximum 20 addresses allowed per batch');
  }
  
  const results = [];
  const source = options.source || 'auto';
  
  for (let i = 0; i < addresses.length; i++) {
    try {
      let result;
      
      if (source === 'google' && GOOGLE_MAPS_API_KEY) {
        result = await geocodeWithGoogle(addresses[i], options);
      } else {
        result = await geocodeWithNominatim(addresses[i], options);
      }
      
      results.push({
        input: addresses[i],
        success: result.success,
        data: result.success ? result.results[0] : null,
        error: result.error || null
      });
      
    } catch (error) {
      results.push({
        input: addresses[i],
        success: false,
        data: null,
        error: error.message
      });
    }
  }
  
  return {
    success: true,
    results: results,
    processed: results.length,
    successful: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length
  };
}

// Places search using Nominatim
async function searchPlaces(query, options = {}) {
  try {
    const {
      lat = null,
      lng = null,
      radius = null,
      limit = 10,
      countryCode = null
    } = options;
    
    await enforceNominatimRateLimit();
    
    const params = {
      q: query,
      format: 'json',
      addressdetails: 1,
      limit: Math.min(limit, 50),
      extratags: 1,
      namedetails: 1
    };
    
    if (lat && lng) {
      params.lat = lat;
      params.lon = lng;
      if (radius) {
        params.bounded = 1;
        const offset = radius / 111000; // Rough conversion to degrees
        params.viewbox = `${lng - offset},${lat + offset},${lng + offset},${lat - offset}`;
      }
    }
    
    if (countryCode) {
      params.countrycodes = countryCode;
    }
    
    const url = `https://nominatim.openstreetmap.org/search?${new URLSearchParams(params)}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'GEM-T2-Optimizer/1.0 (https://github.com/gem-optimizer)'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Nominatim search error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data || data.length === 0) {
      return {
        success: true,
        results: [],
        source: 'nominatim'
      };
    }
    
    let results = data.map(item => ({
      ...formatNominatimResult(item),
      category: item.type,
      amenity: item.extratags?.amenity || null,
      name: item.namedetails?.name || item.display_name.split(',')[0]
    }));
    
    // Sort by distance if center point provided
    if (lat && lng) {
      results = results.map(result => ({
        ...result,
        distance: calculateDistance(lat, lng, result.location.lat, result.location.lng)
      })).sort((a, b) => a.distance - b.distance);
    }
    
    return {
      success: true,
      results: results,
      source: 'nominatim'
    };
  } catch (error) {
    console.error('Places search error:', error);
    throw error;
  }
}

// Calculate distance between two points (Haversine formula)
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth's radius in kilometers
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
    const { 
      type = 'forward', 
      address, 
      lat, 
      lng, 
      q,
      limit = '5',
      source = 'auto',
      countryCode,
      radius
    } = query;
    
    let result;
    
    if (type === 'forward') {
      const searchAddress = address || q;
      if (!searchAddress) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({
            success: false,
            error: 'Address or query parameter is required'
          })
        };
      }
      
      const options = { limit: parseInt(limit), countryCode, radius: radius ? parseFloat(radius) : null };
      
      if (source === 'google' && GOOGLE_MAPS_API_KEY) {
        result = await geocodeWithGoogle(searchAddress, options);
      } else {
        result = await geocodeWithNominatim(searchAddress, options);
      }
      
    } else if (type === 'reverse') {
      if (!lat || !lng) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({
            success: false,
            error: 'Latitude and longitude parameters are required'
          })
        };
      }
      
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lng);
      
      if (isNaN(latitude) || isNaN(longitude)) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({
            success: false,
            error: 'Invalid latitude or longitude values'
          })
        };
      }
      
      if (source === 'google' && GOOGLE_MAPS_API_KEY) {
        result = await reverseGeocodeWithGoogle(latitude, longitude);
      } else {
        result = await reverseGeocodeWithNominatim(latitude, longitude);
      }
      
    } else if (type === 'places') {
      const searchQuery = q;
      if (!searchQuery) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({
            success: false,
            error: 'Query parameter is required for places search'
          })
        };
      }
      
      const options = {
        lat: lat ? parseFloat(lat) : null,
        lng: lng ? parseFloat(lng) : null,
        limit: parseInt(limit),
        countryCode,
        radius: radius ? parseFloat(radius) : null
      };
      
      result = await searchPlaces(searchQuery, options);
      
    } else {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          error: 'Invalid type parameter. Use: forward, reverse, or places'
        })
      };
    }
    
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(result)
    };
    
  } catch (error) {
    console.error('Geocoding API error:', error);
    
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
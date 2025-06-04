/**
 * Geocoding API Routes
 * Proxy for geocoding services (address to coordinates and reverse)
 */

const express = require('express');
const axios = require('axios');
const { query, validationResult } = require('express-validator');
const router = express.Router();

// Validation middleware
const validateGeocodingRequest = [
    query('address').notEmpty().isLength({ min: 2, max: 200 }).trim()
];

const validateReverseGeocodingRequest = [
    query('lat').isFloat({ min: -90, max: 90 }),
    query('lng').isFloat({ min: -180, max: 180 })
];

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

// Forward geocoding (address to coordinates)
router.get('/forward', validateGeocodingRequest, handleValidationErrors, async (req, res) => {
    if (process.env.ENABLE_GEOCODING !== 'true') {
        return res.status(503).json({
            error: 'Geocoding API disabled',
            message: 'Geocoding service is currently disabled'
        });
    }

    const { address, bounds, region, components } = req.query;

    // Try Google Maps Geocoding API first
    if (process.env.GOOGLE_MAPS_API_KEY) {
        try {
            const params = {
                address: address,
                key: process.env.GOOGLE_MAPS_API_KEY
            };

            if (bounds) params.bounds = bounds;
            if (region) params.region = region;
            if (components) params.components = components;

            const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
                params: params,
                timeout: 10000
            });

            const data = response.data;

            if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
                throw new Error(`Google Geocoding API error: ${data.status}`);
            }

            const standardResults = {
                results: data.results.map(result => ({
                    formattedAddress: result.formatted_address,
                    geometry: {
                        location: result.geometry.location,
                        locationType: result.geometry.location_type,
                        viewport: result.geometry.viewport,
                        bounds: result.geometry.bounds
                    },
                    addressComponents: result.address_components.map(component => ({
                        longName: component.long_name,
                        shortName: component.short_name,
                        types: component.types
                    })),
                    types: result.types,
                    partialMatch: result.partial_match
                })),
                status: data.status,
                timestamp: new Date().toISOString(),
                source: 'google_geocoding'
            };

            return res.json({
                success: true,
                data: standardResults,
                cached: false
            });

        } catch (error) {
            console.warn('Google Geocoding API failed, trying Nominatim:', error.message);
        }
    }

    // Fallback to Nominatim (OpenStreetMap)
    try {
        const response = await axios.get('https://nominatim.openstreetmap.org/search', {
            params: {
                q: address,
                format: 'json',
                addressdetails: 1,
                limit: 10,
                countrycodes: region || undefined
            },
            headers: {
                'User-Agent': 'GEM-Optimizer-Backend/1.0'
            },
            timeout: 10000
        });

        const data = response.data;

        const standardResults = {
            results: data.map(result => ({
                formattedAddress: result.display_name,
                geometry: {
                    location: {
                        lat: parseFloat(result.lat),
                        lng: parseFloat(result.lon)
                    },
                    locationType: 'APPROXIMATE',
                    viewport: {
                        northeast: {
                            lat: parseFloat(result.boundingbox[1]),
                            lng: parseFloat(result.boundingbox[3])
                        },
                        southwest: {
                            lat: parseFloat(result.boundingbox[0]),
                            lng: parseFloat(result.boundingbox[2])
                        }
                    }
                },
                addressComponents: result.address ? Object.entries(result.address).map(([key, value]) => ({
                    longName: value,
                    shortName: value,
                    types: [key]
                })) : [],
                types: [result.type, result.class].filter(Boolean),
                partialMatch: false,
                importance: result.importance,
                placeId: result.place_id
            })),
            status: data.length > 0 ? 'OK' : 'ZERO_RESULTS',
            timestamp: new Date().toISOString(),
            source: 'nominatim'
        };

        res.json({
            success: true,
            data: standardResults,
            cached: false
        });

    } catch (error) {
        console.error('Nominatim geocoding error:', error.message);
        res.status(500).json({
            error: 'Geocoding service error',
            message: 'Failed to geocode address',
            details: process.env.NODE_ENV !== 'production' ? error.message : undefined
        });
    }
});

// Reverse geocoding (coordinates to address)
router.get('/reverse', validateReverseGeocodingRequest, handleValidationErrors, async (req, res) => {
    if (process.env.ENABLE_GEOCODING !== 'true') {
        return res.status(503).json({
            error: 'Geocoding API disabled',
            message: 'Geocoding service is currently disabled'
        });
    }

    const { lat, lng, result_type, location_type } = req.query;

    // Try Google Maps Reverse Geocoding API first
    if (process.env.GOOGLE_MAPS_API_KEY) {
        try {
            const params = {
                latlng: `${lat},${lng}`,
                key: process.env.GOOGLE_MAPS_API_KEY
            };

            if (result_type) params.result_type = result_type;
            if (location_type) params.location_type = location_type;

            const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
                params: params,
                timeout: 10000
            });

            const data = response.data;

            if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
                throw new Error(`Google Reverse Geocoding API error: ${data.status}`);
            }

            const standardResults = {
                results: data.results.map(result => ({
                    formattedAddress: result.formatted_address,
                    geometry: {
                        location: result.geometry.location,
                        locationType: result.geometry.location_type,
                        viewport: result.geometry.viewport
                    },
                    addressComponents: result.address_components.map(component => ({
                        longName: component.long_name,
                        shortName: component.short_name,
                        types: component.types
                    })),
                    types: result.types,
                    placeId: result.place_id
                })),
                status: data.status,
                timestamp: new Date().toISOString(),
                source: 'google_reverse_geocoding'
            };

            return res.json({
                success: true,
                data: standardResults,
                cached: false
            });

        } catch (error) {
            console.warn('Google Reverse Geocoding API failed, trying Nominatim:', error.message);
        }
    }

    // Fallback to Nominatim reverse geocoding
    try {
        const response = await axios.get('https://nominatim.openstreetmap.org/reverse', {
            params: {
                lat: lat,
                lon: lng,
                format: 'json',
                addressdetails: 1,
                zoom: 18
            },
            headers: {
                'User-Agent': 'GEM-Optimizer-Backend/1.0'
            },
            timeout: 10000
        });

        const data = response.data;

        if (!data || data.error) {
            return res.json({
                success: true,
                data: {
                    results: [],
                    status: 'ZERO_RESULTS',
                    timestamp: new Date().toISOString(),
                    source: 'nominatim'
                },
                cached: false
            });
        }

        const standardResults = {
            results: [{
                formattedAddress: data.display_name,
                geometry: {
                    location: {
                        lat: parseFloat(data.lat),
                        lng: parseFloat(data.lon)
                    },
                    locationType: 'APPROXIMATE',
                    viewport: data.boundingbox ? {
                        northeast: {
                            lat: parseFloat(data.boundingbox[1]),
                            lng: parseFloat(data.boundingbox[3])
                        },
                        southwest: {
                            lat: parseFloat(data.boundingbox[0]),
                            lng: parseFloat(data.boundingbox[2])
                        }
                    } : null
                },
                addressComponents: data.address ? Object.entries(data.address).map(([key, value]) => ({
                    longName: value,
                    shortName: value,
                    types: [key]
                })) : [],
                types: [data.type, data.class].filter(Boolean),
                placeId: data.place_id,
                importance: data.importance
            }],
            status: 'OK',
            timestamp: new Date().toISOString(),
            source: 'nominatim'
        };

        res.json({
            success: true,
            data: standardResults,
            cached: false
        });

    } catch (error) {
        console.error('Nominatim reverse geocoding error:', error.message);
        res.status(500).json({
            error: 'Reverse geocoding service error',
            message: 'Failed to reverse geocode coordinates',
            details: process.env.NODE_ENV !== 'production' ? error.message : undefined
        });
    }
});

// Batch geocoding
router.post('/batch', async (req, res) => {
    if (process.env.ENABLE_GEOCODING !== 'true') {
        return res.status(503).json({
            error: 'Geocoding API disabled',
            message: 'Geocoding service is currently disabled'
        });
    }

    try {
        const { addresses } = req.body;

        if (!Array.isArray(addresses) || addresses.length === 0) {
            return res.status(400).json({
                error: 'Invalid request',
                message: 'Addresses must be a non-empty array'
            });
        }

        if (addresses.length > 25) {
            return res.status(400).json({
                error: 'Too many addresses',
                message: 'Maximum 25 addresses allowed per batch'
            });
        }

        // Process addresses sequentially to avoid rate limits
        const results = [];
        
        for (const address of addresses) {
            try {
                // Add small delay between requests
                if (results.length > 0) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }

                const geocodeResult = await geocodeAddress(address);
                results.push({
                    input: address,
                    success: true,
                    data: geocodeResult
                });
            } catch (error) {
                results.push({
                    input: address,
                    success: false,
                    error: error.message
                });
            }
        }

        res.json({
            success: true,
            data: {
                results: results,
                processed: results.length,
                successful: results.filter(r => r.success).length,
                failed: results.filter(r => !r.success).length,
                timestamp: new Date().toISOString()
            },
            cached: false
        });

    } catch (error) {
        console.error('Batch geocoding error:', error.message);
        res.status(500).json({
            error: 'Batch geocoding error',
            message: 'Failed to process batch geocoding request',
            details: process.env.NODE_ENV !== 'production' ? error.message : undefined
        });
    }
});

// Helper function for single address geocoding
async function geocodeAddress(address) {
    // Try Google first, then Nominatim
    if (process.env.GOOGLE_MAPS_API_KEY) {
        try {
            const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
                params: {
                    address: address,
                    key: process.env.GOOGLE_MAPS_API_KEY
                },
                timeout: 5000
            });

            if (response.data.status === 'OK' && response.data.results.length > 0) {
                return {
                    location: response.data.results[0].geometry.location,
                    formattedAddress: response.data.results[0].formatted_address,
                    source: 'google'
                };
            }
        } catch (error) {
            // Fall through to Nominatim
        }
    }

    // Nominatim fallback
    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
        params: {
            q: address,
            format: 'json',
            limit: 1
        },
        headers: {
            'User-Agent': 'GEM-Optimizer-Backend/1.0'
        },
        timeout: 5000
    });

    if (response.data.length > 0) {
        return {
            location: {
                lat: parseFloat(response.data[0].lat),
                lng: parseFloat(response.data[0].lon)
            },
            formattedAddress: response.data[0].display_name,
            source: 'nominatim'
        };
    }

    throw new Error('No results found');
}

module.exports = router;
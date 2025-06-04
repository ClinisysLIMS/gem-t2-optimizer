/**
 * Google Maps API Routes
 * Proxy for Google Maps services including directions, places, and distance matrix
 */

const express = require('express');
const axios = require('axios');
const { body, query, validationResult } = require('express-validator');
const router = express.Router();

// Validation middleware
const validateDirectionsRequest = [
    body('origin').notEmpty().isLength({ min: 2, max: 200 }).trim(),
    body('destination').notEmpty().isLength({ min: 2, max: 200 }).trim(),
    body('mode').optional().isIn(['driving', 'walking', 'bicycling', 'transit']),
    body('avoid').optional().isArray(),
    body('waypoints').optional().isArray()
];

const validatePlacesRequest = [
    query('query').notEmpty().isLength({ min: 2, max: 200 }).trim(),
    query('location').optional().matches(/^-?\d+\.?\d*,-?\d+\.?\d*$/),
    query('radius').optional().isInt({ min: 1, max: 50000 })
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

// Get directions between two points
router.post('/directions', validateDirectionsRequest, handleValidationErrors, async (req, res) => {
    if (process.env.ENABLE_MAPS_API !== 'true') {
        return res.status(503).json({
            error: 'Maps API disabled',
            message: 'Google Maps service is currently disabled'
        });
    }

    if (!process.env.GOOGLE_MAPS_API_KEY) {
        return res.status(503).json({
            error: 'Maps API not configured',
            message: 'Google Maps API key not found'
        });
    }

    try {
        const { origin, destination, mode = 'driving', avoid, waypoints, alternatives = true } = req.body;

        const params = {
            origin: origin,
            destination: destination,
            mode: mode,
            alternatives: alternatives,
            key: process.env.GOOGLE_MAPS_API_KEY
        };

        if (avoid && avoid.length > 0) {
            params.avoid = avoid.join('|');
        }

        if (waypoints && waypoints.length > 0) {
            params.waypoints = waypoints.join('|');
        }

        const response = await axios.get('https://maps.googleapis.com/maps/api/directions/json', {
            params: params,
            timeout: 15000
        });

        const data = response.data;

        if (data.status !== 'OK') {
            return res.status(400).json({
                error: 'Directions API error',
                message: data.error_message || `Status: ${data.status}`,
                status: data.status
            });
        }

        // Transform to our standard format
        const standardDirections = {
            routes: data.routes.map(route => ({
                summary: route.summary,
                distance: {
                    text: route.legs.reduce((total, leg) => total + leg.distance.value, 0),
                    value: route.legs.reduce((total, leg) => total + leg.distance.value, 0)
                },
                duration: {
                    text: route.legs.reduce((total, leg) => total + leg.duration.value, 0),
                    value: route.legs.reduce((total, leg) => total + leg.duration.value, 0)
                },
                legs: route.legs.map(leg => ({
                    distance: leg.distance,
                    duration: leg.duration,
                    startAddress: leg.start_address,
                    endAddress: leg.end_address,
                    startLocation: leg.start_location,
                    endLocation: leg.end_location,
                    steps: leg.steps.map(step => ({
                        distance: step.distance,
                        duration: step.duration,
                        instruction: step.html_instructions.replace(/<[^>]*>/g, ''), // Strip HTML
                        maneuver: step.maneuver,
                        startLocation: step.start_location,
                        endLocation: step.end_location
                    }))
                })),
                polyline: route.overview_polyline.points,
                bounds: route.bounds,
                warnings: route.warnings
            })),
            status: data.status,
            timestamp: new Date().toISOString(),
            source: 'google_maps'
        };

        res.json({
            success: true,
            data: standardDirections,
            cached: false
        });

    } catch (error) {
        console.error('Google Maps Directions API error:', error.message);
        
        if (error.response?.status === 403) {
            return res.status(503).json({
                error: 'Maps API quota exceeded',
                message: 'Google Maps API quota has been exceeded'
            });
        }

        res.status(500).json({
            error: 'Maps service error',
            message: 'Failed to fetch directions',
            details: process.env.NODE_ENV !== 'production' ? error.message : undefined
        });
    }
});

// Search for places
router.get('/places/search', validatePlacesRequest, handleValidationErrors, async (req, res) => {
    if (process.env.ENABLE_MAPS_API !== 'true') {
        return res.status(503).json({
            error: 'Maps API disabled',
            message: 'Google Maps service is currently disabled'
        });
    }

    if (!process.env.GOOGLE_MAPS_API_KEY) {
        return res.status(503).json({
            error: 'Maps API not configured',
            message: 'Google Maps API key not found'
        });
    }

    try {
        const { query, location, radius = 10000, type } = req.query;

        const params = {
            query: query,
            key: process.env.GOOGLE_MAPS_API_KEY
        };

        if (location) {
            params.location = location;
            params.radius = radius;
        }

        if (type) {
            params.type = type;
        }

        const response = await axios.get('https://maps.googleapis.com/maps/api/place/textsearch/json', {
            params: params,
            timeout: 10000
        });

        const data = response.data;

        if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
            return res.status(400).json({
                error: 'Places API error',
                message: data.error_message || `Status: ${data.status}`,
                status: data.status
            });
        }

        // Transform to our standard format
        const standardPlaces = {
            results: data.results.map(place => ({
                placeId: place.place_id,
                name: place.name,
                formattedAddress: place.formatted_address,
                location: place.geometry.location,
                rating: place.rating,
                priceLevel: place.price_level,
                types: place.types,
                photos: place.photos ? place.photos.map(photo => ({
                    reference: photo.photo_reference,
                    width: photo.width,
                    height: photo.height
                })) : [],
                openingHours: place.opening_hours ? {
                    openNow: place.opening_hours.open_now,
                    weekdayText: place.opening_hours.weekday_text
                } : null
            })),
            status: data.status,
            nextPageToken: data.next_page_token,
            timestamp: new Date().toISOString(),
            source: 'google_places'
        };

        res.json({
            success: true,
            data: standardPlaces,
            cached: false
        });

    } catch (error) {
        console.error('Google Places API error:', error.message);
        res.status(500).json({
            error: 'Places service error',
            message: 'Failed to search places',
            details: process.env.NODE_ENV !== 'production' ? error.message : undefined
        });
    }
});

// Get distance matrix
router.post('/distance-matrix', async (req, res) => {
    if (process.env.ENABLE_MAPS_API !== 'true') {
        return res.status(503).json({
            error: 'Maps API disabled',
            message: 'Google Maps service is currently disabled'
        });
    }

    if (!process.env.GOOGLE_MAPS_API_KEY) {
        return res.status(503).json({
            error: 'Maps API not configured',
            message: 'Google Maps API key not found'
        });
    }

    try {
        const { origins, destinations, mode = 'driving', units = 'imperial', avoid } = req.body;

        if (!origins || !destinations || !Array.isArray(origins) || !Array.isArray(destinations)) {
            return res.status(400).json({
                error: 'Invalid request',
                message: 'Origins and destinations must be arrays'
            });
        }

        const params = {
            origins: origins.join('|'),
            destinations: destinations.join('|'),
            mode: mode,
            units: units,
            key: process.env.GOOGLE_MAPS_API_KEY
        };

        if (avoid) {
            params.avoid = Array.isArray(avoid) ? avoid.join('|') : avoid;
        }

        const response = await axios.get('https://maps.googleapis.com/maps/api/distancematrix/json', {
            params: params,
            timeout: 10000
        });

        const data = response.data;

        if (data.status !== 'OK') {
            return res.status(400).json({
                error: 'Distance Matrix API error',
                message: data.error_message || `Status: ${data.status}`,
                status: data.status
            });
        }

        res.json({
            success: true,
            data: {
                originAddresses: data.origin_addresses,
                destinationAddresses: data.destination_addresses,
                rows: data.rows,
                status: data.status,
                timestamp: new Date().toISOString(),
                source: 'google_distance_matrix'
            },
            cached: false
        });

    } catch (error) {
        console.error('Google Distance Matrix API error:', error.message);
        res.status(500).json({
            error: 'Distance Matrix service error',
            message: 'Failed to calculate distance matrix',
            details: process.env.NODE_ENV !== 'production' ? error.message : undefined
        });
    }
});

module.exports = router;
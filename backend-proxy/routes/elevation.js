/**
 * Elevation API Routes
 * Proxy for elevation data services
 */

const express = require('express');
const axios = require('axios');
const { body, query, validationResult } = require('express-validator');
const router = express.Router();

// Validation middleware
const validateElevationRequest = [
    body('locations').isArray({ min: 1, max: 512 }),
    body('locations.*').matches(/^-?\d+\.?\d*,-?\d+\.?\d*$/),
];

const validatePathElevationRequest = [
    body('path').isArray({ min: 2, max: 512 }),
    body('path.*').matches(/^-?\d+\.?\d*,-?\d+\.?\d*$/),
    body('samples').optional().isInt({ min: 2, max: 512 })
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

// Get elevation for specific locations
router.post('/locations', validateElevationRequest, handleValidationErrors, async (req, res) => {
    if (process.env.ENABLE_ELEVATION_API !== 'true') {
        return res.status(503).json({
            error: 'Elevation API disabled',
            message: 'Elevation service is currently disabled'
        });
    }

    // Try Google Maps Elevation API first
    if (process.env.GOOGLE_MAPS_API_KEY) {
        try {
            const { locations } = req.body;
            
            const response = await axios.get('https://maps.googleapis.com/maps/api/elevation/json', {
                params: {
                    locations: locations.join('|'),
                    key: process.env.GOOGLE_MAPS_API_KEY
                },
                timeout: 10000
            });

            const data = response.data;

            if (data.status !== 'OK') {
                throw new Error(`Google Elevation API error: ${data.status}`);
            }

            const standardElevation = {
                results: data.results.map(result => ({
                    elevation: Math.round(result.elevation * 3.28084), // Convert to feet
                    elevationMeters: result.elevation,
                    location: result.location,
                    resolution: result.resolution
                })),
                status: data.status,
                timestamp: new Date().toISOString(),
                source: 'google_elevation'
            };

            return res.json({
                success: true,
                data: standardElevation,
                cached: false
            });

        } catch (error) {
            console.warn('Google Elevation API failed, trying alternative:', error.message);
        }
    }

    // Fallback to Open-Elevation API
    try {
        const { locations } = req.body;
        
        const locationsArray = locations.map(loc => {
            const [lat, lng] = loc.split(',');
            return { latitude: parseFloat(lat), longitude: parseFloat(lng) };
        });

        const response = await axios.post('https://api.open-elevation.com/api/v1/lookup', {
            locations: locationsArray
        }, {
            timeout: 15000,
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = response.data;

        const standardElevation = {
            results: data.results.map((result, index) => ({
                elevation: Math.round(result.elevation * 3.28084), // Convert to feet
                elevationMeters: result.elevation,
                location: {
                    lat: result.latitude,
                    lng: result.longitude
                },
                resolution: null // Open-Elevation doesn't provide resolution
            })),
            status: 'OK',
            timestamp: new Date().toISOString(),
            source: 'open_elevation'
        };

        res.json({
            success: true,
            data: standardElevation,
            cached: false
        });

    } catch (error) {
        console.error('Elevation API error:', error.message);
        
        // Final fallback with estimated elevations
        const { locations } = req.body;
        const estimatedResults = locations.map(loc => {
            const [lat, lng] = loc.split(',');
            return {
                elevation: 500, // Default elevation in feet
                elevationMeters: 152.4,
                location: {
                    lat: parseFloat(lat),
                    lng: parseFloat(lng)
                },
                resolution: null,
                estimated: true
            };
        });

        res.json({
            success: true,
            data: {
                results: estimatedResults,
                status: 'ESTIMATED',
                timestamp: new Date().toISOString(),
                source: 'fallback_estimation'
            },
            cached: false,
            warning: 'Using estimated elevation data - external services unavailable'
        });
    }
});

// Get elevation profile along a path
router.post('/path', validatePathElevationRequest, handleValidationErrors, async (req, res) => {
    if (process.env.ENABLE_ELEVATION_API !== 'true') {
        return res.status(503).json({
            error: 'Elevation API disabled',
            message: 'Elevation service is currently disabled'
        });
    }

    // Try Google Maps Elevation API first
    if (process.env.GOOGLE_MAPS_API_KEY) {
        try {
            const { path, samples = 100 } = req.body;
            
            const response = await axios.get('https://maps.googleapis.com/maps/api/elevation/json', {
                params: {
                    path: path.join('|'),
                    samples: Math.min(samples, 512),
                    key: process.env.GOOGLE_MAPS_API_KEY
                },
                timeout: 15000
            });

            const data = response.data;

            if (data.status !== 'OK') {
                throw new Error(`Google Elevation API error: ${data.status}`);
            }

            // Calculate grade between points
            const results = data.results.map((result, index) => {
                let grade = 0;
                if (index > 0) {
                    const prev = data.results[index - 1];
                    const elevDiff = result.elevation - prev.elevation;
                    const distance = calculateDistance(
                        prev.location.lat, prev.location.lng,
                        result.location.lat, result.location.lng
                    );
                    grade = distance > 0 ? (elevDiff / distance) * 100 : 0;
                }

                return {
                    elevation: Math.round(result.elevation * 3.28084), // Convert to feet
                    elevationMeters: result.elevation,
                    location: result.location,
                    resolution: result.resolution,
                    grade: Math.round(grade * 100) / 100 // Round to 2 decimal places
                };
            });

            const standardProfile = {
                results: results,
                summary: {
                    minElevation: Math.min(...results.map(r => r.elevation)),
                    maxElevation: Math.max(...results.map(r => r.elevation)),
                    totalElevationGain: calculateElevationGain(results),
                    maxGrade: Math.max(...results.map(r => Math.abs(r.grade))),
                    avgGrade: calculateAverageGrade(results)
                },
                status: data.status,
                timestamp: new Date().toISOString(),
                source: 'google_elevation'
            };

            return res.json({
                success: true,
                data: standardProfile,
                cached: false
            });

        } catch (error) {
            console.warn('Google Elevation API failed for path, using fallback:', error.message);
        }
    }

    // Fallback to basic elevation estimation
    try {
        const { path, samples = 100 } = req.body;
        
        // Sample points along the path
        const sampledPath = samplePath(path, Math.min(samples, path.length));
        
        // Estimate elevations (this is a simple fallback)
        const results = sampledPath.map((point, index) => {
            const [lat, lng] = point.split(',');
            const baseElevation = 500; // Base elevation in feet
            const variation = Math.sin(index * 0.1) * 200; // Add some variation
            
            return {
                elevation: Math.round(baseElevation + variation),
                elevationMeters: Math.round((baseElevation + variation) / 3.28084),
                location: {
                    lat: parseFloat(lat),
                    lng: parseFloat(lng)
                },
                resolution: null,
                grade: index > 0 ? Math.random() * 10 - 5 : 0, // Random grade between -5% and 5%
                estimated: true
            };
        });

        const standardProfile = {
            results: results,
            summary: {
                minElevation: Math.min(...results.map(r => r.elevation)),
                maxElevation: Math.max(...results.map(r => r.elevation)),
                totalElevationGain: calculateElevationGain(results),
                maxGrade: Math.max(...results.map(r => Math.abs(r.grade))),
                avgGrade: calculateAverageGrade(results)
            },
            status: 'ESTIMATED',
            timestamp: new Date().toISOString(),
            source: 'fallback_estimation'
        };

        res.json({
            success: true,
            data: standardProfile,
            cached: false,
            warning: 'Using estimated elevation profile - external services unavailable'
        });

    } catch (error) {
        console.error('Elevation path API error:', error.message);
        res.status(500).json({
            error: 'Elevation service error',
            message: 'Failed to get elevation profile',
            details: process.env.NODE_ENV !== 'production' ? error.message : undefined
        });
    }
});

// Helper functions
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

function calculateElevationGain(results) {
    let gain = 0;
    for (let i = 1; i < results.length; i++) {
        const diff = results[i].elevation - results[i-1].elevation;
        if (diff > 0) gain += diff;
    }
    return Math.round(gain);
}

function calculateAverageGrade(results) {
    const grades = results.filter(r => r.grade !== 0).map(r => r.grade);
    return grades.length > 0 ? Math.round((grades.reduce((a, b) => a + b, 0) / grades.length) * 100) / 100 : 0;
}

function samplePath(path, samples) {
    if (path.length <= samples) return path;
    
    const step = (path.length - 1) / (samples - 1);
    const sampled = [];
    
    for (let i = 0; i < samples; i++) {
        const index = Math.round(i * step);
        sampled.push(path[index]);
    }
    
    return sampled;
}

module.exports = router;
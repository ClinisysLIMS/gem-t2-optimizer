/**
 * Health Check Routes
 * Simple health monitoring for the proxy server
 */

const express = require('express');
const router = express.Router();

// Basic health check
router.get('/', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: {
            used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
            total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB'
        },
        version: '1.0.0'
    });
});

// Detailed health check
router.get('/detailed', (req, res) => {
    const memUsage = process.memoryUsage();
    
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: {
            rss: Math.round(memUsage.rss / 1024 / 1024) + ' MB',
            heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + ' MB',
            heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + ' MB',
            external: Math.round(memUsage.external / 1024 / 1024) + ' MB'
        },
        process: {
            pid: process.pid,
            platform: process.platform,
            arch: process.arch,
            nodeVersion: process.version
        },
        environment: {
            nodeEnv: process.env.NODE_ENV,
            port: process.env.PORT,
            corsOrigin: process.env.CORS_ORIGIN ? 'configured' : 'not configured'
        },
        apis: {
            googleMaps: process.env.GOOGLE_MAPS_API_KEY ? 'configured' : 'not configured',
            openWeather: process.env.OPENWEATHER_API_KEY ? 'configured' : 'not configured',
            elevation: process.env.ELEVATIONAPI_KEY ? 'configured' : 'not configured'
        }
    });
});

module.exports = router;
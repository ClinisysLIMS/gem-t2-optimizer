/**
 * GEM Optimizer Backend Proxy Server
 * Secure proxy for third-party API calls with rate limiting and CORS
 */

require('dotenv').config();
require('express-async-errors');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const compression = require('compression');
const morgan = require('morgan');
const NodeCache = require('node-cache');

// Import route handlers
const weatherRoutes = require('./routes/weather');
const mapsRoutes = require('./routes/maps');
const elevationRoutes = require('./routes/elevation');
const geocodingRoutes = require('./routes/geocoding');
const healthRoutes = require('./routes/health');

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize cache
const cache = new NodeCache({
    stdTTL: parseInt(process.env.CACHE_TTL_SECONDS) || 3600,
    checkperiod: 600,
    useClones: false
});

// Middleware setup
app.set('trust proxy', process.env.TRUST_PROXY === 'true');

// Security middleware
if (process.env.ENABLE_HELMET !== 'false') {
    app.use(helmet({
        crossOriginEmbedderPolicy: false,
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com"],
                scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com"],
                imgSrc: ["'self'", "data:", "https:"],
                connectSrc: ["'self'", process.env.CORS_ORIGIN]
            }
        }
    }));
}

// CORS configuration
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests from GitHub Pages, localhost, and specified origins
        const allowedOrigins = [
            process.env.CORS_ORIGIN,
            'https://your-username.github.io',
            'http://localhost:3000',
            'http://localhost:8080',
            'http://127.0.0.1:3000',
            'http://127.0.0.1:8080'
        ].filter(Boolean);

        // Allow requests with no origin (mobile apps, etc.)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.warn(`CORS blocked request from origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Request logging
if (process.env.ENABLE_REQUEST_LOGGING !== 'false') {
    app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// Rate limiting middleware
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    skipSuccessfulRequests: process.env.RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS === 'true',
    message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: Math.ceil((parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000) / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        return req.ip || req.connection.remoteAddress;
    }
});

// Slow down middleware for additional protection
const speedLimiter = slowDown({
    windowMs: 15 * 60 * 1000, // 15 minutes
    delayAfter: 50, // Allow 50 requests per window at full speed
    delayMs: 100, // Add 100ms delay per request after delayAfter
    maxDelayMs: 2000, // Maximum delay of 2 seconds
});

app.use('/api', limiter);
app.use('/api', speedLimiter);

// Cache middleware
function cacheMiddleware(duration = 3600) {
    return (req, res, next) => {
        if (process.env.ENABLE_CACHE !== 'true') {
            return next();
        }

        const key = `${req.method}:${req.originalUrl}:${JSON.stringify(req.body)}`;
        const cached = cache.get(key);

        if (cached) {
            console.log(`Cache hit for ${key}`);
            return res.json({
                ...cached,
                cached: true,
                cacheHit: true
            });
        }

        // Override res.json to cache the response
        const originalJson = res.json;
        res.json = function(data) {
            if (res.statusCode === 200 && data) {
                cache.set(key, data, duration);
                console.log(`Cached response for ${key}`);
            }
            return originalJson.call(this, data);
        };

        next();
    };
}

// Health check endpoint (no rate limiting)
app.use('/health', healthRoutes);

// API Routes with caching
app.use('/api/weather', cacheMiddleware(1800), weatherRoutes); // 30 min cache
app.use('/api/maps', cacheMiddleware(3600), mapsRoutes); // 1 hour cache
app.use('/api/elevation', cacheMiddleware(7200), elevationRoutes); // 2 hour cache
app.use('/api/geocoding', cacheMiddleware(86400), geocodingRoutes); // 24 hour cache

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        name: 'GEM Optimizer Backend Proxy',
        version: '1.0.0',
        status: 'running',
        timestamp: new Date().toISOString(),
        endpoints: {
            health: '/health',
            weather: '/api/weather',
            maps: '/api/maps',
            elevation: '/api/elevation',
            geocoding: '/api/geocoding'
        }
    });
});

// API status endpoint
app.get('/api/status', (req, res) => {
    res.json({
        status: 'operational',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cache: {
            enabled: process.env.ENABLE_CACHE === 'true',
            keys: cache.keys().length,
            stats: cache.getStats()
        },
        features: {
            weather: process.env.ENABLE_WEATHER_API === 'true',
            maps: process.env.ENABLE_MAPS_API === 'true',
            elevation: process.env.ENABLE_ELEVATION_API === 'true',
            geocoding: process.env.ENABLE_GEOCODING === 'true'
        }
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString()
    });
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Error:', error);

    // CORS errors
    if (error.message === 'Not allowed by CORS') {
        return res.status(403).json({
            error: 'CORS policy violation',
            message: 'Origin not allowed',
            timestamp: new Date().toISOString()
        });
    }

    // Rate limit errors
    if (error.type === 'rate-limit') {
        return res.status(429).json({
            error: 'Rate limit exceeded',
            message: error.message,
            retryAfter: error.retryAfter,
            timestamp: new Date().toISOString()
        });
    }

    // Validation errors
    if (error.type === 'validation') {
        return res.status(400).json({
            error: 'Validation failed',
            details: error.errors,
            timestamp: new Date().toISOString()
        });
    }

    // Generic error response
    const statusCode = error.statusCode || error.status || 500;
    const message = process.env.NODE_ENV === 'production' 
        ? 'Internal server error'
        : error.message;

    res.status(statusCode).json({
        error: 'Server error',
        message: message,
        timestamp: new Date().toISOString(),
        ...(process.env.NODE_ENV !== 'production' && { stack: error.stack })
    });
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    cache.close();
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received. Shutting down gracefully...');
    cache.close();
    process.exit(0);
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 GEM Optimizer Backend Proxy running on port ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔒 CORS origin: ${process.env.CORS_ORIGIN || 'localhost'}`);
    console.log(`⚡ Cache enabled: ${process.env.ENABLE_CACHE === 'true' ? 'Yes' : 'No'}`);
    console.log(`🛡️  Rate limiting: ${process.env.RATE_LIMIT_MAX_REQUESTS || 100} requests per ${(parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000) / 60000} minutes`);
});

module.exports = app;
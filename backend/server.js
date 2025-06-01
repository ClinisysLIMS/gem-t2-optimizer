/**
 * GEM T2 Controller Optimizer Backend Server
 * Express.js server with SQLite database for trip planning and community sharing
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const cron = require('node-cron');

// Import database and routes
const database = require('./database/connection');
const tripsRouter = require('./routes/trips');
const communityRouter = require('./routes/community');

const app = express();
const PORT = process.env.PORT || 3001;
const ENV = process.env.NODE_ENV || 'development';

// Data storage paths (for backward compatibility)
const DATA_DIR = path.join(__dirname, 'data');
const JAMBOREES_FILE = path.join(DATA_DIR, 'jamborees.json');
const SHARES_FILE = path.join(DATA_DIR, 'shares.json');

// Security middleware
app.use(helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
        error: 'Too many requests from this IP, please try again later.'
    }
});

app.use('/api/', limiter);

// CORS configuration
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Compression and parsing
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (ENV === 'development') {
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined'));
}

// Ensure data directory and files exist
async function initializeStorage() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    
    // Initialize jamborees.json if it doesn't exist
    try {
      await fs.access(JAMBOREES_FILE);
    } catch (error) {
      await fs.writeFile(JAMBOREES_FILE, JSON.stringify([], null, 2));
    }
    
    // Initialize shares.json if it doesn't exist
    try {
      await fs.access(SHARES_FILE);
    } catch (error) {
      await fs.writeFile(SHARES_FILE, JSON.stringify({}, null, 2));
    }
  } catch (error) {
    console.error('Error initializing storage:', error);
  }
}

// Helper functions
async function readJamborees() {
  try {
    const data = await fs.readFile(JAMBOREES_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading jamborees:', error);
    return [];
  }
}

async function writeJamborees(jamborees) {
  try {
    await fs.writeFile(JAMBOREES_FILE, JSON.stringify(jamborees, null, 2));
  } catch (error) {
    console.error('Error writing jamborees:', error);
    throw new Error('Failed to save jamboree data');
  }
}

async function readShares() {
  try {
    const data = await fs.readFile(SHARES_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading shares:', error);
    return {};
  }
}

async function writeShares(shares) {
  try {
    await fs.writeFile(SHARES_FILE, JSON.stringify(shares, null, 2));
  } catch (error) {
    console.error('Error writing shares:', error);
    throw new Error('Failed to save share data');
  }
}

// Validation middleware
function validateJamboreeData(req, res, next) {
  const { eventDetails, vehicleConfigurations, controllerSettings, weatherData, terrainData, groupInfo } = req.body;
  
  if (!eventDetails || !eventDetails.name || !eventDetails.date) {
    return res.status(400).json({ 
      error: 'Invalid jamboree data: eventDetails with name and date are required' 
    });
  }
  
  if (!vehicleConfigurations || !Array.isArray(vehicleConfigurations)) {
    return res.status(400).json({ 
      error: 'Invalid jamboree data: vehicleConfigurations array is required' 
    });
  }
  
  if (!controllerSettings) {
    return res.status(400).json({ 
      error: 'Invalid jamboree data: controllerSettings is required' 
    });
  }
  
  next();
}

// Routes

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Save a new jamboree configuration
app.post('/api/jamboree', validateJamboreeData, async (req, res) => {
  try {
    const jamborees = await readJamborees();
    
    const newJamboree = {
      id: uuidv4(),
      ...req.body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    jamborees.unshift(newJamboree); // Add to beginning for recent first
    
    // Keep only the 100 most recent jamborees to prevent file bloat
    if (jamborees.length > 100) {
      jamborees.splice(100);
    }
    
    await writeJamborees(jamborees);
    
    res.status(201).json({
      success: true,
      data: newJamboree,
      message: 'Jamboree configuration saved successfully'
    });
  } catch (error) {
    console.error('Error saving jamboree:', error);
    res.status(500).json({ 
      error: 'Failed to save jamboree configuration',
      details: error.message 
    });
  }
});

// Retrieve a specific jamboree configuration
app.get('/api/jamboree/:id', async (req, res) => {
  try {
    const jamborees = await readJamborees();
    const jamboree = jamborees.find(j => j.id === req.params.id);
    
    if (!jamboree) {
      return res.status(404).json({ 
        error: 'Jamboree configuration not found' 
      });
    }
    
    res.json({
      success: true,
      data: jamboree
    });
  } catch (error) {
    console.error('Error retrieving jamboree:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve jamboree configuration',
      details: error.message 
    });
  }
});

// List recent jamboree configurations
app.get('/api/jamboree', async (req, res) => {
  try {
    const jamborees = await readJamborees();
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;
    
    const paginatedJamborees = jamborees.slice(offset, offset + limit);
    
    // Return summary data only for listing
    const summary = paginatedJamborees.map(jamboree => ({
      id: jamboree.id,
      eventDetails: {
        name: jamboree.eventDetails.name,
        date: jamboree.eventDetails.date,
        location: jamboree.eventDetails.location,
        type: jamboree.eventDetails.type
      },
      vehicleCount: jamboree.vehicleConfigurations ? jamboree.vehicleConfigurations.length : 0,
      groupInfo: jamboree.groupInfo ? {
        name: jamboree.groupInfo.name,
        memberCount: jamboree.groupInfo.memberCount
      } : null,
      createdAt: jamboree.createdAt,
      updatedAt: jamboree.updatedAt
    }));
    
    res.json({
      success: true,
      data: summary,
      pagination: {
        total: jamborees.length,
        limit,
        offset,
        hasMore: offset + limit < jamborees.length
      }
    });
  } catch (error) {
    console.error('Error listing jamborees:', error);
    res.status(500).json({ 
      error: 'Failed to list jamboree configurations',
      details: error.message 
    });
  }
});

// Generate a shareable link for a jamboree
app.post('/api/jamboree/:id/share', async (req, res) => {
  try {
    const jamborees = await readJamborees();
    const jamboree = jamborees.find(j => j.id === req.params.id);
    
    if (!jamboree) {
      return res.status(404).json({ 
        error: 'Jamboree configuration not found' 
      });
    }
    
    const shares = await readShares();
    const shareId = uuidv4();
    const shareData = {
      jamboreeId: req.params.id,
      createdAt: new Date().toISOString(),
      accessCount: 0,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
    };
    
    shares[shareId] = shareData;
    await writeShares(shares);
    
    const shareUrl = `${req.protocol}://${req.get('host')}/api/share/${shareId}`;
    
    res.json({
      success: true,
      data: {
        shareId,
        shareUrl,
        expiresAt: shareData.expiresAt
      },
      message: 'Shareable link generated successfully'
    });
  } catch (error) {
    console.error('Error creating share link:', error);
    res.status(500).json({ 
      error: 'Failed to generate shareable link',
      details: error.message 
    });
  }
});

// Access a shared jamboree configuration
app.get('/api/share/:shareId', async (req, res) => {
  try {
    const shares = await readShares();
    const shareData = shares[req.params.shareId];
    
    if (!shareData) {
      return res.status(404).json({ 
        error: 'Shared link not found or expired' 
      });
    }
    
    // Check if share has expired
    if (new Date() > new Date(shareData.expiresAt)) {
      return res.status(410).json({ 
        error: 'Shared link has expired' 
      });
    }
    
    const jamborees = await readJamborees();
    const jamboree = jamborees.find(j => j.id === shareData.jamboreeId);
    
    if (!jamboree) {
      return res.status(404).json({ 
        error: 'Original jamboree configuration not found' 
      });
    }
    
    // Increment access count
    shareData.accessCount++;
    shareData.lastAccessedAt = new Date().toISOString();
    shares[req.params.shareId] = shareData;
    await writeShares(shares);
    
    res.json({
      success: true,
      data: {
        jamboree,
        shareInfo: {
          createdAt: shareData.createdAt,
          accessCount: shareData.accessCount,
          expiresAt: shareData.expiresAt
        }
      }
    });
  } catch (error) {
    console.error('Error accessing shared jamboree:', error);
    res.status(500).json({ 
      error: 'Failed to access shared jamboree configuration',
      details: error.message 
    });
  }
});

// Update an existing jamboree configuration
app.put('/api/jamboree/:id', validateJamboreeData, async (req, res) => {
  try {
    const jamborees = await readJamborees();
    const jamboreeIndex = jamborees.findIndex(j => j.id === req.params.id);
    
    if (jamboreeIndex === -1) {
      return res.status(404).json({ 
        error: 'Jamboree configuration not found' 
      });
    }
    
    const updatedJamboree = {
      ...jamborees[jamboreeIndex],
      ...req.body,
      id: req.params.id, // Ensure ID doesn't change
      updatedAt: new Date().toISOString()
    };
    
    jamborees[jamboreeIndex] = updatedJamboree;
    await writeJamborees(jamborees);
    
    res.json({
      success: true,
      data: updatedJamboree,
      message: 'Jamboree configuration updated successfully'
    });
  } catch (error) {
    console.error('Error updating jamboree:', error);
    res.status(500).json({ 
      error: 'Failed to update jamboree configuration',
      details: error.message 
    });
  }
});

// Delete a jamboree configuration
app.delete('/api/jamboree/:id', async (req, res) => {
  try {
    const jamborees = await readJamborees();
    const jamboreeIndex = jamborees.findIndex(j => j.id === req.params.id);
    
    if (jamboreeIndex === -1) {
      return res.status(404).json({ 
        error: 'Jamboree configuration not found' 
      });
    }
    
    jamborees.splice(jamboreeIndex, 1);
    await writeJamborees(jamborees);
    
    res.json({
      success: true,
      message: 'Jamboree configuration deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting jamboree:', error);
    res.status(500).json({ 
      error: 'Failed to delete jamboree configuration',
      details: error.message 
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found' 
  });
});

// API Routes
app.use('/api/trips', tripsRouter);
app.use('/api/community', communityRouter);

// Database health and stats endpoint
app.get('/api/health', async (req, res) => {
    try {
        const stats = await database.getStats();
        res.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            environment: ENV,
            database: 'connected',
            stats
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            timestamp: new Date().toISOString(),
            error: 'Database connection failed'
        });
    }
});

// Schedule daily cleanup job
cron.schedule('0 2 * * *', async () => {
    console.log('🧹 Running daily database cleanup...');
    try {
        await database.cleanup();
        console.log('✅ Daily cleanup completed');
    } catch (error) {
        console.error('❌ Daily cleanup failed:', error);
    }
});

// Graceful shutdown handling
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully');
    await database.close();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('SIGINT received, shutting down gracefully');
    await database.close();
    process.exit(0);
});

// Initialize database and start server
async function startServer() {
    try {
        // Connect to database
        await database.connect();
        
        // Initialize legacy storage for backward compatibility
        await initializeStorage();
        
        // Start server
        app.listen(PORT, () => {
            console.log(`🚀 GEM Optimizer Backend Server started`);
            console.log(`📍 Environment: ${ENV}`);
            console.log(`🌐 Server: http://localhost:${PORT}`);
            console.log(`🔍 Health check: http://localhost:${PORT}/api/health`);
            console.log(`📚 API Base: http://localhost:${PORT}/api`);
            console.log(`📊 Available endpoints:`);
            console.log(`   - GET  /api/health`);
            console.log(`   - POST /api/trips`);
            console.log(`   - GET  /api/trips`);
            console.log(`   - GET  /api/community/shared`);
            console.log(`   - Legacy jamboree endpoints still available`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

startServer();

module.exports = app;
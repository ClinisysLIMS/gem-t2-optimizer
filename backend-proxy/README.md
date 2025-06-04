# GEM Optimizer Backend Proxy

A secure Node.js/Express backend proxy server that handles all third-party API calls for the GEM T2 Optimizer frontend application. This eliminates the need for users to configure API keys and provides enhanced security.

## Features

- ✅ **Secure API key management** - All keys stored as environment variables
- ✅ **Rate limiting** - Prevents abuse with configurable limits
- ✅ **CORS protection** - Configured for GitHub Pages deployment
- ✅ **Caching** - Intelligent caching to reduce API costs
- ✅ **Fallback support** - Graceful degradation when APIs are unavailable
- ✅ **Multiple API support** - Weather, Maps, Elevation, and Geocoding
- ✅ **Health monitoring** - Built-in health checks and status endpoints
- ✅ **Production ready** - Helmet security, compression, logging

## Supported APIs

### Weather Services
- **OpenWeatherMap** - Current weather and forecasts
- **Fallback** - Open-Elevation API when primary service fails

### Maps Services
- **Google Maps** - Directions, Places, Distance Matrix
- **Fallback** - OpenStreetMap/OSRM when Google Maps unavailable

### Elevation Services
- **Google Elevation API** - Precise elevation data
- **Fallback** - Open-Elevation API for free alternative

### Geocoding Services
- **Google Geocoding** - Address to coordinates conversion
- **Fallback** - Nominatim (OpenStreetMap) geocoding

## Quick Start

### 1. Installation

```bash
cd backend-proxy
npm install
```

### 2. Environment Setup

```bash
# Copy the example environment file
cp .env.example .env

# Edit with your values
nano .env
```

### 3. Required Environment Variables

```env
# Server Configuration
PORT=3001
NODE_ENV=production
CORS_ORIGIN=https://your-username.github.io

# API Keys (Required for full functionality)
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
OPENWEATHER_API_KEY=your_openweather_api_key_here

# Optional API Keys
ELEVATIONAPI_KEY=your_elevation_api_key_here
```

### 4. Start the Server

```bash
# Development mode
npm run dev

# Production mode
npm start
```

## API Key Setup

### Google Maps API

1. **Create Google Cloud Project**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one

2. **Enable Required APIs**
   - Maps JavaScript API
   - Places API  
   - Geocoding API
   - Directions API
   - Elevation API

3. **Create API Key**
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "API Key"
   - Copy the generated key

4. **Secure the API Key**
   - Click "Restrict Key"
   - Under "Application restrictions": Select "IP addresses"
   - Add your server's IP address
   - Under "API restrictions": Select only the APIs you need
   - Click "Save"

### OpenWeatherMap API

1. **Create Account**
   - Sign up at [OpenWeatherMap](https://openweathermap.org/api)
   - Choose the free plan or appropriate paid plan

2. **Get API Key**
   - Go to your API keys page
   - Copy the default API key
   - Wait up to 2 hours for activation

## Deployment Options

### Option 1: Heroku (Recommended)

```bash
# Install Heroku CLI
# https://devcenter.heroku.com/articles/heroku-cli

# Login to Heroku
heroku login

# Create app
heroku create your-gem-optimizer-backend

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set CORS_ORIGIN=https://your-username.github.io
heroku config:set GOOGLE_MAPS_API_KEY=your_key_here
heroku config:set OPENWEATHER_API_KEY=your_key_here

# Deploy
git add .
git commit -m "Deploy backend proxy"
git push heroku main

# Check logs
heroku logs --tail
```

### Option 2: Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Deploy
railway up

# Set environment variables in Railway dashboard
```

### Option 3: DigitalOcean App Platform

1. Create new app from GitHub repository
2. Set environment variables in the app settings
3. Deploy automatically from GitHub

### Option 4: VPS (Ubuntu/CentOS)

```bash
# Clone repository
git clone https://github.com/your-username/gem-optimizer.git
cd gem-optimizer/backend-proxy

# Install Node.js (using NodeSource)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install dependencies
npm install --production

# Create .env file with your variables
cp .env.example .env
nano .env

# Install PM2 for process management
sudo npm install -g pm2

# Start application
pm2 start ecosystem.config.js

# Setup startup script
pm2 startup
pm2 save

# Setup nginx reverse proxy (optional)
sudo apt install nginx
# Configure nginx to proxy port 3001
```

## Frontend Configuration

Update your frontend to use the backend proxy:

```javascript
// In your frontend code, update the base URL
const BACKEND_URL = 'https://your-backend-domain.com';

// Example API call
async function getWeather(location) {
    const response = await fetch(`${BACKEND_URL}/api/weather/current/${encodeURIComponent(location)}`);
    return await response.json();
}
```

## API Endpoints

### Health Check
- `GET /health` - Basic health check
- `GET /health/detailed` - Detailed system information
- `GET /api/status` - API service status

### Weather
- `GET /api/weather/current/:location` - Current weather
- `GET /api/weather/forecast/:location` - Weather forecast
- `POST /api/weather/detailed` - Detailed weather with date

### Maps  
- `POST /api/maps/directions` - Get directions
- `GET /api/maps/places/search` - Search places
- `POST /api/maps/distance-matrix` - Distance calculations

### Elevation
- `POST /api/elevation/locations` - Elevation for coordinates
- `POST /api/elevation/path` - Elevation profile for path

### Geocoding
- `GET /api/geocoding/forward` - Address to coordinates
- `GET /api/geocoding/reverse` - Coordinates to address
- `POST /api/geocoding/batch` - Batch geocoding

## Rate Limiting

Default rate limits (configurable via environment variables):

- **100 requests per 15 minutes** per IP address
- **Slow down after 50 requests** (adds delay)
- **Cached responses** don't count against limits

## Monitoring

### Health Checks

```bash
# Basic health check
curl https://your-backend.com/health

# Detailed system info
curl https://your-backend.com/health/detailed

# API service status
curl https://your-backend.com/api/status
```

### Logs

```bash
# Heroku
heroku logs --tail

# PM2
pm2 logs

# Docker
docker logs container_name
```

## Security Features

- **Helmet.js** - Security headers
- **CORS** - Cross-origin protection
- **Rate limiting** - Abuse prevention
- **Input validation** - Request sanitization
- **Error handling** - No sensitive data leakage

## Troubleshooting

### Common Issues

**"CORS blocked"**
- Check `CORS_ORIGIN` environment variable
- Ensure it matches your GitHub Pages URL exactly

**"API key invalid"**
- Verify API keys are set correctly
- Check API key restrictions in provider dashboards

**"Rate limit exceeded"**
- API provider limits reached
- Increase rate limits or upgrade API plan

**"Backend not available"**
- Check server status and logs
- Verify deployment was successful

### Debug Mode

Set `NODE_ENV=development` to enable:
- Verbose error messages
- Request/response logging
- Stack traces in API responses

## Cost Optimization

### Caching Strategy
- Weather data: 30 minutes
- Maps data: 1 hour  
- Elevation data: 2 hours
- Geocoding: 24 hours

### API Usage Tips
- Use appropriate cache durations
- Implement request deduplication
- Monitor usage dashboards
- Set billing alerts

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Submit a pull request

## License

MIT License - see LICENSE file for details
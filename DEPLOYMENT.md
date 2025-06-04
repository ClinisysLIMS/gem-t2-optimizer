# 🚀 Serverless Deployment Guide

This guide explains how to deploy the GEM T2 Optimizer to serverless platforms (Netlify or Vercel) with secure API handling.

## 📋 Overview

The application now uses serverless functions to handle all external API calls, eliminating the need for:
- Exposing API keys in frontend code
- Managing a separate backend server
- Complex deployment configurations

## 🏗️ Architecture

```
Frontend (Static Files)
    ↓
Serverless Functions (api/)
    ↓
External APIs (Weather, Maps, etc.)
```

### Serverless Functions

- **`/api/weather.js`** - Weather data (Open-Meteo, OpenWeatherMap)
- **`/api/geocoding.js`** - Address geocoding (Nominatim, Google Maps)  
- **`/api/elevation.js`** - Elevation data (OpenTopoData, Google)
- **`/api/maps.js`** - Routing/directions (Google Maps, Mapbox, OpenRoute)

## 🔧 Option 1: Deploy to Netlify (Recommended)

### Prerequisites
- GitHub account with your code repository
- Netlify account (free tier available)

### Steps

1. **Push code to GitHub**
   ```bash
   git add .
   git commit -m "Add serverless setup"
   git push origin main
   ```

2. **Connect to Netlify**
   - Go to [netlify.com](https://netlify.com)
   - Click "New site from Git"
   - Choose GitHub and select your repository
   - Build settings will be auto-detected from `netlify.toml`

3. **Configure Environment Variables**
   - Go to Site Settings → Environment Variables
   - Add your API keys:
   ```
   GOOGLE_MAPS_API_KEY=your_google_maps_key
   OPENWEATHER_API_KEY=your_openweather_key
   MAPBOX_API_KEY=your_mapbox_key
   WEATHERAPI_KEY=your_weatherapi_key
   HERE_API_KEY=your_here_key
   OPENROUTESERVICE_API_KEY=your_openroute_key
   ```

4. **Deploy**
   - Click "Deploy site"
   - Your site will be available at: `https://your-site-name.netlify.app`

### Netlify Features Used
- ✅ Serverless functions
- ✅ Automatic HTTPS
- ✅ CDN distribution
- ✅ Form handling
- ✅ Custom redirects
- ✅ Environment variables

---

## 🔧 Option 2: Deploy to Vercel

### Prerequisites
- GitHub account with your code repository
- Vercel account (free tier available)

### Steps

1. **Push code to GitHub**
   ```bash
   git add .
   git commit -m "Add serverless setup"
   git push origin main
   ```

2. **Connect to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Configuration will be auto-detected from `vercel.json`

3. **Configure Environment Variables**
   - Go to Project Settings → Environment Variables
   - Add your API keys:
   ```
   GOOGLE_MAPS_API_KEY=your_google_maps_key
   OPENWEATHER_API_KEY=your_openweather_key
   MAPBOX_API_KEY=your_mapbox_key
   WEATHERAPI_KEY=your_weatherapi_key
   HERE_API_KEY=your_here_key
   OPENROUTESERVICE_API_KEY=your_openroute_key
   ```

4. **Deploy**
   - Click "Deploy"
   - Your site will be available at: `https://your-project.vercel.app`

### Vercel Features Used
- ✅ Serverless functions
- ✅ Automatic HTTPS
- ✅ Edge network
- ✅ Git integration
- ✅ Environment variables

---

## 🔑 API Keys Setup

### Required API Keys (Optional - App works without them)

| Service | Purpose | Free Tier | Get Key |
|---------|---------|-----------|---------|
| **Google Maps** | Geocoding, Directions, Elevation | $200/month credit | [Google Cloud Console](https://console.cloud.google.com/) |
| **OpenWeatherMap** | Weather data | 1000 calls/day | [OpenWeatherMap](https://openweathermap.org/api) |
| **Mapbox** | Maps and routing | 50,000 requests/month | [Mapbox](https://www.mapbox.com/) |
| **WeatherAPI** | Alternative weather | 1 million calls/month | [WeatherAPI](https://www.weatherapi.com/) |
| **HERE** | Alternative maps | 250,000 requests/month | [HERE Developer](https://developer.here.com/) |

### Free Alternatives (No API Keys Needed)

The app automatically falls back to these free services:
- **Nominatim** (OpenStreetMap) - Geocoding
- **Open-Meteo** - Weather data  
- **OpenTopoData** - Elevation data
- **Open-Elevation** - Elevation backup
- **On-device AI** - Local calculations

## 🧪 Testing Your Deployment

### 1. Health Check
Visit: `https://your-site.com/test-free-apis.html`

This page tests all serverless functions and shows their status.

### 2. Manual API Testing

**Test Weather API:**
```
GET https://your-site.com/api/weather?location=New York&type=current
```

**Test Geocoding API:**
```  
GET https://your-site.com/api/geocoding?type=forward&address=1600 Amphitheatre Parkway
```

**Test Elevation API:**
```
GET https://your-site.com/api/elevation?type=point&lat=37.4419&lng=-122.1430
```

**Test Maps API:**
```
GET https://your-site.com/api/maps?type=directions&origin=New York&destination=Boston
```

### 3. Expected Response Format

All APIs return this format:
```json
{
  "success": true,
  "data": { ... },
  "source": "service_name",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## 🔒 Security Features

### Environment Variables
- API keys stored securely in hosting platform
- Never exposed to frontend code
- Separate keys per environment (dev/prod)

### CORS Protection
- Configured to allow only your domain
- Prevents unauthorized access to your APIs

### Rate Limiting
- Built-in rate limiting for external APIs
- Prevents abuse and quota exhaustion

### Headers Security
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Referrer-Policy: strict-origin-when-cross-origin

## 🚀 Performance Optimization

### Caching Strategy
- Static assets: 1 year cache
- HTML files: 1 hour cache  
- API responses: No cache (real-time data)

### Function Optimization
- 10-second timeout for serverless functions
- Automatic retry logic with fallbacks
- Response compression

### CDN Distribution
- Global CDN for fast loading
- Edge caching for static assets
- Regional function deployment

## 🔧 Local Development

### Run Netlify Locally
```bash
npm install -g netlify-cli
netlify dev
```

### Run Vercel Locally  
```bash
npm install -g vercel
vercel dev
```

### Environment Setup
Create `.env.local`:
```
GOOGLE_MAPS_API_KEY=your_key
OPENWEATHER_API_KEY=your_key
MAPBOX_API_KEY=your_key
```

## 📊 Monitoring & Analytics

### Function Logs
- **Netlify**: Site → Functions → View logs
- **Vercel**: Project → Functions → Runtime logs

### Performance Metrics
- Response times
- Error rates  
- API usage quotas
- Cache hit rates

### Uptime Monitoring
Both platforms provide:
- 99.9% uptime SLA
- Global monitoring
- Automatic failover

## 🆘 Troubleshooting

### Common Issues

**1. Function Timeout**
- Increase timeout in `netlify.toml` or `vercel.json`
- Optimize API calls for speed

**2. CORS Errors**
- Check headers configuration
- Verify domain whitelist

**3. API Key Issues**
- Verify environment variables are set
- Check API key permissions and quotas

**4. Rate Limiting**
- Implement exponential backoff
- Use free API alternatives

### Debug Steps

1. Check function logs in platform dashboard
2. Test individual API endpoints
3. Verify environment variables
4. Check external API status
5. Test with free alternatives

### Getting Help

- **Netlify Support**: [netlify.com/support](https://netlify.com/support)
- **Vercel Support**: [vercel.com/support](https://vercel.com/support)
- **Project Issues**: Create GitHub issue

## 🎯 Production Checklist

- [ ] Code pushed to GitHub
- [ ] Platform account created (Netlify/Vercel)
- [ ] Repository connected
- [ ] Environment variables configured
- [ ] API keys tested and working
- [ ] Custom domain configured (optional)
- [ ] SSL certificate active
- [ ] Function endpoints tested
- [ ] Error monitoring setup
- [ ] Performance baseline established

## 💰 Cost Estimates

### Netlify Free Tier
- ✅ 100GB bandwidth/month
- ✅ 125,000 serverless function calls/month
- ✅ Unlimited sites
- ✅ Form submissions: 100/month

### Vercel Free Tier  
- ✅ 100GB bandwidth/month
- ✅ 100 serverless function calls/day
- ✅ Unlimited deployments
- ✅ Custom domains

Both platforms offer generous free tiers perfect for the GEM Optimizer application.

---

## 🎉 You're Done!

Your GEM T2 Optimizer is now deployed with:
- ✅ Secure serverless API handling
- ✅ Automatic scaling
- ✅ Global CDN distribution  
- ✅ Free tier usage
- ✅ Production-ready security

**Next Steps:**
1. Test all features work correctly
2. Configure custom domain (optional)
3. Set up monitoring alerts
4. Share your deployed app!

Your serverless GEM Optimizer is ready for users worldwide! 🌍
# Maps Setup Guide for GEM T2 Optimizer

This guide explains how to configure mapping services for the GEM T2 Optimizer. The app supports both Google Maps (premium features) and OpenStreetMap (free alternative).

## Quick Start

The app works out of the box with OpenStreetMap - no configuration required! If you want to use Google Maps for enhanced features, follow the setup instructions below.

## Mapping Service Options

### 1. OpenStreetMap (Default - Free)

**Features:**
- ✅ No API key required
- ✅ Legal route calculation for LSVs and golf carts
- ✅ Street maps and routing
- ✅ Community-maintained cart path data
- ✅ No usage limits or fees
- ✅ Privacy-focused (no tracking)

**Limitations:**
- Less detailed place information
- Fewer routing options
- No Street View integration

### 2. Google Maps (Premium - Optional)

**Features:**
- ✅ Advanced routing algorithms
- ✅ Real-time traffic data
- ✅ Detailed place information
- ✅ Street View integration
- ✅ More accurate geocoding
- ✅ Business hours and reviews

**Requirements:**
- Google Cloud account
- API key configuration
- Usage fees after free tier

## Configuration Interface

### Accessing Maps Configuration

1. Click the settings icon (⚙️) in any map view
2. Or navigate to the Maps Configuration from the main settings
3. The configuration modal will appear

### Configuration Options

- **Auto-select (Recommended)**: Automatically uses Google Maps if configured, otherwise OpenStreetMap
- **Google Maps**: Forces Google Maps (requires API key)
- **OpenStreetMap**: Forces OpenStreetMap (always available)

## Google Maps API Setup

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Create Project" or select an existing project
3. Give your project a name (e.g., "GEM-Optimizer")
4. Click "Create"

### Step 2: Enable Required APIs

1. In your project, go to "APIs & Services" > "Library"
2. Search for and enable these APIs:
   - **Maps JavaScript API** (required)
   - **Places API** (required)
   - **Geocoding API** (recommended)
   - **Directions API** (recommended)

### Step 3: Create API Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "API Key"
3. Your API key will be created and displayed
4. **Important**: Click "Restrict Key" to secure it

### Step 4: Secure Your API Key

1. Under "Application restrictions":
   - Select "HTTP referrers (websites)"
   - Add your website URL (e.g., `https://yourdomain.com/*`)
   - For local testing, add `http://localhost:*`

2. Under "API restrictions":
   - Select "Restrict key"
   - Choose only the APIs you enabled:
     - Maps JavaScript API
     - Places API
     - Geocoding API (if enabled)
     - Directions API (if enabled)

3. Click "Save"

### Step 5: Configure in App

1. Open the Maps Configuration in the app
2. Paste your API key in the "Google Maps API Key" field
3. Click "Test" to verify the key works
4. Select "Google Maps" or "Auto-select" as your preference
5. Click "Save Configuration"

## Testing Your Configuration

### Test Google Maps

1. After entering your API key, click the "Test" button
2. You should see "✓ API key is valid"
3. If you see an error, check:
   - API key is correct
   - Required APIs are enabled
   - Key restrictions match your domain

### Test Routing

1. Go to any route planning feature in the app
2. Enter a start and destination
3. The map should load and display routes
4. Check the "Powered by" indicator in the top-right

## Troubleshooting

### Google Maps Not Working

**"Invalid API key" error:**
- Verify the key is copied correctly (no extra spaces)
- Check that Maps JavaScript API is enabled
- Ensure key restrictions match your domain

**"REQUEST_DENIED" error:**
- The API key may not have proper permissions
- Check API restrictions in Google Cloud Console
- Verify billing is enabled (even for free tier)

**Map loads but routing fails:**
- Enable Directions API in Google Cloud Console
- Check API quotas haven't been exceeded

### OpenStreetMap Issues

**Slow routing responses:**
- OpenStreetMap uses public servers that may be slower
- Consider using Google Maps for better performance

**Missing cart paths:**
- OpenStreetMap relies on community data
- Cart paths may not be mapped in all areas
- Consider contributing to OpenStreetMap!

## Usage and Costs

### OpenStreetMap
- **Cost**: Free
- **Limits**: Fair use policy (no hard limits)
- **Best for**: Personal use, privacy-conscious users

### Google Maps
- **Free tier**: $200/month credit (~28,000 map loads)
- **Pricing**: ~$7 per 1,000 map loads after free tier
- **Best for**: Heavy usage, commercial applications

## Privacy Considerations

### OpenStreetMap
- No API key = no tracking
- Routes calculated on public servers
- Your location data is not stored

### Google Maps
- Requires Google account
- Usage is tracked and billed
- Subject to Google's privacy policy

## Advanced Configuration

### Forcing a Specific Service

In your code, you can force a specific service:

```javascript
// Force OpenStreetMap
mapsConfig.setPreferredService('osm');

// Force Google Maps
mapsConfig.setPreferredService('google');

// Auto-select (default)
mapsConfig.setPreferredService('auto');
```

### Checking Service Status

```javascript
const status = unifiedMapsService.getServiceStatus();
console.log(status);
// {
//   current: 'osm',
//   available: { google: false, osm: true },
//   configured: { google: false, osm: true }
// }
```

## Contributing to OpenStreetMap

Help improve cart path data:

1. Visit [OpenStreetMap.org](https://www.openstreetmap.org/)
2. Create a free account
3. Use the iD editor to add cart paths in your area
4. Tag paths with:
   - `highway=path`
   - `golf_cart=yes`
   - `bicycle=no` (if applicable)
   - `motor_vehicle=no` (if applicable)

## Support

If you encounter issues:

1. Check the browser console for error messages
2. Verify your configuration in Maps Settings
3. Try switching between services to isolate the issue
4. For Google Maps billing/API issues, check Google Cloud Console

The GEM T2 Optimizer is designed to work with or without Google Maps, ensuring you always have access to route planning features!
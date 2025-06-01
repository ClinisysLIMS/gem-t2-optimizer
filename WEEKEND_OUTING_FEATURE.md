# Weekend Outing/Jamboree Settings Feature

## Overview
The Weekend Outing feature is a new preset option for the GEM T2 Controller Optimizer that includes advanced trip planning capabilities with weather and terrain integration.

## Features Implemented

### 1. New Weekend Outing Preset
- **Name**: 📅 Weekend Outing
- **Description**: Optimized for trips and events
- **Features**: Extended range, Weather adaptive, Best for group trips
- **Settings**: Balanced configuration optimized for mixed driving conditions

### 2. Trip Planning Wizard
A comprehensive 6-step wizard that includes:

#### Step 6: Trip Planning
- **Destination Location**: Text input for trip destination
- **Trip Date**: Date picker with minimum date validation
- **Event Type**: Dropdown with options:
  - Scenic Touring
  - Camping Trip
  - Parade/Festival
  - Sporting Event
  - Social Gathering
  - Utility/Work
- **Group Size**: Solo, Couple, Small Group (3-4), Full Capacity
- **Expected Cargo**: Light, Moderate, Heavy

### 3. Weather API Integration Skeleton
- **Service**: OpenWeatherMap API structure
- **Endpoints**: Current weather and 5-day forecast
- **Data Points**:
  - Temperature (min/max/average)
  - Weather conditions
  - Precipitation probability and amount
  - Wind speed and direction
  - Humidity levels

### 4. Terrain/Elevation API Integration Skeleton
- **Service**: MapBox API structure
- **Endpoints**: Elevation and geocoding services
- **Data Points**:
  - Total distance
  - Elevation gain/loss
  - Maximum and average grade
  - Terrain classification
  - Route analysis

### 5. Trip Analysis & Recommendations
Real-time analysis that provides:
- Weather forecast display
- Terrain analysis
- Customized recommendations based on conditions
- Warnings for challenging conditions
- Automatic controller setting adjustments

## Technical Implementation

### Files Modified/Created:

1. **js/presets.js**
   - Added `weekend-outing` preset configuration
   - Added `requiresTripPlanning` flag

2. **js/trip-planner.js** (NEW)
   - TripPlanner class with weather and terrain API skeletons
   - Recommendation engine
   - Historical weather estimation
   - Terrain classification algorithms

3. **gem-optimizer.html**
   - Added trip planning wizard section
   - Enhanced form structure for 6-step process

4. **js/ui.js**
   - Updated UIController for trip planning workflow
   - Added weekend outing detection
   - Integrated trip analysis functionality
   - Enhanced validation for trip planning fields

5. **styles.css**
   - Added trip planning specific styles
   - Special styling for Weekend Outing preset card
   - Enhanced visual indicators for trip analysis

## API Integration Notes

### Weather API (OpenWeatherMap)
```javascript
// Configuration structure implemented
{
  baseUrl: 'https://api.openweathermap.org/data/2.5',
  apiKey: 'YOUR_API_KEY_HERE', // Replace with actual key
  endpoints: {
    current: '/weather',
    forecast: '/forecast'
  }
}
```

### Terrain API (MapBox)
```javascript
// Configuration structure implemented
{
  baseUrl: 'https://api.mapbox.com',
  apiKey: 'YOUR_API_KEY_HERE', // Replace with actual key
  endpoints: {
    elevation: '/v4/mapbox.mapbox-terrain-v2/tilequery',
    geocoding: '/geocoding/v5/mapbox.places'
  }
}
```

## Usage Instructions

1. **Select Weekend Outing Preset**: Click on the "📅 Weekend Outing" preset card
2. **Complete Vehicle Configuration**: Follow steps 1-5 as normal
3. **Trip Planning**: 
   - Enter destination location
   - Select trip date
   - Choose event type
   - Specify group size and cargo load
4. **Review Analysis**: Automatic trip analysis appears when key fields are filled
5. **Get Optimized Settings**: Complete the wizard to receive trip-optimized controller settings

## Controller Setting Adjustments

The Weekend Outing preset applies base settings plus dynamic adjustments based on:

### Weather Conditions
- **Hot Weather** (>85°F): Reduced max current, gentler acceleration
- **Rain Likely** (>50% precipitation): Enhanced regenerative braking warnings

### Terrain Conditions
- **Steep Hills** (>15% grade): Increased field current, delayed field weakening
- **Long Distance** (>20 miles): Range-optimized settings

### Event-Specific
- **Parade Mode**: Low speed optimization (15 MPH limit)
- **Camping**: Heavy load compensation
- **Touring**: Balanced comfort and efficiency

## Development Notes

- All API calls include error handling with fallback to default values
- Trip analysis is performed asynchronously with loading states
- Historical weather estimation for dates beyond 5-day forecast
- Modular design allows easy integration of additional APIs
- Settings are validated and safety-constrained

## Future Enhancements

1. **Real API Integration**: Replace skeleton implementations with actual API calls
2. **Route Planning**: Add waypoint and route optimization
3. **Battery Range Estimation**: Calculate range based on trip parameters
4. **Charging Station Integration**: Find charging stops along route
5. **Group Coordination**: Multi-vehicle trip planning
6. **Weather Alerts**: Real-time weather change notifications

## Testing

The feature includes comprehensive error handling and fallback mechanisms:
- Invalid locations default to simulated data
- Network errors fall back to historical estimates
- Missing trip data uses balanced preset settings
- Form validation ensures required fields are completed

## Installation

No additional installation required. The feature is integrated into the existing GEM T2 Controller Optimizer application. To enable real API functionality:

1. Obtain API keys from OpenWeatherMap and MapBox
2. Replace `YOUR_API_KEY_HERE` placeholders in `js/trip-planner.js`
3. Remove CORS restrictions for production deployment
/**
 * Trip Planner with Weather and Terrain Analysis - TypeScript version
 */

interface WeatherData {
  temperature: number;
  conditions: string;
  precipitation: number;
  windSpeed: number;
  humidity: number;
}

interface TerrainData {
  distance: number;
  totalElevationGain: number;
  totalElevationLoss: number;
  maxGrade: number;
  avgGrade: number;
  classification: string;
}

interface TripOptions {
  eventType: string;
  groupSize: number;
  cargoLoad: string;
}

interface TripAnalysis {
  weather: WeatherData;
  terrain: TerrainData;
  recommendations: string[];
}

export class TripPlanner {
  private weatherApiKey: string = process.env.OPENWEATHER_API_KEY || '';
  private mapboxApiKey: string = process.env.MAPBOX_API_KEY || '';

  async analyzeTripConditions(
    destination: string,
    date: string,
    options: TripOptions
  ): Promise<TripAnalysis> {
    // Get weather forecast
    const weather = await this.getWeatherForecast(destination, date);
    
    // Analyze terrain (using simulated data for now)
    const terrain = await this.analyzeRouteTerrain('current_location', destination);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(weather, terrain, options);
    
    return {
      weather,
      terrain,
      recommendations
    };
  }

  async getWeatherForecast(location: string, date: string): Promise<WeatherData> {
    // For MCP demo, return simulated weather data
    // In production, this would call OpenWeatherMap API
    
    const dateObj = new Date(date);
    const month = dateObj.getMonth();
    
    // Simulate seasonal weather
    let baseTemp = 70;
    if (month >= 11 || month <= 2) baseTemp = 45; // Winter
    else if (month >= 3 && month <= 5) baseTemp = 65; // Spring
    else if (month >= 6 && month <= 8) baseTemp = 85; // Summer
    else baseTemp = 60; // Fall
    
    // Add some randomness
    const tempVariation = Math.random() * 20 - 10;
    const temperature = baseTemp + tempVariation;
    
    const conditions = [
      'Clear', 'Partly Cloudy', 'Cloudy', 'Light Rain', 'Rain', 'Foggy'
    ];
    const selectedCondition = conditions[Math.floor(Math.random() * conditions.length)];
    
    return {
      temperature: Math.round(temperature),
      conditions: selectedCondition,
      precipitation: selectedCondition.includes('Rain') ? Math.random() * 0.5 : 0,
      windSpeed: Math.round(Math.random() * 15 + 5),
      humidity: Math.round(Math.random() * 30 + 40)
    };
  }

  async analyzeRouteTerrain(start: string, end: string): Promise<TerrainData> {
    // For MCP demo, return simulated terrain data
    // In production, this would call Mapbox Elevation API
    
    // Simulate based on destination keywords
    let terrainType = 'mixed';
    let maxGrade = 8;
    let elevationGain = 500;
    
    const destination = end.toLowerCase();
    if (destination.includes('mountain') || destination.includes('yosemite')) {
      terrainType = 'steep';
      maxGrade = 18;
      elevationGain = 2500;
    } else if (destination.includes('hill') || destination.includes('canyon')) {
      terrainType = 'moderate';
      maxGrade = 12;
      elevationGain = 1200;
    } else if (destination.includes('beach') || destination.includes('coast')) {
      terrainType = 'flat';
      maxGrade = 4;
      elevationGain = 100;
    }
    
    const distance = Math.random() * 30 + 10; // 10-40 miles
    
    return {
      distance,
      totalElevationGain: elevationGain,
      totalElevationLoss: elevationGain * 0.9,
      maxGrade,
      avgGrade: maxGrade * 0.4,
      classification: terrainType
    };
  }

  private generateRecommendations(
    weather: WeatherData,
    terrain: TerrainData,
    options: TripOptions
  ): string[] {
    const recommendations: string[] = [];
    
    // Weather-based recommendations
    if (weather.temperature < 40) {
      recommendations.push('Cold weather: Battery performance may be reduced by 10-20%');
    }
    if (weather.temperature > 90) {
      recommendations.push('Hot weather: Monitor motor temperature closely');
    }
    if (weather.precipitation > 0.1) {
      recommendations.push('Rain expected: Reduce speed and increase following distance');
    }
    if (weather.windSpeed > 20) {
      recommendations.push('High winds: May affect stability and range');
    }
    
    // Terrain-based recommendations
    if (terrain.maxGrade > 15) {
      recommendations.push('Steep grades: Use low gear and monitor motor temperature');
    }
    if (terrain.totalElevationGain > 1500) {
      recommendations.push('Significant climbing: Plan for 20-30% range reduction');
    }
    
    // Event-specific recommendations
    switch (options.eventType) {
      case 'camping':
        recommendations.push('Heavy load: Check tire pressure and allow extra braking distance');
        break;
      case 'parade':
        recommendations.push('Low speed operation: Monitor motor temperature in hot weather');
        break;
      case 'touring':
        recommendations.push('Extended operation: Plan charging stops if needed');
        break;
    }
    
    // Load recommendations
    if (options.groupSize >= 4 || options.cargoLoad === 'heavy') {
      recommendations.push('Full load: Acceleration and hill climbing will be reduced');
    }
    
    return recommendations;
  }

  async geocodeLocation(location: string): Promise<{ lat: number; lng: number }> {
    // For MCP demo, return simulated coordinates
    // In production, this would call Mapbox Geocoding API
    
    const locations: Record<string, { lat: number; lng: number }> = {
      'yosemite': { lat: 37.8651, lng: -119.5383 },
      'san francisco': { lat: 37.7749, lng: -122.4194 },
      'los angeles': { lat: 34.0522, lng: -118.2437 },
      'default': { lat: 37.3861, lng: -122.0839 }
    };
    
    const key = location.toLowerCase();
    for (const [name, coords] of Object.entries(locations)) {
      if (key.includes(name)) {
        return coords;
      }
    }
    
    return locations.default;
  }
}
# GEM Optimizer MCP Server

A Model Context Protocol (MCP) server that exposes GEM T2 Controller Optimizer functions for AI assistant integration with natural language processing capabilities.

## Overview

This MCP server allows AI assistants like Claude to help users optimize their GEM electric vehicle controller settings through natural language queries. It provides intelligent trip planning, weather integration, terrain analysis, and controller optimization recommendations.

## Features

### 🤖 **Natural Language Processing**
- **Intent Recognition**: Understands optimization requests, trip planning, comparisons
- **Entity Extraction**: Extracts vehicle models, locations, dates, priorities, terrain types
- **Context Awareness**: Processes complex queries with multiple parameters
- **Confidence Scoring**: Provides reliability metrics for extracted parameters

### ⚙️ **Controller Optimization**
- **Smart Parameter Tuning**: Adjusts 20+ controller functions based on usage patterns
- **Scenario-Based Rules**: Optimizes for terrain, weather, load, and trip types
- **Constraint Enforcement**: Ensures all settings remain within safe operational limits
- **Change Tracking**: Documents all parameter modifications with explanations

### 🗺️ **Trip Planning Integration**
- **Weather Forecasting**: Integrates with OpenWeatherMap API for real conditions
- **Terrain Analysis**: Uses elevation data for route difficulty assessment
- **Multi-factor Optimization**: Combines weather, terrain, and trip type for optimal settings
- **Trip Recommendations**: Provides driving tips based on conditions

## Installation

### Prerequisites
- Node.js 18+ 
- NPM or Yarn
- (Optional) OpenWeatherMap API key
- (Optional) Mapbox API key

### Setup Steps

1. **Clone and Navigate**
   ```bash
   cd mcp-server
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys and configuration
   ```

4. **Create Logs Directory**
   ```bash
   mkdir -p logs
   ```

5. **Test Installation**
   ```bash
   npm start
   ```

## Usage

### Starting the MCP Server

#### Development Mode
```bash
npm run dev
```

#### Production Mode
```bash
npm start
```

### Connecting to AI Assistants

#### Claude Desktop Configuration

Add to your Claude Desktop configuration file:

```json
{
  "mcpServers": {
    "gem-optimizer": {
      "command": "node",
      "args": ["/path/to/gem-optimizer/mcp-server/src/mcp-server.js"],
      "env": {
        "BACKEND_URL": "http://localhost:3001",
        "OPENWEATHER_API_KEY": "your-key-here"
      }
    }
  }
}
```

## Available Tools

### 1. `optimize_gem_controller`
Optimize GEM controller settings based on natural language description.

**Example Queries:**
- "optimize my GEM e4 for camping trip to Yosemite next weekend"
- "I need maximum hill climbing power for steep terrain"
- "set up my GEM for efficiency and range in hot weather"
- "configure for parade driving with smooth acceleration"

### 2. `plan_gem_trip`
Plan a comprehensive GEM trip with weather and terrain analysis.

### 3. `get_weather_forecast`
Get weather forecast for trip planning.

### 4. `analyze_terrain`
Analyze elevation and terrain difficulty for routes.

### 5. `compare_optimizations`
Compare different optimization scenarios.

### 6. `get_preset_configurations`
Get predefined optimization presets.

### 7. `save_trip_configuration`
Save optimized trip configuration to the backend.

## Natural Language Examples

### Basic Optimization
```
User: "optimize my GEM e4 for daily city driving"
Assistant: [Uses optimize_gem_controller tool]
- Detects vehicle: e4
- Detects usage: city driving
- Optimizes for: stop-and-go traffic, regenerative braking
- Returns: optimized settings with explanations
```

### Complex Trip Planning
```
User: "I'm taking my GEM e6 camping in the mountains next weekend, what settings should I use?"
Assistant: [Uses plan_gem_trip tool]
- Detects vehicle: e6
- Detects trip type: camping
- Detects terrain: mountains
- Gets weather forecast
- Returns: complete trip plan with optimized settings
```

## Configuration

### Environment Variables

```bash
# Required
BACKEND_URL=http://localhost:3001

# Optional - Weather Integration
OPENWEATHER_API_KEY=your-key-here

# Optional - Terrain Integration  
MAPBOX_API_KEY=your-key-here

# Optional - Logging
LOG_LEVEL=info
```

## Development

### Running Tests
```bash
npm test
```

### Debugging
```bash
DEBUG_NLP=true DEBUG_OPTIMIZATION=true npm run dev
```

## License

MIT License - see LICENSE file for details.
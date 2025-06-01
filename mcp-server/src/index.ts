/**
 * MCP Server for GEM T2 Controller Optimizer
 * Exposes optimization functions to AI assistants
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { GEMControllerOptimizer } from './optimizer.js';
import { PresetsManager } from './presets.js';
import { ValidationSystem } from './validation.js';
import { TripPlanner } from './trip-planner.js';

// Initialize components
const optimizer = new GEMControllerOptimizer();
const presetsManager = new PresetsManager(optimizer);
const validation = new ValidationSystem();
const tripPlanner = new TripPlanner();

// Create MCP server
const server = new Server(
  {
    name: "gem-optimizer-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "optimize_for_trip",
        description: "Optimize GEM controller settings for a specific trip with weather and terrain analysis",
        inputSchema: {
          type: "object",
          properties: {
            vehicle_model: {
              type: "string",
              description: "GEM vehicle model (e2, e4, eS, eL, e6, elXD)",
              enum: ["e2", "e4", "eS", "eL", "e6", "elXD"]
            },
            destination: {
              type: "string",
              description: "Trip destination (e.g., 'Yosemite National Park' or 'lat,lng')"
            },
            date: {
              type: "string",
              description: "Trip date in YYYY-MM-DD format"
            },
            event_type: {
              type: "string",
              description: "Type of event or activity",
              enum: ["touring", "camping", "parade", "delivery", "daily_driving", "event_shuttle"]
            },
            group_size: {
              type: "number",
              description: "Number of passengers"
            },
            cargo_load: {
              type: "string",
              description: "Amount of cargo",
              enum: ["light", "moderate", "heavy"]
            },
            motor_condition: {
              type: "string",
              description: "Current motor condition",
              enum: ["good", "fair", "sparking"],
              default: "good"
            },
            battery_type: {
              type: "string",
              description: "Battery type",
              enum: ["lead", "lithium"],
              default: "lead"
            },
            battery_voltage: {
              type: "number",
              description: "Battery voltage (48-100V)",
              default: 72
            }
          },
          required: ["vehicle_model", "destination", "date", "event_type", "group_size"]
        }
      },
      {
        name: "optimize_general",
        description: "Optimize GEM controller settings based on priorities and conditions",
        inputSchema: {
          type: "object",
          properties: {
            vehicle_model: {
              type: "string",
              description: "GEM vehicle model",
              enum: ["e2", "e4", "eS", "eL", "e6", "elXD"]
            },
            priorities: {
              type: "object",
              description: "Optimization priorities (0-10 scale)",
              properties: {
                range: { type: "number", minimum: 0, maximum: 10 },
                speed: { type: "number", minimum: 0, maximum: 10 },
                acceleration: { type: "number", minimum: 0, maximum: 10 },
                hillClimbing: { type: "number", minimum: 0, maximum: 10 },
                regen: { type: "number", minimum: 0, maximum: 10 }
              }
            },
            terrain: {
              type: "string",
              enum: ["flat", "mixed", "moderate", "steep"]
            },
            battery_type: {
              type: "string",
              enum: ["lead", "lithium"],
              default: "lead"
            },
            battery_voltage: {
              type: "number",
              default: 72
            }
          },
          required: ["vehicle_model", "priorities"]
        }
      },
      {
        name: "get_preset",
        description: "Get a predefined optimization preset",
        inputSchema: {
          type: "object",
          properties: {
            preset_name: {
              type: "string",
              description: "Preset name",
              enum: ["performance", "hill-climber", "range-extender", "lithium-optimized", "motor-protection", "balanced", "weekend-outing"]
            }
          },
          required: ["preset_name"]
        }
      },
      {
        name: "get_weather",
        description: "Get weather forecast for a location",
        inputSchema: {
          type: "object",
          properties: {
            location: {
              type: "string",
              description: "Location name or coordinates"
            },
            date: {
              type: "string",
              description: "Date in YYYY-MM-DD format"
            }
          },
          required: ["location", "date"]
        }
      },
      {
        name: "analyze_terrain",
        description: "Analyze terrain between two points",
        inputSchema: {
          type: "object",
          properties: {
            start_location: {
              type: "string",
              description: "Starting location"
            },
            end_location: {
              type: "string",
              description: "Ending location"
            }
          },
          required: ["start_location", "end_location"]
        }
      }
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "optimize_for_trip": {
        // Get trip analysis
        const tripAnalysis = await tripPlanner.analyzeTripConditions(
          args.destination as string,
          args.date as string,
          {
            eventType: args.event_type as string,
            groupSize: args.group_size as number,
            cargoLoad: args.cargo_load as string
          }
        );

        // Build input data for optimizer
        const inputData = {
          vehicle: {
            model: args.vehicle_model as string,
            topSpeed: 25,
            motorCondition: args.motor_condition || 'good'
          },
          battery: {
            type: args.battery_type || 'lead',
            voltage: args.battery_voltage || 72,
            capacity: 150,
            age: 'good'
          },
          wheel: {
            tireDiameter: 22,
            gearRatio: 8.91
          },
          environment: {
            terrain: tripAnalysis.terrain.classification,
            vehicleLoad: determineVehicleLoad(args.group_size as number, args.cargo_load as string),
            temperatureRange: getTemperatureRange(tripAnalysis.weather.temperature),
            hillGrade: Math.round(tripAnalysis.terrain.maxGrade)
          },
          priorities: determineTripPriorities(
            args.event_type as string,
            tripAnalysis.terrain.classification,
            tripAnalysis.weather
          ),
          trip: {
            destination: args.destination,
            date: args.date,
            weather: tripAnalysis.weather,
            terrain: tripAnalysis.terrain,
            eventType: args.event_type
          }
        };

        // Run optimization
        const results = optimizer.optimizeSettings(inputData);

        // Format response with explanations
        return {
          content: [
            {
              type: "text",
              text: formatTripOptimizationResponse(inputData, results, tripAnalysis)
            }
          ],
        };
      }

      case "optimize_general": {
        const inputData = {
          vehicle: {
            model: args.vehicle_model as string,
            topSpeed: 25,
            motorCondition: 'good'
          },
          battery: {
            type: args.battery_type || 'lead',
            voltage: args.battery_voltage || 72,
            capacity: 150,
            age: 'good'
          },
          wheel: {
            tireDiameter: 22,
            gearRatio: 8.91
          },
          environment: {
            terrain: args.terrain || 'mixed',
            vehicleLoad: 'medium',
            temperatureRange: 'mild',
            hillGrade: 10
          },
          priorities: args.priorities as any
        };

        const results = optimizer.optimizeSettings(inputData);

        return {
          content: [
            {
              type: "text",
              text: formatGeneralOptimizationResponse(inputData, results)
            }
          ],
        };
      }

      case "get_preset": {
        const preset = presetsManager.getPreset(args.preset_name as string);
        if (!preset) {
          throw new McpError(
            ErrorCode.InvalidRequest,
            `Preset '${args.preset_name}' not found`
          );
        }

        return {
          content: [
            {
              type: "text",
              text: formatPresetResponse(args.preset_name as string, preset)
            }
          ],
        };
      }

      case "get_weather": {
        const weather = await tripPlanner.getWeatherForecast(
          args.location as string,
          args.date as string
        );

        return {
          content: [
            {
              type: "text",
              text: formatWeatherResponse(args.location as string, args.date as string, weather)
            }
          ],
        };
      }

      case "analyze_terrain": {
        const terrain = await tripPlanner.analyzeRouteTerrain(
          args.start_location as string,
          args.end_location as string
        );

        return {
          content: [
            {
              type: "text",
              text: formatTerrainResponse(
                args.start_location as string,
                args.end_location as string,
                terrain
              )
            }
          ],
        };
      }

      default:
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${name}`
        );
    }
  } catch (error) {
    throw new McpError(
      ErrorCode.InternalError,
      `Error executing tool: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
});

// Helper functions
function determineVehicleLoad(groupSize: number, cargoLoad: string): string {
  if (cargoLoad === 'heavy' || groupSize >= 4) return 'max';
  if (cargoLoad === 'moderate' || groupSize >= 3) return 'heavy';
  if (groupSize >= 2) return 'medium';
  return 'light';
}

function getTemperatureRange(temp: number): string {
  if (temp < 50) return 'cold';
  if (temp > 80) return 'hot';
  return 'mild';
}

function determineTripPriorities(eventType: string, terrain: string, weather: any) {
  const priorities = {
    range: 5,
    speed: 5,
    acceleration: 5,
    hillClimbing: 5,
    regen: 5
  };

  // Adjust based on event type
  switch (eventType) {
    case 'camping':
      priorities.range = 8;
      priorities.hillClimbing = 7;
      priorities.regen = 6;
      break;
    case 'parade':
      priorities.speed = 2;
      priorities.acceleration = 3;
      priorities.range = 3;
      break;
    case 'touring':
      priorities.range = 7;
      priorities.speed = 6;
      priorities.regen = 7;
      break;
    case 'delivery':
      priorities.acceleration = 7;
      priorities.range = 8;
      break;
  }

  // Adjust for terrain
  if (terrain === 'steep') {
    priorities.hillClimbing = 9;
    priorities.regen = 8;
  }

  // Adjust for weather
  if (weather.temperature < 50 || weather.temperature > 90) {
    priorities.range = Math.max(priorities.range, 7);
  }

  return priorities;
}

function formatTripOptimizationResponse(inputData: any, results: any, tripAnalysis: any): string {
  const changedSettings = Object.keys(results.optimizedSettings).filter(
    key => results.optimizedSettings[key] !== results.factorySettings[key]
  );

  let response = `## GEM Controller Optimization for ${inputData.trip.eventType.replace('_', ' ')} Trip\n\n`;
  
  response += `**Destination:** ${inputData.trip.destination}\n`;
  response += `**Date:** ${inputData.trip.date}\n`;
  response += `**Vehicle:** GEM ${inputData.vehicle.model}\n\n`;

  response += `### Trip Conditions\n`;
  response += `- **Weather:** ${Math.round(tripAnalysis.weather.temperature)}°F, ${tripAnalysis.weather.conditions}\n`;
  response += `- **Terrain:** ${tripAnalysis.terrain.classification} (max ${Math.round(tripAnalysis.terrain.maxGrade)}% grade)\n`;
  response += `- **Load:** ${inputData.environment.vehicleLoad}\n\n`;

  response += `### Optimized Settings\n`;
  response += `${changedSettings.length} parameters optimized for your trip:\n\n`;

  changedSettings.forEach(funcNum => {
    const oldVal = results.factorySettings[funcNum];
    const newVal = results.optimizedSettings[funcNum];
    const description = optimizer.functionDescriptions[funcNum];
    const change = newVal > oldVal ? '↑' : '↓';
    
    response += `- **F${funcNum} (${description}):** ${oldVal} → ${newVal} ${change}\n`;
  });

  response += `\n### Expected Performance\n`;
  results.performanceChanges.forEach((change: string) => {
    response += `- ${change}\n`;
  });

  response += `\n### Recommendations\n`;
  if (tripAnalysis.weather.precipitation > 0.1) {
    response += `- ⚠️ Rain expected - drive carefully and reduce speed\n`;
  }
  if (tripAnalysis.terrain.maxGrade > 15) {
    response += `- ⛰️ Steep terrain - monitor motor temperature\n`;
  }
  if (inputData.environment.vehicleLoad === 'max') {
    response += `- 📦 Heavy load - allow extra distance for braking\n`;
  }

  return response;
}

function formatGeneralOptimizationResponse(inputData: any, results: any): string {
  const changedSettings = Object.keys(results.optimizedSettings).filter(
    key => results.optimizedSettings[key] !== results.factorySettings[key]
  );

  let response = `## GEM Controller Optimization Results\n\n`;
  response += `**Vehicle:** GEM ${inputData.vehicle.model}\n`;
  response += `**Battery:** ${inputData.battery.voltage}V ${inputData.battery.type}\n`;
  response += `**Terrain:** ${inputData.environment.terrain}\n\n`;

  response += `### Optimization Priorities\n`;
  Object.entries(inputData.priorities).forEach(([key, value]) => {
    response += `- ${key}: ${value}/10\n`;
  });

  response += `\n### Optimized Settings\n`;
  changedSettings.forEach(funcNum => {
    const oldVal = results.factorySettings[funcNum];
    const newVal = results.optimizedSettings[funcNum];
    const description = optimizer.functionDescriptions[funcNum];
    
    response += `- **F${funcNum} (${description}):** ${oldVal} → ${newVal}\n`;
  });

  response += `\n### Expected Performance\n`;
  results.performanceChanges.forEach((change: string) => {
    response += `- ${change}\n`;
  });

  return response;
}

function formatPresetResponse(presetName: string, preset: any): string {
  let response = `## ${preset.name} Preset\n\n`;
  response += `${preset.description}\n\n`;
  
  response += `### Features\n`;
  preset.features.forEach((feature: string) => {
    response += `- ${feature}\n`;
  });
  
  response += `\n### Modified Settings\n`;
  Object.entries(preset.settings).forEach(([funcNum, value]) => {
    const description = optimizer.functionDescriptions[funcNum];
    response += `- **F${funcNum} (${description}):** ${value}\n`;
  });
  
  return response;
}

function formatWeatherResponse(location: string, date: string, weather: any): string {
  let response = `## Weather Forecast\n\n`;
  response += `**Location:** ${location}\n`;
  response += `**Date:** ${date}\n\n`;
  
  response += `### Conditions\n`;
  response += `- **Temperature:** ${Math.round(weather.temperature)}°F\n`;
  response += `- **Conditions:** ${weather.conditions}\n`;
  response += `- **Precipitation:** ${weather.precipitation} inches\n`;
  response += `- **Wind:** ${weather.windSpeed} mph\n`;
  response += `- **Humidity:** ${weather.humidity}%\n`;
  
  return response;
}

function formatTerrainResponse(start: string, end: string, terrain: any): string {
  let response = `## Terrain Analysis\n\n`;
  response += `**Route:** ${start} → ${end}\n\n`;
  
  response += `### Terrain Profile\n`;
  response += `- **Distance:** ${terrain.distance.toFixed(1)} miles\n`;
  response += `- **Elevation Gain:** ${terrain.totalElevationGain} ft\n`;
  response += `- **Max Grade:** ${terrain.maxGrade.toFixed(1)}%\n`;
  response += `- **Average Grade:** ${terrain.avgGrade.toFixed(1)}%\n`;
  response += `- **Classification:** ${terrain.classification}\n`;
  
  return response;
}

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("GEM Optimizer MCP server started");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
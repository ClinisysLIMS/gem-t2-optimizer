/**
 * Example of how an AI assistant would use the GEM Optimizer MCP tools
 */

// Example 1: Optimize for a camping trip
const campingTripRequest = {
  tool: "optimize_for_trip",
  arguments: {
    vehicle_model: "e4",
    destination: "Yosemite National Park",
    date: "2024-07-15",
    event_type: "camping",
    group_size: 4,
    cargo_load: "heavy",
    motor_condition: "good",
    battery_type: "lead",
    battery_voltage: 72
  }
};

// Expected response:
/*
## GEM Controller Optimization for camping Trip

**Destination:** Yosemite National Park
**Date:** 2024-07-15
**Vehicle:** GEM e4

### Trip Conditions
- **Weather:** 75°F, Clear
- **Terrain:** steep (max 18% grade)
- **Load:** max

### Optimized Settings
8 parameters optimized for your trip:

- **F3 (Controlled Acceleration):** 20 → 16 ↓
- **F4 (Max Armature Current Limit):** 255 → 255 
- **F7 (Minimum Field Current):** 59 → 70 ↑
- **F9 (Regen Armature Current):** 221 → 243 ↑
- **F10 (Regen Maximum Field Current):** 180 → 207 ↑
- **F24 (Field Weakening Start):** 43 → 64 ↑
- **F26 (Ratio of Field to Arm):** 3 → 4 ↑

### Expected Performance
- Hill climbing ability improved by approximately 17%
- Regenerative braking strength increased by approximately 19%
- Motor protection improved, may extend motor life

### Recommendations
- ⛰️ Steep terrain - monitor motor temperature
- 📦 Heavy load - allow extra distance for braking
*/

// Example 2: General optimization for hill climbing
const hillClimbingRequest = {
  tool: "optimize_general",
  arguments: {
    vehicle_model: "e6",
    priorities: {
      range: 5,
      speed: 3,
      acceleration: 6,
      hillClimbing: 10,
      regen: 8
    },
    terrain: "steep",
    battery_type: "lithium",
    battery_voltage: 82
  }
};

// Example 3: Get a preset configuration
const presetRequest = {
  tool: "get_preset",
  arguments: {
    preset_name: "weekend-outing"
  }
};

// Example 4: Check weather for trip planning
const weatherRequest = {
  tool: "get_weather",
  arguments: {
    location: "Lake Tahoe",
    date: "2024-08-01"
  }
};

// Example 5: Analyze terrain between points
const terrainRequest = {
  tool: "analyze_terrain",
  arguments: {
    start_location: "San Francisco",
    end_location: "Yosemite National Park"
  }
};

// Natural Language Examples that AI assistants can handle:

const naturalLanguageQueries = [
  "I need to optimize my GEM e4 for a camping trip to Yosemite next weekend with 4 people and camping gear",
  
  "What settings should I use for my lithium-powered GEM e6 to maximize range on hilly terrain?",
  
  "I'm participating in a parade tomorrow and it's going to be 95°F. How should I set up my GEM e2?",
  
  "My GEM e4's motor is sparking a bit. What conservative settings would you recommend for daily driving?",
  
  "I want maximum performance from my GEM e2 on flat roads. What settings should I use?",
  
  "Can you analyze the terrain between San Diego and Big Bear Lake for my GEM trip?",
  
  "What's the weather forecast for Joshua Tree next Saturday? I'm planning a GEM outing.",
  
  "I upgraded to lithium batteries. What controller settings work best with 82V lithium?"
];

// The AI assistant would parse these natural language queries and call the appropriate tools
// with the correct parameters, then format the response in a user-friendly way.

console.log("GEM Optimizer MCP Client Examples");
console.log("=================================");
console.log("\nThese examples show how AI assistants can use the MCP tools");
console.log("to help users optimize their GEM vehicles for specific scenarios.");
console.log("\nThe MCP server handles the optimization logic and returns");
console.log("formatted responses that the AI can present to users.");
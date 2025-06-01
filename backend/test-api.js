#!/usr/bin/env node

/**
 * Simple API test script for the GEM Optimizer Backend
 * Run with: node test-api.js
 * Make sure the server is running first: npm start
 */

const http = require('http');

const BASE_URL = 'http://localhost:3001';

// Helper function to make HTTP requests
function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

// Sample jamboree configuration
const sampleJamboree = {
  eventDetails: {
    name: "Summer Scout Jamboree 2024",
    date: "2024-07-15",
    location: "Camp Wilderness, Colorado",
    type: "jamboree"
  },
  vehicleConfigurations: [
    {
      id: "vehicle-1",
      name: "Troop 1 GEM",
      type: "gem_e4",
      specifications: {
        maxSpeed: 25,
        range: 30,
        capacity: 4
      }
    },
    {
      id: "vehicle-2",
      name: "Troop 2 GEM",
      type: "gem_e6",
      specifications: {
        maxSpeed: 25,
        range: 35,
        capacity: 6
      }
    }
  ],
  controllerSettings: {
    speedLimits: {
      eco: 12,
      normal: 18,
      sport: 25
    },
    regenerativeBraking: true,
    torqueSettings: {
      acceleration: 70,
      deceleration: 55
    }
  },
  weatherData: {
    temperature: 78,
    humidity: 45,
    windSpeed: 8,
    conditions: "sunny"
  },
  terrainData: {
    type: "hilly",
    grade: 12,
    surface: "mixed"
  },
  groupInfo: {
    name: "Mountain View Scout Council",
    memberCount: 24,
    contact: "scoutmaster@mountainview.org"
  }
};

async function runTests() {
  console.log('🚀 Starting GEM Optimizer Backend API Tests\n');

  try {
    // Test 1: Health check
    console.log('1. Testing health check...');
    const health = await makeRequest('GET', '/health');
    console.log(`   Status: ${health.status}, Response:`, health.data);

    // Test 2: Create jamboree
    console.log('\n2. Creating new jamboree...');
    const created = await makeRequest('POST', '/api/jamboree', sampleJamboree);
    console.log(`   Status: ${created.status}`);
    
    if (created.status === 201) {
      const jamboreeId = created.data.data.id;
      console.log(`   Created jamboree with ID: ${jamboreeId}`);

      // Test 3: Retrieve jamboree
      console.log('\n3. Retrieving jamboree...');
      const retrieved = await makeRequest('GET', `/api/jamboree/${jamboreeId}`);
      console.log(`   Status: ${retrieved.status}`);
      console.log(`   Event: ${retrieved.data.data.eventDetails.name}`);

      // Test 4: List jamborees
      console.log('\n4. Listing jamborees...');
      const listed = await makeRequest('GET', '/api/jamboree?limit=5');
      console.log(`   Status: ${listed.status}`);
      console.log(`   Found ${listed.data.data.length} jamborees`);

      // Test 5: Create share link
      console.log('\n5. Creating share link...');
      const shared = await makeRequest('POST', `/api/jamboree/${jamboreeId}/share`);
      console.log(`   Status: ${shared.status}`);
      
      if (shared.status === 200) {
        const shareId = shared.data.data.shareId;
        console.log(`   Share ID: ${shareId}`);

        // Test 6: Access shared jamboree
        console.log('\n6. Accessing shared jamboree...');
        const sharedAccess = await makeRequest('GET', `/api/share/${shareId}`);
        console.log(`   Status: ${sharedAccess.status}`);
        console.log(`   Shared event: ${sharedAccess.data.data.jamboree.eventDetails.name}`);
      }

      // Test 7: Update jamboree
      console.log('\n7. Updating jamboree...');
      const updatedData = {
        ...sampleJamboree,
        eventDetails: {
          ...sampleJamboree.eventDetails,
          name: "Updated Summer Scout Jamboree 2024"
        }
      };
      const updated = await makeRequest('PUT', `/api/jamboree/${jamboreeId}`, updatedData);
      console.log(`   Status: ${updated.status}`);

      // Test 8: Delete jamboree
      console.log('\n8. Deleting jamboree...');
      const deleted = await makeRequest('DELETE', `/api/jamboree/${jamboreeId}`);
      console.log(`   Status: ${deleted.status}`);
    }

    console.log('\n✅ All tests completed!');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests();
}

module.exports = { runTests, makeRequest };
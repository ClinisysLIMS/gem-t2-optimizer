#!/usr/bin/env node
/**
 * Test script for GEM Optimizer MCP Server
 * This simulates MCP protocol communication for testing
 */

import { spawn } from 'child_process';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

let serverProcess;
let requestId = 0;

function startServer() {
  console.log('Starting GEM Optimizer MCP Server...');
  
  serverProcess = spawn('node', ['dist/index.js'], {
    stdio: ['pipe', 'pipe', 'inherit']
  });
  
  serverProcess.stdout.on('data', (data) => {
    const messages = data.toString().split('\n').filter(line => line.trim());
    messages.forEach(message => {
      try {
        const parsed = JSON.parse(message);
        console.log('Server response:', JSON.stringify(parsed, null, 2));
      } catch (e) {
        console.log('Server output:', message);
      }
    });
  });
  
  serverProcess.on('close', (code) => {
    console.log(`Server process exited with code ${code}`);
    process.exit(code);
  });
  
  // Wait a moment for server to initialize
  setTimeout(() => {
    console.log('Server started. You can now send test requests.\n');
    showMenu();
  }, 1000);
}

function sendRequest(request) {
  const jsonRpcRequest = {
    jsonrpc: '2.0',
    id: ++requestId,
    ...request
  };
  
  console.log('\nSending request:', JSON.stringify(jsonRpcRequest, null, 2));
  serverProcess.stdin.write(JSON.stringify(jsonRpcRequest) + '\n');
}

function showMenu() {
  console.log('\nTest Menu:');
  console.log('1. List available tools');
  console.log('2. Test optimize_for_trip');
  console.log('3. Test optimize_general');
  console.log('4. Test get_preset');
  console.log('5. Test get_weather');
  console.log('6. Test analyze_terrain');
  console.log('0. Exit');
  
  rl.question('\nSelect an option: ', (answer) => {
    handleMenuSelection(answer);
  });
}

function handleMenuSelection(option) {
  switch (option) {
    case '1':
      sendRequest({
        method: 'tools/list',
        params: {}
      });
      setTimeout(showMenu, 2000);
      break;
      
    case '2':
      sendRequest({
        method: 'tools/call',
        params: {
          name: 'optimize_for_trip',
          arguments: {
            location: 'Yosemite National Park',
            date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            eventType: 'camping',
            vehicleModel: 'e4',
            terrain: 'steep',
            vehicleLoad: 'heavy',
            groupSize: 4
          }
        }
      });
      setTimeout(showMenu, 2000);
      break;
      
    case '3':
      sendRequest({
        method: 'tools/call',
        params: {
          name: 'optimize_general',
          arguments: {
            vehicleModel: 'e2',
            batteryType: 'lithium',
            batteryVoltage: 82,
            priorities: {
              speed: 8,
              acceleration: 7,
              range: 6,
              hillClimbing: 5,
              regen: 6
            }
          }
        }
      });
      setTimeout(showMenu, 2000);
      break;
      
    case '4':
      sendRequest({
        method: 'tools/call',
        params: {
          name: 'get_preset',
          arguments: {
            presetName: 'hill-climber'
          }
        }
      });
      setTimeout(showMenu, 2000);
      break;
      
    case '5':
      sendRequest({
        method: 'tools/call',
        params: {
          name: 'get_weather',
          arguments: {
            location: 'San Diego, CA',
            date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
          }
        }
      });
      setTimeout(showMenu, 2000);
      break;
      
    case '6':
      sendRequest({
        method: 'tools/call',
        params: {
          name: 'analyze_terrain',
          arguments: {
            startLocation: 'La Jolla, CA',
            endLocation: 'Julian, CA'
          }
        }
      });
      setTimeout(showMenu, 2000);
      break;
      
    case '0':
      console.log('Exiting...');
      serverProcess.kill();
      rl.close();
      process.exit(0);
      break;
      
    default:
      console.log('Invalid option');
      showMenu();
  }
}

// Check if the server is built
import { existsSync } from 'fs';
if (!existsSync('dist/index.js')) {
  console.error('Error: Server not built. Run "npm run build" first.');
  process.exit(1);
}

// Start the test
console.log('=== GEM Optimizer MCP Server Test Tool ===\n');
startServer();
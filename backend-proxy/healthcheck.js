/**
 * Docker Health Check Script
 * Simple health check for container orchestration
 */

const http = require('http');

const options = {
    hostname: 'localhost',
    port: process.env.PORT || 3001,
    path: '/health',
    method: 'GET',
    timeout: 2000
};

const request = http.request(options, (res) => {
    console.log(`Health check status: ${res.statusCode}`);
    
    if (res.statusCode === 200) {
        process.exit(0);
    } else {
        process.exit(1);
    }
});

request.on('error', (err) => {
    console.error('Health check failed:', err.message);
    process.exit(1);
});

request.on('timeout', () => {
    console.error('Health check timeout');
    request.destroy();
    process.exit(1);
});

request.setTimeout(2000);
request.end();
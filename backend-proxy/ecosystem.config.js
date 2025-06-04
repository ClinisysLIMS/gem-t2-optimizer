/**
 * PM2 Ecosystem Configuration
 * For production deployment with PM2 process manager
 */

module.exports = {
    apps: [{
        name: 'gem-optimizer-backend',
        script: 'server.js',
        instances: 'max',
        exec_mode: 'cluster',
        
        // Environment variables
        env: {
            NODE_ENV: 'development',
            PORT: 3001
        },
        
        env_production: {
            NODE_ENV: 'production',
            PORT: 3001
        },
        
        // Monitoring
        monitor: true,
        
        // Auto restart
        autorestart: true,
        watch: false,
        max_memory_restart: '1G',
        
        // Logging
        log_file: './logs/combined.log',
        out_file: './logs/out.log',
        error_file: './logs/error.log',
        log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
        
        // Error handling
        min_uptime: '10s',
        max_restarts: 10,
        
        // Performance
        node_args: '--max-old-space-size=1024'
    }]
};
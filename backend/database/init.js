/**
 * Database Initialization Script
 * Creates SQLite database schema for GEM Optimizer backend
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Ensure database directory exists
const dbDir = path.join(__dirname);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'gem_optimizer.db');

// Create and initialize database
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        process.exit(1);
    }
    console.log('Connected to SQLite database');
});

// Database schema
const schema = `
-- Users table for basic user management
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT 1,
    profile_data TEXT -- JSON string for additional profile info
);

-- Vehicle configurations table
CREATE TABLE IF NOT EXISTS vehicle_configs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    name TEXT NOT NULL,
    vehicle_data TEXT NOT NULL, -- JSON string containing vehicle configuration
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_favorite BOOLEAN DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- Trip plans table for weekend outings and jamborees
CREATE TABLE IF NOT EXISTS trip_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    config_id INTEGER,
    title TEXT NOT NULL,
    description TEXT,
    start_location TEXT,
    end_location TEXT,
    start_date DATE,
    end_date DATE,
    trip_data TEXT NOT NULL, -- JSON string containing complete trip data
    weather_data TEXT, -- JSON string for cached weather data
    terrain_data TEXT, -- JSON string for cached terrain data
    optimization_results TEXT, -- JSON string for controller optimization results
    status TEXT DEFAULT 'planned', -- planned, active, completed, cancelled
    is_public BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (config_id) REFERENCES vehicle_configs (id) ON DELETE SET NULL
);

-- Shared configurations for community sharing
CREATE TABLE IF NOT EXISTS shared_configs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    config_id INTEGER,
    trip_id INTEGER,
    share_code TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL, -- vehicle, trip, optimization
    config_data TEXT NOT NULL, -- JSON string containing shared configuration
    tags TEXT, -- JSON array of tags for categorization
    view_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    download_count INTEGER DEFAULT 0,
    is_featured BOOLEAN DEFAULT 0,
    expires_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (config_id) REFERENCES vehicle_configs (id) ON DELETE SET NULL,
    FOREIGN KEY (trip_id) REFERENCES trip_plans (id) ON DELETE SET NULL
);

-- Trip participants for group jamborees
CREATE TABLE IF NOT EXISTS trip_participants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trip_id INTEGER NOT NULL,
    user_id INTEGER,
    name TEXT NOT NULL,
    email TEXT,
    vehicle_info TEXT, -- JSON string for participant's vehicle
    status TEXT DEFAULT 'invited', -- invited, confirmed, declined, attended
    role TEXT DEFAULT 'participant', -- organizer, co-organizer, participant
    notes TEXT,
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (trip_id) REFERENCES trip_plans (id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
);

-- Community interactions (likes, comments, etc.)
CREATE TABLE IF NOT EXISTS community_interactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    target_type TEXT NOT NULL, -- shared_config, trip_plan, comment
    target_id INTEGER NOT NULL,
    interaction_type TEXT NOT NULL, -- like, view, download, comment, report
    data TEXT, -- JSON string for additional data (e.g., comment text)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- API usage tracking
CREATE TABLE IF NOT EXISTS api_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    endpoint TEXT NOT NULL,
    method TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    response_status INTEGER,
    response_time_ms INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
);

-- System settings and configuration
CREATE TABLE IF NOT EXISTS system_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT UNIQUE NOT NULL,
    value TEXT NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_vehicle_configs_user_id ON vehicle_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_trip_plans_user_id ON trip_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_trip_plans_dates ON trip_plans(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_trip_plans_status ON trip_plans(status);
CREATE INDEX IF NOT EXISTS idx_shared_configs_share_code ON shared_configs(share_code);
CREATE INDEX IF NOT EXISTS idx_shared_configs_category ON shared_configs(category);
CREATE INDEX IF NOT EXISTS idx_shared_configs_user_id ON shared_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_trip_participants_trip_id ON trip_participants(trip_id);
CREATE INDEX IF NOT EXISTS idx_community_interactions_target ON community_interactions(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_community_interactions_user ON community_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_user_id ON api_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_endpoint ON api_usage(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_usage_created_at ON api_usage(created_at);

-- Insert default system settings
INSERT OR IGNORE INTO system_settings (key, value, description) VALUES 
    ('max_trip_duration_days', '30', 'Maximum allowed trip duration in days'),
    ('max_participants_per_trip', '50', 'Maximum participants allowed per trip'),
    ('share_expiry_days', '365', 'Default expiry time for shared configurations in days'),
    ('api_rate_limit_per_hour', '1000', 'API requests per hour per user'),
    ('max_file_upload_size_mb', '10', 'Maximum file upload size in MB'),
    ('featured_configs_limit', '20', 'Maximum number of featured configurations'),
    ('maintenance_mode', 'false', 'Enable/disable maintenance mode'),
    ('registration_enabled', 'true', 'Enable/disable new user registration');
`;

// Execute schema
db.exec(schema, (err) => {
    if (err) {
        console.error('Error creating database schema:', err.message);
        process.exit(1);
    }
    
    console.log('✅ Database schema created successfully');
    
    // Create some sample data for development
    createSampleData();
});

function createSampleData() {
    // Sample vehicle configuration
    const sampleVehicleConfig = {
        model: 'e4',
        topSpeed: 25,
        motorCondition: 'good',
        battery: {
            type: 'lithium',
            voltage: 72,
            capacity: 150,
            age: 'good'
        },
        wheel: {
            tireDiameter: 22,
            gearRatio: 8.91
        },
        environment: {
            terrain: 'mixed',
            vehicleLoad: 'medium',
            temperatureRange: 'mild',
            hillGrade: 10
        },
        priorities: {
            range: 7,
            speed: 5,
            acceleration: 6,
            hillClimbing: 8,
            regen: 6
        }
    };
    
    // Sample trip plan
    const sampleTripPlan = {
        location: {
            startPoint: 'San Francisco, CA',
            destination: 'Yosemite National Park'
        },
        date: {
            startDate: '2024-06-15',
            endDate: '2024-06-17',
            duration: 3
        },
        details: {
            eventType: 'camping',
            description: 'Weekend camping trip to Yosemite with the GEM club',
            estimatedDistance: 45
        },
        passengers: {
            count: 4,
            cargoLoad: 'heavy',
            specialRequirements: ['camping']
        }
    };
    
    // Sample optimization results
    const sampleOptimization = {
        factorySettings: {
            1: 100, 3: 15, 4: 245, 5: 5, 6: 60, 7: 70, 8: 245, 9: 225, 10: 100
        },
        optimizedSettings: {
            1: 100, 3: 18, 4: 255, 5: 5, 6: 65, 7: 78, 8: 245, 9: 233, 10: 115
        },
        performanceChanges: [
            'Enhanced hill climbing performance (+12%)',
            'Improved regenerative braking efficiency',
            'Optimized for camping load configuration'
        ]
    };
    
    const insertSamples = `
        INSERT OR IGNORE INTO vehicle_configs (user_id, name, vehicle_data, is_favorite) 
        VALUES (NULL, 'Sample GEM e4 Configuration', '${JSON.stringify(sampleVehicleConfig)}', 1);
        
        INSERT OR IGNORE INTO trip_plans (user_id, title, description, start_location, end_location, start_date, end_date, trip_data, optimization_results, status, is_public)
        VALUES (NULL, 'Yosemite Camping Adventure', 'Weekend GEM camping trip to Yosemite National Park', 'San Francisco, CA', 'Yosemite National Park', '2024-06-15', '2024-06-17', '${JSON.stringify(sampleTripPlan)}', '${JSON.stringify(sampleOptimization)}', 'planned', 1);
        
        INSERT OR IGNORE INTO shared_configs (user_id, share_code, title, description, category, config_data, tags)
        VALUES (1, 'YOSEMITE2024', 'Yosemite Camping Trip Configuration', 'Optimized settings for mountain camping with heavy cargo load', 'trip', '${JSON.stringify({...sampleTripPlan, optimization: sampleOptimization})}', '["camping", "mountains", "heavy-load"]');
    `;
    
    db.exec(insertSamples, (err) => {
        if (err) {
            console.log('Note: Sample data may already exist or failed to insert:', err.message);
        } else {
            console.log('✅ Sample data created successfully');
        }
        
        db.close((err) => {
            if (err) {
                console.error('Error closing database:', err.message);
            } else {
                console.log('✅ Database initialization complete');
                console.log(`Database created at: ${dbPath}`);
            }
        });
    });
}

// Handle process termination
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err.message);
        }
        process.exit(0);
    });
});
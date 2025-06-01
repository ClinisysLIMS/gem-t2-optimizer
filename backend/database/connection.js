/**
 * Database Connection Module
 * Provides SQLite database connection and query utilities
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
    constructor() {
        this.db = null;
        this.dbPath = path.join(__dirname, 'gem_optimizer.db');
    }
    
    /**
     * Connect to the database
     */
    connect() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    console.error('Database connection error:', err.message);
                    reject(err);
                } else {
                    console.log('✅ Connected to SQLite database');
                    // Enable foreign keys
                    this.db.run('PRAGMA foreign_keys = ON');
                    resolve();
                }
            });
        });
    }
    
    /**
     * Close database connection
     */
    close() {
        return new Promise((resolve, reject) => {
            if (this.db) {
                this.db.close((err) => {
                    if (err) {
                        reject(err);
                    } else {
                        console.log('Database connection closed');
                        resolve();
                    }
                });
            } else {
                resolve();
            }
        });
    }
    
    /**
     * Execute a query that returns multiple rows
     */
    all(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    console.error('Database query error:', err.message);
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }
    
    /**
     * Execute a query that returns a single row
     */
    get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) {
                    console.error('Database query error:', err.message);
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }
    
    /**
     * Execute a query that doesn't return data (INSERT, UPDATE, DELETE)
     */
    run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) {
                    console.error('Database query error:', err.message);
                    reject(err);
                } else {
                    resolve({
                        id: this.lastID,
                        changes: this.changes
                    });
                }
            });
        });
    }
    
    /**
     * Execute multiple queries in a transaction
     */
    transaction(queries) {
        return new Promise((resolve, reject) => {
            this.db.serialize(() => {
                this.db.run('BEGIN TRANSACTION');
                
                const results = [];
                let completed = 0;
                let hasError = false;
                
                queries.forEach((query, index) => {
                    const { sql, params = [] } = query;
                    
                    this.db.run(sql, params, function(err) {
                        if (err && !hasError) {
                            hasError = true;
                            this.db.run('ROLLBACK');
                            reject(err);
                        } else if (!hasError) {
                            results[index] = {
                                id: this.lastID,
                                changes: this.changes
                            };
                            completed++;
                            
                            if (completed === queries.length) {
                                this.db.run('COMMIT', (commitErr) => {
                                    if (commitErr) {
                                        reject(commitErr);
                                    } else {
                                        resolve(results);
                                    }
                                });
                            }
                        }
                    });
                });
            });
        });
    }
    
    /**
     * Get database statistics
     */
    async getStats() {
        try {
            const stats = {
                users: await this.get('SELECT COUNT(*) as count FROM users'),
                vehicleConfigs: await this.get('SELECT COUNT(*) as count FROM vehicle_configs'),
                tripPlans: await this.get('SELECT COUNT(*) as count FROM trip_plans'),
                sharedConfigs: await this.get('SELECT COUNT(*) as count FROM shared_configs'),
                interactions: await this.get('SELECT COUNT(*) as count FROM community_interactions')
            };
            
            return {
                users: stats.users.count,
                vehicleConfigs: stats.vehicleConfigs.count,
                tripPlans: stats.tripPlans.count,
                sharedConfigs: stats.sharedConfigs.count,
                interactions: stats.interactions.count
            };
        } catch (error) {
            console.error('Error getting database stats:', error);
            throw error;
        }
    }
    
    /**
     * Clean up old records
     */
    async cleanup() {
        try {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            
            // Clean up expired shared configs
            await this.run(
                'DELETE FROM shared_configs WHERE expires_at < ?',
                [thirtyDaysAgo.toISOString()]
            );
            
            // Clean up old API usage records (keep last 30 days)
            await this.run(
                'DELETE FROM api_usage WHERE created_at < ?',
                [thirtyDaysAgo.toISOString()]
            );
            
            console.log('✅ Database cleanup completed');
        } catch (error) {
            console.error('Error during database cleanup:', error);
            throw error;
        }
    }
}

// Create singleton instance
const database = new Database();

module.exports = database;
/**
 * Trip Planning Routes
 * Handles trip creation, management, and optimization
 */

const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const database = require('../database/connection');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Validation middleware
const validateTrip = [
    body('title').notEmpty().isLength({ min: 3, max: 100 }).withMessage('Title must be 3-100 characters'),
    body('start_location').optional().isLength({ max: 200 }).withMessage('Start location too long'),
    body('end_location').notEmpty().isLength({ max: 200 }).withMessage('End location required and max 200 characters'),
    body('start_date').isISO8601().withMessage('Valid start date required'),
    body('end_date').optional().isISO8601().withMessage('End date must be valid ISO date'),
    body('trip_data').isObject().withMessage('Trip data must be an object'),
    body('is_public').optional().isBoolean().withMessage('is_public must be boolean')
];

const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: errors.array()
        });
    }
    next();
};

/**
 * Create a new trip plan
 * POST /api/trips
 */
router.post('/', validateTrip, handleValidationErrors, async (req, res) => {
    try {
        const {
            title,
            description,
            start_location,
            end_location,
            start_date,
            end_date,
            trip_data,
            weather_data,
            terrain_data,
            optimization_results,
            is_public = false
        } = req.body;

        // Insert trip into database
        const result = await database.run(
            `INSERT INTO trip_plans (
                user_id, title, description, start_location, end_location,
                start_date, end_date, trip_data, weather_data, terrain_data,
                optimization_results, is_public
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                null, // user_id - will be set when auth is implemented
                title,
                description || null,
                start_location || null,
                end_location,
                start_date,
                end_date || null,
                JSON.stringify(trip_data),
                weather_data ? JSON.stringify(weather_data) : null,
                terrain_data ? JSON.stringify(terrain_data) : null,
                optimization_results ? JSON.stringify(optimization_results) : null,
                is_public
            ]
        );

        // Retrieve the created trip
        const trip = await database.get(
            'SELECT * FROM trip_plans WHERE id = ?',
            [result.id]
        );

        // Parse JSON fields
        const parsedTrip = {
            ...trip,
            trip_data: JSON.parse(trip.trip_data),
            weather_data: trip.weather_data ? JSON.parse(trip.weather_data) : null,
            terrain_data: trip.terrain_data ? JSON.parse(trip.terrain_data) : null,
            optimization_results: trip.optimization_results ? JSON.parse(trip.optimization_results) : null
        };

        res.status(201).json({
            success: true,
            data: parsedTrip,
            message: 'Trip plan created successfully'
        });

    } catch (error) {
        console.error('Error creating trip:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create trip plan',
            details: error.message
        });
    }
});

/**
 * Get all trip plans with pagination and filtering
 * GET /api/trips
 */
router.get('/', async (req, res) => {
    try {
        const {
            limit = 20,
            offset = 0,
            status = 'all',
            is_public,
            start_date_from,
            start_date_to,
            search
        } = req.query;

        let whereClause = '1=1';
        const params = [];

        // Filter by status
        if (status !== 'all') {
            whereClause += ' AND status = ?';
            params.push(status);
        }

        // Filter by public/private
        if (is_public !== undefined) {
            whereClause += ' AND is_public = ?';
            params.push(is_public === 'true');
        }

        // Filter by date range
        if (start_date_from) {
            whereClause += ' AND start_date >= ?';
            params.push(start_date_from);
        }
        if (start_date_to) {
            whereClause += ' AND start_date <= ?';
            params.push(start_date_to);
        }

        // Search in title, description, and locations
        if (search) {
            whereClause += ` AND (
                title LIKE ? OR 
                description LIKE ? OR 
                start_location LIKE ? OR 
                end_location LIKE ?
            )`;
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm, searchTerm);
        }

        // Get total count
        const countResult = await database.get(
            `SELECT COUNT(*) as total FROM trip_plans WHERE ${whereClause}`,
            params
        );

        // Get trips with pagination
        const trips = await database.all(
            `SELECT id, title, description, start_location, end_location, 
                    start_date, end_date, status, is_public, created_at, updated_at
             FROM trip_plans 
             WHERE ${whereClause}
             ORDER BY created_at DESC 
             LIMIT ? OFFSET ?`,
            [...params, parseInt(limit), parseInt(offset)]
        );

        res.json({
            success: true,
            data: trips,
            pagination: {
                total: countResult.total,
                limit: parseInt(limit),
                offset: parseInt(offset),
                hasMore: parseInt(offset) + parseInt(limit) < countResult.total
            }
        });

    } catch (error) {
        console.error('Error fetching trips:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch trip plans',
            details: error.message
        });
    }
});

/**
 * Get a specific trip plan by ID
 * GET /api/trips/:id
 */
router.get('/:id', [
    param('id').isInt().withMessage('Trip ID must be an integer')
], handleValidationErrors, async (req, res) => {
    try {
        const trip = await database.get(
            'SELECT * FROM trip_plans WHERE id = ?',
            [req.params.id]
        );

        if (!trip) {
            return res.status(404).json({
                success: false,
                error: 'Trip plan not found'
            });
        }

        // Parse JSON fields
        const parsedTrip = {
            ...trip,
            trip_data: JSON.parse(trip.trip_data),
            weather_data: trip.weather_data ? JSON.parse(trip.weather_data) : null,
            terrain_data: trip.terrain_data ? JSON.parse(trip.terrain_data) : null,
            optimization_results: trip.optimization_results ? JSON.parse(trip.optimization_results) : null
        };

        // Get participants if any
        const participants = await database.all(
            'SELECT * FROM trip_participants WHERE trip_id = ?',
            [req.params.id]
        );

        parsedTrip.participants = participants.map(p => ({
            ...p,
            vehicle_info: p.vehicle_info ? JSON.parse(p.vehicle_info) : null
        }));

        res.json({
            success: true,
            data: parsedTrip
        });

    } catch (error) {
        console.error('Error fetching trip:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch trip plan',
            details: error.message
        });
    }
});

/**
 * Update a trip plan
 * PUT /api/trips/:id
 */
router.put('/:id', [
    param('id').isInt().withMessage('Trip ID must be an integer'),
    ...validateTrip
], handleValidationErrors, async (req, res) => {
    try {
        const {
            title,
            description,
            start_location,
            end_location,
            start_date,
            end_date,
            trip_data,
            weather_data,
            terrain_data,
            optimization_results,
            status,
            is_public
        } = req.body;

        // Check if trip exists
        const existingTrip = await database.get(
            'SELECT id FROM trip_plans WHERE id = ?',
            [req.params.id]
        );

        if (!existingTrip) {
            return res.status(404).json({
                success: false,
                error: 'Trip plan not found'
            });
        }

        // Update trip
        await database.run(
            `UPDATE trip_plans SET 
                title = ?, description = ?, start_location = ?, end_location = ?,
                start_date = ?, end_date = ?, trip_data = ?, weather_data = ?,
                terrain_data = ?, optimization_results = ?, status = ?, is_public = ?,
                updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [
                title,
                description || null,
                start_location || null,
                end_location,
                start_date,
                end_date || null,
                JSON.stringify(trip_data),
                weather_data ? JSON.stringify(weather_data) : null,
                terrain_data ? JSON.stringify(terrain_data) : null,
                optimization_results ? JSON.stringify(optimization_results) : null,
                status || 'planned',
                is_public || false,
                req.params.id
            ]
        );

        // Return updated trip
        const updatedTrip = await database.get(
            'SELECT * FROM trip_plans WHERE id = ?',
            [req.params.id]
        );

        const parsedTrip = {
            ...updatedTrip,
            trip_data: JSON.parse(updatedTrip.trip_data),
            weather_data: updatedTrip.weather_data ? JSON.parse(updatedTrip.weather_data) : null,
            terrain_data: updatedTrip.terrain_data ? JSON.parse(updatedTrip.terrain_data) : null,
            optimization_results: updatedTrip.optimization_results ? JSON.parse(updatedTrip.optimization_results) : null
        };

        res.json({
            success: true,
            data: parsedTrip,
            message: 'Trip plan updated successfully'
        });

    } catch (error) {
        console.error('Error updating trip:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update trip plan',
            details: error.message
        });
    }
});

/**
 * Delete a trip plan
 * DELETE /api/trips/:id
 */
router.delete('/:id', [
    param('id').isInt().withMessage('Trip ID must be an integer')
], handleValidationErrors, async (req, res) => {
    try {
        const result = await database.run(
            'DELETE FROM trip_plans WHERE id = ?',
            [req.params.id]
        );

        if (result.changes === 0) {
            return res.status(404).json({
                success: false,
                error: 'Trip plan not found'
            });
        }

        res.json({
            success: true,
            message: 'Trip plan deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting trip:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete trip plan',
            details: error.message
        });
    }
});

/**
 * Add participant to a trip
 * POST /api/trips/:id/participants
 */
router.post('/:id/participants', [
    param('id').isInt().withMessage('Trip ID must be an integer'),
    body('name').notEmpty().isLength({ max: 100 }).withMessage('Name required, max 100 characters'),
    body('email').optional().isEmail().withMessage('Valid email required'),
    body('vehicle_info').optional().isObject().withMessage('Vehicle info must be an object'),
    body('role').optional().isIn(['organizer', 'co-organizer', 'participant']).withMessage('Invalid role')
], handleValidationErrors, async (req, res) => {
    try {
        const { name, email, vehicle_info, role = 'participant', notes } = req.body;

        // Check if trip exists
        const trip = await database.get(
            'SELECT id FROM trip_plans WHERE id = ?',
            [req.params.id]
        );

        if (!trip) {
            return res.status(404).json({
                success: false,
                error: 'Trip plan not found'
            });
        }

        // Add participant
        const result = await database.run(
            `INSERT INTO trip_participants (trip_id, name, email, vehicle_info, role, notes)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                req.params.id,
                name,
                email || null,
                vehicle_info ? JSON.stringify(vehicle_info) : null,
                role,
                notes || null
            ]
        );

        // Get the created participant
        const participant = await database.get(
            'SELECT * FROM trip_participants WHERE id = ?',
            [result.id]
        );

        const parsedParticipant = {
            ...participant,
            vehicle_info: participant.vehicle_info ? JSON.parse(participant.vehicle_info) : null
        };

        res.status(201).json({
            success: true,
            data: parsedParticipant,
            message: 'Participant added successfully'
        });

    } catch (error) {
        console.error('Error adding participant:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to add participant',
            details: error.message
        });
    }
});

/**
 * Get trip statistics
 * GET /api/trips/stats
 */
router.get('/stats/overview', async (req, res) => {
    try {
        const stats = await database.all(`
            SELECT 
                COUNT(*) as total_trips,
                COUNT(CASE WHEN status = 'planned' THEN 1 END) as planned_trips,
                COUNT(CASE WHEN status = 'active' THEN 1 END) as active_trips,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_trips,
                COUNT(CASE WHEN is_public = 1 THEN 1 END) as public_trips,
                AVG(julianday(end_date) - julianday(start_date)) as avg_duration_days
            FROM trip_plans
        `);

        const participantStats = await database.get(`
            SELECT 
                COUNT(*) as total_participants,
                AVG(participant_count) as avg_participants_per_trip
            FROM (
                SELECT trip_id, COUNT(*) as participant_count
                FROM trip_participants
                GROUP BY trip_id
            )
        `);

        res.json({
            success: true,
            data: {
                ...stats[0],
                ...participantStats,
                avg_duration_days: Math.round((stats[0].avg_duration_days || 0) * 10) / 10
            }
        });

    } catch (error) {
        console.error('Error fetching trip stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch trip statistics',
            details: error.message
        });
    }
});

module.exports = router;
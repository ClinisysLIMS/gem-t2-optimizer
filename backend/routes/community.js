/**
 * Community Sharing Routes
 * Handles sharing configurations, community interactions, and featured content
 */

const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const database = require('../database/connection');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Validation middleware
const validateSharedConfig = [
    body('title').notEmpty().isLength({ min: 3, max: 100 }).withMessage('Title must be 3-100 characters'),
    body('description').optional().isLength({ max: 500 }).withMessage('Description max 500 characters'),
    body('category').isIn(['vehicle', 'trip', 'optimization']).withMessage('Invalid category'),
    body('config_data').isObject().withMessage('Config data must be an object'),
    body('tags').optional().isArray().withMessage('Tags must be an array'),
    body('expires_at').optional().isISO8601().withMessage('Expiry date must be valid ISO date')
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
 * Create a shared configuration
 * POST /api/community/share
 */
router.post('/share', validateSharedConfig, handleValidationErrors, async (req, res) => {
    try {
        const {
            config_id,
            trip_id,
            title,
            description,
            category,
            config_data,
            tags = [],
            expires_at
        } = req.body;

        // Generate unique share code
        let shareCode;
        let isUnique = false;
        let attempts = 0;
        
        while (!isUnique && attempts < 10) {
            shareCode = Math.random().toString(36).substring(2, 10).toUpperCase();
            const existing = await database.get(
                'SELECT id FROM shared_configs WHERE share_code = ?',
                [shareCode]
            );
            isUnique = !existing;
            attempts++;
        }

        if (!isUnique) {
            return res.status(500).json({
                success: false,
                error: 'Failed to generate unique share code'
            });
        }

        // Set default expiry (1 year from now)
        const defaultExpiry = new Date();
        defaultExpiry.setFullYear(defaultExpiry.getFullYear() + 1);

        // Create shared config
        const result = await database.run(
            `INSERT INTO shared_configs (
                user_id, config_id, trip_id, share_code, title, description,
                category, config_data, tags, expires_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                null, // user_id - will be set when auth is implemented
                config_id || null,
                trip_id || null,
                shareCode,
                title,
                description || null,
                category,
                JSON.stringify(config_data),
                JSON.stringify(tags),
                expires_at || defaultExpiry.toISOString()
            ]
        );

        // Get the created shared config
        const sharedConfig = await database.get(
            'SELECT * FROM shared_configs WHERE id = ?',
            [result.id]
        );

        const parsedConfig = {
            ...sharedConfig,
            config_data: JSON.parse(sharedConfig.config_data),
            tags: JSON.parse(sharedConfig.tags)
        };

        res.status(201).json({
            success: true,
            data: parsedConfig,
            message: 'Configuration shared successfully',
            share_url: `${req.protocol}://${req.get('host')}/api/community/shared/${shareCode}`
        });

    } catch (error) {
        console.error('Error creating shared config:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to share configuration',
            details: error.message
        });
    }
});

/**
 * Get shared configurations with filtering and pagination
 * GET /api/community/shared
 */
router.get('/shared', async (req, res) => {
    try {
        const {
            limit = 20,
            offset = 0,
            category,
            featured,
            search,
            tags,
            sort = 'recent'
        } = req.query;

        let whereClause = 'expires_at > CURRENT_TIMESTAMP';
        const params = [];

        // Filter by category
        if (category) {
            whereClause += ' AND category = ?';
            params.push(category);
        }

        // Filter by featured status
        if (featured !== undefined) {
            whereClause += ' AND is_featured = ?';
            params.push(featured === 'true');
        }

        // Search in title and description
        if (search) {
            whereClause += ' AND (title LIKE ? OR description LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm);
        }

        // Filter by tags
        if (tags) {
            const tagArray = Array.isArray(tags) ? tags : [tags];
            for (const tag of tagArray) {
                whereClause += ' AND tags LIKE ?';
                params.push(`%"${tag}"%`);
            }
        }

        // Determine sort order
        let orderBy = 'created_at DESC';
        switch (sort) {
            case 'popular':
                orderBy = 'download_count DESC, like_count DESC, created_at DESC';
                break;
            case 'views':
                orderBy = 'view_count DESC, created_at DESC';
                break;
            case 'likes':
                orderBy = 'like_count DESC, created_at DESC';
                break;
            case 'recent':
            default:
                orderBy = 'created_at DESC';
                break;
        }

        // Get total count
        const countResult = await database.get(
            `SELECT COUNT(*) as total FROM shared_configs WHERE ${whereClause}`,
            params
        );

        // Get shared configs
        const configs = await database.all(
            `SELECT id, share_code, title, description, category, tags,
                    view_count, like_count, download_count, is_featured,
                    created_at, expires_at
             FROM shared_configs 
             WHERE ${whereClause}
             ORDER BY ${orderBy}
             LIMIT ? OFFSET ?`,
            [...params, parseInt(limit), parseInt(offset)]
        );

        // Parse tags for each config
        const parsedConfigs = configs.map(config => ({
            ...config,
            tags: JSON.parse(config.tags)
        }));

        res.json({
            success: true,
            data: parsedConfigs,
            pagination: {
                total: countResult.total,
                limit: parseInt(limit),
                offset: parseInt(offset),
                hasMore: parseInt(offset) + parseInt(limit) < countResult.total
            }
        });

    } catch (error) {
        console.error('Error fetching shared configs:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch shared configurations',
            details: error.message
        });
    }
});

/**
 * Get a specific shared configuration by share code
 * GET /api/community/shared/:shareCode
 */
router.get('/shared/:shareCode', [
    param('shareCode').isLength({ min: 6, max: 20 }).withMessage('Invalid share code format')
], handleValidationErrors, async (req, res) => {
    try {
        const shareCode = req.params.shareCode.toUpperCase();

        // Get shared config
        const sharedConfig = await database.get(
            'SELECT * FROM shared_configs WHERE share_code = ?',
            [shareCode]
        );

        if (!sharedConfig) {
            return res.status(404).json({
                success: false,
                error: 'Shared configuration not found'
            });
        }

        // Check if expired
        if (new Date() > new Date(sharedConfig.expires_at)) {
            return res.status(410).json({
                success: false,
                error: 'Shared configuration has expired'
            });
        }

        // Increment view count
        await database.run(
            'UPDATE shared_configs SET view_count = view_count + 1 WHERE id = ?',
            [sharedConfig.id]
        );

        // Record view interaction
        await database.run(
            `INSERT INTO community_interactions (user_id, target_type, target_id, interaction_type)
             VALUES (?, ?, ?, ?)`,
            [null, 'shared_config', sharedConfig.id, 'view']
        );

        // Parse JSON fields
        const parsedConfig = {
            ...sharedConfig,
            config_data: JSON.parse(sharedConfig.config_data),
            tags: JSON.parse(sharedConfig.tags),
            view_count: sharedConfig.view_count + 1
        };

        res.json({
            success: true,
            data: parsedConfig
        });

    } catch (error) {
        console.error('Error fetching shared config:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch shared configuration',
            details: error.message
        });
    }
});

/**
 * Download a shared configuration
 * POST /api/community/shared/:shareCode/download
 */
router.post('/shared/:shareCode/download', [
    param('shareCode').isLength({ min: 6, max: 20 }).withMessage('Invalid share code format')
], handleValidationErrors, async (req, res) => {
    try {
        const shareCode = req.params.shareCode.toUpperCase();

        // Get shared config
        const sharedConfig = await database.get(
            'SELECT * FROM shared_configs WHERE share_code = ?',
            [shareCode]
        );

        if (!sharedConfig) {
            return res.status(404).json({
                success: false,
                error: 'Shared configuration not found'
            });
        }

        // Check if expired
        if (new Date() > new Date(sharedConfig.expires_at)) {
            return res.status(410).json({
                success: false,
                error: 'Shared configuration has expired'
            });
        }

        // Increment download count
        await database.run(
            'UPDATE shared_configs SET download_count = download_count + 1 WHERE id = ?',
            [sharedConfig.id]
        );

        // Record download interaction
        await database.run(
            `INSERT INTO community_interactions (user_id, target_type, target_id, interaction_type)
             VALUES (?, ?, ?, ?)`,
            [null, 'shared_config', sharedConfig.id, 'download']
        );

        res.json({
            success: true,
            message: 'Download recorded successfully',
            data: {
                download_count: sharedConfig.download_count + 1
            }
        });

    } catch (error) {
        console.error('Error recording download:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to record download',
            details: error.message
        });
    }
});

/**
 * Like/unlike a shared configuration
 * POST /api/community/shared/:shareCode/like
 */
router.post('/shared/:shareCode/like', [
    param('shareCode').isLength({ min: 6, max: 20 }).withMessage('Invalid share code format'),
    body('action').isIn(['like', 'unlike']).withMessage('Action must be like or unlike')
], handleValidationErrors, async (req, res) => {
    try {
        const shareCode = req.params.shareCode.toUpperCase();
        const { action } = req.body;

        // Get shared config
        const sharedConfig = await database.get(
            'SELECT * FROM shared_configs WHERE share_code = ?',
            [shareCode]
        );

        if (!sharedConfig) {
            return res.status(404).json({
                success: false,
                error: 'Shared configuration not found'
            });
        }

        // Update like count
        const increment = action === 'like' ? 1 : -1;
        await database.run(
            'UPDATE shared_configs SET like_count = MAX(0, like_count + ?) WHERE id = ?',
            [increment, sharedConfig.id]
        );

        // Record interaction
        await database.run(
            `INSERT INTO community_interactions (user_id, target_type, target_id, interaction_type)
             VALUES (?, ?, ?, ?)`,
            [null, 'shared_config', sharedConfig.id, action]
        );

        // Get updated like count
        const updated = await database.get(
            'SELECT like_count FROM shared_configs WHERE id = ?',
            [sharedConfig.id]
        );

        res.json({
            success: true,
            message: `Configuration ${action}d successfully`,
            data: {
                like_count: updated.like_count,
                action
            }
        });

    } catch (error) {
        console.error('Error updating like status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update like status',
            details: error.message
        });
    }
});

/**
 * Get featured configurations
 * GET /api/community/featured
 */
router.get('/featured', async (req, res) => {
    try {
        const { limit = 10, category } = req.query;

        let whereClause = 'is_featured = 1 AND expires_at > CURRENT_TIMESTAMP';
        const params = [];

        if (category) {
            whereClause += ' AND category = ?';
            params.push(category);
        }

        const featuredConfigs = await database.all(
            `SELECT id, share_code, title, description, category, tags,
                    view_count, like_count, download_count, created_at
             FROM shared_configs 
             WHERE ${whereClause}
             ORDER BY download_count DESC, like_count DESC, view_count DESC
             LIMIT ?`,
            [...params, parseInt(limit)]
        );

        const parsedConfigs = featuredConfigs.map(config => ({
            ...config,
            tags: JSON.parse(config.tags)
        }));

        res.json({
            success: true,
            data: parsedConfigs
        });

    } catch (error) {
        console.error('Error fetching featured configs:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch featured configurations',
            details: error.message
        });
    }
});

/**
 * Get community statistics
 * GET /api/community/stats
 */
router.get('/stats', async (req, res) => {
    try {
        const stats = await database.all(`
            SELECT 
                COUNT(*) as total_shared,
                COUNT(CASE WHEN category = 'vehicle' THEN 1 END) as vehicle_configs,
                COUNT(CASE WHEN category = 'trip' THEN 1 END) as trip_configs,
                COUNT(CASE WHEN category = 'optimization' THEN 1 END) as optimization_configs,
                COUNT(CASE WHEN is_featured = 1 THEN 1 END) as featured_configs,
                SUM(view_count) as total_views,
                SUM(like_count) as total_likes,
                SUM(download_count) as total_downloads
            FROM shared_configs
            WHERE expires_at > CURRENT_TIMESTAMP
        `);

        const interactionStats = await database.get(`
            SELECT 
                COUNT(CASE WHEN interaction_type = 'view' THEN 1 END) as total_interactions_views,
                COUNT(CASE WHEN interaction_type = 'like' THEN 1 END) as total_interactions_likes,
                COUNT(CASE WHEN interaction_type = 'download' THEN 1 END) as total_interactions_downloads
            FROM community_interactions
            WHERE target_type = 'shared_config'
        `);

        const popularTags = await database.all(`
            SELECT tag, COUNT(*) as usage_count
            FROM (
                SELECT json_each.value as tag
                FROM shared_configs, json_each(shared_configs.tags)
                WHERE expires_at > CURRENT_TIMESTAMP
            )
            GROUP BY tag
            ORDER BY usage_count DESC
            LIMIT 10
        `);

        res.json({
            success: true,
            data: {
                ...stats[0],
                ...interactionStats,
                popular_tags: popularTags
            }
        });

    } catch (error) {
        console.error('Error fetching community stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch community statistics',
            details: error.message
        });
    }
});

/**
 * Get popular tags
 * GET /api/community/tags
 */
router.get('/tags', async (req, res) => {
    try {
        const { limit = 20 } = req.query;

        const tags = await database.all(`
            SELECT tag, COUNT(*) as usage_count
            FROM (
                SELECT json_each.value as tag
                FROM shared_configs, json_each(shared_configs.tags)
                WHERE expires_at > CURRENT_TIMESTAMP
            )
            GROUP BY tag
            ORDER BY usage_count DESC
            LIMIT ?
        `, [parseInt(limit)]);

        res.json({
            success: true,
            data: tags
        });

    } catch (error) {
        console.error('Error fetching tags:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch tags',
            details: error.message
        });
    }
});

module.exports = router;
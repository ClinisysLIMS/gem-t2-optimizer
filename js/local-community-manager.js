/**
 * Local Community Manager
 * Handles sharing optimization settings, ratings, comments locally
 * Replaces Firebase-based community features with local storage
 */
class LocalCommunityManager {
    constructor() {
        this.auth = null;
        this.storage = null;
        this.currentUser = null;
        this.sharedConfigurations = [];
        this.userVotes = new Map();
        this.userBookmarks = new Set();
        this.storageKey = 'gem_community_data';
        
        this.init();
    }
    
    /**
     * Initialize community manager
     */
    async init() {
        // Wait for local auth and storage services
        this.waitForServices().then(() => {
            this.auth = window.localAuth;
            this.storage = window.localStorageService;
            
            console.log('Local Community Manager initialized');
            
            // Listen for auth state changes
            this.auth.onAuthStateChanged((user) => {
                this.handleAuthStateChange(user);
            });
            
            // If user is already signed in, load user data
            if (this.auth.isAuthenticated()) {
                this.currentUser = this.auth.getCurrentUser();
                this.loadUserCommunityData();
            }
            
            // Load shared configurations
            this.loadSharedConfigurations();
        }).catch(error => {
            console.warn('Community features not available:', error);
        });
    }
    
    /**
     * Wait for required services to be available
     */
    async waitForServices() {
        return new Promise((resolve, reject) => {
            const checkServices = () => {
                if (window.localAuth && window.localStorageService) {
                    resolve();
                } else {
                    setTimeout(checkServices, 100);
                }
            };
            
            checkServices();
            
            // Timeout after 10 seconds
            setTimeout(() => reject(new Error('Services timeout')), 10000);
        });
    }
    
    /**
     * Handle authentication state changes
     */
    async handleAuthStateChange(user) {
        this.currentUser = user;
        if (user) {
            await this.loadUserCommunityData();
        } else {
            this.clearUserData();
        }
    }
    
    /**
     * Load user's community data (votes, bookmarks, etc.)
     */
    async loadUserCommunityData() {
        if (!this.currentUser) return;
        
        try {
            const userData = await this.storage.getCommunityData(this.currentUser.uid);
            if (userData) {
                this.userBookmarks = new Set(userData.bookmarks || []);
                this.userVotes = new Map(userData.votes || []);
            }
        } catch (error) {
            console.error('Error loading user community data:', error);
        }
    }
    
    /**
     * Load shared configurations from local storage
     */
    async loadSharedConfigurations() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                this.sharedConfigurations = JSON.parse(stored);
            }
        } catch (error) {
            console.error('Error loading shared configurations:', error);
            this.sharedConfigurations = [];
        }
    }
    
    /**
     * Save shared configurations to local storage
     */
    async saveSharedConfigurations() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.sharedConfigurations));
        } catch (error) {
            console.error('Error saving shared configurations:', error);
        }
    }
    
    /**
     * Share a configuration with the community
     */
    async shareConfiguration(configData) {
        if (!this.currentUser) {
            throw new Error('User must be signed in to share configurations');
        }
        
        try {
            const sharedConfig = {
                id: this.generateConfigId(),
                ...configData,
                authorId: this.currentUser.uid,
                authorName: this.currentUser.displayName || this.currentUser.email.split('@')[0],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                votes: {
                    up: 0,
                    down: 0,
                    total: 0,
                    average: 0
                },
                ratings: [],
                comments: [],
                bookmarkCount: 0,
                views: 0,
                tags: this.generateTags(configData),
                status: 'active'
            };
            
            this.sharedConfigurations.unshift(sharedConfig);
            await this.saveSharedConfigurations();
            
            console.log('Configuration shared successfully:', sharedConfig.id);
            return sharedConfig;
            
        } catch (error) {
            console.error('Error sharing configuration:', error);
            throw error;
        }
    }
    
    /**
     * Get shared configurations with filtering and sorting
     */
    async getSharedConfigurations(options = {}) {
        const {
            limit = 20,
            offset = 0,
            sortBy = 'recent',
            filterBy = {},
            searchQuery = ''
        } = options;
        
        let filtered = [...this.sharedConfigurations];
        
        // Apply search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(config => 
                config.title?.toLowerCase().includes(query) ||
                config.description?.toLowerCase().includes(query) ||
                config.vehicleData?.model?.toLowerCase().includes(query) ||
                config.tags?.some(tag => tag.toLowerCase().includes(query))
            );
        }
        
        // Apply filters
        if (filterBy.vehicleModel) {
            filtered = filtered.filter(config => 
                config.vehicleData?.model === filterBy.vehicleModel
            );
        }
        
        if (filterBy.optimizationMode) {
            filtered = filtered.filter(config => 
                config.optimizationMode === filterBy.optimizationMode
            );
        }
        
        if (filterBy.author) {
            filtered = filtered.filter(config => 
                config.authorId === filterBy.author
            );
        }
        
        // Apply sorting
        switch (sortBy) {
            case 'recent':
                filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                break;
            case 'popular':
                filtered.sort((a, b) => (b.votes.total || 0) - (a.votes.total || 0));
                break;
            case 'rating':
                filtered.sort((a, b) => (b.votes.average || 0) - (a.votes.average || 0));
                break;
            case 'views':
                filtered.sort((a, b) => (b.views || 0) - (a.views || 0));
                break;
        }
        
        // Apply pagination
        const paginated = filtered.slice(offset, offset + limit);
        
        return {
            configurations: paginated,
            total: filtered.length,
            hasMore: offset + limit < filtered.length
        };
    }
    
    /**
     * Rate a configuration
     */
    async rateConfiguration(configId, rating) {
        if (!this.currentUser) {
            throw new Error('User must be signed in to rate configurations');
        }
        
        if (rating < 1 || rating > 5) {
            throw new Error('Rating must be between 1 and 5');
        }
        
        try {
            const config = this.sharedConfigurations.find(c => c.id === configId);
            if (!config) {
                throw new Error('Configuration not found');
            }
            
            // Check if user already rated this config
            const existingRatingIndex = config.ratings.findIndex(r => r.userId === this.currentUser.uid);
            
            if (existingRatingIndex >= 0) {
                // Update existing rating
                config.ratings[existingRatingIndex].rating = rating;
                config.ratings[existingRatingIndex].updatedAt = new Date().toISOString();
            } else {
                // Add new rating
                config.ratings.push({
                    userId: this.currentUser.uid,
                    rating: rating,
                    createdAt: new Date().toISOString()
                });
            }
            
            // Recalculate vote statistics
            this.updateVoteStatistics(config);
            
            // Update user votes map
            this.userVotes.set(configId, rating);
            
            // Save data
            await this.saveSharedConfigurations();
            await this.saveUserCommunityData();
            
            return config.votes;
            
        } catch (error) {
            console.error('Error rating configuration:', error);
            throw error;
        }
    }
    
    /**
     * Add comment to configuration
     */
    async addComment(configId, commentText) {
        if (!this.currentUser) {
            throw new Error('User must be signed in to comment');
        }
        
        if (!commentText || commentText.trim().length === 0) {
            throw new Error('Comment text is required');
        }
        
        try {
            const config = this.sharedConfigurations.find(c => c.id === configId);
            if (!config) {
                throw new Error('Configuration not found');
            }
            
            const comment = {
                id: this.generateCommentId(),
                userId: this.currentUser.uid,
                authorName: this.currentUser.displayName || this.currentUser.email.split('@')[0],
                text: commentText.trim(),
                createdAt: new Date().toISOString(),
                likes: 0,
                replies: []
            };
            
            config.comments.unshift(comment);
            config.updatedAt = new Date().toISOString();
            
            await this.saveSharedConfigurations();
            
            return comment;
            
        } catch (error) {
            console.error('Error adding comment:', error);
            throw error;
        }
    }
    
    /**
     * Toggle bookmark for configuration
     */
    async toggleBookmark(configId) {
        if (!this.currentUser) {
            throw new Error('User must be signed in to bookmark configurations');
        }
        
        try {
            const config = this.sharedConfigurations.find(c => c.id === configId);
            if (!config) {
                throw new Error('Configuration not found');
            }
            
            const isBookmarked = this.userBookmarks.has(configId);
            
            if (isBookmarked) {
                this.userBookmarks.delete(configId);
                config.bookmarkCount = Math.max(0, (config.bookmarkCount || 1) - 1);
            } else {
                this.userBookmarks.add(configId);
                config.bookmarkCount = (config.bookmarkCount || 0) + 1;
            }
            
            await this.saveSharedConfigurations();
            await this.saveUserCommunityData();
            
            return !isBookmarked;
            
        } catch (error) {
            console.error('Error toggling bookmark:', error);
            throw error;
        }
    }
    
    /**
     * Increment view count for configuration
     */
    async incrementViews(configId) {
        try {
            const config = this.sharedConfigurations.find(c => c.id === configId);
            if (config) {
                config.views = (config.views || 0) + 1;
                await this.saveSharedConfigurations();
            }
        } catch (error) {
            console.warn('Error incrementing views:', error);
        }
    }
    
    /**
     * Get user's shared configurations
     */
    async getUserConfigurations(userId) {
        return this.sharedConfigurations.filter(config => config.authorId === userId);
    }
    
    /**
     * Get user's bookmarked configurations
     */
    async getUserBookmarks() {
        if (!this.currentUser) return [];
        
        return this.sharedConfigurations.filter(config => 
            this.userBookmarks.has(config.id)
        );
    }
    
    /**
     * Delete user's configuration
     */
    async deleteConfiguration(configId) {
        if (!this.currentUser) {
            throw new Error('User must be signed in to delete configurations');
        }
        
        try {
            const configIndex = this.sharedConfigurations.findIndex(c => 
                c.id === configId && c.authorId === this.currentUser.uid
            );
            
            if (configIndex === -1) {
                throw new Error('Configuration not found or not authorized');
            }
            
            this.sharedConfigurations.splice(configIndex, 1);
            await this.saveSharedConfigurations();
            
            return true;
        } catch (error) {
            console.error('Error deleting configuration:', error);
            throw error;
        }
    }
    
    /**
     * Helper Methods
     */
    
    updateVoteStatistics(config) {
        if (!config.ratings || config.ratings.length === 0) {
            config.votes = { up: 0, down: 0, total: 0, average: 0 };
            return;
        }
        
        const total = config.ratings.length;
        const sum = config.ratings.reduce((acc, r) => acc + r.rating, 0);
        const average = sum / total;
        
        // Convert 1-5 rating to up/down votes (4-5 = up, 1-2 = down, 3 = neutral)
        const up = config.ratings.filter(r => r.rating >= 4).length;
        const down = config.ratings.filter(r => r.rating <= 2).length;
        
        config.votes = {
            up,
            down,
            total,
            average: Math.round(average * 10) / 10
        };
    }
    
    generateTags(configData) {
        const tags = [];
        
        if (configData.vehicleData?.model) {
            tags.push(configData.vehicleData.model.toLowerCase());
        }
        
        if (configData.optimizationMode) {
            tags.push(configData.optimizationMode);
        }
        
        if (configData.vehicleData?.batteryType) {
            tags.push(configData.vehicleData.batteryType);
        }
        
        if (configData.tripData?.type) {
            tags.push(configData.tripData.type);
        }
        
        return tags;
    }
    
    generateConfigId() {
        return 'config_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    generateCommentId() {
        return 'comment_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    async saveUserCommunityData() {
        if (!this.currentUser) return;
        
        try {
            const userData = {
                bookmarks: Array.from(this.userBookmarks),
                votes: Array.from(this.userVotes.entries()),
                updatedAt: new Date().toISOString()
            };
            
            await this.storage.saveCommunityData(this.currentUser.uid, userData);
        } catch (error) {
            console.error('Error saving user community data:', error);
        }
    }
    
    clearUserData() {
        this.userVotes.clear();
        this.userBookmarks.clear();
    }
    
    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        return this.auth && this.auth.isAuthenticated();
    }
    
    /**
     * Get current user
     */
    getCurrentUser() {
        return this.currentUser;
    }
    
    /**
     * Check if user has rated a configuration
     */
    hasUserRated(configId) {
        return this.userVotes.has(configId);
    }
    
    /**
     * Get user's rating for a configuration
     */
    getUserRating(configId) {
        return this.userVotes.get(configId);
    }
    
    /**
     * Check if user has bookmarked a configuration
     */
    hasUserBookmarked(configId) {
        return this.userBookmarks.has(configId);
    }
}

// Initialize Local Community Manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.localCommunityManager = new LocalCommunityManager();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LocalCommunityManager;
}
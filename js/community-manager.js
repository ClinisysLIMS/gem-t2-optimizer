/**
 * Community Manager
 * Handles sharing optimization settings, ratings, comments, and community interactions
 */
class CommunityManager {
    constructor() {
        this.firebase = null;
        this.currentUser = null;
        this.sharedConfigurations = [];
        this.userVotes = new Map();
        this.userBookmarks = new Set();
        
        this.init();
    }
    
    /**
     * Initialize community manager
     */
    async init() {
        // Wait for Firebase manager to be available
        if (typeof window.firebaseManager !== 'undefined') {
            this.firebase = window.firebaseManager;
            console.log('Community Manager initialized');
            
            // Listen for auth state changes
            window.addEventListener('authStateChanged', (e) => {
                this.handleAuthStateChange(e.detail.user);
            });
            
            // If user is already signed in, load user data
            if (this.firebase.isAuthenticated()) {
                this.currentUser = this.firebase.getCurrentUser();
                await this.loadUserCommunityData();
            }
        } else {
            console.warn('Firebase manager not available for community features');
        }
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
            const userRef = this.firebase.db.collection('users').doc(this.currentUser.uid);
            const userData = await userRef.get();
            
            if (userData.exists) {
                const data = userData.data();
                this.userBookmarks = new Set(data.bookmarks || []);
                // Load user votes separately for performance
                await this.loadUserVotes();
            }
            
        } catch (error) {
            console.error('Error loading user community data:', error);
        }
    }
    
    /**
     * Load user's votes
     */
    async loadUserVotes() {
        if (!this.currentUser) return;
        
        try {
            const votesRef = this.firebase.db.collection('communityVotes')
                .where('userId', '==', this.currentUser.uid);
            const snapshot = await votesRef.get();
            
            this.userVotes.clear();
            snapshot.forEach(doc => {
                const vote = doc.data();
                this.userVotes.set(vote.configurationId, vote.rating);
            });
            
        } catch (error) {
            console.error('Error loading user votes:', error);
        }
    }
    
    /**
     * Share a configuration with the community
     */
    async shareConfiguration(configData) {
        if (!this.currentUser) {
            throw new Error('Must be signed in to share configurations');
        }
        
        try {
            const sharedConfig = {
                title: configData.title,
                description: configData.description,
                category: configData.category, // 'route', 'event', 'condition', 'general'
                tags: configData.tags || [],
                
                // Vehicle information
                vehicleData: {
                    model: configData.vehicleData.model,
                    year: configData.vehicleData.year,
                    controller: configData.vehicleData.controller,
                    motorType: configData.vehicleData.motorType,
                    batteryVoltage: configData.vehicleData.batteryVoltage,
                    batteryType: configData.vehicleData.batteryType
                },
                
                // Optimization settings
                controllerSettings: configData.controllerSettings,
                optimizationMode: configData.optimizationMode,
                
                // Route/condition specific data
                routeInfo: configData.routeInfo || null,
                conditions: configData.conditions || null,
                eventInfo: configData.eventInfo || null,
                
                // Sharing metadata
                authorId: this.currentUser.uid,
                authorName: this.currentUser.displayName || this.currentUser.email,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                
                // Community metrics
                viewCount: 0,
                downloadCount: 0,
                averageRating: 0,
                ratingCount: 0,
                commentCount: 0,
                bookmarkCount: 0,
                
                // Status and moderation
                status: 'published', // 'draft', 'published', 'flagged', 'removed'
                verified: false,
                featured: false
            };
            
            const docRef = await this.firebase.db.collection('sharedConfigurations').add(sharedConfig);
            sharedConfig.id = docRef.id;
            
            // Update user's sharing stats
            await this.updateUserStats('configurationsShared');
            
            return {
                success: true,
                configurationId: docRef.id,
                configuration: sharedConfig
            };
            
        } catch (error) {
            console.error('Error sharing configuration:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Get shared configurations with filtering and sorting
     */
    async getSharedConfigurations(options = {}) {
        try {
            let query = this.firebase.db.collection('sharedConfigurations')
                .where('status', '==', 'published');
            
            // Apply filters
            if (options.category) {
                query = query.where('category', '==', options.category);
            }
            
            if (options.vehicleModel) {
                query = query.where('vehicleData.model', '==', options.vehicleModel);
            }
            
            if (options.authorId) {
                query = query.where('authorId', '==', options.authorId);
            }
            
            // Apply sorting
            switch (options.sortBy) {
                case 'rating':
                    query = query.orderBy('averageRating', 'desc');
                    break;
                case 'popular':
                    query = query.orderBy('downloadCount', 'desc');
                    break;
                case 'recent':
                    query = query.orderBy('createdAt', 'desc');
                    break;
                case 'views':
                    query = query.orderBy('viewCount', 'desc');
                    break;
                default:
                    query = query.orderBy('createdAt', 'desc');
            }
            
            // Apply limit
            if (options.limit) {
                query = query.limit(options.limit);
            }
            
            const snapshot = await query.get();
            const configurations = [];
            
            snapshot.forEach(doc => {
                configurations.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            return configurations;
            
        } catch (error) {
            console.error('Error getting shared configurations:', error);
            return [];
        }
    }
    
    /**
     * Get a specific configuration by ID
     */
    async getConfiguration(configurationId) {
        try {
            const doc = await this.firebase.db.collection('sharedConfigurations').doc(configurationId).get();
            
            if (doc.exists) {
                // Increment view count
                await this.incrementViewCount(configurationId);
                
                return {
                    id: doc.id,
                    ...doc.data()
                };
            }
            
            return null;
            
        } catch (error) {
            console.error('Error getting configuration:', error);
            return null;
        }
    }
    
    /**
     * Rate a configuration
     */
    async rateConfiguration(configurationId, rating) {
        if (!this.currentUser) {
            throw new Error('Must be signed in to rate configurations');
        }
        
        if (rating < 1 || rating > 5) {
            throw new Error('Rating must be between 1 and 5');
        }
        
        try {
            const voteId = `${this.currentUser.uid}_${configurationId}`;
            const voteRef = this.firebase.db.collection('communityVotes').doc(voteId);
            const existingVote = await voteRef.get();
            
            const voteData = {
                userId: this.currentUser.uid,
                configurationId: configurationId,
                rating: rating,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            if (existingVote.exists) {
                // Update existing vote
                await voteRef.update(voteData);
            } else {
                // Create new vote
                voteData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                await voteRef.set(voteData);
            }
            
            // Update local cache
            this.userVotes.set(configurationId, rating);
            
            // Recalculate average rating for the configuration
            await this.recalculateRating(configurationId);
            
            return { success: true };
            
        } catch (error) {
            console.error('Error rating configuration:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Add a comment to a configuration
     */
    async addComment(configurationId, commentText) {
        if (!this.currentUser) {
            throw new Error('Must be signed in to comment');
        }
        
        if (!commentText.trim()) {
            throw new Error('Comment cannot be empty');
        }
        
        try {
            const comment = {
                configurationId: configurationId,
                authorId: this.currentUser.uid,
                authorName: this.currentUser.displayName || this.currentUser.email,
                text: commentText.trim(),
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                likes: 0,
                flagged: false,
                verified: false
            };
            
            const docRef = await this.firebase.db.collection('communityComments').add(comment);
            
            // Update comment count on configuration
            await this.firebase.db.collection('sharedConfigurations').doc(configurationId).update({
                commentCount: firebase.firestore.FieldValue.increment(1)
            });
            
            return {
                success: true,
                commentId: docRef.id,
                comment: { id: docRef.id, ...comment }
            };
            
        } catch (error) {
            console.error('Error adding comment:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Get comments for a configuration
     */
    async getComments(configurationId, limit = 20) {
        try {
            const query = this.firebase.db.collection('communityComments')
                .where('configurationId', '==', configurationId)
                .where('flagged', '==', false)
                .orderBy('createdAt', 'desc')
                .limit(limit);
            
            const snapshot = await query.get();
            const comments = [];
            
            snapshot.forEach(doc => {
                comments.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            return comments;
            
        } catch (error) {
            console.error('Error getting comments:', error);
            return [];
        }
    }
    
    /**
     * Bookmark/unbookmark a configuration
     */
    async toggleBookmark(configurationId) {
        if (!this.currentUser) {
            throw new Error('Must be signed in to bookmark configurations');
        }
        
        try {
            const userRef = this.firebase.db.collection('users').doc(this.currentUser.uid);
            
            if (this.userBookmarks.has(configurationId)) {
                // Remove bookmark
                this.userBookmarks.delete(configurationId);
                await userRef.update({
                    bookmarks: firebase.firestore.FieldValue.arrayRemove(configurationId)
                });
                
                // Decrement bookmark count
                await this.firebase.db.collection('sharedConfigurations').doc(configurationId).update({
                    bookmarkCount: firebase.firestore.FieldValue.increment(-1)
                });
                
                return { bookmarked: false };
            } else {
                // Add bookmark
                this.userBookmarks.add(configurationId);
                await userRef.update({
                    bookmarks: firebase.firestore.FieldValue.arrayUnion(configurationId)
                });
                
                // Increment bookmark count
                await this.firebase.db.collection('sharedConfigurations').doc(configurationId).update({
                    bookmarkCount: firebase.firestore.FieldValue.increment(1)
                });
                
                return { bookmarked: true };
            }
            
        } catch (error) {
            console.error('Error toggling bookmark:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Download/apply a configuration
     */
    async downloadConfiguration(configurationId) {
        try {
            // Increment download count
            await this.firebase.db.collection('sharedConfigurations').doc(configurationId).update({
                downloadCount: firebase.firestore.FieldValue.increment(1)
            });
            
            // Get the configuration
            const config = await this.getConfiguration(configurationId);
            
            if (config && this.currentUser) {
                // Track download in user's history
                await this.firebase.db.collection('users').doc(this.currentUser.uid)
                    .collection('downloadHistory').add({
                        configurationId: configurationId,
                        title: config.title,
                        authorName: config.authorName,
                        downloadedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
            }
            
            return config;
            
        } catch (error) {
            console.error('Error downloading configuration:', error);
            return null;
        }
    }
    
    /**
     * Search configurations
     */
    async searchConfigurations(searchTerm, options = {}) {
        try {
            // For more advanced search, we'd need Algolia or similar
            // This is a basic implementation using Firestore
            let query = this.firebase.db.collection('sharedConfigurations')
                .where('status', '==', 'published');
            
            // Apply basic filters from options
            if (options.category) {
                query = query.where('category', '==', options.category);
            }
            
            query = query.orderBy('createdAt', 'desc').limit(50);
            
            const snapshot = await query.get();
            const allConfigs = [];
            
            snapshot.forEach(doc => {
                allConfigs.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            // Filter by search term (client-side for simplicity)
            const searchTermLower = searchTerm.toLowerCase();
            const filtered = allConfigs.filter(config => {
                return (
                    config.title.toLowerCase().includes(searchTermLower) ||
                    config.description.toLowerCase().includes(searchTermLower) ||
                    config.tags.some(tag => tag.toLowerCase().includes(searchTermLower)) ||
                    config.authorName.toLowerCase().includes(searchTermLower)
                );
            });
            
            return filtered;
            
        } catch (error) {
            console.error('Error searching configurations:', error);
            return [];
        }
    }
    
    /**
     * Get user's bookmarked configurations
     */
    async getUserBookmarks() {
        if (!this.currentUser || this.userBookmarks.size === 0) {
            return [];
        }
        
        try {
            const bookmarkIds = Array.from(this.userBookmarks);
            const configurations = [];
            
            // Fetch in batches of 10 (Firestore 'in' limit)
            for (let i = 0; i < bookmarkIds.length; i += 10) {
                const batch = bookmarkIds.slice(i, i + 10);
                const query = this.firebase.db.collection('sharedConfigurations')
                    .where(firebase.firestore.FieldPath.documentId(), 'in', batch);
                
                const snapshot = await query.get();
                snapshot.forEach(doc => {
                    configurations.push({
                        id: doc.id,
                        ...doc.data()
                    });
                });
            }
            
            return configurations;
            
        } catch (error) {
            console.error('Error getting user bookmarks:', error);
            return [];
        }
    }
    
    /**
     * Flag a configuration for review
     */
    async flagConfiguration(configurationId, reason) {
        if (!this.currentUser) {
            throw new Error('Must be signed in to flag content');
        }
        
        try {
            await this.firebase.db.collection('communityFlags').add({
                configurationId: configurationId,
                flaggedBy: this.currentUser.uid,
                reason: reason,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                status: 'pending'
            });
            
            return { success: true };
            
        } catch (error) {
            console.error('Error flagging configuration:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Helper functions
     */
    
    async recalculateRating(configurationId) {
        try {
            const votesQuery = this.firebase.db.collection('communityVotes')
                .where('configurationId', '==', configurationId);
            const snapshot = await votesQuery.get();
            
            let totalRating = 0;
            let count = 0;
            
            snapshot.forEach(doc => {
                totalRating += doc.data().rating;
                count++;
            });
            
            const averageRating = count > 0 ? totalRating / count : 0;
            
            await this.firebase.db.collection('sharedConfigurations').doc(configurationId).update({
                averageRating: averageRating,
                ratingCount: count
            });
            
        } catch (error) {
            console.error('Error recalculating rating:', error);
        }
    }
    
    async incrementViewCount(configurationId) {
        try {
            await this.firebase.db.collection('sharedConfigurations').doc(configurationId).update({
                viewCount: firebase.firestore.FieldValue.increment(1)
            });
        } catch (error) {
            // Silent fail for view count
        }
    }
    
    async updateUserStats(statName) {
        if (!this.currentUser) return;
        
        try {
            const userRef = this.firebase.db.collection('users').doc(this.currentUser.uid);
            await userRef.update({
                [`stats.${statName}`]: firebase.firestore.FieldValue.increment(1),
                'stats.lastActivity': firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (error) {
            console.warn('Failed to update user stats:', error);
        }
    }
    
    clearUserData() {
        this.userVotes.clear();
        this.userBookmarks.clear();
    }
    
    /**
     * Utility functions for UI
     */
    
    getUserRating(configurationId) {
        return this.userVotes.get(configurationId) || 0;
    }
    
    isBookmarked(configurationId) {
        return this.userBookmarks.has(configurationId);
    }
    
    canEdit(configuration) {
        return this.currentUser && configuration.authorId === this.currentUser.uid;
    }
    
    formatRating(rating) {
        return '★'.repeat(Math.floor(rating)) + '☆'.repeat(5 - Math.floor(rating));
    }
    
    formatCategory(category) {
        const categories = {
            'route': 'Specific Route',
            'event': 'Event/Rally',
            'condition': 'Weather/Terrain',
            'general': 'General Use'
        };
        return categories[category] || category;
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.communityManager = new CommunityManager();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CommunityManager;
}
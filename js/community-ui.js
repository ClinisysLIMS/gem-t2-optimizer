/**
 * Community UI Controller
 * Handles all UI interactions for the community features
 */
class CommunityUI {
    constructor() {
        this.community = null;
        this.currentTab = 'browse';
        this.currentFilters = {
            search: '',
            category: '',
            vehicleModel: '',
            sortBy: 'recent'
        };
        this.configurations = [];
        this.loadedCount = 0;
        this.batchSize = 12;
        
        this.init();
    }
    
    /**
     * Initialize community UI
     */
    async init() {
        // Wait for community manager to be available
        if (typeof window.communityManager !== 'undefined') {
            this.community = window.communityManager;
            console.log('Community UI initialized');
            
            this.setupEventListeners();
            this.loadInitialData();
            
            // Listen for auth state changes
            window.addEventListener('authStateChanged', (e) => {
                this.handleAuthStateChange(e.detail.user);
            });
            
            // Check initial auth state
            if (window.firebaseManager?.isAuthenticated()) {
                this.handleAuthStateChange(window.firebaseManager.getCurrentUser());
            }
            
            // Check for share URL parameter
            this.checkForShareIntent();
        } else {
            console.warn('Community manager not available');
        }
    }
    
    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        // Tab navigation
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });
        
        // Search and filters
        document.getElementById('search-input')?.addEventListener('input', (e) => {
            this.debouncedSearch(e.target.value);
        });
        
        document.getElementById('apply-filters')?.addEventListener('click', () => {
            this.applyFilters();
        });
        
        document.getElementById('clear-filters')?.addEventListener('click', () => {
            this.clearFilters();
        });
        
        // Share modal
        document.getElementById('share-config-btn')?.addEventListener('click', () => {
            this.showShareModal();
        });
        
        document.getElementById('guest-sign-in')?.addEventListener('click', () => {
            this.showSignInPrompt();
        });
        
        document.getElementById('close-share-modal')?.addEventListener('click', () => {
            this.hideShareModal();
        });
        
        document.getElementById('cancel-share')?.addEventListener('click', () => {
            this.hideShareModal();
        });
        
        // Share form
        document.getElementById('share-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleShareSubmit();
        });
        
        document.getElementById('share-category')?.addEventListener('change', (e) => {
            this.updateShareFormSections(e.target.value);
        });
        
        document.getElementById('load-current-vehicle')?.addEventListener('click', () => {
            this.loadCurrentVehicleData();
        });
        
        document.getElementById('load-current-settings')?.addEventListener('click', () => {
            this.loadCurrentSettings();
        });
        
        // My Activity buttons
        document.getElementById('my-configurations')?.addEventListener('click', () => {
            this.showMyConfigurations();
        });
        
        document.getElementById('my-bookmarks')?.addEventListener('click', () => {
            this.showMyBookmarks();
        });
        
        document.getElementById('my-downloads')?.addEventListener('click', () => {
            this.showMyDownloads();
        });
        
        // Load more
        document.getElementById('load-more-btn')?.addEventListener('click', () => {
            this.loadMoreConfigurations();
        });
        
        // Modal backdrop clicks
        document.getElementById('share-modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'share-modal') this.hideShareModal();
        });
        
        document.getElementById('detail-modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'detail-modal') this.hideDetailModal();
        });
    }
    
    /**
     * Handle authentication state changes
     */
    handleAuthStateChange(user) {
        if (user) {
            this.showAuthenticatedUI();
            this.loadUserStats();
        } else {
            this.showGuestUI();
        }
    }
    
    /**
     * Load initial data
     */
    async loadInitialData() {
        await Promise.all([
            this.loadConfigurations(),
            this.loadCommunityStats()
        ]);
    }
    
    /**
     * Load configurations based on current filters
     */
    async loadConfigurations(reset = true) {
        if (reset) {
            this.configurations = [];
            this.loadedCount = 0;
            this.showLoadingState();
        }
        
        try {
            const options = {
                ...this.currentFilters,
                limit: this.batchSize
            };
            
            // Adjust options based on current tab
            switch (this.currentTab) {
                case 'featured':
                    options.featured = true;
                    options.sortBy = 'rating';
                    break;
                case 'recent':
                    options.sortBy = 'recent';
                    break;
                case 'top-rated':
                    options.sortBy = 'rating';
                    break;
            }
            
            let newConfigs;
            if (this.currentFilters.search) {
                newConfigs = await this.community.searchConfigurations(this.currentFilters.search, options);
            } else {
                newConfigs = await this.community.getSharedConfigurations(options);
            }
            
            if (reset) {
                this.configurations = newConfigs;
            } else {
                this.configurations.push(...newConfigs);
            }
            
            this.loadedCount = this.configurations.length;
            this.renderConfigurations();
            
        } catch (error) {
            console.error('Error loading configurations:', error);
            this.showErrorState('Failed to load configurations');
        }
    }
    
    /**
     * Render configurations grid
     */
    renderConfigurations() {
        const container = document.getElementById('config-cards');
        const grid = document.getElementById('configurations-grid');
        const emptyState = document.getElementById('empty-state');
        const loadingState = document.getElementById('loading-state');
        
        loadingState.classList.add('hidden');
        
        if (this.configurations.length === 0) {
            grid.classList.add('hidden');
            emptyState.classList.remove('hidden');
            return;
        }
        
        emptyState.classList.add('hidden');
        grid.classList.remove('hidden');
        
        container.innerHTML = this.configurations.map(config => this.createConfigurationCard(config)).join('');
        
        // Setup card event listeners
        this.setupCardListeners();
        
        // Show/hide load more button
        const loadMoreBtn = document.getElementById('load-more-btn');
        if (this.configurations.length >= this.batchSize) {
            loadMoreBtn.classList.remove('hidden');
        } else {
            loadMoreBtn.classList.add('hidden');
        }
    }
    
    /**
     * Create configuration card HTML
     */
    createConfigurationCard(config) {
        const rating = this.formatRating(config.averageRating);
        const userRating = this.community.getUserRating(config.id);
        const isBookmarked = this.community.isBookmarked(config.id);
        const canEdit = this.community.canEdit(config);
        
        const categoryBadge = this.getCategoryBadge(config.category);
        const vehicleBadge = this.getVehicleBadge(config.vehicleData.model);
        
        return `
            <div class="config-card bg-white rounded-lg shadow-lg overflow-hidden" data-config-id="${config.id}">
                <!-- Card Header -->
                <div class="p-4 border-b border-gray-200">
                    <div class="flex items-start justify-between mb-2">
                        <h3 class="text-lg font-semibold text-gray-900 line-clamp-2 cursor-pointer hover:text-green-600" 
                            onclick="communityUI.showConfigurationDetail('${config.id}')">
                            ${config.title}
                        </h3>
                        ${canEdit ? `<span class="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Mine</span>` : ''}
                    </div>
                    
                    <div class="flex items-center space-x-2 mb-3">
                        ${categoryBadge}
                        ${vehicleBadge}
                        ${config.featured ? '<span class="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">⭐ Featured</span>' : ''}
                    </div>
                    
                    <p class="text-sm text-gray-600 line-clamp-3 mb-3">
                        ${config.description}
                    </p>
                    
                    <!-- Tags -->
                    ${config.tags && config.tags.length > 0 ? `
                        <div class="flex flex-wrap gap-1 mb-3">
                            ${config.tags.slice(0, 3).map(tag => `
                                <span class="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">#${tag}</span>
                            `).join('')}
                            ${config.tags.length > 3 ? `<span class="text-xs text-gray-500">+${config.tags.length - 3} more</span>` : ''}
                        </div>
                    ` : ''}
                    
                    <!-- Rating and Stats -->
                    <div class="flex items-center justify-between text-sm">
                        <div class="flex items-center space-x-2">
                            <div class="rating-stars">${rating}</div>
                            <span class="text-gray-600">(${config.ratingCount})</span>
                        </div>
                        <div class="flex items-center space-x-3 text-gray-600">
                            <span title="Views">👁 ${config.viewCount}</span>
                            <span title="Downloads">⬇ ${config.downloadCount}</span>
                            <span title="Comments">💬 ${config.commentCount}</span>
                        </div>
                    </div>
                </div>
                
                <!-- Card Footer -->
                <div class="p-4 bg-gray-50">
                    <div class="flex items-center justify-between mb-3">
                        <div class="text-sm text-gray-600">
                            by <span class="font-medium">${config.authorName}</span>
                        </div>
                        <div class="text-xs text-gray-500">
                            ${this.formatDate(config.createdAt)}
                        </div>
                    </div>
                    
                    <!-- Action Buttons -->
                    <div class="flex space-x-2">
                        <button onclick="communityUI.showConfigurationDetail('${config.id}')" 
                                class="flex-1 bg-green-600 text-white px-3 py-2 rounded text-sm hover:bg-green-700">
                            👁 View Details
                        </button>
                        
                        <button onclick="communityUI.downloadConfiguration('${config.id}')" 
                                class="bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700" 
                                title="Download & Apply">
                            ⬇
                        </button>
                        
                        <button onclick="communityUI.toggleBookmark('${config.id}')" 
                                class="px-3 py-2 rounded text-sm border ${isBookmarked ? 'bg-yellow-100 border-yellow-300 text-yellow-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}" 
                                title="${isBookmarked ? 'Remove bookmark' : 'Bookmark'}">
                            ${isBookmarked ? '🔖' : '📖'}
                        </button>
                        
                        <div class="relative">
                            <button onclick="communityUI.showRatingMenu('${config.id}')" 
                                    class="px-3 py-2 rounded text-sm border border-gray-300 text-gray-700 hover:bg-gray-50" 
                                    title="Rate this configuration">
                                ${userRating > 0 ? '★' : '☆'}
                            </button>
                        </div>
                    </div>
                    
                    <!-- User Rating Display -->
                    ${userRating > 0 ? `
                        <div class="mt-2 text-xs text-gray-600 text-center">
                            You rated: ${'★'.repeat(userRating)}${'☆'.repeat(5 - userRating)}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }
    
    /**
     * Show configuration detail modal
     */
    async showConfigurationDetail(configId) {
        const config = await this.community.getConfiguration(configId);
        if (!config) {
            this.showError('Configuration not found');
            return;
        }
        
        const comments = await this.community.getComments(configId);
        const userRating = this.community.getUserRating(configId);
        const isBookmarked = this.community.isBookmarked(configId);
        const canEdit = this.community.canEdit(config);
        
        const modalContent = document.getElementById('detail-content');
        modalContent.innerHTML = `
            <div class="flex items-center justify-between p-6 border-b">
                <div class="flex-1">
                    <h2 class="text-2xl font-bold text-gray-900">${config.title}</h2>
                    <div class="flex items-center space-x-3 mt-2">
                        ${this.getCategoryBadge(config.category)}
                        ${this.getVehicleBadge(config.vehicleData.model)}
                        ${config.featured ? '<span class="text-sm bg-yellow-100 text-yellow-800 px-3 py-1 rounded">⭐ Featured</span>' : ''}
                    </div>
                </div>
                <button onclick="communityUI.hideDetailModal()" class="text-gray-400 hover:text-gray-600">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>
            
            <div class="max-h-[70vh] overflow-y-auto">
                <div class="p-6 space-y-6">
                    <!-- Description -->
                    <div>
                        <h3 class="font-semibold mb-2">Description</h3>
                        <p class="text-gray-700">${config.description}</p>
                    </div>
                    
                    <!-- Tags -->
                    ${config.tags && config.tags.length > 0 ? `
                        <div>
                            <h3 class="font-semibold mb-2">Tags</h3>
                            <div class="flex flex-wrap gap-2">
                                ${config.tags.map(tag => `
                                    <span class="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">#${tag}</span>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                    
                    <!-- Route/Event Info -->
                    ${this.renderDetailSpecificInfo(config)}
                    
                    <!-- Vehicle Information -->
                    <div>
                        <h3 class="font-semibold mb-3">Vehicle Configuration</h3>
                        <div class="bg-gray-50 rounded-lg p-4">
                            <div class="grid md:grid-cols-2 gap-4 text-sm">
                                <div><span class="text-gray-600">Model:</span> <span class="font-medium">${config.vehicleData.model}</span></div>
                                <div><span class="text-gray-600">Year:</span> <span class="font-medium">${config.vehicleData.year}</span></div>
                                <div><span class="text-gray-600">Controller:</span> <span class="font-medium">${config.vehicleData.controller}</span></div>
                                <div><span class="text-gray-600">Motor:</span> <span class="font-medium">${config.vehicleData.motorType}</span></div>
                                <div><span class="text-gray-600">Battery:</span> <span class="font-medium">${config.vehicleData.batteryVoltage}V ${config.vehicleData.batteryType}</span></div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Controller Settings -->
                    <div>
                        <h3 class="font-semibold mb-3">Controller Settings</h3>
                        <div class="bg-gray-50 rounded-lg p-4">
                            ${this.renderControllerSettings(config.controllerSettings)}
                        </div>
                    </div>
                    
                    <!-- Stats and Ratings -->
                    <div class="grid md:grid-cols-2 gap-6">
                        <div>
                            <h3 class="font-semibold mb-3">Community Stats</h3>
                            <div class="space-y-2 text-sm">
                                <div class="flex justify-between">
                                    <span class="text-gray-600">Rating:</span>
                                    <span>${this.formatRating(config.averageRating)} (${config.ratingCount} votes)</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-gray-600">Downloads:</span>
                                    <span class="font-medium">${config.downloadCount}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-gray-600">Views:</span>
                                    <span class="font-medium">${config.viewCount}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-gray-600">Bookmarks:</span>
                                    <span class="font-medium">${config.bookmarkCount}</span>
                                </div>
                            </div>
                        </div>
                        
                        <div>
                            <h3 class="font-semibold mb-3">Author</h3>
                            <div class="text-sm">
                                <div class="font-medium">${config.authorName}</div>
                                <div class="text-gray-600 mt-1">Shared ${this.formatDate(config.createdAt)}</div>
                                ${config.verified ? '<div class="text-green-600 mt-1">✓ Verified contributor</div>' : ''}
                            </div>
                        </div>
                    </div>
                    
                    <!-- Rating Section -->
                    <div data-auth-required class="hidden">
                        <h3 class="font-semibold mb-3">Rate This Configuration</h3>
                        <div class="flex items-center space-x-4">
                            <div class="rating-input" data-config-id="${configId}">
                                ${[1,2,3,4,5].map(rating => `
                                    <button onclick="communityUI.rateConfiguration('${configId}', ${rating})" 
                                            class="rating-star text-2xl ${rating <= userRating ? 'text-yellow-400' : 'text-gray-300'} hover:text-yellow-400">
                                        ★
                                    </button>
                                `).join('')}
                            </div>
                            ${userRating > 0 ? `<span class="text-sm text-gray-600">You rated: ${userRating}/5</span>` : ''}
                        </div>
                    </div>
                    
                    <!-- Comments Section -->
                    <div>
                        <h3 class="font-semibold mb-3">Comments (${comments.length})</h3>
                        
                        <!-- Add Comment (Auth Required) -->
                        <div data-auth-required class="hidden mb-4">
                            <div class="flex space-x-3">
                                <textarea id="new-comment" placeholder="Share your experience with this configuration..." 
                                          class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500" 
                                          rows="2"></textarea>
                                <button onclick="communityUI.addComment('${configId}')" 
                                        class="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700">
                                    Post
                                </button>
                            </div>
                        </div>
                        
                        <!-- Comments List -->
                        <div class="space-y-4" id="comments-list">
                            ${comments.length > 0 ? comments.map(comment => this.renderComment(comment)).join('') : 
                              '<p class="text-gray-500 text-center py-4">No comments yet. Be the first to share your experience!</p>'}
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Modal Footer -->
            <div class="border-t bg-gray-50 px-6 py-4">
                <div class="flex space-x-3">
                    <button onclick="communityUI.downloadConfiguration('${configId}')" 
                            class="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700">
                        ⬇ Download & Apply
                    </button>
                    
                    <button onclick="communityUI.toggleBookmark('${configId}')" 
                            class="px-4 py-2 rounded-md border ${isBookmarked ? 'bg-yellow-100 border-yellow-300 text-yellow-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}">
                        ${isBookmarked ? '🔖 Bookmarked' : '📖 Bookmark'}
                    </button>
                    
                    ${canEdit ? `
                        <button onclick="communityUI.editConfiguration('${configId}')" 
                                class="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50">
                            ✏️ Edit
                        </button>
                    ` : ''}
                    
                    <button onclick="communityUI.flagConfiguration('${configId}')" 
                            class="ml-auto px-4 py-2 text-gray-500 hover:text-red-600 text-sm">
                        🚩 Report
                    </button>
                </div>
            </div>
        `;
        
        document.getElementById('detail-modal').classList.remove('hidden');
        
        // Update auth-dependent UI
        this.updateAuthRequiredElements();
    }
    
    /**
     * Download and apply configuration
     */
    async downloadConfiguration(configId) {
        try {
            const config = await this.community.downloadConfiguration(configId);
            if (!config) {
                this.showError('Failed to download configuration');
                return;
            }
            
            // Apply to current form if we're on the main page
            if (typeof window.unifiedFlow !== 'undefined') {
                this.applyConfigurationToForm(config);
                this.showSuccess(`Configuration "${config.title}" downloaded and applied!`);
                
                // Redirect to main page if not already there
                if (!window.location.pathname.includes('index')) {
                    setTimeout(() => {
                        window.location.href = 'index-new.html';
                    }, 2000);
                }
            } else {
                // Store for later application
                localStorage.setItem('pending-community-config', JSON.stringify(config));
                this.showSuccess(`Configuration "${config.title}" downloaded! Go to the optimizer to apply it.`);
            }
            
        } catch (error) {
            console.error('Error downloading configuration:', error);
            this.showError('Failed to download configuration');
        }
    }
    
    /**
     * Apply configuration to the main form
     */
    applyConfigurationToForm(config) {
        // Apply vehicle data
        const vehicleData = config.vehicleData;
        Object.entries(vehicleData).forEach(([key, value]) => {
            const fieldId = this.getFieldIdFromKey(key);
            const element = document.getElementById(fieldId);
            if (element && value) {
                element.value = value;
                element.dispatchEvent(new Event('change'));
            }
        });
        
        // Store controller settings for optimization
        if (config.controllerSettings) {
            sessionStorage.setItem('community-settings', JSON.stringify(config.controllerSettings));
        }
    }
    
    /**
     * Helper function to map config keys to form field IDs
     */
    getFieldIdFromKey(key) {
        const mappings = {
            'model': 'vehicle-model',
            'year': 'vehicle-year',
            'controller': 'controller-type',
            'motorType': 'motor-type',
            'batteryVoltage': 'battery-voltage',
            'batteryType': 'battery-type'
        };
        return mappings[key] || key;
    }
    
    /**
     * Rate a configuration
     */
    async rateConfiguration(configId, rating) {
        try {
            const result = await this.community.rateConfiguration(configId, rating);
            if (result.success) {
                this.showSuccess(`Rated ${rating}/5 stars`);
                
                // Update rating display
                const ratingInput = document.querySelector(`[data-config-id="${configId}"]`);
                if (ratingInput) {
                    ratingInput.querySelectorAll('.rating-star').forEach((star, index) => {
                        star.classList.toggle('text-yellow-400', index < rating);
                        star.classList.toggle('text-gray-300', index >= rating);
                    });
                }
                
                // Refresh configuration data
                this.refreshConfiguration(configId);
            } else {
                this.showError(result.error);
            }
        } catch (error) {
            console.error('Error rating configuration:', error);
            this.showError('Failed to submit rating');
        }
    }
    
    /**
     * Add a comment
     */
    async addComment(configId) {
        const commentText = document.getElementById('new-comment').value.trim();
        if (!commentText) {
            this.showError('Please enter a comment');
            return;
        }
        
        try {
            const result = await this.community.addComment(configId, commentText);
            if (result.success) {
                document.getElementById('new-comment').value = '';
                
                // Add comment to the list
                const commentsList = document.getElementById('comments-list');
                const newCommentHtml = this.renderComment(result.comment);
                
                if (commentsList.innerHTML.includes('No comments yet')) {
                    commentsList.innerHTML = newCommentHtml;
                } else {
                    commentsList.insertAdjacentHTML('afterbegin', newCommentHtml);
                }
                
                this.showSuccess('Comment added successfully');
            } else {
                this.showError(result.error);
            }
        } catch (error) {
            console.error('Error adding comment:', error);
            this.showError('Failed to add comment');
        }
    }
    
    /**
     * Toggle bookmark status
     */
    async toggleBookmark(configId) {
        try {
            const result = await this.community.toggleBookmark(configId);
            if (result.bookmarked !== undefined) {
                const message = result.bookmarked ? 'Added to bookmarks' : 'Removed from bookmarks';
                this.showSuccess(message);
                
                // Update bookmark buttons
                document.querySelectorAll(`[onclick*="toggleBookmark('${configId}')"]`).forEach(button => {
                    if (result.bookmarked) {
                        button.classList.add('bg-yellow-100', 'border-yellow-300', 'text-yellow-700');
                        button.classList.remove('border-gray-300', 'text-gray-700', 'hover:bg-gray-50');
                        button.innerHTML = '🔖';
                        button.title = 'Remove bookmark';
                    } else {
                        button.classList.remove('bg-yellow-100', 'border-yellow-300', 'text-yellow-700');
                        button.classList.add('border-gray-300', 'text-gray-700', 'hover:bg-gray-50');
                        button.innerHTML = '📖';
                        button.title = 'Bookmark';
                    }
                });
                
                // Update bookmark count in detail modal if open
                this.refreshConfiguration(configId);
            } else {
                this.showError(result.error);
            }
        } catch (error) {
            console.error('Error toggling bookmark:', error);
            this.showError('Please sign in to bookmark configurations');
        }
    }
    
    /**
     * Utility functions
     */
    
    getCategoryBadge(category) {
        const badges = {
            'route': '<span class="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">🗺 Route</span>',
            'event': '<span class="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">🎉 Event</span>',
            'condition': '<span class="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">🌤 Condition</span>',
            'general': '<span class="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">⚙️ General</span>'
        };
        return badges[category] || '';
    }
    
    getVehicleBadge(model) {
        return `<span class="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded">🚗 ${model?.toUpperCase()}</span>`;
    }
    
    formatRating(rating) {
        const stars = '★'.repeat(Math.floor(rating)) + '☆'.repeat(5 - Math.floor(rating));
        return `${stars} ${rating.toFixed(1)}`;
    }
    
    formatDate(timestamp) {
        if (!timestamp) return 'Unknown';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString();
    }
    
    renderComment(comment) {
        return `
            <div class="border border-gray-200 rounded-lg p-4">
                <div class="flex items-start justify-between mb-2">
                    <div class="font-medium text-sm">${comment.authorName}</div>
                    <div class="text-xs text-gray-500">${this.formatDate(comment.createdAt)}</div>
                </div>
                <p class="text-sm text-gray-700">${comment.text}</p>
                ${comment.likes > 0 ? `<div class="mt-2 text-xs text-gray-500">👍 ${comment.likes}</div>` : ''}
            </div>
        `;
    }
    
    renderControllerSettings(settings) {
        if (!settings || Object.keys(settings).length === 0) {
            return '<p class="text-gray-500">No specific settings shared</p>';
        }
        
        return `
            <div class="grid md:grid-cols-2 gap-4">
                ${Object.entries(settings).map(([func, value]) => `
                    <div class="flex justify-between">
                        <span class="text-gray-600">F${func}:</span>
                        <span class="font-medium">${value}</span>
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    renderDetailSpecificInfo(config) {
        let html = '';
        
        if (config.routeInfo) {
            html += `
                <div>
                    <h3 class="font-semibold mb-2">Route Information</h3>
                    <div class="bg-gray-50 rounded-lg p-4 text-sm">
                        ${config.routeInfo.start ? `<div><span class="text-gray-600">Start:</span> ${config.routeInfo.start}</div>` : ''}
                        ${config.routeInfo.distance ? `<div><span class="text-gray-600">Distance:</span> ${config.routeInfo.distance}</div>` : ''}
                    </div>
                </div>
            `;
        }
        
        if (config.eventInfo) {
            html += `
                <div>
                    <h3 class="font-semibold mb-2">Event Information</h3>
                    <div class="bg-gray-50 rounded-lg p-4 text-sm">
                        ${config.eventInfo.name ? `<div><span class="text-gray-600">Event:</span> ${config.eventInfo.name}</div>` : ''}
                        ${config.eventInfo.type ? `<div><span class="text-gray-600">Type:</span> ${config.eventInfo.type}</div>` : ''}
                    </div>
                </div>
            `;
        }
        
        if (config.conditions) {
            html += `
                <div>
                    <h3 class="font-semibold mb-2">Conditions</h3>
                    <div class="bg-gray-50 rounded-lg p-4 text-sm">
                        ${config.conditions.terrain ? `<div><span class="text-gray-600">Terrain:</span> ${config.conditions.terrain}</div>` : ''}
                        ${config.conditions.surface ? `<div><span class="text-gray-600">Surface:</span> ${config.conditions.surface}</div>` : ''}
                        ${config.conditions.weather ? `<div><span class="text-gray-600">Weather:</span> ${config.conditions.weather}</div>` : ''}
                    </div>
                </div>
            `;
        }
        
        return html;
    }
    
    showLoadingState() {
        document.getElementById('loading-state').classList.remove('hidden');
        document.getElementById('configurations-grid').classList.add('hidden');
        document.getElementById('empty-state').classList.add('hidden');
    }
    
    showAuthenticatedUI() {
        document.querySelectorAll('[data-auth-required]').forEach(el => el.classList.remove('hidden'));
        document.querySelectorAll('[data-guest-only]').forEach(el => el.classList.add('hidden'));
    }
    
    showGuestUI() {
        document.querySelectorAll('[data-auth-required]').forEach(el => el.classList.add('hidden'));
        document.querySelectorAll('[data-guest-only]').forEach(el => el.classList.remove('hidden'));
    }
    
    updateAuthRequiredElements() {
        if (window.firebaseManager?.isAuthenticated()) {
            this.showAuthenticatedUI();
        } else {
            this.showGuestUI();
        }
    }
    
    showSuccess(message) {
        this.showNotification(message, 'success');
    }
    
    showError(message) {
        this.showNotification(message, 'error');
    }
    
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 max-w-md ${
            type === 'success' ? 'bg-green-500' : 
            type === 'error' ? 'bg-red-500' : 'bg-blue-500'
        } text-white`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 4000);
    }
    
    // Additional UI methods for share modal, filters, etc. would go here...
    
    hideDetailModal() {
        document.getElementById('detail-modal').classList.add('hidden');
    }
    
    hideShareModal() {
        document.getElementById('share-modal').classList.add('hidden');
    }
    
    showShareModal() {
        if (!window.firebaseManager?.isAuthenticated()) {
            this.showSignInPrompt();
            return;
        }
        document.getElementById('share-modal').classList.remove('hidden');
    }
    
    showSignInPrompt() {
        // This would trigger the sign in modal from firebase-profile-manager
        if (window.firebaseProfileManager) {
            window.firebaseProfileManager.showAuthModal();
        }
    }
    
    debouncedSearch(searchTerm) {
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => {
            this.currentFilters.search = searchTerm;
            this.loadConfigurations();
        }, 500);
    }
    
    applyFilters() {
        this.currentFilters = {
            search: document.getElementById('search-input').value,
            category: document.getElementById('category-filter').value,
            vehicleModel: document.getElementById('model-filter').value,
            sortBy: document.getElementById('sort-filter').value
        };
        this.loadConfigurations();
    }
    
    clearFilters() {
        document.getElementById('search-input').value = '';
        document.getElementById('category-filter').value = '';
        document.getElementById('model-filter').value = '';
        document.getElementById('sort-filter').value = 'recent';
        this.currentFilters = { search: '', category: '', vehicleModel: '', sortBy: 'recent' };
        this.loadConfigurations();
    }
    
    switchTab(tab) {
        this.currentTab = tab;
        
        // Update tab UI
        document.querySelectorAll('.tab-button').forEach(button => {
            button.classList.remove('active', 'border-green-500', 'text-green-600');
            button.classList.add('border-transparent', 'text-gray-500');
        });
        
        const activeTab = document.querySelector(`[data-tab="${tab}"]`);
        activeTab.classList.add('active', 'border-green-500', 'text-green-600');
        activeTab.classList.remove('border-transparent', 'text-gray-500');
        
        // Load configurations for the new tab
        this.loadConfigurations();
    }
    
    async loadCommunityStats() {
        // Placeholder for community statistics
        document.getElementById('total-configs').textContent = '250+';
        document.getElementById('total-downloads').textContent = '1,200+';
        document.getElementById('active-contributors').textContent = '45';
        document.getElementById('featured-count').textContent = '8';
    }
    
    async loadUserStats() {
        // Placeholder for user-specific stats
        document.getElementById('my-configs-count').textContent = '3 shared';
        document.getElementById('my-bookmarks-count').textContent = '12 saved';
    }
    
    setupCardListeners() {
        // Additional card-specific event listeners would go here
    }
    
    async refreshConfiguration(configId) {
        // Refresh a specific configuration's data in the UI
        // This would update ratings, bookmark counts, etc.
    }
    
    async loadMoreConfigurations() {
        // Load additional configurations for pagination
        await this.loadConfigurations(false);
    }
    
    /**
     * Check for share intent from URL parameters
     */
    checkForShareIntent() {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('share') === 'true') {
            // Check if user is authenticated
            if (window.firebaseManager?.isAuthenticated()) {
                // Get pending share data
                const pendingShare = sessionStorage.getItem('pendingCommunityShare');
                if (pendingShare) {
                    this.preloadShareForm(JSON.parse(pendingShare));
                    this.showShareModal();
                    // Clear the pending data
                    sessionStorage.removeItem('pendingCommunityShare');
                }
            } else {
                // Show sign in prompt
                this.showSignInPrompt();
            }
            
            // Clean up URL
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }
    
    /**
     * Preload share form with optimization data
     */
    preloadShareForm(sharingData) {
        // Auto-suggest title based on optimization mode
        const mode = sharingData.optimizationMode || 'balanced';
        const model = sharingData.vehicleData.model || 'GEM';
        const suggestedTitle = `${model.toUpperCase()} ${mode.charAt(0).toUpperCase() + mode.slice(1)} Settings`;
        
        document.getElementById('share-title').value = suggestedTitle;
        
        // Auto-suggest category based on trip data
        if (sharingData.tripData.preset === 'weekend') {
            document.getElementById('share-category').value = 'route';
        } else if (sharingData.tripData.optimizationMode === 'performance') {
            document.getElementById('share-category').value = 'event';
        } else {
            document.getElementById('share-category').value = 'general';
        }
        
        // Auto-generate description
        const description = this.generateShareDescription(sharingData);
        document.getElementById('share-description').value = description;
        
        // Load vehicle and settings data
        this.shareData = sharingData;
        this.updateVehicleSummary(sharingData.vehicleData);
        this.updateSettingsSummary(sharingData.controllerSettings);
        
        // Trigger category change to show relevant sections
        this.updateShareFormSections(document.getElementById('share-category').value);
    }
    
    /**
     * Generate suggested description for sharing
     */
    generateShareDescription(sharingData) {
        const mode = sharingData.optimizationMode || 'balanced';
        const model = sharingData.vehicleData.model || 'GEM';
        
        let description = `Optimized ${model.toUpperCase()} controller settings for ${mode} performance. `;
        
        if (mode === 'efficiency') {
            description += 'These settings prioritize maximum range and energy efficiency for daily commuting and extended trips.';
        } else if (mode === 'performance') {
            description += 'These settings maximize acceleration and top speed for events, rallies, or when you need extra power.';
        } else {
            description += 'These balanced settings provide a good compromise between performance and efficiency for general use.';
        }
        
        return description;
    }
    
    /**
     * Update vehicle summary in share form
     */
    updateVehicleSummary(vehicleData) {
        const summary = document.getElementById('vehicle-summary');
        if (vehicleData && Object.keys(vehicleData).length > 0) {
            summary.innerHTML = `
                <div class="text-sm">
                    <div><strong>Model:</strong> ${vehicleData.model || 'Not specified'}</div>
                    <div><strong>Year:</strong> ${vehicleData.year || 'Not specified'}</div>
                    <div><strong>Controller:</strong> ${vehicleData.controller || 'Not specified'}</div>
                    <div><strong>Motor:</strong> ${vehicleData.motorType || 'Not specified'}</div>
                    <div><strong>Battery:</strong> ${vehicleData.batteryVoltage || '?'}V ${vehicleData.batteryType || 'Unknown'}</div>
                </div>
            `;
        } else {
            summary.textContent = 'No vehicle data loaded';
        }
    }
    
    /**
     * Update settings summary in share form
     */
    updateSettingsSummary(controllerSettings) {
        const summary = document.getElementById('settings-summary');
        if (controllerSettings && Object.keys(controllerSettings).length > 0) {
            const settingCount = Object.keys(controllerSettings).length;
            summary.innerHTML = `
                <div class="text-sm">
                    <div><strong>Settings count:</strong> ${settingCount} functions optimized</div>
                    <div class="mt-1 text-xs text-gray-600">
                        Functions: ${Object.keys(controllerSettings).map(f => `F${f}`).join(', ')}
                    </div>
                </div>
            `;
        } else {
            summary.textContent = 'No settings loaded';
        }
    }
    
    /**
     * Handle share form submission
     */
    async handleShareSubmit() {
        const title = document.getElementById('share-title').value.trim();
        const category = document.getElementById('share-category').value;
        const description = document.getElementById('share-description').value.trim();
        const tags = document.getElementById('share-tags').value.split(',').map(t => t.trim()).filter(t => t);
        
        if (!title || !category || !description) {
            this.showError('Please fill in all required fields');
            return;
        }
        
        if (!this.shareData) {
            this.showError('No configuration data to share');
            return;
        }
        
        const configData = {
            title,
            description,
            category,
            tags,
            vehicleData: this.shareData.vehicleData,
            controllerSettings: this.shareData.controllerSettings,
            optimizationMode: this.shareData.optimizationMode,
            routeInfo: this.gatherRouteInfo(),
            eventInfo: this.gatherEventInfo(),
            conditions: this.gatherConditionInfo()
        };
        
        try {
            const result = await this.community.shareConfiguration(configData);
            if (result.success) {
                this.showSuccess(`Configuration "${title}" shared successfully!`);
                this.hideShareModal();
                this.clearShareForm();
                // Refresh the configurations list
                this.loadConfigurations();
            } else {
                this.showError(result.error);
            }
        } catch (error) {
            console.error('Error sharing configuration:', error);
            this.showError('Failed to share configuration');
        }
    }
    
    /**
     * Gather route information from form
     */
    gatherRouteInfo() {
        if (document.getElementById('share-category').value !== 'route') return null;
        
        return {
            start: document.getElementById('route-start')?.value || '',
            distance: document.getElementById('route-distance')?.value || ''
        };
    }
    
    /**
     * Gather event information from form
     */
    gatherEventInfo() {
        if (document.getElementById('share-category').value !== 'event') return null;
        
        return {
            name: document.getElementById('event-name')?.value || '',
            type: document.getElementById('event-type')?.value || ''
        };
    }
    
    /**
     * Gather condition information from form
     */
    gatherConditionInfo() {
        if (document.getElementById('share-category').value !== 'condition') return null;
        
        return {
            terrain: document.getElementById('condition-terrain')?.value || '',
            surface: document.getElementById('condition-surface')?.value || '',
            weather: document.getElementById('condition-weather')?.value || ''
        };
    }
    
    /**
     * Update share form sections based on category
     */
    updateShareFormSections(category) {
        // Hide all specific sections
        document.getElementById('route-info').classList.add('hidden');
        document.getElementById('event-info').classList.add('hidden');
        document.getElementById('condition-info').classList.add('hidden');
        
        // Show relevant section
        if (category === 'route') {
            document.getElementById('route-info').classList.remove('hidden');
        } else if (category === 'event') {
            document.getElementById('event-info').classList.remove('hidden');
        } else if (category === 'condition') {
            document.getElementById('condition-info').classList.remove('hidden');
        }
    }
    
    /**
     * Load current vehicle data into share form
     */
    loadCurrentVehicleData() {
        // Try to get data from the main application
        if (typeof window.unifiedFlow !== 'undefined') {
            const vehicleData = window.unifiedFlow.vehicleData;
            this.shareData = this.shareData || {};
            this.shareData.vehicleData = vehicleData;
            this.updateVehicleSummary(vehicleData);
        } else {
            this.showError('No vehicle data available. Please complete the optimizer first.');
        }
    }
    
    /**
     * Load current settings into share form
     */
    loadCurrentSettings() {
        // Try to get settings from the main application
        if (typeof window.unifiedFlow !== 'undefined' && window.unifiedFlow.lastOptimizedSettings) {
            const settings = window.unifiedFlow.lastOptimizedSettings;
            this.shareData = this.shareData || {};
            this.shareData.controllerSettings = settings;
            this.updateSettingsSummary(settings);
        } else {
            this.showError('No optimization results available. Please run the optimizer first.');
        }
    }
    
    /**
     * Clear share form
     */
    clearShareForm() {
        document.getElementById('share-form').reset();
        this.shareData = null;
        this.updateVehicleSummary(null);
        this.updateSettingsSummary(null);
        this.updateShareFormSections('');
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.communityUI = new CommunityUI();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CommunityUI;
}
/**
 * Anonymous Usage Analytics System
 * 
 * Collects anonymous usage data to improve the GEM T2 Optimizer
 * - No personal information collected
 * - All data stored locally
 * - Optional user participation
 * - Transparent data collection
 */

class AnonymousAnalytics {
    constructor() {
        this.storageKey = 'gem_anonymous_analytics';
        this.sessionKey = 'gem_session_analytics';
        this.consentKey = 'gem_analytics_consent';
        this.isEnabled = false;
        this.sessionId = this.generateSessionId();
        this.sessionStartTime = Date.now();
        
        this.init();
    }

    /**
     * Initialize analytics system
     */
    init() {
        this.checkUserConsent();
        this.setupEventListeners();
        this.startSession();
        
        // Auto-save analytics data periodically
        setInterval(() => {
            this.saveAnalyticsData();
        }, 30000); // Save every 30 seconds
        
        // Track page load
        this.trackEvent('app_loaded', {
            timestamp: new Date().toISOString(),
            userAgent: this.getBrowserInfo(),
            screenResolution: `${screen.width}x${screen.height}`,
            language: navigator.language
        });
    }

    /**
     * Check if user has consented to analytics
     */
    checkUserConsent() {
        const consent = localStorage.getItem(this.consentKey);
        
        if (consent === null) {
            // First time user - show consent banner
            this.showConsentBanner();
        } else if (consent === 'true') {
            this.isEnabled = true;
            console.log('Anonymous analytics enabled');
        } else {
            this.isEnabled = false;
            console.log('Anonymous analytics disabled by user');
        }
    }

    /**
     * Show consent banner for analytics
     */
    showConsentBanner() {
        const banner = document.createElement('div');
        banner.id = 'analytics-consent-banner';
        banner.className = 'fixed bottom-4 left-4 right-4 bg-blue-50 border border-blue-200 rounded-lg p-4 shadow-lg z-50 max-w-md mx-auto';
        banner.innerHTML = `
            <div class="flex items-start">
                <div class="flex-shrink-0">
                    <svg class="h-5 w-5 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
                    </svg>
                </div>
                <div class="ml-3 flex-1">
                    <h3 class="text-sm font-medium text-blue-900">Help Improve GEM Optimizer</h3>
                    <p class="text-xs text-blue-700 mt-1">
                        We'd like to collect anonymous usage data to improve the optimizer. 
                        No personal information is collected - only feature usage and vehicle configurations.
                    </p>
                    <div class="mt-3 flex space-x-2">
                        <button id="analytics-accept" class="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700 transition-colors">
                            Accept
                        </button>
                        <button id="analytics-decline" class="bg-gray-500 text-white px-3 py-1 rounded text-xs hover:bg-gray-600 transition-colors">
                            Decline
                        </button>
                        <button id="analytics-details" class="text-blue-600 px-3 py-1 rounded text-xs hover:text-blue-500 underline">
                            Details
                        </button>
                    </div>
                </div>
                <button id="analytics-close" class="ml-2 text-gray-400 hover:text-gray-600">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>
        `;

        document.body.appendChild(banner);

        // Event listeners for consent buttons
        document.getElementById('analytics-accept').addEventListener('click', () => {
            this.setConsent(true);
            banner.remove();
        });

        document.getElementById('analytics-decline').addEventListener('click', () => {
            this.setConsent(false);
            banner.remove();
        });

        document.getElementById('analytics-close').addEventListener('click', () => {
            this.setConsent(false);
            banner.remove();
        });

        document.getElementById('analytics-details').addEventListener('click', () => {
            this.showAnalyticsDetails();
        });
    }

    /**
     * Show detailed analytics information
     */
    showAnalyticsDetails() {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
        modal.innerHTML = `
            <div class="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
                <div class="p-6">
                    <div class="flex items-center justify-between mb-4">
                        <h2 class="text-lg font-semibold text-gray-900">Anonymous Analytics Details</h2>
                        <button id="close-analytics-modal" class="text-gray-400 hover:text-gray-600">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>
                    
                    <div class="space-y-4">
                        <div class="bg-green-50 border border-green-200 rounded-lg p-4">
                            <h3 class="font-medium text-green-800 mb-2">🔒 What We DON'T Collect</h3>
                            <ul class="text-sm text-green-700 space-y-1">
                                <li>• Personal information (name, email, IP address)</li>
                                <li>• Specific controller settings or parameter values</li>
                                <li>• Location data or GPS coordinates</li>
                                <li>• Vehicle identification numbers or personal identifiers</li>
                                <li>• Any data that could identify you personally</li>
                            </ul>
                        </div>
                        
                        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <h3 class="font-medium text-blue-800 mb-2">📊 What We DO Collect</h3>
                            <ul class="text-sm text-blue-700 space-y-1">
                                <li>• Most used optimization presets (e.g., "Performance", "Efficiency")</li>
                                <li>• Common vehicle configurations (model types, year ranges)</li>
                                <li>• Feature usage frequency (PDF import vs manual entry)</li>
                                <li>• Error rates and success rates for different operations</li>
                                <li>• General browser information (for compatibility)</li>
                            </ul>
                        </div>
                        
                        <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <h3 class="font-medium text-yellow-800 mb-2">🎯 How We Use This Data</h3>
                            <ul class="text-sm text-yellow-700 space-y-1">
                                <li>• Improve the most commonly used features</li>
                                <li>• Add support for popular vehicle configurations</li>
                                <li>• Fix bugs and compatibility issues</li>
                                <li>• Prioritize new feature development</li>
                                <li>• Optimize performance for common usage patterns</li>
                            </ul>
                        </div>
                        
                        <div class="bg-gray-50 border border-gray-200 rounded-lg p-4">
                            <h3 class="font-medium text-gray-800 mb-2">⚙️ Your Control</h3>
                            <ul class="text-sm text-gray-700 space-y-1">
                                <li>• Analytics are completely optional</li>
                                <li>• You can disable them at any time in Settings</li>
                                <li>• All data is stored locally on your device</li>
                                <li>• You can view and delete collected data anytime</li>
                                <li>• No data is sent to external servers</li>
                            </ul>
                        </div>
                    </div>
                    
                    <div class="mt-6 flex justify-end space-x-3">
                        <button id="analytics-modal-decline" class="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors">
                            Decline
                        </button>
                        <button id="analytics-modal-accept" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors">
                            Accept Analytics
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Event listeners
        document.getElementById('close-analytics-modal').addEventListener('click', () => {
            modal.remove();
        });

        document.getElementById('analytics-modal-decline').addEventListener('click', () => {
            this.setConsent(false);
            modal.remove();
            document.getElementById('analytics-consent-banner')?.remove();
        });

        document.getElementById('analytics-modal-accept').addEventListener('click', () => {
            this.setConsent(true);
            modal.remove();
            document.getElementById('analytics-consent-banner')?.remove();
        });
    }

    /**
     * Set user consent for analytics
     */
    setConsent(consent) {
        localStorage.setItem(this.consentKey, consent.toString());
        this.isEnabled = consent;
        
        if (consent) {
            console.log('User accepted anonymous analytics');
            this.showNotification('Analytics enabled - thank you for helping improve GEM Optimizer!', 'success');
        } else {
            console.log('User declined anonymous analytics');
            this.showNotification('Analytics disabled - your privacy is respected.', 'info');
        }
    }

    /**
     * Generate unique session ID
     */
    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Start new analytics session
     */
    startSession() {
        if (!this.isEnabled) return;

        const sessionData = {
            sessionId: this.sessionId,
            startTime: this.sessionStartTime,
            events: [],
            features: {},
            errors: []
        };

        sessionStorage.setItem(this.sessionKey, JSON.stringify(sessionData));
    }

    /**
     * Track analytics event
     */
    trackEvent(eventType, eventData = {}) {
        if (!this.isEnabled) return;

        const event = {
            type: eventType,
            timestamp: Date.now(),
            sessionId: this.sessionId,
            data: this.sanitizeData(eventData)
        };

        // Add to session storage
        const sessionData = this.getSessionData();
        sessionData.events.push(event);
        sessionStorage.setItem(this.sessionKey, JSON.stringify(sessionData));

        // Log for debugging
        console.log('Analytics Event:', eventType, event.data);
    }

    /**
     * Track preset usage
     */
    trackPresetUsage(presetName, presetType = 'unknown') {
        this.trackEvent('preset_used', {
            presetName: presetName,
            presetType: presetType
        });
        
        this.incrementCounter('presets', presetName);
        this.incrementCounter('preset_types', presetType);
    }

    /**
     * Track vehicle configuration
     */
    trackVehicleConfig(vehicleData) {
        const sanitizedConfig = {
            model: vehicleData.model || 'unknown',
            year: vehicleData.year || 'unknown',
            controller: vehicleData.controller || 'unknown',
            motorType: vehicleData.motorType || 'unknown',
            batteryVoltage: vehicleData.batteryVoltage || 'unknown',
            batteryType: vehicleData.batteryType || 'unknown'
        };

        this.trackEvent('vehicle_configured', sanitizedConfig);
        
        // Track individual configuration options
        Object.entries(sanitizedConfig).forEach(([key, value]) => {
            if (value !== 'unknown') {
                this.incrementCounter(`vehicle_${key}`, value);
            }
        });
    }

    /**
     * Track feature usage
     */
    trackFeatureUsage(featureName, additionalData = {}) {
        this.trackEvent('feature_used', {
            feature: featureName,
            ...this.sanitizeData(additionalData)
        });
        
        this.incrementCounter('features', featureName);
    }

    /**
     * Track optimization results
     */
    trackOptimization(optimizationType, success, metrics = {}) {
        this.trackEvent('optimization_completed', {
            type: optimizationType,
            success: success,
            metrics: this.sanitizeData(metrics)
        });
        
        this.incrementCounter('optimizations', optimizationType);
        this.incrementCounter('optimization_results', success ? 'success' : 'failure');
    }

    /**
     * Track errors (anonymized)
     */
    trackError(errorType, errorMessage = '') {
        // Sanitize error message to remove any potential personal data
        const sanitizedMessage = errorMessage
            .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]')
            .replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '[IP]')
            .replace(/[A-Z0-9]{17}/g, '[VIN]')
            .substring(0, 200); // Limit length

        this.trackEvent('error_occurred', {
            errorType: errorType,
            message: sanitizedMessage,
            browser: this.getBrowserInfo()
        });
        
        this.incrementCounter('errors', errorType);
    }

    /**
     * Increment counter for specific metric
     */
    incrementCounter(category, item) {
        if (!this.isEnabled) return;

        const analytics = this.getAnalyticsData();
        
        if (!analytics.counters[category]) {
            analytics.counters[category] = {};
        }
        
        if (!analytics.counters[category][item]) {
            analytics.counters[category][item] = 0;
        }
        
        analytics.counters[category][item]++;
        analytics.lastUpdated = Date.now();
        
        this.saveAnalyticsData(analytics);
    }

    /**
     * Get current analytics data
     */
    getAnalyticsData() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            return stored ? JSON.parse(stored) : this.createEmptyAnalytics();
        } catch (error) {
            console.warn('Error loading analytics data:', error);
            return this.createEmptyAnalytics();
        }
    }

    /**
     * Get current session data
     */
    getSessionData() {
        try {
            const stored = sessionStorage.getItem(this.sessionKey);
            return stored ? JSON.parse(stored) : {
                sessionId: this.sessionId,
                startTime: this.sessionStartTime,
                events: [],
                features: {},
                errors: []
            };
        } catch (error) {
            console.warn('Error loading session data:', error);
            return {
                sessionId: this.sessionId,
                startTime: this.sessionStartTime,
                events: [],
                features: {},
                errors: []
            };
        }
    }

    /**
     * Create empty analytics structure
     */
    createEmptyAnalytics() {
        return {
            version: '1.0',
            createdAt: Date.now(),
            lastUpdated: Date.now(),
            totalSessions: 0,
            counters: {
                presets: {},
                preset_types: {},
                vehicle_model: {},
                vehicle_year: {},
                vehicle_controller: {},
                vehicle_motorType: {},
                vehicle_batteryVoltage: {},
                vehicle_batteryType: {},
                features: {},
                optimizations: {},
                optimization_results: {},
                errors: {}
            },
            metrics: {
                totalOptimizations: 0,
                successfulOptimizations: 0,
                totalFeatureUsage: 0,
                totalErrors: 0
            }
        };
    }

    /**
     * Save analytics data to localStorage
     */
    saveAnalyticsData(data = null) {
        if (!this.isEnabled) return;

        try {
            const analytics = data || this.getAnalyticsData();
            analytics.lastUpdated = Date.now();
            localStorage.setItem(this.storageKey, JSON.stringify(analytics));
        } catch (error) {
            console.warn('Error saving analytics data:', error);
        }
    }

    /**
     * Sanitize data to remove any potential personal information
     */
    sanitizeData(data) {
        if (typeof data !== 'object' || data === null) {
            return data;
        }

        const sanitized = {};
        
        for (const [key, value] of Object.entries(data)) {
            if (typeof value === 'string') {
                // Remove potential personal data patterns
                let sanitizedValue = value
                    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]')
                    .replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '[IP]')
                    .replace(/[A-Z0-9]{17}/g, '[VIN]')
                    .replace(/\b\d{4}-\d{4}-\d{4}-\d{4}\b/g, '[CARD]');
                
                // Limit string length
                if (sanitizedValue.length > 100) {
                    sanitizedValue = sanitizedValue.substring(0, 100) + '...';
                }
                
                sanitized[key] = sanitizedValue;
            } else if (typeof value === 'object') {
                sanitized[key] = this.sanitizeData(value);
            } else {
                sanitized[key] = value;
            }
        }
        
        return sanitized;
    }

    /**
     * Get browser information (anonymized)
     */
    getBrowserInfo() {
        const ua = navigator.userAgent;
        let browser = 'Unknown';
        
        if (ua.includes('Chrome')) browser = 'Chrome';
        else if (ua.includes('Firefox')) browser = 'Firefox';
        else if (ua.includes('Safari')) browser = 'Safari';
        else if (ua.includes('Edge')) browser = 'Edge';
        
        return browser;
    }

    /**
     * Setup event listeners for automatic tracking
     */
    setupEventListeners() {
        // Track when user leaves the page
        window.addEventListener('beforeunload', () => {
            this.trackEvent('session_ended', {
                duration: Date.now() - this.sessionStartTime
            });
            this.saveAnalyticsData();
        });

        // Track visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.trackEvent('page_hidden');
            } else {
                this.trackEvent('page_visible');
            }
        });
    }

    /**
     * Get analytics summary for display
     */
    getAnalyticsSummary() {
        const analytics = this.getAnalyticsData();
        
        return {
            isEnabled: this.isEnabled,
            totalSessions: analytics.totalSessions || 0,
            topPresets: this.getTopItems(analytics.counters.presets, 5),
            topVehicleModels: this.getTopItems(analytics.counters.vehicle_model, 5),
            topFeatures: this.getTopItems(analytics.counters.features, 5),
            optimizationSuccessRate: this.calculateSuccessRate(analytics.counters.optimization_results),
            lastUpdated: analytics.lastUpdated,
            dataSize: JSON.stringify(analytics).length
        };
    }

    /**
     * Get top items from counter object
     */
    getTopItems(counterObj, limit = 5) {
        if (!counterObj) return [];
        
        return Object.entries(counterObj)
            .sort(([,a], [,b]) => b - a)
            .slice(0, limit)
            .map(([item, count]) => ({ item, count }));
    }

    /**
     * Calculate success rate from results
     */
    calculateSuccessRate(results) {
        if (!results) return 0;
        
        const success = results.success || 0;
        const failure = results.failure || 0;
        const total = success + failure;
        
        return total > 0 ? Math.round((success / total) * 100) : 0;
    }

    /**
     * Export analytics data for user review
     */
    exportAnalyticsData() {
        const analytics = this.getAnalyticsData();
        const exportData = {
            ...analytics,
            exportDate: new Date().toISOString(),
            summary: this.getAnalyticsSummary()
        };

        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `gem-analytics-export-${new Date().toISOString().split('T')[0]}.json`;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(link.href);
        
        this.showNotification('Analytics data exported successfully!', 'success');
    }

    /**
     * Clear all analytics data
     */
    clearAnalyticsData() {
        if (confirm('Are you sure you want to clear all analytics data? This cannot be undone.')) {
            localStorage.removeItem(this.storageKey);
            sessionStorage.removeItem(this.sessionKey);
            this.showNotification('Analytics data cleared successfully.', 'success');
        }
    }

    /**
     * Show notification message
     */
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 z-50 px-4 py-3 rounded-md text-sm max-w-sm shadow-lg ${
            type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' :
            type === 'error' ? 'bg-red-100 text-red-800 border border-red-200' :
            type === 'warning' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
            'bg-blue-100 text-blue-800 border border-blue-200'
        }`;
        
        const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️';
        notification.innerHTML = `<div class="flex items-start"><span class="mr-2">${icon}</span><span>${message}</span></div>`;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 4000);
    }

    /**
     * Toggle analytics on/off
     */
    toggleAnalytics() {
        this.setConsent(!this.isEnabled);
    }
}

// Initialize analytics when DOM is ready
let anonymousAnalytics;
document.addEventListener('DOMContentLoaded', () => {
    anonymousAnalytics = new AnonymousAnalytics();
    
    // Make it globally available
    window.anonymousAnalytics = anonymousAnalytics;
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AnonymousAnalytics;
}
/**
 * Analytics Integration
 * 
 * This module integrates anonymous analytics tracking into the existing GEM T2 Optimizer
 * by adding tracking calls to key user interactions and events.
 */

class AnalyticsIntegration {
    constructor() {
        this.isInitialized = false;
        this.init();
    }

    init() {
        // Wait for analytics system to be available
        this.waitForAnalytics().then(() => {
            this.isInitialized = true;
            this.setupIntegrations();
            console.log('Analytics integration initialized');
        });
    }

    async waitForAnalytics() {
        return new Promise((resolve) => {
            const checkAnalytics = () => {
                if (window.anonymousAnalytics) {
                    resolve();
                } else {
                    setTimeout(checkAnalytics, 100);
                }
            };
            checkAnalytics();
        });
    }

    setupIntegrations() {
        this.trackPageLoad();
        this.integratePDFImport();
        this.integrateOptimization();
        this.integrateProfiles();
        this.integratePresets();
        this.integrateVehicleConfig();
        this.integrateFeatureUsage();
        this.integrateErrorTracking();
    }

    trackPageLoad() {
        if (!window.anonymousAnalytics) return;
        
        window.anonymousAnalytics.trackFeatureUsage('app_loaded', {
            url: window.location.pathname,
            referrer: document.referrer || 'direct',
            timestamp: new Date().toISOString()
        });
    }

    integratePDFImport() {
        // Hook into PDF import functionality
        const originalHandlePDFUpload = window.handlePDFUpload;
        if (originalHandlePDFUpload) {
            window.handlePDFUpload = (event) => {
                this.trackFeature('pdf_import_attempted');
                
                try {
                    const result = originalHandlePDFUpload(event);
                    this.trackFeature('pdf_import_success');
                    return result;
                } catch (error) {
                    this.trackError('pdf_import_failed', error.message);
                    throw error;
                }
            };
        }

        // Track PDF file selection
        const pdfInput = document.getElementById('pdf-upload');
        if (pdfInput) {
            pdfInput.addEventListener('change', (event) => {
                if (event.target.files && event.target.files.length > 0) {
                    const file = event.target.files[0];
                    this.trackFeature('pdf_file_selected', {
                        fileSize: Math.round(file.size / 1024), // KB
                        fileType: file.type
                    });
                }
            });
        }
    }

    integrateOptimization() {
        // Hook into optimization process
        const originalRunOptimization = window.runOptimization;
        if (originalRunOptimization) {
            window.runOptimization = (...args) => {
                this.trackFeature('optimization_started');
                
                try {
                    const result = originalRunOptimization(...args);
                    this.trackOptimization('standard', true);
                    return result;
                } catch (error) {
                    this.trackOptimization('standard', false);
                    this.trackError('optimization_failed', error.message);
                    throw error;
                }
            };
        }

        // Track AI optimization button clicks
        const aiOptimizeBtn = document.getElementById('ai-optimize-btn');
        if (aiOptimizeBtn) {
            aiOptimizeBtn.addEventListener('click', () => {
                this.trackFeature('ai_optimization_clicked');
            });
        }

        // Track manual optimization
        const optimizeBtn = document.getElementById('optimize-btn');
        if (optimizeBtn) {
            optimizeBtn.addEventListener('click', () => {
                this.trackFeature('manual_optimization_clicked');
            });
        }
    }

    integrateProfiles() {
        // Track profile save operations
        const saveProfileBtn = document.getElementById('save-profile-btn');
        if (saveProfileBtn) {
            saveProfileBtn.addEventListener('click', () => {
                this.trackFeature('profile_save_clicked');
            });
        }

        // Track profile load operations
        const loadProfileBtn = document.getElementById('load-profile-btn');
        if (loadProfileBtn) {
            loadProfileBtn.addEventListener('click', () => {
                this.trackFeature('profile_load_clicked');
            });
        }

        // Hook into profile manager functions if available
        if (window.localProfileManager) {
            const originalSaveProfile = window.localProfileManager.saveCurrentProfile;
            if (originalSaveProfile) {
                window.localProfileManager.saveCurrentProfile = (...args) => {
                    this.trackFeature('profile_saved');
                    return originalSaveProfile.apply(window.localProfileManager, args);
                };
            }

            const originalLoadProfile = window.localProfileManager.loadProfile;
            if (originalLoadProfile) {
                window.localProfileManager.loadProfile = (...args) => {
                    this.trackFeature('profile_loaded');
                    return originalLoadProfile.apply(window.localProfileManager, args);
                };
            }
        }
    }

    integratePresets() {
        // Track preset usage
        const presetButtons = document.querySelectorAll('[data-preset]');
        presetButtons.forEach(button => {
            button.addEventListener('click', () => {
                const presetName = button.dataset.preset || button.textContent.trim();
                this.trackPreset(presetName, 'quick_preset');
            });
        });

        // Track quick action selections
        const quickActionBtns = document.querySelectorAll('.quick-action-btn');
        quickActionBtns.forEach(button => {
            button.addEventListener('click', () => {
                const action = button.dataset.action || button.textContent.trim();
                this.trackPreset(action, 'quick_action');
            });
        });
    }

    integrateVehicleConfig() {
        // Track vehicle configuration changes
        const vehicleFields = [
            'vehicle-model', 'vehicle-year', 'controller-type',
            'motor-type', 'battery-voltage', 'battery-type'
        ];

        vehicleFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.addEventListener('change', () => {
                    if (field.value) {
                        this.trackVehicleConfig({
                            [fieldId.replace('vehicle-', '').replace('-', '_')]: field.value
                        });
                    }
                });
            }
        });

        // Track form completion
        const continueBtn = document.getElementById('continue-btn');
        if (continueBtn) {
            continueBtn.addEventListener('click', () => {
                const vehicleData = this.collectVehicleData();
                if (Object.values(vehicleData).some(v => v)) {
                    this.trackVehicleConfig(vehicleData);
                    this.trackFeature('vehicle_config_completed');
                }
            });
        }
    }

    integrateFeatureUsage() {
        // Track weekend planner usage
        const weekendPlannerBtn = document.querySelector('[href="weekend-planner.html"]');
        if (weekendPlannerBtn) {
            weekendPlannerBtn.addEventListener('click', () => {
                this.trackFeature('weekend_planner_accessed');
            });
        }

        // Track community access
        const communityBtn = document.querySelector('[href="community.html"]');
        if (communityBtn) {
            communityBtn.addEventListener('click', () => {
                this.trackFeature('community_accessed');
            });
        }

        // Track help access
        const helpBtn = document.querySelector('[href="help.html"]');
        if (helpBtn) {
            helpBtn.addEventListener('click', () => {
                this.trackFeature('help_accessed');
            });
        }

        // Track analytics dashboard access
        const analyticsBtn = document.querySelector('[href="analytics-dashboard.html"]');
        if (analyticsBtn) {
            analyticsBtn.addEventListener('click', () => {
                this.trackFeature('analytics_dashboard_accessed');
            });
        }

        // Track settings access
        const settingsBtn = document.getElementById('settings-btn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                this.trackFeature('settings_accessed');
            });
        }

        // Track PDF download
        const downloadBtns = document.querySelectorAll('[id*="download"], [class*="download"]');
        downloadBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.trackFeature('pdf_downloaded');
            });
        });
    }

    integrateErrorTracking() {
        // Global error handler
        window.addEventListener('error', (event) => {
            this.trackError('javascript_error', `${event.message} at ${event.filename}:${event.lineno}`);
        });

        // Unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.trackError('promise_rejection', event.reason?.toString() || 'Unknown promise rejection');
        });

        // Hook into console.error for debugging
        const originalConsoleError = console.error;
        console.error = (...args) => {
            const message = args.map(arg => 
                typeof arg === 'string' ? arg : JSON.stringify(arg, null, 2)
            ).join(' ');
            
            this.trackError('console_error', message);
            originalConsoleError.apply(console, args);
        };
    }

    // Helper methods to abstract analytics calls
    trackFeature(featureName, additionalData = {}) {
        if (window.anonymousAnalytics && window.anonymousAnalytics.isEnabled) {
            window.anonymousAnalytics.trackFeatureUsage(featureName, additionalData);
        }
    }

    trackPreset(presetName, presetType = 'unknown') {
        if (window.anonymousAnalytics && window.anonymousAnalytics.isEnabled) {
            window.anonymousAnalytics.trackPresetUsage(presetName, presetType);
        }
    }

    trackVehicleConfig(vehicleData) {
        if (window.anonymousAnalytics && window.anonymousAnalytics.isEnabled) {
            window.anonymousAnalytics.trackVehicleConfig(vehicleData);
        }
    }

    trackOptimization(type, success, metrics = {}) {
        if (window.anonymousAnalytics && window.anonymousAnalytics.isEnabled) {
            window.anonymousAnalytics.trackOptimization(type, success, metrics);
        }
    }

    trackError(errorType, errorMessage = '') {
        if (window.anonymousAnalytics && window.anonymousAnalytics.isEnabled) {
            window.anonymousAnalytics.trackError(errorType, errorMessage);
        }
    }

    collectVehicleData() {
        const fields = [
            'vehicle-model', 'vehicle-year', 'controller-type',
            'motor-type', 'battery-voltage', 'battery-type'
        ];

        const data = {};
        fields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field && field.value) {
                const key = fieldId.replace('vehicle-', '').replace('-', '_');
                data[key] = field.value;
            }
        });

        return data;
    }

    // Manual tracking methods for external use
    static trackCustomEvent(eventName, data = {}) {
        if (window.anonymousAnalytics && window.anonymousAnalytics.isEnabled) {
            window.anonymousAnalytics.trackEvent(eventName, data);
        }
    }

    static trackPresetSelection(presetName, source = 'manual') {
        if (window.anonymousAnalytics && window.anonymousAnalytics.isEnabled) {
            window.anonymousAnalytics.trackPresetUsage(presetName, source);
        }
    }

    static trackOptimizationResult(success, optimizationType = 'standard', metrics = {}) {
        if (window.anonymousAnalytics && window.anonymousAnalytics.isEnabled) {
            window.anonymousAnalytics.trackOptimization(optimizationType, success, metrics);
        }
    }
}

// Initialize analytics integration
document.addEventListener('DOMContentLoaded', () => {
    window.analyticsIntegration = new AnalyticsIntegration();
});

// Export static methods for external use
window.Analytics = {
    trackEvent: AnalyticsIntegration.trackCustomEvent,
    trackPreset: AnalyticsIntegration.trackPresetSelection,
    trackOptimization: AnalyticsIntegration.trackOptimizationResult
};
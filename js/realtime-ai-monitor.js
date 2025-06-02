/**
 * Real-time AI Monitor
 * Comprehensive monitoring system for all user inputs and form changes
 * Provides instant AI analysis and intelligent recommendations
 */
class RealTimeAIMonitor {
    constructor() {
        this.aiCalculationEngine = null;
        this.activeMonitors = new Map();
        this.analysisQueue = [];
        this.isProcessing = false;
        this.lastAnalysisTime = 0;
        this.minAnalysisInterval = 1000; // 1 second minimum between analyses
        this.debounceTimers = new Map();
        this.analysisHistory = [];
        this.maxHistorySize = 50;
        
        this.initialize();
    }
    
    /**
     * Initialize the real-time monitoring system
     */
    async initialize() {
        console.log('Initializing Real-time AI Monitor...');
        
        // Initialize AI Calculation Engine
        if (typeof AICalculationEngine !== 'undefined') {
            this.aiCalculationEngine = new AICalculationEngine();
            console.log('AI Calculation Engine connected');
        } else {
            console.warn('AI Calculation Engine not available');
            return;
        }
        
        // Setup comprehensive input monitoring
        this.setupInputMonitoring();
        this.setupFormMonitoring();
        this.setupAccessoryMonitoring();
        this.setupModeMonitoring();
        this.setupLocationMonitoring();
        
        // Start processing queue
        this.startProcessingQueue();
        
        // Setup periodic analysis for environmental changes
        this.setupPeriodicAnalysis();
        
        console.log('Real-time AI Monitor initialized successfully');
        
        // Show welcome notification about new AI features
        this.showWelcomeNotification();
    }
    
    /**
     * Setup comprehensive input monitoring
     */
    setupInputMonitoring() {
        // Monitor all input types
        const inputSelectors = [
            'input[type="text"]',
            'input[type="number"]', 
            'input[type="range"]',
            'input[type="email"]',
            'input[type="tel"]',
            'select',
            'textarea'
        ];
        
        inputSelectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(input => {
                this.attachInputListeners(input);
            });
        });
        
        // Monitor for dynamically added inputs
        this.observeNewInputs();
    }
    
    /**
     * Attach comprehensive listeners to an input element
     */
    attachInputListeners(input) {
        const inputId = input.id || input.name || `input_${Date.now()}_${Math.random()}`;
        
        if (this.activeMonitors.has(inputId)) {
            return; // Already monitoring this input
        }
        
        const listeners = {
            input: (e) => this.handleInputChange(e, 'input'),
            change: (e) => this.handleInputChange(e, 'change'),
            focus: (e) => this.handleInputFocus(e),
            blur: (e) => this.handleInputBlur(e),
            paste: (e) => this.handleInputPaste(e),
            keyup: (e) => this.handleInputKeyup(e)
        };
        
        // Attach all listeners
        Object.entries(listeners).forEach(([event, handler]) => {
            input.addEventListener(event, handler);
        });
        
        // Store monitor info
        this.activeMonitors.set(inputId, {
            element: input,
            listeners: listeners,
            lastValue: input.value,
            analysisCount: 0,
            priority: this.calculateInputPriority(input)
        });
        
        console.log(`Monitoring input: ${inputId} (priority: ${this.calculateInputPriority(input)})`);
    }
    
    /**
     * Calculate priority for input monitoring
     */
    calculateInputPriority(input) {
        const highPriorityIds = [
            'vehicle-model', 'vehicle-year', 'controller-type', 
            'motor-type', 'current-speed', 'motor-power'
        ];
        
        const mediumPriorityIds = [
            'motor-condition', 'battery-voltage', 'tire-size',
            'weight', 'accessories'
        ];
        
        if (highPriorityIds.includes(input.id)) return 'high';
        if (mediumPriorityIds.includes(input.id)) return 'medium';
        if (input.type === 'range' || input.type === 'number') return 'medium';
        
        return 'low';
    }
    
    /**
     * Handle input change events
     */
    handleInputChange(event, type) {
        const input = event.target;
        const inputId = input.id || input.name;
        const monitor = this.activeMonitors.get(inputId);
        
        if (!monitor) return;
        
        // Check if value actually changed
        if (monitor.lastValue === input.value && type !== 'change') {
            return;
        }
        
        monitor.lastValue = input.value;
        monitor.analysisCount++;
        
        // Queue analysis with appropriate debouncing
        this.queueAnalysis({
            type: 'input_change',
            inputId: inputId,
            input: input,
            value: input.value,
            changeType: type,
            priority: monitor.priority,
            timestamp: Date.now()
        });
    }
    
    /**
     * Handle input focus events
     */
    handleInputFocus(event) {
        const input = event.target;
        
        // Show AI-powered contextual help
        this.showContextualAIHelp(input);
        
        // Pre-analyze related fields for faster response
        this.preAnalyzeRelatedFields(input);
    }
    
    /**
     * Handle input blur events
     */
    handleInputBlur(event) {
        const input = event.target;
        
        // Trigger immediate validation analysis
        this.queueAnalysis({
            type: 'input_validation',
            input: input,
            value: input.value,
            priority: 'high',
            immediate: true,
            timestamp: Date.now()
        });
        
        // Hide contextual help
        this.hideContextualHelp();
    }
    
    /**
     * Handle paste events
     */
    handleInputPaste(event) {
        const input = event.target;
        
        // Analyze pasted content after a short delay
        setTimeout(() => {
            this.queueAnalysis({
                type: 'paste_analysis',
                input: input,
                value: input.value,
                priority: 'high',
                timestamp: Date.now()
            });
        }, 100);
    }
    
    /**
     * Handle keyup events for smart suggestions
     */
    handleInputKeyup(event) {
        const input = event.target;
        
        // Only provide suggestions for text inputs with sufficient content
        if (input.type === 'text' && input.value.length >= 3) {
            this.queueAnalysis({
                type: 'smart_suggestions',
                input: input,
                value: input.value,
                priority: 'low',
                timestamp: Date.now()
            });
        }
    }
    
    /**
     * Queue analysis with intelligent prioritization
     */
    queueAnalysis(analysisRequest) {
        const { inputId, priority, immediate } = analysisRequest;
        
        // Handle immediate requests
        if (immediate) {
            this.processAnalysisImmediate(analysisRequest);
            return;
        }
        
        // Clear existing debounce timer for this input
        if (this.debounceTimers.has(inputId)) {
            clearTimeout(this.debounceTimers.get(inputId));
        }
        
        // Set appropriate debounce delay based on priority
        const delay = priority === 'high' ? 300 : priority === 'medium' ? 600 : 1000;
        
        const timer = setTimeout(() => {
            this.analysisQueue.push(analysisRequest);
            this.processAnalysisQueue();
        }, delay);
        
        this.debounceTimers.set(inputId, timer);
    }
    
    /**
     * Process analysis immediately for critical inputs
     */
    async processAnalysisImmediate(request) {
        try {
            const result = await this.performInputAnalysis(request);
            this.handleAnalysisResult(result, request);
        } catch (error) {
            console.error('Immediate analysis failed:', error);
        }
    }
    
    /**
     * Start processing analysis queue
     */
    startProcessingQueue() {
        setInterval(() => {
            if (!this.isProcessing && this.analysisQueue.length > 0) {
                this.processAnalysisQueue();
            }
        }, 200);
    }
    
    /**
     * Process queued analyses
     */
    async processAnalysisQueue() {
        if (this.isProcessing || this.analysisQueue.length === 0) {
            return;
        }
        
        this.isProcessing = true;
        
        try {
            // Sort queue by priority and timestamp
            this.analysisQueue.sort((a, b) => {
                const priorityOrder = { high: 3, medium: 2, low: 1 };
                const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
                
                if (priorityDiff !== 0) return priorityDiff;
                return a.timestamp - b.timestamp;
            });
            
            // Process high-priority items first
            const request = this.analysisQueue.shift();
            
            // Check minimum interval
            const now = Date.now();
            if (now - this.lastAnalysisTime < this.minAnalysisInterval) {
                // Put item back and wait
                this.analysisQueue.unshift(request);
                setTimeout(() => this.processAnalysisQueue(), this.minAnalysisInterval);
                return;
            }
            
            this.lastAnalysisTime = now;
            
            // Perform analysis
            const result = await this.performInputAnalysis(request);
            this.handleAnalysisResult(result, request);
            
            // Store in history
            this.storeAnalysisHistory(request, result);
            
        } catch (error) {
            console.error('Analysis queue processing failed:', error);
        } finally {
            this.isProcessing = false;
            
            // Continue processing if queue has items
            if (this.analysisQueue.length > 0) {
                setTimeout(() => this.processAnalysisQueue(), 100);
            }
        }
    }
    
    /**
     * Perform AI-powered input analysis
     */
    async performInputAnalysis(request) {
        const { type, input, value } = request;
        
        if (!this.aiCalculationEngine) {
            return { success: false, error: 'AI engine not available' };
        }
        
        const analysisContext = {
            inputData: this.gatherCurrentInputData(),
            context: {
                currentInput: {
                    id: input.id,
                    value: value,
                    type: input.type
                },
                analysisType: type,
                location: this.getCurrentLocation(),
                timestamp: new Date()
            }
        };
        
        try {
            switch (type) {
                case 'input_change':
                case 'input_validation':
                    return await this.validateInputWithAI(analysisContext);
                    
                case 'paste_analysis':
                    return await this.analyzePastedContent(analysisContext);
                    
                case 'smart_suggestions':
                    return await this.generateSmartSuggestions(analysisContext);
                    
                default:
                    return await this.performGeneralAnalysis(analysisContext);
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Validate input using AI
     */
    async validateInputWithAI(context) {
        const { currentInput } = context.context;
        const validation = {
            isValid: true,
            warnings: [],
            suggestions: [],
            confidence: 0.9
        };
        
        // Speed validation
        if (currentInput.id === 'current-speed') {
            const speed = parseInt(currentInput.value);
            if (speed > 25) {
                validation.warnings.push('Speed over 25 MPH may require special licensing and registration');
                validation.suggestions.push('Verify local LSV regulations for your area');
            }
            if (speed < 5) {
                validation.warnings.push('Very low speed - check controller configuration');
            }
        }
        
        // Vehicle year validation
        if (currentInput.id === 'vehicle-year') {
            const year = parseInt(currentInput.value);
            const currentYear = new Date().getFullYear();
            if (year > currentYear) {
                validation.isValid = false;
                validation.warnings.push('Future year detected - please verify entry');
            }
            if (year < 1998) {
                validation.suggestions.push('Older vehicles may have different controller options available');
            }
        }
        
        // Motor power validation
        if (currentInput.id === 'motor-power') {
            const power = parseFloat(currentInput.value);
            if (power > 10) {
                validation.warnings.push('High power motor - verify controller compatibility');
            }
        }
        
        // Get AI-powered comprehensive analysis
        if (this.hasCompleteVehicleData(context.inputData)) {
            try {
                const aiResult = await this.aiCalculationEngine.calculateOptimalSettings(
                    context.inputData, 
                    context.context
                );
                
                if (aiResult && aiResult.analysis) {
                    validation.aiRecommendations = aiResult.analysis.recommendations || [];
                    validation.confidence = aiResult.analysis.confidence || 0.8;
                }
            } catch (error) {
                console.warn('AI validation failed:', error);
            }
        }
        
        return {
            success: true,
            validation: validation,
            type: 'input_validation'
        };
    }
    
    /**
     * Analyze pasted content
     */
    async analyzePastedContent(context) {
        const { currentInput } = context.context;
        const content = currentInput.value;
        
        const analysis = {
            contentType: 'unknown',
            suggestions: [],
            warnings: []
        };
        
        // Detect if pasted content looks like controller settings
        if (/F\.\d+.*=.*\d+/.test(content)) {
            analysis.contentType = 'controller_settings';
            analysis.suggestions.push('Detected controller settings format - would you like me to parse these?');
        }
        
        // Detect vehicle information
        if (/\b(e[2-6]|eS|eL|elXD)\b/i.test(content)) {
            analysis.contentType = 'vehicle_info';
            analysis.suggestions.push('Vehicle model detected in pasted content');
        }
        
        return {
            success: true,
            analysis: analysis,
            type: 'paste_analysis'
        };
    }
    
    /**
     * Generate smart suggestions
     */
    async generateSmartSuggestions(context) {
        const { currentInput } = context.context;
        const suggestions = [];
        
        // Vehicle model suggestions
        if (currentInput.id === 'vehicle-model' && currentInput.value.length >= 1) {
            const models = ['e2', 'e4', 'e6', 'eS', 'eL', 'eM', 'elXD'];
            const matches = models.filter(model => 
                model.toLowerCase().startsWith(currentInput.value.toLowerCase())
            );
            
            if (matches.length > 0) {
                suggestions.push(...matches.map(model => `Complete as: ${model}`));
            }
        }
        
        return {
            success: true,
            suggestions: suggestions,
            type: 'smart_suggestions'
        };
    }
    
    /**
     * Perform general AI analysis
     */
    async performGeneralAnalysis(context) {
        if (!this.hasMinimumData(context.inputData)) {
            return {
                success: false,
                message: 'Insufficient data for analysis'
            };
        }
        
        try {
            const result = await this.aiCalculationEngine.calculateOptimalSettings(
                context.inputData,
                context.context
            );
            
            return {
                success: true,
                result: result,
                type: 'general_analysis'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Handle analysis results
     */
    handleAnalysisResult(result, request) {
        if (!result.success) {
            console.warn('Analysis failed:', result.error);
            return;
        }
        
        switch (result.type) {
            case 'input_validation':
                this.displayValidationResults(result.validation, request.input);
                break;
                
            case 'paste_analysis':
                this.displayPasteAnalysis(result.analysis, request.input);
                break;
                
            case 'smart_suggestions':
                this.displaySmartSuggestions(result.suggestions, request.input);
                break;
                
            case 'general_analysis':
                this.displayGeneralAnalysis(result.result);
                break;
        }
        
        // Notify other components
        this.notifyAnalysisComplete(result, request);
    }
    
    /**
     * Display validation results
     */
    displayValidationResults(validation, input) {
        if (validation.warnings.length > 0) {
            this.showInputWarnings(input, validation.warnings);
        }
        
        if (validation.suggestions.length > 0) {
            this.showInputSuggestions(input, validation.suggestions);
        }
        
        if (validation.aiRecommendations && validation.aiRecommendations.length > 0) {
            this.showAIRecommendations(validation.aiRecommendations);
        }
    }
    
    /**
     * Setup form monitoring for complete form submissions
     */
    setupFormMonitoring() {
        document.querySelectorAll('form').forEach(form => {
            form.addEventListener('submit', (e) => {
                this.handleFormSubmit(e);
            });
        });
    }
    
    /**
     * Setup accessory monitoring
     */
    setupAccessoryMonitoring() {
        window.addEventListener('accessoryInstalled', (e) => {
            this.queueAnalysis({
                type: 'accessory_change',
                data: e.detail,
                priority: 'high',
                timestamp: Date.now()
            });
        });
        
        window.addEventListener('accessoryRemoved', (e) => {
            this.queueAnalysis({
                type: 'accessory_change',
                data: e.detail,
                priority: 'high',
                timestamp: Date.now()
            });
        });
    }
    
    /**
     * Setup driving mode monitoring
     */
    setupModeMonitoring() {
        window.addEventListener('drivingModeChanged', (e) => {
            this.queueAnalysis({
                type: 'mode_change',
                data: e.detail,
                priority: 'high',
                timestamp: Date.now()
            });
        });
    }
    
    /**
     * Setup location monitoring for environmental factors
     */
    setupLocationMonitoring() {
        if (navigator.geolocation) {
            navigator.geolocation.watchPosition((position) => {
                this.queueAnalysis({
                    type: 'location_change',
                    data: {
                        lat: position.coords.latitude,
                        lon: position.coords.longitude
                    },
                    priority: 'medium',
                    timestamp: Date.now()
                });
            }, null, { enableHighAccuracy: false, maximumAge: 300000 }); // 5 minute cache
        }
    }
    
    /**
     * Setup periodic analysis for environmental changes
     */
    setupPeriodicAnalysis() {
        // Run comprehensive analysis every 5 minutes
        setInterval(() => {
            if (this.hasMinimumData(this.gatherCurrentInputData())) {
                this.queueAnalysis({
                    type: 'periodic_analysis',
                    priority: 'low',
                    timestamp: Date.now()
                });
            }
        }, 300000); // 5 minutes
    }
    
    /**
     * Observe for new inputs added to the DOM
     */
    observeNewInputs() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) { // Element node
                        const inputs = node.querySelectorAll ? node.querySelectorAll('input, select, textarea') : [];
                        inputs.forEach(input => {
                            if (!input.classList.contains('no-ai-monitor')) {
                                this.attachInputListeners(input);
                            }
                        });
                    }
                });
            });
        });
        
        observer.observe(document.body, { childList: true, subtree: true });
    }
    
    /**
     * Utility functions
     */
    gatherCurrentInputData() {
        return {
            vehicleModel: document.getElementById('vehicle-model')?.value,
            year: document.getElementById('vehicle-year')?.value,
            controllerType: document.getElementById('controller-type')?.value,
            motorType: document.getElementById('motor-type')?.value,
            motorPower: document.getElementById('motor-power')?.value,
            currentSpeed: parseInt(document.getElementById('current-speed')?.value) || null,
            accessories: this.getInstalledAccessories(),
            drivingMode: this.getCurrentDrivingMode()
        };
    }
    
    getCurrentLocation() {
        return localStorage.getItem('current-location') || null;
    }
    
    getInstalledAccessories() {
        if (typeof accessoriesManager !== 'undefined') {
            return accessoriesManager.getInstalledAccessories();
        }
        return [];
    }
    
    getCurrentDrivingMode() {
        if (typeof drivingModes !== 'undefined' && drivingModes.currentMode) {
            return drivingModes.currentMode.id;
        }
        return null;
    }
    
    hasCompleteVehicleData(data) {
        return data.vehicleModel && data.year && data.controllerType && data.motorType;
    }
    
    hasMinimumData(data) {
        return data.vehicleModel && data.year;
    }
    
    storeAnalysisHistory(request, result) {
        this.analysisHistory.push({
            request,
            result,
            timestamp: Date.now()
        });
        
        // Keep only recent history
        if (this.analysisHistory.length > this.maxHistorySize) {
            this.analysisHistory.shift();
        }
    }
    
    notifyAnalysisComplete(result, request) {
        window.dispatchEvent(new CustomEvent('realtimeAnalysisComplete', {
            detail: { result, request }
        }));
    }
    
    /**
     * UI Helper functions
     */
    showInputWarnings(input, warnings) {
        this.removeExistingTooltips(input);
        
        const tooltip = document.createElement('div');
        tooltip.className = 'ai-input-warning';
        tooltip.innerHTML = '⚠️ ' + warnings.join('<br>⚠️ ');
        
        this.positionTooltip(tooltip, input);
        document.body.appendChild(tooltip);
        
        setTimeout(() => tooltip.remove(), 7000);
    }
    
    showInputSuggestions(input, suggestions) {
        this.removeExistingTooltips(input);
        
        const tooltip = document.createElement('div');
        tooltip.className = 'ai-input-suggestion';
        tooltip.innerHTML = '💡 ' + suggestions.join('<br>💡 ');
        
        this.positionTooltip(tooltip, input);
        document.body.appendChild(tooltip);
        
        setTimeout(() => tooltip.remove(), 5000);
    }
    
    showAIRecommendations(recommendations) {
        if (window.aiUI) {
            const message = '🎯 AI Recommendations:\n• ' + recommendations.slice(0, 3).join('\n• ');
            window.aiUI.addChatMessage(message, 'ai');
        }
    }
    
    removeExistingTooltips(input) {
        document.querySelectorAll('.ai-input-suggestion, .ai-input-warning').forEach(t => {
            if (t.dataset.inputId === input.id) {
                t.remove();
            }
        });
    }
    
    positionTooltip(tooltip, input) {
        const rect = input.getBoundingClientRect();
        tooltip.style.position = 'fixed';
        tooltip.style.top = (rect.bottom + 5) + 'px';
        tooltip.style.left = rect.left + 'px';
        tooltip.style.zIndex = '10000';
        tooltip.dataset.inputId = input.id;
    }
    
    /**
     * Show welcome notification about AI features
     */
    showWelcomeNotification() {
        setTimeout(() => {
            const notification = document.createElement('div');
            notification.className = 'fixed top-4 right-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 rounded-lg shadow-lg z-50 max-w-sm';
            notification.innerHTML = `
                <div class="flex items-start">
                    <div class="mr-3 mt-1">
                        <span class="text-2xl">🤖</span>
                    </div>
                    <div class="flex-1">
                        <h4 class="font-semibold text-sm mb-1">Enhanced AI Features Active!</h4>
                        <p class="text-xs opacity-90 mb-2">Real-time analysis for all inputs • Intelligent recommendations • Smart validation</p>
                        <div class="flex justify-end">
                            <button onclick="this.parentElement.parentElement.parentElement.remove()" 
                                    class="text-xs bg-white bg-opacity-20 px-2 py-1 rounded hover:bg-opacity-30 transition-all">
                                Got it!
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            document.body.appendChild(notification);
            
            // Auto-hide after 8 seconds
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, 8000);
        }, 2000); // Show after 2 seconds to let the page load
    }
    
    /**
     * Get monitoring statistics
     */
    getMonitoringStats() {
        return {
            activeMonitors: this.activeMonitors.size,
            queueLength: this.analysisQueue.length,
            historySize: this.analysisHistory.length,
            isProcessing: this.isProcessing,
            lastAnalysisTime: this.lastAnalysisTime
        };
    }
}

// Initialize Real-time AI Monitor when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.realtimeAIMonitor = new RealTimeAIMonitor();
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RealTimeAIMonitor;
}
/**
 * AI UI Integration
 * Provides real-time AI assistance throughout the application UI
 * Enhanced with comprehensive real-time analysis for all user inputs
 */
class AIUIIntegration {
    constructor() {
        this.ai = null;
        this.aiCalculationEngine = null;
        this.isActive = false;
        this.assistantPanel = null;
        this.contextualHelp = new Map();
        this.autoFillActive = true;
        this.realTimeAnalysis = true;
        this.inputAnalysisActive = true;
        this.analysisDebounceTimer = null;
        this.lastAnalysisData = null;
        this.realTimePanel = null;
        
        this.init();
    }
    
    /**
     * Initialize AI UI Integration
     */
    async init() {
        // Wait for AI Assistant to be available
        if (typeof AIAssistant !== 'undefined') {
            this.ai = new AIAssistant();
            await this.ai.init();
        } else {
            console.warn('AI Assistant not available');
        }
        
        // Initialize AI Calculation Engine
        if (typeof AICalculationEngine !== 'undefined') {
            this.aiCalculationEngine = new AICalculationEngine();
            console.log('AI Calculation Engine initialized');
        }
        
        this.createAssistantPanel();
        this.createRealTimePanel();
        this.setupEventListeners();
        this.initializeContextualHelp();
        this.setupAutoFill();
        this.setupRealTimeAnalysis();
        this.setupComprehensiveInputAnalysis();
        this.injectCSS();
        
        this.isActive = true;
        console.log('Enhanced AI UI Integration initialized');
    }
    
    /**
     * Create floating AI assistant panel
     */
    createAssistantPanel() {
        // Create floating assistant button
        const assistantButton = document.createElement('div');
        assistantButton.id = 'ai-assistant-button';
        assistantButton.className = 'fixed bottom-6 right-6 z-50 cursor-pointer transform transition-all hover:scale-105';
        assistantButton.innerHTML = `
            <div class="bg-gradient-to-r from-blue-500 to-purple-600 rounded-full p-4 shadow-lg hover:shadow-xl">
                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
                </svg>
            </div>
            <div class="absolute -top-2 -right-2 w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
        `;
        
        // Create assistant panel
        const assistantPanel = document.createElement('div');
        assistantPanel.id = 'ai-assistant-panel';
        assistantPanel.className = 'fixed bottom-24 right-6 w-80 bg-white rounded-lg shadow-2xl border z-50 transform translate-y-full transition-all duration-300 opacity-0';
        assistantPanel.innerHTML = `
            <div class="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 rounded-t-lg">
                <div class="flex items-center justify-between">
                    <div class="flex items-center">
                        <div class="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center mr-3">
                            <span class="text-lg">🤖</span>
                        </div>
                        <div>
                            <h3 class="font-semibold">AI Assistant</h3>
                            <p class="text-xs opacity-90">Ready to help</p>
                        </div>
                    </div>
                    <button id="close-assistant" class="text-white hover:text-gray-200">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
            </div>
            
            <div class="p-4">
                <!-- Chat Messages -->
                <div id="ai-chat-messages" class="h-64 overflow-y-auto mb-4 space-y-3">
                    <div class="ai-message">
                        <div class="bg-gray-100 rounded-lg p-3 text-sm">
                            <p>👋 Hi! I'm your GEM AI assistant. I can help you with:</p>
                            <ul class="list-disc list-inside mt-2 text-xs text-gray-600">
                                <li>Auto-filling vehicle information</li>
                                <li>Analyzing PDF settings</li>
                                <li>Recommending accessories</li>
                                <li>Optimizing controller settings</li>
                                <li>Troubleshooting issues</li>
                            </ul>
                        </div>
                    </div>
                </div>
                
                <!-- Quick Actions -->
                <div class="mb-4">
                    <div class="grid grid-cols-2 gap-2">
                        <button class="ai-quick-action p-2 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100" data-action="auto-fill">
                            ✨ Auto-fill Vehicle
                        </button>
                        <button class="ai-quick-action p-2 text-xs bg-green-50 text-green-700 rounded hover:bg-green-100" data-action="analyze-pdf">
                            📄 Analyze PDF
                        </button>
                        <button class="ai-quick-action p-2 text-xs bg-purple-50 text-purple-700 rounded hover:bg-purple-100" data-action="recommendations">
                            💡 Get Recommendations
                        </button>
                        <button class="ai-quick-action p-2 text-xs bg-orange-50 text-orange-700 rounded hover:bg-orange-100" data-action="optimize">
                            🎯 Optimize Settings
                        </button>
                    </div>
                </div>
                
                <!-- Chat Input -->
                <div class="flex space-x-2">
                    <input type="text" id="ai-chat-input" placeholder="Ask me anything..." 
                           class="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <button id="ai-send-button" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm">
                        Send
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(assistantButton);
        document.body.appendChild(assistantPanel);
        
        this.assistantPanel = assistantPanel;
        
        // Setup panel interactions
        assistantButton.addEventListener('click', () => this.toggleAssistantPanel());
        document.getElementById('close-assistant').addEventListener('click', () => this.hideAssistantPanel());
        
        // Setup chat functionality
        this.setupChatInterface();
    }
    
    /**
     * Setup chat interface
     */
    setupChatInterface() {
        const chatInput = document.getElementById('ai-chat-input');
        const sendButton = document.getElementById('ai-send-button');
        
        const sendMessage = async () => {
            const message = chatInput.value.trim();
            if (!message) return;
            
            this.addChatMessage(message, 'user');
            chatInput.value = '';
            
            // Show typing indicator
            this.showTypingIndicator();
            
            try {
                const context = this.getCurrentContext();
                const response = await this.ai.getRealTimeAssistance(message, context);
                
                this.hideTypingIndicator();
                
                if (response.success) {
                    this.addChatMessage(response.response.message, 'ai');
                    
                    // Add suggestions if available
                    if (response.suggestions && response.suggestions.length > 0) {
                        this.addSuggestions(response.suggestions);
                    }
                } else {
                    this.addChatMessage('Sorry, I encountered an error. Please try again.', 'ai');
                }
            } catch (error) {
                this.hideTypingIndicator();
                this.addChatMessage('I\'m having trouble connecting. Please check your connection.', 'ai');
            }
        };
        
        sendButton.addEventListener('click', sendMessage);
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                sendMessage();
            }
        });
        
        // Setup quick actions
        document.querySelectorAll('.ai-quick-action').forEach(button => {
            button.addEventListener('click', () => {
                const action = button.dataset.action;
                this.handleQuickAction(action);
            });
        });
    }
    
    /**
     * Setup event listeners for auto-fill functionality
     */
    setupEventListeners() {
        // Vehicle model change - trigger auto-fill
        document.getElementById('vehicle-model')?.addEventListener('change', (e) => {
            if (this.autoFillActive && e.target.value) {
                this.triggerAutoFill();
            }
        });
        
        // Vehicle year change - trigger auto-fill
        document.getElementById('vehicle-year')?.addEventListener('change', (e) => {
            if (this.autoFillActive && e.target.value) {
                this.triggerAutoFill();
            }
        });
        
        // Motor type AI assist button
        document.getElementById('motor-type-ai-assist')?.addEventListener('click', () => {
            this.showMotorTypeAssistance();
        });
        
        // PDF upload - trigger analysis
        document.getElementById('settings-pdf')?.addEventListener('change', (e) => {
            if (e.target.files[0]) {
                this.analyzePDFFile(e.target.files[0]);
            }
        });
        
        // Form field focus - show contextual help
        this.setupContextualHelp();
    }
    
    /**
     * Initialize contextual help for form fields
     */
    initializeContextualHelp() {
        this.contextualHelp.set('vehicle-model', {
            title: 'Vehicle Model',
            content: 'Select your GEM model. The AI will auto-fill compatible controller and motor information.',
            tips: ['e2/e4/e6 refer to passenger capacity', 'eS/eL/eM are utility models', 'elXD is the heavy-duty variant']
        });
        
        this.contextualHelp.set('controller-type', {
            title: 'Controller Type',
            content: 'The motor controller manages power delivery. T2 is the most common modern controller.',
            tips: ['T2: Modern, programmable controller', 'T4: Newer, more advanced', 'T1: Legacy controller (limited features)']
        });
        
        this.contextualHelp.set('motor-type', {
            title: 'Motor Type',
            content: 'DC motors are standard, AC motors offer better efficiency and performance.',
            tips: ['DC Stock: 3.5HP typical', 'DC Upgrade: 5HP+ aftermarket', 'AC motors: More efficient, quieter']
        });
        
        this.contextualHelp.set('current-speed', {
            title: 'Current Top Speed',
            content: 'Your vehicle\'s actual top speed determines its legal classification.',
            tips: ['≤19 MPH: Golf Cart classification', '20-25 MPH: LSV classification', '>25 MPH: May not be street legal']
        });
    }
    
    /**
     * Setup contextual help on focus
     */
    setupContextualHelp() {
        this.contextualHelp.forEach((help, fieldId) => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.addEventListener('focus', () => this.showContextualHelp(fieldId));
                field.addEventListener('blur', () => this.hideContextualHelp());
            }
        });
    }
    
    /**
     * Setup auto-fill functionality
     */
    setupAutoFill() {
        // Create auto-fill indicator
        const indicator = document.createElement('div');
        indicator.id = 'ai-autofill-indicator';
        indicator.className = 'fixed top-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 transform -translate-y-full transition-all opacity-0';
        indicator.innerHTML = `
            <div class="flex items-center">
                <div class="animate-spin mr-2">⚡</div>
                <span class="text-sm">AI is auto-filling vehicle data...</span>
            </div>
        `;
        document.body.appendChild(indicator);
    }
    
    /**
     * Setup real-time analysis
     */
    setupRealTimeAnalysis() {
        // Monitor form changes for real-time suggestions
        const formFields = ['vehicle-model', 'vehicle-year', 'controller-type', 'motor-type', 'current-speed'];
        
        formFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.addEventListener('change', () => {
                    if (this.realTimeAnalysis) {
                        this.performRealTimeAnalysis();
                    }
                });
            }
        });
    }
    
    /**
     * Setup comprehensive input analysis for all form inputs
     */
    setupComprehensiveInputAnalysis() {
        // Get all input, select, and textarea elements
        const inputs = document.querySelectorAll('input, select, textarea');
        
        inputs.forEach(input => {
            // Skip certain inputs that shouldn't trigger analysis
            if (input.type === 'file' || input.type === 'hidden' || input.classList.contains('no-ai-analysis')) {
                return;
            }
            
            // Add real-time analysis on input change
            input.addEventListener('input', () => this.debouncedInputAnalysis(input));
            input.addEventListener('change', () => this.debouncedInputAnalysis(input));
            input.addEventListener('focus', () => this.onInputFocus(input));
            input.addEventListener('blur', () => this.onInputBlur(input));
        });
        
        // Monitor for dynamically added form elements
        this.observeFormChanges();
        
        // Listen for custom events from other modules
        window.addEventListener('aiCalculationUpdate', (e) => {
            this.handleCalculationUpdate(e.detail);
        });
        
        // Listen for accessory changes
        window.addEventListener('accessoryInstalled', () => {
            this.performComprehensiveAnalysis('accessory_change');
        });
        
        // Listen for driving mode changes
        window.addEventListener('drivingModeChanged', () => {
            this.performComprehensiveAnalysis('driving_mode_change');
        });
    }
    
    /**
     * Trigger auto-fill based on current form data
     */
    async triggerAutoFill() {
        const vehicleData = this.gatherVehicleData();
        
        // Show loading indicator
        this.showAutoFillIndicator();
        
        try {
            const result = await this.ai.autoFillVehicleFields(vehicleData);
            
            if (result.success) {
                this.applyAutoFillResults(result);
                this.showAutoFillSuccess(result.message);
            } else {
                this.showAutoFillMessage('Unable to auto-fill: ' + result.message, 'warning');
            }
        } catch (error) {
            this.showAutoFillMessage('Auto-fill failed: ' + error.message, 'error');
        } finally {
            this.hideAutoFillIndicator();
        }
    }
    
    /**
     * Analyze PDF file
     */
    async analyzePDFFile(file) {
        this.showPDFAnalysisIndicator();
        
        try {
            const result = await this.ai.analyzePDF(file);
            
            if (result.success) {
                this.displayPDFAnalysisResults(result);
                this.addChatMessage(`📄 PDF analyzed successfully! Found ${Object.keys(result.settings).length} controller settings.`, 'ai');
            } else {
                this.showPDFAnalysisError(result.message);
            }
        } catch (error) {
            this.showPDFAnalysisError('PDF analysis failed: ' + error.message);
        } finally {
            this.hidePDFAnalysisIndicator();
        }
    }
    
    /**
     * Show motor type assistance
     */
    async showMotorTypeAssistance() {
        const vehicleData = this.gatherVehicleData();
        
        if (!vehicleData.model || !vehicleData.year) {
            this.showTooltip('motor-type-ai-assist', 'Please select vehicle model and year first');
            return;
        }
        
        try {
            const suggestion = await this.ai.autoFillVehicleFields(vehicleData);
            
            if (suggestion.success && suggestion.data.motorType) {
                const motorSelect = document.getElementById('motor-type');
                const suggestionDiv = document.getElementById('motor-ai-suggestion');
                
                motorSelect.value = suggestion.data.motorType;
                suggestionDiv.classList.remove('hidden');
                suggestionDiv.innerHTML = `
                    <strong>AI Suggestion:</strong> ${suggestion.data.motorType} 
                    <span class="text-xs">(${Math.round(suggestion.confidence * 100)}% confidence)</span>
                    <br><small>${suggestion.message}</small>
                `;
                
                // Trigger change event
                motorSelect.dispatchEvent(new Event('change'));
            } else {
                this.showTooltip('motor-type-ai-assist', 'Unable to suggest motor type for this configuration');
            }
        } catch (error) {
            this.showTooltip('motor-type-ai-assist', 'AI assistance temporarily unavailable');
        }
    }
    
    /**
     * Perform real-time analysis
     */
    async performRealTimeAnalysis() {
        const vehicleData = this.gatherVehicleData();
        
        if (Object.keys(vehicleData).filter(k => vehicleData[k]).length < 3) {
            return; // Not enough data for analysis
        }
        
        try {
            if (this.ai) {
                const usageHistory = this.getUsageHistory();
                const recommendations = await this.ai.getUsageBasedRecommendations(vehicleData, usageHistory);
                
                if (recommendations.success && recommendations.recommendations.length > 0) {
                    this.showRealtimeRecommendations(recommendations.recommendations.slice(0, 3));
                }
            }
            
            // Also perform AI calculation analysis
            await this.performComprehensiveAnalysis('form_change');
            
        } catch (error) {
            console.warn('Real-time analysis failed:', error);
        }
    }
    
    /**
     * Debounced input analysis to avoid excessive API calls
     */
    debouncedInputAnalysis(input) {
        clearTimeout(this.analysisDebounceTimer);
        
        this.analysisDebounceTimer = setTimeout(() => {
            this.analyzeInputChange(input);
        }, 500); // 500ms debounce
    }
    
    /**
     * Analyze individual input changes
     */
    async analyzeInputChange(input) {
        if (!this.inputAnalysisActive || !input.value) return;
        
        const inputData = {
            id: input.id,
            name: input.name,
            value: input.value,
            type: input.type,
            context: this.getInputContext(input)
        };
        
        try {
            // Get AI-powered input validation and suggestions
            const analysis = await this.analyzeInputValue(inputData);
            
            if (analysis.suggestions.length > 0) {
                this.showInputSuggestions(input, analysis.suggestions);
            }
            
            if (analysis.warnings.length > 0) {
                this.showInputWarnings(input, analysis.warnings);
            }
            
            // Update real-time recommendations panel
            this.updateRealTimePanel(analysis);
            
        } catch (error) {
            console.warn('Input analysis failed:', error);
        }
    }
    
    /**
     * Perform comprehensive analysis using AI calculation engine
     */
    async performComprehensiveAnalysis(trigger = 'manual') {
        if (!this.aiCalculationEngine) return;
        
        const currentData = this.gatherComprehensiveData();
        
        // Check if data has changed significantly
        if (this.lastAnalysisData && this.dataIsSimilar(currentData, this.lastAnalysisData)) {
            return; // Skip analysis if data hasn't changed much
        }
        
        this.lastAnalysisData = currentData;
        
        try {
            this.showRealTimeAnalysisLoading();
            
            const result = await this.aiCalculationEngine.calculateOptimalSettings(
                currentData.inputData,
                currentData.context
            );
            
            if (result && result.settings) {
                this.displayComprehensiveAnalysis(result, trigger);
                this.updateRealTimePanelWithCalculations(result);
                
                // Show intelligent recommendations based on the analysis
                this.showIntelligentRecommendations(result, trigger);
            }
            
        } catch (error) {
            console.error('Comprehensive analysis failed:', error);
            this.showAnalysisError('Analysis temporarily unavailable');
        } finally {
            this.hideRealTimeAnalysisLoading();
        }
    }
    
    /**
     * Handle quick actions
     */
    async handleQuickAction(action) {
        switch (action) {
            case 'auto-fill':
                await this.triggerAutoFill();
                break;
                
            case 'analyze-pdf':
                document.getElementById('settings-pdf')?.click();
                break;
                
            case 'recommendations':
                await this.getRecommendations();
                break;
                
            case 'optimize':
                await this.optimizeSettings();
                break;
        }
    }
    
    /**
     * Get AI recommendations
     */
    async getRecommendations() {
        this.addChatMessage('Getting personalized recommendations...', 'ai');
        
        try {
            const vehicleData = this.gatherVehicleData();
            const usageHistory = this.getUsageHistory();
            const recommendations = await this.ai.getUsageBasedRecommendations(vehicleData, usageHistory);
            
            if (recommendations.success) {
                this.displayRecommendations(recommendations.recommendations);
            } else {
                this.addChatMessage('Unable to generate recommendations at this time.', 'ai');
            }
        } catch (error) {
            this.addChatMessage('Error getting recommendations: ' + error.message, 'ai');
        }
    }
    
    /**
     * Optimize settings
     */
    async optimizeSettings() {
        const context = this.getCurrentContext();
        
        if (!context.vehicle || !context.vehicle.model) {
            this.addChatMessage('Please complete vehicle information first.', 'ai');
            return;
        }
        
        this.addChatMessage('Calculating optimal settings...', 'ai');
        
        try {
            const result = await this.ai.suggestOptimalSettings(context);
            
            if (result.success) {
                this.displayOptimalSettings(result);
            } else {
                this.addChatMessage('Unable to optimize settings: ' + result.message, 'ai');
            }
        } catch (error) {
            this.addChatMessage('Optimization failed: ' + error.message, 'ai');
        }
    }
    
    /**
     * Utility functions
     */
    gatherVehicleData() {
        return {
            model: document.getElementById('vehicle-model')?.value,
            year: document.getElementById('vehicle-year')?.value,
            controller: document.getElementById('controller-type')?.value,
            motorType: document.getElementById('motor-type')?.value,
            motorPower: document.getElementById('motor-power')?.value,
            currentSpeed: parseInt(document.getElementById('current-speed')?.value) || null
        };
    }
    
    getCurrentContext() {
        return {
            vehicle: this.gatherVehicleData(),
            accessories: this.getInstalledAccessories(),
            conditions: this.getCurrentConditions(),
            drivingMode: this.getCurrentDrivingMode()
        };
    }
    
    getInstalledAccessories() {
        // Get from accessories manager if available
        if (typeof accessoriesManager !== 'undefined') {
            return accessoriesManager.getInstalledAccessories();
        }
        return [];
    }
    
    getCurrentConditions() {
        return {
            weather: { temperature: 70, conditions: 'clear' },
            terrain: 'mixed',
            time: new Date().getHours()
        };
    }
    
    getCurrentDrivingMode() {
        // Get from driving modes manager if available
        if (typeof drivingModes !== 'undefined' && drivingModes.currentMode) {
            return drivingModes.currentMode.id;
        }
        return null;
    }
    
    getUsageHistory() {
        try {
            return JSON.parse(localStorage.getItem('gem-usage-history') || '[]');
        } catch {
            return [];
        }
    }
    
    /**
     * UI Display functions
     */
    toggleAssistantPanel() {
        if (this.assistantPanel.classList.contains('translate-y-full')) {
            this.showAssistantPanel();
        } else {
            this.hideAssistantPanel();
        }
    }
    
    showAssistantPanel() {
        this.assistantPanel.classList.remove('translate-y-full', 'opacity-0');
        this.assistantPanel.classList.add('translate-y-0', 'opacity-100');
    }
    
    hideAssistantPanel() {
        this.assistantPanel.classList.add('translate-y-full', 'opacity-0');
        this.assistantPanel.classList.remove('translate-y-0', 'opacity-100');
    }
    
    addChatMessage(message, sender) {
        const messagesContainer = document.getElementById('ai-chat-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = sender === 'user' ? 'user-message text-right' : 'ai-message';
        
        const bubbleClass = sender === 'user' ? 
            'bg-blue-600 text-white ml-8' : 
            'bg-gray-100 text-gray-800 mr-8';
        
        messageDiv.innerHTML = `
            <div class="rounded-lg p-3 text-sm ${bubbleClass}">
                ${message}
            </div>
        `;
        
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    showTypingIndicator() {
        const messagesContainer = document.getElementById('ai-chat-messages');
        const indicator = document.createElement('div');
        indicator.id = 'typing-indicator';
        indicator.className = 'ai-message';
        indicator.innerHTML = `
            <div class="bg-gray-100 rounded-lg p-3 text-sm mr-8">
                <div class="flex items-center">
                    <div class="typing-dots">
                        <div class="dot"></div>
                        <div class="dot"></div>
                        <div class="dot"></div>
                    </div>
                    <span class="ml-2 text-xs text-gray-500">AI is thinking...</span>
                </div>
            </div>
        `;
        
        messagesContainer.appendChild(indicator);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    hideTypingIndicator() {
        const indicator = document.getElementById('typing-indicator');
        if (indicator) {
            indicator.remove();
        }
    }
    
    showAutoFillIndicator() {
        const indicator = document.getElementById('ai-autofill-indicator');
        indicator.classList.remove('-translate-y-full', 'opacity-0');
        indicator.classList.add('translate-y-0', 'opacity-100');
    }
    
    hideAutoFillIndicator() {
        const indicator = document.getElementById('ai-autofill-indicator');
        indicator.classList.add('-translate-y-full', 'opacity-0');
        indicator.classList.remove('translate-y-0', 'opacity-100');
    }
    
    applyAutoFillResults(result) {
        const data = result.data;
        
        Object.entries(data).forEach(([field, value]) => {
            if (value) {
                const element = document.getElementById(field === 'currentSpeed' ? 'current-speed' : 
                                                      field === 'motorType' ? 'motor-type' :
                                                      field === 'motorPower' ? 'motor-power' :
                                                      field === 'controller' ? 'controller-type' : field);
                if (element && !element.value) {
                    element.value = value;
                    element.dispatchEvent(new Event('change'));
                }
            }
        });
    }
    
    showAutoFillSuccess(message) {
        this.showNotification(message, 'success');
        if (this.assistantPanel) {
            this.addChatMessage(`✨ ${message}`, 'ai');
        }
    }
    
    showAutoFillMessage(message, type) {
        this.showNotification(message, type);
    }
    
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `fixed top-4 left-1/2 transform -translate-x-1/2 p-4 rounded-lg shadow-lg z-50 ${
            type === 'success' ? 'bg-green-500' : 
            type === 'error' ? 'bg-red-500' : 
            type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
        } text-white max-w-md`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 4000);
    }
    
    showTooltip(elementId, message) {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        const tooltip = document.createElement('div');
        tooltip.className = 'absolute z-50 bg-gray-800 text-white text-xs rounded p-2 max-w-xs';
        tooltip.textContent = message;
        
        const rect = element.getBoundingClientRect();
        tooltip.style.top = (rect.top - 40) + 'px';
        tooltip.style.left = rect.left + 'px';
        
        document.body.appendChild(tooltip);
        
        setTimeout(() => {
            tooltip.remove();
        }, 3000);
    }
    
    // Add CSS for typing animation
    /**
     * Create real-time analysis panel
     */
    createRealTimePanel() {
        const panel = document.createElement('div');
        panel.id = 'ai-realtime-panel';
        panel.className = 'fixed top-4 left-4 w-72 bg-white rounded-lg shadow-lg border z-40 transform -translate-x-full transition-all duration-300 opacity-0';
        panel.innerHTML = `
            <div class="bg-gradient-to-r from-green-500 to-blue-600 text-white p-3 rounded-t-lg">
                <div class="flex items-center justify-between">
                    <div class="flex items-center">
                        <div class="w-6 h-6 bg-white bg-opacity-20 rounded-full flex items-center justify-center mr-2">
                            <span class="text-sm">⚡</span>
                        </div>
                        <div>
                            <h3 class="font-semibold text-sm">Real-time Analysis</h3>
                            <p class="text-xs opacity-90">Live AI insights</p>
                        </div>
                    </div>
                    <button id="toggle-realtime-panel" class="text-white hover:text-gray-200">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                        </svg>
                    </button>
                </div>
            </div>
            
            <div id="realtime-content" class="p-3 max-h-96 overflow-y-auto">
                <div id="realtime-analysis-loading" class="hidden">
                    <div class="flex items-center text-sm text-gray-600">
                        <div class="animate-spin mr-2">⚡</div>
                        <span>Analyzing...</span>
                    </div>
                </div>
                
                <div id="realtime-recommendations" class="space-y-2">
                    <div class="text-sm text-gray-500">Start entering vehicle data to see real-time AI analysis</div>
                </div>
                
                <div id="realtime-warnings" class="mt-3 space-y-2 hidden">
                    <h4 class="text-sm font-semibold text-yellow-700">⚠️ Attention</h4>
                </div>
                
                <div id="realtime-calculations" class="mt-3 hidden">
                    <h4 class="text-sm font-semibold text-blue-700">🎯 Optimal Settings</h4>
                    <div class="text-xs text-gray-600 mt-1">AI-calculated recommendations</div>
                </div>
            </div>
        `;
        
        document.body.appendChild(panel);
        this.realTimePanel = panel;
        
        // Setup toggle functionality
        document.getElementById('toggle-realtime-panel').addEventListener('click', () => {
            this.toggleRealTimePanel();
        });
        
        // Auto-show after 2 seconds
        setTimeout(() => {
            this.showRealTimePanel();
        }, 2000);
    }
    
    /**
     * Enhanced CSS injection
     */
    injectCSS() {
        const style = document.createElement('style');
        style.textContent = `
            .typing-dots {
                display: flex;
                align-items: center;
            }
            .typing-dots .dot {
                width: 4px;
                height: 4px;
                border-radius: 50%;
                background: #9ca3af;
                margin: 0 1px;
                animation: typing 1.4s infinite ease-in-out;
            }
            .typing-dots .dot:nth-child(1) { animation-delay: -0.32s; }
            .typing-dots .dot:nth-child(2) { animation-delay: -0.16s; }
            .typing-dots .dot:nth-child(3) { animation-delay: 0s; }
            
            @keyframes typing {
                0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; }
                40% { transform: scale(1); opacity: 1; }
            }
            
            .ai-input-suggestion {
                position: absolute;
                background: #f3f4f6;
                border: 1px solid #d1d5db;
                border-radius: 0.375rem;
                padding: 0.5rem;
                font-size: 0.75rem;
                z-index: 1000;
                max-width: 200px;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            }
            
            .ai-input-warning {
                position: absolute;
                background: #fef3c7;
                border: 1px solid #f59e0b;
                color: #92400e;
                border-radius: 0.375rem;
                padding: 0.5rem;
                font-size: 0.75rem;
                z-index: 1000;
                max-width: 200px;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            }
            
            .realtime-recommendation {
                background: linear-gradient(135deg, #e0f2fe 0%, #f3e5f5 100%);
                border-left: 4px solid #2196f3;
                padding: 0.75rem;
                border-radius: 0.375rem;
                margin-bottom: 0.5rem;
                font-size: 0.8rem;
                transition: all 0.3s ease;
            }
            
            .realtime-recommendation:hover {
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            }
            
            .calculation-result {
                background: #f0f9ff;
                border: 1px solid #0ea5e9;
                border-radius: 0.375rem;
                padding: 0.5rem;
                margin: 0.25rem 0;
                font-size: 0.75rem;
            }
            
            .analysis-confidence {
                display: inline-block;
                padding: 0.125rem 0.375rem;
                border-radius: 0.25rem;
                font-size: 0.625rem;
                font-weight: 600;
            }
            
            .confidence-high { background: #dcfce7; color: #166534; }
            .confidence-medium { background: #fef3c7; color: #92400e; }
            .confidence-low { background: #fee2e2; color: #dc2626; }
        `;
        document.head.appendChild(style);
    }

    /**
     * Additional utility functions for comprehensive analysis
     */
    gatherComprehensiveData() {
        return {
            inputData: {
                vehicleModel: document.getElementById('vehicle-model')?.value,
                year: document.getElementById('vehicle-year')?.value,
                controllerType: document.getElementById('controller-type')?.value,
                motorType: document.getElementById('motor-type')?.value,
                currentSpeed: parseInt(document.getElementById('current-speed')?.value) || null,
                accessories: this.getInstalledAccessories(),
                drivingMode: this.getCurrentDrivingMode(),
                motorCondition: this.getMotorCondition()
            },
            context: {
                location: this.getCurrentLocation(),
                coordinates: this.getCurrentCoordinates(),
                timestamp: new Date(),
                page: window.location.pathname
            }
        };
    }
    
    getInputContext(input) {
        return {
            formSection: this.getFormSection(input),
            relatedFields: this.getRelatedFields(input),
            validationRules: this.getValidationRules(input)
        };
    }
    
    getFormSection(input) {
        const section = input.closest('[data-section]');
        return section ? section.dataset.section : 'unknown';
    }
    
    getRelatedFields(input) {
        const form = input.closest('form') || document;
        const related = [];
        
        // Find related fields based on common patterns
        if (input.id?.includes('vehicle')) {
            related.push(...form.querySelectorAll('[id*="vehicle"]'));
        }
        if (input.id?.includes('motor')) {
            related.push(...form.querySelectorAll('[id*="motor"]'));
        }
        
        return Array.from(related).map(f => ({ id: f.id, value: f.value }));
    }
    
    getValidationRules(input) {
        return {
            required: input.required,
            min: input.min,
            max: input.max,
            pattern: input.pattern,
            type: input.type
        };
    }
    
    async analyzeInputValue(inputData) {
        const analysis = {
            suggestions: [],
            warnings: [],
            confidence: 0.8
        };
        
        // Speed validation and suggestions
        if (inputData.id === 'current-speed') {
            const speed = parseInt(inputData.value);
            if (speed > 25) {
                analysis.warnings.push('Speed >25 MPH may require special licensing');
            } else if (speed < 10) {
                analysis.suggestions.push('Consider checking controller settings for low speed');
            }
        }
        
        // Vehicle year validation
        if (inputData.id === 'vehicle-year') {
            const year = parseInt(inputData.value);
            const currentYear = new Date().getFullYear();
            if (year > currentYear) {
                analysis.warnings.push('Future year detected - please verify');
            } else if (year < 1998) {
                analysis.suggestions.push('Older vehicles may have different controller options');
            }
        }
        
        return analysis;
    }
    
    showInputSuggestions(input, suggestions) {
        this.removeExistingTooltips(input);
        
        const tooltip = document.createElement('div');
        tooltip.className = 'ai-input-suggestion';
        tooltip.innerHTML = suggestions.join('<br>');
        
        this.positionTooltip(tooltip, input);
        document.body.appendChild(tooltip);
        
        setTimeout(() => tooltip.remove(), 5000);
    }
    
    showInputWarnings(input, warnings) {
        this.removeExistingTooltips(input);
        
        const tooltip = document.createElement('div');
        tooltip.className = 'ai-input-warning';
        tooltip.innerHTML = '⚠️ ' + warnings.join('<br>⚠️ ');
        
        this.positionTooltip(tooltip, input);
        document.body.appendChild(tooltip);
        
        setTimeout(() => tooltip.remove(), 7000);
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
        tooltip.dataset.inputId = input.id;
    }
    
    updateRealTimePanel(analysis) {
        const container = document.getElementById('realtime-recommendations');
        if (!container) return;
        
        const recommendation = document.createElement('div');
        recommendation.className = 'realtime-recommendation';
        recommendation.innerHTML = `
            <div class="flex items-center justify-between mb-1">
                <span class="font-medium text-sm">💡 AI Insight</span>
                <span class="analysis-confidence confidence-${this.getConfidenceLevel(analysis.confidence)}">
                    ${Math.round(analysis.confidence * 100)}%
                </span>
            </div>
            <div class="text-xs text-gray-700">
                ${analysis.suggestions.join(' • ')}
            </div>
        `;
        
        container.appendChild(recommendation);
        
        // Keep only last 3 recommendations
        while (container.children.length > 4) {
            container.removeChild(container.firstChild);
        }
    }
    
    updateRealTimePanelWithCalculations(result) {
        const container = document.getElementById('realtime-calculations');
        if (!container || !result.settings) return;
        
        container.classList.remove('hidden');
        
        const topSettings = Object.entries(result.settings)
            .slice(0, 3)
            .map(([func, value]) => `F.${func}: ${value}`);
        
        container.innerHTML = `
            <h4 class="text-sm font-semibold text-blue-700">🎯 Optimal Settings</h4>
            <div class="text-xs text-gray-600 mt-1">AI-calculated recommendations</div>
            <div class="mt-2 space-y-1">
                ${topSettings.map(setting => `
                    <div class="calculation-result">${setting}</div>
                `).join('')}
            </div>
            <div class="mt-2">
                <span class="analysis-confidence confidence-${this.getConfidenceLevel(result.analysis?.confidence || 0.7)}">
                    ${Math.round((result.analysis?.confidence || 0.7) * 100)}% confidence
                </span>
            </div>
        `;
    }
    
    getConfidenceLevel(confidence) {
        if (confidence >= 0.8) return 'high';
        if (confidence >= 0.6) return 'medium';
        return 'low';
    }
    
    toggleRealTimePanel() {
        if (this.realTimePanel.classList.contains('-translate-x-full')) {
            this.showRealTimePanel();
        } else {
            this.hideRealTimePanel();
        }
    }
    
    showRealTimePanel() {
        this.realTimePanel.classList.remove('-translate-x-full', 'opacity-0');
        this.realTimePanel.classList.add('translate-x-0', 'opacity-100');
    }
    
    hideRealTimePanel() {
        this.realTimePanel.classList.add('-translate-x-full', 'opacity-0');
        this.realTimePanel.classList.remove('translate-x-0', 'opacity-100');
    }
    
    showRealTimeAnalysisLoading() {
        document.getElementById('realtime-analysis-loading')?.classList.remove('hidden');
    }
    
    hideRealTimeAnalysisLoading() {
        document.getElementById('realtime-analysis-loading')?.classList.add('hidden');
    }
    
    observeFormChanges() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1) { // Element node
                        const inputs = node.querySelectorAll ? node.querySelectorAll('input, select, textarea') : [];
                        inputs.forEach(input => {
                            if (!input.classList.contains('no-ai-analysis')) {
                                input.addEventListener('input', () => this.debouncedInputAnalysis(input));
                                input.addEventListener('change', () => this.debouncedInputAnalysis(input));
                            }
                        });
                    }
                });
            });
        });
        
        observer.observe(document.body, { childList: true, subtree: true });
    }
    
    onInputFocus(input) {
        // Show contextual help for the focused input
        if (this.contextualHelp.has(input.id)) {
            this.showContextualHelp(input.id);
        }
    }
    
    onInputBlur(input) {
        // Hide contextual help when input loses focus
        setTimeout(() => {
            this.hideContextualHelp();
        }, 200);
    }
    
    dataIsSimilar(data1, data2) {
        if (!data1 || !data2) return false;
        
        const json1 = JSON.stringify(data1.inputData);
        const json2 = JSON.stringify(data2.inputData);
        
        return json1 === json2;
    }
    
    handleCalculationUpdate(detail) {
        // Handle updates from AI calculation engine
        this.performComprehensiveAnalysis('calculation_update');
    }
    
    displayComprehensiveAnalysis(result, trigger) {
        // Add comprehensive analysis results to chat if assistant panel is open
        if (this.assistantPanel && !this.assistantPanel.classList.contains('translate-y-full')) {
            const summary = this.generateAnalysisSummary(result, trigger);
            this.addChatMessage(summary, 'ai');
        }
    }
    
    generateAnalysisSummary(result, trigger) {
        const confidence = result.analysis?.confidence || 0.7;
        const settingsCount = Object.keys(result.settings || {}).length;
        
        let summary = `🔍 Analysis complete (${Math.round(confidence * 100)}% confidence)\n`;
        summary += `📊 Calculated ${settingsCount} optimal settings\n`;
        
        if (result.analysis?.recommendations?.length > 0) {
            summary += `💡 Key recommendation: ${result.analysis.recommendations[0]}`;
        }
        
        return summary;
    }
    
    showIntelligentRecommendations(result, trigger) {
        if (!result.analysis?.recommendations?.length) return;
        
        // Show top recommendation as a notification
        const topRecommendation = result.analysis.recommendations[0];
        this.showNotification(`💡 AI Insight: ${topRecommendation}`, 'info');
    }
    
    showAnalysisError(message) {
        this.showNotification(`❌ ${message}`, 'error');
    }
    
    getCurrentCoordinates() {
        // Try to get current coordinates from various sources
        if (navigator.geolocation) {
            return new Promise((resolve) => {
                navigator.geolocation.getCurrentPosition(
                    (position) => resolve({
                        lat: position.coords.latitude,
                        lon: position.coords.longitude
                    }),
                    () => resolve(null)
                );
            });
        }
        return null;
    }
    
    getMotorCondition() {
        // Gather motor condition data from form
        return {
            age: document.getElementById('motor-age')?.value,
            condition: document.getElementById('motor-condition')?.value,
            hours: document.getElementById('motor-hours')?.value
        };
    }
}

// Initialize AI UI Integration when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('index.html') || 
        window.location.pathname.includes('gem-optimizer') ||
        window.location.pathname.includes('accessories-config.html') ||
        window.location.pathname.includes('driving-modes.html') ||
        window.location.pathname === '/') {
        window.aiUI = new AIUIIntegration();
    }
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AIUIIntegration;
}
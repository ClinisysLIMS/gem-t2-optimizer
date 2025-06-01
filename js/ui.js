// js/ui.js
/**
 * GEM T2 Controller Optimizer UI Controller
 * Handles all UI interactions and form flow
 */
class UIController {
    constructor(optimizer, validation, presetsManager, pdfGenerator) {
        this.optimizer = optimizer;
        this.validation = validation;
        this.presetsManager = presetsManager;
        this.pdfGenerator = pdfGenerator;
        this.tripPlanner = new TripPlanner();
        
        this.currentStep = 1;
        this.totalSteps = 5;
        this.isWeekendOuting = false;
        this.inputData = {
            vehicle: {},
            battery: {},
            wheel: {},
            environment: {},
            priorities: {},
            tripPlanning: {}
        };
        
        this.initializeUI();
        this.attachEventListeners();
    }
    
    /**
     * Initialize UI elements
     */
    initializeUI() {
        // Check if disclaimer is already accepted
        let disclaimerAccepted = false;
        try {
            disclaimerAccepted = localStorage.getItem('gem-optimizer-disclaimer') === 'accepted';
        } catch (e) {
            console.log('localStorage not available');
        }
        
        if (disclaimerAccepted) {
            document.getElementById('disclaimer').classList.add('hidden');
            this.showPresets();
        }
        
        // Populate preset cards
        const presetSection = document.getElementById('preset-section');
        if (presetSection) {
            const presetGrid = presetSection.querySelector('.grid');
            if (presetGrid) {
                presetGrid.innerHTML = this.presetsManager.getPresetCardsHTML();
            }
        }
        
        // Initialize sliders
        this.initializeSliders();
    }
    
    /**
     * Attach event listeners
     */
    attachEventListeners() {
        // Disclaimer acceptance
        const disclaimerCheckbox = document.getElementById('disclaimer-checkbox');
        disclaimerCheckbox?.addEventListener('change', (e) => {
            if (e.target.checked) {
                localStorage.setItem('gem-optimizer-disclaimer', 'accepted');
                document.getElementById('disclaimer').classList.add('hidden');
                this.showPresets();
            }
        });
        
        // Preset cards - now handled by individual buttons via onclick handlers
        
        // Custom configuration button
        document.getElementById('custom-config-btn')?.addEventListener('click', () => {
            this.startCustomConfiguration();
        });
        
        // Navigation buttons
        document.getElementById('vehicle-next-btn')?.addEventListener('click', () => {
            this.nextStep();
        });
        
        document.getElementById('back-to-presets-btn')?.addEventListener('click', () => {
            this.showPresets();
        });
        
        // Main navigation buttons
        const nextStepBtn = document.getElementById('next-step-btn');
        const prevStepBtn = document.getElementById('prev-step-btn');
        
        if (nextStepBtn) {
            nextStepBtn.addEventListener('click', () => {
                this.nextStep();
            });
        }
        
        if (prevStepBtn) {
            prevStepBtn.addEventListener('click', () => {
                this.previousStep();
            });
        }
        
        // Form inputs
        this.attachFormListeners();
        
        // Trip planning inputs
        this.attachTripPlanningListeners();
        
        // Export/Import buttons
        this.attachExportImportListeners();
    }
    
    /**
     * Initialize priority sliders
     */
    initializeSliders() {
        const sliders = ['range', 'speed', 'acceleration', 'hillClimbing', 'regen'];
        
        sliders.forEach(slider => {
            const element = document.getElementById(`priority-${slider}`);
            const valueDisplay = document.getElementById(`${slider}-value`);
            
            if (element && valueDisplay) {
                // Set initial value
                const initialValue = element.value || '5';
                valueDisplay.textContent = initialValue;
                this.inputData.priorities[slider] = parseInt(initialValue);
                
                // Add event listener
                element.addEventListener('input', (e) => {
                    valueDisplay.textContent = e.target.value;
                    this.inputData.priorities[slider] = parseInt(e.target.value);
                });
            }
        });
    }
    
    /**
     * Show presets section
     */
    showPresets() {
        document.getElementById('preset-section').classList.remove('hidden');
        document.getElementById('main-form').classList.add('hidden');
        document.getElementById('results-section').classList.add('hidden');
    }
    
    /**
     * Select a preset
     * @param {string} presetName - Name of the preset
     */
    selectPreset(presetName) {
        // Update UI
        document.querySelectorAll('.preset-card').forEach(card => {
            card.classList.remove('selected');
        });
        document.querySelector(`[data-preset="${presetName}"]`).classList.add('selected');
        
        // Get preset configuration
        const preset = this.presetsManager.getPreset(presetName);
        if (!preset) return;
        
        // Check if this preset requires trip planning
        if (preset.requiresTripPlanning) {
            this.isWeekendOuting = true;
            this.totalSteps = 6; // Add trip planning step
            this.startCustomConfiguration();
            return;
        }
        
        // Apply preset to input data
        this.inputData = this.presetsManager.getMergedInputData(presetName, this.getDefaultInputData());
        
        // Show optimization in progress
        this.showLoadingScreen();
        
        // Run optimization
        setTimeout(() => {
            const results = this.optimizer.optimizeSettings(this.inputData, this.importedSettings);
            
            // Override with preset settings if available
            if (preset.settings) {
                Object.keys(preset.settings).forEach(funcNum => {
                    results.optimizedSettings[funcNum] = preset.settings[funcNum];
                });
            }
            
            // For weekend-outing preset, use trip-optimized settings if available
            if (presetName === 'weekend-outing' && this.tripOptimizedSettings) {
                Object.keys(this.tripOptimizedSettings).forEach(funcNum => {
                    results.optimizedSettings[funcNum] = this.tripOptimizedSettings[funcNum];
                });
                // Clear the trip settings after use
                this.tripOptimizedSettings = null;
            }
            
            this.showResults(results);
        }, 1000);
    }
    
    /**
     * Start custom configuration
     */
    startCustomConfiguration() {
        document.getElementById('preset-section').classList.add('hidden');
        document.getElementById('main-form').classList.remove('hidden');
        this.currentStep = 1;
        this.showStep(1);
        this.updateProgressBar();
        
        // If we have imported settings, show a notification
        if (this.importedSettings) {
            this.showImportedSettingsNotification();
        }
    }
    
    /**
     * Show notification about imported settings
     */
    showImportedSettingsNotification() {
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 bg-purple-500 text-white px-4 py-2 rounded-md shadow-lg z-50';
        notification.innerHTML = `
            <div class="flex items-center">
                <span class="mr-2">📄</span>
                <span>Using imported PDF settings as baseline</span>
            </div>
        `;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 5000);
    }
    
    /**
     * Show specific form step
     * @param {number} step - Step number
     */
    showStep(step) {
        // Hide all sections
        document.querySelectorAll('.form-section').forEach(section => {
            section.classList.remove('active');
        });
        
        // Show current section
        let sections = ['vehicle', 'battery', 'wheel', 'environment', 'priorities'];
        if (this.isWeekendOuting) {
            sections = ['vehicle', 'battery', 'wheel', 'environment', 'priorities', 'trip-planning'];
        }
        const currentSection = document.getElementById(`${sections[step - 1]}-section`);
        if (currentSection) {
            currentSection.classList.add('active');
        }
        
        // Update navigation button visibility
        const prevBtn = document.getElementById('prev-step-btn');
        const nextBtn = document.getElementById('next-step-btn');
        
        if (prevBtn) {
            prevBtn.style.display = step > 1 ? 'block' : 'none';
        }
        
        if (nextBtn) {
            nextBtn.textContent = step < this.totalSteps ? 'Next Step' : 'Get Results';
        }
        
        // Show main navigation for all steps except vehicle (step 1)
        const navContainer = document.querySelector('#main-form .mt-8.flex.justify-between');
        if (navContainer) {
            navContainer.style.display = step === 1 ? 'none' : 'flex';
        }
        
        this.currentStep = step;
        this.updateProgressBar();
    }
    
    /**
     * Update progress bar
     */
    updateProgressBar() {
        const progressBar = document.getElementById('progress-bar');
        const progressText = document.getElementById('progress-text');
        
        const progress = (this.currentStep / this.totalSteps) * 100;
        progressBar.style.width = `${progress}%`;
        progressText.textContent = `Step ${this.currentStep} of ${this.totalSteps}`;
    }
    
    /**
     * Navigate to next step
     */
    nextStep() {
        // Validate current step
        const validation = this.validateCurrentStep();
        
        if (!validation.isValid) {
            this.showValidationErrors(validation.errors);
            return;
        }
        
        // Save current step data
        this.saveCurrentStepData();
        
        // Move to next step or show results
        if (this.currentStep < this.totalSteps) {
            this.currentStep++;
            this.showStep(this.currentStep);
        } else {
            this.runOptimization();
        }
    }
    
    /**
     * Navigate to previous step
     */
    previousStep() {
        if (this.currentStep > 1) {
            this.currentStep--;
            this.showStep(this.currentStep);
        }
    }
    
    /**
     * Validate current step
     * @returns {Object} Validation result
     */
    validateCurrentStep() {
        let sections = ['vehicle', 'battery', 'wheel', 'environment', 'priorities'];
        if (this.isWeekendOuting) {
            sections = ['vehicle', 'battery', 'wheel', 'environment', 'priorities', 'trip-planning'];
        }
        const currentSection = sections[this.currentStep - 1];
        
        // Save current form data to a temporary object
        const tempData = { ...this.inputData };
        this.saveCurrentStepData(tempData);
        
        // For step-by-step validation, we need to create a partial data object
        // that only contains data up to the current step
        const partialData = {};
        
        // Add all sections up to and including the current step
        for (let i = 0; i < this.currentStep; i++) {
            const section = sections[i];
            if (tempData[section]) {
                partialData[section] = tempData[section];
            }
        }
        
        // For the current section, ensure it exists even if empty
        if (!partialData[currentSection]) {
            partialData[currentSection] = {};
        }
        
        // Create a custom validation that only checks the current section
        return this.validateSectionOnly(currentSection, partialData[currentSection]);
    }
    
    /**
     * Save current step data
     * @param {Object} targetData - Target data object (optional)
     */
    saveCurrentStepData(targetData = null) {
        const data = targetData || this.inputData;
        let sections = ['vehicle', 'battery', 'wheel', 'environment', 'priorities'];
        if (this.isWeekendOuting) {
            sections = ['vehicle', 'battery', 'wheel', 'environment', 'priorities', 'trip-planning'];
        }
        const currentSection = sections[this.currentStep - 1];
        
        switch (currentSection) {
            case 'vehicle':
                data.vehicle = {
                    model: document.getElementById('vehicle-model')?.value,
                    topSpeed: document.getElementById('top-speed')?.value,
                    motorCondition: document.getElementById('motor-condition')?.value
                };
                break;
                
            case 'battery':
                data.battery = {
                    type: document.getElementById('battery-type')?.value,
                    voltage: document.getElementById('battery-voltage')?.value,
                    capacity: document.getElementById('battery-capacity')?.value,
                    age: document.getElementById('battery-age')?.value
                };
                break;
                
            case 'wheel':
                data.wheel = {
                    tireDiameter: document.getElementById('tire-diameter')?.value,
                    gearRatio: document.getElementById('gear-ratio')?.value || '8.91'
                };
                break;
                
            case 'environment':
                data.environment = {
                    terrain: document.getElementById('terrain')?.value,
                    vehicleLoad: document.getElementById('vehicle-load')?.value,
                    temperatureRange: document.getElementById('temperature-range')?.value,
                    hillGrade: document.getElementById('hill-grade')?.value
                };
                break;
                
            case 'priorities':
                // Priorities are already saved in real-time via slider events
                break;
                
            case 'trip-planning':
                data.tripPlanning = {
                    location: document.getElementById('trip-location')?.value,
                    date: document.getElementById('trip-date')?.value,
                    eventType: document.getElementById('event-type')?.value,
                    groupSize: document.getElementById('group-size')?.value,
                    cargoLoad: document.getElementById('cargo-load')?.value
                };
                // Analyze trip data when leaving this step
                if (data.tripPlanning.location && data.tripPlanning.date) {
                    this.analyzeTripData();
                }
                break;
        }
    }
    
    /**
     * Show validation errors
     * @param {Array} errors - Array of error objects
     */
    showValidationErrors(errors) {
        // Clear previous errors
        document.querySelectorAll('.validation-message').forEach(msg => {
            msg.classList.add('hidden');
            msg.textContent = '';
        });
        
        document.querySelectorAll('.validation-error').forEach(field => {
            field.classList.remove('validation-error');
        });
        
        // Show new errors
        errors.forEach(error => {
            const fieldParts = error.field.split('.');
            const fieldName = fieldParts[fieldParts.length - 1];
            const field = document.getElementById(fieldName.replace(/([A-Z])/g, '-$1').toLowerCase());
            const errorMsg = document.getElementById(`${fieldName.replace(/([A-Z])/g, '-$1').toLowerCase()}-error`);
            
            if (field) {
                field.classList.add('validation-error');
            }
            
            if (errorMsg) {
                errorMsg.textContent = error.message;
                errorMsg.classList.remove('hidden');
            }
        });
    }
    
    /**
     * Run optimization
     */
    runOptimization() {
        // Save final step data
        this.saveCurrentStepData();
        
        // Validate all data
        const validation = this.validation.validateConfiguration(this.inputData);
        if (!validation.isValid) {
            this.showValidationErrors(validation.errors);
            return;
        }
        
        // Show loading screen
        this.showLoadingScreen();
        
        // Run optimization
        setTimeout(() => {
            // Use imported settings as baseline if available
            let results = this.optimizer.optimizeSettings(this.inputData, this.importedSettings);
            
            // Apply Weekend Outing preset settings if applicable
            if (this.isWeekendOuting) {
                const preset = this.presetsManager.getPreset('weekend-outing');
                if (preset && preset.settings) {
                    Object.keys(preset.settings).forEach(funcNum => {
                        results.optimizedSettings[funcNum] = preset.settings[funcNum];
                    });
                }
                
                // Apply trip-specific recommendations
                if (this.inputData.tripRecommendations) {
                    const recommendations = this.inputData.tripRecommendations;
                    
                    // Adjust settings based on weather
                    if (recommendations.settings.temperatureMode === 'hot') {
                        results.optimizedSettings[4] = Math.min(results.optimizedSettings[4] - 10, 235);
                        results.optimizedSettings[6] = Math.min(results.optimizedSettings[6] + 5, 75);
                    }
                    
                    // Adjust for terrain
                    if (recommendations.settings.hillMode === 'steep') {
                        results.optimizedSettings[7] = Math.min(results.optimizedSettings[7] + 5, 85);
                        results.optimizedSettings[24] = Math.min(results.optimizedSettings[24] + 5, 70);
                    }
                    
                    // Adjust for range mode
                    if (recommendations.settings.rangeMode === 'extended') {
                        results.optimizedSettings[3] = Math.min(results.optimizedSettings[3] + 2, 25);
                        results.optimizedSettings[9] = Math.max(results.optimizedSettings[9] + 5, 245);
                    }
                    
                    // Add trip recommendations to performance changes
                    if (recommendations.tips.length > 0) {
                        results.performanceChanges.push('Trip-specific optimizations applied');
                    }
                }
            }
            
            this.showResults(results);
        }, 1500);
    }
    
    /**
     * Show loading screen
     */
    showLoadingScreen() {
        document.getElementById('main-form').classList.add('hidden');
        document.getElementById('preset-section').classList.add('hidden');
        
        const resultsSection = document.getElementById('results-section');
        resultsSection.classList.remove('hidden');
        resultsSection.innerHTML = `
            <div class="flex flex-col items-center justify-center py-16">
                <div class="spinner mb-4"></div>
                <p class="text-lg text-gray-600">Optimizing your controller settings...</p>
                <p class="text-sm text-gray-500 mt-2">Analyzing configuration and calculating optimal parameters</p>
            </div>
        `;
    }
    
    /**
     * Show optimization results
     * @param {Object} results - Optimization results
     */
    showResults(results) {
        const resultsSection = document.getElementById('results-section');
        resultsSection.innerHTML = this.generateResultsHTML(results);
        
        // Attach result action listeners
        this.attachResultActionListeners(results);
    }
    
    /**
     * Generate results HTML
     * @param {Object} results - Optimization results
     * @returns {string} HTML string
     */
    generateResultsHTML(results) {
        const changedSettings = Object.keys(results.optimizedSettings).filter(
            key => results.optimizedSettings[key] !== results.factorySettings[key]
        );
        
        return `
            <div class="bg-white rounded-lg shadow-lg p-6 mb-8">
                <h2 class="text-2xl font-bold mb-6">Optimization Results</h2>
                
                <!-- Summary -->
                <div class="bg-green-50 border-l-4 border-green-400 p-4 mb-6">
                    <div class="flex">
                        <div class="flex-shrink-0">
                            <svg class="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                            </svg>
                        </div>
                        <div class="ml-3">
                            <h3 class="text-sm font-medium text-green-800">Optimization Complete</h3>
                            <p class="mt-2 text-sm text-green-700">
                                ${changedSettings.length} parameters optimized for your configuration
                            </p>
                        </div>
                    </div>
                </div>
                
                <!-- Performance Changes -->
                ${results.performanceChanges.length > 0 ? `
                    <div class="mb-6">
                        <h3 class="text-lg font-semibold mb-3">Expected Performance Changes</h3>
                        <ul class="space-y-2">
                            ${results.performanceChanges.map(change => `
                                <li class="flex items-start">
                                    <svg class="h-5 w-5 text-green-500 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                    </svg>
                                    <span class="text-gray-700">${change}</span>
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                ` : ''}
                
                <!-- Settings Table -->
                <div class="mb-6">
                    <h3 class="text-lg font-semibold mb-3">Optimized Controller Settings</h3>
                    <div class="overflow-x-auto">
                        <table class="min-w-full divide-y divide-gray-200">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Function</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Factory</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Optimized</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Change</th>
                                </tr>
                            </thead>
                            <tbody class="bg-white divide-y divide-gray-200">
                                ${this.generateSettingsRows(results)}
                            </tbody>
                        </table>
                    </div>
                </div>
                
                <!-- Actions -->
                <div class="flex flex-col sm:flex-row gap-4">
                    <button id="download-pdf-btn" class="flex-1 px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">
                        <svg class="inline-block w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                        </svg>
                        Download PDF Report
                    </button>
                    
                    <button id="export-config-btn" class="flex-1 px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                        <svg class="inline-block w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V2"></path>
                        </svg>
                        Export Configuration
                    </button>
                    
                    <button id="new-optimization-btn" class="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">
                        <svg class="inline-block w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                        </svg>
                        New Optimization
                    </button>
                </div>
                
                <!-- Implementation Instructions -->
                <div class="mt-8 bg-gray-50 rounded-lg p-6">
                    <h3 class="text-lg font-semibold mb-4">Implementation Instructions</h3>
                    <ol class="list-decimal list-inside space-y-2 text-sm text-gray-700">
                        <li>Save your original settings using GE Sentry software before making changes</li>
                        <li>Connect to your controller with the programming cable</li>
                        <li>With key switch OFF and battery disconnect ON, modify each function value</li>
                        <li>After all changes, turn battery disconnect OFF for several minutes</li>
                        <li>Turn battery disconnect ON and test gradually starting with low speeds</li>
                        <li>Monitor motor temperature during initial drives</li>
                    </ol>
                </div>
            </div>
        `;
    }
    
    /**
     * Generate settings table rows
     * @param {Object} results - Optimization results
     * @returns {string} HTML string
     */
    generateSettingsRows(results) {
        const rows = [];
        
        Object.keys(results.optimizedSettings).forEach(funcNum => {
            const factoryVal = results.factorySettings[funcNum];
            const optimizedVal = results.optimizedSettings[funcNum];
            const description = this.optimizer.functionDescriptions[funcNum];
            
            if (factoryVal !== optimizedVal) {
                const changeClass = optimizedVal > factoryVal ? 'increase' : 'decrease';
                const changeSymbol = optimizedVal > factoryVal ? '↑' : '↓';
                
                rows.push(`
                    <tr class="parameter-row">
                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">F${funcNum}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${description}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${factoryVal}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${optimizedVal}</td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm">
                            <span class="${changeClass}">${changeSymbol} ${Math.abs(optimizedVal - factoryVal)}</span>
                        </td>
                    </tr>
                `);
            }
        });
        
        return rows.join('');
    }
    
    /**
     * Attach result action listeners
     * @param {Object} results - Optimization results
     */
    attachResultActionListeners(results) {
        // Download PDF
        document.getElementById('download-pdf-btn')?.addEventListener('click', () => {
            this.pdfGenerator.generatePDF(results);
        });
        
        // Export configuration
        document.getElementById('export-config-btn')?.addEventListener('click', () => {
            this.exportConfiguration(results);
        });
        
        // New optimization
        document.getElementById('new-optimization-btn')?.addEventListener('click', () => {
            this.resetOptimizer();
        });
    }
    
    /**
     * Export configuration
     * @param {Object} results - Optimization results
     */
    exportConfiguration(results) {
        const exportData = {
            version: '1.0',
            timestamp: new Date().toISOString(),
            inputData: results.inputData,
            optimizedSettings: results.optimizedSettings,
            performanceChanges: results.performanceChanges
        };
        
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportFileDefaultName = `gem-optimizer-${new Date().toISOString().split('T')[0]}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    }
    
    /**
     * Import configuration
     * @param {File} file - Configuration file
     */
    importConfiguration(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                if (data.version !== '1.0') {
                    alert('Incompatible configuration file version');
                    return;
                }
                
                this.inputData = data.inputData;
                const results = {
                    factorySettings: this.optimizer.factoryDefaults,
                    optimizedSettings: data.optimizedSettings,
                    performanceChanges: data.performanceChanges,
                    inputData: data.inputData
                };
                
                this.showResults(results);
            } catch (error) {
                alert('Error reading configuration file');
                console.error(error);
            }
        };
        reader.readAsText(file);
    }
    
    /**
     * Reset optimizer
     */
    resetOptimizer() {
        this.currentStep = 1;
        this.totalSteps = 5;
        this.isWeekendOuting = false;
        this.inputData = this.getDefaultInputData();
        this.showPresets();
    }
    
    /**
     * Get default input data
     * @returns {Object} Default input data
     */
    getDefaultInputData() {
        return {
            vehicle: {
                model: '',
                topSpeed: '25',
                motorCondition: 'good'
            },
            battery: {
                type: 'lead',
                voltage: '72',
                capacity: '150',
                age: 'good'
            },
            wheel: {
                tireDiameter: '22',
                gearRatio: '8.91'
            },
            environment: {
                terrain: 'mixed',
                vehicleLoad: 'medium',
                temperatureRange: 'mild',
                hillGrade: '10'
            },
            priorities: {
                range: 5,
                speed: 5,
                acceleration: 5,
                hillClimbing: 5,
                regen: 5
            },
            tripPlanning: {
                location: '',
                date: '',
                eventType: '',
                groupSize: 'couple',
                cargoLoad: 'light'
            }
        };
    }
    
    /**
     * Attach form listeners
     */
    /**
     * Validate only a specific section
     * @param {string} section - Section name
     * @param {Object} sectionData - Section data
     * @returns {Object} Validation result
     */
    validateSectionOnly(section, sectionData) {
        const errors = [];
        
        switch (section) {
            case 'vehicle':
                if (!sectionData.model) {
                    errors.push({
                        field: 'vehicle.model',
                        message: 'Vehicle model is required'
                    });
                }
                break;
                
            case 'battery':
                if (!sectionData.voltage) {
                    errors.push({
                        field: 'battery.voltage',
                        message: 'Battery voltage is required'
                    });
                }
                break;
                
            case 'wheel':
                if (!sectionData.tireDiameter) {
                    errors.push({
                        field: 'wheel.tireDiameter',
                        message: 'Tire diameter is required'
                    });
                }
                break;
                
            case 'environment':
                // No required fields for environment
                break;
                
            case 'priorities':
                // No required fields for priorities
                break;
                
            case 'trip-planning':
                if (!sectionData.location) {
                    errors.push({
                        field: 'tripPlanning.location',
                        message: 'Destination location is required'
                    });
                }
                if (!sectionData.date) {
                    errors.push({
                        field: 'tripPlanning.date',
                        message: 'Trip date is required'
                    });
                }
                if (!sectionData.eventType) {
                    errors.push({
                        field: 'tripPlanning.eventType',
                        message: 'Event type is required'
                    });
                }
                break;
        }
        
        // Also run section-specific validation from the validation system
        const validation = this.validation.validateConfiguration({ [section]: sectionData });
        
        // Combine errors, but filter out errors about missing other sections
        const filteredErrors = validation.errors.filter(error => {
            // Only include errors for the current section
            return error.field.startsWith(section) || error.field === section;
        });
        
        return {
            isValid: errors.length === 0 && filteredErrors.length === 0,
            errors: [...errors, ...filteredErrors],
            warnings: validation.warnings || []
        };
    }
    
    /**
     * Analyze trip data and show recommendations
     */
    async analyzeTripData() {
        const tripData = this.inputData.tripPlanning;
        const analysisDiv = document.getElementById('trip-analysis');
        const contentDiv = document.getElementById('trip-analysis-content');
        
        // Show loading state
        analysisDiv.classList.remove('hidden');
        contentDiv.innerHTML = '<div class="text-center">Analyzing trip data...</div>';
        
        try {
            // Get weather data
            const weatherData = await this.tripPlanner.getWeatherData(
                tripData.location,
                new Date(tripData.date)
            );
            
            // Get terrain data (simplified for now)
            const terrainData = this.tripPlanner.getDefaultTerrain();
            
            // Generate recommendations
            const recommendations = this.tripPlanner.generateRecommendations(
                { weather: weatherData, terrain: terrainData, eventType: tripData.eventType },
                this.inputData
            );
            
            // Display analysis
            let html = '<div class="space-y-3">';
            
            // Weather info
            html += `
                <div>
                    <strong>Weather Forecast:</strong><br>
                    Temperature: ${weatherData.temperature.min}°F - ${weatherData.temperature.max}°F<br>
                    Conditions: ${weatherData.conditions.replace('_', ' ')}<br>
                    Precipitation: ${weatherData.precipitation.probability}% chance
                </div>
            `;
            
            // Terrain info
            html += `
                <div>
                    <strong>Terrain Analysis:</strong><br>
                    Distance: ${terrainData.totalDistance} miles<br>
                    Max Grade: ${terrainData.maxGrade}%<br>
                    Terrain Type: ${terrainData.terrainType.replace('_', ' ')}
                </div>
            `;
            
            // Recommendations
            if (recommendations.tips.length > 0) {
                html += '<div><strong>Recommendations:</strong><ul class="list-disc list-inside mt-1">';
                recommendations.tips.forEach(tip => {
                    html += `<li>${tip}</li>`;
                });
                html += '</ul></div>';
            }
            
            // Warnings
            if (recommendations.warnings.length > 0) {
                html += '<div class="text-orange-700"><strong>Warnings:</strong><ul class="list-disc list-inside mt-1">';
                recommendations.warnings.forEach(warning => {
                    html += `<li>${warning}</li>`;
                });
                html += '</ul></div>';
            }
            
            html += '</div>';
            contentDiv.innerHTML = html;
            
            // Store recommendations for optimization
            this.inputData.tripRecommendations = recommendations;
            
        } catch (error) {
            contentDiv.innerHTML = `
                <div class="text-red-600">
                    Error analyzing trip data. Using default settings.
                </div>
            `;
        }
    }
    
    attachFormListeners() {
        // Add change listeners for all form inputs to clear validation errors
        const formInputs = document.querySelectorAll('input, select, textarea');
        formInputs.forEach(input => {
            input.addEventListener('change', () => {
                input.classList.remove('validation-error');
                const errorMsg = document.getElementById(`${input.id}-error`);
                if (errorMsg) {
                    errorMsg.classList.add('hidden');
                    errorMsg.textContent = '';
                }
            });
        });
    }
    
    /**
     * Attach trip planning listeners
     */
    attachTripPlanningListeners() {
        // Set minimum date to today
        const tripDateInput = document.getElementById('trip-date');
        if (tripDateInput) {
            const today = new Date().toISOString().split('T')[0];
            tripDateInput.setAttribute('min', today);
        }
        
        // Auto-analyze when key fields change
        const tripInputs = ['trip-location', 'trip-date', 'event-type'];
        tripInputs.forEach(inputId => {
            const input = document.getElementById(inputId);
            if (input) {
                input.addEventListener('change', () => {
                    // Delay analysis to allow form validation
                    setTimeout(() => {
                        const location = document.getElementById('trip-location')?.value;
                        const date = document.getElementById('trip-date')?.value;
                        const eventType = document.getElementById('event-type')?.value;
                        
                        if (location && date && eventType) {
                            this.saveCurrentStepData();
                            this.analyzeTripData();
                        }
                    }, 500);
                });
            }
        });
    }
    
    /**
     * Attach export/import listeners
     */
    attachExportImportListeners() {
        // Create hidden file input for import
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.json';
        fileInput.style.display = 'none';
        document.body.appendChild(fileInput);
        
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.importConfiguration(e.target.files[0]);
            }
        });
        
        // Add import button to header (you can add this to the HTML)
        // For now, we'll use a keyboard shortcut
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'i') {
                e.preventDefault();
                fileInput.click();
            }
        });
    }

    /**
     * Handle preset selection - called by preset card buttons
     * @param {string} presetName - Name of the preset
     * @param {boolean} isInteractive - Whether this is an interactive preset
     */
    handlePresetSelection(presetName, isInteractive) {
        if (isInteractive && presetName === 'weekend-outing') {
            // Launch trip planner for Weekend Outing preset
            this.launchTripPlanner();
        } else {
            // Apply regular preset
            this.selectPreset(presetName);
        }
    }

    /**
     * Launch the trip planner wizard
     */
    launchTripPlanner() {
        // Select the Weekend Outing preset visually
        document.querySelectorAll('.preset-card').forEach(card => {
            card.classList.remove('selected');
        });
        document.querySelector('[data-preset="weekend-outing"]')?.classList.add('selected');
        
        // Initialize trip planner if not already done
        if (!window.tripPlanner) {
            window.tripPlanner = new TripPlanner();
        }
        
        // Open the trip planner modal
        window.tripPlanner.openModal();
    }

    /**
     * Show trip planner introduction
     */
    showTripPlannerIntro() {
        // Add a brief intro overlay or update the UI to indicate trip planning mode
        const mainForm = document.getElementById('main-form');
        if (mainForm) {
            const existingIntro = mainForm.querySelector('.trip-planner-intro');
            if (!existingIntro) {
                const introDiv = document.createElement('div');
                introDiv.className = 'trip-planner-intro bg-blue-50 border-l-4 border-blue-400 p-4 mb-6';
                introDiv.innerHTML = `
                    <div class="flex">
                        <div class="flex-shrink-0">
                            <svg class="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
                            </svg>
                        </div>
                        <div class="ml-3">
                            <h3 class="text-sm font-medium text-blue-800">📅 Weekend Outing Trip Planner</h3>
                            <p class="mt-2 text-sm text-blue-700">
                                This wizard will gather your vehicle info, destination details, and trip requirements to create 
                                optimized controller settings with weather and terrain considerations.
                            </p>
                        </div>
                    </div>
                `;
                mainForm.insertBefore(introDiv, mainForm.firstChild);
            }
        }
    }
}
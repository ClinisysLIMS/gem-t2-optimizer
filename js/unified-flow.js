/**
 * Unified Flow Controller
 * Manages the streamlined configuration process for GEM T2 Optimizer
 */
class UnifiedFlowController {
    constructor() {
        this.currentStep = 1;
        this.vehicleData = {};
        this.tripData = {};
        this.pdfSettings = null;
        
        // Initialize components with error checking
        try {
            this.classifier = typeof VehicleClassifier !== 'undefined' ? new VehicleClassifier() : null;
        } catch (error) {
            console.warn('VehicleClassifier not available:', error);
            this.classifier = null;
        }
        
        try {
            this.optimizer = typeof GEMOptimizer !== 'undefined' ? new GEMOptimizer() : null;
        } catch (error) {
            console.warn('GEMOptimizer not available:', error);
            this.optimizer = null;
        }
        
        try {
            this.pdfParser = typeof PDFParser !== 'undefined' ? new PDFParser() : null;
        } catch (error) {
            console.warn('PDFParser not available:', error);
            this.pdfParser = null;
        }
        
        this.init();
    }

    /**
     * Initialize the application
     */
    init() {
        this.setupEventListeners();
        this.loadSavedData();
        this.updateVehicleClassification();
        
        // Initialize services
        if (typeof WeatherService !== 'undefined') {
            this.weatherService = new WeatherService();
        }
        if (typeof TerrainService !== 'undefined') {
            this.terrainService = new TerrainService();
        }
        if (typeof TripOptimizer !== 'undefined' && this.optimizer) {
            this.tripOptimizer = new TripOptimizer(this.optimizer);
        }
        
        // Listen for Firebase profile events
        window.addEventListener('authStateChanged', (e) => {
            this.handleAuthStateChange(e.detail.user);
        });
        
        // Listen for manual settings input
        window.addEventListener('manualSettingsLoaded', (e) => {
            this.handleManualSettings(e.detail.settings, e.detail.source);
        });
    }

    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        // Vehicle Information
        document.getElementById('vehicle-model')?.addEventListener('change', (e) => {
            this.vehicleData.model = e.target.value;
            this.validateStep1();
            this.saveData();
        });

        document.getElementById('vehicle-year')?.addEventListener('change', (e) => {
            this.vehicleData.year = e.target.value;
            this.validateStep1();
            this.saveData();
        });

        document.getElementById('controller-type')?.addEventListener('change', (e) => {
            this.vehicleData.controller = e.target.value;
            this.validateCompatibility();
            this.validateStep1();
            this.saveData();
        });

        document.getElementById('motor-type')?.addEventListener('change', (e) => {
            this.vehicleData.motorType = e.target.value;
            this.validateCompatibility();
            this.validateStep1();
            this.saveData();
        });

        document.getElementById('current-speed')?.addEventListener('input', (e) => {
            this.vehicleData.currentSpeed = parseInt(e.target.value) || 25;
            this.updateVehicleClassification();
            this.validateStep1();
            this.saveData();
        });

        // Battery & Drivetrain Configuration
        document.getElementById('battery-voltage')?.addEventListener('change', (e) => {
            this.vehicleData.batteryVoltage = parseInt(e.target.value);
            this.validateStep1();
            this.saveData();
        });

        document.getElementById('battery-type')?.addEventListener('change', (e) => {
            this.vehicleData.batteryType = e.target.value;
            this.validateStep1();
            this.saveData();
        });

        document.getElementById('battery-capacity')?.addEventListener('input', (e) => {
            this.vehicleData.batteryCapacity = parseInt(e.target.value);
            this.validateStep1();
            this.saveData();
        });

        document.getElementById('tire-diameter')?.addEventListener('input', (e) => {
            this.vehicleData.tireDiameter = parseFloat(e.target.value);
            this.validateStep1();
            this.saveData();
        });

        document.getElementById('gear-ratio')?.addEventListener('input', (e) => {
            this.vehicleData.gearRatio = e.target.value;
            this.validateStep1();
            this.saveData();
        });

        // PDF Upload
        const pdfInput = document.getElementById('settings-pdf');
        const pdfUploadArea = document.getElementById('pdf-upload-area');
        
        if (pdfInput && pdfUploadArea) {
            pdfInput.addEventListener('change', (e) => this.handlePDFUpload(e));
            
            // Drag and drop
            pdfUploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                pdfUploadArea.classList.add('border-green-400', 'bg-green-50');
            });
            
            pdfUploadArea.addEventListener('dragleave', (e) => {
                e.preventDefault();
                pdfUploadArea.classList.remove('border-green-400', 'bg-green-50');
            });
            
            pdfUploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                pdfUploadArea.classList.remove('border-green-400', 'bg-green-50');
                const file = e.dataTransfer.files[0];
                if (file && file.type === 'application/pdf') {
                    this.processPDFFile(file);
                }
            });
        }

        // Navigation
        document.getElementById('continue-to-planning')?.addEventListener('click', () => {
            if (this.validateStep1()) {
                this.showStep(2);
            }
        });

        document.getElementById('back-to-vehicle')?.addEventListener('click', () => {
            this.showStep(1);
        });

        document.getElementById('generate-settings')?.addEventListener('click', () => {
            this.generateOptimizedSettings();
        });

        // Quick Actions
        document.querySelectorAll('.quick-action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.currentTarget.dataset.action;
                this.handleQuickAction(action);
            });
        });

        // Trip Planning Inputs
        document.getElementById('trip-destination')?.addEventListener('input', (e) => {
            this.tripData.destination = e.target.value;
            this.saveData();
        });

        document.getElementById('trip-date')?.addEventListener('change', (e) => {
            this.tripData.date = e.target.value;
            this.saveData();
        });

        document.getElementById('trip-type')?.addEventListener('change', (e) => {
            this.tripData.type = e.target.value;
            this.saveData();
        });

        document.getElementById('passengers')?.addEventListener('change', (e) => {
            this.tripData.passengers = e.target.value;
            this.saveData();
        });

        document.getElementById('cargo')?.addEventListener('change', (e) => {
            this.tripData.cargo = e.target.value;
            this.saveData();
        });

        // MCP Configuration
        document.getElementById('enable-mcp')?.addEventListener('click', () => {
            this.showMCPConfiguration();
        });
    }

    /**
     * Validate Step 1 (Vehicle Information)
     */
    validateStep1() {
        const required = ['model', 'year', 'controller', 'motorType', 'currentSpeed', 
                         'batteryVoltage', 'batteryType', 'batteryCapacity', 
                         'tireDiameter', 'gearRatio'];
        const isValid = required.every(field => this.vehicleData[field]);
        
        const continueBtn = document.getElementById('continue-to-planning');
        if (continueBtn) {
            continueBtn.disabled = !isValid;
        }
        
        return isValid;
    }

    /**
     * Validate motor and controller compatibility
     */
    validateCompatibility() {
        if (!this.vehicleData.motorType || !this.vehicleData.controller) return;
        
        const compatibility = this.classifier.validateCompatibility(
            this.vehicleData.motorType,
            this.vehicleData.controller
        );
        
        // Show compatibility message
        const existingMsg = document.getElementById('compatibility-message');
        if (existingMsg) existingMsg.remove();
        
        if (!compatibility.compatible) {
            const motorSelect = document.getElementById('motor-type');
            const msg = document.createElement('div');
            msg.id = 'compatibility-message';
            msg.className = 'mt-2 p-2 bg-red-50 text-red-700 text-sm rounded';
            msg.innerHTML = `
                <strong>⚠️ Compatibility Issue:</strong> ${compatibility.message}
                ${compatibility.recommendation ? `<br>${compatibility.recommendation}` : ''}
            `;
            motorSelect.parentElement.appendChild(msg);
        }
    }

    /**
     * Update vehicle classification display
     */
    updateVehicleClassification() {
        const speed = this.vehicleData.currentSpeed || 25;
        const classification = this.classifier.classifyBySpeed(speed);
        
        const resultDiv = document.getElementById('classification-result');
        if (resultDiv) {
            let content = `
                <span class="font-semibold">${classification.icon} ${classification.name}</span>
                <p class="text-xs text-gray-600 mt-1">
                    Speed: ${speed} MPH | ${classification.requirements}
                </p>
            `;
            
            if (classification.info) {
                content += `
                    <div class="mt-2 text-xs space-y-1">
                        <p class="text-blue-700 font-medium">${classification.note}</p>
                        <p class="text-gray-600">${classification.guidance}</p>
                        <a href="${classification.legalLink}" target="_blank" rel="noopener noreferrer" 
                           class="text-blue-600 hover:text-blue-800 underline inline-flex items-center">
                            Check local laws
                            <svg class="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                            </svg>
                        </a>
                    </div>
                `;
            } else if (classification.warning) {
                content += `<p class="text-xs text-red-600 mt-1 font-medium">${classification.note}</p>`;
            }
            
            resultDiv.innerHTML = content;
            
            const container = document.getElementById('vehicle-classification');
            if (container) {
                container.className = `p-4 rounded-lg ${
                    classification.info ? 'bg-blue-50' : 
                    classification.warning ? 'bg-red-50' : 'bg-gray-50'
                }`;
            }
        }
    }

    /**
     * Handle PDF file upload
     */
    async handlePDFUpload(event) {
        const file = event.target.files[0];
        if (file && file.type === 'application/pdf') {
            this.processPDFFile(file);
        }
    }

    /**
     * Process uploaded PDF file with comprehensive error handling
     */
    async processPDFFile(file) {
        const uploadArea = document.getElementById('pdf-upload-area');
        const resultDiv = document.getElementById('pdf-analysis-result');
        const contentDiv = document.getElementById('pdf-analysis-content');
        
        // Defensive programming - ensure DOM elements exist
        const safeUploadArea = uploadArea || document.createElement('div');
        const safeResultDiv = resultDiv || document.createElement('div');
        const safeContentDiv = contentDiv || document.createElement('div');
        
        try {
            // Validate file input
            if (!file) {
                throw new Error('No file provided');
            }
            
            if (file.type !== 'application/pdf') {
                throw new Error(`Invalid file type: ${file.type}. Please select a PDF file.`);
            }
            
            if (file.size > 50 * 1024 * 1024) { // 50MB limit
                throw new Error('File too large. Please select a PDF smaller than 50MB.');
            }
            
            // Show processing state safely
            try {
                safeUploadArea.innerHTML = `
                    <div class="flex items-center justify-center p-4">
                        <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600 mr-3"></div>
                        <span class="text-sm text-gray-600">Analyzing PDF...</span>
                    </div>
                `;
            } catch (domError) {
                console.warn('Unable to update upload area UI:', domError);
            }
            
            // Critical dependency check
            if (!this.pdfParser) {
                throw new Error('PDF parsing service is not available. Please refresh the page and try again.');
            }
            
            // Attempt PDF parsing with timeout protection
            let result;
            try {
                const parsePromise = this.pdfParser.parsePDF(file);
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('PDF parsing timed out after 30 seconds')), 30000)
                );
                
                result = await Promise.race([parsePromise, timeoutPromise]);
            } catch (parseError) {
                console.error('PDF parsing failed:', parseError);
                throw new Error(`PDF parsing failed: ${parseError.message}`);
            }
            
            // Validate parsing result structure
            if (!result || typeof result !== 'object') {
                throw new Error('Invalid parsing result structure');
            }
            
            // Handle successful parsing
            if (result.success && result.settings && typeof result.settings === 'object') {
                const settingsCount = Object.keys(result.settings).length;
                
                if (settingsCount === 0) {
                    throw new Error('PDF contains no recognizable controller settings');
                }
                
                // Store settings safely
                this.pdfSettings = { ...result.settings };
                
                // Show success UI safely
                try {
                    this.showPDFSuccessUI(result, settingsCount);
                } catch (uiError) {
                    console.warn('Unable to update success UI:', uiError);
                }
                
                // Analyze settings safely
                try {
                    this.analyzePDFSettings(result.settings);
                } catch (analysisError) {
                    console.warn('Settings analysis failed:', analysisError);
                }
                
                return; // Success path complete
            }
            
            // Handle partial success with fallback data
            if (result.fallback && Array.isArray(result.fallback) && result.fallback.length > 0) {
                try {
                    const fallbackFormat = result.fallback[0];
                    if (fallbackFormat.settings && Object.keys(fallbackFormat.settings).length > 0) {
                        this.pdfSettings = { ...fallbackFormat.settings };
                        this.showPDFPartialSuccessUI(fallbackFormat);
                        this.analyzePDFSettings(fallbackFormat.settings);
                        return; // Partial success path complete
                    }
                } catch (fallbackError) {
                    console.warn('Fallback processing failed:', fallbackError);
                }
            }
            
            // No usable data found
            throw new Error(result.error || 'Unable to extract controller settings from this PDF format');
            
        } catch (error) {
            console.error('PDF processing error:', error);
            
            // Show comprehensive error UI with fallback options
            this.showPDFErrorUI(error, file);
            
            // Clear any stored PDF settings on error
            this.pdfSettings = null;
            
            // Auto-suggest manual entry fallback
            this.suggestManualEntryFallback(error);
        } finally {
            // Always restore upload area
            try {
                this.restoreUploadArea();
            } catch (restoreError) {
                console.warn('Unable to restore upload area:', restoreError);
            }
        }
    }
    
    /**
     * Show PDF success UI safely
     */
    showPDFSuccessUI(result, settingsCount) {
        const resultDiv = document.getElementById('pdf-analysis-result');
        const contentDiv = document.getElementById('pdf-analysis-content');
        
        if (resultDiv && contentDiv) {
            resultDiv.classList.remove('hidden');
            resultDiv.className = 'mt-4 p-3 bg-green-50 border border-green-200 rounded-md';
            
            const confidence = Math.round((result.metadata?.confidence || 0.8) * 100);
            const methods = result.metadata?.extractionMethods?.join(', ') || 'Multi-pattern';
            
            contentDiv.innerHTML = `
                <div class="flex items-start">
                    <span class="text-green-600 mr-2">✅</span>
                    <div class="flex-grow">
                        <h4 class="font-medium text-green-900">PDF Analysis Successful</h4>
                        <p class="text-sm text-green-700 mt-1">
                            Extracted ${settingsCount} controller settings with ${confidence}% confidence
                        </p>
                        <div class="text-xs text-green-600 mt-2 space-y-1">
                            <div>Extraction method: ${methods}</div>
                            <div>File: ${result.metadata?.fileName || 'Unknown'}</div>
                        </div>
                        <button onclick="unifiedFlow.showPDFDetails()" class="mt-2 text-xs text-green-600 hover:text-green-800 underline">
                            View detailed settings →
                        </button>
                    </div>
                </div>
            `;
        }
    }
    
    /**
     * Show PDF partial success UI
     */
    showPDFPartialSuccessUI(fallbackFormat) {
        const resultDiv = document.getElementById('pdf-analysis-result');
        const contentDiv = document.getElementById('pdf-analysis-content');
        
        if (resultDiv && contentDiv) {
            resultDiv.classList.remove('hidden');
            resultDiv.className = 'mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md';
            
            const settingsCount = Object.keys(fallbackFormat.settings).length;
            
            contentDiv.innerHTML = `
                <div class="flex items-start">
                    <span class="text-yellow-600 mr-2">⚠️</span>
                    <div class="flex-grow">
                        <h4 class="font-medium text-yellow-900">Partial PDF Analysis</h4>
                        <p class="text-sm text-yellow-700 mt-1">
                            Found ${settingsCount} settings using fallback parsing
                        </p>
                        <p class="text-xs text-yellow-600 mt-1">
                            Some settings may be missing. Consider manual entry for complete configuration.
                        </p>
                        <div class="mt-2 flex space-x-2">
                            <button onclick="unifiedFlow.acceptPartialResults()" class="text-xs bg-yellow-600 text-white px-2 py-1 rounded hover:bg-yellow-700">
                                Use These Settings
                            </button>
                            <button onclick="unifiedFlow.switchToManualEntry()" class="text-xs text-yellow-600 hover:text-yellow-800 underline">
                                Enter Manually Instead
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }
    }
    
    /**
     * Show comprehensive PDF error UI with actionable options
     */
    showPDFErrorUI(error, file) {
        const resultDiv = document.getElementById('pdf-analysis-result');
        const contentDiv = document.getElementById('pdf-analysis-content');
        
        if (resultDiv && contentDiv) {
            resultDiv.classList.remove('hidden');
            resultDiv.className = 'mt-4 p-3 bg-red-50 border border-red-200 rounded-md';
            
            // Categorize error for better user guidance
            const errorType = this.categorizeError(error);
            
            contentDiv.innerHTML = `
                <div class="flex items-start">
                    <span class="text-red-600 mr-2">❌</span>
                    <div class="flex-grow">
                        <h4 class="font-medium text-red-900">PDF Analysis Failed</h4>
                        <p class="text-sm text-red-700 mt-1">${errorType.userMessage}</p>
                        <div class="text-xs text-red-600 mt-1">
                            Technical details: ${error.message}
                        </div>
                        
                        <div class="mt-3 space-y-2">
                            <h5 class="text-sm font-medium text-red-900">What you can do:</h5>
                            <div class="space-y-1">
                                ${errorType.suggestions.map(suggestion => 
                                    `<div class="text-xs text-red-700">• ${suggestion}</div>`
                                ).join('')}
                            </div>
                        </div>
                        
                        <div class="mt-3 flex flex-wrap gap-2">
                            <button onclick="unifiedFlow.switchToManualEntry()" class="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">
                                📝 Enter Settings Manually
                            </button>
                            <button onclick="unifiedFlow.loadFactoryDefaults()" class="text-xs bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-700">
                                🏭 Use Factory Defaults
                            </button>
                            <button onclick="unifiedFlow.showSampleData()" class="text-xs bg-orange-600 text-white px-3 py-1 rounded hover:bg-orange-700">
                                🧪 Load Sample Data
                            </button>
                            <button onclick="unifiedFlow.downloadSamplePDF()" class="text-xs text-red-600 hover:text-red-800 underline">
                                📥 Download Format Example
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }
    }
    
    /**
     * Categorize errors for better user guidance
     */
    categorizeError(error) {
        const message = error.message.toLowerCase();
        
        if (message.includes('timeout')) {
            return {
                userMessage: 'PDF processing took too long and timed out.',
                suggestions: [
                    'Try a smaller PDF file',
                    'Ensure the PDF is not corrupted',
                    'Use manual entry for faster setup'
                ]
            };
        }
        
        if (message.includes('invalid file type') || message.includes('not a pdf')) {
            return {
                userMessage: 'The selected file is not a valid PDF.',
                suggestions: [
                    'Select a PDF file (.pdf extension)',
                    'Export directly from your controller software',
                    'Ensure the file is not corrupted'
                ]
            };
        }
        
        if (message.includes('too large')) {
            return {
                userMessage: 'The PDF file is too large to process.',
                suggestions: [
                    'Try compressing the PDF',
                    'Export only the settings page',
                    'Use manual entry instead'
                ]
            };
        }
        
        if (message.includes('no recognizable') || message.includes('no valid settings')) {
            return {
                userMessage: 'Could not find controller settings in the expected format.',
                suggestions: [
                    'Ensure PDF contains a table with function numbers (F.1, F.2, etc.)',
                    'Export directly from GEM programming software',
                    'Check that text is selectable (not a scanned image)',
                    'Try the manual entry option below'
                ]
            };
        }
        
        if (message.includes('service is not available') || message.includes('parser not available')) {
            return {
                userMessage: 'PDF parsing service is temporarily unavailable.',
                suggestions: [
                    'Refresh the page and try again',
                    'Check your internet connection',
                    'Use manual entry as an alternative'
                ]
            };
        }
        
        // Generic error
        return {
            userMessage: 'An unexpected error occurred while processing the PDF.',
            suggestions: [
                'Try refreshing the page',
                'Ensure the PDF is from GEM controller software',
                'Use manual entry to continue',
                'Contact support if the problem persists'
            ]
        };
    }
    
    /**
     * Suggest manual entry fallback after PDF error
     */
    suggestManualEntryFallback(error) {
        try {
            // Show a brief notification suggesting manual entry
            this.showNotification('💡 Pro tip: Use manual entry to quickly input the 7 most important settings!', 'info', 5000);
            
            // Automatically highlight manual entry button if it exists
            setTimeout(() => {
                const manualBtn = document.getElementById('manual-entry-btn');
                if (manualBtn) {
                    manualBtn.classList.add('ring-2', 'ring-blue-400', 'ring-opacity-75');
                    setTimeout(() => {
                        manualBtn.classList.remove('ring-2', 'ring-blue-400', 'ring-opacity-75');
                    }, 3000);
                }
            }, 1000);
            
        } catch (notificationError) {
            console.warn('Unable to show fallback suggestion:', notificationError);
        }
    }
    
    /**
     * Test PDF text extraction to verify it's working correctly
     */
    async testPDFTextExtraction(file) {
        if (!file) {
            console.error('No file provided for PDF text extraction test');
            return { success: false, error: 'No file provided' };
        }
        
        try {
            // Test basic PDF.js functionality
            if (typeof pdfjsLib === 'undefined') {
                throw new Error('PDF.js library not loaded');
            }
            
            const arrayBuffer = await file.arrayBuffer();
            if (!arrayBuffer || arrayBuffer.byteLength === 0) {
                throw new Error('Failed to read file content');
            }
            
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            if (!pdf || !pdf.numPages || pdf.numPages === 0) {
                throw new Error('PDF contains no readable pages');
            }
            
            // Extract text from first page as a test
            const page = await pdf.getPage(1);
            const textContent = await page.getTextContent();
            
            if (!textContent || !textContent.items || textContent.items.length === 0) {
                throw new Error('No extractable text found on first page');
            }
            
            // Build text from items
            let extractedText = '';
            textContent.items.forEach(item => {
                if (item && typeof item.str === 'string') {
                    extractedText += item.str + ' ';
                }
            });
            
            extractedText = extractedText.trim();
            
            if (!extractedText) {
                throw new Error('No text content extracted from PDF');
            }
            
            console.log('PDF text extraction test successful:', {
                fileName: file.name,
                fileSize: file.size,
                pageCount: pdf.numPages,
                firstPageTextLength: extractedText.length,
                textPreview: extractedText.substring(0, 200) + (extractedText.length > 200 ? '...' : '')
            });
            
            return {
                success: true,
                metadata: {
                    fileName: file.name,
                    fileSize: file.size,
                    pageCount: pdf.numPages,
                    textExtracted: true,
                    textLength: extractedText.length,
                    textPreview: extractedText.substring(0, 200)
                },
                fullText: extractedText
            };
            
        } catch (error) {
            console.error('PDF text extraction test failed:', error);
            return {
                success: false,
                error: error.message,
                details: {
                    fileName: file?.name || 'Unknown',
                    fileSize: file?.size || 0,
                    errorType: error.name || 'Unknown'
                }
            };
        }
    }
                
                let errorContent = `<h4 class="font-medium text-red-900 mb-2">❌ Analysis Failed</h4>`;
                errorContent += `<p class="text-sm text-red-700 mb-2">${error.message}</p>`;
                
                // Add suggestions if available
                if (result && result.suggestions) {
                    errorContent += `<div class="mt-3 text-xs text-red-600">
                        <p class="font-medium mb-1">Tips:</p>
                        <ul class="list-disc list-inside space-y-1">`;
                    result.suggestions.forEach(suggestion => {
                        errorContent += `<li>${suggestion}</li>`;
                    });
                    errorContent += `</ul></div>`;
                }
                
                contentDiv.innerHTML = errorContent;
            }
            this.restoreUploadArea();
        }
    }

    /**
     * Restore PDF upload area
     */
    restoreUploadArea() {
        const uploadArea = document.getElementById('pdf-upload-area');
        if (uploadArea) {
            uploadArea.innerHTML = `
                <svg class="mx-auto h-12 w-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                </svg>
                <p class="text-sm text-gray-600">
                    <label for="settings-pdf" class="cursor-pointer">
                        <span class="text-green-600 hover:text-green-500">Upload another PDF</span>
                        <span class="text-gray-500"> to update settings</span>
                    </label>
                </p>
                <input id="settings-pdf" type="file" accept=".pdf" class="hidden">
                <p class="text-xs text-gray-500 mt-2">Supports Sentry exports and optimization reports</p>
            `;
            
            // Re-attach listener
            document.getElementById('settings-pdf')?.addEventListener('change', (e) => this.handlePDFUpload(e));
        }
    }

    /**
     * Handle manually entered settings
     * @param {Object} settings - Manual settings object
     * @param {string} source - Source type ('manual', 'factory-defaults')
     */
    handleManualSettings(settings, source) {
        console.log(`Manual settings loaded from ${source}:`, settings);
        
        // Store the settings
        this.pdfSettings = settings;
        
        // Analyze settings same as PDF
        this.analyzeSettings(settings, source);
        
        // Show success message
        this.showSettingsLoadedMessage(source, Object.keys(settings).length);
    }

    /**
     * Analyze settings for insights (works for both PDF and manual entry)
     */
    analyzeSettings(settings, source = 'PDF') {
        // Basic analysis
        const analysis = {
            topSpeed: this.estimateTopSpeed(settings),
            profile: this.identifyProfile(settings),
            modifications: this.detectModifications(settings),
            source: source
        };
        
        // Store analysis
        this.vehicleData.currentSettings = settings;
        this.vehicleData.settingsAnalysis = analysis;
        
        // Update current speed if detected and different
        if (analysis.topSpeed && Math.abs(analysis.topSpeed - (this.vehicleData.currentSpeed || 25)) > 2) {
            const speedInput = document.getElementById('current-speed');
            if (speedInput) {
                speedInput.value = analysis.topSpeed;
                this.vehicleData.currentSpeed = analysis.topSpeed;
                this.updateVehicleClassification();
                
                // Show notification about speed update
                this.showNotification(`Updated top speed to ${analysis.topSpeed} MPH based on ${source} settings`, 'info');
            }
        }
        
        console.log(`Settings analysis complete for ${source}:`, analysis);
    }

    /**
     * Legacy method - now calls analyzeSettings
     */
    analyzePDFSettings(settings) {
        this.analyzeSettings(settings, 'PDF');
    }

    /**
     * Show settings loaded message
     */
    showSettingsLoadedMessage(source, count) {
        const sourceNames = {
            'manual': 'Manual Entry',
            'factory-defaults': 'Factory Defaults',
            'sample-data': 'Sample Configuration',
            'PDF': 'PDF Import'
        };
        
        const message = `${sourceNames[source] || source} loaded with ${count} settings`;
        console.log(message);
        
        // Could add visual notification here if needed
        if (typeof this.showNotification === 'function') {
            this.showNotification(message, 'success');
        }
    }

    /**
     * Show notification helper
     */
    showNotification(message, type = 'info') {
        // Simple console log for now - could be enhanced with visual notifications
        console.log(`[${type.toUpperCase()}] ${message}`);
        
        // Create a temporary visual notification
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 z-50 px-4 py-2 rounded-md text-sm max-w-sm ${
            type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' :
            type === 'warning' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
            type === 'error' ? 'bg-red-100 text-red-800 border border-red-200' :
            'bg-blue-100 text-blue-800 border border-blue-200'
        }`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }

    /**
     * Estimate top speed from settings
     */
    estimateTopSpeed(settings) {
        // F.1 is MPH Scaling, F.20 is MPH Overspeed
        const mphScaling = settings[1] || 100;
        const overspeed = settings[20] || 5;
        
        // Basic calculation
        const baseSpeed = 25 * (mphScaling / 100);
        return Math.round(baseSpeed + overspeed);
    }

    /**
     * Identify optimization profile from settings
     */
    identifyProfile(settings) {
        // Analyze key functions to determine profile
        const accelRate = settings[6] || 60;
        const maxCurrent = settings[4] || 245;
        const regenCurrent = settings[9] || 225;
        
        if (accelRate > 80 && maxCurrent > 260) {
            return 'performance';
        } else if (regenCurrent > 240 && accelRate < 50) {
            return 'efficiency';
        } else if (settings[11] && settings[11] < 15) {
            return 'turf';
        } else {
            return 'balanced';
        }
    }

    /**
     * Detect modifications from factory defaults
     */
    detectModifications(settings) {
        const defaults = {
            1: 100, 3: 15, 4: 245, 5: 5, 6: 60,
            7: 70, 8: 245, 9: 225, 10: 100, 11: 11
        };
        
        const mods = [];
        for (const [func, defaultValue] of Object.entries(defaults)) {
            if (settings[func] && Math.abs(settings[func] - defaultValue) > 5) {
                mods.push({
                    function: func,
                    factory: defaultValue,
                    current: settings[func],
                    change: Math.round(((settings[func] - defaultValue) / defaultValue) * 100)
                });
            }
        }
        
        return mods;
    }

    /**
     * Show PDF details modal
     */
    showPDFDetails() {
        if (!this.pdfSettings) return;
        
        // Create modal content
        const modalContent = `
            <div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                <div class="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
                    <h3 class="text-lg font-bold mb-4">Current Controller Settings</h3>
                    <div class="max-h-96 overflow-y-auto">
                        <table class="min-w-full divide-y divide-gray-200">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Function</th>
                                    <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                    <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Value</th>
                                    <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                </tr>
                            </thead>
                            <tbody class="bg-white divide-y divide-gray-200">
                                ${this.generateSettingsTableRows()}
                            </tbody>
                        </table>
                    </div>
                    <div class="mt-6 flex justify-end">
                        <button onclick="document.getElementById('pdf-details-modal').remove()" 
                                class="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400">
                            Close
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        const modal = document.createElement('div');
        modal.id = 'pdf-details-modal';
        modal.innerHTML = modalContent;
        document.body.appendChild(modal);
    }

    /**
     * Generate settings table rows
     */
    generateSettingsTableRows() {
        const functionNames = this.optimizer.getFunctionDescriptions();
        const mods = this.vehicleData.settingsAnalysis?.modifications || [];
        
        return Object.entries(this.pdfSettings)
            .sort(([a], [b]) => parseInt(a) - parseInt(b))
            .map(([func, value]) => {
                const mod = mods.find(m => m.function == func);
                const status = mod ? 
                    `<span class="text-xs ${mod.change > 0 ? 'text-green-600' : 'text-red-600'}">
                        ${mod.change > 0 ? '↑' : '↓'} ${Math.abs(mod.change)}%
                    </span>` : 
                    '<span class="text-xs text-gray-500">Default</span>';
                
                return `
                    <tr>
                        <td class="px-3 py-2 text-sm text-gray-900">F${func}</td>
                        <td class="px-3 py-2 text-sm text-gray-600">${functionNames[func] || 'Unknown'}</td>
                        <td class="px-3 py-2 text-sm font-medium text-gray-900">${value}</td>
                        <td class="px-3 py-2">${status}</td>
                    </tr>
                `;
            }).join('');
    }

    /**
     * Handle quick action buttons
     */
    handleQuickAction(action) {
        // Remove active state from all buttons
        document.querySelectorAll('.quick-action-btn').forEach(btn => {
            btn.classList.remove('border-green-400', 'bg-green-50');
        });
        
        // Add active state to clicked button
        const activeBtn = document.querySelector(`[data-action="${action}"]`);
        if (activeBtn) {
            activeBtn.classList.add('border-green-400', 'bg-green-50');
        }
        
        // Set trip data based on action
        switch (action) {
            case 'daily-commute':
                this.tripData.optimizationMode = 'efficiency';
                this.tripData.preset = 'commute';
                break;
            case 'weekend-outing':
                // Weekend outing now opens dedicated planner
                if (this.validateStep1()) {
                    window.location.href = 'weekend-planner.html';
                }
                return;
            case 'performance':
                this.tripData.optimizationMode = 'performance';
                this.tripData.preset = 'performance';
                break;
        }
        
        this.saveData();
    }

    /**
     * Generate optimized settings
     */
    async generateOptimizedSettings() {
        // Show loading state
        const resultsSection = document.getElementById('results-section');
        resultsSection.innerHTML = `
            <div class="bg-white rounded-lg shadow-lg p-6 text-center">
                <div class="spinner mx-auto mb-4"></div>
                <h3 class="text-lg font-semibold mb-2">Generating Optimized Settings...</h3>
                <p class="text-sm text-gray-600">Analyzing vehicle data and trip requirements</p>
            </div>
        `;
        resultsSection.classList.remove('hidden');
        this.showStep(3);
        
        try {
            // Prepare optimization data
            const profile = this.vehicleData.settingsAnalysis?.profile || 'balanced';
            const baseSettings = this.pdfSettings || this.optimizer.getFactoryDefaults();
            
            // Get optimization based on mode
            let optimizedSettings;
            if (this.tripData.preset === 'weekend' && this.tripData.destination) {
                // Use trip optimizer for weekend outings
                optimizedSettings = await this.optimizeTripSettings();
            } else {
                // Try MCP-enhanced optimization first
                try {
                    if (window.mcpConfig) {
                        const mcpResult = await window.mcpConfig.callTool('optimize_controller', {
                            vehicleData: this.vehicleData,
                            priorities: this.convertModeToPriorities(this.tripData.optimizationMode || profile),
                            baseline: baseSettings
                        });
                        
                        if (mcpResult.success) {
                            optimizedSettings = mcpResult.optimizedSettings;
                            console.log(`Controller optimization via ${mcpResult.source}`);
                        } else {
                            throw new Error('MCP optimization failed');
                        }
                    } else {
                        throw new Error('MCP not available');
                    }
                } catch (e) {
                    console.warn('MCP optimization failed, using local optimizer:', e);
                    // Fallback to standard optimization
                    optimizedSettings = this.optimizer.optimizeByMode(
                        baseSettings,
                        this.tripData.optimizationMode || profile,
                        this.vehicleData
                    );
                }
            }
            
            // Store optimized settings for sharing
            this.lastOptimizedSettings = optimizedSettings;
            
            // Display results
            this.displayResults(optimizedSettings);
            
            // Save trip to history if user is authenticated
            await this.saveTripToHistory(this.tripData, optimizedSettings);
            
        } catch (error) {
            console.error('Optimization error:', error);
            resultsSection.innerHTML = `
                <div class="bg-white rounded-lg shadow-lg p-6">
                    <div class="text-red-600 text-center">
                        <h3 class="text-lg font-semibold mb-2">Optimization Failed</h3>
                        <p class="text-sm">${error.message}</p>
                        <button onclick="unifiedFlow.showStep(2)" class="mt-4 text-blue-600 hover:underline">
                            ← Back to Planning
                        </button>
                    </div>
                </div>
            `;
        }
    }

    /**
     * Optimize settings for trip
     */
    async optimizeTripSettings() {
        if (!this.tripOptimizer) {
            throw new Error('Trip optimizer not available');
        }
        
        // Get weather and terrain data using MCP or fallback
        let conditions = {
            weather: { temperature: 75, conditions: 'Clear' },
            terrain: { type: 'mixed', maxGrade: 10 }
        };
        
        // Try MCP-enhanced data collection first
        if (window.mcpConfig && this.tripData.destination && this.tripData.date) {
            try {
                // Get enhanced weather data via MCP
                const weatherResult = await window.mcpConfig.callTool('get_weather', {
                    location: this.tripData.destination,
                    date: this.tripData.date
                });
                
                if (weatherResult.success) {
                    conditions.weather = weatherResult.weather;
                    console.log(`Weather data via ${weatherResult.source}:`, weatherResult.weather);
                }
                
                // Get terrain data via MCP
                const terrainResult = await window.mcpConfig.callTool('get_terrain', {
                    location: this.tripData.destination
                });
                
                if (terrainResult.success) {
                    conditions.terrain = terrainResult.terrain;
                    console.log(`Terrain data via ${terrainResult.source}:`, terrainResult.terrain);
                }
                
            } catch (e) {
                console.warn('MCP data collection failed, using defaults:', e);
            }
        }
        
        // Fallback to original weather service if needed
        if (!conditions.weather.source && this.weatherService?.isConfigured() && this.tripData.destination && this.tripData.date) {
            try {
                const weather = await this.weatherService.getWeatherForDate(
                    this.tripData.destination,
                    this.tripData.date
                );
                conditions.weather = weather;
            } catch (e) {
                console.warn('Weather fetch failed, using defaults', e);
            }
        }
        
        // Optimize for trip with enhanced conditions
        return this.tripOptimizer.optimizeForTrip({
            vehicleData: this.vehicleData,
            tripData: this.tripData,
            conditions,
            baseSettings: this.pdfSettings || this.optimizer.getFactoryDefaults()
        });
    }

    /**
     * Display optimization results
     */
    displayResults(settings) {
        const resultsSection = document.getElementById('results-section');
        const profile = this.classifier.generateVehicleProfile(this.vehicleData);
        
        resultsSection.innerHTML = `
            <div class="bg-white rounded-lg shadow-lg p-6 mb-8">
                <h2 class="text-2xl font-bold mb-6">Optimized Controller Settings</h2>
                
                <!-- Vehicle Summary -->
                <div class="mb-6 p-4 bg-gray-50 rounded-lg">
                    <h3 class="font-semibold mb-2">Vehicle Profile</h3>
                    <div class="grid md:grid-cols-3 gap-4 text-sm">
                        <div>
                            <span class="text-gray-600">Model:</span>
                            <span class="font-medium ml-1">${this.vehicleData.model?.toUpperCase()}</span>
                        </div>
                        <div>
                            <span class="text-gray-600">Classification:</span>
                            <span class="font-medium ml-1">${profile.summary.classification.name}</span>
                        </div>
                        <div>
                            <span class="text-gray-600">Optimization:</span>
                            <span class="font-medium ml-1 capitalize">${this.tripData.optimizationMode || 'Balanced'}</span>
                        </div>
                    </div>
                </div>
                
                <!-- Settings Table -->
                <div class="mb-6">
                    <h3 class="font-semibold mb-3">Controller Settings</h3>
                    <div class="overflow-x-auto">
                        <table class="min-w-full divide-y divide-gray-200">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Function</th>
                                    <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                                    <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Current</th>
                                    <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Optimized</th>
                                    <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Change</th>
                                </tr>
                            </thead>
                            <tbody class="bg-white divide-y divide-gray-200">
                                ${this.generateOptimizedSettingsRows(settings)}
                            </tbody>
                        </table>
                    </div>
                </div>
                
                <!-- Safety Recommendations -->
                ${this.generateSafetySection(profile.recommendations)}
                
                <!-- Action Buttons -->
                <div class="mt-8 flex justify-between">
                    <button onclick="unifiedFlow.showStep(2)" 
                            class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
                        ← Modify Settings
                    </button>
                    <div class="space-x-3">
                        <button onclick="unifiedFlow.shareWithCommunity()" 
                                class="px-4 py-2 border border-purple-600 text-purple-600 rounded-md hover:bg-purple-50" 
                                data-auth-required style="display: none;">
                            🌟 Share with Community
                        </button>
                        <button onclick="unifiedFlow.exportSettings()" 
                                class="px-4 py-2 border border-green-600 text-green-600 rounded-md hover:bg-green-50">
                            📄 Export PDF
                        </button>
                        <button onclick="unifiedFlow.applySettings()" 
                                class="px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700">
                            Apply Settings
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Generate optimized settings table rows
     */
    generateOptimizedSettingsRows(optimized) {
        const current = this.pdfSettings || this.optimizer.getFactoryDefaults();
        const descriptions = this.optimizer.getFunctionDescriptions();
        
        return Object.entries(optimized)
            .filter(([func]) => descriptions[func])
            .sort(([a], [b]) => parseInt(a) - parseInt(b))
            .map(([func, newValue]) => {
                const currentValue = current[func] || 0;
                const change = newValue - currentValue;
                const changePercent = currentValue > 0 ? Math.round((change / currentValue) * 100) : 0;
                
                return `
                    <tr>
                        <td class="px-4 py-2 text-sm text-gray-900">F.${func}</td>
                        <td class="px-4 py-2 text-sm text-gray-600">${descriptions[func]}</td>
                        <td class="px-4 py-2 text-sm text-gray-900">${currentValue}</td>
                        <td class="px-4 py-2 text-sm font-medium text-gray-900">${newValue}</td>
                        <td class="px-4 py-2 text-sm">
                            ${change !== 0 ? `
                                <span class="${change > 0 ? 'text-green-600' : 'text-red-600'}">
                                    ${change > 0 ? '↑' : '↓'} ${Math.abs(changePercent)}%
                                </span>
                            ` : '<span class="text-gray-400">-</span>'}
                        </td>
                    </tr>
                `;
            }).join('');
    }

    /**
     * Generate safety recommendations section
     */
    generateSafetySection(recommendations) {
        if (!recommendations || recommendations.length === 0) return '';
        
        const priorityColors = {
            high: 'red',
            medium: 'yellow',
            low: 'blue'
        };
        
        return `
            <div class="mb-6 border-l-4 border-yellow-400 bg-yellow-50 p-4">
                <h3 class="font-semibold text-yellow-800 mb-3">⚠️ Safety Recommendations</h3>
                <div class="space-y-2">
                    ${recommendations
                        .sort((a, b) => {
                            const priority = { high: 0, medium: 1, low: 2 };
                            return priority[a.priority] - priority[b.priority];
                        })
                        .map(rec => `
                            <div class="text-sm">
                                <span class="inline-block px-2 py-1 text-xs font-medium bg-${priorityColors[rec.priority]}-100 text-${priorityColors[rec.priority]}-800 rounded">
                                    ${rec.priority.toUpperCase()}
                                </span>
                                <span class="ml-2 text-gray-700">${rec.message}</span>
                                <p class="ml-14 text-xs text-gray-600 mt-1">${rec.action}</p>
                            </div>
                        `).join('')}
                </div>
            </div>
        `;
    }

    /**
     * Show specific step
     */
    showStep(step) {
        this.currentStep = step;
        
        // Hide all sections
        document.getElementById('vehicle-info-section')?.classList.add('hidden');
        document.getElementById('trip-planning-section')?.classList.add('hidden');
        document.getElementById('results-section')?.classList.add('hidden');
        
        // Show current step
        switch (step) {
            case 1:
                document.getElementById('vehicle-info-section')?.classList.remove('hidden');
                break;
            case 2:
                document.getElementById('trip-planning-section')?.classList.remove('hidden');
                break;
            case 3:
                document.getElementById('results-section')?.classList.remove('hidden');
                break;
        }
        
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    /**
     * Show MCP configuration modal
     */
    showMCPConfiguration() {
        // Show the working MCP configuration panel
        if (window.mcpConfigUI) {
            window.mcpConfigUI.show();
        } else {
            // Fallback if UI not loaded
            alert('MCP Configuration UI not available. Please refresh the page and try again.');
        }
    }

    /**
     * Export settings as PDF
     */
    exportSettings() {
        // Use jsPDF to generate a PDF report
        if (typeof jspdf === 'undefined') {
            alert('PDF export library not loaded');
            return;
        }
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Add content
        doc.setFontSize(20);
        doc.text('GEM T2 Optimized Settings', 20, 20);
        
        doc.setFontSize(12);
        doc.text(`Vehicle: ${this.vehicleData.model?.toUpperCase()} (${this.vehicleData.year})`, 20, 35);
        doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 42);
        
        // Add settings table
        // ... (implement full PDF generation)
        
        doc.save('gem-optimized-settings.pdf');
    }

    /**
     * Apply settings (show instructions)
     */
    applySettings() {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50';
        modal.innerHTML = `
            <div class="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
                <h3 class="text-lg font-bold mb-4">Apply Settings to Your GEM</h3>
                <div class="space-y-3 text-sm">
                    <p class="font-medium text-red-600">⚠️ Important Safety Steps:</p>
                    <ol class="list-decimal list-inside space-y-2 text-gray-700">
                        <li>Turn key switch to OFF position</li>
                        <li>Engage parking brake</li>
                        <li>Connect programmer to diagnostic port</li>
                        <li>Save current settings as backup</li>
                        <li>Enter each function value carefully</li>
                        <li>Double-check all values before saving</li>
                        <li>Test at low speed in safe area</li>
                    </ol>
                    <p class="text-xs text-gray-600 mt-4">
                        Always follow manufacturer procedures and safety guidelines.
                    </p>
                </div>
                <div class="mt-6 text-center">
                    <button onclick="this.closest('.fixed').remove()" 
                            class="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
                        I Understand
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    /**
     * Save data to local storage
     */
    saveData() {
        localStorage.setItem('gem-vehicle-data', JSON.stringify(this.vehicleData));
        localStorage.setItem('gem-trip-data', JSON.stringify(this.tripData));
    }

    /**
     * Load saved data
     */
    loadSavedData() {
        try {
            const vehicleData = localStorage.getItem('gem-vehicle-data');
            const tripData = localStorage.getItem('gem-trip-data');
            
            if (vehicleData) {
                this.vehicleData = JSON.parse(vehicleData);
                this.populateVehicleForm();
            }
            
            if (tripData) {
                this.tripData = JSON.parse(tripData);
                this.populateTripForm();
            }
        } catch (error) {
            console.error('Error loading saved data:', error);
        }
    }

    /**
     * Populate vehicle form with saved data
     */
    populateVehicleForm() {
        if (this.vehicleData.model) {
            document.getElementById('vehicle-model').value = this.vehicleData.model;
        }
        if (this.vehicleData.year) {
            document.getElementById('vehicle-year').value = this.vehicleData.year;
        }
        if (this.vehicleData.controller) {
            document.getElementById('controller-type').value = this.vehicleData.controller;
        }
        if (this.vehicleData.motorType) {
            document.getElementById('motor-type').value = this.vehicleData.motorType;
        }
        if (this.vehicleData.currentSpeed) {
            document.getElementById('current-speed').value = this.vehicleData.currentSpeed;
        }
        if (this.vehicleData.batteryVoltage) {
            document.getElementById('battery-voltage').value = this.vehicleData.batteryVoltage;
        }
        if (this.vehicleData.batteryType) {
            document.getElementById('battery-type').value = this.vehicleData.batteryType;
        }
        if (this.vehicleData.batteryCapacity) {
            document.getElementById('battery-capacity').value = this.vehicleData.batteryCapacity;
        }
        if (this.vehicleData.tireDiameter) {
            document.getElementById('tire-diameter').value = this.vehicleData.tireDiameter;
        }
        if (this.vehicleData.gearRatio) {
            document.getElementById('gear-ratio').value = this.vehicleData.gearRatio;
        }
        
        this.validateStep1();
        this.validateCompatibility();
        this.updateVehicleClassification();
    }

    /**
     * Populate trip form with saved data
     */
    populateTripForm() {
        if (this.tripData.destination) {
            document.getElementById('trip-destination').value = this.tripData.destination;
        }
        if (this.tripData.date) {
            document.getElementById('trip-date').value = this.tripData.date;
        }
        if (this.tripData.type) {
            document.getElementById('trip-type').value = this.tripData.type;
        }
        if (this.tripData.passengers) {
            document.getElementById('passengers').value = this.tripData.passengers;
        }
        if (this.tripData.cargo) {
            document.getElementById('cargo').value = this.tripData.cargo;
        }
    }
    
    /**
     * Handle Firebase authentication state changes
     */
    handleAuthStateChange(user) {
        if (user) {
            console.log('User authenticated:', user.email);
            this.enableAutoSave();
        } else {
            console.log('User signed out');
            this.disableAutoSave();
        }
    }
    
    /**
     * Enable auto-save to Firebase when user is authenticated
     */
    enableAutoSave() {
        this.autoSaveEnabled = true;
        this.setupAutoSaveListeners();
        console.log('Auto-save to Firebase enabled');
    }
    
    /**
     * Disable auto-save when user is not authenticated
     */
    disableAutoSave() {
        this.autoSaveEnabled = false;
        console.log('Auto-save to Firebase disabled');
    }
    
    /**
     * Setup auto-save listeners for form changes
     */
    setupAutoSaveListeners() {
        if (!this.autoSaveEnabled) return;
        
        // Auto-save vehicle data changes
        const vehicleFields = [
            'vehicle-model', 'vehicle-year', 'controller-type', 'motor-type',
            'current-speed', 'battery-voltage', 'battery-type', 'battery-capacity',
            'tire-diameter', 'gear-ratio'
        ];
        
        vehicleFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.addEventListener('change', () => this.debouncedAutoSave());
            }
        });
    }
    
    /**
     * Debounced auto-save to prevent excessive saves
     */
    debouncedAutoSave() {
        if (!this.autoSaveEnabled) return;
        
        clearTimeout(this.autoSaveTimeout);
        this.autoSaveTimeout = setTimeout(() => {
            this.autoSaveCurrentState();
        }, 2000); // 2 second delay
    }
    
    /**
     * Auto-save current state to Firebase
     */
    async autoSaveCurrentState() {
        if (!this.autoSaveEnabled || !window.firebaseProfileManager) return;
        
        try {
            const profileName = `Auto-saved ${new Date().toLocaleString()}`;
            const hasData = this.vehicleData.model && this.vehicleData.year;
            
            if (hasData) {
                // Save as temporary profile
                await window.firebaseProfileManager.saveCurrentProfile(profileName, 'Auto-saved configuration');
            }
        } catch (error) {
            console.warn('Auto-save failed:', error);
        }
    }
    
    /**
     * Save trip result to history
     */
    async saveTripToHistory(tripData, settings) {
        if (!window.firebaseProfileManager) return;
        
        const tripHistory = {
            vehicleData: this.vehicleData,
            tripData: tripData,
            settings: settings,
            optimization: this.tripData.optimizationMode || 'balanced',
            createdAt: new Date(),
            summary: {
                model: this.vehicleData.model,
                year: this.vehicleData.year,
                destination: tripData.destination || 'Unknown',
                settingsCount: Object.keys(settings).length
            }
        };
        
        try {
            await window.firebaseProfileManager.saveTripHistory(tripHistory);
            console.log('Trip saved to history');
        } catch (error) {
            console.error('Failed to save trip history:', error);
        }
    }
    
    /**
     * Convert optimization mode to MCP priorities
     */
    convertModeToPriorities(mode) {
        const priorityMaps = {
            'performance': { speed: 9, acceleration: 9, hillClimbing: 7, range: 5, regen: 5 },
            'efficiency': { speed: 5, acceleration: 5, hillClimbing: 6, range: 9, regen: 9 },
            'balanced': { speed: 7, acceleration: 7, hillClimbing: 7, range: 7, regen: 7 },
            'turf': { speed: 3, acceleration: 4, hillClimbing: 6, range: 8, regen: 7 },
            'commute': { speed: 6, acceleration: 7, hillClimbing: 6, range: 8, regen: 7 }
        };
        
        return priorityMaps[mode] || priorityMaps['balanced'];
    }

    /**
     * Share current configuration with the community
     */
    shareWithCommunity() {
        if (!window.firebaseManager?.isAuthenticated()) {
            this.showNotification('Please sign in to share with the community', 'warning');
            return;
        }
        
        // Store current optimization data for sharing
        const sharingData = {
            vehicleData: this.vehicleData,
            tripData: this.tripData,
            controllerSettings: this.lastOptimizedSettings || {},
            optimizationMode: this.tripData.optimizationMode || 'balanced'
        };
        
        // Store in session storage for the community page to pick up
        sessionStorage.setItem('pendingCommunityShare', JSON.stringify(sharingData));
        
        // Navigate to community page with share modal
        window.location.href = 'community.html?share=true';
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.unifiedFlow = new UnifiedFlowController();
});
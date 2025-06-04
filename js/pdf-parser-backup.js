/**
 * GEM Controller Settings PDF Parser - Clean Working Version
 * Extracts function values from PDF files containing controller settings
 * Supports all 128 controller functions with comprehensive format detection
 */
class PDFParser {
    constructor() {
        // Enhanced patterns for comprehensive PDF parsing
        this.patterns = {
            // GE Sentry Format - Complete table with headers
            geSentryComplete: /F\.?\s*No\.?\s*(\d+)\s+([A-Za-z][A-Za-z\s\-\_]+?)\s+Counts\s*[:=]?\s*(\d+)\s+Value\s*[:=]?\s*(\d+)/gi,
            geSentryWithValue: /F\.?\s*No\.?\s*(\d+)[\s\S]*?Counts\s*[:=]?\s*(\d+)\s*Value\s*[:=]?\s*(\d+)/gi,
            geSentrySimple: /F\.?\s*No\.?\s*(\d+)[\s\S]*?Counts\s*[:=]?\s*(\d+)/gi,
            
            // GE Controller Format patterns
            geControllerTable: /F\.No\.\s*(\d+)[\s\S]*?Counts\s*[:=]?\s*(\d+)/gi,
            geControllerSimple: /F\.?\s*No\.?\s*(\d+)\s*[:=]?\s*(\d+)/gi,
            geControllerDirect: /F\.?\s*(\d+)\s*[:=]?\s*(\d+)/gi,
            
            // Flexible function patterns
            functionVariations: [
                /F\.?\s*No\.?\s*(\d+)\s*[:=]?\s*(\d+)/gi,
                /F\.?\s*(\d+)\s*[:=]?\s*(\d+)/gi,
                /Function\s*(\d+)\s*[:=]?\s*(\d+)/gi,
                /Func\\.?\s*(\d+)\s*[:=]?\s*(\d+)/gi,
                /F\s*\.\s*(\d+)\s*[:=]?\s*(\d+)/gi,
                /F\s*(\d+)\s*[:=\-\s]+(\d+)/gi,
                /\bF(\d+)\s+(\d+)\b/gi
            ],
            
            // Simple format patterns
            simpleFormat: [
                /^(\d{1,3})\s+(\d{1,3})$/gmi,
                /^(\d{1,3})\s*[:=]\s*(\d{1,3})$/gmi,
                /^(\d{1,3})\s+\S+\s+(\d{1,3})$/gmi,
                /^(\d{1,3})[^\d]+(\d{1,3})$/gmi
            ],
            
            // Table format patterns
            tableFormats: [
                /(\d{1,3})\s+([A-Za-z][A-Za-z\s\-\_]*?)\s+(\d{1,3})(?:\s+\S+)?/gmi,
                /F\.?\s*(\d{1,3})\s+([A-Za-z][A-Za-z\s\-\_]*?)\s+(\d{1,3})/gmi,
                /(\d{1,3})\s{2,}(\S.*?\S)\s{2,}(\d{1,3})/gmi
            ],
            
            // Table row patterns
            tableRowPattern: /(\d{1,3})\s+([A-Za-z][A-Za-z\s\-\_]*?)\s+(\d{1,3})/gmi,
            tableRowPatternAlt: /F\.?\s*(\d{1,3})\s+([A-Za-z][A-Za-z\s\-\_]*?)\s+(\d{1,3})/gmi,
            tableRowWithFNo: /F\.No\.\s*(\d{1,3})\s*([A-Za-z][A-Za-z\s\-\_]*?)\s*(\d{1,3})/gmi,
            
            // Headers and structure
            tableHeader: /F\.?\s*No\.?\s*Function\s*Description\s*Counts\s*Value/gi,
            functionWithName: /F\.?\s*(\d+)\s+([A-Za-z][A-Za-z\s\-\_]+)/gi,
            functionNumber: /F\.?\s*No\.?\s*(\d+)/gi,
            
            // Comparison patterns
            originalOptimized: /Original\s*[:=]?\s*(\d+)\s*Optimized\s*[:=]?\s*(\d+)/gi,
            beforeAfter: /Before\s*[:=]?\s*(\d+)\s*After\s*[:=]?\s*(\d+)/gi,
            factoryModified: /Factory\s*[:=]?\s*(\d+)\s*Modified\s*[:=]?\s*(\d+)/gi,
            currentNew: /Current\s*[:=]?\s*(\d+)\s*New\s*[:=]?\s*(\d+)/gi,
            stockCustom: /Stock\s*[:=]?\s*(\d+)\s*Custom\s*[:=]?\s*(\d+)/gi,
            
            // Value extraction patterns
            valuePatterns: {
                counts: /Counts\s*[:=]?\s*(\d+)/gi,
                value: /Value\s*[:=]?\s*(\d+)/gi,
                setting: /Setting\s*[:=]?\s*(\d+)/gi,
                current: /Current\s*[:=]?\s*(\d+)/gi,
                default: /Default\s*[:=]?\s*(\d+)/gi
            },
            
            // Export format patterns
            exportFormats: {
                sentry: [
                    /Function\s+(\d+)\s*\-\s*(.+?):\s*(\d+)/gi,
                    /F(\d+)\s*\-\s*(.+?):\s*(\d+)/gi,
                    /Func\s*(\d+)\s*(.+?)\s*(\d+)/gi
                ],
                curtis: [
                    /Parameter\s+(\d+)\s*\((.+?)\)\s*:\s*(\d+)/gi,
                    /P(\d+)\s*\-\s*(.+?):\s*(\d+)/gi,
                    /Param\s*(\d+)\s*[:=]\s*(\d+)/gi
                ]
            },
            
            // Flexible whitespace patterns
            flexibleWhitespace: {
                functionValue: /F\.?\s*(?:No\.?)?\s*(\d{1,3})\s*(?:[:=\-]|\s+)\s*(\d{1,3})/gi,
                numberPair: /\b(\d{1,3})\s*[\s:=\-]+\s*(\d{1,3})\b/gi,
                tableRow: /^\s*(\d{1,3})(?:\s+|\s*[:=]\s*).*?(\d{1,3})\s*$/gmi
            }
        };
        
        // Function definitions for all 128 functions
        this.functionDefinitions = this.initializeAllFunctions();
        
        // GEM function names for reference
        this.geFunctionNames = {
            1: 'MPH Scaling',
            3: 'Controlled Acceleration',
            4: 'Max Armature Current Limit',
            7: 'Minimum Field Current',
            15: 'Battery Volts',
            20: 'MPH Overspeed',
            24: 'Field Weakening Start'
        };
        
        // Debug logging flag
        this.debugMode = true;
        this.detectedFormats = [];
    }
    
    initializeAllFunctions() {
        const functions = {
            // Standard GEM Controller Functions (1-26)
            1: { name: 'MPH Scaling', range: [15, 200], description: 'Controls top speed scaling' },
            2: { name: 'Creep Speed', range: [0, 10], description: 'Speed when barely pressing pedal' },
            3: { name: 'Controlled Acceleration', range: [8, 40], description: 'Acceleration rate control' },
            4: { name: 'Max Armature Current Limit', range: [180, 400], description: 'Maximum motor current' },
            5: { name: 'Plug Current', range: [50, 300], description: 'Plug braking current' },
            6: { name: 'Armature Acceleration Rate', range: [30, 100], description: 'Motor acceleration rate' },
            7: { name: 'Minimum Field Current', range: [51, 120], description: 'Minimum field current for motor protection' },
            8: { name: 'Maximum Field Current', range: [200, 400], description: 'Maximum field current' },
            9: { name: 'Regen Armature Current', range: [150, 350], description: 'Regenerative braking current' },
            10: { name: 'Regen Maximum Field Current', range: [51, 300], description: 'Max field current during regen' },
            11: { name: 'Turf Speed Limit', range: [100, 170], description: 'Speed limit in turf mode' },
            12: { name: 'Reverse Speed Limit', range: [120, 170], description: 'Maximum reverse speed' },
            13: { name: 'Reserved', range: [0, 255], description: 'Reserved function' },
            14: { name: 'IR Compensation', range: [2, 20], description: 'Internal resistance compensation' },
            15: { name: 'Battery Volts', range: [48, 96], description: 'Nominal battery voltage' },
            16: { name: 'Low Battery Volts', range: [40, 80], description: 'Low voltage cutoff' },
            17: { name: 'Pack Over Temp', range: [0, 255], description: 'Battery pack over-temperature limit' },
            18: { name: 'Reserved', range: [0, 255], description: 'Reserved function' },
            19: { name: 'Field Ramp Rate Plug/Regen', range: [5, 30], description: 'Field current ramp rate' },
            20: { name: 'MPH Overspeed', range: [25, 50], description: 'Overspeed protection threshold' },
            21: { name: 'Arm Current Ramp (Handbrake)', range: [20, 80], description: 'Armature current ramp rate' },
            22: { name: 'Odometer Calibration', range: [80, 180], description: 'Odometer calibration factor' },
            23: { name: 'Error Compensation', range: [0, 20], description: 'Error detection compensation' },
            24: { name: 'Field Weakening Start', range: [25, 85], description: 'Field weakening start point' },
            25: { name: 'Pedal Enable', range: [0, 1], description: 'Pedal enable/disable' },
            26: { name: 'Ratio of Field to Arm', range: [1, 8], description: 'Field to armature current ratio' }
        };
        
        // Extended functions (27-128)
        for (let i = 27; i <= 128; i++) {
            functions[i] = {
                name: `Function ${i}`,
                range: [0, 255],
                description: `Extended controller function ${i}`
            };
        }
        
        return functions;
    }
    
    log(message, data = null) {
        if (this.debugMode) {
            console.log(`[PDF Parser] ${message}`, data || '');
        }
    }
    
    warn(message, data = null) {
        if (this.debugMode) {
            console.warn(`[PDF Parser] ${message}`, data || '');
        }
    }
    
    error(message, data = null) {
        console.error(`[PDF Parser] ${message}`, data || '');
    }

    /**
     * Parse PDF file and extract controller settings
     */
    async parsePDF(file) {
        this.log('Starting PDF parsing', { fileName: file.name, fileSize: file.size });
        
        try {
            // Load PDF.js library if not already loaded
            if (typeof pdfjsLib === 'undefined') {
                throw new Error('PDF.js library not loaded');
            }

            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            
            const allExtractions = {};
            const pageTexts = [];
            
            // Process each page
            for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                const page = await pdf.getPage(pageNum);
                const textContent = await page.getTextContent();
                const text = this.extractTextFromPage(textContent);
                
                pageTexts.push({ pageNum, text, textLength: text.length });
                
                // Try multiple extraction methods
                const pageExtractions = this.extractFromPage(text, pageNum);
                Object.assign(allExtractions, pageExtractions);
            }
            
            // Validate and clean extracted settings
            const validatedSettings = this.validateExtractedSettings(allExtractions);
            const previewData = this.generateSettingsPreview(validatedSettings.cleanSettings);
            
            return {
                success: true,
                settings: validatedSettings.cleanSettings,
                preview: previewData,
                metadata: {
                    fileName: file.name,
                    pageCount: pdf.numPages,
                    totalFunctions: Object.keys(validatedSettings.cleanSettings).length,
                    validFunctions: validatedSettings.validCount,
                    invalidFunctions: validatedSettings.invalidCount,
                    extractionMethods: ['multi-pattern'],
                    confidence: this.calculateOverallConfidence(validatedSettings),
                    parseDate: new Date().toISOString()
                }
            };
            
        } catch (error) {
            this.error('PDF parsing failed', error);
            
            const errorAnalysis = this.analyzeError(error, file);
            
            return {
                success: false,
                error: errorAnalysis.userMessage,
                technicalError: error.message,
                suggestions: errorAnalysis.suggestions,
                formatExamples: this.getFormatExamples(),
                troubleshooting: this.getTroubleshootingSteps()
            };
        }
    }

    /**
     * Extract text from PDF page content
     */
    extractTextFromPage(textContent) {
        const textItems = textContent.items;
        let text = '';
        let lastY = null;
        
        const sortedItems = textItems.sort((a, b) => {
            const yDiff = b.transform[5] - a.transform[5];
            if (Math.abs(yDiff) > 3) return yDiff;
            return a.transform[4] - b.transform[4];
        });
        
        sortedItems.forEach((item) => {
            const y = item.transform[5];
            const str = item.str.trim();
            
            if (!str) return;
            
            if (lastY !== null && Math.abs(lastY - y) > 3) {
                text += '\n';
            } else if (text && !text.endsWith(' ')) {
                text += ' ';
            }
            
            text += str;
            lastY = y;
        });
        
        return text;
    }

    /**
     * Extract settings from a page using multiple methods
     */
    extractFromPage(text, pageNum) {
        const settings = {};
        
        // Try GE Sentry format first
        const sentryResults = this.extractGESentryFormat(text);
        Object.assign(settings, sentryResults);
        
        // Try flexible function patterns
        if (Object.keys(settings).length < 5) {
            const flexibleResults = this.extractFlexibleFunctions(text);
            Object.assign(settings, flexibleResults);
        }
        
        // Try simple format
        if (Object.keys(settings).length < 5) {
            const simpleResults = this.extractSimpleFormat(text);
            Object.assign(settings, simpleResults);
        }
        
        return settings;
    }
    
    /**
     * Extract GE Sentry format
     */
    extractGESentryFormat(text) {
        const settings = {};
        
        // Try complete Sentry format
        let matches = [...text.matchAll(this.patterns.geSentryComplete)];
        matches.forEach(match => {
            const funcNum = parseInt(match[1]);
            const value = parseInt(match[4]) || parseInt(match[3]);
            if (this.isValidFunction(funcNum) && this.isValidValue(value)) {
                settings[funcNum] = value;
            }
        });
        
        // Try simple Sentry format
        if (Object.keys(settings).length < 5) {
            matches = [...text.matchAll(this.patterns.geSentrySimple)];
            matches.forEach(match => {
                const funcNum = parseInt(match[1]);
                const value = parseInt(match[2]);
                if (this.isValidFunction(funcNum) && this.isValidValue(value) && !settings[funcNum]) {
                    settings[funcNum] = value;
                }
            });
        }
        
        return settings;
    }
    
    /**
     * Extract flexible function variations
     */
    extractFlexibleFunctions(text) {
        const settings = {};
        
        this.patterns.functionVariations.forEach((pattern) => {
            const matches = [...text.matchAll(pattern)];
            matches.forEach(match => {
                const funcNum = parseInt(match[1]);
                const value = parseInt(match[2]);
                if (this.isValidFunction(funcNum) && this.isValidValue(value) && !settings[funcNum]) {
                    settings[funcNum] = value;
                }
            });
        });
        
        return settings;
    }
    
    /**
     * Extract simple format
     */
    extractSimpleFormat(text) {
        const settings = {};
        
        this.patterns.simpleFormat.forEach((pattern) => {
            const matches = [...text.matchAll(pattern)];
            matches.forEach(match => {
                const funcNum = parseInt(match[1]);
                const value = parseInt(match[2]);
                if (this.isValidFunction(funcNum) && this.isValidValue(value) && !settings[funcNum]) {
                    settings[funcNum] = value;
                }
            });
        });
        
        return settings;
    }
    
    /**
     * Validate extracted settings
     */
    validateExtractedSettings(rawSettings) {
        const cleanSettings = {};
        let validCount = 0;
        let invalidCount = 0;
        
        Object.entries(rawSettings).forEach(([func, value]) => {
            const funcNum = parseInt(func);
            const funcValue = parseInt(value);
            
            if (this.isValidFunction(funcNum) && this.isValidValue(funcValue)) {
                cleanSettings[funcNum] = funcValue;
                validCount++;
            } else {
                invalidCount++;
            }
        });
        
        return {
            cleanSettings,
            validCount,
            invalidCount,
            totalProcessed: Object.keys(rawSettings).length
        };
    }
    
    /**
     * Generate settings preview
     */
    generateSettingsPreview(settings) {
        const preview = [];
        
        const sortedFunctions = Object.keys(settings)
            .map(f => parseInt(f))
            .sort((a, b) => a - b);
        
        sortedFunctions.forEach(func => {
            const funcDef = this.functionDefinitions[func];
            preview.push({
                function: func,
                name: funcDef?.name || `Function ${func}`,
                value: settings[func],
                description: funcDef?.description || '',
                range: funcDef?.range || [0, 255],
                isInRange: this.isValueInRange(settings[func], funcDef?.range || [0, 255])
            });
        });
        
        return preview;
    }
    
    /**
     * Validate function number (1-128)
     */
    isValidFunction(num) {
        return Number.isInteger(num) && num >= 1 && num <= 128;
    }
    
    /**
     * Alternative name for compatibility
     */
    isValidFunctionNumber(num) {
        return this.isValidFunction(num);
    }

    /**
     * Validate value (0-999)
     */
    isValidValue(value) {
        return Number.isInteger(value) && value >= 0 && value <= 999;
    }
    
    /**
     * Alternative name for compatibility
     */
    isValidCountsValue(value) {
        return this.isValidValue(value);
    }
    
    /**
     * Check if value is in expected range
     */
    isValueInRange(value, range) {
        if (!range || range.length !== 2) return true;
        return value >= range[0] && value <= range[1];
    }
    
    /**
     * Calculate overall confidence score
     */
    calculateOverallConfidence(validatedSettings) {
        const total = validatedSettings.totalProcessed;
        const valid = validatedSettings.validCount;
        
        if (total === 0) return 0;
        
        let confidence = valid / total;
        
        if (valid > 20) confidence += 0.1;
        if (valid > 50) confidence += 0.1;
        
        return Math.min(confidence, 1.0);
    }

    /**
     * Analyze error and provide user-friendly message
     */
    analyzeError(error, file) {
        const errorMessage = error.message.toLowerCase();
        let errorType = 'unknown';
        let userMessage = '';
        let suggestions = [];

        if (errorMessage.includes('invalid pdf') || errorMessage.includes('corrupted')) {
            errorType = 'corrupted';
            userMessage = '❌ This PDF file appears to be corrupted or not a valid PDF.';
            suggestions = [
                'Try re-downloading the PDF from your controller software',
                'Check if the file opens correctly in a PDF viewer',
                'Export a new copy from your GEM programmer software'
            ];
        } else if (errorMessage.includes('password') || errorMessage.includes('encrypted')) {
            errorType = 'password_protected';
            userMessage = '🔒 This PDF is password protected and cannot be read.';
            suggestions = [
                'Remove the password protection from the PDF',
                'Export an unprotected version from your programming software'
            ];
        } else {
            errorType = 'format';
            userMessage = '📋 Unable to find GEM controller settings in the expected format.';
            suggestions = [
                'Make sure this PDF contains GEM controller function settings',
                'Look for a table with F.1, F.2, etc. and corresponding values'
            ];
        }

        suggestions.push('Use manual entry to input the 7 most important settings');

        return {
            errorType,
            userMessage,
            suggestions
        };
    }

    /**
     * Get format examples for user guidance
     */
    getFormatExamples() {
        return [
            {
                title: 'GE Sentry Export Format',
                description: 'Exported from Sentry programming software',
                example: `F.No. Function Description    Counts Value Units
F.No.1  MPH Scaling            100    100   %
F.No.3  Controlled Acceleration 15     15   Amps/Sec
F.No.4  Max Armature Current   245    245   Amps`
            },
            {
                title: 'Simple Table Format',
                description: 'Basic function number and value pairs',
                example: `Function  Value
F.1       100
F.3       15
F.4       245`
            }
        ];
    }

    /**
     * Get troubleshooting steps
     */
    getTroubleshootingSteps() {
        return [
            {
                step: 1,
                title: 'Check PDF Content',
                description: 'Verify it contains a table with function numbers and values'
            },
            {
                step: 2,
                title: 'Verify File Source',
                description: 'Ensure exported directly from programming software'
            },
            {
                step: 3,
                title: 'Use Manual Entry',
                description: 'Enter the 7 most critical settings manually'
            }
        ];
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PDFParser;
} else if (typeof window !== 'undefined') {
    // Make PDFParser available globally in browser environment
    window.PDFParser = PDFParser;
}
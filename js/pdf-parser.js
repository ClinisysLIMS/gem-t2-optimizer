/**
 * GEM Controller Settings PDF Parser
 * Extracts function values from PDF files containing controller settings
 * Supports all 128 controller functions with comprehensive format detection
 */
class PDFParser {
    constructor() {
        // Enhanced patterns for comprehensive PDF parsing
        this.patterns = {
            // GE Controller Format patterns - Main patterns for F.No. and Counts
            geControllerTable: /F\.No\.\s*(\d+)[\s\S]*?Counts\s*[:=]?\s*(\d+)/gi,
            geControllerSimple: /F\.No\.\s*(\d+)[\s\S]*?(\d+)\s*(?:Counts|$)/gi,
            
            // Standard table patterns for organized data
            tableRowPattern: /^[\s]*(\d{1,3})[\s]+([A-Za-z\s\-\_]+?)[\s]+(\d{1,3})[\s]*$/gmi,
            tableRowPatternAlt: /F\.?(\d{1,3})[\s]+([A-Za-z\s\-\_]+?)[\s]+(\d{1,3})[\s]*$/gmi,
            
            // Function number patterns (various formats)
            functionNumber: /F\.?\s*No\.?\s*(\d+)/gi,
            functionNumberShort: /F\.?\s*(\d+)\s*[:=\-\s]\s*(\d+)/gi,
            functionNumberColon: /F\.?\s*(\d+)\s*:\s*(\d+)/gi,
            
            // Counts/Values patterns
            countsValue: /Counts\s*[:=]?\s*(\d+)/gi,
            valuePattern: /Value\s*[:=]?\s*(\d+)/gi,
            settingPattern: /Setting\s*[:=]?\s*(\d+)/gi,
            
            // Optimization comparison patterns
            originalOptimized: /Original\s*[:=]?\s*(\d+)\s*Optimized\s*[:=]?\s*(\d+)/gi,
            beforeAfter: /Before\s*[:=]?\s*(\d+)\s*After\s*[:=]?\s*(\d+)/gi,
            factoryModified: /Factory\s*[:=]?\s*(\d+)\s*Modified\s*[:=]?\s*(\d+)/gi,
            
            // Reference guide patterns
            referencePattern: /(\d{1,3})\s*[:\-]\s*([A-Za-z\s]+?)\s*[:\-]\s*(\d{1,3})/gi,
            descriptionPattern: /F\.?(\d{1,3})\s*[:\-]\s*([A-Za-z\s\-\_]+?)[\s]*(\d{1,3})/gi,
            
            // Sentry export patterns
            sentryPattern: /Function\s+(\d+)\s*\-\s*(.+?):\s*(\d+)/gi,
            sentryShort: /F(\d+)\s*\-\s*(.+?):\s*(\d+)/gi,
            
            // Curtis programmer patterns
            curtisPattern: /Parameter\s+(\d+)\s*\((.+?)\)\s*:\s*(\d+)/gi,
            curtisShort: /P(\d+)\s*\-\s*(.+?):\s*(\d+)/gi,
            
            // Generic number extraction patterns
            numberPairs: /(\d{1,3})\s+(\d{1,3})/g,
            isolatedNumbers: /\b(\d{1,3})\b/g
        };
        
        // Function definitions for all 128 functions
        this.functionDefinitions = this.initializeAllFunctions();
        
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
        
        // Extended functions (27-128) - Initialize with generic names and ranges
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
     * Parse PDF file and extract controller settings with comprehensive debugging
     * @param {File} file - PDF file to parse
     * @returns {Promise<Object>} Extracted settings with detailed logging
     */
    async parsePDF(file) {
        this.log('Starting PDF parsing', { fileName: file.name, fileSize: file.size });
        
        try {
            // Load PDF.js library if not already loaded
            if (typeof pdfjsLib === 'undefined') {
                this.log('Loading PDF.js library...');
                await this.loadPDFJS();
            }

            const arrayBuffer = await file.arrayBuffer();
            this.log('File loaded into array buffer', { bufferSize: arrayBuffer.byteLength });
            
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            this.log('PDF document loaded', { pageCount: pdf.numPages });
            
            const allExtractions = {};
            const pageTexts = [];
            const detectionResults = [];
            
            // Process each page with detailed logging
            for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                this.log(`Processing page ${pageNum} of ${pdf.numPages}`);
                
                const page = await pdf.getPage(pageNum);
                const textContent = await page.getTextContent();
                const text = this.extractTextFromPage(textContent);
                
                this.log(`Extracted text from page ${pageNum}`, { 
                    textLength: text.length, 
                    textPreview: text.substring(0, 200) + '...' 
                });
                
                pageTexts.push({ pageNum, text, textLength: text.length });
                
                // Try multiple extraction methods for this page
                const pageExtractions = await this.extractFromPageMultiMethod(text, pageNum);
                this.log(`Page ${pageNum} extraction results`, pageExtractions);
                
                // Merge page extractions into overall results
                Object.assign(allExtractions, pageExtractions.settings);
                detectionResults.push(pageExtractions);
            }
            
            this.log('All pages processed', { 
                totalFunctionsFound: Object.keys(allExtractions).length,
                pagesProcessed: pageTexts.length 
            });
            
            // Validate and clean extracted settings
            const validatedSettings = this.validateExtractedSettings(allExtractions);
            this.log('Settings validation complete', validatedSettings);
            
            // Generate preview data
            const previewData = this.generateSettingsPreview(validatedSettings.cleanSettings);
            this.log('Preview generated', { previewCount: previewData.length });
            
            // Create comprehensive results
            const results = {
                success: true,
                settings: validatedSettings.cleanSettings,
                settingsArray: Object.keys(validatedSettings.cleanSettings).map(func => ({
                    function: parseInt(func),
                    value: validatedSettings.cleanSettings[func],
                    name: this.functionDefinitions[func]?.name || `Function ${func}`,
                    description: this.functionDefinitions[func]?.description || ''
                })).sort((a, b) => a.function - b.function),
                preview: previewData,
                metadata: {
                    fileName: file.name,
                    pageCount: pdf.numPages,
                    totalFunctions: Object.keys(validatedSettings.cleanSettings).length,
                    validFunctions: validatedSettings.validCount,
                    invalidFunctions: validatedSettings.invalidCount,
                    extractionMethods: this.getUsedMethods(detectionResults),
                    confidence: this.calculateOverallConfidence(validatedSettings),
                    parseDate: new Date().toISOString()
                },
                debugInfo: {
                    pageTexts: pageTexts,
                    detectionResults: detectionResults,
                    validationResults: validatedSettings
                }
            };
            
            this.log('PDF parsing completed successfully', { 
                functionsExtracted: results.metadata.totalFunctions,
                confidence: results.metadata.confidence 
            });
            
            return results;
            
        } catch (error) {
            this.error('PDF parsing failed', error);
            
            // Try fallback parsing with detailed logging
            const fallbackResult = await this.tryFallbackParsing(file);
            this.log('Fallback parsing attempted', fallbackResult);
            
            return {
                success: false,
                error: error.message,
                fallback: fallbackResult,
                suggestions: [
                    'Ensure PDF contains GE Controller settings in table format',
                    'Look for "F.No." column with function numbers (1-128) and Counts values',
                    'Check that the PDF is not password protected or corrupted',
                    'Verify the PDF contains controller function settings',
                    'Supported formats: GE Controller Reference Guide, Sentry Export, Optimization Reports, Table formats'
                ],
                debugInfo: {
                    errorDetails: error.stack || error.message,
                    fileInfo: { name: file.name, size: file.size, type: file.type }
                }
            };
        }
    }

    /**
     * Load PDF.js library dynamically
     */
    async loadPDFJS() {
        return new Promise((resolve, reject) => {
            if (typeof pdfjsLib !== 'undefined') {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
            script.onload = () => {
                // Set worker source
                pdfjsLib.GlobalWorkerOptions.workerSrc = 
                    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                resolve();
            };
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    /**
     * Extract text from PDF page content
     * @param {Object} textContent - PDF.js text content object
     * @returns {string} Extracted text
     */
    extractTextFromPage(textContent) {
        const textItems = textContent.items;
        let text = '';
        let lastY = null;
        
        // Sort items by Y position (top to bottom) then X position (left to right)
        const sortedItems = textItems.sort((a, b) => {
            const yDiff = b.transform[5] - a.transform[5]; // Y coordinate (inverted)
            if (Math.abs(yDiff) > 5) return yDiff;
            return a.transform[4] - b.transform[4]; // X coordinate
        });
        
        sortedItems.forEach(item => {
            const y = item.transform[5];
            
            // Add newline if Y position changed significantly
            if (lastY !== null && Math.abs(lastY - y) > 5) {
                text += '\n';
            }
            
            text += item.str + ' ';
            lastY = y;
        });
        
        return text;
    }

    /**
     * Extract settings from a page using multiple methods
     * @param {string} text - Page text
     * @param {number} pageNum - Page number
     * @returns {Object} Extraction results
     */
    async extractFromPageMultiMethod(text, pageNum) {
        const methods = [];
        const settings = {};
        const methodResults = {};
        
        this.log(`Starting multi-method extraction for page ${pageNum}`);
        
        // Method 1: GE Controller Format (F.No. and Counts columns)
        try {
            const geResults = this.extractGEControllerFormat(text);
            if (Object.keys(geResults).length > 0) {
                methods.push('GE_Controller');
                Object.assign(settings, geResults);
                methodResults.GE_Controller = geResults;
                this.log(`GE Controller format found ${Object.keys(geResults).length} functions`, geResults);
            }
        } catch (error) {
            this.warn('GE Controller format extraction failed', error.message);
        }
        
        // Method 2: Table Format Detection
        try {
            const tableResults = this.extractTableFormat(text);
            if (Object.keys(tableResults).length > 0) {
                methods.push('Table_Format');
                Object.assign(settings, tableResults);
                methodResults.Table_Format = tableResults;
                this.log(`Table format found ${Object.keys(tableResults).length} functions`, tableResults);
            }
        } catch (error) {
            this.warn('Table format extraction failed', error.message);
        }
        
        // Method 3: Optimization Comparison Format
        try {
            const optimizationResults = this.extractOptimizationFormat(text);
            if (Object.keys(optimizationResults).length > 0) {
                methods.push('Optimization_Comparison');
                Object.assign(settings, optimizationResults);
                methodResults.Optimization_Comparison = optimizationResults;
                this.log(`Optimization format found ${Object.keys(optimizationResults).length} functions`, optimizationResults);
            }
        } catch (error) {
            this.warn('Optimization format extraction failed', error.message);
        }
        
        // Method 4: Sentry Export Format
        try {
            const sentryResults = this.extractSentryFormat(text);
            if (Object.keys(sentryResults).length > 0) {
                methods.push('Sentry_Export');
                Object.assign(settings, sentryResults);
                methodResults.Sentry_Export = sentryResults;
                this.log(`Sentry format found ${Object.keys(sentryResults).length} functions`, sentryResults);
            }
        } catch (error) {
            this.warn('Sentry format extraction failed', error.message);
        }
        
        // Method 5: Curtis Programmer Format
        try {
            const curtisResults = this.extractCurtisFormat(text);
            if (Object.keys(curtisResults).length > 0) {
                methods.push('Curtis_Programmer');
                Object.assign(settings, curtisResults);
                methodResults.Curtis_Programmer = curtisResults;
                this.log(`Curtis format found ${Object.keys(curtisResults).length} functions`, curtisResults);
            }
        } catch (error) {
            this.warn('Curtis format extraction failed', error.message);
        }
        
        // Method 6: Generic Pattern Matching
        try {
            const genericResults = this.extractGenericPatterns(text);
            if (Object.keys(genericResults).length > 0) {
                methods.push('Generic_Patterns');
                Object.assign(settings, genericResults);
                methodResults.Generic_Patterns = genericResults;
                this.log(`Generic patterns found ${Object.keys(genericResults).length} functions`, genericResults);
            }
        } catch (error) {
            this.warn('Generic pattern extraction failed', error.message);
        }
        
        this.log(`Page ${pageNum} extraction complete`, {
            methodsUsed: methods,
            totalFunctions: Object.keys(settings).length
        });
        
        return {
            pageNum,
            methods,
            settings,
            methodResults,
            totalExtractions: Object.keys(settings).length
        };
    }
    
    /**
     * Extract GE Controller format with F.No. and Counts columns
     * @param {string} text - Text to parse
     * @returns {Object} Extracted settings
     */
    extractGEControllerFormat(text) {
        const settings = {};
        this.log('Extracting GE Controller format...');
        
        // Primary pattern: F.No. followed by number, then Counts with value
        let matches = [...text.matchAll(this.patterns.geControllerTable)];
        this.log(`GE Controller table pattern found ${matches.length} matches`);
        
        matches.forEach(match => {
            const funcNum = parseInt(match[1]);
            const value = parseInt(match[2]);
            if (this.isValidFunction(funcNum) && this.isValidValue(value)) {
                settings[funcNum] = value;
                this.log(`GE Controller: F.${funcNum} = ${value}`);
            }
        });
        
        // Alternative pattern: F.No. followed by number and value (without explicit "Counts")
        if (Object.keys(settings).length < 5) {
            matches = [...text.matchAll(this.patterns.geControllerSimple)];
            this.log(`GE Controller simple pattern found ${matches.length} additional matches`);
            
            matches.forEach(match => {
                const funcNum = parseInt(match[1]);
                const value = parseInt(match[2]);
                if (this.isValidFunction(funcNum) && this.isValidValue(value) && !settings[funcNum]) {
                    settings[funcNum] = value;
                    this.log(`GE Controller simple: F.${funcNum} = ${value}`);
                }
            });
        }
        
        // Look for structured table data
        const lines = text.split('\n');
        let inTable = false;
        
        lines.forEach((line, index) => {
            if (line.toLowerCase().includes('f.no') && line.toLowerCase().includes('counts')) {
                inTable = true;
                this.log(`Found table header at line ${index}: ${line}`);
                return;
            }
            
            if (inTable && line.trim()) {
                // Try to extract function and value from table row
                const funcMatch = line.match(/F\.No\.\s*(\d+)/i);
                const valueMatch = line.match(/(\d+)\s*(?:Counts|$)/i);
                
                if (funcMatch && valueMatch && !funcMatch[1].includes(valueMatch[1])) {
                    const funcNum = parseInt(funcMatch[1]);
                    const value = parseInt(valueMatch[1]);
                    if (this.isValidFunction(funcNum) && this.isValidValue(value) && !settings[funcNum]) {
                        settings[funcNum] = value;
                        this.log(`GE Controller table row: F.${funcNum} = ${value}`);
                    }
                }
            }
        });
        
        this.log(`GE Controller format extraction complete: ${Object.keys(settings).length} functions found`);
        return settings;
    }
    
    /**
     * Parse optimization comparison format
     * @param {string} text - Text to parse
     * @returns {Object} Original and optimized settings
     */
    parseOptimizationFormat(text) {
        const original = {};
        const optimized = {};
        const descriptions = {};
        const lines = text.split('\n');
        
        let inTable = false;
        let currentFunction = null;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Check if we're in a table section
            if (this.patterns.tableHeader.test(line)) {
                inTable = true;
                continue;
            }
            
            // Look for function with name pattern (e.g., "F.1 MPH Scaling")
            const funcNameMatch = line.match(this.patterns.functionWithName);
            if (funcNameMatch) {
                currentFunction = parseInt(funcNameMatch[1]);
                descriptions[currentFunction] = funcNameMatch[2].trim();
                
                // Look for values in the same line or next lines
                const valuesInLine = line.match(/(\d+)\s+(\d+)\s*$/);
                if (valuesInLine) {
                    original[currentFunction] = parseInt(valuesInLine[1]);
                    optimized[currentFunction] = parseInt(valuesInLine[2]);
                } else {
                    // Check next line for values
                    if (i + 1 < lines.length) {
                        const nextLine = lines[i + 1].trim();
                        const valuesMatch = nextLine.match(/(\d+)\s+(\d+)/);
                        if (valuesMatch) {
                            original[currentFunction] = parseInt(valuesMatch[1]);
                            optimized[currentFunction] = parseInt(valuesMatch[2]);
                        }
                    }
                }
            }
            
            // Look for explicit Original/Optimized pattern
            const explicitMatch = line.match(this.patterns.originalOptimized);
            if (explicitMatch && currentFunction) {
                original[currentFunction] = parseInt(explicitMatch[1]);
                optimized[currentFunction] = parseInt(explicitMatch[2]);
            }
            
            // Handle table rows with function number in first column
            if (inTable && line.match(/^F\.?\s*\d+/)) {
                const parts = line.split(/\s+/);
                if (parts.length >= 3) {
                    const funcMatch = parts[0].match(/F\.?\s*(\d+)/);
                    if (funcMatch) {
                        const func = parseInt(funcMatch[1]);
                        if (this.isValidFunctionNumber(func)) {
                            // Find numeric values in the row
                            const numbers = parts.filter(p => /^\d+$/.test(p));
                            if (numbers.length >= 2) {
                                original[func] = parseInt(numbers[0]);
                                optimized[func] = parseInt(numbers[1]);
                            }
                        }
                    }
                }
            }
        }
        
        return { original, optimized, descriptions };
    }
    
    /**
     * Parse standard Sentry format
     * @param {string} text - Text to parse
     * @returns {Object} Parsed settings and descriptions
     */
    parseSentryFormat(text) {
        const settings = {};
        const descriptions = {};
        const lines = text.split('\n');
        
        // First pass: Look for function entries
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Check for function number
            const funcMatch = line.match(this.patterns.functionNumber);
            if (funcMatch) {
                const funcNum = parseInt(funcMatch[1]);
                
                // Look for counts value in the same line or nearby lines
                let countsValue = null;
                let description = '';
                
                // Check current line
                const countsMatch = line.match(/(\d+)\s*(?:Counts|$)/);
                if (countsMatch && !this.patterns.functionNumber.test(countsMatch[1])) {
                    countsValue = parseInt(countsMatch[1]);
                }
                
                // If not found, check next few lines
                if (countsValue === null) {
                    for (let j = 1; j <= 3 && i + j < lines.length; j++) {
                        const nextLine = lines[i + j];
                        const match = nextLine.match(/(\d+)\s*(?:Counts|$)/);
                        if (match && !this.patterns.functionNumber.test(match[1])) {
                            countsValue = parseInt(match[1]);
                            break;
                        }
                    }
                }
                
                // Extract description
                const descMatch = line.match(/F\.No\.\s*\d+\s*[:\-]?\s*([A-Za-z\s]+?)(?:\d|Counts|$)/);
                if (descMatch) {
                    description = descMatch[1].trim();
                }
                
                if (countsValue !== null && this.isValidFunctionNumber(funcNum)) {
                    settings[funcNum] = countsValue;
                    if (description) {
                        descriptions[funcNum] = description;
                    }
                }
            }
        }
        
        // Second pass: Look for table-like structures
        const tablePattern = /F\.No\.\s*(\d+)[\s\S]{0,100}?(\d{1,3})\s*(?:Counts|$)/gi;
        let match;
        while ((match = tablePattern.exec(text)) !== null) {
            const funcNum = parseInt(match[1]);
            const countsValue = parseInt(match[2]);
            
            if (this.isValidFunctionNumber(funcNum) && this.isValidCountsValue(countsValue)) {
                settings[funcNum] = countsValue;
            }
        }
        
        return { settings, descriptions };
    }
    
    /**
     * Consolidate multiple detected formats
     * @param {Array} formats - Array of detected formats
     * @returns {Array} Consolidated formats
     */
    consolidateFormats(formats) {
        // Group formats by type
        const grouped = {};
        formats.forEach(format => {
            if (!grouped[format.type]) {
                grouped[format.type] = [];
            }
            grouped[format.type].push(format);
        });
        
        // Consolidate each type
        const consolidated = [];
        
        // Handle optimization comparison formats
        if (grouped['optimization-comparison']) {
            const merged = this.mergeOptimizationFormats(grouped['optimization-comparison']);
            if (merged) consolidated.push(merged);
        }
        
        // Handle sentry formats
        if (grouped['sentry-export']) {
            const merged = this.mergeSentryFormats(grouped['sentry-export']);
            if (merged) consolidated.push(merged);
        }
        
        return consolidated;
    }
    
    /**
     * Merge multiple optimization format detections
     * @param {Array} formats - Array of optimization formats
     * @returns {Object} Merged format
     */
    mergeOptimizationFormats(formats) {
        const merged = {
            type: 'optimization-comparison',
            name: 'Optimization Comparison',
            pages: formats.map(f => f.page),
            original: {},
            optimized: {},
            descriptions: {}
        };
        
        formats.forEach(format => {
            Object.assign(merged.original, format.data.original);
            Object.assign(merged.optimized, format.data.optimized);
            Object.assign(merged.descriptions, format.data.descriptions);
        });
        
        return merged;
    }
    
    /**
     * Merge multiple sentry format detections
     * @param {Array} formats - Array of sentry formats
     * @returns {Object} Merged format
     */
    mergeSentryFormats(formats) {
        const merged = {
            type: 'sentry-export',
            name: 'Sentry Software Export',
            pages: formats.map(f => f.page),
            settings: {},
            descriptions: {}
        };
        
        formats.forEach(format => {
            Object.assign(merged.settings, format.data.settings);
            Object.assign(merged.descriptions, format.data.descriptions);
        });
        
        return merged;
    }

    /**
     * Extract table format data
     * @param {string} text - Text to parse
     * @returns {Object} Extracted settings
     */
    extractTableFormat(text) {
        const settings = {};
        this.log('Extracting table format...');
        
        // Try standard table row patterns
        let matches = [...text.matchAll(this.patterns.tableRowPattern)];
        this.log(`Table row pattern found ${matches.length} matches`);
        
        matches.forEach(match => {
            const funcNum = parseInt(match[1]);
            const value = parseInt(match[3]);
            if (this.isValidFunction(funcNum) && this.isValidValue(value)) {
                settings[funcNum] = value;
                this.log(`Table format: F.${funcNum} = ${value} (${match[2].trim()})`);
            }
        });
        
        // Try alternative table patterns
        matches = [...text.matchAll(this.patterns.tableRowPatternAlt)];
        this.log(`Alternative table pattern found ${matches.length} additional matches`);
        
        matches.forEach(match => {
            const funcNum = parseInt(match[1]);
            const value = parseInt(match[3]);
            if (this.isValidFunction(funcNum) && this.isValidValue(value) && !settings[funcNum]) {
                settings[funcNum] = value;
                this.log(`Table format alt: F.${funcNum} = ${value} (${match[2].trim()})`);
            }
        });
        
        this.log(`Table format extraction complete: ${Object.keys(settings).length} functions found`);
        return settings;
    }
    
    /**
     * Extract optimization comparison format
     * @param {string} text - Text to parse
     * @returns {Object} Extracted settings (using optimized values)
     */
    extractOptimizationFormat(text) {
        const settings = {};
        this.log('Extracting optimization comparison format...');
        
        // Look for Original/Optimized patterns
        let matches = [...text.matchAll(this.patterns.originalOptimized)];
        this.log(`Original/Optimized pattern found ${matches.length} matches`);
        
        // Since we don't have function numbers in these matches, we need to find them contextually
        const lines = text.split('\n');
        let currentFunction = null;
        
        lines.forEach((line, index) => {
            // Look for function numbers
            const funcMatch = line.match(/F\.?\s*(\d+)/i);
            if (funcMatch) {
                currentFunction = parseInt(funcMatch[1]);
            }
            
            // Look for optimization values
            const optMatch = line.match(this.patterns.originalOptimized);
            if (optMatch && currentFunction) {
                const optimizedValue = parseInt(optMatch[2]);
                if (this.isValidFunction(currentFunction) && this.isValidValue(optimizedValue)) {
                    settings[currentFunction] = optimizedValue;
                    this.log(`Optimization: F.${currentFunction} = ${optimizedValue} (was ${optMatch[1]})`);
                }
                currentFunction = null;
            }
        });
        
        // Try Before/After patterns
        matches = [...text.matchAll(this.patterns.beforeAfter)];
        this.log(`Before/After pattern found ${matches.length} additional matches`);
        
        currentFunction = null;
        lines.forEach((line, index) => {
            const funcMatch = line.match(/F\.?\s*(\d+)/i);
            if (funcMatch) {
                currentFunction = parseInt(funcMatch[1]);
            }
            
            const beforeAfterMatch = line.match(this.patterns.beforeAfter);
            if (beforeAfterMatch && currentFunction) {
                const afterValue = parseInt(beforeAfterMatch[2]);
                if (this.isValidFunction(currentFunction) && this.isValidValue(afterValue) && !settings[currentFunction]) {
                    settings[currentFunction] = afterValue;
                    this.log(`Before/After: F.${currentFunction} = ${afterValue} (was ${beforeAfterMatch[1]})`);
                }
                currentFunction = null;
            }
        });
        
        this.log(`Optimization format extraction complete: ${Object.keys(settings).length} functions found`);
        return settings;
    }
    
    /**
     * Extract Sentry export format
     * @param {string} text - Text to parse
     * @returns {Object} Extracted settings
     */
    extractSentryFormat(text) {
        const settings = {};
        this.log('Extracting Sentry format...');
        
        // Try standard Sentry patterns
        let matches = [...text.matchAll(this.patterns.sentryPattern)];
        this.log(`Sentry pattern found ${matches.length} matches`);
        
        matches.forEach(match => {
            const funcNum = parseInt(match[1]);
            const value = parseInt(match[3]);
            if (this.isValidFunction(funcNum) && this.isValidValue(value)) {
                settings[funcNum] = value;
                this.log(`Sentry: F.${funcNum} = ${value} (${match[2].trim()})`);
            }
        });
        
        // Try short Sentry patterns
        matches = [...text.matchAll(this.patterns.sentryShort)];
        this.log(`Sentry short pattern found ${matches.length} additional matches`);
        
        matches.forEach(match => {
            const funcNum = parseInt(match[1]);
            const value = parseInt(match[3]);
            if (this.isValidFunction(funcNum) && this.isValidValue(value) && !settings[funcNum]) {
                settings[funcNum] = value;
                this.log(`Sentry short: F.${funcNum} = ${value} (${match[2].trim()})`);
            }
        });
        
        this.log(`Sentry format extraction complete: ${Object.keys(settings).length} functions found`);
        return settings;
    }
    
    /**
     * Extract Curtis programmer format
     * @param {string} text - Text to parse
     * @returns {Object} Extracted settings
     */
    extractCurtisFormat(text) {
        const settings = {};
        this.log('Extracting Curtis format...');
        
        // Try Curtis patterns
        let matches = [...text.matchAll(this.patterns.curtisPattern)];
        this.log(`Curtis pattern found ${matches.length} matches`);
        
        matches.forEach(match => {
            const funcNum = parseInt(match[1]);
            const value = parseInt(match[3]);
            if (this.isValidFunction(funcNum) && this.isValidValue(value)) {
                settings[funcNum] = value;
                this.log(`Curtis: P.${funcNum} = ${value} (${match[2].trim()})`);
            }
        });
        
        // Try short Curtis patterns
        matches = [...text.matchAll(this.patterns.curtisShort)];
        this.log(`Curtis short pattern found ${matches.length} additional matches`);
        
        matches.forEach(match => {
            const funcNum = parseInt(match[1]);
            const value = parseInt(match[3]);
            if (this.isValidFunction(funcNum) && this.isValidValue(value) && !settings[funcNum]) {
                settings[funcNum] = value;
                this.log(`Curtis short: P.${funcNum} = ${value} (${match[2].trim()})`);
            }
        });
        
        this.log(`Curtis format extraction complete: ${Object.keys(settings).length} functions found`);
        return settings;
    }
    
    /**
     * Extract using generic patterns
     * @param {string} text - Text to parse
     * @returns {Object} Extracted settings
     */
    extractGenericPatterns(text) {
        const settings = {};
        this.log('Extracting generic patterns...');
        
        // Try basic function number patterns
        let matches = [...text.matchAll(this.patterns.functionNumberShort)];
        this.log(`Function number short pattern found ${matches.length} matches`);
        
        matches.forEach(match => {
            const funcNum = parseInt(match[1]);
            const value = parseInt(match[2]);
            if (this.isValidFunction(funcNum) && this.isValidValue(value)) {
                settings[funcNum] = value;
                this.log(`Generic: F.${funcNum} = ${value}`);
            }
        });
        
        // Try colon separated patterns
        matches = [...text.matchAll(this.patterns.functionNumberColon)];
        this.log(`Function number colon pattern found ${matches.length} additional matches`);
        
        matches.forEach(match => {
            const funcNum = parseInt(match[1]);
            const value = parseInt(match[2]);
            if (this.isValidFunction(funcNum) && this.isValidValue(value) && !settings[funcNum]) {
                settings[funcNum] = value;
                this.log(`Generic colon: F.${funcNum} = ${value}`);
            }
        });
        
        this.log(`Generic pattern extraction complete: ${Object.keys(settings).length} functions found`);
        return settings;
    }
    
    /**
     * Validate extracted settings and clean them
     * @param {Object} rawSettings - Raw extracted settings
     * @returns {Object} Validation results
     */
    validateExtractedSettings(rawSettings) {
        const cleanSettings = {};
        let validCount = 0;
        let invalidCount = 0;
        const validationErrors = [];
        
        this.log('Validating extracted settings...', { totalRaw: Object.keys(rawSettings).length });
        
        Object.entries(rawSettings).forEach(([func, value]) => {
            const funcNum = parseInt(func);
            const funcValue = parseInt(value);
            
            if (this.isValidFunction(funcNum) && this.isValidValue(funcValue)) {
                cleanSettings[funcNum] = funcValue;
                validCount++;
                this.log(`Valid: F.${funcNum} = ${funcValue}`);
            } else {
                invalidCount++;
                const error = `Invalid function F.${funcNum} = ${funcValue}`;
                validationErrors.push(error);
                this.warn(error);
            }
        });
        
        this.log('Validation complete', {
            valid: validCount,
            invalid: invalidCount,
            cleanTotal: Object.keys(cleanSettings).length
        });
        
        return {
            cleanSettings,
            validCount,
            invalidCount,
            validationErrors,
            totalProcessed: Object.keys(rawSettings).length
        };
    }
    
    /**
     * Generate settings preview for UI display
     * @param {Object} settings - Clean settings
     * @returns {Array} Preview data
     */
    generateSettingsPreview(settings) {
        const preview = [];
        
        // Sort functions numerically
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
     * @param {number} num - Function number
     * @returns {boolean} Is valid
     */
    isValidFunction(num) {
        return Number.isInteger(num) && num >= 1 && num <= 128;
    }

    /**
     * Validate value (0-999)
     * @param {number} value - Counts value
     * @returns {boolean} Is valid
     */
    isValidValue(value) {
        return Number.isInteger(value) && value >= 0 && value <= 999;
    }
    
    /**
     * Check if value is in expected range
     * @param {number} value - Value to check
     * @param {Array} range - [min, max] range
     * @returns {boolean} Is in range
     */
    isValueInRange(value, range) {
        if (!range || range.length !== 2) return true;
        return value >= range[0] && value <= range[1];
    }
    
    /**
     * Get methods used across all detection results
     * @param {Array} detectionResults - Results from all pages
     * @returns {Array} Used methods
     */
    getUsedMethods(detectionResults) {
        const methods = new Set();
        detectionResults.forEach(result => {
            result.methods.forEach(method => methods.add(method));
        });
        return Array.from(methods);
    }
    
    /**
     * Calculate overall confidence score
     * @param {Object} validatedSettings - Validation results
     * @returns {number} Confidence score (0-1)
     */
    calculateOverallConfidence(validatedSettings) {
        const total = validatedSettings.totalProcessed;
        const valid = validatedSettings.validCount;
        
        if (total === 0) return 0;
        
        let confidence = valid / total;
        
        // Bonus for having many functions
        if (valid > 20) confidence += 0.1;
        if (valid > 50) confidence += 0.1;
        
        return Math.min(confidence, 1.0);
    }

    /**
     * Format settings for specific format type
     * @param {Object} format - Format object with settings
     * @returns {Array} Formatted settings array
     */
    formatSettingsForType(format) {
        const functionNames = {
            1: 'MPH Scaling',
            3: 'Controlled Acceleration',
            4: 'Max Armature Current',
            5: 'Plug Current',
            6: 'Armature Accel Rate',
            7: 'Minimum Field Current',
            8: 'Maximum Field Current',
            9: 'Regen Armature Current',
            10: 'Regen Max Field Current',
            11: 'Turf Speed Limit',
            12: 'Reverse Speed Limit',
            14: 'IR Compensation',
            15: 'Battery Volts',
            19: 'Field Ramp Rate',
            20: 'MPH Overspeed',
            22: 'Odometer Calibration',
            23: 'Error Compensation',
            24: 'Field Weakening Start',
            26: 'Ratio Field to Arm'
        };
        
        const results = [];
        
        if (format.type === 'optimization-comparison') {
            // Format optimization comparison data
            const functions = new Set([
                ...Object.keys(format.original),
                ...Object.keys(format.optimized)
            ]);
            
            functions.forEach(func => {
                const funcNum = parseInt(func);
                if (functionNames[funcNum]) {
                    results.push({
                        function: funcNum,
                        name: format.descriptions[funcNum] || functionNames[funcNum],
                        original: format.original[funcNum] || '-',
                        optimized: format.optimized[funcNum] || '-',
                        hasOriginal: format.original[funcNum] !== undefined,
                        hasOptimized: format.optimized[funcNum] !== undefined
                    });
                }
            });
        } else if (format.type === 'sentry-export') {
            // Format sentry export data
            Object.entries(format.settings).forEach(([func, value]) => {
                const funcNum = parseInt(func);
                if (functionNames[funcNum]) {
                    results.push({
                        function: funcNum,
                        name: format.descriptions[funcNum] || functionNames[funcNum],
                        value: value
                    });
                }
            });
        }
        
        return results.sort((a, b) => a.function - b.function);
    }
    
    /**
     * Try fallback parsing for problematic PDFs
     * @param {File} file - PDF file
     * @returns {Promise<Object>} Fallback parsing attempt
     */
    async tryFallbackParsing(file) {
        this.log('Attempting fallback parsing...');
        
        try {
            // Try simple text extraction and basic pattern matching
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            
            let allText = '';
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                allText += textContent.items.map(item => item.str).join(' ') + '\n';
            }
            
            this.log('Fallback: extracted raw text', { length: allText.length });
            
            // Try very basic pattern matching
            const fallbackSettings = {};
            
            // Look for any number patterns that might be functions
            const numberPairs = [...allText.matchAll(/(\d{1,3})\s+(\d{1,3})/g)];
            this.log(`Fallback: found ${numberPairs.length} number pairs`);
            
            numberPairs.forEach(match => {
                const num1 = parseInt(match[1]);
                const num2 = parseInt(match[2]);
                
                // If first number looks like a function number, use it
                if (this.isValidFunction(num1) && this.isValidValue(num2)) {
                    fallbackSettings[num1] = num2;
                    this.log(`Fallback match: F.${num1} = ${num2}`);
                }
            });
            
            if (Object.keys(fallbackSettings).length > 0) {
                this.log(`Fallback parsing found ${Object.keys(fallbackSettings).length} functions`);
                return {
                    success: true,
                    settings: fallbackSettings,
                    confidence: 0.4,
                    method: 'fallback_pattern_matching'
                };
            }
            
        } catch (error) {
            this.error('Fallback parsing failed', error);
        }
        
        // If all else fails, return empty result
        return {
            success: false,
            settings: {},
            confidence: 0,
            method: 'no_extraction_possible',
            message: 'Unable to extract any controller settings from this PDF'
        };
    }

    /**
     * Format parsed settings for display
     * @param {Object} settings - Parsed settings
     * @returns {Array} Formatted settings array
     */
    formatSettings(settings) {
        const functionNames = this.geFunctionNames;
        
        return Object.entries(settings)
            .map(([func, value]) => ({
                function: parseInt(func),
                name: functionNames[func] || `Function ${func}`,
                value: value
            }))
            .sort((a, b) => a.function - b.function);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PDFParser;
}
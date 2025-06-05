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
            },
            
            // Single-line inline patterns (for text extracted as one line)
            inlinePatterns: {
                // Pattern for: '1 MPH Scaling 22 22 Cnts' format
                functionDescValueCnts: /(\d{1,3})\s+([A-Za-z][^0-9]+?)\s+(\d{1,3})\s+(\d{1,3})\s+Cnts/gi,
                // Pattern for: 'F.1 MPH Scaling 100 100 Cnts' format
                fNumDescValueCnts: /F\.?\s*(\d{1,3})\s+([A-Za-z][^0-9]+?)\s+(\d{1,3})\s+(\d{1,3})\s+Cnts/gi,
                // Pattern for: '1 Description 100 Units' format
                functionDescValueUnits: /(\d{1,3})\s+([A-Za-z][^0-9]+?)\s+(\d{1,3})\s+Units/gi,
                // Pattern for extracting just function-value pairs from inline text
                simpleInlinePairs: /(?:^|\s)(\d{1,3})\s+(?:[A-Za-z][^0-9]*?\s+)?(\d{1,3})(?:\s+(?:Cnts|Units|%|A|V|MPH))/gi
            },
            
            // HudsGemstats.pdf specific patterns
            hudsGemstatsPatterns: {
                // Pattern for: '1 MPH Scaling 100 100 Cnts' (no F. prefix, identical values)
                // Uses backreference \3 to ensure both values are identical
                identicalValuesCnts: /(\d{1,3})\s+([A-Za-z][A-Za-z\s]+?)\s+(\d+)\s+\3\s+Cnts/gi,
                // Alternative pattern for slightly different spacing
                identicalValuesSpaced: /(\d{1,3})\s+([A-Za-z][A-Za-z\s]+?)\s+(\d+)\s+\3\s*Cnts/gi,
                // Flexible pattern that allows for minor variations
                flexibleIdentical: /(\d{1,3})\s+([A-Za-z][A-Za-z\s\-\_]+?)\s+(\d+)\s+\3\s+Cnts/gi
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
        
        // Keep track of what we've tested for debugging
        this.extractionLog = [];
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
    
    /**
     * Logging method
     */
    log(message, data = null) {
        if (this.debugMode) {
            console.log(`[PDF Parser] ${message}`, data || '');
        }
    }
    
    /**
     * Warning method
     */
    warn(message, data = null) {
        if (this.debugMode) {
            console.warn(`[PDF Parser] ${message}`, data || '');
        }
    }
    
    /**
     * Error logging method  
     */
    error(message, data = null) {
        console.error(`[PDF Parser] ${message}`, data || '');
    }

    /**
     * Parse PDF file and extract controller settings with comprehensive error handling
     */
    async parsePDF(file) {
        this.log('Starting PDF parsing', { fileName: file.name, fileSize: file.size });
        
        try {
            // Validate input parameters
            if (!file) {
                throw new Error('No file provided for parsing');
            }
            
            if (!(file instanceof File) && !(file instanceof Blob)) {
                throw new Error('Invalid file object provided');
            }
            
            if (!file.name) {
                this.warn('File has no name property, using default');
                file.name = 'unknown.pdf';
            }
            
            // Check file size limits
            if (file.size === 0) {
                throw new Error('File is empty (0 bytes)');
            }
            
            if (file.size > 100 * 1024 * 1024) { // 100MB limit
                throw new Error('File too large (max 100MB)');
            }
            
            // Load PDF.js library if not already loaded
            if (typeof pdfjsLib === 'undefined') {
                throw new Error('PDF.js library not loaded - unable to process PDF files');
            }

            let arrayBuffer;
            try {
                arrayBuffer = await file.arrayBuffer();
            } catch (bufferError) {
                throw new Error(`Failed to read file data: ${bufferError.message}`);
            }
            
            if (!arrayBuffer || arrayBuffer.byteLength === 0) {
                throw new Error('Failed to read file content - file may be corrupted');
            }

            let pdf;
            try {
                pdf = await pdfjsLib.getDocument({ 
                    data: arrayBuffer,
                    verbosity: 0, // Reduce console noise
                    disableAutoFetch: true,
                    disableStream: true
                }).promise;
            } catch (pdfError) {
                if (pdfError.message.includes('Invalid PDF')) {
                    throw new Error('Invalid PDF format - file may be corrupted or not a valid PDF');
                } else if (pdfError.message.includes('password')) {
                    throw new Error('PDF is password protected - please remove password protection');
                } else {
                    throw new Error(`PDF loading failed: ${pdfError.message}`);
                }
            }
            
            // Validate PDF structure
            if (!pdf || !pdf.numPages || pdf.numPages === 0) {
                throw new Error('PDF contains no pages or is corrupted');
            }
            
            if (pdf.numPages > 50) {
                this.warn(`Large PDF with ${pdf.numPages} pages - this may take longer to process`);
            }
            
            const allExtractions = {};
            const pageTexts = [];
            const processingErrors = [];
            
            // Process each page with individual error handling
            for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                try {
                    this.log(`📄 Processing page ${pageNum}/${pdf.numPages}`);
                    
                    let page;
                    try {
                        page = await pdf.getPage(pageNum);
                        this.log(`✅ Page ${pageNum} loaded successfully`);
                    } catch (pageError) {
                        processingErrors.push(`Page ${pageNum}: ${pageError.message}`);
                        this.warn(`Failed to load page ${pageNum}:`, pageError);
                        continue; // Skip this page but continue with others
                    }
                    
                    let textContent;
                    try {
                        textContent = await page.getTextContent();
                        this.log(`📝 Page ${pageNum} text content extracted: ${textContent.items?.length || 0} items`);
                    } catch (textError) {
                        processingErrors.push(`Page ${pageNum} text extraction: ${textError.message}`);
                        this.warn(`Failed to extract text from page ${pageNum}:`, textError);
                        continue; // Skip this page but continue with others
                    }
                    
                    if (!textContent || !textContent.items || textContent.items.length === 0) {
                        this.warn(`Page ${pageNum} contains no extractable text`);
                        continue;
                    }
                    
                    let text;
                    try {
                        text = this.extractTextFromPage(textContent);
                        this.log(`🔤 Page ${pageNum} raw text extracted (${text.length} chars):`, {
                            textLength: text.length,
                            textPreview: text.substring(0, 500),
                            containsFunctionNumbers: /F\.?(?:No\.?)?\s*\d+/.test(text),
                            containsNumbers: /\d+/.test(text),
                            containsCounts: /counts/i.test(text),
                            containsValue: /value/i.test(text)
                        });
                        
                        // Log the complete raw text for debugging
                        if (this.debugMode && text.length > 0) {
                            console.log(`📋 Page ${pageNum} COMPLETE RAW TEXT:\n${text}`);
                        }
                    } catch (extractError) {
                        processingErrors.push(`Page ${pageNum} text processing: ${extractError.message}`);
                        this.warn(`Failed to process text from page ${pageNum}:`, extractError);
                        continue;
                    }
                    
                    pageTexts.push({ pageNum, text, textLength: text.length });
                    
                    // Try multiple extraction methods with error handling
                    try {
                        this.log(`🔍 Starting pattern extraction for page ${pageNum}`);
                        const pageExtractions = this.extractFromPage(text, pageNum);
                        if (pageExtractions && Object.keys(pageExtractions).length > 0) {
                            Object.assign(allExtractions, pageExtractions);
                            this.log(`✅ Page ${pageNum}: Found ${Object.keys(pageExtractions).length} settings:`, pageExtractions);
                        } else {
                            this.log(`❌ Page ${pageNum}: No settings extracted from this page`);
                        }
                    } catch (extractionError) {
                        processingErrors.push(`Page ${pageNum} extraction: ${extractionError.message}`);
                        this.warn(`Settings extraction failed for page ${pageNum}:`, extractionError);
                    }
                    
                } catch (pageProcessingError) {
                    processingErrors.push(`Page ${pageNum}: ${pageProcessingError.message}`);
                    this.warn(`Overall page processing failed for page ${pageNum}:`, pageProcessingError);
                    continue; // Continue with next page
                }
            }
            
            // Check if we have any usable data
            if (pageTexts.length === 0) {
                throw new Error('No readable pages found in PDF - file may be corrupted or contain only images');
            }
            
            if (Object.keys(allExtractions).length === 0) {
                const totalTextLength = pageTexts.reduce((sum, page) => sum + page.textLength, 0);
                if (totalTextLength === 0) {
                    throw new Error('PDF contains no extractable text - may be a scanned document');
                } else {
                    throw new Error('No controller settings found in recognizable format');
                }
            }
            
            // Validate and clean extracted settings
            let validatedSettings;
            try {
                validatedSettings = this.validateExtractedSettings(allExtractions);
            } catch (validationError) {
                throw new Error(`Settings validation failed: ${validationError.message}`);
            }
            
            if (validatedSettings.validCount === 0) {
                throw new Error('No valid controller settings found - check PDF format');
            }
            
            let previewData;
            try {
                previewData = this.generateSettingsPreview(validatedSettings.cleanSettings);
            } catch (previewError) {
                this.warn('Preview generation failed:', previewError);
                previewData = []; // Continue without preview
            }
            
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
     * Extract text from PDF page content with defensive programming
     */
    extractTextFromPage(textContent) {
        try {
            // Validate input
            if (!textContent) {
                throw new Error('No text content provided');
            }
            
            if (!textContent.items || !Array.isArray(textContent.items)) {
                throw new Error('Invalid text content structure - no items array');
            }
            
            if (textContent.items.length === 0) {
                this.warn('Page contains no text items');
                return '';
            }
            
            const textItems = textContent.items;
            let text = '';
            let lastY = null;
            
            // Safely sort items with error handling
            let sortedItems;
            try {
                sortedItems = textItems.filter(item => {
                    // Filter out invalid items
                    return item && 
                           item.str !== undefined && 
                           item.transform && 
                           Array.isArray(item.transform) && 
                           item.transform.length >= 6;
                }).sort((a, b) => {
                    try {
                        const yDiff = b.transform[5] - a.transform[5];
                        if (Math.abs(yDiff) > 3) return yDiff;
                        return a.transform[4] - b.transform[4];
                    } catch (sortError) {
                        this.warn('Error sorting text items:', sortError);
                        return 0; // Keep original order for problematic items
                    }
                });
            } catch (sortError) {
                this.warn('Failed to sort text items, using original order:', sortError);
                sortedItems = textItems.filter(item => item && item.str !== undefined);
            }
            
            if (sortedItems.length === 0) {
                this.warn('No valid text items found after filtering');
                return '';
            }
            
            // Process items safely
            sortedItems.forEach((item, index) => {
                try {
                    if (!item || typeof item.str !== 'string') {
                        return; // Skip invalid items
                    }
                    
                    const str = item.str.trim();
                    if (!str) return; // Skip empty strings
                    
                    // Safely extract position if available
                    let y = null;
                    if (item.transform && Array.isArray(item.transform) && item.transform.length >= 6) {
                        y = item.transform[5];
                    }
                    
                    // Add spacing logic
                    if (y !== null && lastY !== null && Math.abs(lastY - y) > 3) {
                        text += '\n';
                    } else if (text && !text.endsWith(' ') && !text.endsWith('\n')) {
                        text += ' ';
                    }
                    
                    text += str;
                    if (y !== null) lastY = y;
                    
                } catch (itemError) {
                    this.warn(`Error processing text item ${index}:`, itemError);
                    // Continue with next item
                }
            });
            
            if (!text) {
                this.warn('No text extracted from page');
                return '';
            }
            
            // Clean up the extracted text
            text = text.replace(/\s+/g, ' ').trim();
            
            return text;
            
        } catch (error) {
            this.error('Text extraction failed:', error);
            throw new Error(`Text extraction failed: ${error.message}`);
        }
    }

    /**
     * Preprocess single-line text by splitting on common delimiters
     * Handles cases where PDF extraction puts everything on one line
     */
    preprocessSingleLineText(text) {
        this.log(`🔧 Preprocessing single-line text: ${text.substring(0, 200)}...`);
        
        let processedText = text;
        
        // Split on common delimiters that indicate new function entries
        const delimiters = [
            /\s+Cnts\s+/g,           // Split after "Cnts"
            /\s+Units\s+/g,          // Split after "Units"
            /\s+%\s+(?=\d)/g,        // Split after "%" when followed by digit
            /\s+A\s+(?=\d)/g,        // Split after "A" (amperes) when followed by digit
            /\s+V\s+(?=\d)/g,        // Split after "V" (volts) when followed by digit
            /\s+MPH\s+(?=\d)/g,      // Split after "MPH" when followed by digit
            /(?<=\d)\s+(?=\d{1,3}\s+[A-Za-z])/g  // Split between value and next function number
        ];
        
        // Apply delimiter splitting
        delimiters.forEach((delimiter, index) => {
            const beforeSplit = processedText.split('\n').length;
            processedText = processedText.replace(delimiter, '\n');
            const afterSplit = processedText.split('\n').length;
            if (afterSplit > beforeSplit) {
                this.log(`🔧 Delimiter ${index + 1} (${delimiter.source}) created ${afterSplit - beforeSplit} new lines`);
            }
        });
        
        // Additional splitting for function patterns
        // Look for patterns like "123 Description" followed by numbers
        processedText = processedText.replace(/(\d{1,3})\s+([A-Za-z][^0-9]*?)\s+(\d{1,3})\s+(\d{1,3})\s+/g, 
            '$1 $2 $3 $4\n');
        
        // Split on "F.No." or "F." patterns that indicate new functions
        processedText = processedText.replace(/\s+F\.?\s*(?:No\.?)?\s*(\d{1,3})/g, '\nF.$1');
        
        // Clean up the result
        processedText = processedText
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .join('\n');
        
        this.log(`🔧 Preprocessing complete: ${text.split('\n').length} → ${processedText.split('\n').length} lines`);
        this.log(`🔧 Sample processed lines:`, processedText.split('\n').slice(0, 5));
        
        return processedText;
    }

    /**
     * Comprehensive PDF text preprocessing
     * Normalizes text format to improve pattern matching reliability
     */
    preprocessPDFText(text, pageNum = 'unknown') {
        this.log(`🔧 Starting comprehensive text preprocessing for page ${pageNum}`);
        this.log(`📝 Original text length: ${text.length} characters, lines: ${text.split('\n').length}`);
        
        // Step 1: Replace multiple spaces with single spaces
        this.log(`🔧 Step 1: Normalizing whitespace...`);
        let processedText = text.replace(/[ \t]+/g, ' ');
        this.log(`✅ Whitespace normalized (length: ${processedText.length})`);
        
        // Step 2: Detect if it's single-line format and needs processing
        const isOneLongLine = this.detectSingleLineFormat(processedText);
        this.log(`🔍 Single-line format detected: ${isOneLongLine}`);
        
        if (isOneLongLine) {
            // Step 3: Split by 'Cnts' to separate each function
            this.log(`🔧 Step 3: Splitting by 'Cnts' delimiter...`);
            processedText = this.splitByCnts(processedText);
            this.log(`✅ Split by Cnts complete (lines: ${processedText.split('\n').length})`);
            
            // Step 4: Convert single-line format to multi-line
            this.log(`🔧 Step 4: Converting to multi-line format...`);
            processedText = this.convertToMultiLine(processedText);
            this.log(`✅ Multi-line conversion complete (lines: ${processedText.split('\n').length})`);
        } else {
            this.log(`⏭️ Skipping single-line conversion - text already multi-line`);
        }
        
        // Step 5: Final cleanup
        this.log(`🔧 Step 5: Final text cleanup...`);
        processedText = this.finalTextCleanup(processedText);
        this.log(`✅ Final cleanup complete (length: ${processedText.length})`);
        
        // Step 6: Log the preprocessed text for verification
        this.logPreprocessedText(processedText, pageNum);
        
        return processedText;
    }

    /**
     * Detect if text is in single-line format
     */
    detectSingleLineFormat(text) {
        const lineCount = text.split('\n').length;
        const hasCnts = text.includes('Cnts');
        const hasMultipleFunctions = (text.match(/\d+\s+[A-Za-z]/g) || []).length > 1;
        const isLongSingleLine = lineCount <= 3 && text.length > 100;
        
        const isSingleLine = hasCnts && hasMultipleFunctions && isLongSingleLine;
        
        this.log(`🔍 Single-line detection:`, {
            lineCount,
            hasCnts,
            hasMultipleFunctions,
            isLongSingleLine,
            result: isSingleLine
        });
        
        return isSingleLine;
    }

    /**
     * Split text by 'Cnts' delimiter to separate functions
     */
    splitByCnts(text) {
        this.log(`🔧 Splitting text by 'Cnts' delimiter...`);
        
        // Split by 'Cnts' but preserve the delimiter
        const parts = text.split(/(\s+Cnts\s*)/);
        const functions = [];
        
        for (let i = 0; i < parts.length; i += 2) {
            if (parts[i] && parts[i].trim()) {
                const functionText = parts[i].trim();
                const delimiter = parts[i + 1] || '';
                
                if (functionText) {
                    functions.push(functionText + delimiter.trim());
                }
            }
        }
        
        this.log(`✅ Split into ${functions.length} function entries`);
        this.log(`📝 Function entries:`, functions.slice(0, 3).map(f => f.substring(0, 50) + '...'));
        
        return functions.join('\n');
    }

    /**
     * Convert single-line format to multi-line
     */
    convertToMultiLine(text) {
        this.log(`🔧 Converting single-line format to multi-line...`);
        
        let processedText = text;
        
        // Convert patterns like "1 MPH Scaling 100 100 Cnts 3 Controlled..." to multi-line
        // Look for pattern: number + text + number + number + Cnts + next number
        processedText = processedText.replace(
            /(\d{1,3}\s+[A-Za-z][^0-9]*?\s+\d+\s+\d+\s+Cnts)\s+(?=\d{1,3}\s)/g,
            '$1\n'
        );
        
        // Handle F.No patterns
        processedText = processedText.replace(
            /(F\.?\s*(?:No\.?)?\s*\d{1,3}[^F]*?Cnts)\s+(?=F\.?\s*(?:No\.?)?\s*\d{1,3})/g,
            '$1\n'
        );
        
        // Additional splitting patterns
        const splitPatterns = [
            // Split after "Units" when followed by digit + space + letter
            /(\s+Units)\s+(?=\d{1,3}\s+[A-Za-z])/g,
            // Split after percentage when followed by digit + space + letter  
            /(\s+%)\s+(?=\d{1,3}\s+[A-Za-z])/g,
            // Split after voltage when followed by digit + space + letter
            /(\s+V)\s+(?=\d{1,3}\s+[A-Za-z])/g,
            // Split after amperage when followed by digit + space + letter
            /(\s+A)\s+(?=\d{1,3}\s+[A-Za-z])/g
        ];
        
        splitPatterns.forEach((pattern, index) => {
            const beforeLines = processedText.split('\n').length;
            processedText = processedText.replace(pattern, '$1\n');
            const afterLines = processedText.split('\n').length;
            if (afterLines > beforeLines) {
                this.log(`🔧 Split pattern ${index + 1} created ${afterLines - beforeLines} new lines`);
            }
        });
        
        return processedText;
    }

    /**
     * Final text cleanup
     */
    finalTextCleanup(text) {
        this.log(`🔧 Performing final text cleanup...`);
        
        return text
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .join('\n');
    }

    /**
     * Log preprocessed text for verification
     */
    logPreprocessedText(text, pageNum) {
        if (!this.debugMode) return;
        
        const lines = text.split('\n');
        this.log(`📊 Preprocessed text verification for page ${pageNum}:`);
        this.log(`📝 Total lines: ${lines.length}`);
        this.log(`📝 Total characters: ${text.length}`);
        
        // Show first few lines
        this.log(`📝 First 5 lines:`);
        lines.slice(0, 5).forEach((line, index) => {
            this.log(`   ${index + 1}: "${line}"`);
        });
        
        // Show function detection
        const functionLines = lines.filter(line => 
            /^\d{1,3}\s+[A-Za-z]/.test(line) || /^F\.?\s*\d{1,3}/.test(line)
        );
        this.log(`📝 Detected function lines: ${functionLines.length}`);
        
        if (functionLines.length > 0) {
            this.log(`📝 Sample function lines:`);
            functionLines.slice(0, 3).forEach((line, index) => {
                this.log(`   ${index + 1}: "${line}"`);
            });
        }
        
        // Check for common patterns
        const patterns = {
            'Cnts': (text.match(/Cnts/g) || []).length,
            'Units': (text.match(/Units/g) || []).length,
            'F.': (text.match(/F\./g) || []).length,
            'Numbers': (text.match(/\d+/g) || []).length
        };
        
        this.log(`📝 Pattern counts:`, patterns);
        
        // Verify format looks correct
        const looksCorrect = functionLines.length > 0 && lines.length > 1;
        this.log(`📝 Format verification: ${looksCorrect ? '✅ GOOD' : '❌ NEEDS REVIEW'}`);
        
        if (!looksCorrect) {
            this.log(`⚠️ Text may need manual review. Raw text sample:`);
            this.log(`   "${text.substring(0, 300)}..."`);
        }
    }

    /**
     * Extract settings from a page using multiple methods with detailed logging
     */
    extractFromPage(text, pageNum) {
        const settings = {};
        this.log(`🔍 Starting pattern extraction for page ${pageNum} (text length: ${text.length})`);
        
        // Comprehensive text preprocessing before pattern matching
        this.log(`🔧 Starting comprehensive text preprocessing...`);
        const originalText = text;
        text = this.preprocessPDFText(text, pageNum);
        
        // Show what text we're actually working with
        if (this.debugMode) {
            this.log(`📝 Text preprocessing complete for page ${pageNum}:`, {
                originalLength: originalText.length,
                processedLength: text.length,
                originalLines: originalText.split('\n').length,
                processedLines: text.split('\n').length,
                firstLine: text.split('\n')[0] || '',
                wordCount: text.split(/\s+/).length,
                hasTableStructure: text.includes('F.No.') || text.includes('Function') || text.includes('Counts'),
                textSample: text.substring(0, 200) + (text.length > 200 ? '...' : '')
            });
        }
        
        // Run comprehensive pattern test to understand what patterns are available
        if (this.debugMode) {
            this.log(`🧪 Running comprehensive pattern test for debugging:`);
            const patternTestResults = this.testAllPatterns(text, pageNum);
            this.log(`📊 Pattern test completed:`, patternTestResults);
        }
        
        // Try GE Sentry format first
        this.log(`🧪 Testing GE Sentry format patterns on page ${pageNum}`);
        const sentryResults = this.extractGESentryFormat(text, pageNum);
        if (Object.keys(sentryResults).length > 0) {
            Object.assign(settings, sentryResults);
            this.log(`✅ GE Sentry format found ${Object.keys(sentryResults).length} settings on page ${pageNum}:`, sentryResults);
        } else {
            this.log(`❌ No GE Sentry format matches found on page ${pageNum}`);
        }
        
        // Try HudsGemstats.pdf specific format
        if (Object.keys(settings).length < 5) {
            this.log(`🧪 Testing HudsGemstats format patterns on page ${pageNum} (current count: ${Object.keys(settings).length})`);
            const hudsResults = this.extractHudsGemstatsFormat(text, pageNum);
            if (Object.keys(hudsResults).length > 0) {
                Object.assign(settings, hudsResults);
                this.log(`✅ HudsGemstats format found ${Object.keys(hudsResults).length} settings on page ${pageNum}:`, hudsResults);
            } else {
                this.log(`❌ No HudsGemstats format matches found on page ${pageNum}`);
            }
        } else {
            this.log(`⏭️ Skipping HudsGemstats patterns - already found ${Object.keys(settings).length} settings`);
        }
        
        // Try flexible function patterns
        if (Object.keys(settings).length < 5) {
            this.log(`🧪 Testing flexible function patterns on page ${pageNum} (current count: ${Object.keys(settings).length})`);
            const flexibleResults = this.extractFlexibleFunctions(text, pageNum);
            if (Object.keys(flexibleResults).length > 0) {
                Object.assign(settings, flexibleResults);
                this.log(`✅ Flexible patterns found ${Object.keys(flexibleResults).length} settings on page ${pageNum}:`, flexibleResults);
            } else {
                this.log(`❌ No flexible pattern matches found on page ${pageNum}`);
            }
        } else {
            this.log(`⏭️ Skipping flexible patterns - already found ${Object.keys(settings).length} settings`);
        }
        
        // Try inline patterns (for single-line text)
        if (Object.keys(settings).length < 5) {
            this.log(`🧪 Testing inline format patterns on page ${pageNum} (current count: ${Object.keys(settings).length})`);
            const inlineResults = this.extractInlineFormat(text, pageNum);
            if (Object.keys(inlineResults).length > 0) {
                Object.assign(settings, inlineResults);
                this.log(`✅ Inline format found ${Object.keys(inlineResults).length} settings on page ${pageNum}:`, inlineResults);
            } else {
                this.log(`❌ No inline format matches found on page ${pageNum}`);
            }
        } else {
            this.log(`⏭️ Skipping inline patterns - already found ${Object.keys(settings).length} settings`);
        }
        
        // Try simple format
        if (Object.keys(settings).length < 5) {
            this.log(`🧪 Testing simple format patterns on page ${pageNum} (current count: ${Object.keys(settings).length})`);
            const simpleResults = this.extractSimpleFormat(text, pageNum);
            if (Object.keys(simpleResults).length > 0) {
                Object.assign(settings, simpleResults);
                this.log(`✅ Simple format found ${Object.keys(simpleResults).length} settings on page ${pageNum}:`, simpleResults);
            } else {
                this.log(`❌ No simple format matches found on page ${pageNum}`);
            }
        } else {
            this.log(`⏭️ Skipping simple patterns - already found ${Object.keys(settings).length} settings`);
        }
        
        this.log(`📊 Page ${pageNum} extraction summary: ${Object.keys(settings).length} total settings found`);
        return settings;
    }
    
    /**
     * Extract GE Sentry format with detailed pattern logging
     */
    extractGESentryFormat(text, pageNum = 'unknown') {
        const settings = {};
        this.log(`🔍 Starting GE Sentry format extraction for page ${pageNum}`);
        
        // Pattern 1: Try complete Sentry format
        const pattern1 = this.patterns.geSentryComplete;
        this.log(`🧪 Testing pattern 1 (geSentryComplete): ${pattern1.source}`);
        let matches = [...text.matchAll(pattern1)];
        this.log(`📊 Pattern 1 found ${matches.length} matches`);
        
        if (matches.length > 0) {
            this.log(`🔍 Processing ${matches.length} geSentryComplete matches:`, matches.map(m => m[0]));
        }
        
        matches.forEach((match, index) => {
            const funcNum = parseInt(match[1]);
            const value = parseInt(match[4]) || parseInt(match[3]);
            this.log(`🧪 Match ${index + 1}: Function ${funcNum}, Value ${value} (valid: ${this.isValidFunction(funcNum) && this.isValidValue(value)})`);
            if (this.isValidFunction(funcNum) && this.isValidValue(value)) {
                settings[funcNum] = value;
                this.log(`✅ Added setting: F.${funcNum} = ${value}`);
            } else {
                this.log(`❌ Rejected: F.${funcNum} = ${value} (invalid function or value)`);
            }
        });
        
        // Pattern 2: Try simple Sentry format
        if (Object.keys(settings).length < 5) {
            const pattern2 = this.patterns.geSentrySimple;
            this.log(`🧪 Testing pattern 2 (geSentrySimple): ${pattern2.source}`);
            matches = [...text.matchAll(pattern2)];
            this.log(`📊 Pattern 2 found ${matches.length} matches`);
            
            if (matches.length > 0) {
                this.log(`🔍 Processing ${matches.length} geSentrySimple matches:`, matches.map(m => m[0]));
            }
            
            matches.forEach((match, index) => {
                const funcNum = parseInt(match[1]);
                const value = parseInt(match[2]);
                this.log(`🧪 Match ${index + 1}: Function ${funcNum}, Value ${value} (valid: ${this.isValidFunction(funcNum) && this.isValidValue(value)}, exists: ${!!settings[funcNum]})`);
                if (this.isValidFunction(funcNum) && this.isValidValue(value) && !settings[funcNum]) {
                    settings[funcNum] = value;
                    this.log(`✅ Added setting: F.${funcNum} = ${value}`);
                } else {
                    this.log(`❌ Rejected: F.${funcNum} = ${value} (invalid, duplicate, or already exists)`);
                }
            });
        } else {
            this.log(`⏭️ Skipping geSentrySimple - already found ${Object.keys(settings).length} settings`);
        }
        
        this.log(`📊 GE Sentry extraction completed: ${Object.keys(settings).length} settings found`);
        return settings;
    }
    
    /**
     * Extract flexible function variations with detailed pattern logging
     */
    extractFlexibleFunctions(text, pageNum = 'unknown') {
        const settings = {};
        this.log(`🔍 Starting flexible function extraction for page ${pageNum}`);
        
        this.patterns.functionVariations.forEach((pattern, index) => {
            this.log(`🧪 Testing flexible pattern ${index + 1}: ${pattern.source}`);
            const matches = [...text.matchAll(pattern)];
            this.log(`📊 Flexible pattern ${index + 1} found ${matches.length} matches`);
            
            if (matches.length > 0) {
                this.log(`🔍 Processing ${matches.length} matches from pattern ${index + 1}:`, matches.map(m => m[0]));
            }
            
            matches.forEach((match, matchIndex) => {
                const funcNum = parseInt(match[1]);
                const value = parseInt(match[2]);
                this.log(`🧪 Pattern ${index + 1}, Match ${matchIndex + 1}: Function ${funcNum}, Value ${value} (valid: ${this.isValidFunction(funcNum) && this.isValidValue(value)}, exists: ${!!settings[funcNum]})`);
                
                if (this.isValidFunction(funcNum) && this.isValidValue(value) && !settings[funcNum]) {
                    settings[funcNum] = value;
                    this.log(`✅ Added setting from pattern ${index + 1}: F.${funcNum} = ${value}`);
                } else {
                    this.log(`❌ Rejected from pattern ${index + 1}: F.${funcNum} = ${value} (invalid, duplicate, or already exists)`);
                }
            });
        });
        
        this.log(`📊 Flexible function extraction completed: ${Object.keys(settings).length} settings found`);
        return settings;
    }
    
    /**
     * Extract simple format with detailed pattern logging
     */
    extractSimpleFormat(text, pageNum = 'unknown') {
        const settings = {};
        this.log(`🔍 Starting simple format extraction for page ${pageNum}`);
        
        this.patterns.simpleFormat.forEach((pattern, index) => {
            this.log(`🧪 Testing simple pattern ${index + 1}: ${pattern.source}`);
            const matches = [...text.matchAll(pattern)];
            this.log(`📊 Simple pattern ${index + 1} found ${matches.length} matches`);
            
            if (matches.length > 0) {
                this.log(`🔍 Processing ${matches.length} matches from simple pattern ${index + 1}:`, matches.map(m => m[0]));
            }
            
            matches.forEach((match, matchIndex) => {
                const funcNum = parseInt(match[1]);
                const value = parseInt(match[2]);
                this.log(`🧪 Simple pattern ${index + 1}, Match ${matchIndex + 1}: Function ${funcNum}, Value ${value} (valid: ${this.isValidFunction(funcNum) && this.isValidValue(value)}, exists: ${!!settings[funcNum]})`);
                
                if (this.isValidFunction(funcNum) && this.isValidValue(value) && !settings[funcNum]) {
                    settings[funcNum] = value;
                    this.log(`✅ Added setting from simple pattern ${index + 1}: F.${funcNum} = ${value}`);
                } else {
                    this.log(`❌ Rejected from simple pattern ${index + 1}: F.${funcNum} = ${value} (invalid, duplicate, or already exists)`);
                }
            });
        });
        
        this.log(`📊 Simple format extraction completed: ${Object.keys(settings).length} settings found`);
        return settings;
    }
    
    /**
     * Extract inline format patterns (for single-line text)
     */
    extractInlineFormat(text, pageNum = 'unknown') {
        const settings = {};
        this.log(`🔍 Starting inline format extraction for page ${pageNum}`);
        
        // Test each inline pattern
        Object.entries(this.patterns.inlinePatterns).forEach(([patternName, pattern]) => {
            this.log(`🧪 Testing inline pattern (${patternName}): ${pattern.source}`);
            const matches = [...text.matchAll(pattern)];
            this.log(`📊 Inline pattern ${patternName} found ${matches.length} matches`);
            
            if (matches.length > 0) {
                this.log(`🔍 Processing ${matches.length} matches from ${patternName}:`, matches.map(m => m[0]));
            }
            
            matches.forEach((match, matchIndex) => {
                let funcNum, value;
                
                // Handle different pattern formats
                if (patternName === 'functionDescValueCnts' || patternName === 'functionDescValueUnits') {
                    // Pattern: '1 MPH Scaling 22 22 Cnts' - function, desc, value1, value2
                    funcNum = parseInt(match[1]);
                    value = parseInt(match[4]) || parseInt(match[3]); // Prefer the second value if available
                } else if (patternName === 'fNumDescValueCnts') {
                    // Pattern: 'F.1 MPH Scaling 100 100 Cnts' - F.function, desc, value1, value2
                    funcNum = parseInt(match[1]);
                    value = parseInt(match[4]) || parseInt(match[3]); // Prefer the second value if available
                } else if (patternName === 'simpleInlinePairs') {
                    // Pattern: simple function-value pairs
                    funcNum = parseInt(match[1]);
                    value = parseInt(match[2]);
                }
                
                this.log(`🧪 Inline pattern ${patternName}, Match ${matchIndex + 1}: Function ${funcNum}, Value ${value} (valid: ${this.isValidFunction(funcNum) && this.isValidValue(value)}, exists: ${!!settings[funcNum]})`);
                
                if (this.isValidFunction(funcNum) && this.isValidValue(value) && !settings[funcNum]) {
                    settings[funcNum] = value;
                    this.log(`✅ Added setting from inline pattern ${patternName}: F.${funcNum} = ${value}`);
                } else {
                    this.log(`❌ Rejected from inline pattern ${patternName}: F.${funcNum} = ${value} (invalid, duplicate, or already exists)`);
                }
            });
        });
        
        this.log(`📊 Inline format extraction completed: ${Object.keys(settings).length} settings found`);
        return settings;
    }
    
    /**
     * Extract HudsGemstats.pdf specific format patterns
     * Format: function number (no F. prefix), function name, two identical values, then 'Cnts'
     * Example: "1 MPH Scaling 100 100 Cnts"
     */
    extractHudsGemstatsFormat(text, pageNum = 'unknown') {
        const settings = {};
        this.log(`🔍 Starting HudsGemstats format extraction for page ${pageNum}`);
        
        // Test each HudsGemstats-specific pattern
        Object.entries(this.patterns.hudsGemstatsPatterns).forEach(([patternName, pattern]) => {
            this.log(`🧪 Testing HudsGemstats pattern (${patternName}): ${pattern.source}`);
            const matches = [...text.matchAll(pattern)];
            this.log(`📊 HudsGemstats pattern ${patternName} found ${matches.length} matches`);
            
            if (matches.length > 0) {
                this.log(`🔍 Processing ${matches.length} matches from ${patternName}:`, matches.map(m => m[0]));
            }
            
            matches.forEach((match, matchIndex) => {
                const funcNum = parseInt(match[1]);
                const functionName = match[2].trim();
                const value = parseInt(match[3]);
                
                this.log(`🧪 HudsGemstats pattern ${patternName}, Match ${matchIndex + 1}:`);
                this.log(`   Function: ${funcNum}, Name: "${functionName}", Value: ${value}`);
                this.log(`   Full match: "${match[0]}"`);
                this.log(`   Valid: ${this.isValidFunction(funcNum) && this.isValidValue(value)}, Exists: ${!!settings[funcNum]}`);
                
                if (this.isValidFunction(funcNum) && this.isValidValue(value) && !settings[funcNum]) {
                    settings[funcNum] = value;
                    this.log(`✅ Added HudsGemstats setting: F.${funcNum} = ${value} (${functionName})`);
                } else {
                    const reason = !this.isValidFunction(funcNum) ? 'invalid function' :
                                 !this.isValidValue(value) ? 'invalid value' :
                                 settings[funcNum] ? 'already exists' : 'unknown';
                    this.log(`❌ Rejected HudsGemstats setting: F.${funcNum} = ${value} (${reason})`);
                }
            });
        });
        
        this.log(`📊 HudsGemstats format extraction completed: ${Object.keys(settings).length} settings found`);
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

    /**
     * Test all patterns against sample text for comprehensive debugging
     */
    testAllPatterns(text, pageNum = 'unknown') {
        this.log(`🧪 COMPREHENSIVE PATTERN TEST for page ${pageNum}`);
        this.log(`📝 Testing against text snippet: "${text.substring(0, 200)}..."`);
        
        let totalMatches = 0;
        
        // Test GE Sentry patterns
        this.log(`🔍 Testing GE Sentry patterns:`);
        
        // Test geSentryComplete
        const sentryCompleteMatches = [...text.matchAll(this.patterns.geSentryComplete)];
        this.log(`  - geSentryComplete (${this.patterns.geSentryComplete.source}): ${sentryCompleteMatches.length} matches`);
        if (sentryCompleteMatches.length > 0) {
            sentryCompleteMatches.slice(0, 3).forEach((match, i) => {
                this.log(`    Match ${i + 1}: "${match[0]}" → F.${match[1]} = ${match[4] || match[3]}`);
            });
        }
        totalMatches += sentryCompleteMatches.length;
        
        // Test geSentrySimple
        const sentrySimpleMatches = [...text.matchAll(this.patterns.geSentrySimple)];
        this.log(`  - geSentrySimple (${this.patterns.geSentrySimple.source}): ${sentrySimpleMatches.length} matches`);
        if (sentrySimpleMatches.length > 0) {
            sentrySimpleMatches.slice(0, 3).forEach((match, i) => {
                this.log(`    Match ${i + 1}: "${match[0]}" → F.${match[1]} = ${match[2]}`);
            });
        }
        totalMatches += sentrySimpleMatches.length;
        
        // Test flexible function patterns
        this.log(`🔍 Testing flexible function patterns:`);
        this.patterns.functionVariations.forEach((pattern, index) => {
            const matches = [...text.matchAll(pattern)];
            this.log(`  - Pattern ${index + 1} (${pattern.source}): ${matches.length} matches`);
            if (matches.length > 0) {
                matches.slice(0, 2).forEach((match, i) => {
                    this.log(`    Match ${i + 1}: "${match[0]}" → F.${match[1]} = ${match[2]}`);
                });
            }
            totalMatches += matches.length;
        });
        
        // Test simple format patterns
        this.log(`🔍 Testing simple format patterns:`);
        this.patterns.simpleFormat.forEach((pattern, index) => {
            const matches = [...text.matchAll(pattern)];
            this.log(`  - Simple ${index + 1} (${pattern.source}): ${matches.length} matches`);
            if (matches.length > 0) {
                matches.slice(0, 2).forEach((match, i) => {
                    this.log(`    Match ${i + 1}: "${match[0]}" → ${match[1]} = ${match[2]}`);
                });
            }
            totalMatches += matches.length;
        });
        
        // Test for common text patterns that might indicate settings
        this.log(`🔍 Testing for common indicators:`);
        const functionIndicators = text.match(/F\.?\s*(?:No\.?)?\s*\d+/gi) || [];
        const numberPairs = text.match(/\d+\s*[:=\-]\s*\d+/g) || [];
        const tableHeaders = text.match(/function|counts|value|setting/gi) || [];
        
        this.log(`  - Function indicators (F.1, F.No.1, etc.): ${functionIndicators.length}`);
        if (functionIndicators.length > 0) {
            this.log(`    Examples: ${functionIndicators.slice(0, 5).join(', ')}`);
        }
        
        this.log(`  - Number pairs (123:456, 1=2, etc.): ${numberPairs.length}`);
        if (numberPairs.length > 0) {
            this.log(`    Examples: ${numberPairs.slice(0, 5).join(', ')}`);
        }
        
        this.log(`  - Table headers (function, counts, value, etc.): ${tableHeaders.length}`);
        if (tableHeaders.length > 0) {
            this.log(`    Found: ${tableHeaders.slice(0, 5).join(', ')}`);
        }
        
        // Test line-by-line analysis
        this.log(`🔍 Line-by-line analysis of first 10 lines:`);
        const lines = text.split('\n').slice(0, 10);
        lines.forEach((line, index) => {
            if (line.trim()) {
                const hasNumbers = /\d+/.test(line);
                const hasFunction = /F\.?/i.test(line);
                const hasColon = /:/.test(line);
                const hasEquals = /=/.test(line);
                
                this.log(`  Line ${index + 1}: "${line.trim()}" [numbers:${hasNumbers}, F.:${hasFunction}, ::${hasColon}, =:${hasEquals}]`);
            }
        });
        
        this.log(`📊 PATTERN TEST SUMMARY:`);
        this.log(`  - Total regex matches found: ${totalMatches}`);
        this.log(`  - Function indicators: ${functionIndicators.length}`);
        this.log(`  - Number pairs: ${numberPairs.length}`);
        this.log(`  - Table headers: ${tableHeaders.length}`);
        this.log(`  - Text length: ${text.length} characters`);
        this.log(`  - Non-empty lines: ${text.split('\n').filter(line => line.trim()).length}`);
        
        if (totalMatches === 0 && functionIndicators.length === 0 && numberPairs.length === 0) {
            this.log(`❌ NO PATTERNS MATCHED - This suggests:`);
            this.log(`  - PDF may contain scanned images instead of text`);
            this.log(`  - Text may be in an unexpected format`);
            this.log(`  - Settings may be embedded in non-standard layout`);
            this.log(`  - PDF may not contain controller settings`);
        } else if (totalMatches === 0 && functionIndicators.length > 0) {
            this.log(`⚠️ FUNCTION INDICATORS FOUND but no regex matches - This suggests:`);
            this.log(`  - Settings are present but in non-standard format`);
            this.log(`  - May need custom pattern for this specific PDF format`);
            this.log(`  - Values may be separated by unusual characters or spacing`);
        } else if (totalMatches > 0) {
            this.log(`✅ PATTERNS FOUND - PDF contains recognizable controller settings`);
        }
        
        return {
            totalMatches,
            functionIndicators: functionIndicators.length,
            numberPairs: numberPairs.length,
            tableHeaders: tableHeaders.length,
            textLength: text.length,
            nonEmptyLines: text.split('\n').filter(line => line.trim()).length
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PDFParser;
} else if (typeof window !== 'undefined') {
    // Make PDFParser available globally in browser environment
    window.PDFParser = PDFParser;
}
/**
 * GEM Controller Settings PDF Parser
 * Extracts function values from PDF files containing controller settings
 */
class PDFParser {
    constructor() {
        this.patterns = {
            // Pattern to match function entries like "F.No. 1" or "F.No. 3"
            functionNumber: /F\.No\.\s*(\d+)/i,
            // Pattern to match counts values (numeric values)
            countsValue: /Counts\s*[:=]?\s*(\d+)/i,
            // Alternative pattern for table rows with function and counts
            tableRow: /F\.No\.\s*(\d+)[\s\S]*?(\d+)\s*(?:Counts|$)/i,
            // Pattern for function descriptions
            functionDesc: /F\.No\.\s*\d+\s*[:\-]?\s*([A-Za-z\s]+?)(?:\d|Counts|$)/i,
            // Optimization comparison patterns
            functionWithName: /F\.(\d+)\s*[:\-]?\s*([A-Za-z\s]+?)(?:\s+\d|$)/i,
            originalOptimized: /Original\s*[:=]?\s*(\d+)\s*Optimized\s*[:=]?\s*(\d+)/i,
            tableHeader: /Function.*Original.*Optimized/i,
            // General patterns for different formats
            functionOnly: /^F\.?\s*(\d+)$/i,
            valueOnly: /^(\d+)$/
        };
        
        this.detectedFormats = [];
    }

    /**
     * Parse PDF file and extract controller settings
     * @param {File} file - PDF file to parse
     * @returns {Promise<Object>} Extracted settings
     */
    async parsePDF(file) {
        try {
            // Load PDF.js library if not already loaded
            if (typeof pdfjsLib === 'undefined') {
                await this.loadPDFJS();
            }

            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            
            const allFormats = [];
            
            // Process each page
            for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                const page = await pdf.getPage(pageNum);
                const textContent = await page.getTextContent();
                const text = this.extractTextFromPage(textContent);
                
                // Try to detect and parse different formats
                const formats = this.detectAndParseFormats(text, pageNum);
                allFormats.push(...formats);
            }
            
            // Consolidate results
            const consolidatedResults = this.consolidateFormats(allFormats);
            
            // Check if we found any valid settings
            if (consolidatedResults.length === 0) {
                const errorDetails = [];
                if (pdf.numPages === 0) {
                    errorDetails.push('PDF appears to be empty');
                } else {
                    errorDetails.push(`Analyzed ${pdf.numPages} page(s) but couldn't find controller settings`);
                    errorDetails.push('Expected format: F.No. column with function numbers (1-128) and values');
                    errorDetails.push('Supported formats: GE Controller Reference Guide, Sentry Export, Optimization Reports');
                }
                
                throw new Error(errorDetails.join('. '));
            }
            
            return {
                success: true,
                formats: consolidatedResults,
                multipleFormats: consolidatedResults.length > 1,
                fileName: file.name,
                parseDate: new Date().toISOString()
            };
            
        } catch (error) {
            console.error('PDF parsing error:', error);
            
            // Try fallback parsing
            const fallbackResult = await this.tryFallbackParsing(file);
            
            return {
                success: false,
                error: error.message,
                fallback: fallbackResult,
                suggestions: [
                    'Ensure PDF contains GE Controller settings in table format',
                    'Look for "F.No." column with function numbers and values',
                    'Check that the PDF is not password protected or corrupted',
                    'Verify the PDF contains controller function settings (1-128)'
                ]
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
     * Detect and parse different formats in the text
     * @param {string} text - Text to parse
     * @param {number} pageNum - Page number
     * @returns {Array} Array of detected formats with their settings
     */
    detectAndParseFormats(text, pageNum) {
        const formats = [];
        
        // Check for optimization comparison format
        if (this.patterns.tableHeader.test(text) || text.includes('Original') && text.includes('Optimized')) {
            const optimizationFormat = this.parseOptimizationFormat(text);
            if (optimizationFormat && Object.keys(optimizationFormat.original).length > 0) {
                formats.push({
                    type: 'optimization-comparison',
                    name: 'Optimization Comparison (Original vs Optimized)',
                    page: pageNum,
                    data: optimizationFormat
                });
            }
        }
        
        // Check for standard Sentry format
        const sentryFormat = this.parseSentryFormat(text);
        if (sentryFormat && Object.keys(sentryFormat.settings).length > 0) {
            formats.push({
                type: 'sentry-export',
                name: 'Sentry Software Export',
                page: pageNum,
                data: sentryFormat
            });
        }
        
        return formats;
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
     * Validate function number
     * @param {number} num - Function number
     * @returns {boolean} Is valid
     */
    isValidFunctionNumber(num) {
        // Valid GEM controller function numbers
        const validFunctions = [1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 15, 16, 19, 20, 22, 23, 24, 26];
        return validFunctions.includes(num);
    }

    /**
     * Validate counts value
     * @param {number} value - Counts value
     * @returns {boolean} Is valid
     */
    isValidCountsValue(value) {
        // Reasonable range for counts values
        return value >= 0 && value <= 500;
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
     * @returns {Object} Fallback settings
     */
    tryFallbackParsing(file) {
        // Return factory defaults as fallback format
        return [{
            type: 'fallback',
            name: 'Factory Defaults (Fallback)',
            settings: {
            1: 100,   // MPH Scaling
            3: 15,    // Controlled Acceleration
            4: 245,   // Max Armature Current
            5: 5,     // Plug Current
            6: 60,    // Armature Accel Rate
            7: 70,    // Minimum Field Current
            8: 245,   // Maximum Field Current
            9: 225,   // Regen Armature Current
            10: 100,  // Regen Max Field Current
            11: 11,   // Turf Speed Limit
            12: 11,   // Reverse Speed Limit
            14: 5,    // IR Compensation
            15: 72,   // Battery Volts
            19: 8,    // Field Ramp Rate
            20: 5,    // MPH Overspeed
            22: 22,   // Odometer Calibration
            23: 0,    // Error Compensation
            24: 55,   // Field Weakening Start
            26: 1     // Ratio Field to Arm
            }
        }];
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
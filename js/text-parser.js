/**
 * Text Parser for GEM Controller Settings
 * Parses pasted text from PDF readers or any source
 */
class TextParser {
    constructor() {
        this.debugMode = true;
        
        // Comprehensive patterns for text parsing
        this.patterns = {
            // Primary function patterns - very flexible for pasted text
            functionBasic: [
                // F.1 123, F.No.1 123, F 1 123, etc.
                /F\.?\s*(?:No\.?)?\s*(\d{1,3})\s+(\d{1,3})/gi,
                // F.1: 123, F.No.1: 123, F 1: 123, etc.
                /F\.?\s*(?:No\.?)?\s*(\d{1,3})\s*:\s*(\d{1,3})/gi,
                // F.1=123, F.No.1=123, F 1=123, etc.
                /F\.?\s*(?:No\.?)?\s*(\d{1,3})\s*=\s*(\d{1,3})/gi,
                // F.1-123, F.No.1-123, F 1-123, etc.
                /F\.?\s*(?:No\.?)?\s*(\d{1,3})\s*-\s*(\d{1,3})/gi
            ],
            
            // Sentry export patterns
            sentryPatterns: [
                // F.No.1 Description Counts 123 Value 123
                /F\.?\s*(?:No\.?)?\s*(\d{1,3})\s+.*?\s+Counts\s+(\d{1,3})\s+Value\s+(\d{1,3})/gi,
                // F.No.1 Description Counts 123
                /F\.?\s*(?:No\.?)?\s*(\d{1,3})\s+.*?\s+Counts\s+(\d{1,3})/gi,
                // Function 1 - Description: 123
                /Function\s+(\d{1,3})\s*\-\s*.*?:\s*(\d{1,3})/gi
            ],
            
            // Table format patterns (common in copy-paste)
            tablePatterns: [
                // 1    MPH Scaling    100    100
                /^(\d{1,3})\s+.*?\s+(\d{1,3})\s+(\d{1,3})$/gm,
                // F.1  MPH Scaling    100
                /^F\.?\s*(\d{1,3})\s+.*?\s+(\d{1,3})$/gm,
                // 1\t100 (tab separated)
                /^(\d{1,3})\t.*?\t(\d{1,3})$/gm
            ],
            
            // Simple number pairs
            numberPairs: [
                // Just number pairs on same line: 1 123, 01 123
                /^\s*(\d{1,3})\s+(\d{1,3})\s*$/gm,
                // Number pairs with separators: 1:123, 01:123
                /^\s*(\d{1,3})\s*[:=\-]\s*(\d{1,3})\s*$/gm,
                // Flexible whitespace: lots of spaces between numbers
                /(\d{1,3})\s{2,}(\d{1,3})/g
            ],
            
            // Line-by-line extraction
            linePatterns: [
                // Any line containing F.X and a number
                /.*F\.?\s*(?:No\.?)?\s*(\d{1,3}).*?(\d{1,3})/gi,
                // Any line with function keyword and numbers
                /.*(?:function|func)\s*(\d{1,3}).*?(\d{1,3})/gi
            ]
        };
        
        // Function names for validation
        this.functionNames = {
            1: 'MPH Scaling', 3: 'Controlled Acceleration', 4: 'Max Armature Current',
            5: 'Plug Current', 6: 'Armature Accel Rate', 7: 'Minimum Field Current',
            8: 'Maximum Field Current', 9: 'Regen Armature Current', 10: 'Regen Max Field Current',
            11: 'Turf Speed Limit', 12: 'Reverse Speed Limit', 15: 'Battery Volts',
            20: 'MPH Overspeed', 24: 'Field Weakening Start'
        };
    }
    
    /**
     * Parse pasted text and extract controller settings
     */
    parseText(text) {
        this.log('🔍 Starting text parsing', { 
            textLength: text.length, 
            lines: text.split('\n').length 
        });
        
        try {
            // Validate input
            if (!text || typeof text !== 'string') {
                throw new Error('No text provided for parsing');
            }
            
            if (text.trim().length === 0) {
                throw new Error('Text is empty');
            }
            
            // Clean and normalize the text
            const cleanedText = this.cleanText(text);
            this.log('📝 Text cleaned and normalized', {
                originalLength: text.length,
                cleanedLength: cleanedText.length,
                preview: cleanedText.substring(0, 200) + '...'
            });
            
            // Extract settings using multiple methods
            const settings = this.extractSettings(cleanedText);
            
            if (Object.keys(settings).length === 0) {
                throw new Error('No controller function settings found in the text');
            }
            
            // Validate and clean the found settings
            const validatedSettings = this.validateSettings(settings);
            
            this.log('✅ Text parsing completed successfully', {
                totalFound: Object.keys(settings).length,
                validated: Object.keys(validatedSettings).length
            });
            
            return {
                success: true,
                settings: validatedSettings,
                metadata: {
                    source: 'pasted_text',
                    totalFunctions: Object.keys(validatedSettings).length,
                    extractionMethod: 'text_parser',
                    confidence: this.calculateConfidence(validatedSettings),
                    parseDate: new Date().toISOString(),
                    originalTextLength: text.length,
                    cleanedTextLength: cleanedText.length
                },
                preview: this.generatePreview(validatedSettings),
                rawText: cleanedText
            };
            
        } catch (error) {
            this.error('Text parsing failed', error);
            return {
                success: false,
                error: error.message,
                suggestions: this.getErrorSuggestions(error, text)
            };
        }
    }
    
    /**
     * Clean and normalize pasted text
     */
    cleanText(text) {
        // Remove extra whitespace and normalize line endings
        let cleaned = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        
        // Remove excessive whitespace but preserve structure
        cleaned = cleaned.replace(/[ \t]+/g, ' ');
        
        // Remove empty lines but keep line structure
        cleaned = cleaned.replace(/\n\s*\n/g, '\n');
        
        // Trim each line
        cleaned = cleaned.split('\n').map(line => line.trim()).join('\n');
        
        return cleaned.trim();
    }
    
    /**
     * Extract settings using multiple parsing methods
     */
    extractSettings(text) {
        const candidates = new Map(); // Track multiple values for same function
        
        this.log('🔍 Starting multi-method extraction...');
        
        // Method 1: Function-specific patterns
        this.log('🧪 Testing function-specific patterns...');
        this.extractWithFunctionPatterns(text, candidates);
        
        // Method 2: Sentry export patterns
        if (candidates.size < 5) {
            this.log('🧪 Testing Sentry export patterns...');
            this.extractWithSentryPatterns(text, candidates);
        }
        
        // Method 3: Table patterns
        if (candidates.size < 5) {
            this.log('🧪 Testing table patterns...');
            this.extractWithTablePatterns(text, candidates);
        }
        
        // Method 4: Simple number pairs
        if (candidates.size < 5) {
            this.log('🧪 Testing simple number pairs...');
            this.extractWithNumberPairs(text, candidates);
        }
        
        // Method 5: Line-by-line analysis
        if (candidates.size < 5) {
            this.log('🧪 Testing line-by-line analysis...');
            this.extractLineByLine(text, candidates);
        }
        
        // Select best value for each function
        const settings = {};
        candidates.forEach((values, func) => {
            const bestValue = this.selectBestValue(values);
            settings[func] = bestValue.value;
            this.log(`✅ F.${func} = ${bestValue.value} (confidence: ${bestValue.confidence.toFixed(2)}, source: ${bestValue.source})`);
        });
        
        this.log(`📊 Extraction complete: ${Object.keys(settings).length} settings found`);
        return settings;
    }
    
    /**
     * Extract using function-specific patterns
     */
    extractWithFunctionPatterns(text, candidates) {
        this.patterns.functionBasic.forEach((pattern, index) => {
            const matches = [...text.matchAll(pattern)];
            this.log(`  Pattern ${index + 1} (${pattern.source}): ${matches.length} matches`);
            
            matches.forEach(match => {
                const func = parseInt(match[1]);
                const value = parseInt(match[2]);
                
                if (this.isValidFunction(func) && this.isValidValue(value)) {
                    this.addCandidate(candidates, func, value, `function_pattern_${index + 1}`, match[0]);
                }
            });
        });
    }
    
    /**
     * Extract using Sentry export patterns
     */
    extractWithSentryPatterns(text, candidates) {
        this.patterns.sentryPatterns.forEach((pattern, index) => {
            const matches = [...text.matchAll(pattern)];
            this.log(`  Sentry pattern ${index + 1}: ${matches.length} matches`);
            
            matches.forEach(match => {
                const func = parseInt(match[1]);
                let value;
                
                if (match[3]) {
                    // Has both Counts and Value, prefer Value
                    value = parseInt(match[3]);
                } else {
                    // Only has Counts
                    value = parseInt(match[2]);
                }
                
                if (this.isValidFunction(func) && this.isValidValue(value)) {
                    this.addCandidate(candidates, func, value, `sentry_pattern_${index + 1}`, match[0]);
                }
            });
        });
    }
    
    /**
     * Extract using table patterns
     */
    extractWithTablePatterns(text, candidates) {
        this.patterns.tablePatterns.forEach((pattern, index) => {
            const matches = [...text.matchAll(pattern)];
            this.log(`  Table pattern ${index + 1}: ${matches.length} matches`);
            
            matches.forEach(match => {
                const func = parseInt(match[1]);
                // For table patterns, take the last number as the value
                const value = parseInt(match[match.length - 1]);
                
                if (this.isValidFunction(func) && this.isValidValue(value)) {
                    this.addCandidate(candidates, func, value, `table_pattern_${index + 1}`, match[0]);
                }
            });
        });
    }
    
    /**
     * Extract using number pairs
     */
    extractWithNumberPairs(text, candidates) {
        this.patterns.numberPairs.forEach((pattern, index) => {
            const matches = [...text.matchAll(pattern)];
            this.log(`  Number pair pattern ${index + 1}: ${matches.length} matches`);
            
            matches.forEach(match => {
                const func = parseInt(match[1]);
                const value = parseInt(match[2]);
                
                if (this.isValidFunction(func) && this.isValidValue(value)) {
                    // Lower confidence for number pairs
                    this.addCandidate(candidates, func, value, `number_pair_${index + 1}`, match[0], 0.6);
                }
            });
        });
    }
    
    /**
     * Extract line by line for any remaining patterns
     */
    extractLineByLine(text, candidates) {
        const lines = text.split('\n');
        
        lines.forEach((line, lineIndex) => {
            const trimmedLine = line.trim();
            if (!trimmedLine) return;
            
            // Try line patterns
            this.patterns.linePatterns.forEach((pattern, patternIndex) => {
                const matches = [...trimmedLine.matchAll(pattern)];
                
                matches.forEach(match => {
                    const func = parseInt(match[1]);
                    const value = parseInt(match[2]);
                    
                    if (this.isValidFunction(func) && this.isValidValue(value)) {
                        this.addCandidate(candidates, func, value, `line_pattern_${patternIndex + 1}`, trimmedLine, 0.7);
                    }
                });
            });
        });
    }
    
    /**
     * Add a candidate value for a function
     */
    addCandidate(candidates, func, value, source, matchText, baseConfidence = 0.8) {
        if (!candidates.has(func)) {
            candidates.set(func, []);
        }
        
        const confidence = this.calculateMatchConfidence(func, value, source, matchText, baseConfidence);
        candidates.get(func).push({
            value,
            source,
            confidence,
            matchText: matchText.trim().substring(0, 100) // Limit length
        });
        
        this.log(`    Found: F.${func} = ${value} (${source}, confidence: ${confidence.toFixed(2)})`);
    }
    
    /**
     * Calculate confidence for a match
     */
    calculateMatchConfidence(func, value, source, matchText, baseConfidence) {
        let confidence = baseConfidence;
        
        // Boost confidence for known functions
        if (this.functionNames[func]) {
            confidence += 0.1;
        }
        
        // Boost confidence for reasonable values
        if (func <= 26 && value > 0 && value < 500) {
            confidence += 0.1;
        }
        
        // Boost confidence for clear function indicators
        if (/F\.?\s*(?:No\.?)?\s*\d+/i.test(matchText)) {
            confidence += 0.1;
        }
        
        // Boost confidence if function name appears in match
        if (this.functionNames[func] && matchText.toLowerCase().includes(this.functionNames[func].toLowerCase().substring(0, 6))) {
            confidence += 0.1;
        }
        
        return Math.min(confidence, 1.0);
    }
    
    /**
     * Select best value when multiple candidates exist
     */
    selectBestValue(values) {
        if (values.length === 1) {
            return values[0];
        }
        
        // Sort by confidence
        return values.sort((a, b) => b.confidence - a.confidence)[0];
    }
    
    /**
     * Validate extracted settings
     */
    validateSettings(settings) {
        const validated = {};
        
        Object.entries(settings).forEach(([func, value]) => {
            const f = parseInt(func);
            const v = parseInt(value);
            
            if (this.isValidFunction(f) && this.isValidValue(v)) {
                validated[f] = v;
            }
        });
        
        return validated;
    }
    
    /**
     * Generate preview of settings
     */
    generatePreview(settings) {
        const preview = [];
        const sortedFunctions = Object.keys(settings)
            .map(f => parseInt(f))
            .sort((a, b) => a - b);
        
        sortedFunctions.slice(0, 10).forEach(func => {
            preview.push({
                function: func,
                name: this.functionNames[func] || `Function ${func}`,
                value: settings[func]
            });
        });
        
        return preview;
    }
    
    /**
     * Calculate overall confidence
     */
    calculateConfidence(settings) {
        const count = Object.keys(settings).length;
        
        if (count === 0) return 0;
        if (count >= 20) return 0.95;
        if (count >= 10) return 0.85;
        if (count >= 5) return 0.75;
        return 0.65;
    }
    
    /**
     * Validate function number
     */
    isValidFunction(func) {
        return Number.isInteger(func) && func >= 1 && func <= 128;
    }
    
    /**
     * Validate function value
     */
    isValidValue(value) {
        return Number.isInteger(value) && value >= 0 && value <= 999;
    }
    
    /**
     * Get error suggestions
     */
    getErrorSuggestions(error, text) {
        const message = error.message.toLowerCase();
        
        if (message.includes('no text')) {
            return [
                'Make sure you copied text from the PDF',
                'Try selecting all text (Ctrl+A) before copying',
                'Paste the copied text into the text box'
            ];
        }
        
        if (message.includes('no controller function')) {
            return [
                'Make sure the text contains function numbers (F.1, F.2, etc.)',
                'Look for patterns like "F.1 = 100" or "Function 1: 100"',
                'Try copying from a different section of the PDF',
                'Use manual entry if the format is too complex'
            ];
        }
        
        return [
            'Try copying different sections of the PDF',
            'Make sure function numbers and values are visible',
            'Use Ctrl+A to select all text before copying',
            'Try manual entry as an alternative'
        ];
    }
    
    /**
     * Logging methods
     */
    log(message, data = null) {
        if (this.debugMode) {
            console.log(`[Text Parser] ${message}`, data || '');
        }
    }
    
    error(message, data = null) {
        console.error(`[Text Parser] ${message}`, data || '');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TextParser;
} else if (typeof window !== 'undefined') {
    window.TextParser = TextParser;
}
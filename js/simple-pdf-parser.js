/**
 * Simple PDF Parser - Flexible Pattern Matching
 * Focuses on finding function patterns without strict formatting requirements
 */
class SimplePDFParser {
    constructor() {
        this.debugMode = true;
        
        // Simple, flexible patterns that work with various text layouts
        this.patterns = {
            // Primary function patterns - very flexible
            basicFunction: [
                // F.1 123, F.No.1 123, F 1 123, etc.
                /F\.?\s*(?:No\.?)?\s*(\d{1,3})\s+(\d{1,3})/gi,
                // F.1: 123, F.No.1: 123, F 1: 123, etc.
                /F\.?\s*(?:No\.?)?\s*(\d{1,3})\s*:\s*(\d{1,3})/gi,
                // F.1=123, F.No.1=123, F 1=123, etc.
                /F\.?\s*(?:No\.?)?\s*(\d{1,3})\s*=\s*(\d{1,3})/gi,
                // F.1-123, F.No.1-123, F 1-123, etc.
                /F\.?\s*(?:No\.?)?\s*(\d{1,3})\s*-\s*(\d{1,3})/gi
            ],
            
            // Fallback patterns for when F. notation isn't clear
            numberPairs: [
                // Simple number pairs on same line: 1 123, 01 123, etc.
                /\b(\d{1,3})\s+(\d{1,3})\b/g,
                // Number pairs with separators: 1:123, 01:123, etc.
                /\b(\d{1,3})\s*[:=\-]\s*(\d{1,3})\b/g
            ],
            
            // Context-aware patterns
            tableRow: [
                // Look for patterns that appear to be table rows
                /(\d{1,3})\s+\w+.*?(\d{1,3})$/gm,
                /F\.?\s*(\d{1,3})\s+.*?(\d{1,3})$/gm
            ]
        };
        
        // Known function names to help validate matches
        this.functionNames = {
            1: 'MPH Scaling', 2: 'Reserved', 3: 'Controlled Acceleration', 4: 'Max Armature Current',
            5: 'Plug Current', 6: 'Armature Accel Rate', 7: 'Minimum Field Current', 8: 'Maximum Field Current',
            9: 'Regen Armature Current', 10: 'Regen Max Field Current', 11: 'Turf Speed Limit', 12: 'Reverse Speed Limit',
            15: 'Battery Volts', 20: 'MPH Overspeed', 24: 'Field Weakening Start'
        };
    }
    
    /**
     * Parse PDF with simple, flexible approach
     */
    async parsePDF(file) {
        this.log('🚀 Starting simple PDF parsing', { fileName: file.name, fileSize: file.size });
        
        try {
            // Basic validation
            if (!file || file.size === 0) {
                throw new Error('Invalid or empty file');
            }
            
            if (!file.type.includes('pdf')) {
                throw new Error('File is not a PDF');
            }
            
            // Check if PDF.js is available
            if (typeof pdfjsLib === 'undefined') {
                throw new Error('PDF.js library not loaded');
            }
            
            // Extract all text from PDF
            const allText = await this.extractAllText(file);
            
            if (!allText || allText.trim().length === 0) {
                throw new Error('No text could be extracted from PDF');
            }
            
            this.log('📄 Text extraction completed', {
                totalLength: allText.length,
                lines: allText.split('\n').length,
                preview: allText.substring(0, 300) + '...'
            });
            
            // Find all function settings using flexible patterns
            const settings = this.findFunctionSettings(allText);
            
            if (Object.keys(settings).length === 0) {
                throw new Error('No controller function settings found in PDF');
            }
            
            // Validate and clean the found settings
            const validatedSettings = this.validateSettings(settings);
            
            this.log('✅ PDF parsing completed successfully', {
                totalFound: Object.keys(settings).length,
                validated: Object.keys(validatedSettings).length
            });
            
            return {
                success: true,
                settings: validatedSettings,
                metadata: {
                    fileName: file.name,
                    totalFunctions: Object.keys(validatedSettings).length,
                    extractionMethod: 'simple_flexible',
                    confidence: this.calculateConfidence(validatedSettings),
                    parseDate: new Date().toISOString()
                },
                rawText: allText
            };
            
        } catch (error) {
            this.error('Simple PDF parsing failed', error);
            return {
                success: false,
                error: error.message,
                suggestions: this.getErrorSuggestions(error)
            };
        }
    }
    
    /**
     * Extract all text from PDF pages
     */
    async extractAllText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = async (e) => {
                try {
                    const arrayBuffer = e.target.result;
                    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                    
                    this.log(`📚 PDF loaded: ${pdf.numPages} pages`);
                    
                    let allText = '';
                    
                    // Process each page
                    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                        try {
                            const page = await pdf.getPage(pageNum);
                            const textContent = await page.getTextContent();
                            
                            // Extract text items and join them
                            let pageText = '';
                            textContent.items.forEach(item => {
                                if (item.str && item.str.trim()) {
                                    pageText += item.str + ' ';
                                }
                            });
                            
                            if (pageText.trim()) {
                                this.log(`📝 Page ${pageNum}: extracted ${pageText.length} characters`);
                                allText += pageText + '\n';
                            } else {
                                this.log(`⚠️ Page ${pageNum}: no text extracted`);
                            }
                            
                        } catch (pageError) {
                            this.warn(`Failed to process page ${pageNum}:`, pageError);
                            continue;
                        }
                    }
                    
                    resolve(allText);
                    
                } catch (pdfError) {
                    reject(new Error(`PDF processing failed: ${pdfError.message}`));
                }
            };
            
            reader.onerror = () => {
                reject(new Error('Failed to read PDF file'));
            };
            
            reader.readAsArrayBuffer(file);
        });
    }
    
    /**
     * Find function settings using flexible pattern matching
     */
    findFunctionSettings(text) {
        const settings = {};
        const candidates = new Map(); // Track multiple values for same function
        
        this.log('🔍 Starting flexible pattern search...');
        
        // Method 1: Look for explicit F.X patterns
        this.log('🧪 Testing basic function patterns...');
        this.patterns.basicFunction.forEach((pattern, index) => {
            const matches = [...text.matchAll(pattern)];
            this.log(`  Pattern ${index + 1} (${pattern.source}): ${matches.length} matches`);
            
            matches.forEach(match => {
                const func = parseInt(match[1]);
                const value = parseInt(match[2]);
                
                if (this.isValidFunction(func) && this.isValidValue(value)) {
                    this.addCandidate(candidates, func, value, `basic_pattern_${index + 1}`, match[0]);
                } else {
                    this.log(`    Rejected: F.${func}=${value} (invalid range)`);
                }
            });
        });
        
        // Method 2: Context-aware extraction
        this.log('🧪 Testing context-aware patterns...');
        this.extractWithContext(text, candidates);
        
        // Method 3: Fallback to number pairs if we don't have enough settings
        if (candidates.size < 5) {
            this.log('🧪 Using fallback number pair extraction...');
            this.extractNumberPairs(text, candidates);
        }
        
        // Select best value for each function
        candidates.forEach((values, func) => {
            const bestValue = this.selectBestValue(values);
            settings[func] = bestValue.value;
            this.log(`✅ F.${func} = ${bestValue.value} (confidence: ${bestValue.confidence}, source: ${bestValue.source})`);
        });
        
        this.log(`📊 Found ${Object.keys(settings).length} function settings total`);
        return settings;
    }
    
    /**
     * Add a candidate value for a function
     */
    addCandidate(candidates, func, value, source, matchText) {
        if (!candidates.has(func)) {
            candidates.set(func, []);
        }
        
        const confidence = this.calculateMatchConfidence(func, value, source, matchText);
        candidates.get(func).push({
            value,
            source,
            confidence,
            matchText: matchText.trim()
        });
        
        this.log(`    Found: F.${func} = ${value} (${source}, confidence: ${confidence.toFixed(2)})`);
    }
    
    /**
     * Extract settings using context clues
     */
    extractWithContext(text, candidates) {
        const lines = text.split('\n');
        
        lines.forEach((line, lineIndex) => {
            const trimmedLine = line.trim();
            if (!trimmedLine) return;
            
            // Look for lines that contain function indicators
            if (/F\.?\s*(?:No\.?)?\s*\d+/i.test(trimmedLine)) {
                // Extract all numbers from the line
                const numbers = trimmedLine.match(/\d+/g);
                if (numbers && numbers.length >= 2) {
                    // Try different combinations
                    for (let i = 0; i < numbers.length - 1; i++) {
                        const func = parseInt(numbers[i]);
                        const value = parseInt(numbers[i + 1]);
                        
                        if (this.isValidFunction(func) && this.isValidValue(value)) {
                            // Higher confidence if line contains function keywords
                            const hasKeywords = /function|counts|value|setting/i.test(trimmedLine);
                            const source = hasKeywords ? 'context_with_keywords' : 'context_line';
                            this.addCandidate(candidates, func, value, source, trimmedLine);
                        }
                    }
                }
            }
        });
    }
    
    /**
     * Extract number pairs as fallback
     */
    extractNumberPairs(text, candidates) {
        this.patterns.numberPairs.forEach((pattern, index) => {
            const matches = [...text.matchAll(pattern)];
            this.log(`  Number pair pattern ${index + 1}: ${matches.length} matches`);
            
            matches.forEach(match => {
                const func = parseInt(match[1]);
                const value = parseInt(match[2]);
                
                if (this.isValidFunction(func) && this.isValidValue(value)) {
                    // Lower confidence for number pairs
                    this.addCandidate(candidates, func, value, `number_pair_${index + 1}`, match[0]);
                }
            });
        });
    }
    
    /**
     * Select the best value when multiple candidates exist
     */
    selectBestValue(values) {
        if (values.length === 1) {
            return values[0];
        }
        
        // Sort by confidence, then by source reliability
        const sourceWeights = {
            'basic_pattern_1': 1.0,
            'basic_pattern_2': 0.9,
            'basic_pattern_3': 0.9,
            'basic_pattern_4': 0.8,
            'context_with_keywords': 0.85,
            'context_line': 0.7,
            'number_pair_1': 0.6,
            'number_pair_2': 0.5
        };
        
        return values.sort((a, b) => {
            const aWeight = (sourceWeights[a.source] || 0.5) * a.confidence;
            const bWeight = (sourceWeights[b.source] || 0.5) * b.confidence;
            return bWeight - aWeight;
        })[0];
    }
    
    /**
     * Calculate confidence for a match
     */
    calculateMatchConfidence(func, value, source, matchText) {
        let confidence = 0.5; // Base confidence
        
        // Boost confidence for known functions
        if (this.functionNames[func]) {
            confidence += 0.2;
        }
        
        // Boost confidence for reasonable values
        if (func <= 26 && value > 0 && value < 500) {
            confidence += 0.2;
        }
        
        // Boost confidence for clear function indicators
        if (/F\.?\s*(?:No\.?)?\s*\d+/i.test(matchText)) {
            confidence += 0.1;
        }
        
        return Math.min(confidence, 1.0);
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
     * Validate and clean settings
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
     * Calculate overall confidence
     */
    calculateConfidence(settings) {
        const count = Object.keys(settings).length;
        
        if (count === 0) return 0;
        if (count >= 20) return 0.9;
        if (count >= 10) return 0.8;
        if (count >= 5) return 0.7;
        return 0.6;
    }
    
    /**
     * Get error suggestions
     */
    getErrorSuggestions(error) {
        const message = error.message.toLowerCase();
        
        if (message.includes('no text')) {
            return [
                'PDF may contain only images or scanned content',
                'Try using OCR software to convert to text-based PDF',
                'Use manual entry instead'
            ];
        }
        
        if (message.includes('no controller function')) {
            return [
                'PDF may not contain GEM controller settings',
                'Ensure PDF is exported from programming software',
                'Look for function numbers (F.1, F.2, etc.) in the PDF',
                'Try manual entry for critical settings'
            ];
        }
        
        return [
            'Ensure PDF is not password protected',
            'Try exporting settings again from controller software',
            'Use manual entry as alternative'
        ];
    }
    
    /**
     * Logging methods
     */
    log(message, data = null) {
        if (this.debugMode) {
            console.log(`[Simple PDF Parser] ${message}`, data || '');
        }
    }
    
    warn(message, data = null) {
        if (this.debugMode) {
            console.warn(`[Simple PDF Parser] ${message}`, data || '');
        }
    }
    
    error(message, data = null) {
        console.error(`[Simple PDF Parser] ${message}`, data || '');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SimplePDFParser;
} else if (typeof window !== 'undefined') {
    window.SimplePDFParser = SimplePDFParser;
}
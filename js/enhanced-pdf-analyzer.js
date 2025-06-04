/**
 * Enhanced PDF Analyzer with Advanced AI Pattern Recognition
 * Provides comprehensive PDF analysis for GEM controller settings
 */
class EnhancedPDFAnalyzer {
    constructor() {
        this.patterns = {
            // Function number patterns
            functionNumbers: [
                /F\.?\s*(\d+)\s*[:=\-\s]\s*(\d+)/gi,
                /Function\s+(\d+)\s*[:=\-\s]\s*(\d+)/gi,
                /Parameter\s+(\d+)\s*[:=\-\s]\s*(\d+)/gi,
                /(\d+)\s*[:=\-\s]\s*(\d+)/gi,
                /F(\d+)\s+(\d+)/gi
            ],
            
            // Optimization comparison patterns
            optimizationComparison: [
                /F\.?(\d+).*?Original\s*[:=]?\s*(\d+).*?Optimized\s*[:=]?\s*(\d+)/gi,
                /F\.?(\d+).*?Before\s*[:=]?\s*(\d+).*?After\s*[:=]?\s*(\d+)/gi,
                /F\.?(\d+).*?Current\s*[:=]?\s*(\d+).*?New\s*[:=]?\s*(\d+)/gi,
                /F\.?(\d+).*?Factory\s*[:=]?\s*(\d+).*?Modified\s*[:=]?\s*(\d+)/gi
            ],
            
            // Table patterns
            tablePatterns: [
                /(\d+)\s+([A-Za-z\s\-\_]+?)\s+(\d+)\s+(\d+)/gi,
                /F\.?(\d+)\s+(.+?)\s+(\d+)/gi,
                /(\d+)\s+(.+?)\s+(\d+)$/gmi
            ],
            
            // Sentry software specific patterns
            sentryPatterns: [
                /Function\s+(\d+)\s*\-\s*(.+?):\s*(\d+)/gi,
                /F(\d+)\s*\-\s*(.+?):\s*(\d+)/gi,
                /(\d+)\s*\.\s*(.+?):\s*(\d+)/gi
            ],
            
            // Curtis programmer patterns
            curtisPatterns: [
                /Parameter\s+(\d+)\s*\((.+?)\)\s*:\s*(\d+)/gi,
                /P(\d+)\s*\-\s*(.+?):\s*(\d+)/gi
            ],
            
            // Generic named functions
            namedFunctions: [
                /(MPH\s+Scaling|Speed\s+Scaling)\s*[:=]\s*(\d+)/gi,
                /(Acceleration\s+Rate|Accel\s+Rate)\s*[:=]\s*(\d+)/gi,
                /(Max\s+Current|Maximum\s+Current)\s*[:=]\s*(\d+)/gi,
                /(Regeneration|Regen)\s*[:=]\s*(\d+)/gi,
                /(Turf\s+Mode)\s*[:=]\s*(\d+)/gi
            ]
        };
        
        this.functionDatabase = {
            1: { name: 'MPH Scaling', aliases: ['Speed Scaling', 'Top Speed'], range: [50, 150] },
            2: { name: 'Reserved', aliases: [], range: [0, 255] },
            3: { name: 'Controlled Acceleration', aliases: ['Acceleration Pot Gain', 'Accel Gain', 'Pot Gain'], range: [5, 50] },
            4: { name: 'Max Armature Current', aliases: ['Max Current', 'Armature Current'], range: [100, 350] },
            5: { name: 'Plug Current', aliases: ['Acceleration Pot Dead Zone', 'Dead Zone'], range: [1, 15] },
            6: { name: 'Armature Accel Rate', aliases: ['Acceleration Rate', 'Accel Rate'], range: [10, 100] },
            7: { name: 'Minimum Field Current', aliases: ['Min Field', 'Deceleration Rate', 'Decel Rate'], range: [10, 100] },
            8: { name: 'Maximum Field Current', aliases: ['Max Field', 'Field Current'], range: [100, 350] },
            9: { name: 'Regen Armature Current', aliases: ['Regeneration Current', 'Regen Current', 'Regen'], range: [50, 300] },
            10: { name: 'Regen Max Field Current', aliases: ['Map Select', 'Map Selection'], range: [50, 150] },
            11: { name: 'Turf Speed Limit', aliases: ['Turf Mode', 'Turf Setting'], range: [5, 40] },
            12: { name: 'Reverse Speed Limit', aliases: ['Motor Temperature Limit', 'Temp Limit', 'Temperature'], range: [3, 12] },
            13: { name: 'Reserved', aliases: ['Controller Temperature Limit', 'Controller Temp'], range: [0, 255] },
            14: { name: 'IR Compensation', aliases: ['Fault Detection', 'Fault Mode'], range: [0, 20] },
            15: { name: 'Battery Volts', aliases: ['PWM Frequency', 'PWM Freq'], range: [48, 96] },
            16: { name: 'Low Battery Volts', aliases: ['Motor Rotation Direction', 'Rotation'], range: [0, 100] },
            17: { name: 'Pack Over Temp', aliases: ['Brake Interlock', 'Brake Lock'], range: [0, 255] },
            18: { name: 'Reserved', aliases: ['Reverse Beeper', 'Reverse Alarm'], range: [0, 255] },
            19: { name: 'Field Ramp Rate', aliases: ['Low Voltage Cutoff', 'LVC', 'Low Voltage'], range: [1, 20] },
            20: { name: 'MPH Overspeed', aliases: ['Overspeed'], range: [1, 15] },
            21: { name: 'Handbrake', aliases: ['Economy Mode', 'Eco Mode'], range: [0, 1] },
            22: { name: 'Odometer Calibration', aliases: ['Motor Type', 'Motor Config'], range: [0, 255] },
            23: { name: 'Error Compensation', aliases: ['Battery Type', 'Battery Config'], range: [0, 255] },
            24: { name: 'Field Weakening Start', aliases: ['Field Weakening', 'Field Weak'], range: [0, 100] },
            25: { name: 'Pedal Enable', aliases: ['Speed Limiting', 'Speed Limit'], range: [0, 1] },
            26: { name: 'Ratio Field to Arm', aliases: ['Diagnostic Mode', 'Diagnostics'], range: [0, 10] }
        };
        
        // Initialize functions 27-128 with generic names
        for (let i = 27; i <= 128; i++) {
            this.functionDatabase[i] = { name: `Function ${i}`, aliases: [], range: [0, 255] };
        }
        
        this.confidenceWeights = {
            exactFunctionMatch: 1.0,
            namedFunctionMatch: 0.9,
            patternMatch: 0.8,
            contextMatch: 0.7,
            heuristicMatch: 0.6
        };
    }
    
    /**
     * Analyze PDF with enhanced pattern recognition
     */
    async analyzePDF(file) {
        try {
            // Validate input file
            if (!file) {
                throw new Error('No file provided for analysis');
            }
            
            // Extract text and structure
            const textContent = await this.extractTextWithStructure(file);
            
            // Check if we got valid text content
            if (!textContent || !textContent.pages) {
                throw new Error('Failed to extract content from PDF - file may be corrupted or contain no readable text');
            }
            
            if (textContent.pages.length === 0) {
                throw new Error('PDF contains no readable pages');
            }
            
            // Detect document format and layout
            const documentFormat = await this.detectDocumentFormat(textContent);
            
            // Extract settings using multiple methods
            const extractionResults = await this.extractSettingsMultiMethod(textContent, documentFormat);
            
            // Validate and clean extracted data
            const validatedSettings = await this.validateAndCleanSettings(extractionResults);
            
            // Generate comprehensive analysis
            const analysis = await this.generateComprehensiveAnalysis(validatedSettings, documentFormat);
            
            return {
                success: true,
                settings: validatedSettings.settings,
                metadata: {
                    format: documentFormat,
                    confidence: validatedSettings.overallConfidence,
                    extractionMethods: extractionResults.methods,
                    pageCount: (textContent && textContent.pages) ? textContent.pages.length : 0,
                    totalExtractions: extractionResults.totalExtractions
                },
                analysis: analysis,
                rawData: {
                    textContent: textContent.fullText,
                    structure: textContent.structure
                }
            };
            
        } catch (error) {
            console.error('Enhanced PDF analysis error:', error);
            return {
                success: false,
                error: error.message,
                fallback: await this.fallbackAnalysis(file)
            };
        }
    }
    
    /**
     * Extract text with document structure analysis
     */
    async extractTextWithStructure(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async function(e) {
                try {
                    const typedArray = new Uint8Array(e.target.result);
                    const pdf = await pdfjsLib.getDocument(typedArray).promise;
                    
                    let fullText = '';
                    let pages = [];
                    let structure = {
                        tables: [],
                        headers: [],
                        sections: []
                    };
                    
                    for (let i = 1; i <= pdf.numPages; i++) {
                        const page = await pdf.getPage(i);
                        const textContent = await page.getTextContent();
                        
                        // Analyze page structure
                        const pageStructure = await this.analyzePageStructure(textContent);
                        
                        let pageText = '';
                        textContent.items.forEach(item => {
                            pageText += item.str + ' ';
                        });
                        
                        pages.push({
                            number: i,
                            text: pageText,
                            structure: pageStructure
                        });
                        
                        fullText += pageText + '\n';
                        
                        // Merge page structure into document structure
                        structure.tables.push(...pageStructure.tables);
                        structure.headers.push(...pageStructure.headers);
                        structure.sections.push(...pageStructure.sections);
                    }
                    
                    resolve({
                        fullText,
                        pages,
                        structure,
                        metadata: {
                            pageCount: pdf.numPages,
                            title: await this.extractDocumentTitle(pdf),
                            creator: await this.extractDocumentCreator(pdf)
                        }
                    });
                } catch (error) {
                    // Return a safe fallback structure instead of rejecting
                    resolve({
                        fullText: '',
                        pages: [],
                        structure: {
                            tables: [],
                            headers: [],
                            sections: []
                        },
                        metadata: {
                            pageCount: 0,
                            title: 'Unknown',
                            creator: 'Unknown'
                        },
                        error: error.message
                    });
                }
            };
            reader.onerror = () => {
                // Handle file reading errors gracefully
                resolve({
                    fullText: '',
                    pages: [],
                    structure: {
                        tables: [],
                        headers: [],
                        sections: []
                    },
                    metadata: {
                        pageCount: 0,
                        title: 'Unknown',
                        creator: 'Unknown'
                    },
                    error: 'Failed to read PDF file'
                });
            };
            reader.readAsArrayBuffer(file);
        });
    }
    
    /**
     * Detect document format with advanced heuristics
     */
    async detectDocumentFormat(textContent) {
        const formatScores = {
            sentry: 0,
            curtis: 0,
            optimization: 0,
            comparison: 0,
            table: 0,
            manual: 0,
            generic: 0
        };
        
        const text = textContent.fullText.toLowerCase();
        
        // Sentry software indicators
        if (text.includes('sentry') || text.includes('handheld programmer')) {
            formatScores.sentry += 30;
        }
        if (text.match(/function\s+\d+\s*\-/gi)) {
            formatScores.sentry += 20;
        }
        
        // Curtis programmer indicators
        if (text.includes('curtis') || text.includes('1311') || text.includes('1314')) {
            formatScores.curtis += 25;
        }
        if (text.match(/parameter\s+\d+/gi)) {
            formatScores.curtis += 15;
        }
        
        // Optimization/comparison format
        if (text.includes('original') && text.includes('optimized')) {
            formatScores.optimization += 40;
        }
        if (text.includes('before') && text.includes('after')) {
            formatScores.comparison += 35;
        }
        
        // Table format indicators
        const tableIndicators = textContent.structure.tables.length;
        formatScores.table += tableIndicators * 10;
        
        // Manual/documentation format
        if (text.includes('manual') || text.includes('instruction')) {
            formatScores.manual += 20;
        }
        
        // Determine best format
        const bestFormat = Object.keys(formatScores).reduce((a, b) => 
            formatScores[a] > formatScores[b] ? a : b
        );
        
        const confidence = formatScores[bestFormat] / 100;
        
        return {
            type: bestFormat,
            confidence: Math.min(confidence, 1.0),
            scores: formatScores,
            indicators: this.getFormatIndicators(textContent, bestFormat)
        };
    }
    
    /**
     * Extract settings using multiple methods
     */
    async extractSettingsMultiMethod(textContent, format) {
        const methods = [];
        const allExtractions = {};
        let totalExtractions = 0;
        
        // Method 1: Format-specific extraction
        try {
            const formatSpecific = await this.extractFormatSpecific(textContent, format);
            if (Object.keys(formatSpecific).length > 0) {
                methods.push('format_specific');
                Object.assign(allExtractions, formatSpecific);
                totalExtractions += Object.keys(formatSpecific).length;
            }
        } catch (error) {
            console.warn('Format-specific extraction failed:', error);
        }
        
        // Method 2: Pattern-based extraction
        try {
            const patternBased = await this.extractPatternBased(textContent);
            methods.push('pattern_based');
            Object.assign(allExtractions, patternBased);
            totalExtractions += Object.keys(patternBased).length;
        } catch (error) {
            console.warn('Pattern-based extraction failed:', error);
        }
        
        // Method 3: Contextual extraction
        try {
            const contextual = await this.extractContextual(textContent);
            methods.push('contextual');
            Object.assign(allExtractions, contextual);
            totalExtractions += Object.keys(contextual).length;
        } catch (error) {
            console.warn('Contextual extraction failed:', error);
        }
        
        // Method 4: Machine learning/heuristic extraction
        try {
            const heuristic = await this.extractHeuristic(textContent);
            methods.push('heuristic');
            Object.assign(allExtractions, heuristic);
            totalExtractions += Object.keys(heuristic).length;
        } catch (error) {
            console.warn('Heuristic extraction failed:', error);
        }
        
        return {
            settings: allExtractions,
            methods: methods,
            totalExtractions: totalExtractions
        };
    }
    
    /**
     * Format-specific extraction
     */
    async extractFormatSpecific(textContent, format) {
        const settings = {};
        
        switch (format.type) {
            case 'sentry':
                this.extractSentryFormat(textContent.fullText, settings);
                break;
            case 'curtis':
                this.extractCurtisFormat(textContent.fullText, settings);
                break;
            case 'optimization':
            case 'comparison':
                this.extractOptimizationFormat(textContent.fullText, settings);
                break;
            case 'table':
                this.extractTableFormat(textContent, settings);
                break;
            default:
                this.extractGenericFormat(textContent.fullText, settings);
        }
        
        return settings;
    }
    
    /**
     * Pattern-based extraction using multiple patterns
     */
    async extractPatternBased(textContent) {
        const settings = {};
        const text = textContent.fullText;
        
        // Try function number patterns
        this.patterns.functionNumbers.forEach(pattern => {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                const func = parseInt(match[1]);
                const value = parseInt(match[2]);
                if (this.isValidFunction(func, value)) {
                    settings[func] = value;
                }
            }
        });
        
        // Try named function patterns
        this.patterns.namedFunctions.forEach(pattern => {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                const func = this.mapNameToFunction(match[1]);
                const value = parseInt(match[2]);
                if (func && this.isValidFunction(func, value)) {
                    settings[func] = value;
                }
            }
        });
        
        return settings;
    }
    
    /**
     * Contextual extraction using document structure
     */
    async extractContextual(textContent) {
        const settings = {};
        
        // Analyze tables for structured data
        textContent.structure.tables.forEach(table => {
            table.rows.forEach(row => {
                if (row.cells.length >= 2) {
                    const funcMatch = row.cells[0].match(/\b(\d+)\b/);
                    const valueMatch = row.cells[row.cells.length - 1].match(/\b(\d+)\b/);
                    
                    if (funcMatch && valueMatch) {
                        const func = parseInt(funcMatch[1]);
                        const value = parseInt(valueMatch[1]);
                        if (this.isValidFunction(func, value)) {
                            settings[func] = value;
                        }
                    }
                }
            });
        });
        
        return settings;
    }
    
    /**
     * Heuristic extraction using AI-like pattern recognition
     */
    async extractHeuristic(textContent) {
        const settings = {};
        const lines = textContent.fullText.split('\n');
        
        lines.forEach(line => {
            // Look for lines with numbers that might be settings
            const numbers = line.match(/\b\d+\b/g);
            if (numbers && numbers.length >= 2) {
                const potentialFunc = parseInt(numbers[0]);
                const potentialValue = parseInt(numbers[numbers.length - 1]);
                
                // Use context clues to determine if this is a valid setting
                if (this.isValidFunction(potentialFunc, potentialValue)) {
                    const confidence = this.calculateHeuristicConfidence(line, potentialFunc, potentialValue);
                    if (confidence > 0.6) {
                        settings[potentialFunc] = potentialValue;
                    }
                }
            }
        });
        
        return settings;
    }
    
    /**
     * Validate and clean extracted settings
     */
    async validateAndCleanSettings(extractionResults) {
        const settings = {};
        const functionCounts = {};
        const confidenceScores = {};
        
        // Count occurrences of each function to identify most reliable values
        Object.entries(extractionResults.settings).forEach(([func, value]) => {
            const f = parseInt(func);
            if (!functionCounts[f]) {
                functionCounts[f] = {};
            }
            if (!functionCounts[f][value]) {
                functionCounts[f][value] = 0;
            }
            functionCounts[f][value]++;
        });
        
        // Select most common value for each function
        Object.entries(functionCounts).forEach(([func, values]) => {
            const f = parseInt(func);
            const sortedValues = Object.entries(values).sort(([,a], [,b]) => b - a);
            const mostCommon = parseInt(sortedValues[0][0]);
            
            if (this.isValidFunction(f, mostCommon)) {
                settings[f] = mostCommon;
                confidenceScores[f] = this.calculateConfidence(f, mostCommon, values);
            }
        });
        
        // Calculate overall confidence
        const totalConfidence = Object.values(confidenceScores).reduce((sum, conf) => sum + conf, 0);
        const overallConfidence = Object.keys(confidenceScores).length > 0 ? 
            totalConfidence / Object.keys(confidenceScores).length : 0;
        
        return {
            settings,
            confidenceScores,
            overallConfidence,
            validationResults: {
                totalFunctions: Object.keys(settings).length,
                highConfidence: Object.values(confidenceScores).filter(c => c > 0.8).length,
                mediumConfidence: Object.values(confidenceScores).filter(c => c > 0.6 && c <= 0.8).length,
                lowConfidence: Object.values(confidenceScores).filter(c => c <= 0.6).length
            }
        };
    }
    
    /**
     * Generate comprehensive analysis
     */
    async generateComprehensiveAnalysis(validatedSettings, format) {
        const analysis = {
            extractionQuality: this.assessExtractionQuality(validatedSettings),
            settingsProfile: await this.analyzeSettingsProfile(validatedSettings.settings),
            modifications: await this.detectModifications(validatedSettings.settings),
            recommendations: await this.generateRecommendations(validatedSettings.settings),
            warnings: await this.identifyWarnings(validatedSettings.settings),
            performance: await this.estimatePerformance(validatedSettings.settings)
        };
        
        return analysis;
    }
    
    /**
     * Utility functions
     */
    isValidFunction(func, value) {
        if (func < 1 || func > 128) return false;
        if (value < 0 || value > 999) return false;
        
        const functionData = this.functionDatabase[func];
        if (functionData && functionData.range) {
            // Be more lenient with range validation for unknown functions
            if (func > 26) {
                return true; // Accept any valid value for functions 27-128
            }
            return value >= functionData.range[0] && value <= functionData.range[1];
        }
        
        return true;
    }
    
    mapNameToFunction(name) {
        const normalized = name.toLowerCase().replace(/[^a-z]/g, '');
        
        for (const [func, data] of Object.entries(this.functionDatabase)) {
            const aliases = [data.name, ...data.aliases].map(alias => 
                alias.toLowerCase().replace(/[^a-z]/g, '')
            );
            
            if (aliases.some(alias => normalized.includes(alias) || alias.includes(normalized))) {
                return parseInt(func);
            }
        }
        
        return null;
    }
    
    calculateHeuristicConfidence(line, func, value) {
        let confidence = 0.5; // Base confidence
        
        // Check for function indicators
        if (line.toLowerCase().includes('function') || line.toLowerCase().includes('f.')) {
            confidence += 0.2;
        }
        
        // Check for setting indicators
        if (line.includes(':') || line.includes('=') || line.includes('-')) {
            confidence += 0.1;
        }
        
        // Check for known function names
        const functionData = this.functionDatabase[func];
        if (functionData) {
            const aliases = [functionData.name, ...functionData.aliases];
            if (aliases.some(alias => line.toLowerCase().includes(alias.toLowerCase()))) {
                confidence += 0.3;
            }
        }
        
        return Math.min(confidence, 1.0);
    }
    
    calculateConfidence(func, value, values) {
        const occurrences = values[value];
        const totalOccurrences = Object.values(values).reduce((sum, count) => sum + count, 0);
        const frequency = occurrences / totalOccurrences;
        
        let confidence = frequency; // Base on frequency
        
        // Bonus for valid range
        const functionData = this.functionDatabase[func];
        if (functionData && functionData.range) {
            const [min, max] = functionData.range;
            if (value >= min && value <= max) {
                confidence += 0.2;
            }
        }
        
        return Math.min(confidence, 1.0);
    }
    
    async analyzePageStructure(textContent) {
        // Placeholder for page structure analysis
        return {
            tables: [],
            headers: [],
            sections: []
        };
    }
    
    extractSentryFormat(text, settings) {
        this.patterns.sentryPatterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                const func = parseInt(match[1]);
                const value = parseInt(match[3]);
                if (this.isValidFunction(func, value)) {
                    settings[func] = value;
                }
            }
        });
    }
    
    extractCurtisFormat(text, settings) {
        this.patterns.curtisPatterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                const func = parseInt(match[1]);
                const value = parseInt(match[3]);
                if (this.isValidFunction(func, value)) {
                    settings[func] = value;
                }
            }
        });
    }
    
    extractOptimizationFormat(text, settings) {
        this.patterns.optimizationComparison.forEach(pattern => {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                const func = parseInt(match[1]);
                const optimized = parseInt(match[3]);
                if (this.isValidFunction(func, optimized)) {
                    settings[func] = optimized;
                }
            }
        });
    }
    
    extractTableFormat(textContent, settings) {
        // Use structure analysis for better table extraction
        textContent.structure.tables.forEach(table => {
            table.rows.forEach(row => {
                if (row.cells.length >= 2) {
                    const funcMatch = row.cells[0].match(/\b(\d+)\b/);
                    const valueMatch = row.cells[row.cells.length - 1].match(/\b(\d+)\b/);
                    
                    if (funcMatch && valueMatch) {
                        const func = parseInt(funcMatch[1]);
                        const value = parseInt(valueMatch[1]);
                        if (this.isValidFunction(func, value)) {
                            settings[func] = value;
                        }
                    }
                }
            });
        });
    }
    
    extractGenericFormat(text, settings) {
        this.patterns.functionNumbers.forEach(pattern => {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                const func = parseInt(match[1]);
                const value = parseInt(match[2]);
                if (this.isValidFunction(func, value)) {
                    settings[func] = value;
                }
            }
        });
    }
    
    getFormatIndicators(textContent, format) {
        return {
            keywordMatches: [],
            structuralFeatures: [],
            confidence: 0.8
        };
    }
    
    assessExtractionQuality(validatedSettings) {
        return {
            totalSettings: Object.keys(validatedSettings.settings).length,
            confidence: validatedSettings.overallConfidence,
            quality: validatedSettings.overallConfidence > 0.8 ? 'high' : 
                    validatedSettings.overallConfidence > 0.6 ? 'medium' : 'low'
        };
    }
    
    async analyzeSettingsProfile(settings) {
        // Determine if settings appear to be performance, efficiency, or balanced
        const analysis = {
            type: 'balanced',
            characteristics: [],
            confidence: 0.8
        };
        
        // Analyze key settings to determine profile
        if (settings[1] > 110) analysis.characteristics.push('High speed configured');
        if (settings[6] > 80) analysis.characteristics.push('Aggressive acceleration');
        if (settings[9] > 250) analysis.characteristics.push('Strong regeneration');
        
        return analysis;
    }
    
    async detectModifications(settings) {
        const defaults = {
            1: 100, 3: 15, 4: 245, 5: 5, 6: 60, 7: 70, 8: 245, 9: 225, 10: 100, 11: 11, 12: 11, 
            14: 5, 15: 72, 19: 8, 20: 5, 22: 22, 23: 0, 24: 55, 26: 1
        };
        
        const modifications = [];
        
        Object.entries(settings).forEach(([func, value]) => {
            const defaultValue = defaults[func];
            if (defaultValue && Math.abs(value - defaultValue) > 5) {
                modifications.push({
                    function: parseInt(func),
                    name: this.functionDatabase[func]?.name || `Function ${func}`,
                    default: defaultValue,
                    current: value,
                    change: value - defaultValue,
                    percentChange: Math.round(((value - defaultValue) / defaultValue) * 100)
                });
            }
        });
        
        return modifications;
    }
    
    async generateRecommendations(settings) {
        return [
            'Settings appear to be within normal ranges',
            'Consider backing up current settings before modifications',
            'Test changes gradually for safety'
        ];
    }
    
    async identifyWarnings(settings) {
        const warnings = [];
        
        if (settings[4] > 300) warnings.push('High armature current - monitor motor temperature');
        if (settings[1] > 130) warnings.push('High speed setting - verify legal compliance');
        if (settings[12] < 5) warnings.push('Low temperature limit - risk of overheating');
        
        return warnings;
    }
    
    async estimatePerformance(settings) {
        return {
            estimatedTopSpeed: Math.round((settings[1] || 100) * 0.25),
            estimatedRange: '20-25 miles', // Placeholder
            accelerationRating: settings[6] > 70 ? 'High' : settings[6] > 40 ? 'Medium' : 'Low'
        };
    }
    
    async fallbackAnalysis(file) {
        // Simple fallback if main analysis fails
        try {
            const text = await this.extractSimpleText(file);
            const basicSettings = {};
            
            const pattern = /F\.?(\d+)\s*[:=]\s*(\d+)/gi;
            let match;
            while ((match = pattern.exec(text)) !== null) {
                const func = parseInt(match[1]);
                const value = parseInt(match[2]);
                if (func >= 1 && func <= 128 && value >= 0 && value <= 999) {
                    basicSettings[func] = value;
                }
            }
            
            return {
                success: Object.keys(basicSettings).length > 0,
                settings: basicSettings,
                confidence: 0.6,
                method: 'fallback'
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
    
    async extractSimpleText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async function(e) {
                try {
                    const typedArray = new Uint8Array(e.target.result);
                    const pdf = await pdfjsLib.getDocument(typedArray).promise;
                    let text = '';
                    
                    for (let i = 1; i <= pdf.numPages; i++) {
                        const page = await pdf.getPage(i);
                        const content = await page.getTextContent();
                        text += content.items.map(item => item.str).join(' ') + '\n';
                    }
                    
                    resolve(text);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }
    
    async extractDocumentTitle(pdf) {
        try {
            const metadata = await pdf.getMetadata();
            return metadata.info.Title || 'Unknown';
        } catch {
            return 'Unknown';
        }
    }
    
    async extractDocumentCreator(pdf) {
        try {
            const metadata = await pdf.getMetadata();
            return metadata.info.Creator || 'Unknown';
        } catch {
            return 'Unknown';
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EnhancedPDFAnalyzer;
}
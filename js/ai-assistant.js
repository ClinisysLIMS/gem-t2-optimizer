/**
 * AI Assistant for GEM T2 Optimizer
 * Provides intelligent auto-fill, PDF analysis, and real-time recommendations
 */
class AIAssistant {
    constructor() {
        this.vehicleDatabase = new VehicleDatabase();
        this.pdfAnalyzer = typeof EnhancedPDFAnalyzer !== 'undefined' ? 
            new EnhancedPDFAnalyzer() : new PDFAnalyzer();
        this.usageAnalyzer = new UsagePatternAnalyzer();
        this.recommendationEngine = new RecommendationEngine();
        this.learningModel = new LocalLearningModel();
        
        this.isInitialized = false;
        this.context = {
            vehicle: null,
            accessories: [],
            usage: {},
            environment: {},
            history: []
        };
        
        this.init();
    }
    
    /**
     * Initialize AI Assistant
     */
    async init() {
        try {
            await Promise.all([
                this.vehicleDatabase.load(),
                this.learningModel.initialize(),
                this.loadUserContext()
            ]);
            
            this.isInitialized = true;
            console.log('AI Assistant initialized successfully');
        } catch (error) {
            console.error('AI Assistant initialization failed:', error);
        }
    }
    
    /**
     * Auto-fill missing vehicle fields based on factory specs or similar vehicles
     */
    async autoFillVehicleFields(partialData) {
        if (!this.isInitialized) {
            await this.init();
        }
        
        const filledData = { ...partialData };
        
        try {
            // Get exact match from factory specs
            if (partialData.model && partialData.year) {
                const factorySpecs = await this.vehicleDatabase.getFactorySpecs(
                    partialData.model, 
                    partialData.year
                );
                
                if (factorySpecs) {
                    filledData.controller = filledData.controller || factorySpecs.controller;
                    filledData.motorType = filledData.motorType || factorySpecs.motorType;
                    filledData.motorPower = filledData.motorPower || factorySpecs.motorPower;
                    filledData.currentSpeed = filledData.currentSpeed || factorySpecs.topSpeed;
                    filledData.batteryType = filledData.batteryType || factorySpecs.batteryType;
                    filledData.weight = filledData.weight || factorySpecs.weight;
                    
                    return {
                        success: true,
                        data: filledData,
                        source: 'factory_specs',
                        confidence: 0.95,
                        message: `Auto-filled from factory specifications for ${partialData.model} ${partialData.year}`
                    };
                }
            }
            
            // Find similar vehicles for approximate data
            const similarVehicles = await this.vehicleDatabase.findSimilarVehicles(partialData);
            
            if (similarVehicles.length > 0) {
                const bestMatch = similarVehicles[0];
                const confidence = this.calculateSimilarityConfidence(partialData, bestMatch);
                
                filledData.controller = filledData.controller || bestMatch.controller;
                filledData.motorType = filledData.motorType || bestMatch.motorType;
                filledData.motorPower = filledData.motorPower || bestMatch.motorPower;
                filledData.currentSpeed = filledData.currentSpeed || bestMatch.topSpeed;
                
                return {
                    success: true,
                    data: filledData,
                    source: 'similar_vehicle',
                    confidence: confidence,
                    message: `Auto-filled based on similar ${bestMatch.model} ${bestMatch.year} (${Math.round(confidence * 100)}% confidence)`,
                    similarVehicle: bestMatch
                };
            }
            
            // Use AI model predictions based on available data
            const predictions = await this.learningModel.predictMissingFields(partialData);
            
            if (predictions) {
                Object.keys(predictions).forEach(key => {
                    if (!filledData[key] && predictions[key].confidence > 0.7) {
                        filledData[key] = predictions[key].value;
                    }
                });
                
                return {
                    success: true,
                    data: filledData,
                    source: 'ai_prediction',
                    confidence: predictions.overallConfidence,
                    message: 'Auto-filled using AI predictions based on typical configurations'
                };
            }
            
            return {
                success: false,
                data: filledData,
                message: 'Insufficient data for auto-fill. Please provide more vehicle details.'
            };
            
        } catch (error) {
            console.error('Auto-fill error:', error);
            return {
                success: false,
                data: filledData,
                error: error.message
            };
        }
    }
    
    /**
     * Analyze uploaded PDF and extract all controller settings
     */
    async analyzePDF(file) {
        if (!this.isInitialized) {
            await this.init();
        }
        
        try {
            // Use enhanced PDF analyzer if available
            if (this.pdfAnalyzer.analyzePDF) {
                // Enhanced analyzer with comprehensive analysis
                const result = await this.pdfAnalyzer.analyzePDF(file);
                
                if (result.success) {
                    // Learn from this PDF for future improvements
                    await this.learningModel.learnFromPDF(result.metadata.format, result.settings);
                    
                    return {
                        success: true,
                        format: result.metadata.format,
                        settings: result.settings,
                        analysis: result.analysis,
                        confidence: result.metadata.confidence,
                        metadata: result.metadata,
                        message: `Successfully extracted ${Object.keys(result.settings).length} controller settings with ${Math.round(result.metadata.confidence * 100)}% confidence`
                    };
                }
            }
            
            // Fallback to basic PDF analysis
            const textContent = await this.pdfAnalyzer.extractText(file);
            const formatDetection = await this.pdfAnalyzer.detectFormat(textContent);
            const extractedSettings = await this.pdfAnalyzer.extractControllerSettings(
                textContent, 
                formatDetection
            );
            
            // Validate and clean extracted settings
            const validatedSettings = await this.validateExtractedSettings(extractedSettings);
            
            // Analyze settings for insights
            const analysis = await this.analyzeExtractedSettings(validatedSettings);
            
            // Learn from this PDF for future improvements
            await this.learningModel.learnFromPDF(formatDetection, extractedSettings);
            
            return {
                success: true,
                format: formatDetection,
                settings: validatedSettings,
                analysis: analysis,
                confidence: formatDetection.confidence,
                message: `Successfully extracted ${Object.keys(validatedSettings).length} controller settings`
            };
            
        } catch (error) {
            console.error('PDF analysis error:', error);
            return {
                success: false,
                error: error.message,
                message: 'Failed to analyze PDF. Please ensure it contains GEM controller settings.'
            };
        }
    }
    
    /**
     * Provide intelligent recommendations based on usage patterns
     */
    async getUsageBasedRecommendations(vehicleData, usageHistory = []) {
        if (!this.isInitialized) {
            await this.init();
        }
        
        try {
            // Analyze usage patterns
            const patterns = await this.usageAnalyzer.analyzePatterns(usageHistory);
            
            // Get recommendations from multiple sources
            const recommendations = {
                accessories: await this.recommendAccessories(vehicleData, patterns),
                drivingModes: await this.recommendDrivingModes(patterns),
                settings: await this.recommendControllerSettings(vehicleData, patterns),
                maintenance: await this.recommendMaintenance(vehicleData, patterns),
                efficiency: await this.recommendEfficiencyImprovements(vehicleData, patterns)
            };
            
            // Prioritize recommendations
            const prioritized = await this.prioritizeRecommendations(recommendations, vehicleData);
            
            return {
                success: true,
                recommendations: prioritized,
                patterns: patterns,
                confidence: patterns.confidence,
                message: `Generated ${prioritized.length} personalized recommendations`
            };
            
        } catch (error) {
            console.error('Usage analysis error:', error);
            return {
                success: false,
                error: error.message,
                message: 'Unable to analyze usage patterns for recommendations'
            };
        }
    }
    
    /**
     * Suggest optimal settings for detected accessories and driving conditions
     */
    async suggestOptimalSettings(context) {
        if (!this.isInitialized) {
            await this.init();
        }
        
        const { vehicleData, accessories, conditions, drivingMode } = context;
        
        try {
            // Calculate base settings for vehicle
            const baseSettings = await this.calculateBaseSettings(vehicleData);
            
            // Apply accessory adjustments
            const accessoryAdjustments = await this.calculateAccessoryAdjustments(accessories);
            
            // Apply environmental adjustments
            const environmentalAdjustments = await this.calculateEnvironmentalAdjustments(conditions);
            
            // Apply driving mode adjustments
            const modeAdjustments = await this.calculateModeAdjustments(drivingMode);
            
            // Combine all adjustments intelligently
            const optimalSettings = await this.combineAdjustments({
                base: baseSettings,
                accessories: accessoryAdjustments,
                environmental: environmentalAdjustments,
                mode: modeAdjustments
            });
            
            // Validate settings are within safe limits
            const validatedSettings = await this.validateOptimalSettings(optimalSettings, vehicleData);
            
            // Generate explanation for each setting
            const explanations = await this.generateSettingsExplanations(validatedSettings, context);
            
            return {
                success: true,
                settings: validatedSettings,
                explanations: explanations,
                adjustments: {
                    accessories: accessoryAdjustments,
                    environmental: environmentalAdjustments,
                    mode: modeAdjustments
                },
                confidence: this.calculateSettingsConfidence(validatedSettings, context),
                message: 'Optimal settings calculated based on current configuration'
            };
            
        } catch (error) {
            console.error('Settings calculation error:', error);
            return {
                success: false,
                error: error.message,
                message: 'Unable to calculate optimal settings'
            };
        }
    }
    
    /**
     * Provide real-time assistance and suggestions
     */
    async getRealTimeAssistance(query, context = {}) {
        if (!this.isInitialized) {
            await this.init();
        }
        
        try {
            // Update context with current information
            this.updateContext(context);
            
            // Classify the type of assistance needed
            const assistanceType = await this.classifyAssistanceType(query);
            
            let response;
            
            switch (assistanceType.type) {
                case 'vehicle_identification':
                    response = await this.assistVehicleIdentification(query, context);
                    break;
                    
                case 'settings_explanation':
                    response = await this.explainSettings(query, context);
                    break;
                    
                case 'troubleshooting':
                    response = await this.provideTroubleshooting(query, context);
                    break;
                    
                case 'optimization_advice':
                    response = await this.provideOptimizationAdvice(query, context);
                    break;
                    
                case 'safety_check':
                    response = await this.performSafetyCheck(query, context);
                    break;
                    
                case 'accessory_guidance':
                    response = await this.provideAccessoryGuidance(query, context);
                    break;
                    
                default:
                    response = await this.provideGeneralAssistance(query, context);
            }
            
            // Learn from interaction
            await this.learningModel.learnFromInteraction(query, response, context);
            
            return {
                success: true,
                response: response,
                type: assistanceType.type,
                confidence: assistanceType.confidence,
                suggestions: await this.getFollowUpSuggestions(response, context)
            };
            
        } catch (error) {
            console.error('Real-time assistance error:', error);
            return {
                success: false,
                error: error.message,
                response: {
                    message: "I'm having trouble processing your request. Please try rephrasing or check your connection.",
                    suggestions: ['Try a more specific question', 'Check vehicle information is complete', 'Contact support if issue persists']
                }
            };
        }
    }
    
    /**
     * Validate extracted settings from PDF
     */
    async validateExtractedSettings(settings) {
        const validated = {};
        const validRanges = {
            1: { min: 50, max: 150, name: 'MPH Scaling' },
            3: { min: 5, max: 50, name: 'Acceleration Pot Gain' },
            4: { min: 100, max: 350, name: 'Max Armature Current' },
            6: { min: 10, max: 100, name: 'Acceleration Rate' },
            7: { min: 10, max: 100, name: 'Deceleration Rate' },
            8: { min: 100, max: 350, name: 'Max Field Current' },
            9: { min: 50, max: 300, name: 'Regen Current' },
            10: { min: 50, max: 150, name: 'Map Select' },
            11: { min: 5, max: 40, name: 'Turf Mode' },
            12: { min: 3, max: 12, name: 'Motor Temp Limit' },
            20: { min: 1, max: 15, name: 'MPH Overspeed' }
        };
        
        Object.entries(settings).forEach(([func, value]) => {
            const funcNum = parseInt(func);
            const range = validRanges[funcNum];
            
            if (range && typeof value === 'number') {
                if (value >= range.min && value <= range.max) {
                    validated[funcNum] = value;
                } else {
                    console.warn(`Invalid value for F.${funcNum} (${range.name}): ${value}. Expected ${range.min}-${range.max}`);
                }
            }
        });
        
        return validated;
    }
    
    /**
     * Analyze extracted settings for insights
     */
    async analyzeExtractedSettings(settings) {
        const analysis = {
            profile: 'unknown',
            modifications: [],
            warnings: [],
            insights: []
        };
        
        // Determine optimization profile
        const profile = await this.determineOptimizationProfile(settings);
        analysis.profile = profile.type;
        analysis.insights.push(profile.description);
        
        // Detect modifications from factory defaults
        const modifications = await this.detectModifications(settings);
        analysis.modifications = modifications;
        
        // Safety analysis
        const safetyCheck = await this.performSettingsSafetyCheck(settings);
        analysis.warnings = safetyCheck.warnings;
        
        // Performance estimation
        const performance = await this.estimatePerformance(settings);
        analysis.estimatedTopSpeed = performance.topSpeed;
        analysis.estimatedRange = performance.range;
        analysis.insights.push(`Estimated top speed: ${performance.topSpeed} MPH`);
        analysis.insights.push(`Estimated range impact: ${performance.rangeImpact}%`);
        
        return analysis;
    }
    
    /**
     * Calculate similarity confidence between vehicles
     */
    calculateSimilarityConfidence(partial, reference) {
        let score = 0;
        let factors = 0;
        
        // Model similarity
        if (partial.model === reference.model) {
            score += 0.4;
        } else if (partial.model && reference.model && 
                   partial.model.charAt(0) === reference.model.charAt(0)) {
            score += 0.2; // Same series (e2, e4, etc.)
        }
        factors++;
        
        // Year similarity
        if (partial.year === reference.year) {
            score += 0.3;
        } else if (partial.year && reference.year) {
            const yearDiff = Math.abs(
                this.parseYear(partial.year) - this.parseYear(reference.year)
            );
            if (yearDiff <= 2) score += 0.2;
            else if (yearDiff <= 5) score += 0.1;
        }
        factors++;
        
        // Controller similarity
        if (partial.controller === reference.controller) {
            score += 0.2;
        }
        factors++;
        
        // Motor type similarity
        if (partial.motorType === reference.motorType) {
            score += 0.1;
        }
        factors++;
        
        return Math.min(score / factors, 1.0);
    }
    
    /**
     * Parse year from year string (e.g., "2010-2015" -> 2012)
     */
    parseYear(yearString) {
        if (typeof yearString === 'number') return yearString;
        
        if (yearString.includes('-')) {
            const [start, end] = yearString.split('-').map(y => parseInt(y));
            return Math.round((start + end) / 2);
        }
        
        if (yearString.includes('+')) {
            return parseInt(yearString.replace('+', '')) + 2;
        }
        
        if (yearString.startsWith('pre-')) {
            return parseInt(yearString.replace('pre-', '')) - 2;
        }
        
        return parseInt(yearString) || 2010;
    }
    
    /**
     * Update AI context with current information
     */
    updateContext(newContext) {
        this.context = {
            ...this.context,
            ...newContext,
            lastUpdated: new Date()
        };
    }
    
    /**
     * Classify assistance type from user query
     */
    async classifyAssistanceType(query) {
        const patterns = {
            vehicle_identification: [
                /what.*model/i, /which.*controller/i, /identify.*vehicle/i,
                /motor.*type/i, /year.*gem/i, /specs.*for/i
            ],
            settings_explanation: [
                /what.*does.*f\./i, /explain.*setting/i, /function.*\d+/i,
                /what.*is.*acceleration/i, /current.*setting/i
            ],
            troubleshooting: [
                /problem.*with/i, /not.*working/i, /error/i, /issue/i,
                /slow.*acceleration/i, /battery.*drain/i, /overheating/i
            ],
            optimization_advice: [
                /optimize.*for/i, /best.*settings/i, /improve.*performance/i,
                /increase.*speed/i, /better.*range/i, /efficiency/i
            ],
            safety_check: [
                /safe.*to/i, /dangerous/i, /risk/i, /warning/i,
                /temperature.*high/i, /current.*too/i
            ],
            accessory_guidance: [
                /accessory/i, /install.*light/i, /lift.*kit/i, /sound.*system/i,
                /recommend.*accessories/i, /power.*draw/i
            ]
        };
        
        let bestMatch = { type: 'general', confidence: 0 };
        
        Object.entries(patterns).forEach(([type, regexes]) => {
            const matches = regexes.filter(regex => regex.test(query)).length;
            const confidence = matches / regexes.length;
            
            if (confidence > bestMatch.confidence) {
                bestMatch = { type, confidence };
            }
        });
        
        return bestMatch;
    }
    
    /**
     * Load user context from storage
     */
    async loadUserContext() {
        try {
            const stored = localStorage.getItem('ai-assistant-context');
            if (stored) {
                this.context = { ...this.context, ...JSON.parse(stored) };
            }
        } catch (error) {
            console.warn('Could not load AI context:', error);
        }
    }
    
    /**
     * Save user context to storage
     */
    async saveUserContext() {
        try {
            localStorage.setItem('ai-assistant-context', JSON.stringify(this.context));
        } catch (error) {
            console.warn('Could not save AI context:', error);
        }
    }
    
    /**
     * Get AI capabilities summary
     */
    getCapabilities() {
        return {
            autoFill: {
                enabled: this.isInitialized,
                features: ['Factory specs lookup', 'Similar vehicle matching', 'AI predictions']
            },
            pdfAnalysis: {
                enabled: this.isInitialized,
                formats: ['Sentry exports', 'Optimization reports', 'Settings comparisons']
            },
            recommendations: {
                enabled: this.isInitialized,
                types: ['Accessories', 'Driving modes', 'Settings', 'Maintenance', 'Efficiency']
            },
            realTimeAssistance: {
                enabled: this.isInitialized,
                categories: ['Identification', 'Troubleshooting', 'Optimization', 'Safety', 'Guidance']
            }
        };
    }
}

/**
 * Vehicle Database for factory specifications and similar vehicle matching
 */
class VehicleDatabase {
    constructor() {
        this.factorySpecs = new Map();
        this.similarityIndex = new Map();
        this.loaded = false;
    }
    
    async load() {
        // Load factory specifications
        this.factorySpecs = new Map([
            // GEM e2 specifications
            ['e2-2016+', {
                model: 'e2', year: '2016+', controller: 'T2', motorType: 'dc-stock',
                motorPower: 3.5, topSpeed: 25, batteryType: '72V', weight: 1100,
                defaultSettings: { 1: 100, 3: 15, 4: 245, 6: 60, 7: 70, 8: 245, 9: 225, 10: 100, 11: 11, 12: 7, 20: 5 }
            }],
            ['e2-2010-2015', {
                model: 'e2', year: '2010-2015', controller: 'T2', motorType: 'dc-stock',
                motorPower: 3.5, topSpeed: 25, batteryType: '72V', weight: 1090,
                defaultSettings: { 1: 100, 3: 15, 4: 235, 6: 55, 7: 65, 8: 235, 9: 215, 10: 95, 11: 11, 12: 7, 20: 5 }
            }],
            
            // GEM e4 specifications
            ['e4-2016+', {
                model: 'e4', year: '2016+', controller: 'T2', motorType: 'dc-stock',
                motorPower: 5.0, topSpeed: 25, batteryType: '72V', weight: 1250,
                defaultSettings: { 1: 100, 3: 15, 4: 265, 6: 65, 7: 75, 8: 265, 9: 245, 10: 105, 11: 11, 12: 7, 20: 5 }
            }],
            ['e4-2010-2015', {
                model: 'e4', year: '2010-2015', controller: 'T2', motorType: 'dc-stock',
                motorPower: 5.0, topSpeed: 25, batteryType: '72V', weight: 1240,
                defaultSettings: { 1: 100, 3: 15, 4: 255, 6: 60, 7: 70, 8: 255, 9: 235, 10: 100, 11: 11, 12: 7, 20: 5 }
            }],
            
            // GEM e6 specifications
            ['e6-2016+', {
                model: 'e6', year: '2016+', controller: 'T2', motorType: 'dc-stock',
                motorPower: 5.0, topSpeed: 25, batteryType: '72V', weight: 1350,
                defaultSettings: { 1: 100, 3: 15, 4: 275, 6: 70, 7: 80, 8: 275, 9: 255, 10: 110, 11: 11, 12: 7, 20: 5 }
            }],
            
            // Utility models
            ['eS-2016+', {
                model: 'eS', year: '2016+', controller: 'T2', motorType: 'dc-stock',
                motorPower: 5.0, topSpeed: 25, batteryType: '72V', weight: 1180,
                defaultSettings: { 1: 100, 3: 15, 4: 255, 6: 65, 7: 75, 8: 255, 9: 235, 10: 105, 11: 11, 12: 7, 20: 5 }
            }],
            ['eL-2016+', {
                model: 'eL', year: '2016+', controller: 'T2', motorType: 'dc-stock',
                motorPower: 5.0, topSpeed: 25, batteryType: '72V', weight: 1280,
                defaultSettings: { 1: 100, 3: 15, 4: 265, 6: 65, 7: 75, 8: 265, 9: 245, 10: 105, 11: 11, 12: 7, 20: 5 }
            }],
            ['eM-2016+', {
                model: 'eM', year: '2016+', controller: 'T2', motorType: 'dc-stock',
                motorPower: 5.0, topSpeed: 25, batteryType: '72V', weight: 1200,
                defaultSettings: { 1: 100, 3: 15, 4: 260, 6: 65, 7: 75, 8: 260, 9: 240, 10: 105, 11: 11, 12: 7, 20: 5 }
            }],
            ['elXD-2016+', {
                model: 'elXD', year: '2016+', controller: 'T2', motorType: 'dc-upgrade',
                motorPower: 7.0, topSpeed: 25, batteryType: '72V', weight: 1400,
                defaultSettings: { 1: 100, 3: 15, 4: 285, 6: 70, 7: 80, 8: 285, 9: 265, 10: 115, 11: 11, 12: 8, 20: 5 }
            }]
        ]);
        
        this.loaded = true;
    }
    
    async getFactorySpecs(model, year) {
        const key = `${model}-${year}`;
        return this.factorySpecs.get(key);
    }
    
    async findSimilarVehicles(partialData) {
        const similar = [];
        
        this.factorySpecs.forEach((specs, key) => {
            let similarity = 0;
            
            if (partialData.model === specs.model) similarity += 0.5;
            else if (partialData.model && specs.model.charAt(0) === partialData.model.charAt(0)) similarity += 0.2;
            
            if (partialData.year === specs.year) similarity += 0.3;
            if (partialData.controller === specs.controller) similarity += 0.1;
            if (partialData.motorType === specs.motorType) similarity += 0.1;
            
            if (similarity > 0.3) {
                similar.push({ ...specs, similarity });
            }
        });
        
        return similar.sort((a, b) => b.similarity - a.similarity);
    }
}

/**
 * PDF Analyzer for extracting controller settings
 */
class PDFAnalyzer {
    constructor() {
        this.formatPatterns = {
            sentry: {
                patterns: [
                    /F\.(\d+)\s*[:=]\s*(\d+)/gi,
                    /Function\s+(\d+)\s*[:=]\s*(\d+)/gi,
                    /F(\d+)\s+(\d+)/gi
                ],
                confidence: 0.9
            },
            optimization: {
                patterns: [
                    /Original\s*[:=]?\s*(\d+)\s*Optimized\s*[:=]?\s*(\d+)/gi,
                    /Before\s*[:=]?\s*(\d+)\s*After\s*[:=]?\s*(\d+)/gi
                ],
                confidence: 0.8
            },
            table: {
                patterns: [
                    /(\d+)\s+([A-Za-z\s]+?)\s+(\d+)/gi,
                    /F\.?(\d+)\s+(.+?)\s+(\d+)/gi
                ],
                confidence: 0.7
            }
        };
    }
    
    async extractText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async function(e) {
                try {
                    const typedArray = new Uint8Array(e.target.result);
                    const pdf = await pdfjsLib.getDocument(typedArray).promise;
                    let fullText = '';
                    
                    for (let i = 1; i <= pdf.numPages; i++) {
                        const page = await pdf.getPage(i);
                        const textContent = await page.getTextContent();
                        const pageText = textContent.items.map(item => item.str).join(' ');
                        fullText += pageText + '\n';
                    }
                    
                    resolve(fullText);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }
    
    async detectFormat(text) {
        let bestFormat = { type: 'unknown', confidence: 0 };
        
        Object.entries(this.formatPatterns).forEach(([formatType, format]) => {
            let matches = 0;
            let totalPatterns = format.patterns.length;
            
            format.patterns.forEach(pattern => {
                const patternMatches = text.match(pattern);
                if (patternMatches && patternMatches.length > 0) {
                    matches++;
                }
            });
            
            const confidence = (matches / totalPatterns) * format.confidence;
            
            if (confidence > bestFormat.confidence) {
                bestFormat = { type: formatType, confidence };
            }
        });
        
        return bestFormat;
    }
    
    async extractControllerSettings(text, format) {
        const settings = {};
        
        switch (format.type) {
            case 'sentry':
                this.extractSentryFormat(text, settings);
                break;
            case 'optimization':
                this.extractOptimizationFormat(text, settings);
                break;
            case 'table':
                this.extractTableFormat(text, settings);
                break;
            default:
                this.extractGenericFormat(text, settings);
        }
        
        return settings;
    }
    
    extractSentryFormat(text, settings) {
        const patterns = [
            /F\.?(\d+)\s*[:=]\s*(\d+)/gi,
            /Function\s+(\d+)\s*[:=]\s*(\d+)/gi
        ];
        
        patterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                const func = parseInt(match[1]);
                const value = parseInt(match[2]);
                if (func >= 1 && func <= 26 && value >= 0 && value <= 1000) {
                    settings[func] = value;
                }
            }
        });
    }
    
    extractOptimizationFormat(text, settings) {
        const pattern = /F\.?(\d+).*?Original\s*[:=]?\s*(\d+)\s*Optimized\s*[:=]?\s*(\d+)/gi;
        let match;
        
        while ((match = pattern.exec(text)) !== null) {
            const func = parseInt(match[1]);
            const optimized = parseInt(match[3]);
            if (func >= 1 && func <= 26 && optimized >= 0 && optimized <= 1000) {
                settings[func] = optimized;
            }
        }
    }
    
    extractTableFormat(text, settings) {
        const lines = text.split('\n');
        
        lines.forEach(line => {
            const match = line.match(/F?\.?(\d+)\s+.+?\s+(\d+)$/);
            if (match) {
                const func = parseInt(match[1]);
                const value = parseInt(match[2]);
                if (func >= 1 && func <= 26 && value >= 0 && value <= 1000) {
                    settings[func] = value;
                }
            }
        });
    }
    
    extractGenericFormat(text, settings) {
        // Try multiple generic patterns
        const patterns = [
            /(\d+)\s*[:=]\s*(\d+)/g,
            /F(\d+)\s+(\d+)/g,
            /Function\s*(\d+)\s*(\d+)/g
        ];
        
        patterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                const func = parseInt(match[1]);
                const value = parseInt(match[2]);
                if (func >= 1 && func <= 26 && value >= 0 && value <= 1000) {
                    settings[func] = value;
                }
            }
        });
    }
}

/**
 * Usage Pattern Analyzer
 */
class UsagePatternAnalyzer {
    async analyzePatterns(history) {
        const patterns = {
            drivingFrequency: this.analyzeDrivingFrequency(history),
            timeOfUse: this.analyzeTimeOfUse(history),
            terrainTypes: this.analyzeTerrainTypes(history),
            weatherConditions: this.analyzeWeatherConditions(history),
            modePreferences: this.analyzeModePreferences(history),
            confidence: 0.8
        };
        
        return patterns;
    }
    
    analyzeDrivingFrequency(history) {
        if (!history.length) return { frequency: 'unknown', pattern: 'insufficient_data' };
        
        const daysWithUse = new Set(history.map(h => h.date?.split('T')[0])).size;
        const totalDays = Math.max(1, (new Date() - new Date(history[0].date)) / (1000 * 60 * 60 * 24));
        const frequency = daysWithUse / totalDays;
        
        if (frequency > 0.8) return { frequency: 'daily', pattern: 'regular_commuter' };
        if (frequency > 0.3) return { frequency: 'frequent', pattern: 'regular_user' };
        if (frequency > 0.1) return { frequency: 'occasional', pattern: 'weekend_user' };
        return { frequency: 'rare', pattern: 'infrequent_user' };
    }
    
    analyzeTimeOfUse(history) {
        const hourCounts = {};
        
        history.forEach(entry => {
            if (entry.timestamp) {
                const hour = new Date(entry.timestamp).getHours();
                hourCounts[hour] = (hourCounts[hour] || 0) + 1;
            }
        });
        
        const peakHour = Object.keys(hourCounts).reduce((a, b) => 
            hourCounts[a] > hourCounts[b] ? a : b, '12'
        );
        
        const hour = parseInt(peakHour);
        if (hour >= 6 && hour <= 9) return { pattern: 'morning_commute', peak: hour };
        if (hour >= 17 && hour <= 19) return { pattern: 'evening_commute', peak: hour };
        if (hour >= 10 && hour <= 16) return { pattern: 'daytime_use', peak: hour };
        if (hour >= 20 || hour <= 5) return { pattern: 'night_use', peak: hour };
        return { pattern: 'varied', peak: hour };
    }
    
    analyzeModePreferences(history) {
        const modeCounts = {};
        
        history.forEach(entry => {
            if (entry.mode) {
                modeCounts[entry.mode] = (modeCounts[entry.mode] || 0) + 1;
            }
        });
        
        const sortedModes = Object.entries(modeCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3);
        
        return {
            preferred: sortedModes.map(([mode, count]) => ({ mode, count })),
            variety: Object.keys(modeCounts).length
        };
    }
    
    analyzeTerrainTypes(history) {
        // Placeholder - would analyze GPS/route data
        return { primary: 'mixed', variety: 'moderate' };
    }
    
    analyzeWeatherConditions(history) {
        // Placeholder - would analyze weather data
        return { primary: 'clear', seasonal: true };
    }
}

/**
 * Recommendation Engine
 */
class RecommendationEngine {
    async generateRecommendations(vehicleData, patterns, accessories) {
        const recommendations = [];
        
        // Analyze current configuration
        const config = await this.analyzeCurrentConfiguration(vehicleData, accessories);
        
        // Generate recommendations based on patterns
        if (patterns.drivingFrequency.frequency === 'daily') {
            recommendations.push({
                type: 'accessory',
                item: 'climateControl',
                priority: 'high',
                reason: 'Daily use detected - comfort accessories recommended',
                impact: { comfort: 'high', range: 'medium' }
            });
        }
        
        if (patterns.timeOfUse.pattern === 'night_use') {
            recommendations.push({
                type: 'accessory',
                item: 'ledLights',
                variant: 'premium',
                priority: 'high',
                reason: 'Night driving detected - enhanced lighting recommended',
                impact: { safety: 'high', power: 'medium' }
            });
        }
        
        if (patterns.modePreferences.variety < 2) {
            recommendations.push({
                type: 'mode',
                item: 'explore_modes',
                priority: 'medium',
                reason: 'Try different driving modes for varied conditions',
                impact: { versatility: 'high', experience: 'high' }
            });
        }
        
        return recommendations;
    }
    
    async analyzeCurrentConfiguration(vehicleData, accessories) {
        return {
            optimization_level: 'factory',
            accessory_coverage: accessories.length / 10, // Assume 10 possible accessories
            customization_level: 'basic'
        };
    }
}

/**
 * Local Learning Model for AI predictions
 */
class LocalLearningModel {
    constructor() {
        this.patterns = new Map();
        this.interactions = [];
        this.initialized = false;
    }
    
    async initialize() {
        try {
            const stored = localStorage.getItem('ai-learning-model');
            if (stored) {
                const data = JSON.parse(stored);
                this.patterns = new Map(data.patterns);
                this.interactions = data.interactions || [];
            }
            this.initialized = true;
        } catch (error) {
            console.warn('Could not load learning model:', error);
            this.initialized = true;
        }
    }
    
    async predictMissingFields(partialData) {
        if (!this.initialized) return null;
        
        const predictions = {};
        let overallConfidence = 0;
        
        // Predict based on model patterns
        if (partialData.model) {
            const modelPattern = this.patterns.get(`model_${partialData.model}`);
            if (modelPattern) {
                if (!partialData.controller && modelPattern.controller) {
                    predictions.controller = {
                        value: modelPattern.controller,
                        confidence: modelPattern.controllerConfidence || 0.8
                    };
                }
                if (!partialData.motorType && modelPattern.motorType) {
                    predictions.motorType = {
                        value: modelPattern.motorType,
                        confidence: modelPattern.motorTypeConfidence || 0.7
                    };
                }
            }
        }
        
        // Calculate overall confidence
        const predictionCount = Object.keys(predictions).length;
        if (predictionCount > 0) {
            overallConfidence = Object.values(predictions)
                .reduce((sum, pred) => sum + pred.confidence, 0) / predictionCount;
        }
        
        return predictionCount > 0 ? { ...predictions, overallConfidence } : null;
    }
    
    async learnFromPDF(format, settings) {
        if (!this.initialized) return;
        
        // Learn format patterns
        const formatKey = `pdf_format_${format.type}`;
        const currentPattern = this.patterns.get(formatKey) || { count: 0, success: 0 };
        currentPattern.count++;
        if (Object.keys(settings).length > 5) {
            currentPattern.success++;
        }
        this.patterns.set(formatKey, currentPattern);
        
        await this.saveModel();
    }
    
    async learnFromInteraction(query, response, context) {
        if (!this.initialized) return;
        
        this.interactions.push({
            query,
            response: response.response?.message || 'unknown',
            context: { vehicle: context.vehicle?.model, timestamp: new Date() },
            timestamp: new Date()
        });
        
        // Keep only last 100 interactions
        if (this.interactions.length > 100) {
            this.interactions = this.interactions.slice(-100);
        }
        
        await this.saveModel();
    }
    
    async saveModel() {
        try {
            const data = {
                patterns: Array.from(this.patterns.entries()),
                interactions: this.interactions,
                version: '1.0',
                lastUpdated: new Date()
            };
            localStorage.setItem('ai-learning-model', JSON.stringify(data));
        } catch (error) {
            console.warn('Could not save learning model:', error);
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AIAssistant;
}
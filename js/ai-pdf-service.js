/**
 * AI PDF Service
 * Local AI integration for PDF text extraction and analysis using pattern matching and rule-based systems
 */
class AIPDFService {
    constructor() {
        this.apiManager = window.apiManager || new APIManager();
        this.preferredAI = 'localAI'; // Use local AI systems
        this.fallbackSystems = ['pattern_matching', 'rule_based_analysis'];
        
        this.extractionCache = new Map();
        this.analysisCache = new Map();
    }
    
    /**
     * Extract text from PDF using AI vision capabilities
     */
    async extractPDFText(file, options = {}) {
        const cacheKey = `extract:${file.name}:${file.size}`;
        
        // Check cache
        if (this.extractionCache.has(cacheKey)) {
            return this.extractionCache.get(cacheKey);
        }
        
        try {
            // Convert PDF to images for AI vision analysis
            const images = await this.convertPDFToImages(file);
            
            // Use local pattern matching as primary method
            let result = await this.extractWithPatternMatching(file);
            
            // Enhance with local AI analysis if available
            if (result.success && window.ruleBasedOptimizer) {
                try {
                    const enhancedResult = await this.enhanceWithLocalAI(result.data);
                    if (enhancedResult.success) {
                        result = enhancedResult;
                    }
                } catch (error) {
                    console.warn('Local AI enhancement failed:', error);
                    // Continue with pattern matching result
                }
            }
            
            // Cache result
            this.extractionCache.set(cacheKey, result);
            
            return result;
            
        } catch (error) {
            console.error('PDF extraction failed:', error);
            return this.extractWithPatternMatching(file);
        }
    }
    
    /**
     * Convert PDF to images for AI analysis
     */
    async convertPDFToImages(file) {
        // Load PDF.js if not already loaded
        if (!window.pdfjsLib) {
            await this.loadPDFJS();
        }
        
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const images = [];
        
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const viewport = page.getViewport({ scale: 2.0 });
            
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            
            await page.render({
                canvasContext: context,
                viewport: viewport
            }).promise;
            
            // Convert to base64
            const imageData = canvas.toDataURL('image/png');
            images.push({
                pageNumber: pageNum,
                data: imageData,
                width: viewport.width,
                height: viewport.height
            });
        }
        
        return images;
    }
    
    /**
     * Enhance extracted data with local AI analysis
     */
    async enhanceWithLocalAI(extractedData) {
        try {
            // Use rule-based optimizer to analyze settings if available
            if (window.ruleBasedOptimizer && extractedData.controller_settings) {
                const settingsArray = Object.keys(extractedData.controller_settings)
                    .sort((a, b) => parseInt(a.replace('F.', '')) - parseInt(b.replace('F.', '')))
                    .map(key => extractedData.controller_settings[key]);
                
                const analysis = window.ruleBasedOptimizer.optimize(
                    extractedData.vehicle_info,
                    { speed: 5, range: 5, acceleration: 5, efficiency: 5 },
                    settingsArray
                );
                
                if (analysis.success) {
                    extractedData.ai_analysis = {
                        safety_assessment: this.generateSafetyAssessment(extractedData.controller_settings),
                        performance_prediction: analysis.performance,
                        recommendations: analysis.recommendations,
                        optimization_strategy: analysis.strategy,
                        confidence: analysis.confidence
                    };
                }
            }
            
            return {
                success: true,
                data: extractedData,
                provider: 'local_ai_enhanced',
                confidence: 0.90
            };
            
        } catch (error) {
            console.error('Local AI enhancement failed:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Generate safety assessment for controller settings
     */
    generateSafetyAssessment(settings) {
        const warnings = [];
        const recommendations = [];
        
        // Check critical settings
        if (settings['F.1'] && settings['F.1'] > 30) {
            warnings.push('Speed scaling (F.1) exceeds typical safe limits');
        }
        
        if (settings['F.4'] && settings['F.4'] > 320) {
            warnings.push('Armature current (F.4) is very high - monitor motor temperature');
        }
        
        if (settings['F.6'] && settings['F.6'] < 30) {
            recommendations.push('Consider increasing acceleration rate (F.6) for better responsiveness');
        }
        
        if (settings['F.9'] && settings['F.9'] < 200) {
            recommendations.push('Increase regenerative braking (F.9) for better efficiency');
        }
        
        if (settings['F.24'] && settings['F.24'] > 55) {
            warnings.push('Field weakening (F.24) is high - ensure proper motor cooling');
        }
        
        return {
            warnings: warnings,
            recommendations: recommendations,
            overall_safety: warnings.length === 0 ? 'SAFE' : warnings.length < 3 ? 'CAUTION' : 'REVIEW_REQUIRED'
        };
    }
    
    /**
     * Normalize extracted data
     */
    normalizeExtractedData(data) {
        const normalized = {
            controller_settings: {},
            vehicle_info: {},
            tables: [],
            raw_text: '',
            metadata: {
                extraction_method: 'ai_vision',
                timestamp: new Date().toISOString()
            }
        };
        
        // Normalize controller settings
        if (data.controller_settings) {
            Object.entries(data.controller_settings).forEach(([key, value]) => {
                // Ensure key is in F.XX format
                const match = key.match(/F\.?(\d+)/i);
                if (match) {
                    normalized.controller_settings[`F.${match[1]}`] = parseInt(value) || value;
                }
            });
        }
        
        // Normalize vehicle info
        if (data.vehicle_info) {
            normalized.vehicle_info = {
                model: data.vehicle_info.model || data.vehicle_info.vehicle_model,
                year: data.vehicle_info.year || data.vehicle_info.model_year,
                motor_type: data.vehicle_info.motor_type || data.vehicle_info.motor,
                controller: data.vehicle_info.controller || data.vehicle_info.controller_type
            };
        }
        
        // Copy tables and raw text
        normalized.tables = data.tables || [];
        normalized.raw_text = data.raw_text || '';
        
        return normalized;
    }
    
    /**
     * Parse text response when JSON parsing fails
     */
    parseTextResponse(text) {
        const data = {
            controller_settings: {},
            vehicle_info: {},
            tables: [],
            raw_text: text,
            metadata: {
                extraction_method: 'text_parsing',
                timestamp: new Date().toISOString()
            }
        };
        
        // Extract controller settings
        const settingsMatches = text.matchAll(/F\.?(\d+)\s*[=:]\s*(\d+)/gi);
        for (const match of settingsMatches) {
            data.controller_settings[`F.${match[1]}`] = parseInt(match[2]);
        }
        
        // Extract vehicle info
        const modelMatch = text.match(/(?:model|vehicle)[\s:]+([e][2-6]|e[SLM]|elXD)/i);
        if (modelMatch) data.vehicle_info.model = modelMatch[1];
        
        const yearMatch = text.match(/(?:year|model year)[\s:]+(\d{4})/i);
        if (yearMatch) data.vehicle_info.year = parseInt(yearMatch[1]);
        
        const motorMatch = text.match(/(?:motor|motor type)[\s:]+([\w\s-]+?)(?:\n|$)/i);
        if (motorMatch) data.vehicle_info.motor_type = motorMatch[1].trim();
        
        return data;
    }
    
    /**
     * Fallback pattern matching extraction
     */
    async extractWithPatternMatching(file) {
        try {
            const text = await this.extractTextWithPDFJS(file);
            const data = this.parseTextResponse(text);
            
            return {
                success: true,
                data: data,
                provider: 'pattern_matching',
                confidence: 0.7,
                fallback: true
            };
            
        } catch (error) {
            console.error('Pattern matching extraction failed:', error);
            return {
                success: false,
                error: 'All extraction methods failed',
                data: {
                    controller_settings: {},
                    vehicle_info: {},
                    tables: [],
                    raw_text: ''
                }
            };
        }
    }
    
    /**
     * Extract text using PDF.js
     */
    async extractTextWithPDFJS(file) {
        if (!window.pdfjsLib) {
            await this.loadPDFJS();
        }
        
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = '';
        
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');
            fullText += pageText + '\n\n';
        }
        
        return fullText;
    }
    
    /**
     * Analyze extracted PDF data with AI
     */
    async analyzePDFData(extractedData, analysisType = 'comprehensive') {
        const cacheKey = `analyze:${JSON.stringify(extractedData.controller_settings)}:${analysisType}`;
        
        if (this.analysisCache.has(cacheKey)) {
            return this.analysisCache.get(cacheKey);
        }
        
        try {
            // Use local rule-based analysis only
            const result = await this.analyzeWithRules(extractedData, analysisType);
            
            this.analysisCache.set(cacheKey, result);
            return result;
            
        } catch (error) {
            console.error('PDF analysis failed:', error);
            return {
                success: false,
                error: 'Local analysis failed',
                fallback: true
            };
        }
    }
    
    /**
     * Enhanced local analysis using rule-based systems
     */
    async performLocalAnalysis(extractedData, analysisType) {
        const settings = extractedData.controller_settings;
        const vehicleInfo = extractedData.vehicle_info;
        
        let analysis = {
            safety: [],
            warnings: [],
            suggestions: [],
            optimizations: [],
            performance: null,
            compatibility: null
        };
        
        // Use rule-based optimizer if available
        if (window.ruleBasedOptimizer && Object.keys(settings).length > 0) {
            try {
                const settingsArray = Object.keys(settings)
                    .sort((a, b) => parseInt(a.replace('F.', '')) - parseInt(b.replace('F.', '')))
                    .map(key => settings[key]);
                
                const optimizerResult = window.ruleBasedOptimizer.optimize(
                    vehicleInfo,
                    { speed: 5, range: 5, acceleration: 5, efficiency: 5 },
                    settingsArray
                );
                
                if (optimizerResult.success) {
                    analysis.performance = optimizerResult.performance;
                    analysis.optimizations = optimizerResult.recommendations || [];
                    analysis.strategy = optimizerResult.strategy;
                }
            } catch (error) {
                console.warn('Rule-based optimizer analysis failed:', error);
            }
        }
        
        // Perform specific analysis based on type
        switch (analysisType) {
            case 'safety':
                analysis = { ...analysis, ...this.performSafetyAnalysis(settings, vehicleInfo) };
                break;
            case 'optimization':
                analysis = { ...analysis, ...this.performOptimizationAnalysis(settings, vehicleInfo) };
                break;
            case 'comprehensive':
            default:
                analysis = { ...analysis, ...this.performComprehensiveAnalysis(settings, vehicleInfo) };
                break;
        }
        
        return {
            success: true,
            analysis: analysis,
            provider: 'local_enhanced',
            extractedData: extractedData,
            timestamp: new Date().toISOString()
        };
    }
    
    /**
     * Perform safety-focused analysis
     */
    performSafetyAnalysis(settings, vehicleInfo) {
        const safety = [];
        const warnings = [];
        
        // Critical safety checks
        if (settings['F.1'] > 30) {
            warnings.push('CRITICAL: Speed scaling (F.1) exceeds safe limits - risk of exceeding 25mph legal limit');
        }
        
        if (settings['F.4'] > 350) {
            warnings.push('CRITICAL: Armature current (F.4) extremely high - severe motor damage risk');
        } else if (settings['F.4'] > 300) {
            warnings.push('WARNING: Armature current (F.4) very high - monitor motor temperature closely');
        }
        
        if (settings['F.24'] > 60) {
            warnings.push('WARNING: Field weakening (F.24) at maximum - ensure adequate motor cooling');
        }
        
        if (settings['F.9'] > 300) {
            warnings.push('WARNING: Regenerative current (F.9) very high - may stress battery');
        }
        
        // Positive safety notes
        if (settings['F.1'] && settings['F.1'] <= 25) {
            safety.push('Speed scaling within safe range');
        }
        
        if (settings['F.4'] && settings['F.4'] <= 280) {
            safety.push('Armature current within safe operating range');
        }
        
        return { safety, warnings };
    }
    
    /**
     * Perform optimization-focused analysis
     */
    performOptimizationAnalysis(settings, vehicleInfo) {
        const suggestions = [];
        const optimizations = [];
        
        // Performance optimizations
        if (settings['F.6'] && settings['F.6'] < 50) {
            optimizations.push('Increase acceleration rate (F.6) to 60-70 for better responsiveness');
        }
        
        if (settings['F.9'] && settings['F.9'] < 220) {
            optimizations.push('Increase regenerative braking (F.9) to 240-260 for better efficiency');
        }
        
        if (settings['F.1'] && settings['F.4']) {
            const speedToCurrentRatio = settings['F.1'] / settings['F.4'];
            if (speedToCurrentRatio < 0.08) {
                suggestions.push('Speed-to-current ratio suggests potential for better performance balance');
            }
        }
        
        // Vehicle-specific optimizations
        if (vehicleInfo.model?.toLowerCase().includes('e4')) {
            if (settings['F.4'] && settings['F.4'] < 260) {
                optimizations.push('E4 vehicles can typically handle F.4 = 260-280 for better performance');
            }
        }
        
        if (vehicleInfo.model?.toLowerCase().includes('el-xd')) {
            if (settings['F.4'] && settings['F.4'] < 280) {
                optimizations.push('eL XD vehicles can typically handle F.4 = 280-300 with lithium batteries');
            }
        }
        
        return { suggestions, optimizations };
    }
    
    /**
     * Perform comprehensive analysis
     */
    performComprehensiveAnalysis(settings, vehicleInfo) {
        const safetyAnalysis = this.performSafetyAnalysis(settings, vehicleInfo);
        const optimizationAnalysis = this.performOptimizationAnalysis(settings, vehicleInfo);
        
        const compatibility = this.assessVehicleCompatibility(settings, vehicleInfo);
        const summary = this.generateAnalysisSummary(settings, vehicleInfo, safetyAnalysis, optimizationAnalysis);
        
        return {
            ...safetyAnalysis,
            ...optimizationAnalysis,
            compatibility,
            summary
        };
    }
    
    /**
     * Assess vehicle compatibility
     */
    assessVehicleCompatibility(settings, vehicleInfo) {
        const model = vehicleInfo.model?.toLowerCase();
        const compatibility = [];
        
        if (model?.includes('e2')) {
            if (settings['F.4'] > 280) {
                compatibility.push('WARNING: Current settings may exceed E2 motor capabilities');
            } else {
                compatibility.push('Settings appear compatible with E2 specifications');
            }
        } else if (model?.includes('e4')) {
            if (settings['F.4'] > 320) {
                compatibility.push('WARNING: Current settings may exceed E4 motor capabilities');
            } else {
                compatibility.push('Settings appear compatible with E4 specifications');
            }
        } else if (model?.includes('el-xd')) {
            if (settings['F.4'] > 350) {
                compatibility.push('WARNING: Current settings may exceed eL XD motor capabilities');
            } else {
                compatibility.push('Settings appear compatible with eL XD specifications');
            }
        } else {
            compatibility.push('Vehicle model unknown - exercise caution with high-performance settings');
        }
        
        return compatibility;
    }
    
    /**
     * Generate analysis summary
     */
    generateAnalysisSummary(settings, vehicleInfo, safetyAnalysis, optimizationAnalysis) {
        const totalWarnings = safetyAnalysis.warnings.length;
        const totalOptimizations = optimizationAnalysis.optimizations.length;
        
        let riskLevel = 'LOW';
        if (totalWarnings > 2) riskLevel = 'HIGH';
        else if (totalWarnings > 0) riskLevel = 'MEDIUM';
        
        let optimizationPotential = 'LOW';
        if (totalOptimizations > 3) optimizationPotential = 'HIGH';
        else if (totalOptimizations > 1) optimizationPotential = 'MEDIUM';
        
        return {
            risk_level: riskLevel,
            optimization_potential: optimizationPotential,
            total_warnings: totalWarnings,
            total_optimizations: totalOptimizations,
            overall_assessment: this.generateOverallAssessment(riskLevel, optimizationPotential)
        };
    }
    
    /**
     * Generate overall assessment
     */
    generateOverallAssessment(riskLevel, optimizationPotential) {
        if (riskLevel === 'HIGH') {
            return 'REVIEW REQUIRED: Settings contain potential safety risks that should be addressed';
        } else if (riskLevel === 'MEDIUM') {
            return 'CAUTION ADVISED: Some settings may need adjustment for optimal safety';
        } else if (optimizationPotential === 'HIGH') {
            return 'OPTIMIZATION RECOMMENDED: Settings are safe but significant improvements possible';
        } else if (optimizationPotential === 'MEDIUM') {
            return 'MINOR IMPROVEMENTS: Settings are good with some optimization opportunities';
        } else {
            return 'WELL OPTIMIZED: Settings appear safe and well-tuned for the vehicle';
        }
    }
    
    /**
     * Rule-based analysis using enhanced local systems
     */
    async analyzeWithRules(extractedData, analysisType) {
        try {
            // Use enhanced local analysis
            const result = await this.performLocalAnalysis(extractedData, analysisType);
            
            // Add fallback flag and ensure compatibility
            result.fallback = false;
            result.local = true;
            
            return result;
            
        } catch (error) {
            console.error('Enhanced local analysis failed, using basic rules:', error);
            
            // Basic fallback analysis
            const settings = extractedData.controller_settings;
            const analysis = {
                safety: [],
                warnings: [],
                suggestions: [],
                optimizations: []
            };
            
            // Basic safety checks
            if (settings['F.1'] > 30) {
                analysis.warnings.push('Speed setting may exceed safe limits');
            }
            
            if (settings['F.4'] > 320) {
                analysis.warnings.push('Armature current limit very high');
            }
            
            // Basic optimization suggestions
            if (settings['F.6'] < 50) {
                analysis.suggestions.push('Consider increasing acceleration rate (F.6)');
            }
            
            if (settings['F.9'] < 220) {
                analysis.suggestions.push('Increase regenerative braking (F.9) for better efficiency');
            }
            
            return {
                success: true,
                analysis: analysis,
                provider: 'basic_rules',
                extractedData: extractedData,
                fallback: true,
                local: true,
                timestamp: new Date().toISOString()
            };
        }
    }
    
    /**
     * Load PDF.js library
     */
    async loadPDFJS() {
        if (window.pdfjsLib) return;
        
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
            script.onload = () => {
                pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                resolve();
            };
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
    
    
    /**
     * Clear caches
     */
    clearCaches() {
        this.extractionCache.clear();
        this.analysisCache.clear();
    }
}

// Create global instance
window.aiPDFService = new AIPDFService();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AIPDFService;
}
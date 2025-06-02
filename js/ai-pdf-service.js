/**
 * AI PDF Service
 * OpenAI/Claude API integration for advanced PDF text extraction and analysis
 */
class AIPDFService {
    constructor() {
        this.apiManager = window.apiManager || new APIManager();
        this.preferredAI = 'claude'; // Default to Claude for better PDF understanding
        this.modelVersions = {
            openai: 'gpt-4-vision-preview',
            claude: 'claude-3-opus-20240229'
        };
        
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
            
            // Try AI extraction first
            let result = null;
            
            if (this.apiManager.apis[this.preferredAI].isConfigured) {
                result = await this.extractWithAI(images, this.preferredAI);
            } else if (this.apiManager.apis[this.getAlternativeAI()].isConfigured) {
                result = await this.extractWithAI(images, this.getAlternativeAI());
            }
            
            // Fallback to pattern matching if AI fails
            if (!result || !result.success) {
                result = await this.extractWithPatternMatching(file);
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
     * Extract text using AI vision
     */
    async extractWithAI(images, aiProvider) {
        if (aiProvider === 'claude') {
            return await this.extractWithClaude(images);
        } else if (aiProvider === 'openai') {
            return await this.extractWithOpenAI(images);
        }
        
        return { success: false, error: 'Invalid AI provider' };
    }
    
    /**
     * Extract with Claude API
     */
    async extractWithClaude(images) {
        const messages = [{
            role: 'user',
            content: [
                {
                    type: 'text',
                    text: `Please extract all text from these PDF pages, paying special attention to:
                    1. Controller settings in the format F.XX = YYY
                    2. Vehicle information (model, year, motor type)
                    3. Table data with parameter values
                    4. Any technical specifications
                    
                    Format the extracted data as structured JSON with these sections:
                    - controller_settings: Object with F.XX as keys
                    - vehicle_info: Object with model, year, motor details
                    - tables: Array of table data
                    - raw_text: Complete extracted text`
                },
                ...images.map(img => ({
                    type: 'image',
                    source: {
                        type: 'base64',
                        media_type: 'image/png',
                        data: img.data.split(',')[1] // Remove data:image/png;base64, prefix
                    }
                }))
            ]
        }];
        
        try {
            const response = await this.apiManager.makeAPIRequest('claude', '/messages', {
                method: 'POST',
                body: {
                    model: this.modelVersions.claude,
                    messages: messages,
                    max_tokens: 4096
                }
            });
            
            if (response.success) {
                const extractedData = this.parseAIResponse(response.data.content[0].text);
                return {
                    success: true,
                    data: extractedData,
                    provider: 'claude',
                    confidence: 0.95
                };
            }
            
        } catch (error) {
            console.error('Claude extraction failed:', error);
        }
        
        return { success: false, error: 'Claude extraction failed' };
    }
    
    /**
     * Extract with OpenAI API
     */
    async extractWithOpenAI(images) {
        const messages = [{
            role: 'user',
            content: [
                {
                    type: 'text',
                    text: `Extract all text from these PDF pages, focusing on:
                    1. Controller settings (F.XX = YYY format)
                    2. Vehicle specifications
                    3. Table data
                    4. Technical parameters
                    
                    Return structured JSON with:
                    - controller_settings: Object mapping F.XX to values
                    - vehicle_info: Vehicle details
                    - tables: Extracted table data
                    - raw_text: Complete text`
                },
                ...images.map(img => ({
                    type: 'image_url',
                    image_url: {
                        url: img.data
                    }
                }))
            ]
        }];
        
        try {
            const response = await this.apiManager.makeAPIRequest('openai', '/chat/completions', {
                method: 'POST',
                body: {
                    model: this.modelVersions.openai,
                    messages: messages,
                    max_tokens: 4096,
                    response_format: { type: 'json_object' }
                }
            });
            
            if (response.success) {
                const extractedData = this.parseAIResponse(response.data.choices[0].message.content);
                return {
                    success: true,
                    data: extractedData,
                    provider: 'openai',
                    confidence: 0.93
                };
            }
            
        } catch (error) {
            console.error('OpenAI extraction failed:', error);
        }
        
        return { success: false, error: 'OpenAI extraction failed' };
    }
    
    /**
     * Parse AI response
     */
    parseAIResponse(responseText) {
        try {
            // Try to parse as JSON first
            const data = JSON.parse(responseText);
            return this.normalizeExtractedData(data);
        } catch (error) {
            // Fallback to text parsing
            return this.parseTextResponse(responseText);
        }
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
            let result = null;
            
            if (this.apiManager.apis[this.preferredAI].isConfigured) {
                result = await this.analyzeWithAI(extractedData, analysisType, this.preferredAI);
            } else if (this.apiManager.apis[this.getAlternativeAI()].isConfigured) {
                result = await this.analyzeWithAI(extractedData, analysisType, this.getAlternativeAI());
            } else {
                result = await this.analyzeWithRules(extractedData, analysisType);
            }
            
            this.analysisCache.set(cacheKey, result);
            return result;
            
        } catch (error) {
            console.error('PDF analysis failed:', error);
            return this.analyzeWithRules(extractedData, analysisType);
        }
    }
    
    /**
     * Analyze with AI
     */
    async analyzeWithAI(extractedData, analysisType, aiProvider) {
        const prompt = this.buildAnalysisPrompt(extractedData, analysisType);
        
        if (aiProvider === 'claude') {
            return await this.analyzeWithClaude(prompt, extractedData);
        } else if (aiProvider === 'openai') {
            return await this.analyzeWithOpenAI(prompt, extractedData);
        }
        
        return { success: false };
    }
    
    /**
     * Build analysis prompt
     */
    buildAnalysisPrompt(extractedData, analysisType) {
        const settings = JSON.stringify(extractedData.controller_settings, null, 2);
        const vehicleInfo = JSON.stringify(extractedData.vehicle_info, null, 2);
        
        const prompts = {
            comprehensive: `Analyze these GEM vehicle controller settings and provide:
                1. Safety assessment (any dangerous values?)
                2. Performance analysis (speed, acceleration, efficiency)
                3. Optimization suggestions
                4. Compatibility check with vehicle specs
                5. Comparison to standard presets
                
                Controller Settings:
                ${settings}
                
                Vehicle Info:
                ${vehicleInfo}`,
            
            safety: `Perform a safety analysis of these controller settings:
                ${settings}
                
                Check for:
                - Unsafe current limits
                - Dangerous speed settings
                - Improper temperature limits
                - Any values that could damage the motor`,
            
            optimization: `Suggest optimizations for these settings:
                ${settings}
                
                Vehicle: ${vehicleInfo.model || 'Unknown'}
                
                Provide specific value recommendations for better:
                - Performance
                - Efficiency
                - Motor longevity
                - Battery life`
        };
        
        return prompts[analysisType] || prompts.comprehensive;
    }
    
    /**
     * Analyze with Claude
     */
    async analyzeWithClaude(prompt, extractedData) {
        try {
            const response = await this.apiManager.makeAPIRequest('claude', '/messages', {
                method: 'POST',
                body: {
                    model: this.modelVersions.claude,
                    messages: [{
                        role: 'user',
                        content: prompt
                    }],
                    max_tokens: 2048
                }
            });
            
            if (response.success) {
                return {
                    success: true,
                    analysis: response.data.content[0].text,
                    provider: 'claude',
                    extractedData: extractedData,
                    timestamp: new Date().toISOString()
                };
            }
            
        } catch (error) {
            console.error('Claude analysis failed:', error);
        }
        
        return { success: false };
    }
    
    /**
     * Analyze with OpenAI
     */
    async analyzeWithOpenAI(prompt, extractedData) {
        try {
            const response = await this.apiManager.makeAPIRequest('openai', '/chat/completions', {
                method: 'POST',
                body: {
                    model: 'gpt-4',
                    messages: [{
                        role: 'system',
                        content: 'You are an expert in GEM electric vehicle controller optimization.'
                    }, {
                        role: 'user',
                        content: prompt
                    }],
                    max_tokens: 2048
                }
            });
            
            if (response.success) {
                return {
                    success: true,
                    analysis: response.data.choices[0].message.content,
                    provider: 'openai',
                    extractedData: extractedData,
                    timestamp: new Date().toISOString()
                };
            }
            
        } catch (error) {
            console.error('OpenAI analysis failed:', error);
        }
        
        return { success: false };
    }
    
    /**
     * Rule-based analysis fallback
     */
    async analyzeWithRules(extractedData, analysisType) {
        const settings = extractedData.controller_settings;
        const analysis = {
            safety: [],
            warnings: [],
            suggestions: [],
            optimizations: []
        };
        
        // Safety checks
        if (settings['F.1'] > 120) {
            analysis.warnings.push('Speed setting exceeds safe limits for most GEM vehicles');
        }
        
        if (settings['F.4'] > 350) {
            analysis.warnings.push('Armature current limit may cause motor damage');
        }
        
        if (settings['F.12'] < 5) {
            analysis.warnings.push('Temperature limit too low - motor may overheat');
        }
        
        // Optimization suggestions
        if (settings['F.6'] < 40) {
            analysis.suggestions.push('Consider increasing acceleration rate (F.6) for better performance');
        }
        
        if (settings['F.9'] < 200) {
            analysis.suggestions.push('Increase regenerative braking (F.9) for better battery efficiency');
        }
        
        return {
            success: true,
            analysis: analysis,
            provider: 'rule_based',
            extractedData: extractedData,
            fallback: true,
            timestamp: new Date().toISOString()
        };
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
     * Get alternative AI provider
     */
    getAlternativeAI() {
        return this.preferredAI === 'claude' ? 'openai' : 'claude';
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
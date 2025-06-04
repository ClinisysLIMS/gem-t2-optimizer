/**
 * TensorFlow.js ML Engine
 * Browser-based machine learning for GEM optimization using TensorFlow.js
 * Replaces external AI APIs with local ML models
 */
class TensorFlowMLEngine {
    constructor() {
        this.tf = null; // Will be loaded dynamically
        this.models = new Map();
        this.isInitialized = false;
        
        // Model configurations
        this.modelConfigs = {
            optimizer: {
                inputShape: [8], // Vehicle parameters
                outputShape: [25], // Controller settings (F.1-F.25)
                modelType: 'regression'
            },
            performance: {
                inputShape: [10], // Settings + conditions
                outputShape: [3], // Speed, Range, Efficiency
                modelType: 'regression'
            },
            classification: {
                inputShape: [5], // Vehicle characteristics
                outputShape: [4], // Vehicle type classification
                modelType: 'classification'
            }
        };
        
        // Training data cache
        this.trainingData = new Map();
        this.loadTrainingData();
        
        console.log('TensorFlow.js ML Engine initialized');
        this.initialize();
    }
    
    /**
     * Initialize TensorFlow.js and models
     */
    async initialize() {
        try {
            // Load TensorFlow.js dynamically
            if (typeof tf === 'undefined') {
                await this.loadTensorFlow();
            } else {
                this.tf = tf;
            }
            
            // Create and train models
            await this.createModels();
            await this.trainModels();
            
            this.isInitialized = true;
            console.log('TensorFlow.js ML Engine ready');
            
        } catch (error) {
            console.error('Failed to initialize TensorFlow.js ML Engine:', error);
            this.isInitialized = false;
        }
    }
    
    /**
     * Dynamically load TensorFlow.js
     */
    async loadTensorFlow() {
        return new Promise((resolve, reject) => {
            if (typeof tf !== 'undefined') {
                this.tf = tf;
                resolve();
                return;
            }
            
            // Load TensorFlow.js from CDN
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.15.0/dist/tf.min.js';
            script.onload = () => {
                this.tf = tf;
                console.log('TensorFlow.js loaded from CDN');
                resolve();
            };
            script.onerror = () => {
                console.error('Failed to load TensorFlow.js');
                reject(new Error('Failed to load TensorFlow.js'));
            };
            document.head.appendChild(script);
        });
    }
    
    /**
     * Create ML models
     */
    async createModels() {
        if (!this.tf) {
            throw new Error('TensorFlow.js not loaded');
        }
        
        // Controller optimization model
        this.models.set('optimizer', this.createOptimizerModel());
        
        // Performance prediction model
        this.models.set('performance', this.createPerformanceModel());
        
        // Vehicle classification model
        this.models.set('classification', this.createClassificationModel());
        
        console.log('ML models created');
    }
    
    /**
     * Create controller optimization model
     */
    createOptimizerModel() {
        const model = this.tf.sequential({
            layers: [
                // Input layer: vehicle parameters
                this.tf.layers.dense({
                    units: 16,
                    activation: 'relu',
                    inputShape: [8] // model, year, battery, motor, etc.
                }),
                
                // Hidden layers
                this.tf.layers.dense({
                    units: 32,
                    activation: 'relu'
                }),
                this.tf.layers.dropout({ rate: 0.2 }),
                
                this.tf.layers.dense({
                    units: 32,
                    activation: 'relu'
                }),
                this.tf.layers.dropout({ rate: 0.2 }),
                
                this.tf.layers.dense({
                    units: 16,
                    activation: 'relu'
                }),
                
                // Output layer: controller settings F.1-F.25
                this.tf.layers.dense({
                    units: 25,
                    activation: 'linear' // Regression output
                })
            ]
        });
        
        // Compile model
        model.compile({
            optimizer: this.tf.train.adam(0.001),
            loss: 'meanSquaredError',
            metrics: ['mse', 'mae']
        });
        
        return model;
    }
    
    /**
     * Create performance prediction model
     */
    createPerformanceModel() {
        const model = this.tf.sequential({
            layers: [
                // Input: controller settings + conditions
                this.tf.layers.dense({
                    units: 20,
                    activation: 'relu',
                    inputShape: [10]
                }),
                
                this.tf.layers.dense({
                    units: 15,
                    activation: 'relu'
                }),
                this.tf.layers.dropout({ rate: 0.1 }),
                
                this.tf.layers.dense({
                    units: 10,
                    activation: 'relu'
                }),
                
                // Output: speed, range, efficiency
                this.tf.layers.dense({
                    units: 3,
                    activation: 'sigmoid' // Normalized 0-1 outputs
                })
            ]
        });
        
        model.compile({
            optimizer: this.tf.train.adam(0.001),
            loss: 'meanSquaredError',
            metrics: ['accuracy']
        });
        
        return model;
    }
    
    /**
     * Create vehicle classification model
     */
    createClassificationModel() {
        const model = this.tf.sequential({
            layers: [
                // Input: vehicle characteristics
                this.tf.layers.dense({
                    units: 12,
                    activation: 'relu',
                    inputShape: [5]
                }),
                
                this.tf.layers.dense({
                    units: 8,
                    activation: 'relu'
                }),
                
                // Output: vehicle type (e2, e4, el-xd, custom)
                this.tf.layers.dense({
                    units: 4,
                    activation: 'softmax' // Classification output
                })
            ]
        });
        
        model.compile({
            optimizer: this.tf.train.adam(0.001),
            loss: 'categoricalCrossentropy',
            metrics: ['accuracy']
        });
        
        return model;
    }
    
    /**
     * Load and prepare training data
     */
    loadTrainingData() {
        // Synthetic training data based on GEM vehicle knowledge
        this.trainingData.set('optimizer', {
            inputs: [
                // [model_encoded, year_norm, battery_cap, motor_type, condition, priorities...]
                [0, 0.5, 0.6, 1, 0.8, 0.7, 0.5, 0.6], // e2 balanced
                [1, 0.7, 0.8, 1, 0.9, 0.9, 0.3, 0.4], // e4 speed focused
                [2, 0.9, 1.0, 1, 0.95, 0.4, 0.9, 0.3], // el-xd range focused
                [0, 0.3, 0.4, 0, 0.6, 0.5, 0.7, 0.8], // e2 efficiency
                [1, 0.6, 0.7, 1, 0.85, 0.8, 0.6, 0.5], // e4 balanced
                // ... more synthetic data points
            ],
            outputs: [
                // F.1-F.25 optimized settings for each input
                [22, 245, 60, 225, 43, 75, 85, 40, 30, 20, 15, 25, 35, 45, 55, 65, 75, 85, 95, 10, 20, 30, 40, 50, 60],
                [28, 280, 80, 250, 50, 90, 95, 50, 40, 25, 20, 30, 40, 50, 60, 70, 80, 90, 100, 15, 25, 35, 45, 55, 65],
                [20, 200, 40, 280, 35, 60, 70, 30, 20, 15, 10, 20, 25, 35, 45, 55, 65, 75, 85, 5, 15, 25, 35, 45, 55],
                [18, 180, 35, 260, 30, 50, 60, 25, 15, 10, 8, 15, 20, 30, 40, 50, 60, 70, 80, 3, 10, 20, 30, 40, 50],
                [25, 260, 70, 240, 45, 80, 85, 45, 35, 22, 18, 28, 35, 45, 55, 65, 75, 85, 95, 12, 22, 32, 42, 52, 62],
            ]
        });
        
        this.trainingData.set('performance', {
            inputs: [
                // [F.1, F.4, F.6, F.9, F.24, weather, terrain, battery, motor, load]
                [22, 245, 60, 225, 43, 0.8, 0.3, 0.9, 0.8, 0.5], // Good conditions
                [28, 280, 80, 250, 50, 0.6, 0.7, 0.8, 0.9, 0.7], // Challenging conditions
                [20, 200, 40, 280, 35, 0.9, 0.2, 1.0, 0.7, 0.3], // Efficiency focused
                [25, 260, 70, 240, 45, 0.7, 0.5, 0.85, 0.85, 0.6], // Balanced
            ],
            outputs: [
                // [speed_norm, range_norm, efficiency_norm]
                [0.85, 0.75, 0.80], // Good performance
                [0.95, 0.60, 0.65], // High speed, lower range
                [0.60, 0.95, 0.90], // High range, efficiency
                [0.75, 0.80, 0.75], // Balanced performance
            ]
        });
        
        this.trainingData.set('classification', {
            inputs: [
                // [max_speed, battery_cap, motor_power, year, weight_class]
                [25, 0.6, 0.7, 0.5, 0.8], // e2
                [25, 0.8, 0.9, 0.7, 0.9], // e4
                [25, 1.0, 1.0, 0.9, 1.0], // el-xd
                [30, 0.5, 0.6, 0.3, 0.7], // custom/modified
            ],
            outputs: [
                [1, 0, 0, 0], // e2
                [0, 1, 0, 0], // e4
                [0, 0, 1, 0], // el-xd
                [0, 0, 0, 1], // custom
            ]
        });
    }
    
    /**
     * Train all models
     */
    async trainModels() {
        if (!this.tf) return;
        
        console.log('Training ML models...');
        
        for (const [modelName, model] of this.models.entries()) {
            try {
                await this.trainModel(modelName, model);
                console.log(`${modelName} model trained`);
            } catch (error) {
                console.error(`Failed to train ${modelName} model:`, error);
            }
        }
        
        console.log('Model training completed');
    }
    
    /**
     * Train individual model
     */
    async trainModel(modelName, model) {
        const data = this.trainingData.get(modelName);
        if (!data || !data.inputs || !data.outputs) {
            console.warn(`No training data for ${modelName}`);
            return;
        }
        
        // Convert to tensors
        const xs = this.tf.tensor2d(data.inputs);
        const ys = this.tf.tensor2d(data.outputs);
        
        // Train model
        await model.fit(xs, ys, {
            epochs: 50,
            batchSize: 2,
            validationSplit: 0.2,
            shuffle: true,
            verbose: 0
        });
        
        // Clean up tensors
        xs.dispose();
        ys.dispose();
    }
    
    /**
     * Optimize controller settings using ML
     */
    async optimizeController(vehicleData, priorities, currentSettings = []) {
        if (!this.isInitialized) {
            console.warn('ML Engine not initialized, using fallback');
            return this.getFallbackOptimization(vehicleData, priorities, currentSettings);
        }
        
        try {
            const model = this.models.get('optimizer');
            if (!model) {
                throw new Error('Optimizer model not available');
            }
            
            // Prepare input features
            const features = this.prepareOptimizerInput(vehicleData, priorities);
            const inputTensor = this.tf.tensor2d([features]);
            
            // Make prediction
            const prediction = model.predict(inputTensor);
            const optimizedSettings = await prediction.data();
            
            // Clean up tensors
            inputTensor.dispose();
            prediction.dispose();
            
            // Convert to integer array and apply constraints
            const settings = Array.from(optimizedSettings).map((val, index) => {
                return this.applySettingConstraints(index + 1, Math.round(val));
            });
            
            return {
                success: true,
                optimizedSettings: settings,
                method: 'tensorflow_ml',
                confidence: 0.85,
                source: 'local_ml'
            };
            
        } catch (error) {
            console.error('ML optimization failed:', error);
            return this.getFallbackOptimization(vehicleData, priorities, currentSettings);
        }
    }
    
    /**
     * Predict performance using ML
     */
    async predictPerformance(settings, conditions) {
        if (!this.isInitialized) {
            return this.getFallbackPerformance(settings, conditions);
        }
        
        try {
            const model = this.models.get('performance');
            if (!model) {
                throw new Error('Performance model not available');
            }
            
            // Prepare input features
            const features = this.preparePerformanceInput(settings, conditions);
            const inputTensor = this.tf.tensor2d([features]);
            
            // Make prediction
            const prediction = model.predict(inputTensor);
            const performance = await prediction.data();
            
            // Clean up tensors
            inputTensor.dispose();
            prediction.dispose();
            
            return {
                success: true,
                speed: performance[0] * 30, // Denormalize to 0-30 mph
                range: performance[1] * 50, // Denormalize to 0-50 miles
                efficiency: performance[2] * 100, // Denormalize to 0-100%
                method: 'tensorflow_ml',
                confidence: 0.80
            };
            
        } catch (error) {
            console.error('ML performance prediction failed:', error);
            return this.getFallbackPerformance(settings, conditions);
        }
    }
    
    /**
     * Classify vehicle type using ML
     */
    async classifyVehicle(vehicleData) {
        if (!this.isInitialized) {
            return this.getFallbackClassification(vehicleData);
        }
        
        try {
            const model = this.models.get('classification');
            if (!model) {
                throw new Error('Classification model not available');
            }
            
            // Prepare input features
            const features = this.prepareClassificationInput(vehicleData);
            const inputTensor = this.tf.tensor2d([features]);
            
            // Make prediction
            const prediction = model.predict(inputTensor);
            const probabilities = await prediction.data();
            
            // Clean up tensors
            inputTensor.dispose();
            prediction.dispose();
            
            // Find highest probability class
            const classNames = ['e2', 'e4', 'el-xd', 'custom'];
            const maxIndex = probabilities.indexOf(Math.max(...probabilities));
            
            return {
                success: true,
                vehicleType: classNames[maxIndex],
                confidence: probabilities[maxIndex],
                probabilities: Object.fromEntries(
                    classNames.map((name, i) => [name, probabilities[i]])
                ),
                method: 'tensorflow_ml'
            };
            
        } catch (error) {
            console.error('ML classification failed:', error);
            return this.getFallbackClassification(vehicleData);
        }
    }
    
    /**
     * Prepare optimizer input features
     */
    prepareOptimizerInput(vehicleData, priorities) {
        const modelMap = { 'e2': 0, 'e4': 1, 'el-xd': 2 };
        
        return [
            modelMap[vehicleData.model?.toLowerCase()] || 0, // Model encoded
            ((vehicleData.year || 2020) - 2000) / 30, // Year normalized
            (vehicleData.batteryCapacity || 150) / 300, // Battery capacity normalized
            vehicleData.motorType === 'AC' ? 1 : 0, // Motor type
            (vehicleData.condition || 80) / 100, // Condition normalized
            (priorities.speed || 5) / 10, // Speed priority
            (priorities.range || 5) / 10, // Range priority
            (priorities.acceleration || 5) / 10 // Acceleration priority
        ];
    }
    
    /**
     * Prepare performance input features
     */
    preparePerformanceInput(settings, conditions) {
        return [
            (settings[1] || 22) / 35, // F.1 MPH scaling normalized
            (settings[4] || 245) / 350, // F.4 Max current normalized
            (settings[6] || 60) / 100, // F.6 Acceleration normalized
            (settings[9] || 225) / 300, // F.9 Regen current normalized
            (settings[24] || 43) / 60, // F.24 Field weakening normalized
            (conditions.weather?.temperature || 70) / 100, // Weather normalized
            (conditions.terrain?.difficulty || 0.3), // Terrain difficulty
            (conditions.battery?.charge || 90) / 100, // Battery charge
            (conditions.motor?.condition || 80) / 100, // Motor condition
            (conditions.load || 300) / 1000 // Load normalized
        ];
    }
    
    /**
     * Prepare classification input features
     */
    prepareClassificationInput(vehicleData) {
        return [
            (vehicleData.maxSpeed || 25) / 35, // Max speed normalized
            (vehicleData.batteryCapacity || 150) / 300, // Battery capacity
            (vehicleData.motorPower || 5) / 10, // Motor power normalized
            ((vehicleData.year || 2020) - 2000) / 30, // Year normalized
            (vehicleData.weight || 1200) / 2000 // Weight normalized
        ];
    }
    
    /**
     * Apply constraints to controller settings
     */
    applySettingConstraints(settingNumber, value) {
        const constraints = {
            1: { min: 15, max: 35 }, // MPH scaling
            4: { min: 150, max: 350 }, // Max current
            6: { min: 20, max: 100 }, // Acceleration
            9: { min: 100, max: 300 }, // Regen current
            24: { min: 25, max: 60 } // Field weakening
        };
        
        const constraint = constraints[settingNumber];
        if (constraint) {
            return Math.max(constraint.min, Math.min(constraint.max, value));
        }
        
        // Default constraint for other settings
        return Math.max(0, Math.min(255, value));
    }
    
    /**
     * Fallback optimization when ML is not available
     */
    getFallbackOptimization(vehicleData, priorities, currentSettings) {
        console.log('Using rule-based fallback optimization');
        
        // Simple rule-based optimization
        const baseSettings = [22, 245, 60, 225, 43]; // F.1, F.4, F.6, F.9, F.24
        const optimized = [...baseSettings];
        
        // Adjust based on priorities
        if (priorities.speed > 7) {
            optimized[0] = Math.min(30, optimized[0] + 5); // Increase speed
            optimized[1] = Math.min(300, optimized[1] + 30); // Increase current
        }
        
        if (priorities.range > 7) {
            optimized[0] = Math.max(18, optimized[0] - 3); // Decrease speed
            optimized[1] = Math.max(200, optimized[1] - 20); // Decrease current
            optimized[3] = Math.min(280, optimized[3] + 20); // Increase regen
        }
        
        // Fill remaining settings with defaults
        while (optimized.length < 25) {
            optimized.push(50);
        }
        
        return {
            success: true,
            optimizedSettings: optimized,
            method: 'rule_based_fallback',
            confidence: 0.70,
            source: 'local_rules'
        };
    }
    
    /**
     * Fallback performance prediction
     */
    getFallbackPerformance(settings, conditions) {
        const speed = Math.min(30, (settings[1] || 22) * 1.2);
        const range = Math.max(10, 40 - (settings[4] || 245) * 0.1);
        const efficiency = Math.max(60, 90 - (settings[1] || 22) * 1.5);
        
        return {
            success: true,
            speed: speed,
            range: range,
            efficiency: efficiency,
            method: 'rule_based_fallback',
            confidence: 0.60
        };
    }
    
    /**
     * Fallback vehicle classification
     */
    getFallbackClassification(vehicleData) {
        const model = vehicleData.model?.toLowerCase() || 'unknown';
        const year = vehicleData.year || 2020;
        
        let vehicleType = 'custom';
        let confidence = 0.5;
        
        if (model.includes('e2')) {
            vehicleType = 'e2';
            confidence = 0.8;
        } else if (model.includes('e4')) {
            vehicleType = 'e4';
            confidence = 0.8;
        } else if (model.includes('el') || model.includes('xd')) {
            vehicleType = 'el-xd';
            confidence = 0.8;
        }
        
        return {
            success: true,
            vehicleType: vehicleType,
            confidence: confidence,
            method: 'rule_based_fallback'
        };
    }
    
    /**
     * Get ML engine status
     */
    getStatus() {
        return {
            initialized: this.isInitialized,
            tensorflowLoaded: !!this.tf,
            modelsCount: this.models.size,
            trainingDataSets: this.trainingData.size,
            memoryUsage: this.tf ? this.tf.memory() : null
        };
    }
    
    /**
     * Clean up resources
     */
    dispose() {
        if (this.tf) {
            // Dispose all models
            for (const model of this.models.values()) {
                model.dispose();
            }
            
            // Clear maps
            this.models.clear();
            this.trainingData.clear();
            
            console.log('TensorFlow.js ML Engine disposed');
        }
    }
}

// Create global instance
window.tensorflowMLEngine = new TensorFlowMLEngine();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TensorFlowMLEngine;
}
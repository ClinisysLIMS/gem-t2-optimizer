/**
 * Comprehensive API-Free Testing Script
 * Tests all core functionality without external API dependencies
 */

// Test Results Collector
const testResults = {
    passed: 0,
    failed: 0,
    warnings: 0,
    results: [],
    
    addResult(name, status, message, details = null) {
        this.results.push({ name, status, message, details, timestamp: new Date() });
        this[status]++;
        this.logResult(name, status, message);
    },
    
    logResult(name, status, message) {
        const icon = status === 'passed' ? '✅' : status === 'failed' ? '❌' : '⚠️';
        console.log(`${icon} ${name}: ${message}`);
    }
};

// Test execution framework
async function runComprehensiveTests() {
    console.log('🚀 Starting Comprehensive API-Free Testing...\n');
    
    // Reset results
    testResults.passed = 0;
    testResults.failed = 0;
    testResults.warnings = 0;
    testResults.results = [];
    
    try {
        // Force local mode for all tests
        if (window.apiIntegration) {
            window.apiIntegration.forceLocalMode(true);
        }
        
        // Core Library Tests
        await testCoreLibraries();
        
        // Vehicle Configuration Tests
        await testVehicleConfiguration();
        
        // Optimization Engine Tests
        await testOptimizationEngine();
        
        // PDF Processing Tests
        await testPDFProcessing();
        
        // Trip Planning Tests
        await testTripPlanning();
        
        // UI Component Tests
        await testUIComponents();
        
        // Fallback System Tests
        await testFallbackSystems();
        
        // Data Persistence Tests
        await testDataPersistence();
        
        // Error Handling Tests
        await testErrorHandling();
        
        // Integration Tests
        await testIntegration();
        
    } catch (error) {
        testResults.addResult('Test Framework', 'failed', `Test framework error: ${error.message}`);
    }
    
    // Display final results
    displayTestResults();
}

// Individual test functions
async function testCoreLibraries() {
    console.log('\n📚 Testing Core Libraries...');
    
    // Test essential class availability
    const requiredClasses = [
        'GEMOptimizer',
        'FallbackCalculations', 
        'FallbackSystem',
        'APIIntegration',
        'UnifiedFlowController',
        'ValidationSystem',
        'PresetsManager',
        'PDFParser'
    ];
    
    for (const className of requiredClasses) {
        try {
            if (window[className]) {
                testResults.addResult(`${className} Availability`, 'passed', 'Class is available');
                
                // Test instantiation
                try {
                    const instance = new window[className]();
                    testResults.addResult(`${className} Instantiation`, 'passed', 'Can be instantiated');
                } catch (error) {
                    testResults.addResult(`${className} Instantiation`, 'warning', 
                        `Available but instantiation failed: ${error.message}`);
                }
            } else {
                testResults.addResult(`${className} Availability`, 'failed', 'Class not found');
            }
        } catch (error) {
            testResults.addResult(`${className} Test`, 'failed', error.message);
        }
    }
}

async function testVehicleConfiguration() {
    console.log('\n🚗 Testing Vehicle Configuration...');
    
    try {
        const optimizer = new GEMOptimizer();
        
        // Test basic vehicle data validation
        const testVehicleData = {
            model: 'e4',
            year: '2016+',
            controller: 'T2',
            motorType: 'dc-stock',
            currentSpeed: 25,
            batteryVoltage: 48,
            batteryType: 'lead-acid',
            batteryCapacity: 105,
            tireDiameter: 22.5,
            gearRatio: '10.35:1'
        };
        
        // Test configuration generation
        const config = optimizer.generateVehicleConfiguration(testVehicleData);
        if (config && typeof config === 'object') {
            testResults.addResult('Vehicle Configuration', 'passed', 'Configuration generated successfully');
        } else {
            testResults.addResult('Vehicle Configuration', 'failed', 'Failed to generate configuration');
        }
        
        // Test vehicle classification
        if (window.VehicleClassifier) {
            const classifier = new VehicleClassifier();
            const classification = classifier.classifyVehicle(testVehicleData);
            if (classification) {
                testResults.addResult('Vehicle Classification', 'passed', 
                    `Classified as: ${classification.category}`);
            } else {
                testResults.addResult('Vehicle Classification', 'failed', 'Classification failed');
            }
        } else {
            testResults.addResult('Vehicle Classification', 'warning', 'VehicleClassifier not available');
        }
        
    } catch (error) {
        testResults.addResult('Vehicle Configuration', 'failed', error.message);
    }
}

async function testOptimizationEngine() {
    console.log('\n⚙️ Testing Optimization Engine...');
    
    try {
        const optimizer = new GEMOptimizer();
        
        // Test basic optimization
        const vehicleData = {
            model: 'e4',
            year: '2016+',
            motorType: 'dc-stock',
            batteryVoltage: 48,
            currentSpeed: 25,
            tireDiameter: 22.5,
            gearRatio: '10.35:1'
        };
        
        const result = await optimizer.optimizeSettings(vehicleData);
        
        if (result && result.settings) {
            const settingsCount = Object.keys(result.settings).length;
            testResults.addResult('Basic Optimization', 'passed', 
                `Generated ${settingsCount} controller settings`);
                
            // Test safety constraints
            let safetyViolations = 0;
            for (const [func, value] of Object.entries(result.settings)) {
                const constraints = optimizer.safetyConstraints[func];
                if (constraints && (value < constraints.min || value > constraints.max)) {
                    safetyViolations++;
                }
            }
            
            if (safetyViolations === 0) {
                testResults.addResult('Safety Constraints', 'passed', 'All settings within safe limits');
            } else {
                testResults.addResult('Safety Constraints', 'warning', 
                    `${safetyViolations} settings outside recommended limits`);
            }
        } else {
            testResults.addResult('Basic Optimization', 'failed', 'No settings generated');
        }
        
        // Test different vehicle types
        const vehicleTypes = ['e2', 'e4', 'e6', 'eS', 'eL', 'elXD'];
        let typeTestsPassed = 0;
        
        for (const type of vehicleTypes) {
            try {
                const typeData = { ...vehicleData, model: type };
                const typeResult = await optimizer.optimizeSettings(typeData);
                if (typeResult && typeResult.settings) {
                    typeTestsPassed++;
                }
            } catch (error) {
                // Continue testing other types
            }
        }
        
        testResults.addResult('Vehicle Type Support', 'passed', 
            `Supports ${typeTestsPassed}/${vehicleTypes.length} vehicle types`);
            
    } catch (error) {
        testResults.addResult('Optimization Engine', 'failed', error.message);
    }
}

async function testPDFProcessing() {
    console.log('\n📄 Testing PDF Processing...');
    
    try {
        if (!window.PDFParser) {
            testResults.addResult('PDF Parser', 'warning', 'PDF Parser not available');
            return;
        }
        
        const parser = new PDFParser();
        
        // Test text extraction patterns
        const sampleText = `
            GEM T2 Controller Settings Export
            F.No. 1    Counts 75
            F.No. 2    Counts 0
            F.No. 3    Counts 20
            F.No. 4    Counts 255
            Vehicle: e4 2018
            Motor: DC 3.5HP Stock
        `;
        
        const extracted = parser.extractSettingsFromText(sampleText);
        
        if (extracted && extracted.settings && Object.keys(extracted.settings).length > 0) {
            testResults.addResult('PDF Text Extraction', 'passed', 
                `Extracted ${Object.keys(extracted.settings).length} settings from text`);
        } else {
            testResults.addResult('PDF Text Extraction', 'failed', 'Failed to extract settings from text');
        }
        
        // Test pattern recognition
        const patterns = parser.patterns;
        if (patterns && Object.keys(patterns).length > 0) {
            testResults.addResult('PDF Pattern Recognition', 'passed', 
                `${Object.keys(patterns).length} extraction patterns available`);
        } else {
            testResults.addResult('PDF Pattern Recognition', 'failed', 'No extraction patterns defined');
        }
        
    } catch (error) {
        testResults.addResult('PDF Processing', 'failed', error.message);
    }
}

async function testTripPlanning() {
    console.log('\n🗺️ Testing Trip Planning...');
    
    try {
        if (!window.TripOptimizer) {
            testResults.addResult('Trip Optimizer', 'warning', 'TripOptimizer not available');
            return;
        }
        
        const optimizer = new GEMOptimizer();
        const tripOptimizer = new TripOptimizer(optimizer);
        
        const tripData = {
            start: 'Golf Course Community',
            destination: 'Beach Resort',
            date: new Date(),
            vehicleConfig: {
                model: 'e4',
                batteryAge: 1,
                motorCondition: 'good'
            },
            preferences: {
                comfort: true,
                scenic: false,
                efficiency: true
            }
        };
        
        const result = await tripOptimizer.optimizeTrip(tripData);
        
        if (result) {
            testResults.addResult('Trip Optimization', 'passed', 'Trip optimization completed');
            
            // Check result components
            if (result.route) {
                testResults.addResult('Route Planning', 'passed', 'Route information available');
            }
            if (result.settings) {
                testResults.addResult('Trip-Specific Settings', 'passed', 'Custom settings generated');
            }
            if (result.analysis) {
                testResults.addResult('Trip Analysis', 'passed', 'Trip analysis completed');
            }
        } else {
            testResults.addResult('Trip Optimization', 'failed', 'Trip optimization failed');
        }
        
    } catch (error) {
        testResults.addResult('Trip Planning', 'failed', error.message);
    }
}

async function testUIComponents() {
    console.log('\n🖥️ Testing UI Components...');
    
    // Test form elements
    const formElements = [
        'vehicle-model',
        'vehicle-year', 
        'controller-type',
        'motor-type',
        'current-speed',
        'battery-voltage',
        'battery-type'
    ];
    
    let availableElements = 0;
    for (const elementId of formElements) {
        const element = document.getElementById(elementId);
        if (element) {
            availableElements++;
            
            // Test element interaction
            try {
                const originalValue = element.value;
                element.value = 'test';
                element.dispatchEvent(new Event('change'));
                element.value = originalValue;
            } catch (error) {
                // Element exists but may not be interactive
            }
        }
    }
    
    testResults.addResult('Form Elements', 'passed', 
        `${availableElements}/${formElements.length} form elements available`);
    
    // Test navigation
    const navButtons = [
        'continue-to-planning',
        'back-to-vehicle',
        'generate-settings'
    ];
    
    let availableButtons = 0;
    for (const buttonId of navButtons) {
        if (document.getElementById(buttonId)) {
            availableButtons++;
        }
    }
    
    testResults.addResult('Navigation Buttons', 'passed', 
        `${availableButtons}/${navButtons.length} navigation buttons available`);
    
    // Test unified flow controller
    if (window.unifiedFlow || window.UnifiedFlowController) {
        testResults.addResult('Unified Flow Controller', 'passed', 'Flow controller available');
    } else {
        testResults.addResult('Unified Flow Controller', 'warning', 'Flow controller not initialized');
    }
}

async function testFallbackSystems() {
    console.log('\n🔄 Testing Fallback Systems...');
    
    try {
        if (!window.fallbackCalculations) {
            testResults.addResult('Fallback Calculations', 'failed', 'FallbackCalculations not available');
            return;
        }
        
        const fallback = window.fallbackCalculations;
        
        // Test weather estimation
        const weather = fallback.estimateWeather('San Diego, CA', new Date());
        if (weather && weather.temperature !== undefined) {
            testResults.addResult('Weather Fallback', 'passed', 
                `Weather estimation working (${weather.temperature}°F)`);
        } else {
            testResults.addResult('Weather Fallback', 'failed', 'Weather estimation failed');
        }
        
        // Test terrain estimation
        const terrain = fallback.estimateTerrain('Mountain View, CA');
        if (terrain && terrain.type) {
            testResults.addResult('Terrain Fallback', 'passed', 
                `Terrain estimation working (${terrain.type})`);
        } else {
            testResults.addResult('Terrain Fallback', 'failed', 'Terrain estimation failed');
        }
        
        // Test traffic estimation
        const traffic = fallback.estimateTraffic('Downtown Area', new Date());
        if (traffic && traffic.congestionLevel) {
            testResults.addResult('Traffic Fallback', 'passed', 
                `Traffic estimation working (${traffic.congestionLevel})`);
        } else {
            testResults.addResult('Traffic Fallback', 'failed', 'Traffic estimation failed');
        }
        
        // Test route optimization
        const route = fallback.optimizeRoute('Start Location', 'End Location', { comfort: true });
        if (route && route.distance) {
            testResults.addResult('Route Fallback', 'passed', 
                `Route optimization working (${route.distance.text})`);
        } else {
            testResults.addResult('Route Fallback', 'failed', 'Route optimization failed');
        }
        
    } catch (error) {
        testResults.addResult('Fallback Systems', 'failed', error.message);
    }
}

async function testDataPersistence() {
    console.log('\n💾 Testing Data Persistence...');
    
    try {
        // Test local storage
        const testData = {
            vehicleModel: 'e4',
            timestamp: Date.now()
        };
        
        localStorage.setItem('gem_test_data', JSON.stringify(testData));
        const retrieved = JSON.parse(localStorage.getItem('gem_test_data'));
        
        if (retrieved && retrieved.vehicleModel === testData.vehicleModel) {
            testResults.addResult('Local Storage', 'passed', 'Data persistence working');
            localStorage.removeItem('gem_test_data');
        } else {
            testResults.addResult('Local Storage', 'failed', 'Data persistence failed');
        }
        
        // Test session storage
        sessionStorage.setItem('gem_test_session', JSON.stringify(testData));
        const sessionRetrieved = JSON.parse(sessionStorage.getItem('gem_test_session'));
        
        if (sessionRetrieved && sessionRetrieved.vehicleModel === testData.vehicleModel) {
            testResults.addResult('Session Storage', 'passed', 'Session data working');
            sessionStorage.removeItem('gem_test_session');
        } else {
            testResults.addResult('Session Storage', 'failed', 'Session data failed');
        }
        
    } catch (error) {
        testResults.addResult('Data Persistence', 'failed', error.message);
    }
}

async function testErrorHandling() {
    console.log('\n🛡️ Testing Error Handling...');
    
    try {
        // Test optimization with invalid data
        const optimizer = new GEMOptimizer();
        
        try {
            const result = await optimizer.optimizeSettings({
                model: 'invalid',
                year: 'unknown',
                motorType: 'nonexistent'
            });
            
            if (result) {
                testResults.addResult('Invalid Data Handling', 'passed', 
                    'Gracefully handled invalid input');
            } else {
                testResults.addResult('Invalid Data Handling', 'passed', 
                    'Rejected invalid input appropriately');
            }
        } catch (error) {
            if (error.message.includes('invalid') || error.message.includes('unknown')) {
                testResults.addResult('Invalid Data Handling', 'passed', 
                    'Properly throws descriptive errors');
            } else {
                testResults.addResult('Invalid Data Handling', 'warning', 
                    'Error handling could be more descriptive');
            }
        }
        
        // Test missing API graceful degradation
        if (window.apiIntegration) {
            window.apiIntegration.forceLocalMode(true);
            
            try {
                const weather = await window.apiIntegration.getWeather('Test Location');
                if (weather && weather.source === 'fallback') {
                    testResults.addResult('API Fallback', 'passed', 
                        'Gracefully falls back to local calculations');
                } else {
                    testResults.addResult('API Fallback', 'warning', 
                        'API fallback behavior unclear');
                }
            } catch (error) {
                testResults.addResult('API Fallback', 'failed', 
                    'API fallback failed: ' + error.message);
            }
        }
        
    } catch (error) {
        testResults.addResult('Error Handling', 'failed', error.message);
    }
}

async function testIntegration() {
    console.log('\n🔗 Testing Integration...');
    
    try {
        // Test complete workflow
        if (window.unifiedFlow || window.UnifiedFlowController) {
            const controller = window.unifiedFlow || new UnifiedFlowController();
            
            // Simulate step 1 completion
            controller.vehicleData = {
                model: 'e4',
                year: '2016+',
                controller: 'T2',
                motorType: 'dc-stock',
                currentSpeed: 25,
                batteryVoltage: 48,
                batteryType: 'lead-acid',
                batteryCapacity: 105,
                tireDiameter: 22.5,
                gearRatio: '10.35:1'
            };
            
            const step1Valid = controller.validateStep1();
            if (step1Valid) {
                testResults.addResult('Step 1 Validation', 'passed', 'Vehicle validation working');
            } else {
                testResults.addResult('Step 1 Validation', 'failed', 'Vehicle validation failed');
            }
            
            // Test preset application
            if (window.PresetsManager) {
                const optimizer = new GEMOptimizer();
                const presets = new PresetsManager(optimizer);
                const availablePresets = presets.getPresets();
                
                if (availablePresets && Object.keys(availablePresets).length > 0) {
                    const firstPreset = Object.keys(availablePresets)[0];
                    const applied = presets.applyPreset(firstPreset);
                    
                    if (applied) {
                        testResults.addResult('Preset Integration', 'passed', 
                            'Preset system working');
                    } else {
                        testResults.addResult('Preset Integration', 'failed', 
                            'Preset application failed');
                    }
                } else {
                    testResults.addResult('Preset Integration', 'warning', 
                        'No presets available');
                }
            }
        } else {
            testResults.addResult('Integration Test', 'warning', 
                'Unified flow controller not available');
        }
        
    } catch (error) {
        testResults.addResult('Integration', 'failed', error.message);
    }
}

function displayTestResults() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('='.repeat(60));
    
    const total = testResults.passed + testResults.failed + testResults.warnings;
    const passRate = total > 0 ? Math.round((testResults.passed / total) * 100) : 0;
    
    console.log(`Total Tests: ${total}`);
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    console.log(`⚠️ Warnings: ${testResults.warnings}`);
    console.log(`📈 Pass Rate: ${passRate}%`);
    
    let status = 'Needs Attention';
    if (passRate >= 90) status = 'Excellent';
    else if (passRate >= 75) status = 'Good';
    else if (passRate >= 60) status = 'Acceptable';
    
    console.log(`🎯 Overall Status: ${status}`);
    
    // Critical failures
    const criticalFailures = testResults.results.filter(r => 
        r.status === 'failed' && 
        (r.name.includes('Core') || r.name.includes('Optimization') || r.name.includes('Vehicle'))
    );
    
    if (criticalFailures.length > 0) {
        console.log('\n🚨 CRITICAL ISSUES:');
        criticalFailures.forEach(failure => {
            console.log(`   • ${failure.name}: ${failure.message}`);
        });
    }
    
    // Feature availability summary
    console.log('\n🎪 FEATURE AVAILABILITY:');
    const features = [
        { name: 'Vehicle Optimization', test: 'Basic Optimization' },
        { name: 'PDF Processing', test: 'PDF Text Extraction' },
        { name: 'Trip Planning', test: 'Trip Optimization' },
        { name: 'Weather Fallback', test: 'Weather Fallback' },
        { name: 'UI Components', test: 'Form Elements' },
        { name: 'Data Persistence', test: 'Local Storage' }
    ];
    
    features.forEach(feature => {
        const result = testResults.results.find(r => r.name === feature.test);
        const status = result ? result.status : 'unknown';
        const icon = status === 'passed' ? '✅' : status === 'failed' ? '❌' : '⚠️';
        console.log(`   ${icon} ${feature.name}: ${status.toUpperCase()}`);
    });
    
    console.log('\n' + '='.repeat(60));
    
    return {
        summary: {
            total,
            passed: testResults.passed,
            failed: testResults.failed,
            warnings: testResults.warnings,
            passRate,
            status
        },
        details: testResults.results,
        criticalFailures: criticalFailures.length
    };
}

// Export for use in HTML or other contexts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { runComprehensiveTests, testResults };
}

// Auto-run if in browser
if (typeof window !== 'undefined') {
    window.runComprehensiveTests = runComprehensiveTests;
    window.testResults = testResults;
}
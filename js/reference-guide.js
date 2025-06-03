/**
 * GE Controller Reference Guide
 * Complete documentation for all 128 controller functions
 */

class ReferenceGuide {
    constructor() {
        // Complete function database for all 128 functions
        this.functions = {
            1: {
                name: "MPH Scaling",
                category: "speed",
                description: "Sets the top speed of the vehicle",
                range: "0-255",
                default: 22,
                units: "Counts",
                notes: "Higher values = higher speed. Affected by tire size and gear ratio.",
                common: true,
                tips: ["Start with small changes", "Consider motor limitations", "Verify speedometer accuracy"]
            },
            2: {
                name: "Reserved",
                category: "diagnostic",
                description: "Reserved for future use",
                range: "0-255",
                default: 0,
                units: "N/A",
                notes: "Do not modify",
                common: false
            },
            3: {
                name: "Controlled Acceleration",
                category: "speed",
                description: "Controls acceleration rate and smoothness",
                range: "0-50",
                default: 20,
                units: "Counts",
                notes: "Lower values = faster acceleration. Higher values = smoother, more controlled acceleration.",
                common: true,
                tips: ["Lower for performance", "Higher for comfort", "Affects battery life"]
            },
            4: {
                name: "Max Armature Current",
                category: "motor",
                description: "Maximum current allowed to the motor armature",
                range: "0-255",
                default: 255,
                units: "Counts",
                notes: "Protects motor from overcurrent. Reduce if motor overheats.",
                common: true,
                tips: ["Monitor motor temperature", "Reduce for motor protection", "Affects hill climbing"]
            },
            5: {
                name: "Plug Current",
                category: "motor",
                description: "Current limit during plug braking",
                range: "0-255",
                default: 255,
                units: "Counts",
                notes: "Controls braking strength when reversing direction",
                common: false
            },
            6: {
                name: "Armature Accel Rate",
                category: "speed",
                description: "Rate of armature current increase during acceleration",
                range: "0-255",
                default: 60,
                units: "Counts",
                notes: "Higher values = more aggressive acceleration",
                common: true,
                tips: ["Balance with battery capacity", "Higher values drain battery faster"]
            },
            7: {
                name: "Minimum Field Current",
                category: "motor",
                description: "Minimum field current to prevent motor damage",
                range: "0-255",
                default: 59,
                units: "Counts",
                notes: "Critical for preventing brush arcing and motor damage",
                common: true,
                tips: ["Increase if seeing sparks", "Never set too low", "Protects motor brushes"]
            },
            8: {
                name: "Maximum Field Current",
                category: "motor",
                description: "Maximum field current allowed",
                range: "0-255",
                default: 241,
                units: "Counts",
                notes: "Affects torque and top speed potential",
                common: true
            },
            9: {
                name: "Regen Armature Current",
                category: "battery",
                description: "Current during regenerative braking",
                range: "0-255",
                default: 221,
                units: "Counts",
                notes: "Higher values = stronger regen braking",
                common: true,
                tips: ["Adjust based on battery type", "Lithium batteries can handle more regen"]
            },
            10: {
                name: "Regen Max Field Current",
                category: "battery",
                description: "Maximum field current during regeneration",
                range: "0-255",
                default: 180,
                units: "Counts",
                notes: "Works with F9 to control regen strength",
                common: false
            },
            11: {
                name: "Turf Speed Limit",
                category: "speed",
                description: "Speed limit in turf/turtle mode",
                range: "0-255",
                default: 122,
                units: "Counts",
                notes: "Activated by turf switch if equipped",
                common: true,
                tips: ["Set to 25-50% of top speed", "Useful for parking lots"]
            },
            12: {
                name: "Reverse Speed Limit",
                category: "speed",
                description: "Maximum speed in reverse",
                range: "0-255",
                default: 149,
                units: "Counts",
                notes: "Safety feature to limit reverse speed",
                common: true,
                tips: ["Keep lower than forward speed", "Consider safety requirements"]
            },
            13: {
                name: "Reserved",
                category: "diagnostic",
                description: "Reserved for future use",
                range: "0-255",
                default: 0,
                units: "N/A",
                notes: "Do not modify",
                common: false
            },
            14: {
                name: "IR Compensation",
                category: "battery",
                description: "Compensates for battery internal resistance",
                range: "0-20",
                default: 3,
                units: "Counts",
                notes: "Higher for old batteries, lower for lithium",
                common: true,
                tips: ["Increase for aging batteries", "Set to 7 for lithium", "Affects voltage sag compensation"]
            },
            15: {
                name: "Battery Volts",
                category: "battery",
                description: "Nominal battery pack voltage",
                range: "48-96",
                default: 72,
                units: "Volts",
                notes: "Must match actual battery voltage",
                common: true,
                tips: ["Critical setting", "Wrong value can damage controller", "48V, 60V, 72V, 82V, 96V common"]
            },
            16: {
                name: "Low Battery Volts",
                category: "battery",
                description: "Low voltage cutoff threshold",
                range: "0-255",
                default: 63,
                units: "Counts",
                notes: "Protects battery from over-discharge",
                common: false
            },
            17: {
                name: "Pack Over Temp",
                category: "safety",
                description: "Battery temperature limit",
                range: "0-255",
                default: 0,
                units: "Counts",
                notes: "If equipped with temperature sensor",
                common: false
            },
            18: {
                name: "Reserved",
                category: "diagnostic",
                description: "Reserved for future use",
                range: "0-255",
                default: 0,
                units: "N/A",
                notes: "Do not modify",
                common: false
            },
            19: {
                name: "Field Ramp Rate",
                category: "motor",
                description: "Rate of field current change",
                range: "0-255",
                default: 12,
                units: "Counts",
                notes: "Affects acceleration smoothness",
                common: false
            },
            20: {
                name: "MPH Overspeed",
                category: "safety",
                description: "Overspeed protection threshold",
                range: "0-255",
                default: 40,
                units: "Counts",
                notes: "Cuts power if speed exceeds this limit",
                common: true,
                tips: ["Set 10-20% above desired top speed", "Safety feature - do not disable"]
            },
            21: {
                name: "Handbrake",
                category: "safety",
                description: "Handbrake/parking brake function",
                range: "0-1",
                default: 0,
                units: "Boolean",
                notes: "0=Disabled, 1=Enabled",
                common: false
            },
            22: {
                name: "Odometer Calibration",
                category: "diagnostic",
                description: "Calibrates odometer for tire size",
                range: "0-255",
                default: 122,
                units: "Counts",
                notes: "Adjust when changing tire size",
                common: true,
                tips: ["Calculate based on tire circumference", "Affects speedometer accuracy"]
            },
            23: {
                name: "Error Compensation",
                category: "diagnostic",
                description: "Error detection sensitivity",
                range: "0-255",
                default: 10,
                units: "Counts",
                notes: "Lower values = more sensitive error detection",
                common: false
            },
            24: {
                name: "Field Weakening Start",
                category: "motor",
                description: "Speed at which field weakening begins",
                range: "0-255",
                default: 43,
                units: "Counts",
                notes: "Allows higher top speed by reducing field current",
                common: true,
                tips: ["Lower for more top speed", "Higher for better efficiency", "Can affect motor life"]
            },
            25: {
                name: "Pedal Enable",
                category: "safety",
                description: "Enables/disables accelerator pedal",
                range: "0-1",
                default: 1,
                units: "Boolean",
                notes: "0=Disabled, 1=Enabled",
                common: false
            },
            26: {
                name: "Ratio Field to Arm",
                category: "motor",
                description: "Field to armature current ratio",
                range: "0-255",
                default: 3,
                units: "Counts",
                notes: "Affects torque vs speed characteristics",
                common: true,
                tips: ["Higher for more torque", "Lower for more speed", "Critical for motor protection"]
            }
        };

        // Add remaining functions 27-128 as reserved
        for (let i = 27; i <= 128; i++) {
            this.functions[i] = {
                name: `Function ${i}`,
                category: "diagnostic",
                description: "Reserved or manufacturer-specific function",
                range: "0-255",
                default: 0,
                units: "Counts",
                notes: "Consult manufacturer documentation before modifying",
                common: false
            };
        }

        // Error codes database
        this.errorCodes = {
            "11": {
                code: "11",
                description: "Accelerator Pedal Fault",
                causes: ["Pedal sensor out of range", "Wiring issue", "Pedal calibration needed"],
                solutions: ["Check pedal connections", "Verify pedal voltage (0.5-4.5V typical)", "Recalibrate pedal"]
            },
            "12": {
                code: "12",
                description: "Pre-charge Fault",
                causes: ["Capacitor not charging", "Main contactor issue", "Low battery voltage"],
                solutions: ["Check main contactor", "Verify battery voltage", "Inspect pre-charge resistor"]
            },
            "13": {
                code: "13",
                description: "Controller Overheat",
                causes: ["Insufficient cooling", "Excessive load", "Ambient temperature too high"],
                solutions: ["Improve ventilation", "Reduce load", "Check for blocked cooling fins"]
            },
            "14": {
                code: "14",
                description: "Motor Overheat",
                causes: ["Excessive load", "Poor ventilation", "Worn brushes causing friction"],
                solutions: ["Allow motor to cool", "Check brush condition", "Reduce load or speed"]
            },
            "15": {
                code: "15",
                description: "Low Battery Voltage",
                causes: ["Discharged battery", "Bad cell in pack", "Loose connections"],
                solutions: ["Charge battery", "Check individual battery voltages", "Clean and tighten connections"]
            },
            "16": {
                code: "16",
                description: "High Battery Voltage",
                causes: ["Overcharged battery", "Charger malfunction", "Regen voltage too high"],
                solutions: ["Check charger output", "Verify F15 setting", "Reduce regen settings"]
            },
            "17": {
                code: "17",
                description: "Motor Short Circuit",
                causes: ["Shorted motor windings", "Damaged brushes", "Controller output fault"],
                solutions: ["Test motor resistance", "Inspect brushes", "Check motor connections"]
            },
            "21": {
                code: "21",
                description: "Speed Sensor Fault",
                causes: ["Sensor disconnected", "Sensor damaged", "Wiring issue"],
                solutions: ["Check sensor connection", "Test sensor output", "Verify sensor gap"]
            },
            "23": {
                code: "23",
                description: "Main Contactor Fault",
                causes: ["Contactor not closing", "Welded contacts", "Control circuit issue"],
                solutions: ["Check contactor operation", "Test coil voltage", "Inspect contacts"]
            },
            "31": {
                code: "31",
                description: "Parameter Out of Range",
                causes: ["Invalid function setting", "Corrupted memory", "Programming error"],
                solutions: ["Reset to factory defaults", "Reprogram controller", "Check all function values"]
            },
            "41": {
                code: "41",
                description: "EEPROM Fault",
                causes: ["Memory corruption", "Failed write operation", "Power loss during programming"],
                solutions: ["Reset controller", "Reload parameters", "Replace controller if persistent"]
            },
            "51": {
                code: "51",
                description: "Brake Fault",
                causes: ["Brake switch stuck", "Wiring issue", "Brake light circuit problem"],
                solutions: ["Check brake switch", "Verify brake light operation", "Inspect wiring"]
            },
            "61": {
                code: "61",
                description: "Direction Switch Fault",
                causes: ["F/N/R switch issue", "Wiring problem", "Switch out of adjustment"],
                solutions: ["Check switch operation", "Verify neutral position", "Adjust or replace switch"]
            },
            "71": {
                code: "71",
                description: "Turf Switch Fault",
                causes: ["Turf switch wiring", "Switch failure", "Invalid F11 setting"],
                solutions: ["Check turf switch", "Verify F11 setting", "Test switch continuity"]
            },
            "99": {
                code: "99",
                description: "Multiple Faults",
                causes: ["Several simultaneous errors", "Major system issue", "Communication error"],
                solutions: ["Check all systems", "Clear codes and retest", "Address individual faults"]
            }
        };

        this.initializeEventListeners();
        this.renderFunctions();
        this.renderErrorCodes();
    }

    initializeEventListeners() {
        // Mobile menu
        document.getElementById('mobile-menu-btn')?.addEventListener('click', () => {
            document.getElementById('mobile-menu').classList.toggle('hidden');
        });

        // Search functionality
        const searchInput = document.getElementById('search-input');
        searchInput?.addEventListener('input', (e) => this.handleSearch(e.target.value));

        // Category filter
        const categoryFilter = document.getElementById('category-filter');
        categoryFilter?.addEventListener('change', (e) => this.filterByCategory(e.target.value));

        // Reset filters
        document.getElementById('reset-filters')?.addEventListener('click', () => {
            searchInput.value = '';
            categoryFilter.value = 'all';
            this.renderFunctions();
            document.getElementById('search-results').textContent = '';
        });

        // Quick navigation
        document.querySelectorAll('.quick-nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const section = e.target.dataset.section;
                document.getElementById(section)?.scrollIntoView({ behavior: 'smooth' });
            });
        });

        // Back to top button
        const backToTop = document.getElementById('back-to-top');
        window.addEventListener('scroll', () => {
            if (window.pageYOffset > 300) {
                backToTop.classList.remove('hidden');
            } else {
                backToTop.classList.add('hidden');
            }
        });

        backToTop?.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    renderFunctions() {
        // Render commonly used functions
        const commonGrid = document.getElementById('common-functions-grid');
        const commonFunctions = Object.entries(this.functions)
            .filter(([_, func]) => func.common)
            .sort((a, b) => parseInt(a[0]) - parseInt(b[0]));

        commonGrid.innerHTML = commonFunctions.map(([num, func]) => 
            this.createFunctionCard(num, func, true)
        ).join('');

        // Render all functions
        const functionsGrid = document.getElementById('functions-grid');
        const allFunctions = Object.entries(this.functions)
            .sort((a, b) => parseInt(a[0]) - parseInt(b[0]));

        functionsGrid.innerHTML = allFunctions.map(([num, func]) => 
            this.createFunctionCard(num, func, false)
        ).join('');
    }

    createFunctionCard(num, func, isCommon = false) {
        const categoryColors = {
            speed: 'blue',
            motor: 'orange',
            battery: 'green',
            safety: 'red',
            diagnostic: 'gray'
        };

        const color = categoryColors[func.category] || 'gray';
        
        return `
            <div class="function-card border rounded-lg p-4 hover:shadow-md ${isCommon ? 'bg-green-50 border-green-200' : ''}">
                <div class="flex items-start justify-between mb-2">
                    <div class="flex items-center">
                        <span class="inline-flex items-center justify-center w-10 h-10 rounded-full bg-${color}-100 text-${color}-700 font-bold text-sm mr-3">
                            F${num}
                        </span>
                        <div>
                            <h4 class="font-semibold text-gray-900">${func.name}</h4>
                            <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-${color}-100 text-${color}-800">
                                ${func.category}
                            </span>
                        </div>
                    </div>
                    ${func.common ? '<span class="text-yellow-500">★</span>' : ''}
                </div>
                
                <p class="text-sm text-gray-600 mb-3">${func.description}</p>
                
                <div class="grid grid-cols-2 gap-2 text-xs">
                    <div>
                        <span class="text-gray-500">Range:</span>
                        <span class="font-medium">${func.range}</span>
                    </div>
                    <div>
                        <span class="text-gray-500">Default:</span>
                        <span class="font-medium">${func.default}</span>
                    </div>
                    <div>
                        <span class="text-gray-500">Units:</span>
                        <span class="font-medium">${func.units}</span>
                    </div>
                </div>
                
                ${func.notes ? `
                    <div class="mt-3 p-2 bg-gray-50 rounded text-xs text-gray-700">
                        <strong>Note:</strong> ${func.notes}
                    </div>
                ` : ''}
                
                ${func.tips ? `
                    <div class="mt-2">
                        <details class="text-xs">
                            <summary class="cursor-pointer text-blue-600 hover:text-blue-800 font-medium">
                                Tips & Best Practices
                            </summary>
                            <ul class="mt-2 space-y-1 text-gray-600">
                                ${func.tips.map(tip => `<li>• ${tip}</li>`).join('')}
                            </ul>
                        </details>
                    </div>
                ` : ''}
            </div>
        `;
    }

    renderErrorCodes() {
        const errorGrid = document.getElementById('error-codes-grid');
        const errorCodes = Object.entries(this.errorCodes);

        errorGrid.innerHTML = errorCodes.map(([code, error]) => `
            <div class="border border-red-200 rounded-lg p-4 bg-red-50">
                <div class="flex items-start">
                    <span class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 text-red-700 font-bold mr-4">
                        ${code}
                    </span>
                    <div class="flex-1">
                        <h4 class="font-semibold text-red-900 mb-2">${error.description}</h4>
                        
                        <div class="mb-3">
                            <h5 class="text-sm font-medium text-red-800 mb-1">Possible Causes:</h5>
                            <ul class="text-sm text-red-700 space-y-1">
                                ${error.causes.map(cause => `<li>• ${cause}</li>`).join('')}
                            </ul>
                        </div>
                        
                        <div>
                            <h5 class="text-sm font-medium text-red-800 mb-1">Solutions:</h5>
                            <ul class="text-sm text-red-700 space-y-1">
                                ${error.solutions.map(solution => `<li>✓ ${solution}</li>`).join('')}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    handleSearch(query) {
        const searchTerm = query.toLowerCase().trim();
        
        if (!searchTerm) {
            this.renderFunctions();
            document.getElementById('search-results').textContent = '';
            return;
        }

        // Search functions
        const matchedFunctions = Object.entries(this.functions).filter(([num, func]) => {
            return num.includes(searchTerm) ||
                   func.name.toLowerCase().includes(searchTerm) ||
                   func.description.toLowerCase().includes(searchTerm) ||
                   func.notes.toLowerCase().includes(searchTerm) ||
                   (func.tips && func.tips.some(tip => tip.toLowerCase().includes(searchTerm)));
        });

        // Search error codes
        const matchedErrors = Object.entries(this.errorCodes).filter(([code, error]) => {
            return code.includes(searchTerm) ||
                   error.description.toLowerCase().includes(searchTerm) ||
                   error.causes.some(cause => cause.toLowerCase().includes(searchTerm)) ||
                   error.solutions.some(solution => solution.toLowerCase().includes(searchTerm));
        });

        // Update search results count
        const totalMatches = matchedFunctions.length + matchedErrors.length;
        document.getElementById('search-results').textContent = 
            `Found ${totalMatches} result${totalMatches !== 1 ? 's' : ''} for "${query}"`;

        // Update displays
        this.renderFilteredFunctions(matchedFunctions);
        this.renderFilteredErrors(matchedErrors);

        // Highlight search terms
        this.highlightSearchTerms(searchTerm);
    }

    filterByCategory(category) {
        if (category === 'all') {
            this.renderFunctions();
            return;
        }

        const filtered = Object.entries(this.functions)
            .filter(([_, func]) => func.category === category);

        this.renderFilteredFunctions(filtered);
    }

    renderFilteredFunctions(functions) {
        const commonGrid = document.getElementById('common-functions-grid');
        const functionsGrid = document.getElementById('functions-grid');

        const commonFunctions = functions.filter(([_, func]) => func.common);
        const allFunctions = functions;

        commonGrid.innerHTML = commonFunctions.length > 0 
            ? commonFunctions.map(([num, func]) => this.createFunctionCard(num, func, true)).join('')
            : '<p class="text-gray-500 text-sm">No matching common functions found.</p>';

        functionsGrid.innerHTML = allFunctions.length > 0
            ? allFunctions.map(([num, func]) => this.createFunctionCard(num, func, false)).join('')
            : '<p class="text-gray-500 text-sm">No matching functions found.</p>';
    }

    renderFilteredErrors(errors) {
        const errorGrid = document.getElementById('error-codes-grid');
        
        if (errors.length === 0) {
            errorGrid.innerHTML = '<p class="text-gray-500 text-sm">No matching error codes found.</p>';
            return;
        }

        errorGrid.innerHTML = errors.map(([code, error]) => {
            // Same template as renderErrorCodes
            return `
                <div class="border border-red-200 rounded-lg p-4 bg-red-50">
                    <div class="flex items-start">
                        <span class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 text-red-700 font-bold mr-4">
                            ${code}
                        </span>
                        <div class="flex-1">
                            <h4 class="font-semibold text-red-900 mb-2">${error.description}</h4>
                            
                            <div class="mb-3">
                                <h5 class="text-sm font-medium text-red-800 mb-1">Possible Causes:</h5>
                                <ul class="text-sm text-red-700 space-y-1">
                                    ${error.causes.map(cause => `<li>• ${cause}</li>`).join('')}
                                </ul>
                            </div>
                            
                            <div>
                                <h5 class="text-sm font-medium text-red-800 mb-1">Solutions:</h5>
                                <ul class="text-sm text-red-700 space-y-1">
                                    ${error.solutions.map(solution => `<li>✓ ${solution}</li>`).join('')}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    highlightSearchTerms(searchTerm) {
        // Simple highlight implementation
        // In production, use a more robust highlighting library
        setTimeout(() => {
            const elements = document.querySelectorAll('.function-card p, .function-card h4, .function-card li');
            elements.forEach(el => {
                const text = el.innerHTML;
                const regex = new RegExp(`(${searchTerm})`, 'gi');
                el.innerHTML = text.replace(regex, '<span class="search-highlight">$1</span>');
            });
        }, 100);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new ReferenceGuide();
});
/**
 * GEM T2 Controller Optimizer - PDF Generator
 * Generates PDF reports for optimization results
 */
class PDFGenerator {
    generatePDF(results) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Title
        doc.setFontSize(20);
        doc.text('GEM T2 Controller Optimization Report', 20, 20);
        
        // Date
        doc.setFontSize(10);
        doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 30);
        
        // Vehicle Info
        doc.setFontSize(12);
        doc.text('Vehicle Configuration:', 20, 45);
        doc.setFontSize(10);
        doc.text(`Model: ${this.getModelName(results.inputData.vehicle?.model || 'Unknown')}`, 25, 55);
        doc.text(`Battery: ${results.inputData.battery?.voltage || '72'}V ${results.inputData.battery?.type || 'lead'} acid`, 25, 62);
        doc.text(`Tire Diameter: ${results.inputData.wheel?.tireDiameter || '22'}"`, 25, 69);
        doc.text(`Motor Condition: ${this.getMotorConditionText(results.inputData.vehicle?.motorCondition || 'unknown')}`, 25, 76);
        
        // Performance Changes
        if (results.performanceChanges.length > 0) {
            doc.setFontSize(12);
            doc.text('Expected Performance Changes:', 20, 90);
            doc.setFontSize(10);
            let yPos = 100;
            results.performanceChanges.forEach(change => {
                doc.text(`• ${change}`, 25, yPos);
                yPos += 7;
            });
        }
        
        // Settings Table
        doc.setFontSize(12);
        doc.text('Optimized Controller Settings:', 20, 130);
        
        const tableData = this.createSettingsTable(results);
        this.addTableToPDF(doc, tableData, 20, 140);
        
        // Footer
        doc.setFontSize(8);
        doc.text('Always save original settings before making changes', 20, 280);
        
        // Save the PDF
        doc.save('GEM-T2-Optimization-Report.pdf');
    }
    
    createSettingsTable(results) {
        const table = [];
        
        // Add header row
        table.push(['Function', 'Description', 'Factory', 'Optimized', 'Change']);
        
        // Add data rows
        Object.keys(results.optimizedSettings).forEach(funcNum => {
            const factoryVal = results.factorySettings[funcNum];
            const optimizedVal = results.optimizedSettings[funcNum];
            const description = this.getFunctionDescription(funcNum);
            
            if (factoryVal !== optimizedVal) {
                const change = optimizedVal > factoryVal ? '↑' : '↓';
                table.push([
                    `F${funcNum}`,
                    description,
                    factoryVal.toString(),
                    optimizedVal.toString(),
                    change
                ]);
            }
        });
        
        return table;
    }
    
    addTableToPDF(doc, table, x, y) {
        const colWidths = [20, 80, 25, 25, 20];
        let currentY = y;
        
        // Add header
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        table[0].forEach((header, i) => {
            let xPos = x;
            for (let j = 0; j < i; j++) {
                xPos += colWidths[j];
            }
            doc.text(header, xPos, currentY);
        });
        
        // Add separator line
        currentY += 2;
        doc.line(x, currentY, x + colWidths.reduce((a, b) => a + b, 0), currentY);
        currentY += 5;
        
        // Add data rows
        doc.setFont(undefined, 'normal');
        for (let i = 1; i < table.length; i++) {
            table[i].forEach((cell, j) => {
                let xPos = x;
                for (let k = 0; k < j; k++) {
                    xPos += colWidths[k];
                }
                doc.text(cell, xPos, currentY);
            });
            currentY += 6;
        }
    }
    
    getFunctionDescription(funcNum) {
        const descriptions = {
            1: "MPH Scaling",
            3: "Controlled Acceleration",
            4: "Max Armature Current",
            5: "Plug Current",
            6: "Armature Accel Rate",
            7: "Minimum Field Current",
            8: "Maximum Field Current",
            9: "Regen Armature Current",
            10: "Regen Max Field Current",
            11: "Turf Speed Limit",
            12: "Reverse Speed Limit",
            14: "IR Compensation",
            15: "Battery Volts",
            19: "Field Ramp Rate",
            20: "MPH Overspeed",
            22: "Odometer Calibration",
            23: "Error Compensation",
            24: "Field Weakening Start",
            26: "Ratio Field to Arm"
        };
        return descriptions[funcNum] || `Function ${funcNum}`;
    }
    
    getModelName(modelCode) {
        const models = {
            'e2': 'e2 (2-passenger)',
            'e4': 'e4 (4-passenger)',
            'eS': 'eS (Short Utility)',
            'eL': 'eL (Long Utility)',
            'e6': 'e6 (6-passenger)',
            'elXD': 'elXD (Extra Duty)'
        };
        return models[modelCode] || modelCode;
    }
    
    getMotorConditionText(condition) {
        const conditions = {
            'good': 'Good condition',
            'fair': 'Fair condition',
            'sparking': 'Sparking/needs service'
        };
        return conditions[condition] || condition;
    }
}

// Initialize the application
let optimizer, validation, presetsManager, pdfGenerator;
// Make uiController global so inline event handlers can access it
let uiController;

// Ensure window.uiController is available
window.uiController = null;

document.addEventListener('DOMContentLoaded', function() {
    try {
        // Initialize components
        optimizer = new GEMControllerOptimizer();
        validation = new ValidationSystem();
        presetsManager = new PresetsManager(optimizer);
        pdfGenerator = new PDFGenerator();
        uiController = new UIController(optimizer, validation, presetsManager, pdfGenerator);
        
        // Make uiController available globally for inline event handlers
        window.uiController = uiController;
        
        // Make handlePresetSelection available globally for preset card buttons
        window.handlePresetSelection = (presetName, isInteractive) => {
            uiController.handlePresetSelection(presetName, isInteractive);
        };
        
        // Make components available globally for debugging
        window.GEMOptimizer = {
            optimizer,
            validation,
            presetsManager,
            pdfGenerator,
            uiController
        };
        
        console.log('GEM T2 Controller Optimizer initialized successfully');
    } catch (error) {
        console.error('Error initializing GEM T2 Controller Optimizer:', error);
    }
});
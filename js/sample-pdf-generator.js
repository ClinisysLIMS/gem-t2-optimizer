/**
 * Sample PDF Generator
 * Creates downloadable PDFs with known GEM controller settings formats
 */
class SamplePDFGenerator {
    constructor() {
        this.sampleSettings = {
            // Popular settings for demonstration
            1: { value: 100, name: 'MPH Scaling', description: 'Controls top speed scaling' },
            3: { value: 15, name: 'Controlled Acceleration', description: 'Acceleration rate control' },
            4: { value: 245, name: 'Max Armature Current Limit', description: 'Maximum motor current' },
            5: { value: 5, name: 'Plug Current', description: 'Plug braking current' },
            6: { value: 60, name: 'Armature Acceleration Rate', description: 'Motor acceleration rate' },
            7: { value: 70, name: 'Minimum Field Current', description: 'Minimum field current' },
            8: { value: 245, name: 'Maximum Field Current', description: 'Maximum field current' },
            9: { value: 225, name: 'Regen Armature Current', description: 'Regenerative braking current' },
            10: { value: 100, name: 'Regen Maximum Field Current', description: 'Max field current during regen' },
            11: { value: 11, name: 'Turf Speed Limit', description: 'Speed limit in turf mode' },
            12: { value: 11, name: 'Reverse Speed Limit', description: 'Maximum reverse speed' },
            15: { value: 72, name: 'Battery Volts', description: 'Nominal battery voltage' },
            20: { value: 5, name: 'MPH Overspeed', description: 'Overspeed protection threshold' },
            24: { value: 55, name: 'Field Weakening Start', description: 'Field weakening start point' }
        };
        
        this.formats = {
            'sentry': 'GE Sentry Export Format',
            'table': 'Table Format',
            'simple': 'Simple List Format',
            'mixed': 'Mixed Format (Real-world)'
        };
    }
    
    /**
     * Generate a sample PDF with specified format
     */
    generateSamplePDF(format = 'sentry', customSettings = null) {
        const { jsPDF } = window.jspdf;
        if (!jsPDF) {
            throw new Error('jsPDF library not loaded');
        }
        
        const doc = new jsPDF();
        const settings = customSettings || this.sampleSettings;
        
        console.log(`Generating sample PDF in ${format} format with ${Object.keys(settings).length} settings`);
        
        // Add title and header
        this.addHeader(doc, format);
        
        // Add settings in specified format
        switch (format) {
            case 'sentry':
                this.addSentryFormat(doc, settings);
                break;
            case 'table':
                this.addTableFormat(doc, settings);
                break;
            case 'simple':
                this.addSimpleFormat(doc, settings);
                break;
            case 'mixed':
                this.addMixedFormat(doc, settings);
                break;
            default:
                this.addSentryFormat(doc, settings);
        }
        
        // Add footer with metadata
        this.addFooter(doc, format);
        
        // Generate filename
        const timestamp = new Date().toISOString().substring(0, 19).replace(/:/g, '-');
        const filename = `GEM_Sample_${format}_${timestamp}.pdf`;
        
        // Download the PDF
        doc.save(filename);
        
        console.log(`Sample PDF generated: ${filename}`);
        return filename;
    }
    
    /**
     * Add header to PDF
     */
    addHeader(doc, format) {
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('GEM T2 Controller Settings', 20, 20);
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text(`Format: ${this.formats[format] || 'Unknown'}`, 20, 30);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 38);
        doc.text('Sample data for testing PDF parser functionality', 20, 46);
        
        // Add a line separator
        doc.setLineWidth(0.5);
        doc.line(20, 52, 190, 52);
    }
    
    /**
     * Add Sentry export format
     */
    addSentryFormat(doc, settings) {
        let yPos = 65;
        
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Controller Function Settings', 20, yPos);
        yPos += 15;
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('F.No.  Function Description                    Counts  Value  Units', 20, yPos);
        yPos += 8;
        
        // Add line under header
        doc.setLineWidth(0.3);
        doc.line(20, yPos, 190, yPos);
        yPos += 10;
        
        Object.entries(settings).forEach(([funcNum, data]) => {
            const line = `F.No.${funcNum.padStart(2, '0')}  ${data.name.padEnd(35, ' ')}  ${data.value.toString().padStart(3, ' ')}    ${data.value.toString().padStart(3, ' ')}   ${this.getUnits(funcNum)}`;
            doc.text(line, 20, yPos);
            yPos += 8;
            
            // Add new page if needed
            if (yPos > 270) {
                doc.addPage();
                yPos = 20;
            }
        });
    }
    
    /**
     * Add table format
     */
    addTableFormat(doc, settings) {
        let yPos = 65;
        
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Function Settings Table', 20, yPos);
        yPos += 15;
        
        // Table header
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('Function', 25, yPos);
        doc.text('Name', 65, yPos);
        doc.text('Current', 130, yPos);
        doc.text('Optimized', 160, yPos);
        yPos += 8;
        
        doc.setLineWidth(0.3);
        doc.line(20, yPos, 190, yPos);
        yPos += 10;
        
        doc.setFont('helvetica', 'normal');
        Object.entries(settings).forEach(([funcNum, data]) => {
            doc.text(`F.${funcNum}`, 25, yPos);
            doc.text(data.name.length > 20 ? data.name.substring(0, 20) + '...' : data.name, 65, yPos);
            doc.text(data.value.toString(), 135, yPos);
            doc.text(data.value.toString(), 165, yPos);
            yPos += 8;
            
            if (yPos > 270) {
                doc.addPage();
                yPos = 20;
            }
        });
    }
    
    /**
     * Add simple format
     */
    addSimpleFormat(doc, settings) {
        let yPos = 65;
        
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Simple Function List', 20, yPos);
        yPos += 15;
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        
        Object.entries(settings).forEach(([funcNum, data]) => {
            // Various simple formats
            const formats = [
                `F.${funcNum} = ${data.value}`,
                `F.${funcNum}: ${data.value}`,
                `F.${funcNum} ${data.value}`,
                `F ${funcNum} - ${data.value}`
            ];
            
            const format = formats[parseInt(funcNum) % formats.length];
            doc.text(format, 30, yPos);
            doc.text(`// ${data.name}`, 100, yPos);
            yPos += 8;
            
            if (yPos > 270) {
                doc.addPage();
                yPos = 20;
            }
        });
    }
    
    /**
     * Add mixed format (real-world scenario)
     */
    addMixedFormat(doc, settings) {
        let yPos = 65;
        
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Mixed Format Export', 20, yPos);
        yPos += 15;
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('This simulates a real-world PDF with inconsistent formatting:', 20, yPos);
        yPos += 15;
        
        const entries = Object.entries(settings);
        entries.forEach(([funcNum, data], index) => {
            let line;
            const mod = index % 6;
            
            switch (mod) {
                case 0:
                    line = `F.No.${funcNum} ${data.name} Counts ${data.value} Value ${data.value}`;
                    break;
                case 1:
                    line = `F.${funcNum}: ${data.value} (${data.name})`;
                    break;
                case 2:
                    line = `Function ${funcNum} = ${data.value}`;
                    break;
                case 3:
                    line = `F ${funcNum}    ${data.value}    ${data.name}`;
                    break;
                case 4:
                    line = `${funcNum}     ${data.value}     ${data.name}`;
                    break;
                case 5:
                    line = `F.${funcNum}-${data.value} // ${data.name}`;
                    break;
            }
            
            doc.text(line, 25, yPos);
            yPos += 8;
            
            if (yPos > 270) {
                doc.addPage();
                yPos = 20;
            }
        });
    }
    
    /**
     * Add footer to PDF
     */
    addFooter(doc, format) {
        const pageCount = doc.internal.getNumberOfPages();
        
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.text(`Generated by GEM T2 Optimizer - ${format} format - Page ${i} of ${pageCount}`, 20, 285);
            doc.text('This is a sample PDF for testing PDF parser functionality', 20, 292);
        }
    }
    
    /**
     * Get units for function
     */
    getUnits(funcNum) {
        const units = {
            1: '%', 3: 'A/s', 4: 'A', 5: 'A', 6: 'A/s',
            7: 'A', 8: 'A', 9: 'A', 10: 'A', 11: 'MPH',
            12: 'MPH', 15: 'V', 20: 'MPH', 24: '%'
        };
        return units[funcNum] || '';
    }
    
    /**
     * Generate editable PDF with form fields
     */
    generateEditablePDF() {
        const { jsPDF } = window.jspdf;
        if (!jsPDF) {
            throw new Error('jsPDF library not loaded');
        }
        
        const doc = new jsPDF();
        
        // Title
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('GEM T2 Controller Settings - Editable Template', 20, 20);
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('Fill in your current controller settings below, save, and upload to test the parser:', 20, 35);
        doc.text('Use the format: F.X = VALUE where X is function number (1-128) and VALUE is 0-999', 20, 43);
        
        // Add a form-like layout
        let yPos = 60;
        const commonFunctions = [
            { num: 1, name: 'MPH Scaling', defaultVal: 100 },
            { num: 3, name: 'Controlled Acceleration', defaultVal: 15 },
            { num: 4, name: 'Max Armature Current', defaultVal: 245 },
            { num: 6, name: 'Armature Accel Rate', defaultVal: 60 },
            { num: 7, name: 'Minimum Field Current', defaultVal: 70 },
            { num: 9, name: 'Regen Armature Current', defaultVal: 225 },
            { num: 11, name: 'Turf Speed Limit', defaultVal: 11 },
            { num: 15, name: 'Battery Volts', defaultVal: 72 },
            { num: 20, name: 'MPH Overspeed', defaultVal: 5 },
            { num: 24, name: 'Field Weakening Start', defaultVal: 55 }
        ];
        
        doc.setFont('helvetica', 'bold');
        doc.text('Function', 25, yPos);
        doc.text('Description', 65, yPos);
        doc.text('Current Value', 130, yPos);
        doc.text('Your Value', 170, yPos);
        yPos += 10;
        
        doc.setLineWidth(0.3);
        doc.line(20, yPos, 190, yPos);
        yPos += 8;
        
        doc.setFont('helvetica', 'normal');
        commonFunctions.forEach(func => {
            doc.text(`F.${func.num}`, 25, yPos);
            doc.text(func.name, 65, yPos);
            doc.text(func.defaultVal.toString(), 135, yPos);
            
            // Draw a box for user input
            doc.rect(168, yPos - 4, 20, 6);
            doc.text('____', 170, yPos);
            
            yPos += 12;
        });
        
        // Add instructions
        yPos += 10;
        doc.setFontSize(9);
        doc.text('Instructions:', 20, yPos);
        yPos += 8;
        doc.text('1. Print this PDF or fill it digitally', 25, yPos);
        yPos += 6;
        doc.text('2. Enter your controller values in the "Your Value" column', 25, yPos);
        yPos += 6;
        doc.text('3. Save the PDF and upload it to test the parser', 25, yPos);
        yPos += 6;
        doc.text('4. The parser should extract your entered values', 25, yPos);
        
        // Add some sample formats at the bottom
        yPos += 15;
        doc.setFont('helvetica', 'bold');
        doc.text('Sample formats the parser can recognize:', 20, yPos);
        yPos += 8;
        doc.setFont('helvetica', 'normal');
        doc.text('F.1 = 100', 25, yPos);
        yPos += 6;
        doc.text('F.No.3: 15', 25, yPos);
        yPos += 6;
        doc.text('F.4-245', 25, yPos);
        yPos += 6;
        doc.text('Function 6 = 60', 25, yPos);
        
        const filename = `GEM_Editable_Template_${new Date().toISOString().substring(0, 10)}.pdf`;
        doc.save(filename);
        
        console.log(`Editable PDF template generated: ${filename}`);
        return filename;
    }
    
    /**
     * Create a PDF with custom settings from user input
     */
    generateCustomPDF(customSettings, format = 'sentry') {
        console.log('Generating custom PDF with user settings:', customSettings);
        return this.generateSamplePDF(format, customSettings);
    }
    
    /**
     * Get sample settings for testing
     */
    getSampleSettings() {
        return { ...this.sampleSettings };
    }
    
    /**
     * Generate multiple sample PDFs for testing
     */
    generateTestSuite() {
        const formats = ['sentry', 'table', 'simple', 'mixed'];
        const generatedFiles = [];
        
        formats.forEach(format => {
            try {
                const filename = this.generateSamplePDF(format);
                generatedFiles.push({ format, filename, success: true });
            } catch (error) {
                console.error(`Failed to generate ${format} format:`, error);
                generatedFiles.push({ format, filename: null, success: false, error: error.message });
            }
        });
        
        console.log('Test suite generation complete:', generatedFiles);
        return generatedFiles;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SamplePDFGenerator;
} else if (typeof window !== 'undefined') {
    window.SamplePDFGenerator = SamplePDFGenerator;
}
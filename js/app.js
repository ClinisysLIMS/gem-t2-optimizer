// js/app.js
/**
 * GEM T2 Controller Optimizer - Main Application
 * Initializes and coordinates all components
 */

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', function() {
    // Initialize components
    const optimizer = new GEMControllerOptimizer();
    const validation = new ValidationSystem();
    const presetsManager = new PresetsManager(optimizer);
    const pdfGenerator = new PDFGenerator();
    const uiController = new UIController(optimizer, validation, presetsManager, pdfGenerator);
    
    // Make components available globally for debugging
    window.GEMOptimizer = {
        optimizer,
        validation,
        presetsManager,
        pdfGenerator,
        uiController
    };
    
    // Add smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
    
    // Add keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // Ctrl/Cmd + S to export configuration
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            const exportBtn = document.getElementById('export-config-btn');
            if (exportBtn && !exportBtn.disabled) {
                exportBtn.click();
            }
        }
        
        // Ctrl/Cmd + P to download PDF
        if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
            e.preventDefault();
            const pdfBtn = document.getElementById('download-pdf-btn');
            if (pdfBtn && !pdfBtn.disabled) {
                pdfBtn.click();
            }
        }
    });
    
    // Add print styles dynamically
    const printStyles = document.createElement('style');
    printStyles.textContent = `
        @media print {
            header, footer, .no-print { display: none !important; }
            .container { max-width: 100% !important; }
            .shadow-lg { box-shadow: none !important; }
            .bg-gray-50 { background-color: white !important; }
        }
    `;
    document.head.appendChild(printStyles);
    
    // Handle browser back button
    window.addEventListener('popstate', function(e) {
        if (e.state && e.state.step) {
            uiController.showStep(e.state.step);
        }
    });
    
    // Log initialization
    console.log('GEM T2 Controller Optimizer initialized successfully');
});

// Helper function to show preset information
function showPresets() {
    const uiController = window.GEMOptimizer?.uiController;
    if (uiController) {
        uiController.showPresets();
    }
}

// Export for use in HTML onclick handlers
window.showPresets = showPresets;
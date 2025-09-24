// Simple Tooltip Setup - Only where truly helpful
// Follows guidelines: minimal, clear, non-critical information only

import { simpleTooltip } from './simple-tooltip.js';

class TooltipSetup {
  constructor() {
    this.tooltips = new Map();
  }

  init() {
    console.log('🎯 Setting up minimal tooltips...');
    
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.addTooltips());
    } else {
      this.addTooltips();
    }
  }

  addTooltips() {
    // Only add tooltips to elements that genuinely need clarification
    
    // 1. Risk percentage buttons - explain what they mean
    this.addRiskButtonTooltips();
    
    // 2. Max account buttons - explain concentration risk
    this.addMaxAccountButtonTooltips();
    
    // 3. 5R target - explain trim strategy
    this.add5RTargetTooltip();
    
    // 4. Import alert button - explain functionality
    this.addImportAlertTooltip();
    
    console.log('✅ Minimal tooltips added');
  }

  addRiskButtonTooltips() {
    const riskButtons = document.querySelectorAll('.risk-button');
    riskButtons.forEach((button, index) => {
      const riskValue = button.getAttribute('data-value');
      const tooltipText = this.getRiskTooltipText(riskValue);
      
      if (tooltipText) {
        simpleTooltip.addTooltip(button, tooltipText);
        this.tooltips.set(`risk-${index}`, button);
      }
    });
  }

  getRiskTooltipText(riskValue) {
    const risk = parseFloat(riskValue);
    if (risk <= 0.5) {
      return 'Conservative risk level';
    } else if (risk <= 1) {
      return 'Standard risk level';
    } else {
      return 'Higher risk level';
    }
  }

  addMaxAccountButtonTooltips() {
    const maxButtons = document.querySelectorAll('.max-account-button');
    maxButtons.forEach((button, index) => {
      const maxValue = button.getAttribute('data-value');
      const tooltipText = this.getMaxAccountTooltipText(maxValue);
      
      if (tooltipText) {
        simpleTooltip.addTooltip(button, tooltipText);
        this.tooltips.set(`max-${index}`, button);
      }
    });
  }

  getMaxAccountTooltipText(maxValue) {
    const max = parseFloat(maxValue);
    if (max <= 20) {
      return 'Very conservative position size';
    } else if (max <= 50) {
      return 'Moderate position size';
    } else {
      return 'Larger position size';
    }
  }

  add5RTargetTooltip() {
    const fiveRTarget = document.getElementById('fiveRTargetValue');
    if (fiveRTarget) {
      simpleTooltip.addTooltip(fiveRTarget, 'Consider selling 25% of position here');
      this.tooltips.set('5r-target', fiveRTarget);
    }
  }

  addImportAlertTooltip() {
    // Check for import alert button (may be created dynamically)
    const importBtn = document.getElementById('importAlertBtn');
    if (importBtn) {
      simpleTooltip.addTooltip(importBtn, 'Paste Discord trading alerts');
      this.tooltips.set('import-alert', importBtn);
    } else {
      // Try again later if button doesn't exist yet
      setTimeout(() => this.addImportAlertTooltip(), 100);
    }
  }

  // Method to remove all tooltips
  destroy() {
    this.tooltips.forEach((element) => {
      simpleTooltip.removeTooltip(element);
    });
    this.tooltips.clear();
  }
}

// Export singleton instance
export const tooltipSetup = new TooltipSetup();

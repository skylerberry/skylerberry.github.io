// Simple Tooltip System - Lightweight and accessible
// Follows best practices: minimal, helpful, non-intrusive

class SimpleTooltip {
  constructor() {
    this.tooltip = null;
    this.timeout = null;
    this.init();
  }

  init() {
    // Create tooltip element
    this.tooltip = document.createElement('div');
    this.tooltip.className = 'simple-tooltip';
    this.tooltip.setAttribute('role', 'tooltip');
    this.tooltip.setAttribute('aria-hidden', 'true');
    document.body.appendChild(this.tooltip);

    // Add global listeners
    document.addEventListener('mouseover', this.handleMouseOver.bind(this));
    document.addEventListener('mouseout', this.handleMouseOut.bind(this));
    document.addEventListener('keydown', this.handleKeydown.bind(this));
  }

  handleMouseOver(event) {
    const target = event.target;
    const tooltipText = target.getAttribute('data-tooltip');
    
    if (!tooltipText) return;

    // Clear existing timeout
    if (this.timeout) {
      clearTimeout(this.timeout);
    }

    // Show tooltip after short delay
    this.timeout = setTimeout(() => {
      this.showTooltip(target, tooltipText);
    }, 500); // 500ms delay to avoid accidental triggers
  }

  handleMouseOut(event) {
    const target = event.target;
    
    if (target.getAttribute('data-tooltip')) {
      if (this.timeout) {
        clearTimeout(this.timeout);
        this.timeout = null;
      }
      this.hideTooltip();
    }
  }

  handleKeydown(event) {
    // Hide tooltip on escape key
    if (event.key === 'Escape') {
      this.hideTooltip();
    }
  }

  showTooltip(element, text) {
    const rect = element.getBoundingClientRect();
    
    // Set tooltip content
    this.tooltip.textContent = text;
    this.tooltip.setAttribute('aria-hidden', 'false');
    
    // Position tooltip above element
    const tooltipRect = this.tooltip.getBoundingClientRect();
    let top = rect.top - tooltipRect.height - 8;
    let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
    
    // Ensure tooltip stays within viewport
    if (top < 8) {
      top = rect.bottom + 8; // Show below if no room above
    }
    if (left < 8) left = 8;
    if (left + tooltipRect.width > window.innerWidth - 8) {
      left = window.innerWidth - tooltipRect.width - 8;
    }
    
    this.tooltip.style.top = `${top}px`;
    this.tooltip.style.left = `${left}px`;
    this.tooltip.classList.add('visible');
  }

  hideTooltip() {
    this.tooltip.classList.remove('visible');
    this.tooltip.setAttribute('aria-hidden', 'true');
  }

  // Method to add tooltip to an element
  addTooltip(element, text) {
    element.setAttribute('data-tooltip', text);
  }

  // Method to remove tooltip from an element
  removeTooltip(element) {
    element.removeAttribute('data-tooltip');
  }
}

// Export singleton instance
export const simpleTooltip = new SimpleTooltip();

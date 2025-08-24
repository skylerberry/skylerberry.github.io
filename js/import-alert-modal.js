// Import Alert Modal Module
import { parseDiscordAlert } from './discord-alert-parser.js';

export function initImportAlert() {
  console.log('🚀 Initializing Import Alert feature');

  // Create the import button below the subtitle
  createImportButton();
  
  // Create toast container for notifications
  createToastContainer();
  
  // Modal will be created when needed
  let modalElement = null;
  let importTimeout = null;
  let hasAlreadyImported = false;

  function createImportButton() {
    const subtitle = document.querySelector('.calculator-subtitle');
    if (!subtitle) {
      console.error('Could not find calculator subtitle');
      return;
    }

  // Smart paste function - tries clipboard first, falls back to modal
  async function handleSmartPaste() {
    console.log('📋 Attempting smart paste...');
    
    try {
      // Check if clipboard API is available
      if (!navigator.clipboard || !navigator.clipboard.readText) {
        console.log('📝 Clipboard API not available, opening modal');
        openModal();
        return;
      }

      // Try to read clipboard
      const clipboardText = await navigator.clipboard.readText();
      
      if (!clipboardText || clipboardText.trim() === '') {
        console.log('📝 Clipboard empty, opening modal');
        showToast('Clipboard is empty - paste your alert in the modal');
        openModal();
        return;
      }

      console.log('📋 Found clipboard content, attempting to parse...');
      
      // Try to parse the clipboard content
      const parsed = parseDiscordAlert(clipboardText.trim());
      
      // If we get here, parsing succeeded!
      console.log('🚀 Smart paste successful!');
      populateCalculator(parsed);
      showToast('Alert pasted successfully! ⚡');
      
    } catch (error) {
      console.log('📝 Smart paste failed:', error.message);
      
      // Graceful fallback to modal
      if (error.message.includes('Clipboard')) {
        showToast('Unable to access clipboard - use the modal instead');
      } else {
        showToast('Invalid alert format - opening editor');
      }
      
      openModal();
      
      // If we have clipboard content, pre-populate the modal
      try {
        const clipboardText = await navigator.clipboard.readText();
        if (clipboardText && clipboardText.trim()) {
          setTimeout(() => {
            const textarea = modalElement?.querySelector('#alertTextarea');
            if (textarea) {
              textarea.value = clipboardText.trim();
              // Trigger validation
              textarea.dispatchEvent(new Event('input'));
            }
          }, 100);
        }
      } catch (e) {
        // Ignore clipboard errors for pre-population
      }
    }
  }

    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'import-alert-bar';
    buttonContainer.innerHTML = `
      <button type="button" class="import-alert-button" id="importAlertBtn">
        📋 Paste Alert
      </button>
    `;

    subtitle.insertAdjacentElement('afterend', buttonContainer);
    
    // Add click handler for smart paste
    const button = buttonContainer.querySelector('#importAlertBtn');
    button.addEventListener('click', handleSmartPaste);
    
    console.log('✅ Smart paste button created');
  }

  function createToastContainer() {
    let toastHost = document.getElementById('toastHost');
    if (!toastHost) {
      toastHost = document.createElement('div');
      toastHost.id = 'toastHost';
      document.body.appendChild(toastHost);
    }
  }

  // Smart paste function - tries clipboard first, falls back to modal
  async function handleSmartPaste() {
    console.log('📋 Attempting smart paste...');
    
    try {
      // Check if clipboard API is available
      if (!navigator.clipboard || !navigator.clipboard.readText) {
        console.log('📝 Clipboard API not available, opening modal');
        openModal();
        return;
      }

      // Try to read clipboard
      const clipboardText = await navigator.clipboard.readText();
      
      if (!clipboardText || clipboardText.trim() === '') {
        console.log('📝 Clipboard empty, opening modal');
        showToast('Clipboard is empty - paste your alert in the modal');
        openModal();
        return;
      }

      console.log('📋 Found clipboard content, attempting to parse...');
      
      // Try to parse the clipboard content
      const parsed = parseDiscordAlert(clipboardText.trim());
      
      // If we get here, parsing succeeded!
      console.log('🚀 Smart paste successful!');
      populateCalculator(parsed);
      showToast('Alert pasted successfully! ⚡');
      
    } catch (error) {
      console.log('📝 Smart paste failed:', error.message);
      
      // Graceful fallback to modal
      if (error.message.includes('Clipboard')) {
        showToast('Unable to access clipboard - use the modal instead');
      } else {
        showToast('Invalid alert format - opening editor');
      }
      
      openModal();
      
      // If we have clipboard content, pre-populate the modal
      try {
        const clipboardText = await navigator.clipboard.readText();
        if (clipboardText && clipboardText.trim()) {
          setTimeout(() => {
            const textarea = modalElement?.querySelector('#alertTextarea');
            if (textarea) {
              textarea.value = clipboardText.trim();
              // Trigger validation
              textarea.dispatchEvent(new Event('input'));
            }
          }, 100);
        }
      } catch (e) {
        // Ignore clipboard errors for pre-population
      }
    }
  }
    console.log('📝 Opening import modal');

    // Reset import state for new modal session
    hasAlreadyImported = false;
    clearTimeout(importTimeout);

    if (!modalElement) {
      createModal();
    }

    modalElement.style.display = 'flex';
    const textarea = modalElement.querySelector('#alertTextarea');
    textarea.focus();
    clearError();
    textarea.value = '';
    
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    if (modalElement) {
      modalElement.style.display = 'none';
      document.body.style.overflow = '';
      console.log('❌ Modal closed');
    }
  }

  function createModal() {
    modalElement = document.createElement('div');
    modalElement.className = 'modal-backdrop';
    modalElement.innerHTML = `
      <div class="modal-card">
        <div class="modal-header">
          <h3>Import Discord Alert</h3>
          <button type="button" class="modal-close">×</button>
        </div>
        <div class="modal-body">
          <textarea 
            id="alertTextarea" 
            class="modal-textarea" 
            placeholder="Paste your Discord alert here:

Adding $TSLA shares @ 243.10
Stop loss @ 237.90
Risking 1%
@everyone"
          ></textarea>
          <div id="alertError" class="error-text" style="display:none;"></div>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn-secondary" id="cancelImport">Cancel</button>
          <button type="button" class="btn-primary" id="manualImport" disabled>Import</button>
        </div>
      </div>
    `;

    document.body.appendChild(modalElement);

    // Add event listeners
    modalElement.addEventListener('click', (e) => {
      if (e.target === modalElement) closeModal();
    });

    modalElement.querySelector('.modal-close').addEventListener('click', closeModal);
    modalElement.querySelector('#cancelImport').addEventListener('click', closeModal);
    modalElement.querySelector('#manualImport').addEventListener('click', onManualImport);

    // Auto-import logic with smart detection to prevent premature imports
    const textarea = modalElement.querySelector('#alertTextarea');
    let isUserTyping = false;
    let lastInputTime = 0;

    const scheduleAutoImport = (text, delay = 500) => {
      if (hasAlreadyImported) return;
      
      clearTimeout(importTimeout);
      importTimeout = setTimeout(() => {
        if (!hasAlreadyImported && !isUserTyping) {
          tryAutoImport(text);
        }
      }, delay);
    };

    // Track typing state to prevent premature imports
    textarea.addEventListener('keydown', () => {
      isUserTyping = true;
      lastInputTime = Date.now();
    });

    textarea.addEventListener('keyup', () => {
      setTimeout(() => {
        const timeSinceLastInput = Date.now() - lastInputTime;
        if (timeSinceLastInput >= 1000) { // 1 second of no typing
          isUserTyping = false;
        }
      }, 1000);
    });

    // Fast auto-import on paste (user expects immediate action)
    textarea.addEventListener('paste', () => {
      isUserTyping = false; // Paste is intentional, not typing
      setTimeout(() => {
        const text = textarea.value.trim();
        if (text) {
          scheduleAutoImport(text, 300); // Quick but not instant
        }
      }, 50);
    });

    // Conservative auto-import on typing (wait for user to stop)
    textarea.addEventListener('input', () => {
      clearError();
      lastInputTime = Date.now();
      
      const text = textarea.value.trim();
      if (text && !isUserTyping) {
        // Only auto-import if user isn't actively typing
        scheduleAutoImport(text, 1500);
      } else if (text) {
        // Just validate without importing while typing
        try {
          parseDiscordAlert(text);
          clearError();
        } catch (error) {
          showError(error.message);
        }
      }
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modalElement && modalElement.style.display === 'flex') {
        closeModal();
      }
    });

    console.log('✅ Modal created');
  }

  function tryAutoImport(text) {
    try {
      const parsed = parseDiscordAlert(text);
      
      // If parsing succeeds, auto-import immediately
      console.log('🚀 Auto-importing valid alert...');
      hasAlreadyImported = true; // Prevent duplicate imports
      populateCalculator(parsed);
      closeModal();
      showToast('Alert imported successfully! ✓');
      
    } catch (error) {
      // Show error for invalid alerts
      showError(error.message);
    }
  }

  function populateCalculator(data) {
    console.log('📊 Populating calculator with:', data);

    // Get the input elements
    const entryPriceInput = document.getElementById('entryPrice');
    const stopLossInput = document.getElementById('stopLossPrice');
    const riskPercentageInput = document.getElementById('riskPercentage');

    if (!entryPriceInput || !stopLossInput) {
      throw new Error('Calculator input elements not found');
    }

    // Set the values
    entryPriceInput.value = data.entry.toFixed(2);
    stopLossInput.value = data.stop.toFixed(2);
    
    if (data.riskPct !== undefined && riskPercentageInput) {
      riskPercentageInput.value = data.riskPct;
    }

    // Trigger input events so the calculator recalculates
    const inputElements = [entryPriceInput, stopLossInput];
    if (data.riskPct !== undefined && riskPercentageInput) {
      inputElements.push(riskPercentageInput);
    }

    inputElements.forEach(element => {
      if (element) {
        // Trigger both input and change events
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
        element.dispatchEvent(new Event('blur', { bubbles: true }));
      }
    });

    // Force a recalculation by focusing and bluring the entry price
    setTimeout(() => {
      entryPriceInput.focus();
      entryPriceInput.blur();
    }, 100);

    console.log('✅ Calculator populated successfully');
  }

  function showError(message) {
    const textarea = modalElement.querySelector('#alertTextarea');
    const errorElement = modalElement.querySelector('#alertError');
    
    textarea.classList.add('error');
    errorElement.textContent = message;
    errorElement.style.display = 'block';
  }

  function clearError() {
    if (!modalElement) return;
    
    const textarea = modalElement.querySelector('#alertTextarea');
    const errorElement = modalElement.querySelector('#alertError');
    
    textarea.classList.remove('error');
    errorElement.textContent = '';
    errorElement.style.display = 'none';
  }

  function showToast(message) {
    const toastHost = document.getElementById('toastHost');
    if (!toastHost) {
      console.error('Toast container not found');
      return;
    }

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    
    toastHost.appendChild(toast);
    
    // Animate in
    requestAnimationFrame(() => {
      toast.classList.add('visible');
    });

    // Animate out and remove
    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => {
        if (toast.parentNode) {
          toast.remove();
        }
      }, 300);
    }, 2400);
  }

  console.log('✅ Import Alert module initialized');
}

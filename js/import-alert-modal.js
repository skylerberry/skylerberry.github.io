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

  function createImportButton() {
    const subtitle = document.querySelector('.calculator-subtitle');
    if (!subtitle) {
      console.error('Could not find calculator subtitle');
      return;
    }

    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'import-alert-bar';
    buttonContainer.innerHTML = `
      <button type="button" class="import-alert-button" id="importAlertBtn">
        📥 Import Alert
      </button>
    `;

    subtitle.insertAdjacentElement('afterend', buttonContainer);
    
    // Add click handler
    const button = buttonContainer.querySelector('#importAlertBtn');
    button.addEventListener('click', openModal);
    
    console.log('✅ Import alert button created');
  }

  function createToastContainer() {
    let toastHost = document.getElementById('toastHost');
    if (!toastHost) {
      toastHost = document.createElement('div');
      toastHost.id = 'toastHost';
      document.body.appendChild(toastHost);
    }
  }

  function openModal() {
    console.log('📝 Opening import modal');

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
          <button type="button" class="btn-primary" id="confirmImport">Import</button>
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
    modalElement.querySelector('#confirmImport').addEventListener('click', onConfirmImport);

    // Real-time validation on input
    const textarea = modalElement.querySelector('#alertTextarea');
    textarea.addEventListener('input', () => {
      clearError();
      const text = textarea.value.trim();
      if (text) {
        validateAlert(text);
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

  function validateAlert(text) {
    try {
      parseDiscordAlert(text);
      // If we get here, the alert is valid
      const textarea = modalElement.querySelector('#alertTextarea');
      textarea.classList.remove('error');
      return true;
    } catch (error) {
      showError(error.message);
      return false;
    }
  }

  function onConfirmImport() {
    const textarea = modalElement.querySelector('#alertTextarea');
    const alertText = textarea.value.trim();

    if (!alertText) {
      showError('Please paste a Discord alert first');
      return;
    }

    try {
      console.log('🔄 Processing alert import...');
      const parsed = parseDiscordAlert(alertText);
      
      populateCalculator(parsed);
      closeModal();
      showToast('Alert imported successfully! ✓');
      
    } catch (error) {
      console.error('❌ Import failed:', error);
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

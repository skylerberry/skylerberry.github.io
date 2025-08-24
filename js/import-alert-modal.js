// import-alert-modal.js
// Smart Paste + modal fallback for Discord alerts

import { parseDiscordAlert } from './discord-alert-parser.js';

export function initImportAlert() {
  console.log('🚀 Initializing Import Alert feature');

  // State (module-scoped within init)
  let modalElement = null;
  let importTimeout = null;
  let hasAlreadyImported = false;

  // Boot
  createImportButton();
  createToastContainer();

  // ----- UI: Button -----
  function createImportButton() {
    const subtitle = document.querySelector('.calculator-subtitle');
    if (!subtitle) {
      console.error('Could not find calculator subtitle');
      return;
    }
    const bar = document.createElement('div');
    bar.className = 'import-alert-bar';
    bar.innerHTML = `
      <button type="button" class="import-alert-button" id="importAlertBtn">📋 Paste Alert</button>
    `;
    subtitle.insertAdjacentElement('afterend', bar);
    bar.querySelector('#importAlertBtn').addEventListener('click', handleSmartPaste);
    console.log('✅ Smart paste button created');
  }

  function createToastContainer() {
    if (!document.getElementById('toastHost')) {
      const host = document.createElement('div');
      host.id = 'toastHost';
      document.body.appendChild(host);
    }
  }

  // ----- SMART PASTE -----
  async function handleSmartPaste() {
    console.log('📋 Attempting smart paste...');
    try {
      if (!navigator.clipboard?.readText) {
        console.log('📝 Clipboard API not available → opening modal');
        openModal();
        return;
      }
      const txt = (await navigator.clipboard.readText())?.trim();
      if (!txt) {
        showToast('Clipboard is empty — paste your alert in the modal');
        openModal();
        return;
      }
      const parsed = parseDiscordAlert(txt);
      populateCalculator(parsed);
      showToast('Alert pasted successfully! ⚡');
    } catch (err) {
      console.log('📝 Smart paste failed:', err?.message || err);
      showToast(
        String(err?.message || '').includes('Clipboard')
          ? 'Unable to access clipboard — use the modal instead'
          : 'Invalid alert format — opening editor'
      );
      openModal();

      // Best effort: prefill modal from clipboard (if available)
      try {
        const pre = (await navigator.clipboard.readText())?.trim();
        if (pre) {
          setTimeout(() => {
            const ta = modalElement?.querySelector('#alertTextarea');
            if (ta) {
              ta.value = pre;
              ta.dispatchEvent(new Event('input', { bubbles: true }));
            }
          }, 100);
        }
      } catch { /* ignore */ }
    }
  }

  // ----- MODAL LIFECYCLE -----
  function openModal() {
    console.log('📝 Opening import modal');
    hasAlreadyImported = false;
    clearTimeout(importTimeout);
    if (!modalElement) createModal();

    modalElement.style.display = 'flex';
    const ta = modalElement.querySelector('#alertTextarea');
    clearError();
    ta.value = '';
    ta.focus();
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    if (!modalElement) return;
    modalElement.style.display = 'none';
    document.body.style.overflow = '';
    console.log('❌ Modal closed');
  }

  // ----- BUILD MODAL -----
  function createModal() {
    modalElement = document.createElement('div');
    modalElement.className = 'modal-backdrop';
    modalElement.innerHTML = `
      <div class="modal-card">
        <div class="modal-header">
          <h3>Import Discord Alert</h3>
          <button type="button" class="modal-close" aria-label="Close">×</button>
        </div>
        <div class="modal-body">
          <textarea
            id="alertTextarea"
            class="modal-textarea"
            placeholder="Paste your Discord alert here:

Adding $TSLA shares @ 243.10
Stop loss @ 237.90
Risking 1%
@everyone"></textarea>
          <div id="alertError" class="error-text" style="display:none;"></div>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn-secondary" id="cancelImport">Cancel</button>
          <button type="button" class="btn-primary" id="manualImport" disabled>Import</button>
        </div>
      </div>
    `;
    document.body.appendChild(modalElement);

    // Backdrop/controls
    modalElement.addEventListener('click', (e) => { if (e.target === modalElement) closeModal(); });
    modalElement.querySelector('.modal-close').addEventListener('click', closeModal);
    modalElement.querySelector('#cancelImport').addEventListener('click', closeModal);
    modalElement.querySelector('#manualImport').addEventListener('click', onManualImport);

    // Textarea behaviors
    const textarea = modalElement.querySelector('#alertTextarea');
    const importBtn = modalElement.querySelector('#manualImport');

    let isUserTyping = false;
    let lastInputTime = 0;

    const scheduleAutoImport = (text, delay = 500) => {
      if (hasAlreadyImported) return;
      clearTimeout(importTimeout);
      importTimeout = setTimeout(() => {
        if (!hasAlreadyImported && !isUserTyping) tryAutoImport(text);
      }, delay);
    };

    const updateManualBtnState = () => {
      const text = textarea.value.trim();
      try {
        if (!text) throw new Error('empty');
        parseDiscordAlert(text);
        importBtn.disabled = false;
      } catch {
        importBtn.disabled = true;
      }
    };

    textarea.addEventListener('keydown', () => {
      isUserTyping = true;
      lastInputTime = Date.now();
    });

    textarea.addEventListener('keyup', () => {
      setTimeout(() => {
        if (Date.now() - lastInputTime >= 1000) isUserTyping = false;
      }, 1000);
    });

    textarea.addEventListener('paste', () => {
      isUserTyping = false;
      setTimeout(() => {
        const t = textarea.value.trim();
        if (t) scheduleAutoImport(t, 300);
        updateManualBtnState();
      }, 50);
    });

    textarea.addEventListener('input', () => {
      clearError();
      lastInputTime = Date.now();
      const t = textarea.value.trim();

      if (t && !isUserTyping) scheduleAutoImport(t, 1500);
      else if (t) {
        try { parseDiscordAlert(t); clearError(); }
        catch (e) { showError(e.message); }
      }
      updateManualBtnState();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modalElement?.style.display === 'flex') closeModal();
    });

    console.log('✅ Modal created');
  }

  // ----- IMPORT HELPERS -----
  function onManualImport() {
    const ta = modalElement?.querySelector('#alertTextarea');
    const text = (ta?.value || '').trim();
    if (!text) return;
    tryAutoImport(text);
  }

  function tryAutoImport(text) {
    try {
      const parsed = parseDiscordAlert(text);
      hasAlreadyImported = true;
      populateCalculator(parsed);
      closeModal();
      showToast('Alert imported successfully! ✓');
    } catch (e) {
      showError(e.message);
    }
  }

  function populateCalculator(data) {
    console.log('📊 Populating calculator with:', data);
    const entryEl = document.getElementById('entryPrice');
    const stopEl  = document.getElementById('stopLossPrice');
    const riskEl  = document.getElementById('riskPercentage');

    if (!entryEl || !stopEl) throw new Error('Calculator input elements not found');

    entryEl.value = Number(data.entry).toFixed(2);
    stopEl.value  = Number(data.stop).toFixed(2);
    if (data.riskPct !== undefined && riskEl) riskEl.value = data.riskPct;

    const fire = (el) => {
      if (!el) return;
      el.dispatchEvent(new Event('input',  { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.dispatchEvent(new Event('blur',   { bubbles: true }));
    };
    fire(entryEl); fire(stopEl); if (data.riskPct !== undefined) fire(riskEl);

    setTimeout(() => { entryEl.focus(); entryEl.blur(); }, 100);
    console.log('✅ Calculator populated successfully');
  }

  // ----- UI FEEDBACK -----
  function showError(message) {
    if (!modalElement) return;
    const ta = modalElement.querySelector('#alertTextarea');
    const err = modalElement.querySelector('#alertError');
    ta.classList.add('error');
    err.textContent = message;
    err.style.display = 'block';
  }

  function clearError() {
    if (!modalElement) return;
    const ta = modalElement.querySelector('#alertTextarea');
    const err = modalElement.querySelector('#alertError');
    ta.classList.remove('error');
    err.textContent = '';
    err.style.display = 'none';
  }

  function showToast(message) {
    let host = document.getElementById('toastHost');
    if (!host) { createToastContainer(); host = document.getElementById('toastHost'); }
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    host.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('visible'));
    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => toast.remove(), 300);
    }, 2400);
  }

  console.log('✅ Import Alert module initialized');
} 

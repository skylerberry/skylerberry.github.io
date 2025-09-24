// Smart Paste + modal fallback for Discord alerts
import { parseDiscordAlert } from './discord-alert-parser.js';

export function initImportAlert() {
  // module state
  let modalEl = null;

  // mount button and toast host
  createImportButton();
  ensureToastHost();

  // ---------- UI: button ----------
  function createImportButton() {
    const subtitle = document.querySelector('.calculator-subtitle');
    if (!subtitle) return console.error('Subtitle not found for Import button');
    const bar = document.createElement('div');
    bar.className = 'import-alert-bar';
    bar.innerHTML = `<button type="button" class="import-alert-button" id="importAlertBtn">📋 Paste Alert</button>`;
    subtitle.insertAdjacentElement('afterend', bar);
    bar.querySelector('#importAlertBtn').addEventListener('click', onSmartPaste);
  }

  // ---------- SMART PASTE ----------
  async function onSmartPaste() {
    try {
      if (!navigator.clipboard?.readText) {
        showToast('Clipboard not available — opening paste box');
        openModal();
        return;
      }
      const txt = (await navigator.clipboard.readText())?.trim();
      if (!txt) {
        showToast('Clipboard is empty — paste your alert in the box');
        openModal();
        return;
      }
      const parsed = parseDiscordAlert(txt);
      applyToCalculator(parsed);
      showToast('Alert pasted! ⚡');
      // let logbook auto-snapshot if enabled
      window.dispatchEvent(new CustomEvent('alertImported'));
    } catch (err) {
      showToast('Couldn’t parse alert — opening editor');
      openModal();
      // best-effort prefill
      try {
        const txt = (await navigator.clipboard.readText())?.trim();
        if (txt && modalEl) {
          const ta = modalEl.querySelector('#alertTextarea');
          ta.value = txt;
          ta.dispatchEvent(new Event('input', { bubbles: true }));
        }
      } catch { /* ignore */ }
    }
  }

  // ---------- MODAL ----------
  function openModal() {
    if (!modalEl) buildModal();
    modalEl.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    const ta = modalEl.querySelector('#alertTextarea');
    clearError();
    ta.value = '';
    ta.focus();
  }

  function closeModal() {
    if (!modalEl) return;
    modalEl.style.display = 'none';
    document.body.style.overflow = '';
  }

  function buildModal() {
    modalEl = document.createElement('div');
    modalEl.className = 'modal-backdrop';
    // keep template simple to avoid backtick accidents
    modalEl.innerHTML =
      '<div class="modal-card">' +
        '<div class="modal-header">' +
          '<h3>Import Discord Alert</h3>' +
          '<button type="button" class="modal-close" aria-label="Close">×</button>' +
        '</div>' +
        '<div class="modal-body">' +
          '<textarea id="alertTextarea" class="modal-textarea" placeholder="Adding $TSLA shares @ 243.10\nStop loss @ 237.90\nRisking 1%\n@everyone"></textarea>' +
          '<div id="alertError" class="error-text" style="display:none;"></div>' +
        '</div>' +
        '<div class="modal-actions">' +
          '<button type="button" class="btn-secondary" id="cancelImport">Cancel</button>' +
          '<button type="button" class="btn-primary" id="manualImport" disabled>Import</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(modalEl);

    // wire controls
    modalEl.addEventListener('click', (e) => { if (e.target === modalEl) closeModal(); });
    modalEl.querySelector('.modal-close').addEventListener('click', closeModal);
    modalEl.querySelector('#cancelImport').addEventListener('click', closeModal);
    modalEl.querySelector('#manualImport').addEventListener('click', onManualImport);

    // textarea behavior (validate -> enable Import)
    const ta = modalEl.querySelector('#alertTextarea');
    const importBtn = modalEl.querySelector('#manualImport');

    ta.addEventListener('input', () => {
      const text = ta.value.trim();
      if (!text) {
        importBtn.disabled = true;
        clearError();
        return;
      }
      try {
        parseDiscordAlert(text);
        clearError();
        importBtn.disabled = false;
      } catch (e) {
        showError(e.message);
        importBtn.disabled = true;
      }
    });

    // ESC to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modalEl?.style.display === 'flex') closeModal();
    });
  }

  function onManualImport() {
    const ta = modalEl.querySelector('#alertTextarea');
    const text = ta.value.trim();
    if (!text) return;
    try {
      const parsed = parseDiscordAlert(text);
      applyToCalculator(parsed);
      showToast('Alert imported ✓');
      window.dispatchEvent(new CustomEvent('alertImported'));
      closeModal();
    } catch (e) {
      showError(e.message);
    }
  }

  // ---------- APPLY TO CALCULATOR ----------
  function applyToCalculator(data) {
    const tickerEl = document.getElementById('tickerSymbol');
    const entryEl = document.getElementById('entryPrice');
    const stopEl  = document.getElementById('stopLossPrice');
    const riskEl  = document.getElementById('riskPercentage');
    if (!entryEl || !stopEl) throw new Error('Calculator inputs not found');

    if (data.ticker && tickerEl) tickerEl.value = data.ticker;
    entryEl.value = Number(data.entry).toFixed(2);
    stopEl.value  = Number(data.stop).toFixed(2);
    if (data.riskPct !== undefined && riskEl) riskEl.value = data.riskPct;

    [tickerEl, entryEl, stopEl, riskEl].forEach((el) => {
      if (!el) return;
      el.dispatchEvent(new Event('input',  { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
    // nudge
    setTimeout(() => { entryEl.focus(); entryEl.blur(); }, 60);
  }

  // ---------- FEEDBACK HELPERS ----------
  function ensureToastHost() {
    if (!document.getElementById('toastHost')) {
      const host = document.createElement('div');
      host.id = 'toastHost';
      document.body.appendChild(host);
    }
  }

  function showToast(message) {
    let host = document.getElementById('toastHost');
    if (!host) { ensureToastHost(); host = document.getElementById('toastHost'); }
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = message;
    host.appendChild(el);
    requestAnimationFrame(() => el.classList.add('visible'));
    setTimeout(() => {
      el.classList.remove('visible');
      setTimeout(() => el.remove(), 250);
    }, 2400);
  }

  function showError(msg) {
    if (!modalEl) return;
    const ta  = modalEl.querySelector('#alertTextarea');
    const err = modalEl.querySelector('#alertError');
    ta.classList.add('error');
    err.textContent = msg || 'Invalid alert';
    err.style.display = 'block';
  }

  function clearError() {
    if (!modalEl) return;
    const ta  = modalEl.querySelector('#alertTextarea');
    const err = modalEl.querySelector('#alertError');
    ta.classList.remove('error');
    err.textContent = '';
    err.style.display = 'none';
  }
}

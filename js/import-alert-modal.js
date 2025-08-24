// js/import-alert-modal.js
import { parseDiscordAlert } from './discord-alert-parser.js';

export function initImportAlert() {
  const subtitle = document.querySelector('.calculator-subtitle');
  const btnBar = document.createElement('div');
  btnBar.className = 'import-alert-bar';
  btnBar.innerHTML = `
    <button type="button" class="import-alert-button" id="importAlertBtn">📥 Import Alert</button>
  `;
  subtitle?.insertAdjacentElement('afterend', btnBar);

  // Toast container
  let toastHost = document.getElementById('toastHost');
  if (!toastHost) {
    toastHost = document.createElement('div');
    toastHost.id = 'toastHost';
    document.body.appendChild(toastHost);
  }

  let modalBackdrop = null;
  const openModal = () => {
    if (!modalBackdrop) {
      modalBackdrop = document.createElement('div');
      modalBackdrop.className = 'modal-backdrop';
      modalBackdrop.innerHTML = `
        <div class="modal-card">
          <div class="modal-header">
            <h3>Import Discord Alert</h3>
            <button type="button" class="modal-close">×</button>
          </div>
          <div class="modal-body">
            <textarea id="alertTextarea" class="modal-textarea" placeholder="Adding $TSLA shares @ 243.10
Stop loss @ 237.90
Risking 1%
@everyone"></textarea>
            <div id="alertError" class="error-text" style="display:none;"></div>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn-secondary" id="cancelImport">Cancel</button>
            <button type="button" class="btn-primary" id="confirmImport">Import</button>
          </div>
        </div>
      `;
      document.body.appendChild(modalBackdrop);

      modalBackdrop.addEventListener('click', (e) => { if (e.target === modalBackdrop) closeModal(); });
      modalBackdrop.querySelector('.modal-close').addEventListener('click', closeModal);
      modalBackdrop.querySelector('#cancelImport').addEventListener('click', closeModal);
      modalBackdrop.querySelector('#confirmImport').addEventListener('click', onConfirm);
      document.addEventListener('keydown', (e) => { if (modalBackdrop && e.key === 'Escape') closeModal(); });
    }
    modalBackdrop.style.display = 'flex';
    modalBackdrop.querySelector('#alertTextarea').focus();
  };

  const closeModal = () => { if (modalBackdrop) modalBackdrop.style.display = 'none'; };

  const onConfirm = () => {
    const ta = modalBackdrop.querySelector('#alertTextarea');
    const err = modalBackdrop.querySelector('#alertError');
    try {
      const parsed = parseDiscordAlert(ta.value);
      const entryEl = document.getElementById('entryPrice');
      const stopEl  = document.getElementById('stopLossPrice');
      const riskEl  = document.getElementById('riskPercentage');

      entryEl.value = parsed.entry;
      stopEl.value  = parsed.stop;
      if (parsed.riskPct != null && riskEl) riskEl.value = parsed.riskPct;

      // Dispatch events so calculator recalcs
      [entryEl, stopEl, riskEl].forEach(el => {
        if (el) {
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });

      closeModal();
      showToast('Alert imported ✓');
    } catch (e) {
      ta.classList.add('error');
      err.textContent = e.message;
      err.style.display = 'block';
    }
  };

  const showToast = (msg) => {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = msg;
    toastHost.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('visible'));
    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => toast.remove(), 300);
    }, 2400);
  };

  btnBar.querySelector('#importAlertBtn').addEventListener('click', openModal);
}

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

    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'import-alert-bar';
    buttonContainer.innerHTML = `
      <button type="button" class="import-alert-button" id="importAlertBtn">
        📋 Paste Alert
      </button>
    `;

    subtitle.insertAdjacentElement('afterend', buttonContainer);

    // Click handler -> Smart Paste with graceful fallback to modal
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

  // ---------- SMART PASTE ----------
  async function handleSmartPaste() {
    console.log('📋 Attempting smart paste...');

    try {
      if (!navigator.clipboard || !

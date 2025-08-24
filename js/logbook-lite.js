// LogbookLite - Lightweight client-side trade logging with CSV/TSV export
// Reads from AppState snapshots, no DOM scraping required

const LS_KEY = 'logbook_rows_v1';

function loadRows() {
  try { 
    return JSON.parse(localStorage.getItem(LS_KEY)) ?? []; 
  } catch { 
    return []; 
  }
}

function saveRows(rows) { 
  localStorage.setItem(LS_KEY, JSON.stringify(rows)); 
}

function toCSV(rows) {
  if (!rows.length) return '';
  const cols = Object.keys(rows[0]);
  const escape = (s) => /[",\n]/.test(s) ? `"${String(s).replace(/"/g, '""')}"` : s;
  const header = cols.join(',');
  const lines = rows.map(r => cols.map(k => escape(r[k] ?? '')).join(','));
  return [header, ...lines].join('\n');
}

function toTSV(rows) {
  if (!rows.length) return '';
  const cols = Object.keys(rows[0]);
  const header = cols.join('\t');
  const lines = rows.map(r => cols.map(k => r[k] ?? '').join('\t'));
  return [header, ...lines].join('\n');
}

function download(filename, text) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function toast(msg) {
  let host = document.getElementById('toastHost');
  if (!host) {
    host = document.createElement('div');
    host.id = 'toastHost';
    document.body.appendChild(host);
  }
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  host.appendChild(el);
  requestAnimationFrame(() => el.classList.add('visible'));
  setTimeout(() => {
    el.classList.remove('visible');
    setTimeout(() => el.remove(), 250);
  }, 2000);
}

function flattenSnapshot(snap) {
  // Flatten calculation snapshot into a CSV-friendly row
  const { inputs = {}, results = {} } = snap || {};
  
  return {
    timestamp: snap?.timestamp ?? new Date().toISOString(),
    ticker: '', // Users can fill this later in their external system
    entry: inputs.entryPrice ?? null,
    stop: inputs.stopLossPrice ?? null,
    risk_pct: inputs.riskPercentage ?? null,
    account_size: inputs.accountSize ?? null,
    max_account_pct: inputs.maxAccountPercentage ?? null,
    target: inputs.targetPrice ?? null,
    shares: results.shares ?? null,
    position_size: results.positionSize ?? null,
    risk_dollars: results.riskDollars ?? null,
    stop_distance_pct: results.stopDistancePct ?? null,
    r_multiple: results.rMultiple ?? null,
    target_5R: results.fiveRTarget ?? null,
    roi_pct: results.roiPct ?? null,
    percent_of_account: results.percentOfAccount ?? null,
    profit_per_share: results.profitPerShare ?? null,
    total_profit: results.totalProfit ?? null,
    risk_reward: results.riskReward ?? null,
    notes: '' // Free text field for later use
  };
}

export function initLogbookLite(appState, { autoSnapshotOnImport = true } = {}) {
  console.log('📋 Initializing LogbookLite...');

  // Find where to attach the logbook UI
  const anchor = 
    document.querySelector('.results-section') ||
    document.querySelector('.calculator-output') ||
    document.querySelector('.calculator-section');

  if (!anchor) {
    console.error('❌ Could not find anchor point for logbook');
    return;
  }

  // Create logbook UI
  const logbookBar = document.createElement('div');
  logbookBar.className = 'logbook-bar';
  logbookBar.innerHTML = `
    <div class="log-left">
      <button class="logbook-btn primary" id="saveSnapshotBtn">🧾 Save Snapshot</button>
      <span id="logCount" class="log-count">0 snapshots</span>
    </div>
    <div class="log-actions">
      <button class="logbook-btn" id="copyLast" title="Copy last row as TSV (great for Notion)">Copy Last</button>
      <button class="logbook-btn" id="copyAllCSV" title="Copy all rows as CSV">Copy All</button>
      <button class="logbook-btn" id="downloadCSV" title="Download as CSV file">Download</button>
      <button class="logbook-btn danger" id="clearLog" title="Clear all snapshots">Clear</button>
    </div>
  `;

  anchor.insertAdjacentElement('afterend', logbookBar);

  // Load existing snapshots
  let rows = loadRows();
  const countEl = logbookBar.querySelector('#logCount');
  
  const updateCount = () => { 
    const count = rows.length;
    countEl.textContent = `${count} snapshot${count === 1 ? '' : 's'}`;
  };
  
  updateCount();

  // Keep reference to latest calculation
  let latestSnapshot = appState?.latestCalc ?? null;
  
  // Listen for new calculations
  if (appState?.on) {
    appState.on('calc:recomputed', (snapshot) => {
      latestSnapshot = snapshot;
      console.log('📊 New calculation snapshot received');
    });
  }

  // Manual snapshot button
  logbookBar.querySelector('#saveSnapshotBtn').addEventListener('click', () => {
    if (!latestSnapshot) {
      toast('⚠️ No calculation to save yet');
      return;
    }

    const flatRow = flattenSnapshot(latestSnapshot);
    rows.push(flatRow);
    saveRows(rows);
    updateCount();
    toast('📋 Snapshot saved!');
    
    console.log('💾 Manual snapshot saved:', flatRow);
  });

  // Copy last row as TSV (perfect for pasting into Notion tables)
  logbookBar.querySelector('#copyLast').addEventListener('click', async () => {
    if (!rows.length) {
      toast('⚠️ No snapshots yet');
      return;
    }

    try {
      const tsv = toTSV([rows[rows.length - 1]]);
      await navigator.clipboard?.writeText(tsv);
      toast('📋 Last snapshot copied (TSV)');
    } catch (error) {
      toast('❌ Failed to copy to clipboard');
    }
  });

  // Copy all as CSV
  logbookBar.querySelector('#copyAllCSV').addEventListener('click', async () => {
    if (!rows.length) {
      toast('⚠️ No snapshots yet');
      return;
    }

    try {
      const csv = toCSV(rows);
      await navigator.clipboard?.writeText(csv);
      toast(`📋 ${rows.length} snapshots copied (CSV)`);
    } catch (error) {
      toast('❌ Failed to copy to clipboard');
    }
  });

  // Download CSV file
  logbookBar.querySelector('#downloadCSV').addEventListener('click', () => {
    if (!rows.length) {
      toast('⚠️ No snapshots yet');
      return;
    }

    const csv = toCSV(rows);
    const date = new Date().toISOString().slice(0, 10);
    download(`trade_log_${date}.csv`, csv);
    toast(`📥 Downloaded ${rows.length} snapshots`);
  });

  // Clear all snapshots
  logbookBar.querySelector('#clearLog').addEventListener('click', () => {
    if (!rows.length) {
      toast('⚠️ No snapshots to clear');
      return;
    }

    const count = rows.length;
    rows = [];
    saveRows(rows);
    updateCount();
    toast(`🗑️ Cleared ${count} snapshots`);
  });

  // Optional: Auto-snapshot after successful alert import
  if (autoSnapshotOnImport) {
    window.addEventListener('alertImported', () => {
      // Small delay to ensure calculator has recomputed
      setTimeout(() => {
        if (!latestSnapshot) {
          console.log('⚠️ No snapshot available for auto-save');
          return;
        }

        const flatRow = flattenSnapshot(latestSnapshot);
        rows.push(flatRow);
        saveRows(rows);
        updateCount();
        toast('📋 Snapshot saved (auto)');
        
        console.log('🤖 Auto-snapshot saved after import:', flatRow);
      }, 150);
    });
  }

  console.log('✅ LogbookLite initialized with', rows.length, 'existing snapshots');
}

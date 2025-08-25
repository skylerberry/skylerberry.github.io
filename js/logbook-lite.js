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
    ticker: inputs.tickerSymbol ?? '', // Now populated from calculator input
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
    notes: snap?.notes ?? '' // Free text field for trade notes
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
      <button class="logbook-btn" id="cancelPendingBtn" style="display: none;">❌ Cancel Pending</button>
      <span id="logCount" class="log-count">0 snapshots</span>
    </div>
    <div class="log-actions">
      <button class="logbook-btn" id="viewSnapshots" title="View and manage snapshots">📋 View Snapshots</button>
      <button class="logbook-btn" id="copyLast" title="Copy last row as TSV (great for Notion)">Copy Last</button>
      <button class="logbook-btn" id="copyAllCSV" title="Copy all rows as CSV">Copy All</button>
      <button class="logbook-btn" id="downloadCSV" title="Download as CSV file">Download</button>
      <button class="logbook-btn" id="exportPDF" title="Export professional PDF report">📄 PDF</button>
      <button class="logbook-btn danger" id="clearLog" title="Delete all snapshots">🗑️ Delete All</button>
    </div>
  `;

  anchor.insertAdjacentElement('afterend', logbookBar);

  // Add notes section
  const notesSection = document.createElement('div');
  notesSection.className = 'notes-section';
  notesSection.innerHTML = `
    <div class="notes-header">
      <label for="tradeNotes" class="notes-label">📝 Trade Notes (optional)</label>
      <span class="notes-hint">Add your trade rationale, setup analysis, or any observations</span>
    </div>
    <textarea id="tradeNotes" class="notes-textarea" placeholder="Enter your trade notes here... (e.g., Setup: Qullamaggie-style breakout - 4H bull flag, strong volume, key resistance at $150. Plan: Scale in 50% at entry, 50% on pullback to $145)"></textarea>
  `;
  
  logbookBar.insertAdjacentElement('afterend', notesSection);

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
  let pendingSnapshot = null; // For imported alerts that need review
  
  // Listen for new calculations
  if (appState?.on) {
    appState.on('calc:recomputed', (snapshot) => {
      latestSnapshot = snapshot;
      console.log('📊 New calculation snapshot received');
    });
  }

  // Manual snapshot button
  logbookBar.querySelector('#saveSnapshotBtn').addEventListener('click', () => {
    if (!latestSnapshot && !pendingSnapshot) {
      toast('⚠️ No calculation to save yet');
      return;
    }

    // Use pending snapshot if available (from imported alert), otherwise use latest
    const snapshotToSave = pendingSnapshot || latestSnapshot;

    // Get notes from textarea
    const notesTextarea = document.getElementById('tradeNotes');
    const notes = notesTextarea ? notesTextarea.value.trim() : '';
    
    // Add notes to snapshot
    const snapshotWithNotes = {
      ...snapshotToSave,
      notes: notes
    };

    const flatRow = flattenSnapshot(snapshotWithNotes);
    rows.push(flatRow);
    saveRows(rows);
    updateCount();
    
    // Clear notes and pending snapshot after saving
    if (notesTextarea) {
      notesTextarea.value = '';
    }
    pendingSnapshot = null;
    
    // Update button text back to normal
    const saveBtn = logbookBar.querySelector('#saveSnapshotBtn');
    saveBtn.textContent = '🧾 Save Snapshot';
    logbookBar.querySelector('#cancelPendingBtn').style.display = 'none'; // Hide cancel button
    
    // Show different feedback based on whether notes were added
    if (notes && notes.trim()) {
      toast('📋 Snapshot saved with notes!');
    } else {
      toast('📋 Snapshot saved!');
    }
    
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

  // Export PDF report
  logbookBar.querySelector('#exportPDF').addEventListener('click', () => {
    if (!rows.length) {
      toast('⚠️ No snapshots yet');
      return;
    }

    generatePDFReport(rows);
  });

  // View and manage snapshots
  logbookBar.querySelector('#viewSnapshots').addEventListener('click', () => {
    if (!rows.length) {
      toast('⚠️ No snapshots to view');
      return;
    }
    showSnapshotsModal(rows, (newRows) => {
      rows = newRows;
      saveRows(rows);
      updateCount();
    });
  });

  // Clear all snapshots
  logbookBar.querySelector('#clearLog').addEventListener('click', () => {
    if (!rows.length) {
      toast('⚠️ No snapshots to delete');
      return;
    }

    // Show confirmation dialog
    const count = rows.length;
    const confirmed = confirm(`Are you sure you want to delete all ${count} snapshots?\n\nThis action cannot be undone.`);
    
    if (confirmed) {
      rows = [];
      saveRows(rows);
      updateCount();
      toast(`🗑️ Deleted ${count} snapshots`);
      console.log(`🗑️ Deleted ${count} snapshots`);
    } else {
      console.log('🗑️ Delete cancelled by user');
    }
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

        // Create a pending snapshot instead of auto-saving
        pendingSnapshot = latestSnapshot;
        
        // Update the save button to indicate there's a pending snapshot
        const saveBtn = logbookBar.querySelector('#saveSnapshotBtn');
        saveBtn.textContent = '📋 Save Imported Trade';
        logbookBar.querySelector('#cancelPendingBtn').style.display = 'block'; // Show cancel button
        
        // Pre-fill notes with a template for imported trades
        const notesTextarea = document.getElementById('tradeNotes');
        if (notesTextarea && !notesTextarea.value.trim()) {
          const ticker = latestSnapshot.inputs.tickerSymbol || 'TICKER';
          notesTextarea.value = `Imported Alert: ${ticker}\nSetup: [Add your analysis here]\nPlan: [Add your trade plan here]`;
          notesTextarea.focus();
        }
        
        toast('📋 Imported trade ready to save! Add your notes and click "Save Imported Trade"');
        
        console.log('📋 Pending snapshot created from imported alert:', latestSnapshot);
      }, 150);
    });
  }

  // Cancel pending snapshot button
  logbookBar.querySelector('#cancelPendingBtn').addEventListener('click', () => {
    pendingSnapshot = null;
    const saveBtn = logbookBar.querySelector('#saveSnapshotBtn');
    saveBtn.textContent = '🧾 Save Snapshot';
    logbookBar.querySelector('#cancelPendingBtn').style.display = 'none'; // Hide cancel button
    
    // Clear notes
    const notesTextarea = document.getElementById('tradeNotes');
    if (notesTextarea) {
      notesTextarea.value = '';
    }
    
    toast('📋 Pending snapshot cancelled.');
    console.log('📋 Pending snapshot cancelled.');
  });

  console.log('✅ LogbookLite initialized with', rows.length, 'existing snapshots');
}

// PDF Report Generation
function generatePDFReport(rows) {
  console.log('📄 Starting PDF generation...');
  
  // Check if jsPDF is available
  if (typeof window.jsPDF === 'undefined' && typeof window.jspdf === 'undefined') {
    console.log('📄 Loading jsPDF library...');
    
    // Check if we're already loading to prevent infinite loops
    if (window._loadingPDF) {
      console.log('📄 PDF library already loading...');
      return;
    }
    
    window._loadingPDF = true;
    
    // Load jsPDF dynamically
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    script.onload = () => {
      console.log('📄 jsPDF loaded successfully');
      window._loadingPDF = false;
      // Wait a moment for the library to initialize
      setTimeout(() => {
        generatePDFReport(rows);
      }, 100);
    };
    script.onerror = () => {
      console.error('❌ Failed to load jsPDF');
      window._loadingPDF = false;
      toast('❌ Failed to load PDF library. Falling back to CSV export.');
      // Fallback to CSV export
      const csv = toCSV(rows);
      const date = new Date().toISOString().slice(0, 10);
      download(`trade_journal_${date}.csv`, csv);
    };
    document.head.appendChild(script);
    toast('📄 Loading PDF library...');
    return;
  }

  try {
    // Try different ways to access jsPDF
    let jsPDF;
    if (window.jsPDF && window.jsPDF.jsPDF) {
      jsPDF = window.jsPDF.jsPDF;
    } else if (window.jspdf && window.jspdf.jsPDF) {
      jsPDF = window.jspdf.jsPDF;
    } else {
      throw new Error('jsPDF not found after loading');
    }
    
    const doc = new jsPDF();
    
    // Set up styling
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - (2 * margin);
    let yPos = 20;

    // Header
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('Trade Journal Report', pageWidth / 2, yPos, { align: 'center' });
    
    yPos += 15;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, pageWidth / 2, yPos, { align: 'center' });
    
    yPos += 20;

    // Process each trade
    rows.forEach((row, index) => {
      // Check if we need a new page
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }

      // Trade header
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      const tradeTitle = row.ticker ? `Trade ${index + 1}: ${row.ticker}` : `Trade ${index + 1}`;
      doc.text(tradeTitle, margin, yPos);
      
      yPos += 10;

      // Trade details in two columns
      const col1X = margin;
      const col2X = margin + (contentWidth / 2) + 10;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      // Left column
      doc.text(`Entry Price: $${formatNumber(row.entry)}`, col1X, yPos);
      doc.text(`Stop Loss: $${formatNumber(row.stop)}`, col1X, yPos + 5);
      doc.text(`Shares: ${formatNumber(row.shares)}`, col1X, yPos + 10);
      doc.text(`Position Size: $${formatNumber(row.position_size)}`, col1X, yPos + 15);
      
      // Right column
      doc.text(`Risk Amount: $${formatNumber(row.risk_dollars)}`, col2X, yPos);
      doc.text(`Risk %: ${formatNumber(row.risk_pct)}%`, col2X, yPos + 5);
      doc.text(`Stop Distance: ${formatNumber(row.stop_distance_pct)}%`, col2X, yPos + 10);
      doc.text(`% of Account: ${formatNumber(row.percent_of_account)}%`, col2X, yPos + 15);
      
      yPos += 25;

      // 5R Target and Trim Strategy
      if (row.target_5R) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('5R Target & Trim Strategy:', margin, yPos);
        
        yPos += 8;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`5R Target Price: $${formatNumber(row.target_5R)}`, margin, yPos);
        
        yPos += 5;
        
        // Calculate trim strategy
        const trimStrategy = calculateTrimStrategy(row);
        doc.text('Trim Strategy:', margin, yPos);
        
        yPos += 5;
        trimStrategy.forEach(strategy => {
          doc.text(`• ${strategy}`, margin + 5, yPos);
          yPos += 4;
        });
        
        yPos += 5;
      }

      // Notes section
      if (row.notes && row.notes.trim()) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Trade Notes:', margin, yPos);
        
        yPos += 8;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        
        // Split notes into lines that fit the page width
        const notesLines = doc.splitTextToSize(row.notes, contentWidth);
        notesLines.forEach(line => {
          doc.text(line, margin, yPos);
          yPos += 4;
        });
        
        yPos += 5;
      }

      // Separator
      if (index < rows.length - 1) {
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 10;
      }
    });

    // Add extra space before footer to prevent overlap
    yPos += 20;

    // Footer
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, 285, { align: 'center' });
      doc.text('Generated by Skyler\'s Stock Trading Calculator', pageWidth / 2, 290, { align: 'center' });
    }

    // Save the PDF
    const date = new Date().toISOString().slice(0, 10);
    doc.save(`trade_journal_${date}.pdf`);
    toast('📄 PDF report generated!');
    console.log('📄 PDF generated successfully');
    
  } catch (error) {
    console.error('❌ PDF generation failed:', error);
    toast('❌ PDF generation failed. Falling back to CSV export.');
    // Fallback to CSV export
    const csv = toCSV(rows);
    const date = new Date().toISOString().slice(0, 10);
    download(`trade_journal_${date}.csv`, csv);
  }
}

// Helper function to calculate trim strategy
function calculateTrimStrategy(row) {
  const strategies = [];
  
  if (!row.shares || !row.target_5R) return strategies;
  
  const shares = parseInt(row.shares);
  const entryPrice = parseFloat(row.entry);
  const fiveRTarget = parseFloat(row.target_5R);
  const riskPerShare = entryPrice - parseFloat(row.stop);
  
  // Standardized trim strategy for all users
  const trimPercentage = 25; // 25% (middle of 20-30% range)
  const sharesToTrim = Math.floor(shares * (trimPercentage / 100));
  const remainingShares = shares - sharesToTrim;
  const profitPerShare = fiveRTarget - entryPrice;
  const totalTrimProfit = sharesToTrim * profitPerShare;
  
  strategies.push(`TRIM: Sell ${sharesToTrim} shares (${trimPercentage}%) at 5R target $${formatNumber(fiveRTarget)}`);
  strategies.push(`PROFIT: $${formatNumber(totalTrimProfit)} from trim ($${formatNumber(profitPerShare)} per share)`);
  strategies.push(`TIMING: Wait until 5 minutes before market close to maximize gains`);
  strategies.push(`REMAINING: ${remainingShares} shares to hold for further gains`);
  strategies.push(`EXIT RULE: Sell remaining ${remainingShares} shares if stock closes below 10 SMA/EMA`);
  strategies.push(`MAXIMUM POTENTIAL: $${formatNumber(remainingShares * profitPerShare)} additional profit if held to 5R`);
  
  return strategies;
}

// Helper function to format numbers
function formatNumber(num) {
  if (num === null || num === undefined || isNaN(num)) return '-';
  return typeof num === 'number' ? num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : String(num);
}



function showSnapshotsModal(snapshots, onUpdate) {
  // Create modal
  const modal = document.createElement('div');
  modal.className = 'snapshots-modal';
  modal.innerHTML = `
    <div class="snapshots-modal-content">
      <div class="snapshots-modal-header">
        <h3>Manage Snapshots (${snapshots.length})</h3>
        <button class="modal-close" aria-label="Close">×</button>
      </div>
      <div class="snapshots-list">
        ${snapshots.map((snapshot, index) => createSnapshotCard(snapshot, index)).join('')}
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Add event listeners
  modal.querySelector('.modal-close').addEventListener('click', () => {
    modal.remove();
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });

  // Handle snapshot actions
  modal.addEventListener('click', (e) => {
    const target = e.target;
    
    if (target.classList.contains('snapshot-edit')) {
      const index = parseInt(target.getAttribute('data-index'));
      editSnapshot(snapshots, index, onUpdate, modal);
    }
    
    if (target.classList.contains('snapshot-delete')) {
      const index = parseInt(target.getAttribute('data-index'));
      deleteSnapshot(snapshots, index, onUpdate, modal);
    }
    
    if (target.classList.contains('snapshot-copy')) {
      const index = parseInt(target.getAttribute('data-index'));
      copySnapshot(snapshots[index]);
    }
  });
}

function createSnapshotCard(snapshot, index) {
  const date = new Date(snapshot.timestamp).toLocaleDateString();
  const time = new Date(snapshot.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const ticker = snapshot.ticker || 'No ticker';
  const entry = formatNumber(snapshot.entry);
  const stop = formatNumber(snapshot.stop);
  const shares = formatNumber(snapshot.shares);
  const positionSize = formatNumber(snapshot.position_size);
  const notes = snapshot.notes ? snapshot.notes.substring(0, 50) + (snapshot.notes.length > 50 ? '...' : '') : 'No notes';

  return `
    <div class="snapshot-card" data-index="${index}">
      <div class="snapshot-header">
        <div class="snapshot-info">
          <span class="snapshot-ticker">${ticker}</span>
          <span class="snapshot-date">${date} • ${time}</span>
        </div>
        <div class="snapshot-actions">
          <button class="snapshot-action snapshot-edit" data-index="${index}" title="Edit snapshot">✏️</button>
          <button class="snapshot-action snapshot-copy" data-index="${index}" title="Copy snapshot">📋</button>
          <button class="snapshot-action snapshot-delete" data-index="${index}" title="Delete snapshot">🗑️</button>
        </div>
      </div>
      <div class="snapshot-details">
        <div class="snapshot-row">
          <span class="snapshot-label">Entry:</span>
          <span class="snapshot-value">$${entry}</span>
          <span class="snapshot-label">Stop:</span>
          <span class="snapshot-value">$${stop}</span>
        </div>
        <div class="snapshot-row">
          <span class="snapshot-label">Shares:</span>
          <span class="snapshot-value">${shares}</span>
          <span class="snapshot-label">Position:</span>
          <span class="snapshot-value">$${positionSize}</span>
        </div>
        <div class="snapshot-notes">
          <span class="snapshot-label">Notes:</span>
          <span class="snapshot-value">${notes}</span>
        </div>
      </div>
    </div>
  `;
}

function editSnapshot(snapshots, index, onUpdate, modal) {
  const snapshot = snapshots[index];
  
  // Create edit modal
  const editModal = document.createElement('div');
  editModal.className = 'edit-modal';
  editModal.innerHTML = `
    <div class="edit-modal-content">
      <div class="edit-modal-header">
        <h3>Edit Snapshot</h3>
        <button class="modal-close" aria-label="Close">×</button>
      </div>
      <div class="edit-form">
        <div class="edit-group">
          <label>Ticker:</label>
          <input type="text" id="edit-ticker" value="${snapshot.ticker || ''}" placeholder="Ticker symbol">
        </div>
        <div class="edit-group">
          <label>Entry Price:</label>
          <input type="number" id="edit-entry" value="${snapshot.entry || ''}" step="0.01" placeholder="Entry price">
        </div>
        <div class="edit-group">
          <label>Stop Loss:</label>
          <input type="number" id="edit-stop" value="${snapshot.stop || ''}" step="0.01" placeholder="Stop loss">
        </div>
        <div class="edit-group">
          <label>Shares:</label>
          <input type="number" id="edit-shares" value="${snapshot.shares || ''}" placeholder="Number of shares">
        </div>
        <div class="edit-group">
          <label>Notes:</label>
          <textarea id="edit-notes" placeholder="Trade notes...">${snapshot.notes || ''}</textarea>
        </div>
        <div class="edit-actions">
          <button class="btn-secondary" id="cancel-edit">Cancel</button>
          <button class="btn-primary" id="save-edit">Save Changes</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(editModal);

  // Handle edit modal events
  editModal.querySelector('.modal-close').addEventListener('click', () => editModal.remove());
  editModal.querySelector('#cancel-edit').addEventListener('click', () => editModal.remove());
  
  editModal.addEventListener('click', (e) => {
    if (e.target === editModal) editModal.remove();
  });

  editModal.querySelector('#save-edit').addEventListener('click', () => {
    // Get the edited values
    const ticker = editModal.querySelector('#edit-ticker').value.trim();
    const entry = parseFloat(editModal.querySelector('#edit-entry').value) || null;
    const stop = parseFloat(editModal.querySelector('#edit-stop').value) || null;
    const shares = parseInt(editModal.querySelector('#edit-shares').value) || null;
    const notes = editModal.querySelector('#edit-notes').value.trim();

    // Recalculate dependent values
    const updatedSnapshot = recalculateSnapshotValues({
      ...snapshot,
      ticker,
      entry,
      stop,
      shares,
      notes
    });

    // Update the snapshot
    snapshots[index] = updatedSnapshot;
    onUpdate(snapshots);
    
    // Update the modal display
    const snapshotCard = modal.querySelector(`[data-index="${index}"]`);
    if (snapshotCard) {
      snapshotCard.outerHTML = createSnapshotCard(updatedSnapshot, index);
    }
    
    editModal.remove();
    toast('✅ Snapshot updated with recalculated values');
  });
}

function deleteSnapshot(snapshots, index, onUpdate, modal) {
  const snapshot = snapshots[index];
  const ticker = snapshot.ticker || 'this snapshot';
  
  if (confirm(`Are you sure you want to delete ${ticker}?`)) {
    // Find the snapshot card to animate
    const snapshotCard = modal.querySelector(`[data-index="${index}"]`);
    
    if (snapshotCard) {
      // Add fade-out animation
      snapshotCard.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      snapshotCard.style.opacity = '0';
      snapshotCard.style.transform = 'translateX(-20px)';
      
      // Remove from DOM after animation
      setTimeout(() => {
        snapshotCard.remove();
        
        // Update the snapshots array
        snapshots.splice(index, 1);
        onUpdate(snapshots);
        
        // Update remaining indices
        modal.querySelectorAll('.snapshot-card').forEach((card, newIndex) => {
          card.setAttribute('data-index', newIndex);
          card.querySelectorAll('.snapshot-action').forEach(action => {
            action.setAttribute('data-index', newIndex);
          });
        });
        
        // Update modal header count
        const header = modal.querySelector('.snapshots-modal-header h3');
        header.textContent = `Manage Snapshots (${snapshots.length})`;
        
        toast(`🗑️ Deleted ${ticker}`);
      }, 300); // Wait for animation to complete
    } else {
      // Fallback if card not found
      snapshots.splice(index, 1);
      onUpdate(snapshots);
      toast(`🗑️ Deleted ${ticker}`);
    }
  }
}

function recalculateSnapshotValues(snapshot) {
  const { entry, stop, shares, account_size, risk_pct } = snapshot;
  
  // Initialize calculated values
  let calculated = { ...snapshot };
  
  // Calculate position size (shares × entry price)
  if (entry && shares) {
    calculated.position_size = entry * shares;
  }
  
  // Calculate stop distance percentage
  if (entry && stop && entry > stop) {
    calculated.stop_distance_pct = ((entry - stop) / entry) * 100;
  }
  
  // Calculate risk dollars (shares × risk per share)
  if (shares && entry && stop && entry > stop) {
    calculated.risk_dollars = shares * (entry - stop);
  }
  
  // Calculate percent of account
  if (calculated.position_size && account_size) {
    calculated.percent_of_account = (calculated.position_size / account_size) * 100;
  }
  
  // Calculate R multiple if target exists
  if (snapshot.target && entry && stop && entry > stop) {
    const riskPerShare = entry - stop;
    const rewardPerShare = snapshot.target - entry;
    if (riskPerShare > 0) {
      calculated.r_multiple = rewardPerShare / riskPerShare;
    }
  }
  
  // Calculate 5R target
  if (entry && stop && entry > stop) {
    const riskPerShare = entry - stop;
    calculated.target_5R = entry + (riskPerShare * 5);
  }
  
  // Calculate profit per share if target exists
  if (snapshot.target && entry) {
    calculated.profit_per_share = snapshot.target - entry;
  }
  
  // Calculate total profit
  if (calculated.profit_per_share && shares) {
    calculated.total_profit = calculated.profit_per_share * shares;
  }
  
  // Calculate ROI percentage
  if (calculated.total_profit && calculated.position_size) {
    calculated.roi_pct = (calculated.total_profit / calculated.position_size) * 100;
  }
  
  // Calculate risk:reward ratio
  if (calculated.total_profit && calculated.risk_dollars) {
    calculated.risk_reward = calculated.total_profit / calculated.risk_dollars;
  }
  
  return calculated;
}

function copySnapshot(snapshot) {
  const tsv = toTSV([snapshot]);
  navigator.clipboard?.writeText(tsv).then(() => {
    toast('📋 Snapshot copied to clipboard');
  }).catch(() => {
    toast('❌ Failed to copy snapshot');
  });
}

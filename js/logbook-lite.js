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
    ticker: snap?.inputs?.tickerSymbol ?? '', // Now populated from calculator input
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
    notes: snap?.notes ?? '', // Free text field for trade notes
    status: snap?.status ?? 'open', // Trade status: open, trimmed, closed
    trim_percent: snap?.trim_percent ?? 25, // Percentage to trim at 5R target (default 25%)
    trims: snap?.trims ?? [], // Array of trim objects: { date, price, shares, profit }
    remaining_shares: snap?.remaining_shares ?? (results.shares || null) // Track remaining shares after trims
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
      <button class="logbook-btn primary" id="saveSnapshotBtn">📝 Add to Journal</button>
      <button class="logbook-btn" id="cancelPendingBtn" style="display: none;">❌ Cancel</button>
      <span id="logCount" class="log-count">0 trades</span>
    </div>
    <div class="log-actions">
      <button class="logbook-btn" id="viewSnapshots" title="View and manage trade journal">📖 Open Journal</button>
      <button class="logbook-btn" id="copyLast" title="Copy last trade as TSV">Copy Last</button>
      <button class="logbook-btn" id="copyAllCSV" title="Copy all trades as CSV">Copy All</button>
      <button class="logbook-btn" id="downloadCSV" title="Download journal as CSV">Download</button>
      <button class="logbook-btn" id="exportPDF" title="Export journal as PDF">📄 PDF</button>
      <button class="logbook-btn danger" id="clearLog" title="Delete all journal entries">🗑️ Delete All</button>
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
    countEl.textContent = `${count} trade${count === 1 ? '' : 's'}`;
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
    saveBtn.textContent = '📝 Add to Journal';
    logbookBar.querySelector('#cancelPendingBtn').style.display = 'none'; // Hide cancel button

    // Show different feedback based on whether notes were added
    if (notes && notes.trim()) {
      toast('✅ Trade added to journal with notes!');
    } else {
      toast('✅ Trade added to journal!');
    }

    console.log('💾 Trade saved to journal:', flatRow);
  });

  // Copy last row as TSV (perfect for pasting into Notion tables)
  logbookBar.querySelector('#copyLast').addEventListener('click', async () => {
    if (!rows.length) {
      toast('⚠️ No trades in journal yet');
      return;
    }

    try {
      const tsv = toTSV([rows[rows.length - 1]]);
      await navigator.clipboard?.writeText(tsv);
      toast('📋 Last trade copied (TSV)');
    } catch (error) {
      toast('❌ Failed to copy to clipboard');
    }
  });

  // Copy all as CSV
  logbookBar.querySelector('#copyAllCSV').addEventListener('click', async () => {
    if (!rows.length) {
      toast('⚠️ No trades in journal yet');
      return;
    }

    try {
      const csv = toCSV(rows);
      await navigator.clipboard?.writeText(csv);
      toast(`📋 ${rows.length} trade${rows.length === 1 ? '' : 's'} copied (CSV)`);
    } catch (error) {
      toast('❌ Failed to copy to clipboard');
    }
  });

  // Download CSV file
  logbookBar.querySelector('#downloadCSV').addEventListener('click', () => {
    if (!rows.length) {
      toast('⚠️ No trades in journal yet');
      return;
    }

    const csv = toCSV(rows);
    const date = new Date().toISOString().slice(0, 10);
    download(`trade_journal_${date}.csv`, csv);
    toast(`📥 Downloaded ${rows.length} trade${rows.length === 1 ? '' : 's'}`);
  });

  // Export PDF report
  logbookBar.querySelector('#exportPDF').addEventListener('click', () => {
    if (!rows.length) {
      toast('⚠️ No trades in journal yet');
      return;
    }

    generatePDFReport(rows);
  });

  // View and manage journal
  logbookBar.querySelector('#viewSnapshots').addEventListener('click', () => {
    if (!rows.length) {
      toast('⚠️ No trades in journal yet');
      return;
    }
    showJournalModal(rows, (newRows) => {
      rows = newRows;
      saveRows(rows);
      updateCount();
    });
  });

  // Clear all journal entries
  logbookBar.querySelector('#clearLog').addEventListener('click', () => {
    if (!rows.length) {
      toast('⚠️ No trades to delete');
      return;
    }

    // Show confirmation dialog
    const count = rows.length;
    const confirmed = confirm(`Are you sure you want to delete all ${count} trade${count === 1 ? '' : 's'} from your journal?\n\nThis action cannot be undone.`);

    if (confirmed) {
      rows = [];
      saveRows(rows);
      updateCount();
      toast(`🗑️ Deleted ${count} trade${count === 1 ? '' : 's'}`);
      console.log(`🗑️ Deleted ${count} trades`);
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
        
        // Update the save button to indicate there's a pending trade
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
    saveBtn.textContent = '📝 Add to Journal';
    logbookBar.querySelector('#cancelPendingBtn').style.display = 'none'; // Hide cancel button

    // Clear notes
    const notesTextarea = document.getElementById('tradeNotes');
    if (notesTextarea) {
      notesTextarea.value = '';
    }

    toast('📋 Pending trade cancelled.');
    console.log('📋 Pending trade cancelled.');
  });

  console.log('✅ Trade Journal initialized with', rows.length, 'existing trades');
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



function showJournalModal(snapshots, onUpdate) {
  // Count trades by status
  const statusCounts = snapshots.reduce((acc, s) => {
    const status = s.status || 'open';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  const openCount = statusCounts.open || 0;
  const trimmedCount = statusCounts.trimmed || 0;
  const closedCount = statusCounts.closed || 0;

  // Create modal
  const modal = document.createElement('div');
  modal.className = 'snapshots-modal';
  modal.innerHTML = `
    <div class="snapshots-modal-content">
      <div class="snapshots-modal-header">
        <h3>📖 Trade Journal (${snapshots.length} ${snapshots.length === 1 ? 'trade' : 'trades'})</h3>
        <button class="modal-close" aria-label="Close">×</button>
      </div>
      <div class="snapshots-filter-bar">
        <button class="filter-btn active" data-filter="all">All (${snapshots.length})</button>
        <button class="filter-btn" data-filter="open">Open (${openCount})</button>
        <button class="filter-btn" data-filter="trimmed">Trimmed (${trimmedCount})</button>
        <button class="filter-btn" data-filter="closed">Closed (${closedCount})</button>
      </div>
      <div class="snapshots-list">
        ${snapshots.map((snapshot, index) => createSnapshotCard(snapshot, index)).join('')}
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Handle filter buttons
  const filterButtons = modal.querySelectorAll('.filter-btn');
  const snapshotCards = modal.querySelectorAll('.snapshot-card');

  filterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const filter = btn.getAttribute('data-filter');

      // Update active state
      filterButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Filter cards
      snapshotCards.forEach(card => {
        const cardStatus = card.getAttribute('data-status') || 'open';
        if (filter === 'all' || cardStatus === filter) {
          card.style.display = 'block';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });

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

    if (target.classList.contains('snapshot-status-action')) {
      const index = parseInt(target.getAttribute('data-index'));
      const action = target.getAttribute('data-action');

      if (action === 'trim') {
        addTrimToSnapshot(snapshots, index, onUpdate, modal);
      }
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
  const target5R = formatNumber(snapshot.target_5R);
  const notes = snapshot.notes ? snapshot.notes.substring(0, 50) + (snapshot.notes.length > 50 ? '...' : '') : 'No notes';

  // Get status (default to 'open' for backward compatibility)
  const status = snapshot.status || 'open';
  const trimPercent = snapshot.trim_percent || 25;
  const trims = snapshot.trims || [];
  const originalShares = parseInt(snapshot.shares) || 0;
  const remainingShares = parseInt(snapshot.remaining_shares ?? snapshot.shares) || 0;

  // Status pill configuration
  const statusConfig = {
    open: { label: 'OPEN', class: 'status-open' },
    trimmed: { label: 'TRIMMED', class: 'status-trimmed' },
    closed: { label: 'CLOSED', class: 'status-closed' }
  };

  const statusInfo = statusConfig[status] || statusConfig.open;

  // Calculate trim information if there are trims
  let trimmedInfo = '';
  if (trims.length > 0) {
    const totalProfit = trims.reduce((sum, trim) => sum + (parseFloat(trim.profit) || 0), 0);
    const totalSharesSold = trims.reduce((sum, trim) => sum + (parseInt(trim.shares) || 0), 0);

    // Build trim history
    const trimHistory = trims.map((trim, idx) => {
      const trimDate = new Date(trim.date).toLocaleDateString();
      return `<div class="trim-detail"><span class="trim-icon">✅</span> Trim ${idx + 1}: ${trim.shares} shares @ $${formatNumber(trim.price)} on ${trimDate} = $${formatNumber(trim.profit)} profit</div>`;
    }).join('');

    trimmedInfo = `
      <div class="snapshot-trimmed-info">
        <div class="trim-summary-header">
          <strong>${trims.length} trim${trims.length > 1 ? 's' : ''}</strong> • Total P&L: <strong>$${formatNumber(totalProfit)}</strong>
        </div>
        ${trimHistory}
        ${status === 'trimmed' ? `
          <div class="trim-detail"><span class="trim-icon">📊</span> Remaining: <strong>${remainingShares} shares</strong></div>
          <div class="trim-detail trim-exit-rule"><span class="trim-icon">⚠️</span> Exit: Close below 10 SMA or continue scaling</div>
        ` : ''}
      </div>
    `;
  }

  // Action buttons based on status
  let actionButtons = '';
  if (status === 'open') {
    actionButtons = `<button class="snapshot-status-action" data-index="${index}" data-action="trim" title="Trim position">Trim Position (5R Default)</button>`;
  } else if (status === 'trimmed') {
    actionButtons = `<button class="snapshot-status-action" data-index="${index}" data-action="trim" title="Add another trim">Add Another Trim</button>`;
  }

  return `
    <div class="snapshot-card snapshot-status-${status}" data-index="${index}" data-status="${status}">
      <div class="snapshot-header">
        <div class="snapshot-info">
          <div class="snapshot-ticker-row">
            <span class="snapshot-ticker">${ticker}</span>
            <span class="status-pill ${statusInfo.class}">${statusInfo.label}</span>
          </div>
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
          <span class="snapshot-label">5R Target:</span>
          <span class="snapshot-value snapshot-5r-highlight">$${target5R}</span>
          <span class="snapshot-label">Shares:</span>
          <span class="snapshot-value">${shares}</span>
        </div>
        <div class="snapshot-row">
          <span class="snapshot-label">Position:</span>
          <span class="snapshot-value">$${positionSize}</span>
        </div>
        ${trimmedInfo}
        ${actionButtons ? `<div class="snapshot-action-row">${actionButtons}</div>` : ''}
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
          <label>Status:</label>
          <select id="edit-status">
            <option value="open" ${(snapshot.status || 'open') === 'open' ? 'selected' : ''}>Open</option>
            <option value="trimmed" ${snapshot.status === 'trimmed' ? 'selected' : ''}>Trimmed</option>
            <option value="closed" ${snapshot.status === 'closed' ? 'selected' : ''}>Closed</option>
          </select>
        </div>
        <div class="edit-group">
          <label>Trim Percentage (%):</label>
          <input type="number" id="edit-trim-percent" value="${snapshot.trim_percent || 25}" min="1" max="100" step="1" placeholder="25">
          <span class="input-hint">Used when status is "Trimmed"</span>
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
    const status = editModal.querySelector('#edit-status').value;
    const trimPercent = parseFloat(editModal.querySelector('#edit-trim-percent').value) || 25;

    // Recalculate dependent values
    const updatedSnapshot = recalculateSnapshotValues({
      ...snapshot,
      ticker,
      entry,
      stop,
      shares,
      notes,
      status,
      trim_percent: trimPercent
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
    toast('✅ Trade updated with recalculated values');
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
        header.textContent = `📖 Trade Journal (${snapshots.length} ${snapshots.length === 1 ? 'trade' : 'trades'})`;
        
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
    toast('📋 Trade copied to clipboard');
  }).catch(() => {
    toast('❌ Failed to copy trade');
  });
}

function addTrimToSnapshot(snapshots, index, onUpdate, modal) {
  const snapshot = snapshots[index];
  const ticker = snapshot.ticker || 'this trade';
  const status = snapshot.status || 'open';
  const trims = snapshot.trims || [];
  const remainingShares = parseInt(snapshot.remaining_shares ?? snapshot.shares) || 0;
  const entryPrice = parseFloat(snapshot.entry) || 0;
  const fiveRTarget = parseFloat(snapshot.target_5R) || 0;

  // Determine default price (5R for first trim, empty for subsequent)
  const isFirstTrim = trims.length === 0;
  const defaultPrice = isFirstTrim ? fiveRTarget : '';

  // Calculate default shares (25% of remaining for first trim, all remaining for subsequent)
  const defaultShares = isFirstTrim
    ? Math.floor(remainingShares * 0.25)
    : remainingShares;

  // Today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0];

  // Create trim modal
  const trimModal = document.createElement('div');
  trimModal.className = 'edit-modal';
  trimModal.innerHTML = `
    <div class="edit-modal-content">
      <div class="edit-modal-header">
        <h3>${isFirstTrim ? 'Trim Position' : 'Add Another Trim'} - ${ticker}</h3>
        <button class="modal-close" aria-label="Close">×</button>
      </div>
      <div class="edit-form">
        <div class="trim-summary">
          <p><strong>Entry Price:</strong> $${formatNumber(entryPrice)}</p>
          <p><strong>5R Target:</strong> $${formatNumber(fiveRTarget)}</p>
          <p><strong>Remaining Shares:</strong> ${remainingShares}</p>
          ${trims.length > 0 ? `<p><strong>Previous Trims:</strong> ${trims.length}</p>` : ''}
        </div>
        <div class="edit-group">
          <label>Exit Price:</label>
          <input type="number" id="trim-price" value="${defaultPrice}" step="0.01" placeholder="Exit price" required>
          <span class="input-hint">${isFirstTrim ? 'Default: 5R target price' : 'Enter your exit price'}</span>
        </div>
        <div class="edit-group">
          <label>Shares to Sell:</label>
          <input type="number" id="trim-shares" value="${defaultShares}" min="1" max="${remainingShares}" step="1" required>
          <span class="input-hint">Max: ${remainingShares} shares remaining</span>
        </div>
        <div class="edit-group">
          <label>Exit Date:</label>
          <input type="date" id="trim-date" value="${today}" required>
        </div>
        <div id="trim-preview" class="trim-preview"></div>
        <div class="edit-actions">
          <button class="btn-secondary" id="cancel-trim">Cancel</button>
          <button class="btn-primary" id="confirm-trim">Confirm Trim</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(trimModal);

  // Get inputs
  const priceInput = trimModal.querySelector('#trim-price');
  const sharesInput = trimModal.querySelector('#trim-shares');
  const dateInput = trimModal.querySelector('#trim-date');
  const preview = trimModal.querySelector('#trim-preview');
  const confirmBtn = trimModal.querySelector('#confirm-trim');

  let userHasInteracted = false;

  // Update preview
  const updatePreview = () => {
    const price = parseFloat(priceInput.value) || 0;
    const shares = parseInt(sharesInput.value) || 0;
    const profitPerShare = price - entryPrice;
    const totalProfit = shares * profitPerShare;
    const newRemainingShares = remainingShares - shares;

    // Validation
    if (shares > remainingShares) {
      preview.className = 'trim-preview error';
      preview.innerHTML = `
        <h4>Error:</h4>
        <p>Cannot sell more than ${remainingShares} remaining shares!</p>
      `;
      confirmBtn.disabled = true;
      return;
    }

    if (shares <= 0 || price <= 0) {
      // Only show error if user has interacted with inputs
      if (userHasInteracted) {
        preview.className = 'trim-preview error';
        preview.innerHTML = `
          <h4>Error:</h4>
          <p>Price and shares must be greater than 0</p>
        `;
        confirmBtn.disabled = true;
      } else {
        // Show helpful message on initial load
        preview.className = 'trim-preview';
        preview.innerHTML = `
          <h4>Ready to trim:</h4>
          <p>Enter exit price and shares to see preview</p>
        `;
        confirmBtn.disabled = true;
      }
      return;
    }

    // Reset to success state
    preview.className = 'trim-preview';
    confirmBtn.disabled = false;

    const willClose = newRemainingShares === 0;

    preview.innerHTML = `
      <h4>Preview:</h4>
      <p><strong>Selling:</strong> ${shares} shares @ $${formatNumber(price)}</p>
      <p><strong>Profit/Loss:</strong> $${formatNumber(totalProfit)} (${profitPerShare >= 0 ? '+' : ''}$${formatNumber(profitPerShare)}/share)</p>
      <p><strong>After Trim:</strong> ${newRemainingShares} shares remaining</p>
      ${willClose ? '<p style="color: #10b981;"><strong>✅ This will close the position</strong></p>' : '<p><strong>Status:</strong> Position remains open for more trims</p>'}
    `;
  };

  priceInput.addEventListener('input', () => {
    userHasInteracted = true;
    updatePreview();
  });
  sharesInput.addEventListener('input', () => {
    userHasInteracted = true;
    updatePreview();
  });
  updatePreview(); // Initial preview

  // Handle modal events
  trimModal.querySelector('.modal-close').addEventListener('click', () => trimModal.remove());
  trimModal.querySelector('#cancel-trim').addEventListener('click', () => trimModal.remove());

  trimModal.addEventListener('click', (e) => {
    if (e.target === trimModal) trimModal.remove();
  });

  confirmBtn.addEventListener('click', () => {
    const price = parseFloat(priceInput.value) || 0;
    const shares = parseInt(sharesInput.value) || 0;
    const date = dateInput.value;

    if (shares > remainingShares || shares <= 0 || price <= 0) {
      toast('❌ Invalid trim values');
      return;
    }

    // Calculate profit for this trim
    const profitPerShare = price - entryPrice;
    const profit = shares * profitPerShare;

    // Create new trim object
    const newTrim = {
      date: date,
      price: price,
      shares: shares,
      profit: profit
    };

    // Update snapshot
    const newTrims = [...trims, newTrim];
    const newRemainingShares = remainingShares - shares;
    const willClose = newRemainingShares === 0;

    snapshots[index] = {
      ...snapshot,
      status: willClose ? 'closed' : 'trimmed',
      trims: newTrims,
      remaining_shares: newRemainingShares,
      close_date: willClose ? new Date().toISOString() : snapshot.close_date
    };

    onUpdate(snapshots);

    // Update the card in the modal
    const snapshotCard = modal.querySelector(`[data-index="${index}"]`);
    if (snapshotCard) {
      snapshotCard.outerHTML = createSnapshotCard(snapshots[index], index);
    }

    trimModal.remove();

    if (willClose) {
      const totalProfit = newTrims.reduce((sum, t) => sum + t.profit, 0);
      toast(`✅ ${ticker} position closed! Total P&L: $${formatNumber(totalProfit)}`);
    } else {
      toast(`✅ Trim added to ${ticker} (${newRemainingShares} shares remaining)`);
    }
  });
}

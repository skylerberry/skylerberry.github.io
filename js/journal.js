// Journal functionality - prepared for implementation
import { formatCurrency, formatDate, formatPercentage, STORAGE_KEYS, exportToCSV } from './utils.js';

export class Journal {
    constructor(appState) {
        this.state = appState;
        this.element = document.querySelector('.journal-section');
        this.isInitialized = false;
        this.elements = {
            modal: document.getElementById('journalModal'),
            form: document.getElementById('journalForm'),
            symbol: document.getElementById('symbol'),
            entryPrice: document.getElementById('entryPrice'),
            stopLossPrice: document.getElementById('stopLossPrice'),
            targetPrice: document.getElementById('targetPrice'),
            shares: document.getElementById('shares'),
            riskPercentage: document.getElementById('riskPercentage'),
            notes: document.getElementById('notes'),
            errors: document.getElementById('journalErrors'),
            cancel: document.getElementById('cancelModal'),
            totalTrades: document.getElementById('totalTrades'),
            winRate: document.getElementById('winRate'),
            avgReturn: document.getElementById('avgReturn'),
            totalPnL: document.getElementById('totalPnL')
        };
    }

    init() {
        console.log('📝 Journal module loaded');

        // Set up event listeners for when we implement the journal
        this.state.on('calculatorResultsChanged', (results) => {
            // This will be used to enable "Save Trade" button when we have valid results
            this.onCalculatorResultsChanged(results);
        });

        this.state.on('journalEntryAdded', (entry) => {
            console.log('📝 Journal entry added:', entry);
        });

        this.state.on('journalEntryUpdated', (entry) => {
            console.log('📝 Journal entry updated:', entry);
        });

        this.state.on('journalEntryDeleted', (entry) => {
            console.log('📝 Journal entry deleted:', entry);
        });

        this.setupModalHandlers();
        this.setupImportExportHandlers();
        this.renderJournalList(); // Initial render
        this.renderJournalStats();

        this.isInitialized = true;
    }

    onCalculatorResultsChanged(results) {
        // Placeholder: This is where we'd enable/disable the "Save Trade" button
        // based on whether we have valid calculation results
        const hasValidResults = results.shares !== '-' && results.positionSize !== '-';

        if (hasValidResults) {
            console.log('✅ Calculator has valid results - trade can be saved to journal');
        }
    }

    setupModalHandlers() {
        this.elements.form.addEventListener('submit', (e) => {
            e.preventDefault();
            const entry = this.getFormData();
            const validation = this.validateJournalEntry(entry);
            if (validation.isValid) {
                // Check if editing or adding
                if (this.currentEditId) {
                    this.state.updateJournalEntry(this.currentEditId, entry);
                    this.currentEditId = null;
                } else {
                    this.state.addJournalEntry(entry);
                }
                this.closeModal();
                this.renderJournalList();
                this.renderJournalStats();
            } else {
                this.showErrors(validation.errors);
            }
        });

        this.elements.cancel.addEventListener('click', () => this.closeModal());
    }

    setupImportExportHandlers() {
        document.getElementById('exportJournal').addEventListener('click', () => {
            const entries = this.state.journal.entries.map(entry => ({
                id: entry.id,
                timestamp: entry.timestamp,
                symbol: entry.symbol,
                entryPrice: entry.entryPrice,
                stopLossPrice: entry.stopLossPrice,
                targetPrice: entry.targetPrice,
                shares: entry.shares,
                positionSize: entry.positionSize,
                totalRisk: entry.totalRisk,
                rMultiple: entry.rMultiple,
                notes: entry.notes,
                outcome: entry.outcome,
                actualExit: entry.actualExit,
                actualPnL: entry.actualPnL
            }));
            exportToCSV(entries, 'trading_journal.csv');
        });

        const importInput = document.getElementById('importJournal');
        document.getElementById('importJournalButton').addEventListener('click', () => importInput.click());
        importInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const csv = event.target.result;
                    const lines = csv.split('\n').slice(1); // Skip header
                    lines.forEach(line => {
                        if (line.trim()) {
                            const values = line.split(',');
                            const entry = {
                                id: parseFloat(values[0]),
                                timestamp: values[1],
                                symbol: values[2],
                                entryPrice: parseFloat(values[3]),
                                stopLossPrice: parseFloat(values[4]),
                                targetPrice: parseFloat(values[5]) || null,
                                shares: parseFloat(values[6]),
                                positionSize: parseFloat(values[7]),
                                totalRisk: parseFloat(values[8]),
                                rMultiple: parseFloat(values[9]),
                                notes: values[10],
                                outcome: values[11],
                                actualExit: parseFloat(values[12]) || null,
                                actualPnL: parseFloat(values[13]) || null
                            };
                            this.state.addJournalEntry(entry);
                        }
                    });
                    this.renderJournalList();
                    this.renderJournalStats();
                };
                reader.readAsText(file);
            }
        });
    }

    showAddTradeModal() {
        const tradeData = this.state.captureTradeData();
        this.prefillForm(tradeData);
        this.elements.modal.classList.remove('hidden');
    }

    showEditTradeModal(id) {
        const entry = this.state.journal.entries.find(e => e.id === id);
        if (entry) {
            this.currentEditId = id;
            this.prefillForm(entry);
            this.elements.modal.querySelector('h2').textContent = 'Edit Trade';
            this.elements.modal.classList.remove('hidden');
        }
    }

    prefillForm(data) {
        this.elements.symbol.value = data.symbol || '';
        this.elements.entryPrice.value = data.entryPrice;
        this.elements.stopLossPrice.value = data.stopLossPrice;
        this.elements.targetPrice.value = data.targetPrice || '';
        this.elements.shares.value = data.shares;
        this.elements.riskPercentage.value = data.riskPercentage;
        this.elements.notes.value = data.notes || '';
        this.elements.errors.classList.add('hidden');
    }

    getFormData() {
        return {
            symbol: this.elements.symbol.value.trim(),
            entryPrice: parseFloat(this.elements.entryPrice.value),
            stopLossPrice: parseFloat(this.elements.stopLossPrice.value),
            targetPrice: parseFloat(this.elements.targetPrice.value) || null,
            shares: parseFloat(this.elements.shares.value),
            riskPercentage: parseFloat(this.elements.riskPercentage.value),
            notes: this.elements.notes.value.trim(),
            outcome: 'pending' // Default, or handle if editing
        };
    }

    closeModal() {
        this.elements.modal.classList.add('hidden');
        this.elements.form.reset();
        this.elements.modal.querySelector('h2').textContent = 'Add Trade to Journal';
        this.currentEditId = null;
    }

    showErrors(errors) {
        this.elements.errors.textContent = errors.join(', ');
        this.elements.errors.classList.remove('hidden');
    }

    renderJournalList() {
        const list = document.getElementById('journalList');
        list.innerHTML = '';
        const entries = this.getJournalEntries(this.state.journal.filters);
        entries.forEach(entry => {
            const li = document.createElement('li');
            li.className = 'journal-entry';
            li.innerHTML = `
                <div>${entry.symbol} - ${formatDate(entry.timestamp)}</div>
                <div>Entry: ${formatCurrency(entry.entryPrice)} | Shares: ${formatNumber(entry.shares)}</div>
                <div>Outcome: ${entry.outcome}</div>
                <button class="edit-button" data-id="${entry.id}">Edit</button>
                <button class="delete-button" data-id="${entry.id}">Delete</button>
            `;
            list.appendChild(li);
        });

        // Add event listeners
        list.querySelectorAll('.edit-button').forEach(btn => {
            btn.addEventListener('click', (e) => this.showEditTradeModal(parseFloat(e.target.dataset.id)));
        });

        list.querySelectorAll('.delete-button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (confirm('Delete this entry?')) {
                    this.state.deleteJournalEntry(parseFloat(e.target.dataset.id));
                    this.renderJournalList();
                    this.renderJournalStats();
                }
            });
        });
    }

    renderJournalStats() {
        const stats = this.state.journal.stats;
        this.elements.totalTrades.textContent = stats.totalTrades;
        this.elements.winRate.textContent = formatPercentage(stats.winRate);
        this.elements.avgReturn.textContent = formatCurrency(stats.avgReturn);
        this.elements.totalPnL.textContent = formatCurrency(stats.totalPnL);
    }

    // Placeholder methods for future implementation

    saveCurrentTrade() {
        const tradeData = this.state.captureTradeData();
        console.log('💾 Would save trade:', tradeData);

        // Future implementation:
        // - Show modal to add symbol, notes, etc.
        // - Add entry to journal
        // - Update stats

        return tradeData;
    }

    getJournalEntries(filters = {}) {
        return this.state.journal.entries.filter(entry => {
            // Apply filters
            if (filters.symbol && !entry.symbol.toLowerCase().includes(filters.symbol.toLowerCase())) {
                return false;
            }

            if (filters.outcome && filters.outcome !== 'all' && entry.outcome !== filters.outcome) {
                return false;
            }

            // Add more filters as needed
            return true;
        });
    }

    getJournalStats() {
        return this.state.journal.stats;
    }

    exportJournal() {
        const entries = this.getJournalEntries();
        console.log('📊 Would export journal:', entries);

        // Future implementation:
        // - Format data for CSV/Excel
        // - Trigger download

        return entries;
    }

    // Helper methods for when we implement the UI

    formatEntryForDisplay(entry) {
        return {
            ...entry,
            formattedDate: formatDate(entry.timestamp),
            formattedEntryPrice: formatCurrency(entry.entryPrice),
            formattedStopLoss: formatCurrency(entry.stopLossPrice),
            formattedTarget: entry.targetPrice ? formatCurrency(entry.targetPrice) : '-',
            formattedPositionSize: formatCurrency(entry.positionSize),
            formattedRisk: formatCurrency(entry.totalRisk),
            formattedPnL: entry.actualPnL ? formatCurrency(entry.actualPnL) : '-',
            riskPercentageFormatted: formatPercentage(entry.riskPercentage)
        };
    }

    validateJournalEntry(entry) {
        const errors = [];

        if (!entry.symbol || entry.symbol.trim() === '') {
            errors.push('Symbol is required');
        }

        if (!entry.entryPrice || entry.entryPrice <= 0) {
            errors.push('Valid entry price is required');
        }

        if (!entry.stopLossPrice || entry.stopLossPrice <= 0) {
            errors.push('Valid stop loss price is required');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    // Future UI methods (placeholders)

    showDeleteConfirmation(entryId) {
        console.log('🗑️ Would show delete confirmation for:', entryId);
    }
}

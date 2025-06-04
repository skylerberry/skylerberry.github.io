// Journal functionality - prepared for implementation
import { formatCurrency, formatDate, formatPercentage, exportToCSV } from './utils.js';

export class Journal {
    constructor(appState) {
        this.state = appState;
        this.element = document.querySelector('.journal-section');
        this.saveButton = document.getElementById('saveTradeButton');
        this.form = {
            symbol: document.getElementById('journalSymbol'),
            notes: document.getElementById('journalNotes'),
            outcome: document.getElementById('journalOutcome')
        };
        this.addEntryButton = document.getElementById('addJournalEntryButton');
        this.exportButton = document.getElementById('exportJournalButton');
        this.journalList = document.getElementById('journalList');
        this.journalStats = document.getElementById('journalStats');
        this.isInitialized = false;
    }

    init() {
        console.log('📝 Journal module loaded');

        // Set up event listeners for when we implement the journal
        this.state.on('calculatorResultsChanged', (results) => {
            // This will be used to enable "Save Trade" button when we have valid results
            this.onCalculatorResultsChanged(results);
        });

        this.state.on('journalEntryAdded', () => {
            this.renderJournalList();
            this.renderJournalStats();
        });
        this.state.on('journalEntryDeleted', () => {
            this.renderJournalList();
            this.renderJournalStats();
        });
        this.state.on('journalEntryUpdated', () => {
            this.renderJournalList();
            this.renderJournalStats();
        });
        this.state.on('journalStatsUpdated', () => {
            this.renderJournalStats();
        });

        if (this.saveButton) {
            this.saveButton.addEventListener('click', () => {
                this.state.setActiveSection('journal');
            });
        }

        if (this.addEntryButton) {
            this.addEntryButton.addEventListener('click', () => this.saveCurrentTrade());
        }

        if (this.exportButton) {
            this.exportButton.addEventListener('click', () => this.exportJournal());
        }

        // Initial render with any saved entries
        this.renderJournalList();
        this.renderJournalStats();

        this.isInitialized = true;
    }

    onCalculatorResultsChanged(results) {
        const hasValidResults = results.shares !== '-' && results.positionSize !== '-';
        if (this.saveButton) {
            this.saveButton.disabled = !hasValidResults;
        }
    }

    // Placeholder methods for future implementation

    saveCurrentTrade() {
        const tradeData = this.state.captureTradeData();
        tradeData.symbol = this.form.symbol.value.trim();
        tradeData.notes = this.form.notes.value.trim();
        tradeData.outcome = this.form.outcome.value;

        const validation = this.validateJournalEntry(tradeData);
        if (!validation.isValid) {
            alert(validation.errors.join('\n'));
            return null;
        }

        this.state.addJournalEntry(tradeData);
        this.form.symbol.value = '';
        this.form.notes.value = '';
        this.form.outcome.value = 'pending';
        this.saveButton.disabled = true;
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
        if (entries.length === 0) {
            alert('No journal entries to export.');
            return;
        }
        exportToCSV(entries, 'journal.csv');
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

    renderJournalList() {
        if (!this.journalList) return;
        const entries = this.getJournalEntries();
        this.journalList.innerHTML = '';
        if (entries.length === 0) {
            this.journalList.textContent = 'No entries yet.';
            return;
        }
        entries.forEach(entry => {
            const display = this.formatEntryForDisplay(entry);
            const card = document.createElement('div');
            card.className = 'journal-card';
            card.innerHTML = `
                <div><strong>${display.symbol}</strong> - ${display.formattedDate}</div>
                <div>Position Size: ${display.formattedPositionSize}, Risk: ${display.formattedRisk}</div>
                <div>Outcome: ${entry.outcome}</div>
            `;
            const delBtn = document.createElement('button');
            delBtn.className = 'journal-button';
            delBtn.textContent = 'Delete';
            delBtn.addEventListener('click', () => this.state.deleteJournalEntry(entry.id));
            card.appendChild(delBtn);
            this.journalList.appendChild(card);
        });
    }

    renderJournalStats() {
        if (!this.journalStats) return;
        const stats = this.getJournalStats();
        this.journalStats.innerHTML = '';
        const statsCard = document.createElement('div');
        statsCard.className = 'journal-card';
        statsCard.innerHTML = `
            <div>Total Trades: ${stats.totalTrades}</div>
            <div>Win Rate: ${stats.winRate}%</div>
            <div>Avg Return: ${formatCurrency(stats.avgReturn)}</div>
            <div>Total PnL: ${formatCurrency(stats.totalPnL)}</div>
        `;
        this.journalStats.appendChild(statsCard);
    }

    showAddTradeModal() {
        console.log('📝 Would show add trade modal');
    }

    showEditTradeModal(entryId) {
        console.log('✏️ Would show edit trade modal for:', entryId);
    }

    showDeleteConfirmation(entryId) {
        console.log('🗑️ Would show delete confirmation for:', entryId);
    }
}

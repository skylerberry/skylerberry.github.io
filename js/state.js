// Centralized state management
export class AppState {
    constructor() {
        this.state = {
            calculator: {
                inputs: {
                    accountSize: 0,
                    riskPercentage: 1,
                    maxAccountRisk: null, // NEW FIELD - null means no limit set
                    entryPrice: 0,
                    stopLossPrice: 0,
                    targetPrice: 0
                },
                results: {
                    shares: '-',
                    positionSize: '-',
                    stopDistance: '-',
                    totalRisk: '-',
                    percentOfAccount: '-',
                    rMultiple: '- R',
                    fiveRTarget: '-',
                    profitPerShare: '-',
                    totalProfit: '-',
                    roi: '-',
                    riskReward: '-'
                },
                validation: {
                    errors: [],
                    isValid: true,
                    exceedsMaxRisk: false // NEW - tracks if position exceeds max risk
                }
            },
            journal: {
                entries: this.loadJournalEntries(),
                filters: {
                    dateRange: 'all',
                    symbol: '',
                    outcome: 'all' // win, loss, all
                },
                stats: {
                    totalTrades: 0,
                    winRate: 0,
                    avgReturn: 0,
                    totalPnL: 0
                }
            },
            ui: {
                activeSection: 'calculator', // calculator, journal
                theme: 'light',
                expandedSections: {
                    info: false,
                    scenarios: false
                }
            }
        };

        this.listeners = new Map();
    }

    // Event system for state changes
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }

    emit(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(callback => callback(data));
        }
    }

    // Calculator state methods
    updateCalculatorInput(key, value) {
        const oldValue = this.state.calculator.inputs[key];
        this.state.calculator.inputs[key] = value;

        this.emit('calculatorInputChanged', { key, value, oldValue });
        this.emit('stateChange', { section: 'calculator', type: 'input', key, value });
    }

    updateCalculatorResults(results) {
        this.state.calculator.results = { ...this.state.calculator.results, ...results };
        this.emit('calculatorResultsChanged', results);
        this.emit('stateChange', { section: 'calculator', type: 'results', results });
    }

    updateCalculatorValidation(validation) {
        this.state.calculator.validation = validation;
        this.emit('calculatorValidationChanged', validation);
    }

    // Journal state methods
    addJournalEntry(entry) {
        const entryWithId = {
            id: Date.now() + Math.random(), // Simple ID generation
            timestamp: new Date().toISOString(),
            ...entry
        };

        this.state.journal.entries.unshift(entryWithId); // Add to beginning
        this.saveJournalEntries();
        this.updateJournalStats();

        this.emit('journalEntryAdded', entryWithId);
        this.emit('stateChange', { section: 'journal', type: 'entryAdded', entry: entryWithId });
    }

    updateJournalEntry(id, updates) {
        const entryIndex = this.state.journal.entries.findIndex(entry => entry.id === id);
        if (entryIndex !== -1) {
            this.state.journal.entries[entryIndex] = {
                ...this.state.journal.entries[entryIndex],
                ...updates,
                updatedAt: new Date().toISOString()
            };
            this.saveJournalEntries();
            this.updateJournalStats();

            this.emit('journalEntryUpdated', { id, updates });
            this.emit('stateChange', { section: 'journal', type: 'entryUpdated', id, updates });
        }
    }

    deleteJournalEntry(id) {
        const entryIndex = this.state.journal.entries.findIndex(entry => entry.id === id);
        if (entryIndex !== -1) {
            const deletedEntry = this.state.journal.entries.splice(entryIndex, 1)[0];
            this.saveJournalEntries();
            this.updateJournalStats();

            this.emit('journalEntryDeleted', deletedEntry);
            this.emit('stateChange', { section: 'journal', type: 'entryDeleted', entry: deletedEntry });
        }
    }

    updateJournalFilters(filters) {
        this.state.journal.filters = { ...this.state.journal.filters, ...filters };
        this.emit('journalFiltersChanged', this.state.journal.filters);
    }

    // UI state methods
    setActiveSection(section) {
        if (this.state.ui.activeSection !== section) {
            const oldSection = this.state.ui.activeSection;
            this.state.ui.activeSection = section;
            this.emit('activeSectionChanged', { oldSection, newSection: section });
        }
    }

    toggleExpandedSection(section) {
        const currentState = this.state.ui.expandedSections[section] || false;
        this.state.ui.expandedSections[section] = !currentState;
        this.emit('sectionToggled', { section, expanded: !currentState });
    }

    setTheme(theme) {
        this.state.ui.theme = theme;
        this.emit('themeChanged', theme);
    }

    // Utility methods
    getCalculatorData() {
        return {
            inputs: { ...this.state.calculator.inputs },
            results: { ...this.state.calculator.results }
        };
    }

    captureTradeData() {
        const { inputs, results } = this.state.calculator;
        return {
            // Input data
            accountSize: inputs.accountSize,
            riskPercentage: inputs.riskPercentage,
            maxAccountRisk: inputs.maxAccountRisk, // NEW
            entryPrice: inputs.entryPrice,
            stopLossPrice: inputs.stopLossPrice,
            targetPrice: inputs.targetPrice,

            // Calculated data
            shares: parseFloat(results.shares.replace(/,/g, '')) || 0,
            positionSize: this.parseResultCurrency(results.positionSize),
            totalRisk: this.parseResultCurrency(results.totalRisk),
            rMultiple: parseFloat(results.rMultiple.replace(' R', '')) || 0,

            // Additional fields for journal
            symbol: '', // Will be filled by journal form
            notes: '',
            outcome: 'pending', // pending, win, loss
            actualExit: null,
            actualPnL: null,
            exceedsMaxRisk: this.state.calculator.validation.exceedsMaxRisk // NEW
        };
    }

    parseResultCurrency(value) {
        if (typeof value === 'string') {
            return parseFloat(value.replace(/[$,]/g, '')) || 0;
        }
        return value || 0;
    }

    hasUnsavedData() {
        const { inputs } = this.state.calculator;
        return Object.values(inputs).some((value, index) => {
            // Skip riskPercentage with default value of 1
            if (index === 1 && value === 1) return false;
            // Skip maxAccountRisk if null (no limit set)
            if (index === 2 && value === null) return false;
            return value !== '' && value !== 0 && value !== null;
        });
    }

    // Journal persistence
    loadJournalEntries() {
        try {
            const saved = localStorage.getItem('tradingJournalEntries');
            return saved ? JSON.parse(saved) : [];
        } catch (error) {
            console.warn('Failed to load journal entries:', error);
            return [];
        }
    }

    saveJournalEntries() {
        try {
            localStorage.setItem('tradingJournalEntries', JSON.stringify(this.state.journal.entries));
        } catch (error) {
            console.error('Failed to save journal entries:', error);
        }
    }

    updateJournalStats() {
        const entries = this.state.journal.entries.filter(entry => entry.outcome !== 'pending');
        const totalTrades = entries.length;

        if (totalTrades === 0) {
            this.state.journal.stats = {
                totalTrades: 0,
                winRate: 0,
                avgReturn: 0,
                totalPnL: 0
            };
            return;
        }

        const wins = entries.filter(entry => entry.outcome === 'win').length;
        const winRate = (wins / totalTrades) * 100;

        const totalPnL = entries.reduce((sum, entry) => sum + (entry.actualPnL || 0), 0);
        const avgReturn = totalPnL / totalTrades;

        this.state.journal.stats = {
            totalTrades,
            winRate: Math.round(winRate * 100) / 100,
            avgReturn: Math.round(avgReturn * 100) / 100,
            totalPnL: Math.round(totalPnL * 100) / 100
        };

        this.emit('journalStatsUpdated', this.state.journal.stats);
    }

    // Getters for easy access
    get calculator() {
        return this.state.calculator;
    }

    get journal() {
        return this.state.journal;
    }

    get ui() {
        return this.state.ui;
    }
}

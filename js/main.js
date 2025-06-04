// Main application entry point
import { Calculator } from './calculator.js';
import { Journal } from './journal.js';
import { AppState } from './state.js';
import { ThemeManager } from './theme.js';

class App {
    constructor() {
        this.state = new AppState();
        this.theme = new ThemeManager();
        this.calculator = new Calculator(this.state);
        this.journal = new Journal(this.state);

        this.init();
    }

    init() {
        // Initialize theme
        this.theme.init();

        // Initialize calculator
        this.calculator.init();

        // Initialize journal (placeholder for now)
        this.journal.init();

        // Set up section toggle and global event listeners
        this.setupSectionToggle();
        this.setupGlobalEvents();

        // Initial calculation
        this.calculator.calculate();

        console.log('📊 Stock Trading Calculator initialized');
    }

    setupSectionToggle() {
        const sections = {
            calculator: document.querySelector('.calculator-section'),
            journal: document.querySelector('.journal-section')
        };
        const calculatorTab = document.getElementById('calculatorTab');
        const journalTab = document.getElementById('journalTab');

        if (calculatorTab) {
            calculatorTab.addEventListener('click', () => this.state.setActiveSection('calculator'));
        }
        if (journalTab) {
            journalTab.addEventListener('click', () => this.state.setActiveSection('journal'));
        }

        this.state.on('activeSectionChanged', ({ oldSection, newSection }) => {
            if (sections[oldSection]) {
                sections[oldSection].classList.add('hidden');
                sections[oldSection].setAttribute('aria-hidden', 'true');
            }
            if (sections[newSection]) {
                sections[newSection].classList.remove('hidden');
                sections[newSection].setAttribute('aria-hidden', 'false');
            }
            const oldTab = document.getElementById(`${oldSection}Tab`);
            const newTab = document.getElementById(`${newSection}Tab`);
            if (oldTab) oldTab.classList.remove('active');
            if (newTab) newTab.classList.add('active');
        });

        // Ensure initial visibility
        const initial = this.state.ui.activeSection;
        this.state.emit('activeSectionChanged', { oldSection: initial, newSection: initial });
    }

    setupGlobalEvents() {
        // Warn on exit with data
        window.addEventListener('beforeunload', (e) => {
            const hasData = this.state.hasUnsavedData();
            if (hasData) {
                e.preventDefault();
                e.returnValue = 'You have unsaved data in the calculator. Are you sure you want to leave?';
                return e.returnValue;
            }
        });

        // Handle state changes
        this.state.on('stateChange', (changes) => {
            console.log('State updated:', changes);
        });
    }
}

// Initialize the app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new App());
} else {
    new App();
}

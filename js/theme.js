import { loadFromStorage, saveToStorage, STORAGE_KEYS } from './utils.js';

export class ThemeManager {
    constructor() {
        this.themeSwitch = document.getElementById('theme-switch');
        this.currentTheme = 'light';
    }

    init() {
        // Load saved theme
        const savedTheme = loadFromStorage(STORAGE_KEYS.THEME, 'light');
        this.setTheme(savedTheme);

        // Set up theme switch
        if (this.themeSwitch) {
            this.themeSwitch.checked = savedTheme === 'dark';
            this.themeSwitch.addEventListener('change', (e) => {
                this.setTheme(e.target.checked ? 'dark' : 'light');
            });
        }
    }

    setTheme(theme) {
        this.currentTheme = theme;

        // Update DOM
        document.body.classList.toggle('dark-mode', theme === 'dark');

        // Update switch if needed
        if (this.themeSwitch) {
            this.themeSwitch.checked = theme === 'dark';
        }

        // Save preference
        saveToStorage(STORAGE_KEYS.THEME, theme);

        console.log(`🎨 Theme changed to: ${theme}`);
    }

    toggle() {
        this.setTheme(this.currentTheme === 'light' ? 'dark' : 'light');
    }

    getCurrentTheme() {
        return this.currentTheme;
    }
}

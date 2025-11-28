# CLAUDE.md - Stock Trading Calculator

## Project Overview

This is **Skyler's Stock Trading Calculator**, a static GitHub Pages website that helps traders calculate safe position sizes based on risk management principles. The core philosophy is "never risk too much on a single trade."

**Live site:** `https://skylerberry.github.io`

## Tech Stack

- **Vanilla JavaScript (ES6 Modules)** - No frameworks or build tools
- **Static HTML/CSS** - Single page application
- **GitHub Pages** - Deployment platform
- **localStorage** - Client-side data persistence

This is a **zero-build** project. Changes to files are immediately deployable.

## Project Structure

```
skylerberry.github.io/
├── index.html          # Main HTML - single page app
├── styles.css          # All styles (57K+ lines, includes dark themes)
├── favicon.png         # Site favicon
└── js/
    ├── main.js                 # App entry point, initializes all modules
    ├── calculator.js           # Core position sizing calculator
    ├── state.js                # Centralized state management (AppState class)
    ├── utils.js                # Utility functions, formatters, constants
    ├── journal.js              # Trade journal module (placeholder)
    ├── logbook-lite.js         # Trade logging with CSV/TSV/PDF export
    ├── theme.js                # Theme manager (light/midnight/steel)
    ├── import-alert-modal.js   # Discord alert paste/import feature
    ├── discord-alert-parser.js # Parser for Discord trading alerts
    ├── simple-tooltip.js       # Lightweight tooltip system
    └── tooltip-setup.js        # Tooltip configuration
```

## Architecture

### Module Dependency Graph

```
main.js
├── AppState (state.js)
├── Calculator (calculator.js) ← uses utils.js
├── Journal (journal.js)
├── ThemeManager (theme.js)
├── initImportAlert (import-alert-modal.js) ← uses discord-alert-parser.js
├── initLogbookLite (logbook-lite.js)
└── tooltipSetup (tooltip-setup.js) ← uses simple-tooltip.js
```

### State Management

The app uses a custom event-driven state system (`AppState` class in `state.js`):

```javascript
// State structure
{
  calculator: { inputs: {...}, results: {...}, validation: {...} },
  journal: { entries: [], filters: {...}, stats: {...} },
  ui: { activeSection, theme, expandedSections: {...} }
}

// Event system
state.on('eventName', callback)  // Subscribe
state.emit('eventName', data)    // Publish
```

Key events:
- `calculatorInputChanged` - Input field updated
- `calculatorResultsChanged` - New calculation results
- `calc:recomputed` - Full calculation snapshot (used by logbook)
- `themeChanged` - Theme switch
- `journalEntryAdded/Updated/Deleted` - Journal operations

### Data Persistence

- **Theme:** `localStorage.theme`
- **Journal entries:** `localStorage.tradingJournalEntries`
- **Logbook rows:** `localStorage.logbook_rows_v1`

## Key Features

### 1. Position Size Calculator
Calculates shares to buy based on:
- Account size (supports K/M shorthand: "10k", "1.5m")
- Risk percentage (0.1% to 1%+ presets)
- Entry price and stop loss price
- Optional target price for R-multiple calculation

### 2. Discord Alert Import
Parses trading alerts in formats like:
```
Adding $TSLA shares @ 243.10
Stop loss @ 237.90
Risking 1%
```

### 3. Trade Journal / Logbook
- Saves trade snapshots with notes
- Tracks open positions and total risk exposure
- Supports trim management (partial position exits)
- Export to CSV, TSV, or PDF

### 4. Theming
Three themes: `light` (default), `midnight` (dark blue), `steel` (dark gray)
- CSS classes: none (light), `.dark-mode`, `.steel-mode`
- HTML attribute: `data-theme="light|midnight|steel"`

## Development Guidelines

### Code Style

- Use ES6 module syntax (`import`/`export`)
- Classes for major components (Calculator, AppState, ThemeManager)
- Functions for utilities and one-off operations
- Follow existing naming conventions (camelCase for functions/variables)

### CSS Organization

The `styles.css` file is organized with clear section headers:
```css
/* ==========================================================================
   SECTION NAME
   ========================================================================== */
```

Key sections include:
- Root variables and base styles
- Calculator input/output styles
- Modal styles (journal, import, edit, trim)
- Theme variations (dark-mode, steel-mode)
- Responsive breakpoints

### Adding New Features

1. Create a new module in `/js/` if needed
2. Import and initialize in `main.js`
3. Use `AppState` for any shared state
4. Add CSS to appropriate section in `styles.css`
5. Test all three themes

### Common Patterns

**Input formatting:**
```javascript
import { sanitizeInput, convertShorthand, formatCurrency } from './utils.js';
```

**DOM manipulation:**
```javascript
import { updateElement, toggleClass, setAttributes } from './utils.js';
```

**Debounced calculations:**
```javascript
this.debouncedCalculate = debounce(() => this.calculate(), 250);
```

## Testing

No automated tests exist. Manual testing checklist:

1. **Calculator:**
   - Enter account size with K/M shorthand
   - All risk percentage buttons work
   - Stop loss validation (must be below entry)
   - Results update in real-time

2. **Import Alert:**
   - Clipboard paste works
   - Manual input modal works
   - Parser handles various Discord formats

3. **Journal:**
   - Add trades with notes
   - Edit existing trades
   - Trim positions
   - Export CSV/PDF

4. **Themes:**
   - All three themes render correctly
   - System preference detection works
   - Theme persists on reload

## Important Constants

From `utils.js`:
```javascript
export const DEFAULTS = {
  RISK_PERCENTAGE: 1,
  EMPTY_RESULT: "-",
  R_MULTIPLE_EMPTY: "- R",
}

export const RISK_LEVELS = [0.1, 0.25, 0.5, 0.75, 1.0]

export const STORAGE_KEYS = {
  JOURNAL_ENTRIES: "tradingJournalEntries",
  THEME: "theme",
  USER_PREFERENCES: "userPreferences",
}
```

## Known Limitations

1. **Long positions only** - Stop loss must be below entry (short selling not supported)
2. **No backend** - All data is localStorage only, no sync between devices
3. **jsPDF loaded dynamically** - PDF export loads library on first use
4. **Journal module incomplete** - `journal.js` is mostly placeholder code

## Deployment

Push to main branch triggers GitHub Pages deployment automatically. No build step required.

```bash
git add .
git commit -m "Description of changes"
git push origin main
```

## Common Tasks

### Add a new input field
1. Add HTML in `index.html`
2. Add to `getElements()` in `calculator.js`
3. Add state field in `state.js` constructor
4. Add handler in `setupInputHandlers()`
5. Include in calculations if needed

### Add a new theme
1. Add CSS variables in `:root` section
2. Create `.new-theme-mode` class with overrides
3. Add radio button in `index.html` theme toggle
4. Update `ThemeManager.setTheme()` in `theme.js`
5. Update `updateMetaThemeColor()` for mobile

### Modify calculator formulas
Core calculations are in `calculator.js`:
- `calculateShares()` - Main position sizing
- `calculateRiskPerShare()` - Risk per share
- `calculateRMultiple()` - R-multiple for targets
- `calculateROI()` - Return on investment

Utility calculation functions are in `utils.js`.

## File Sizes Reference

- `index.html`: ~16KB (296 lines)
- `styles.css`: ~57KB (large due to comprehensive theming)
- `js/calculator.js`: ~16KB
- `js/logbook-lite.js`: ~37KB (includes journal modal, PDF generation)
- `js/state.js`: ~8KB
- `js/utils.js`: ~11KB

// Main application entry point
import { Calculator } from "./calculator.js"
import { Journal } from "./journal.js"
import { AppState } from "./state.js"
import { ThemeManager } from "./theme.js"
import { initImportAlert } from "./import-alert-modal.js"

class App {
  constructor() {
    this.state = new AppState()
    this.theme = new ThemeManager()
    this.calculator = new Calculator(this.state)
    this.journal = new Journal(this.state)

    this.init()
  }

  init() {
    console.log("🚀 Initializing Stock Trading Calculator...")
    
    // Initialize theme first
    this.theme.init()

    // Initialize calculator
    this.calculator.init()

    // Initialize journal (placeholder for now)
    this.journal.init()

    // Initialize import alert feature
    try {
      initImportAlert()
      console.log("✅ Import Alert feature loaded")
    } catch (error) {
      console.error("❌ Failed to initialize Import Alert:", error)
    }

    // Set up any global event listeners
    this.setupGlobalEvents()

    // Initial calculation
    this.calculator.calculate()

    console.log("📊 Stock Trading Calculator initialized successfully")
  }

  setupGlobalEvents() {
    // Warn on exit with data
    window.addEventListener("beforeunload", (e) => {
      const hasData = this.state.hasUnsavedData()
      if (hasData) {
        e.preventDefault()
        e.returnValue = "You have unsaved data in the calculator. Are you sure you want to leave?"
        return e.returnValue
      }
    })

    // Handle state changes
    this.state.on("stateChange", (changes) => {
      console.log("📝 State updated:", changes)
    })

    // Listen for import alert events (for debugging)
    document.addEventListener('alertImported', (e) => {
      console.log("📥 Alert imported:", e.detail)
    })
  }
}

// Initialize the app when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => new App())
} else {
  new App()
}

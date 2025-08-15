import { DiscordParser, Calculator as DiscordCalculator } from "./discord-parser.js"
import { AppState } from "./state.js"
import { ThemeManager } from "./theme.js"

class App {
  constructor() {
    this.state = new AppState()
    this.theme = new ThemeManager()
    this.calculator = new DiscordCalculator(this.state)
    this.discordParser = new DiscordParser(this.calculator)
  }

  async init() {
    try {
      // Initialize all modules
      this.theme.init()
      this.calculator.init()
      this.discordParser.init()

      console.log("🚀 Risk Calculator v2 initialized successfully")
    } catch (error) {
      console.error("❌ Failed to initialize app:", error)
    }
  }
}

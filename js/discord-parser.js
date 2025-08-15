// Discord Alert Parser Module
// Handles parsing of Discord trading alerts and populating calculator inputs

export class DiscordParser {
  constructor(calculator) {
    this.calculator = calculator
    this.elements = this.getElements()
    this.patterns = this.getPatterns()
  }

  getElements() {
    return {
      button: document.getElementById("discordParserButton"),
      modal: document.getElementById("discordParserModal"),
      closeButton: document.getElementById("closeModalButton"),
      input: document.getElementById("discordAlertInput"),
      parseButton: document.getElementById("parseAlertButton"),
      cancelButton: document.getElementById("cancelParseButton"),
      error: document.getElementById("parseError"),
      success: document.getElementById("parseSuccess"),
    }
  }

  getPatterns() {
    return [
      // Main pattern: "Adding $TICKER shares @ $X.XX Stop loss @ $X.XX Risking X.XX%"
      {
        name: "standard",
        regex:
          /Adding\s+\$([A-Z]+)\s+shares?\s+@\s+\$([0-9]+\.?[0-9]*)\s+Stop\s+loss\s+@\s+\$([0-9]+\.?[0-9]*)\s+Risking\s+([0-9]+\.?[0-9]*)%/i,
        groups: { ticker: 1, entry: 2, stop: 3, risk: 4 },
      },
      // Alternative pattern with different spacing/formatting
      {
        name: "flexible",
        regex:
          /Adding\s+\$([A-Z]+).*?@\s*\$([0-9]+\.?[0-9]*).*?Stop.*?@\s*\$([0-9]+\.?[0-9]*).*?Risking\s+([0-9]+\.?[0-9]*)%/i,
        groups: { ticker: 1, entry: 2, stop: 3, risk: 4 },
      },
      // Multi-line pattern
      {
        name: "multiline",
        regex:
          /Adding\s+\$([A-Z]+)[\s\S]*?@\s*\$([0-9]+\.?[0-9]*)[\s\S]*?Stop[\s\S]*?@\s*\$([0-9]+\.?[0-9]*)[\s\S]*?Risking\s+([0-9]+\.?[0-9]*)%/i,
        groups: { ticker: 1, entry: 2, stop: 3, risk: 4 },
      },
    ]
  }

  init() {
    this.setupEventListeners()
    console.log("📋 Discord Parser initialized")
  }

  setupEventListeners() {
    // Open modal
    this.elements.button.addEventListener("click", () => {
      this.openModal()
    })

    // Close modal
    this.elements.closeButton.addEventListener("click", () => {
      this.closeModal()
    })

    this.elements.cancelButton.addEventListener("click", () => {
      this.closeModal()
    })

    // Close on overlay click
    this.elements.modal.addEventListener("click", (e) => {
      if (e.target === this.elements.modal) {
        this.closeModal()
      }
    })

    // Close on Escape key
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !this.elements.modal.classList.contains("hidden")) {
        this.closeModal()
      }
    })

    // Parse button
    this.elements.parseButton.addEventListener("click", () => {
      this.parseAlert()
    })

    // Auto-parse on paste (with slight delay)
    this.elements.input.addEventListener("paste", () => {
      setTimeout(() => {
        this.clearError()
        const text = this.elements.input.value.trim()
        if (text) {
          this.validateInput(text)
        }
      }, 100)
    })

    // Real-time validation
    this.elements.input.addEventListener("input", () => {
      this.clearError()
      const text = this.elements.input.value.trim()
      if (text) {
        this.validateInput(text)
      }
    })
  }

  openModal() {
    this.elements.modal.classList.remove("hidden")
    this.elements.input.focus()
    this.clearError()
    this.elements.input.value = ""

    // Prevent body scroll
    document.body.style.overflow = "hidden"

    console.log("[v0] Discord parser modal opened")
  }

  closeModal() {
    this.elements.modal.classList.add("hidden")
    this.elements.success.classList.add("hidden")

    // Restore body scroll
    document.body.style.overflow = ""

    console.log("[v0] Discord parser modal closed")
  }

  validateInput(text) {
    const result = this.tryParseAlert(text)

    if (result.success) {
      this.clearError()
      this.elements.parseButton.disabled = false
    } else {
      this.showError(result.error)
      this.elements.parseButton.disabled = true
    }
  }

  parseAlert() {
    const text = this.elements.input.value.trim()

    if (!text) {
      this.showError("Please paste a Discord alert first")
      return
    }

    const result = this.tryParseAlert(text)

    if (result.success) {
      this.populateCalculator(result.data)
      this.showSuccess()
    } else {
      this.showError(result.error)
    }
  }

  tryParseAlert(text) {
    console.log("[v0] Attempting to parse alert:", text)

    // Clean up the text
    const cleanText = text.replace(/\s+/g, " ").trim()

    // Try each pattern
    for (const pattern of this.patterns) {
      const match = cleanText.match(pattern.regex)

      if (match) {
        console.log("[v0] Matched pattern:", pattern.name)

        const data = {
          ticker: match[pattern.groups.ticker],
          entryPrice: Number.parseFloat(match[pattern.groups.entry]),
          stopPrice: Number.parseFloat(match[pattern.groups.stop]),
          riskPercent: Number.parseFloat(match[pattern.groups.risk]),
        }

        console.log("[v0] Parsed data:", data)

        // Validate the parsed data
        const validation = this.validateParsedData(data)
        if (!validation.valid) {
          return { success: false, error: validation.error }
        }

        return { success: true, data }
      }
    }

    return {
      success: false,
      error:
        'Could not parse alert. Please check the format matches: "Adding $TICKER shares @ $X.XX Stop loss @ $X.XX Risking X.XX%"',
    }
  }

  validateParsedData(data) {
    // Check for valid numbers
    if (isNaN(data.entryPrice) || data.entryPrice <= 0) {
      return { valid: false, error: "Invalid entry price" }
    }

    if (isNaN(data.stopPrice) || data.stopPrice <= 0) {
      return { valid: false, error: "Invalid stop loss price" }
    }

    if (isNaN(data.riskPercent) || data.riskPercent <= 0 || data.riskPercent > 100) {
      return { valid: false, error: "Invalid risk percentage (must be between 0-100%)" }
    }

    // Check logical relationships
    if (data.stopPrice >= data.entryPrice) {
      return { valid: false, error: "Stop loss must be below entry price" }
    }

    // Check reasonable ranges
    if (data.riskPercent > 10) {
      return { valid: false, error: "Risk percentage seems too high (>10%). Please verify." }
    }

    if (data.entryPrice > 10000) {
      return { valid: false, error: "Entry price seems unusually high. Please verify." }
    }

    return { valid: true }
  }

  populateCalculator(data) {
    console.log("[v0] Populating calculator with:", data)

    // Get calculator input elements
    const inputs = this.calculator.elements.inputs

    // Populate the fields
    inputs.entryPrice.value = data.entryPrice.toFixed(2)
    inputs.stopLossPrice.value = data.stopPrice.toFixed(2)
    inputs.riskPercentage.value = data.riskPercent

    // Update the calculator state
    this.calculator.updateStateFromInput("entryPrice", data.entryPrice)
    this.calculator.updateStateFromInput("stopLossPrice", data.stopPrice)
    this.calculator.updateStateFromInput("riskPercentage", data.riskPercent)

    // Update active risk button
    this.calculator.updateActiveRiskButton(data.riskPercent)

    // Trigger calculation
    this.calculator.calculate()

    console.log("[v0] Calculator populated and calculated")
  }

  showSuccess() {
    this.elements.success.classList.remove("hidden")

    // Auto-close after success animation
    setTimeout(() => {
      this.closeModal()
    }, 1500)
  }

  showError(message) {
    this.elements.error.textContent = message
    this.elements.error.classList.remove("hidden")
    this.elements.parseButton.disabled = true
  }

  clearError() {
    this.elements.error.textContent = ""
    this.elements.error.classList.add("hidden")
    this.elements.parseButton.disabled = false
  }
}

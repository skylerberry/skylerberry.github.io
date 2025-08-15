import { formatNumber, sanitizeInput, convertShorthand, debounce, updateElement, toggleClass } from "./utils.js"

export class Calculator {
  constructor(appState) {
    this.state = appState
    this.elements = this.getElements()
    this.debouncedCalculate = debounce(() => this.calculate(), 250)
  }

  getElements() {
    return {
      inputs: {
        accountSize: document.getElementById("accountSize"),
        riskPercentage: document.getElementById("riskPercentage"),
        maxAccountPercentage: document.getElementById("maxAccountPercentage"),
        entryPrice: document.getElementById("entryPrice"),
        stopLossPrice: document.getElementById("stopLossPrice"),
        targetPrice: document.getElementById("targetPrice"),
      },
      results: {
        shares: document.getElementById("sharesValue"),
        positionSize: document.getElementById("positionSizeValue"),
        stopDistance: document.getElementById("stopDistanceValue"),
        totalRisk: document.getElementById("totalRiskValue"),
        percentOfAccount: document.getElementById("percentOfAccountValue"),
        rMultiple: document.getElementById("rMultipleValue"),
        fiveRTarget: document.getElementById("fiveRTargetValue"),
        profitSection: document.getElementById("profitSection"),
        profitPerShare: document.getElementById("profitPerShareValue"),
        totalProfit: document.getElementById("totalProfitValue"),
        roi: document.getElementById("roiValue"),
        riskReward: document.getElementById("riskRewardValue"),
      },
      errors: {
        stopLoss: document.getElementById("stopLossError"),
        targetPrice: document.getElementById("targetPriceError"),
      },
      controls: {
        riskButtons: document.querySelectorAll(".risk-button"),
        maxAccountButtons: document.querySelectorAll(".max-account-button"),
        clearButton: document.getElementById("clearButton"),
        infoButton: document.getElementById("infoButton"),
        infoIcon: document.getElementById("infoIcon"),
        infoContent: document.getElementById("infoContent"),
        addProfitButton: document.getElementById("addProfitButton"),
        scenariosButton: document.getElementById("scenariosButton"),
        scenariosIcon: document.getElementById("scenariosIcon"),
        scenariosContent: document.getElementById("scenariosContent"),
        quickScenariosButton: document.getElementById("quickScenariosButton"),
      },
      scenarios: {
        scenario01: document.getElementById("scenario-0-1"),
        scenario025: document.getElementById("scenario-0-25"),
        scenario05: document.getElementById("scenario-0-5"),
        scenario075: document.getElementById("scenario-0-75"),
        scenario1: document.getElementById("scenario-1"),
      },
    }
  }

  init() {
    this.setupInputHandlers()
    this.setupControlHandlers()

    this.addInitializationFeedback()

    console.log("🧮 Calculator initialized")
  }

  addInitializationFeedback() {
    // Add a subtle animation to show the calculator is ready
    const calculatorCards = document.querySelectorAll(".input-card, .results-card")
    calculatorCards.forEach((card, index) => {
      card.style.opacity = "0"
      card.style.transform = "translateY(20px)"

      setTimeout(() => {
        card.style.transition = "opacity 0.5s ease, transform 0.5s ease"
        card.style.opacity = "1"
        card.style.transform = "translateY(0)"
      }, index * 100)
    })
  }

  setupInputHandlers() {
    // Account size with shorthand conversion and comma formatting
    this.elements.inputs.accountSize.addEventListener("input", (e) => {
      const inputValue = e.target.value.trim()

      // If completely empty, clear the field and update state
      if (inputValue === "") {
        e.target.value = "" // Clear the input to show placeholder
        this.updateStateFromInput("accountSize", 0)
        this.debouncedCalculate()
        return
      }

      // Handle shorthand conversion (K/M notation)
      const converted = convertShorthand(inputValue)
      const sanitized = Number.parseFloat(sanitizeInput(inputValue))

      // If shorthand was used and converted to a different number, format it
      if (
        !isNaN(converted) &&
        converted !== sanitized &&
        (inputValue.toLowerCase().includes("k") || inputValue.toLowerCase().includes("m"))
      ) {
        const cursorPosition = e.target.selectionStart
        const originalLength = e.target.value.length
        e.target.value = formatNumber(converted)
        const newLength = e.target.value.length
        const newCursorPosition = cursorPosition + (newLength - originalLength)
        e.target.setSelectionRange(newCursorPosition, newCursorPosition)
        this.updateStateFromInput("accountSize", converted)
      } else {
        // For regular numbers, don't format during typing to allow decimal input
        const numberValue = Number.parseFloat(sanitizeInput(inputValue))
        if (!isNaN(numberValue)) {
          this.updateStateFromInput("accountSize", numberValue)
        } else {
          this.updateStateFromInput("accountSize", 0)
        }
      }

      this.debouncedCalculate()
    })

    // Handle blur event for final formatting
    this.elements.inputs.accountSize.addEventListener("blur", (e) => {
      const inputValue = e.target.value.trim()
      if (inputValue === "") {
        e.target.value = "" // Ensure field is empty on blur
        this.updateStateFromInput("accountSize", 0)
      } else if (!isNaN(Number.parseFloat(sanitizeInput(inputValue)))) {
        const numberValue = Number.parseFloat(sanitizeInput(inputValue))
        e.target.value = formatNumber(numberValue)
        this.updateStateFromInput("accountSize", numberValue)
      }
      this.calculate() // Immediate calculation on blur
    })

    // Other price inputs - handle empty values properly
    ;["entryPrice", "stopLossPrice", "targetPrice"].forEach((inputName) => {
      this.elements.inputs[inputName].addEventListener("input", (e) => {
        const inputValue = e.target.value.trim()

        if (inputValue === "") {
          this.updateStateFromInput(inputName, 0)
        } else {
          const value = Number.parseFloat(sanitizeInput(inputValue)) || 0
          this.updateStateFromInput(inputName, value)
        }
        this.debouncedCalculate()
      })

      this.elements.inputs[inputName].addEventListener("focus", (e) => {
        e.target.parentElement.style.transform = "scale(1.02)"
        e.target.parentElement.style.transition = "transform 0.2s ease"
      })

      this.elements.inputs[inputName].addEventListener("blur", (e) => {
        e.target.parentElement.style.transform = "scale(1)"
      })
    })

    // Risk percentage - handle empty but default to 1
    this.elements.inputs.riskPercentage.addEventListener("input", (e) => {
      const inputValue = e.target.value.trim()

      if (inputValue === "") {
        // Keep it empty in the UI, but use 1 for calculations
        this.updateStateFromInput("riskPercentage", 1)
        this.updateActiveRiskButton(1)
      } else {
        const value = Number.parseFloat(inputValue) || 1
        this.updateStateFromInput("riskPercentage", value)
        this.updateActiveRiskButton(value)
      }
      this.debouncedCalculate()
    })

    // Max account percentage - handle empty but default to 100
    this.elements.inputs.maxAccountPercentage.addEventListener("input", (e) => {
      const inputValue = e.target.value.trim()

      if (inputValue === "") {
        // Keep it empty in the UI, but use 100 for calculations
        this.updateStateFromInput("maxAccountPercentage", 100)
        this.updateActiveMaxAccountButton(100)
      } else {
        const value = Number.parseFloat(inputValue) || 100
        this.updateStateFromInput("maxAccountPercentage", value)
        this.updateActiveMaxAccountButton(value)
      }
      this.debouncedCalculate()
    })
  }

  setupControlHandlers() {
    // Risk buttons
    this.elements.controls.riskButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const value = Number.parseFloat(button.getAttribute("data-value"))
        this.elements.inputs.riskPercentage.value = value
        this.updateStateFromInput("riskPercentage", value)
        this.updateActiveRiskButton(value)

        this.addButtonFeedback(button)
        this.calculate()
      })
    })

    // Max account buttons
    this.elements.controls.maxAccountButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const value = Number.parseFloat(button.getAttribute("data-value"))
        this.elements.inputs.maxAccountPercentage.value = value
        this.updateStateFromInput("maxAccountPercentage", value)
        this.updateActiveMaxAccountButton(value)

        this.addButtonFeedback(button)
        this.calculate()
      })
    })

    // Clear button
    this.elements.controls.clearButton.addEventListener("click", () => {
      this.addButtonFeedback(this.elements.controls.clearButton)
      this.clearAll()
    })

    // Info toggle
    this.elements.controls.infoButton.addEventListener("click", () => {
      this.toggleInfo()
    })

    // Scenarios toggles (both buttons)
    this.elements.controls.scenariosButton.addEventListener("click", () => {
      this.toggleScenarios()
    })

    this.elements.controls.quickScenariosButton.addEventListener("click", () => {
      this.toggleScenarios(true) // true = scroll into view
    })

    // Add profit button
    if (this.elements.controls.addProfitButton) {
      this.elements.controls.addProfitButton.addEventListener("click", () => {
        this.addButtonFeedback(this.elements.controls.addProfitButton)
        this.addProfitToAccount()
      })
    }
  }

  addButtonFeedback(button) {
    button.style.transform = "scale(0.95)"
    button.style.transition = "transform 0.1s ease"

    setTimeout(() => {
      button.style.transform = "scale(1)"
    }, 100)
  }

  renderLimitedAccountDisplay(isActuallyLimited, originalPercentOfAccount, limitedPercentOfAccount) {
    const percentOfAccountCard = this.elements.results.percentOfAccount.closest(".metric-card")
    const positionSizeCard = this.elements.results.positionSize.closest(".metric-card")

    // Apply red styling to both cards only when actually limited
    if (percentOfAccountCard) {
      toggleClass(percentOfAccountCard, "limited", isActuallyLimited)
    }
    if (positionSizeCard) {
      toggleClass(positionSizeCard, "limited", isActuallyLimited)
    }
  }

  displayErrors(errors) {
    // Clear existing errors
    Object.values(this.elements.errors).forEach((errorElement) => {
      if (errorElement) {
        updateElement(errorElement, "")
        toggleClass(errorElement, "hidden", true)

        // Remove error styling from parent input container
        const inputContainer = errorElement.previousElementSibling
        if (inputContainer && inputContainer.classList.contains("input-container")) {
          inputContainer.style.borderColor = ""
        }
      }
    })

    // Display new errors with enhanced styling
    errors.forEach(({ field, message }) => {
      if (field === "stopLossPrice" && this.elements.errors.stopLoss) {
        updateElement(this.elements.errors.stopLoss, message)
        toggleClass(this.elements.errors.stopLoss, "hidden", false)

        // Add error styling to input
        const inputContainer = this.elements.errors.stopLoss.previousElementSibling
        if (inputContainer && inputContainer.classList.contains("input-container")) {
          inputContainer.style.borderColor = "var(--error)"
        }
      } else if (field === "targetPrice" && this.elements.errors.targetPrice) {
        updateElement(this.elements.errors.targetPrice, message)
        toggleClass(this.elements.errors.targetPrice, "hidden", false)

        // Add error styling to input
        const inputContainer = this.elements.errors.targetPrice.previousElementSibling
        if (inputContainer && inputContainer.classList.contains("input-container")) {
          inputContainer.style.borderColor = "var(--error)"
        }
      }
    })
  }
}

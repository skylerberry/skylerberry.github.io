// Utility functions used across the application

// ==========================================================================
// FORMATTING UTILITIES
// ==========================================================================

export function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(value)
}

export function formatPercentage(value) {
  return `${value.toFixed(2)}%`
}

export function formatDate(date) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date))
}

export function formatDateTime(date) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date))
}

// ==========================================================================
// INPUT UTILITIES
// ==========================================================================

export function sanitizeInput(value) {
  return value.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1")
}

// Updated function to handle both K and M notation
export function convertShorthand(inputValue) {
  const cleanValue = inputValue.replace(/,/g, "")

  // Check for M (millions) first
  const mMatch = cleanValue.match(/^(\d*\.?\d+)[Mm]$/)
  if (mMatch) {
    const numberPart = parseFloat(mMatch[1])
    if (!isNaN(numberPart)) {
      return numberPart * 1000000
    }
  }

  // Check for K (thousands)
  const kMatch = cleanValue.match(/^(\d*\.?\d+)[Kk]$/)
  if (kMatch) {
    const numberPart = parseFloat(kMatch[1])
    if (!isNaN(numberPart)) {
      return numberPart * 1000
    }
  }

  return parseFloat(cleanValue)
}

export function parseFloat(value) {
  if (typeof value === "string") {
    return globalThis.Number.parseFloat(value.replace(/[$,]/g, "")) || 0
  }
  return globalThis.Number.parseFloat(value) || 0
}

// ==========================================================================
// TICKER UTILITIES
// ==========================================================================

export function normalizeTicker(ticker) {
  if (!ticker || typeof ticker !== 'string') return ''
  
  // Strip leading $ and uppercase
  const normalized = ticker.replace(/^\$/, '').toUpperCase()
  
  // Only allow letters, digits, dots, and hyphens
  return normalized.replace(/[^A-Z0-9.-]/g, '')
}

// ==========================================================================
// PERFORMANCE UTILITIES
// ==========================================================================

export function debounce(func, wait) {
  let timeout
  return function executedFunction(...args) {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

export function throttle(func, limit) {
  let inThrottle
  return function () {
    const args = arguments
    
    if (!inThrottle) {
      func.apply(this, args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

export function memoize(fn, keyFn = (...args) => JSON.stringify(args)) {
  const cache = new Map()
  return (...args) => {
    const key = keyFn(...args)
    if (cache.has(key)) {
      return cache.get(key)
    }
    const result = fn(...args)
    cache.set(key, result)
    return result
  }
}

// ==========================================================================
// VALIDATION UTILITIES
// ==========================================================================

export function isValidNumber(value) {
  return !isNaN(value) && isFinite(value) && value >= 0
}

export function isValidPrice(value) {
  return isValidNumber(value) && value > 0
}

export function isValidPercentage(value) {
  return isValidNumber(value) && value >= 0 && value <= 100
}

export function validateTradeInputs(inputs) {
  const errors = []
  const { accountSize, entryPrice, stopLossPrice, targetPrice, riskPercentage } = inputs

  // Check if we have meaningful data to validate
  const hasData = accountSize > 0 || entryPrice > 0 || stopLossPrice > 0 || targetPrice > 0

  // Only validate if we have meaningful data
  if (hasData) {
    if (accountSize > 0 && !isValidPrice(accountSize)) {
      errors.push({ field: "accountSize", message: "Account size must be a positive number" })
    }

    if (entryPrice > 0 && !isValidPrice(entryPrice)) {
      errors.push({ field: "entryPrice", message: "Entry price must be a positive number" })
    }

    // Only validate stopLossPrice if both accountSize and entryPrice are set
    if (accountSize > 0 && entryPrice > 0 && stopLossPrice > 0 && !isValidPrice(stopLossPrice)) {
      errors.push({ field: "stopLossPrice", message: "Stop loss must be a positive number" })
    }

    if (!isValidPercentage(riskPercentage)) {
      errors.push({ field: "riskPercentage", message: "Risk percentage must be between 0 and 100" })
    }

    // Relational validations - only if both fields have values > 0
    if (entryPrice > 0 && stopLossPrice > 0) {
      if (stopLossPrice >= entryPrice) {
        errors.push({ field: "stopLossPrice", message: "Stop loss must be below entry price" })
      }
    }

    if (entryPrice > 0 && targetPrice > 0) {
      if (targetPrice <= entryPrice) {
        errors.push({ field: "targetPrice", message: "Target price should be above entry price" })
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    hasData,
  }
}

// ==========================================================================
// DOM UTILITIES
// ==========================================================================

export function createElement(tag, className = "", attributes = {}) {
  const element = document.createElement(tag)
  if (className) element.className = className
  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, value)
  })
  return element
}

export function updateElement(element, content) {
  if (element && content !== undefined) {
    element.textContent = content
  }
}

export function toggleClass(element, className, condition) {
  if (element) {
    element.classList.toggle(className, condition)
  }
}

export function setAttributes(element, attributes) {
  if (element) {
    Object.entries(attributes).forEach(([key, value]) => {
      element.setAttribute(key, value)
    })
  }
}

// ==========================================================================
// CALCULATION UTILITIES
// ==========================================================================

export function calculateShares(accountSize, riskPercentage, riskPerShare) {
  if (
    !isValidNumber(accountSize) ||
    !isValidNumber(riskPercentage) ||
    !isValidNumber(riskPerShare) ||
    riskPerShare === 0
  ) {
    return 0
  }

  const dollarRiskAmount = (accountSize * riskPercentage) / 100
  return Math.floor(dollarRiskAmount / riskPerShare)
}

export function calculateRiskPerShare(entryPrice, stopLossPrice) {
  if (!isValidPrice(entryPrice) || !isValidPrice(stopLossPrice)) {
    return 0
  }
  return Math.abs(entryPrice - stopLossPrice)
}

export function calculatePositionSize(shares, entryPrice) {
  if (!isValidNumber(shares) || !isValidPrice(entryPrice)) {
    return 0
  }
  return shares * entryPrice
}

export function calculateRMultiple(entryPrice, targetPrice, stopLossPrice) {
  if (!isValidPrice(entryPrice) || !isValidPrice(targetPrice) || !isValidPrice(stopLossPrice)) {
    return 0
  }

  const profit = targetPrice - entryPrice
  const risk = Math.abs(entryPrice - stopLossPrice)

  if (risk === 0) return 0
  return profit / risk
}

export function calculateROI(profit, investment) {
  if (!isValidNumber(profit) || !isValidNumber(investment) || investment === 0) {
    return 0
  }
  return (profit / investment) * 100
}

// ==========================================================================
// LOCAL STORAGE UTILITIES
// ==========================================================================

export function saveToStorage(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data))
    return true
  } catch (error) {
    console.error(`Failed to save to localStorage:`, error)
    return false
  }
}

export function loadFromStorage(key, defaultValue = null) {
  try {
    const item = localStorage.getItem(key)
    return item ? JSON.parse(item) : defaultValue
  } catch (error) {
    console.error(`Failed to load from localStorage:`, error)
    return defaultValue
  }
}

export function removeFromStorage(key) {
  try {
    localStorage.removeItem(key)
    return true
  } catch (error) {
    console.error(`Failed to remove from localStorage:`, error)
    return false
  }
}

// ==========================================================================
// EXPORT UTILITIES
// ==========================================================================

export function exportToCSV(data, filename = "export.csv") {
  if (!Array.isArray(data) || data.length === 0) {
    console.warn("No data to export")
    return
  }

  const headers = Object.keys(data[0])
  const csvContent = [
    headers.join(","),
    ...data.map((row) =>
      headers
        .map((header) => {
          const value = row[header]
          // Escape quotes and wrap in quotes if contains comma
          if (typeof value === "string" && (value.includes(",") || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`
          }
          return value
        })
        .join(","),
    ),
  ].join("\n")

  downloadFile(csvContent, filename, "text/csv")
}

export function downloadFile(content, filename, contentType = "text/plain") {
  const blob = new Blob([content], { type: contentType })
  const url = URL.createObjectURL(blob)

  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url)
}

// ==========================================================================
// CONSTANTS
// ==========================================================================

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

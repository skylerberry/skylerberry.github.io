import { loadFromStorage, saveToStorage, STORAGE_KEYS } from "./utils.js"

export class ThemeManager {
  constructor() {
    this.themeInputs = document.querySelectorAll('input[name="theme"]')
    this.currentTheme = "light"
    this.isTransitioning = false
  }

  init() {
    try {
      // Detect system preference if no saved theme
      const systemPrefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
      const defaultTheme = systemPrefersDark ? "midnight" : "light"

      // Load saved theme or use system preference
      const savedTheme = loadFromStorage(STORAGE_KEYS.THEME, defaultTheme)
      this.setTheme(savedTheme, false) // Don't animate on initial load

      // Set up theme inputs
      this.themeInputs.forEach(input => {
        input.checked = input.value === savedTheme
        input.addEventListener("change", (e) => {
          if (e.target.checked) {
            this.setTheme(e.target.value, true)
          }
        })
      })

      // Listen for system theme changes
      if (window.matchMedia) {
        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
        mediaQuery.addEventListener("change", (e) => {
          // Only auto-switch if user hasn't manually set a preference
          const hasManualPreference = localStorage.getItem(STORAGE_KEYS.THEME)
          if (!hasManualPreference) {
            this.setTheme(e.matches ? "midnight" : "light", true)
          }
        })
      }

      console.log(`🎨 Theme system initialized with: ${savedTheme}`)
    } catch (error) {
      console.warn("Theme initialization failed:", error)
      this.setTheme("light", false) // Fallback to light theme
    }
  }

  setTheme(theme, animate = true) {
    if (this.isTransitioning) return

    this.isTransitioning = true
    this.currentTheme = theme

    try {
      // Add transition class for smooth theme switching
      if (animate) {
        document.documentElement.style.setProperty("--theme-transition", "all 0.3s ease")
        document.body.style.transition = "background 0.3s ease, color 0.3s ease"
      }

      // Remove all theme classes
      document.body.classList.remove("dark-mode", "steel-mode")

      // Apply the correct theme class
      if (theme === "midnight") {
        document.body.classList.add("dark-mode")
      } else if (theme === "steel") {
        document.body.classList.add("steel-mode")
      }
      // light theme has no class (default)

      // Update HTML data attribute for CSS targeting
      document.documentElement.setAttribute("data-theme", theme)

      // Update radio button state
      this.themeInputs.forEach(input => {
        input.checked = input.value === theme
      })

      // Update meta theme-color for mobile browsers
      this.updateMetaThemeColor(theme)

      // Save preference
      saveToStorage(STORAGE_KEYS.THEME, theme)

      // Clean up transition after animation completes
      if (animate) {
        setTimeout(() => {
          document.documentElement.style.removeProperty("--theme-transition")
          document.body.style.removeProperty("transition")
          this.isTransitioning = false
        }, 300)
      } else {
        this.isTransitioning = false
      }

      // Dispatch custom event for other components to listen to
      window.dispatchEvent(
        new CustomEvent("themeChanged", {
          detail: { theme, previousTheme: this.currentTheme },
        }),
      )

      console.log(`🎨 Theme changed to: ${theme}`)
    } catch (error) {
      console.error("Failed to set theme:", error)
      this.isTransitioning = false
    }
  }

  updateMetaThemeColor(theme) {
    let themeColorMeta = document.querySelector('meta[name="theme-color"]')

    if (!themeColorMeta) {
      themeColorMeta = document.createElement("meta")
      themeColorMeta.name = "theme-color"
      document.head.appendChild(themeColorMeta)
    }

    // Set theme color based on current theme
    let themeColor = "#f0fdf4" // light theme default
    if (theme === "midnight") {
      themeColor = "#0f172a"
    } else if (theme === "steel") {
      themeColor = "#1f1f1f"
    }
    themeColorMeta.content = themeColor
  }

  toggle() {
    if (this.isTransitioning) return

    // Cycle through themes: light -> midnight -> steel -> light
    let newTheme = "light"
    if (this.currentTheme === "light") {
      newTheme = "midnight"
    } else if (this.currentTheme === "midnight") {
      newTheme = "steel"
    } else if (this.currentTheme === "steel") {
      newTheme = "light"
    }
    this.setTheme(newTheme, true)
  }

  getCurrentTheme() {
    return this.currentTheme
  }

  isDarkMode() {
    return this.currentTheme === "midnight" || this.currentTheme === "steel"
  }

  getSystemPreference() {
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      return "midnight"
    }
    return "light"
  }

  resetToSystemPreference() {
    const systemTheme = this.getSystemPreference()
    localStorage.removeItem(STORAGE_KEYS.THEME)
    this.setTheme(systemTheme, true)
    console.log(`🎨 Reset to system preference: ${systemTheme}`)
  }

  switchTheme(theme, callback) {
    if (!["light", "midnight", "steel"].includes(theme)) {
      console.warn(`Invalid theme: ${theme}. Use 'light', 'midnight', or 'steel'.`)
      return
    }

    this.setTheme(theme, true)

    if (callback && typeof callback === "function") {
      setTimeout(callback, 300) // Wait for transition to complete
    }
  }
}

export function getCurrentTheme() {
  if (document.body.classList.contains("dark-mode")) {
    return "midnight"
  } else if (document.body.classList.contains("steel-mode")) {
    return "steel"
  }
  return "light"
}

export function isDarkMode() {
  return document.body.classList.contains("dark-mode") || document.body.classList.contains("steel-mode")
}

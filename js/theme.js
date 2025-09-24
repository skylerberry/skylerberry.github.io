import { loadFromStorage, saveToStorage, STORAGE_KEYS } from "./utils.js"

export class ThemeManager {
  constructor() {
    this.themeSwitch = document.getElementById("theme-switch")
    this.currentTheme = "light"
    this.isTransitioning = false
  }

  init() {
    try {
      // Detect system preference if no saved theme
      const systemPrefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
      const defaultTheme = systemPrefersDark ? "dark" : "light"

      // Load saved theme or use system preference
      const savedTheme = loadFromStorage(STORAGE_KEYS.THEME, defaultTheme)
      this.setTheme(savedTheme, false) // Don't animate on initial load

      // Set up theme switch
      if (this.themeSwitch) {
        this.themeSwitch.checked = savedTheme === "dark"
        this.themeSwitch.addEventListener("change", (e) => {
          this.setTheme(e.target.checked ? "dark" : "light", true)
        })

        // Add keyboard support
        this.themeSwitch.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            this.toggle()
          }
        })
      }

      // Listen for system theme changes
      if (window.matchMedia) {
        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
        mediaQuery.addEventListener("change", (e) => {
          // Only auto-switch if user hasn't manually set a preference
          const hasManualPreference = localStorage.getItem(STORAGE_KEYS.THEME)
          if (!hasManualPreference) {
            this.setTheme(e.matches ? "dark" : "light", true)
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

      // Update DOM with new theme
      const isDark = theme === "dark"
      document.body.classList.toggle("dark-mode", isDark)

      // Update HTML data attribute for CSS targeting
      document.documentElement.setAttribute("data-theme", theme)

      // Update switch state
      if (this.themeSwitch) {
        this.themeSwitch.checked = isDark
        this.themeSwitch.setAttribute("aria-label", `Switch to ${isDark ? "light" : "dark"} mode`)
      }

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
    const themeColor = theme === "dark" ? "#0f172a" : "#f0fdf4"
    themeColorMeta.content = themeColor
  }

  toggle() {
    if (this.isTransitioning) return

    const newTheme = this.currentTheme === "light" ? "dark" : "light"
    this.setTheme(newTheme, true)
  }

  getCurrentTheme() {
    return this.currentTheme
  }

  isDarkMode() {
    return this.currentTheme === "dark"
  }

  getSystemPreference() {
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      return "dark"
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
    if (!["light", "dark"].includes(theme)) {
      console.warn(`Invalid theme: ${theme}. Use 'light' or 'dark'.`)
      return
    }

    this.setTheme(theme, true)

    if (callback && typeof callback === "function") {
      setTimeout(callback, 300) // Wait for transition to complete
    }
  }
}

export function getCurrentTheme() {
  return document.body.classList.contains("dark-mode") ? "dark" : "light"
}

export function isDarkMode() {
  return document.body.classList.contains("dark-mode")
}

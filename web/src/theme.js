/**
 * Stabilized Theme and Solar Sky Engine for Solar Prophecy v1.3.4
 */

export function initTheme(settings) {
  applyTheme(settings.themeMode || "system");

  // Continuous interpolation for auto mode
  setInterval(() => {
    if (localStorage.getItem("themeMode") === "auto") {
      updateSolarSky();
    }
  }, 30000); // Update every 30s for smoother sky transitions

  // Watch for system theme changes
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (localStorage.getItem("themeMode") === "system") {
      applyTheme("system");
    }
  });
}

export function applyTheme(mode) {
  localStorage.setItem("themeMode", mode);
  const body = document.body;
  const html = document.documentElement;

  // Cleanup
  body.classList.remove("cycle-dawn", "cycle-day", "cycle-evening", "cycle-night", "theme-auto");
  html.removeAttribute("data-theme");

  if (mode === "light") {
    html.setAttribute("data-theme", "light");
    updateMetaThemeColor("#f0f7ff");
  } else if (mode === "dark") {
    html.setAttribute("data-theme", "dark");
    updateMetaThemeColor("#050b1a");
  } else if (mode === "system") {
    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    html.setAttribute("data-theme", isDark ? "dark" : "light");
    updateMetaThemeColor(isDark ? "#050b1a" : "#f0f7ff");
  } else if (mode === "auto") {
    body.classList.add("theme-auto");
    updateSolarSky();
  }
  
  window.dispatchEvent(new CustomEvent("themeChanged", { detail: { mode } }));
}

function updateMetaThemeColor(color) {
  let metaThemeColor = document.querySelector("meta[name=theme-color]");
  if (!metaThemeColor) {
    metaThemeColor = document.createElement("meta");
    metaThemeColor.name = "theme-color";
    document.head.appendChild(metaThemeColor);
  }
  metaThemeColor.content = color;
}

function updateSolarSky() {
  const now = new Date();
  const mins = now.getHours() * 60 + now.getMinutes();
  const body = document.body;
  const html = document.documentElement;
  const widget = document.querySelector("#celestialWidget");

  // Time-based Celestial Widget colors
  let widgetColor = "";
  let widgetGlow = "";
  
  if (mins >= 300 && mins < 600) { // Morning
    widgetColor = "#fcd34d"; // Warm yellow
    widgetGlow = "rgba(252, 211, 77, 0.6)";
  } else if (mins >= 600 && mins < 960) { // Midday
    widgetColor = "#fbbf24"; // Bright gold
    widgetGlow = "rgba(251, 191, 36, 0.8)";
  } else if (mins >= 960 && mins < 1140) { // Evening
    widgetColor = "#f97316"; // Orange
    widgetGlow = "rgba(249, 115, 22, 0.6)";
  } else { // Night
    widgetColor = "#cbd5e1"; // Silver gray
    widgetGlow = "rgba(203, 213, 225, 0.4)";
  }

  if (widget) {
    widget.style.background = widgetColor;
    widget.style.boxShadow = `0 0 20px ${widgetGlow}`;
  }

  // Determine Cycle Phase for Auto Mode
  let phase = "night";
  let isLight = false;

  if (mins >= 240 && mins < 480) {
    phase = "dawn";
    isLight = false;
  } else if (mins >= 480 && mins < 960) {
    phase = "day";
    isLight = true;
  } else if (mins >= 960 && mins < 1140) {
    phase = "evening";
    isLight = false;
  } else {
    phase = "night";
    isLight = false;
  }

  const mode = localStorage.getItem("themeMode") || "system";
  if (mode === "auto") {
    // Remove old classes and add new phase
    body.classList.remove("cycle-dawn", "cycle-day", "cycle-evening", "cycle-night");
    body.classList.add(`cycle-${phase}`);
    html.setAttribute("data-theme", isLight ? "light" : "dark");
    
    // Set theme color from CSS var --bg
    setTimeout(() => {
      const bg = getComputedStyle(document.body).getPropertyValue("--bg").trim();
      if (bg) updateMetaThemeColor(bg);
    }, 50);
  }
}

export function getActiveThemeName() {
  const mode = localStorage.getItem("themeMode") || "system";
  if (mode === "auto") {
    const mins = new Date().getHours() * 60 + new Date().getMinutes();
    if (mins >= 240 && mins < 480) return "Dawn (Adaptive)";
    if (mins >= 480 && mins < 960) return "Day (Adaptive)";
    if (mins >= 960 && mins < 1140) return "Evening (Adaptive)";
    return "Night (Adaptive)";
  }
  if (mode === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "Dark (System)" : "Light (System)";
  }
  return mode.charAt(0).toUpperCase() + mode.slice(1);
}

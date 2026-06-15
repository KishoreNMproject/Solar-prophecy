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
    updateMetaThemeColor("#b8dff2");
  } else if (mode === "dark") {
    html.setAttribute("data-theme", "dark");
    updateMetaThemeColor("#050b1a");
  } else if (mode === "system") {
    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    html.setAttribute("data-theme", isDark ? "dark" : "light");
    updateMetaThemeColor(isDark ? "#050b1a" : "#b8dff2");
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

  if (window.SolarAndroid && window.SolarAndroid.setSystemColors) {
    const isLightText = color === "#050b1a" || color === "#1e293b" || color === "#0f172a" || color === "#020617";
    window.SolarAndroid.setSystemColors(color, isLightText);
  }
}

function updateSolarSky() {
  const now = new Date();
  const mins = now.getHours() * 60 + now.getMinutes();
  const body = document.body;
  const html = document.documentElement;
  const widget = document.querySelector("#celestialWidget");

  // Time-based Celestial Widget emojis
  let emoji = "🌙";
  
  if (mins >= 300 && mins < 720) { // 05:00 - 12:00 Morning
    emoji = "☀️";
  } else if (mins >= 720 && mins < 1020) { // 12:00 - 17:00 Afternoon
    emoji = "🌤";
  } else if (mins >= 1020 && mins < 1140) { // 17:00 - 19:00 Evening
    emoji = "🌇";
  } else { // 19:00 - 05:00 Night
    emoji = "🌙";
  }

  if (widget) {
    widget.textContent = emoji;
    widget.style.background = "transparent";
    widget.style.boxShadow = "none";
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

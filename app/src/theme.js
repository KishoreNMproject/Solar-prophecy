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

  // Force update when app comes to foreground (fixes Android background suspension bugs)
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && localStorage.getItem("themeMode") === "auto") {
      updateSolarSky();
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
  
  if (mins >= 300 && mins < 1080) { // 05:00 - 18:00 Morning/Day
    emoji = "☀️";
  } else if (mins >= 1080 && mins < 1200) { // 18:00 - 20:00 Evening
    emoji = "🌇";
  } else { // Night
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

  if (mins >= 300 && mins < 420) { // 5:00 to 7:00
    phase = "dawn";
    isLight = false;
  } else if (mins >= 420 && mins < 1080) { // 7:00 to 18:00 (6 PM)
    phase = "day";
    isLight = true;
  } else if (mins >= 1080 && mins < 1200) { // 18:00 to 20:00 (8 PM)
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
    
    // Set theme color explicitly based on phase to avoid rgb() conversion issues on Android
    let bgColor = "#020617"; // night
    if (phase === "dawn") bgColor = "#1e293b";
    if (phase === "day") bgColor = "#b8dff2";
    if (phase === "evening") bgColor = "#0f172a";
    
    updateMetaThemeColor(bgColor);
  }
}

export function getActiveThemeName() {
  const mode = localStorage.getItem("themeMode") || "system";
  if (mode === "auto") {
    const mins = new Date().getHours() * 60 + new Date().getMinutes();
    if (mins >= 300 && mins < 420) return "Dawn (Adaptive)";
    if (mins >= 420 && mins < 1080) return "Day (Adaptive)";
    if (mins >= 1080 && mins < 1200) return "Evening (Adaptive)";
    return "Night (Adaptive)";
  }
  if (mode === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "Dark (System)" : "Light (System)";
  }
  return mode.charAt(0).toUpperCase() + mode.slice(1);
}

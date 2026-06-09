/**
 * Theme and Solar Sky Engine for Solar Prophecy
 */

export function initTheme(settings) {
  applyTheme(settings.themeMode || "system");

  // If auto mode, update every minute
  setInterval(() => {
    if (localStorage.getItem("themeMode") === "auto") {
      updateSolarSky();
    }
  }, 60000);

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

  // Reset classes
  body.classList.remove("sky-morning", "sky-day", "sky-evening", "sky-night");
  html.removeAttribute("data-theme");

  if (mode === "light") {
    html.setAttribute("data-theme", "light");
  } else if (mode === "dark") {
    html.setAttribute("data-theme", "dark");
  } else if (mode === "system") {
    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    html.setAttribute("data-theme", isDark ? "dark" : "light");
  } else if (mode === "auto") {
    updateSolarSky();
  }
  
  // Dispatch event for charts to re-render if needed
  window.dispatchEvent(new CustomEvent("themeChanged", { detail: { mode } }));
}

function updateSolarSky() {
  const now = new Date();
  const hour = now.getHours();
  const body = document.body;
  const celestial = document.querySelector(".celestial-object");
  const html = document.documentElement;

  let theme = "night";
  let isLight = false;

  if (hour >= 5 && hour < 8) {
    theme = "morning";
    isLight = true;
  } else if (hour >= 8 && hour < 16) {
    theme = "day";
    isLight = true;
  } else if (hour >= 16 && hour < 19) {
    theme = "evening";
    isLight = true;
  }

  body.classList.add(`sky-${theme}`);
  html.setAttribute("data-theme", isLight ? "light" : "dark");

  // Position Sun/Moon (0% to 100% across the sky)
  // Simplified: 5am-7pm is "daylight" arc for Sun
  // 7pm-5am is "night" arc for Moon
  let progress = 0;
  if (isLight) {
    const start = 5 * 60; // 5am in mins
    const end = 19 * 60; // 7pm in mins
    const current = hour * 60 + now.getMinutes();
    progress = ((current - start) / (end - start)) * 100;
  } else {
    // Night arc
    const current = hour * 60 + now.getMinutes();
    let adjusted = current >= 1140 ? current - 1140 : current + 300; // 7pm to 5am
    progress = (adjusted / 600) * 100;
  }

  if (celestial) {
    celestial.style.left = `${progress}%`;
    // Parabolic arc for height
    const height = 15 + Math.sin((progress / 100) * Math.PI) * 40;
    celestial.style.top = `${100 - height}%`;
  }
}

export function getActiveThemeName() {
  const mode = localStorage.getItem("themeMode") || "system";
  if (mode === "auto") {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 8) return "Morning";
    if (hour >= 8 && hour < 16) return "Day";
    if (hour >= 16 && hour < 19) return "Evening";
    return "Night";
  }
  if (mode === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "Dark (System)" : "Light (System)";
  }
  return mode.charAt(0).toUpperCase() + mode.slice(1);
}

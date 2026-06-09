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
  } else if (mode === "dark") {
    html.setAttribute("data-theme", "dark");
  } else if (mode === "system") {
    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    html.setAttribute("data-theme", isDark ? "dark" : "light");
  } else if (mode === "auto") {
    body.classList.add("theme-auto");
    updateSolarSky();
  }
  
  window.dispatchEvent(new CustomEvent("themeChanged", { detail: { mode } }));
}

function updateSolarSky() {
  const now = new Date();
  const mins = now.getHours() * 60 + now.getMinutes();
  const body = document.body;
  const celestial = document.querySelector(".celestial-object");
  const html = document.documentElement;

  // Determine Cycle Phase
  let phase = "night";
  let isLight = false;

  // 04:00 - 08:00 Dawn
  if (mins >= 240 && mins < 480) {
    phase = "dawn";
    isLight = false; // Dawn is dark-ish
  } 
  // 08:00 - 16:00 Day
  else if (mins >= 480 && mins < 960) {
    phase = "day";
    isLight = true;
  }
  // 16:00 - 19:00 Evening
  else if (mins >= 960 && mins < 1140) {
    phase = "evening";
    isLight = true; // Evening is still light-ish
  }
  // 19:00 - 04:00 Night
  else {
    phase = "night";
    isLight = false;
  }

  // Remove old classes and add new phase
  body.classList.remove("cycle-dawn", "cycle-day", "cycle-evening", "cycle-night");
  body.classList.add(`cycle-${phase}`);
  html.setAttribute("data-theme", isLight ? "light" : "dark");

  // Calculate position (0% - 100% horizontally)
  let progress = 0;
  if (mins >= 300 && mins <= 1140) { // 5am to 7pm (14 hours)
    progress = ((mins - 300) / 840) * 100;
  } else {
    // Night path
    let nightMins = mins > 1140 ? mins - 1140 : mins + 300;
    progress = (nightMins / 600) * 100;
  }

  if (celestial) {
    celestial.style.left = `${progress}%`;
    // Parabolic arc for height: height = baseline + sin(prog) * amplitude
    const arcHeight = Math.sin((progress / 100) * Math.PI) * 45;
    celestial.style.top = `${60 - arcHeight}%`;
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

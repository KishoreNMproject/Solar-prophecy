export let CURRENT_VERSION = "1.8.6"; // Fallback for web
try {
  if (window.SolarAndroid && window.SolarAndroid.getAppVersion) {
    const androidVer = window.SolarAndroid.getAppVersion();
    if (androidVer) CURRENT_VERSION = androidVer;
  }
} catch (e) {
  console.error("Failed to read Android version", e);
}

export const BUILD_DATE = "June 13, 2026";

export const RELEASE_NOTES = [
  "Multi-screen application architecture",
  "Home screen redesign",
  "Graphs page",
  "History page",
  "Daily Generation History page",
  "Settings page",
  "Hamburger navigation menu",
  "Native update management improvements",
  "Daily Closing Record workflow refinements",
  "Analytics reliability improvements",
  "UI cleanup and organization"
];
const GITHUB_REPO = "KishoreNMproject/Solar-prophecy";

import { showAlert } from "./dialog.js";

let activeUpdateModal = null;
let currentUpdateRelease = null;

export async function checkForUpdates() {
  try {
    const isAndroid = !!window.SolarAndroid;
    const dismissedPromotion = localStorage.getItem("dismissed_android_promotion");
    const lastSeenVersion = localStorage.getItem("last_seen_version");

    // Web-to-Android Promotion
    if (!isAndroid && !dismissedPromotion) {
      showAndroidPromotion();
    }

    // Version Tracking for "What's New"
    if (lastSeenVersion !== CURRENT_VERSION) {
      showWhatsNew(isAndroid);
      localStorage.setItem("last_seen_version", CURRENT_VERSION);
    }

    // Check for OTA Updates from GitHub
    const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`);
    if (!response.ok) return;

    const release = await response.json();
    const latestVersion = release.tag_name.replace(/^v/, "");

    const cmp = compareVersions(latestVersion, CURRENT_VERSION);
    console.log(`[Update Check] Local: ${CURRENT_VERSION}, Remote: ${latestVersion}, Result: ${cmp}`);

    if (cmp === 1) {
      showUpdateModal(release, isAndroid);
    }
  } catch (err) {
    console.error("Update check failed:", err);
  }
}

export async function manualUpdateCheck() {
  const requestUrl = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;
  let httpStatus = "N/A";
  let responsePayload = "N/A";
  let exceptionType = "None";
  let stackTrace = "None";

  try {
    const isAndroid = !!window.SolarAndroid;
    const response = await fetch(requestUrl);
    httpStatus = response.status;
    
    responsePayload = await response.text();
    
    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status}`);
    }
    
    const release = JSON.parse(responsePayload);
    const latestVersion = release.tag_name.replace(/^v/, "");

    const cmp = compareVersions(latestVersion, CURRENT_VERSION);
    console.log(`[Manual Update Check] Local: ${CURRENT_VERSION}, Remote: ${latestVersion}, Result: ${cmp}`);

    if (cmp === 1) {
      console.log("[Manual Update Check] Showing Update Available dialog.");
      showUpdateModal(release, isAndroid);
    } else if (cmp === 0) {
      console.log("[Manual Update Check] Showing Up To Date dialog.");
      renderGlassModal({
        icon: "✅",
        title: "Up to date",
        subtitle: "Software Status",
        contentHtml: `<p>You are running the latest version of Solar Prophecy (v${CURRENT_VERSION}).</p>`,
        actions: [
          { label: "Close", primary: true, onClick: (modal) => modal.remove() }
        ]
      });
    } else {
      console.log("[Manual Update Check] Showing Development Build dialog.");
      renderGlassModal({
        icon: "🛠️",
        title: "Development Build",
        subtitle: "Software Status",
        contentHtml: `<p>You are running a pre-release or development version (v${CURRENT_VERSION}) newer than the latest public release (v${latestVersion}).</p>`,
        actions: [
          { label: "Close", primary: true, onClick: (modal) => modal.remove() }
        ]
      });
    }
    return latestVersion;
  } catch (err) {
    console.error("OTA Check Failed:", err);
    exceptionType = err.name || "Error";
    stackTrace = err.stack || err.toString();
    
    let diagHtml = `
      <div style="text-align: left; background: var(--surface-2); padding: 10px; border-radius: 8px; font-family: monospace; font-size: 0.7rem; color: var(--rose); overflow-x: auto; max-height: 200px; overflow-y: auto; margin-bottom: 12px; border: 1px solid var(--rose);">
        <strong>URL:</strong> ${requestUrl}<br>
        <strong>Status:</strong> ${httpStatus}<br>
        <strong>Exception:</strong> ${exceptionType}<br>
        <strong>Stack:</strong> ${stackTrace}<br>
        <strong>Payload:</strong> ${responsePayload.substring(0, 300)}
      </div>
      <p style="font-size: 0.8rem; color: var(--muted); text-align: center;">Diagnostic snapshot captured. Please provide this to support.</p>
    `;

    renderGlassModal({
      icon: "⚠️",
      title: "Update Check Failed",
      subtitle: "Diagnostic Data",
      contentHtml: diagHtml,
      actions: [
        { label: "Close", primary: true, onClick: (modal) => modal.remove() }
      ]
    });
    return null;
  }
}

export async function downloadLatestApk() {
  try {
    const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`);
    if (!response.ok) throw new Error("Failed to fetch release");
    const release = await response.json();
    const apkAsset = release.assets.find(a => a.name.endsWith(".apk"));
    if (apkAsset) {
      window.open(apkAsset.browser_download_url, "_blank");
    } else {
      window.open(release.html_url, "_blank");
    }
  } catch (err) {
    console.error(err);
    window.open(`https://github.com/${GITHUB_REPO}/releases/latest`, "_blank");
  }
}

export function showAboutModal() {
  const contentHtml = `
    <div style="padding-right: 8px;">
      <p style="font-size: 0.9rem; margin-bottom: 12px; color: var(--ink);">
        Solar Prophecy is a self-learning offline analytics engine that tracks, predicts, and evaluates your solar generation without the cloud.
      </p>
      <h3 style="font-size: 0.85rem; color: var(--brand); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.05em;">What's New</h3>
      <ul style="font-size: 0.85rem; padding-left: 20px; color: var(--muted); line-height: 1.6;">
        ${RELEASE_NOTES.map(note => `<li>${note}</li>`).join("")}
      </ul>
    </div>
    ${!window.SolarAndroid ? `
    <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--line);">
      <h3 style="font-size: 0.85rem; color: var(--brand); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.05em;">Android App</h3>
      <p style="font-size: 0.85rem; margin-bottom: 12px; color: var(--muted);" id="aboutAndroidVersion">Current Stable Release: Fetching...</p>
      <button class="primary" id="aboutDownloadApkBtn" style="width: 100%;">Download Android App</button>
    </div>
    ` : ""}
  `;

  const overlay = renderGlassModal({
    icon: "☀️",
    title: "Solar Prophecy",
    subtitle: "About",
    versionInfo: { current: CURRENT_VERSION, latest: BUILD_DATE },
    contentHtml: contentHtml,
    actions: [
      { label: "Close", primary: true, onClick: (modal) => modal.remove() }
    ]
  });

  if (!window.SolarAndroid) {
    const btn = overlay.querySelector("#aboutDownloadApkBtn");
    if (btn) btn.addEventListener("click", downloadLatestApk);
    
    fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`)
      .then(res => res.json())
      .then(release => {
        const verEl = overlay.querySelector("#aboutAndroidVersion");
        if (verEl) verEl.textContent = `Current Stable Release: ${release.tag_name}`;
      }).catch(console.error);
  }
}

function compareVersions(v1, v2) {
  const p1 = String(v1).split(".").map(Number);
  const p2 = String(v2).split(".").map(Number);
  for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
    const num1 = p1[i] || 0;
    const num2 = p2[i] || 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
}

function showWhatsNew(isAndroid) {
  const highlights = [
    "Solar Day Lifecycle Engine (Dawn to Closed Day)",
    "Daily Closing Record System (Post-Sunset readings)",
    "Analytics Gatekeeping (Suppressing premature warnings)",
    "Forecast Training Integrity (DCR-only training)",
    "Enhanced Model Status Dashboard",
    "Duplicate Closing Record Handling",
    "Improved Performance Metric Reliability"
  ];

  renderGlassModal({
    icon: "🚀",
    title: `Welcome to Solar Prophecy v${CURRENT_VERSION}`,
    subtitle: `What's New`,
    contentHtml: `<ul>${highlights.map(h => `<li>${h}</li>`).join("")}</ul>`,
    actions: [
      { label: "Got It", primary: true, onClick: (modal) => modal.remove() },
      { label: "View Release Notes", onClick: () => window.open(`https://github.com/${GITHUB_REPO}/releases/latest`, "_blank") }
    ]
  });
}

function showUpdateModal(release, isAndroid) {
  currentUpdateRelease = release;
  const changelogHtml = release.body 
    ? `<ul>${release.body.split("\n").filter(l => l.trim().startsWith("*") || l.trim().startsWith("-")).map(l => `<li>${l.replace(/^[* -]+/, "").trim()}</li>`).slice(0, 5).join("")}</ul>`
    : "<ul><li>Performance improvements</li><li>Bug fixes</li></ul>";

  const apkAsset = release.assets.find(a => a.name.endsWith(".apk"));
  const downloadUrl = apkAsset ? apkAsset.browser_download_url : release.html_url;

  activeUpdateModal = renderGlassModal({
    icon: isAndroid ? "🚀" : "📱",
    title: isAndroid ? "Solar Prophecy Update Available" : "Android App Update Available",
    subtitle: `What's New`,
    versionInfo: { current: CURRENT_VERSION, latest: release.tag_name },
    contentHtml: changelogHtml,
    actions: [
      { 
        label: isAndroid ? "Download Update" : "Download Android App", 
        primary: true, 
        id: "otaDownloadBtn",
        onClick: (modal) => {
          if (isAndroid && apkAsset) {
            window.SolarAndroid.startUpdateDownload(downloadUrl, release.tag_name);
            updateModalToDownloading(modal);
          } else {
            window.open(downloadUrl, "_blank");
            modal.remove();
          }
        } 
      },
      { label: "View Full Release Notes", onClick: () => window.open(release.html_url, "_blank") },
      { label: isAndroid ? "Remind Me Later" : "Dismiss", onClick: (modal) => modal.remove() }
    ]
  });
}

function updateModalToDownloading(modal) {
  const actionsContainer = modal.querySelector(".modal-actions");
  actionsContainer.innerHTML = `
    <div class="ota-progress-container">
      <div class="ota-progress-label">
        <span>Downloading Update...</span>
        <span id="otaProgressPct">0%</span>
      </div>
      <div class="ota-progress-bar">
        <div class="ota-progress-fill" id="otaProgressFill"></div>
      </div>
    </div>
    <button class="secondary" id="otaHideBtn">Hide Download</button>
  `;

  modal.querySelector("#otaHideBtn").addEventListener("click", () => {
    modal.remove();
    activeUpdateModal = null;
  });
}

function updateModalToReady(modal, release) {
  const actionsContainer = modal.querySelector(".modal-actions");
  actionsContainer.innerHTML = `
    <div style="background: var(--brand); color: #fff; padding: 12px; border-radius: 8px; margin-bottom: 16px; text-align: center; font-weight: 700; font-size: 0.95rem;">
      ✅ Update ready to install
    </div>
    <button class="primary" id="otaInstallBtn" style="margin-bottom: 12px; width: 100%;">Install Now</button>
    <button class="secondary" id="otaLaterBtn" style="width: 100%; border: 1px solid var(--line);">Later</button>
  `;

  modal.querySelector("#otaInstallBtn").addEventListener("click", () => {
    window.SolarAndroid.installUpdate(release.tag_name);
  });

  modal.querySelector("#otaLaterBtn").addEventListener("click", () => {
    modal.remove();
    activeUpdateModal = null;
  });
}

window.onInstallFailed = function(errorMsg) {
  if (!activeUpdateModal) return;
  const actionsContainer = activeUpdateModal.querySelector(".modal-actions");

  let fallbackHtml = `
    <p style="font-size: 0.9rem; color: var(--rose); margin-bottom: 12px; font-weight: 600;">Install failed: ${errorMsg}</p>
    <p style="font-size: 0.8rem; color: var(--muted); margin-bottom: 12px;">Ensure 'Install Unknown Apps' permission is granted for Solar Prophecy.</p>
    <button class="primary" id="otaOpenDownloadsBtn">Open Download Folder</button>
    <button class="secondary" id="otaCloseBtn">Close</button>
  `;
  actionsContainer.innerHTML = fallbackHtml;

  activeUpdateModal.querySelector("#otaOpenDownloadsBtn").addEventListener("click", () => {
    if (window.SolarAndroid && window.SolarAndroid.openDownloadsFolder) {
       window.SolarAndroid.openDownloadsFolder();
    }
  });

  activeUpdateModal.querySelector("#otaCloseBtn").addEventListener("click", () => {
    activeUpdateModal.remove();
    activeUpdateModal = null;
  });
};

function updateModalToFailed(modal, reason) {
  const actionsContainer = modal.querySelector(".modal-actions");
  actionsContainer.innerHTML = `
    <p style="font-size: 0.9rem; color: var(--rose); margin-bottom: 12px; font-weight: 600;">Update Failed: ${reason || "Unknown error"}</p>
    <button class="primary" id="otaRetryBtn">Retry</button>
    <button class="secondary" id="otaCloseBtn">Close</button>
  `;

  modal.querySelector("#otaRetryBtn").addEventListener("click", () => {
    modal.remove();
    showUpdateModal(currentUpdateRelease, true);
  });

  modal.querySelector("#otaCloseBtn").addEventListener("click", () => {
    modal.remove();
    activeUpdateModal = null;
  });
}

window.onUpdateDownloadProgress = function(progress, status, error) {
  if (!activeUpdateModal) {
    if (status === 'success' && currentUpdateRelease) {
      activeUpdateModal = showUpdateModal(currentUpdateRelease, true);
    }
    if (status === 'success') return;
    if (status !== 'downloading') return; 
    return;
  }

  const fill = activeUpdateModal.querySelector("#otaProgressFill");
  const text = activeUpdateModal.querySelector("#otaProgressPct");

  if (status === 'downloading') {
    if (fill) fill.style.width = progress + "%";
    if (text) text.textContent = progress + "%";
  } else if (status === 'success') {
    updateModalToReady(activeUpdateModal, currentUpdateRelease);
  } else if (status === 'failed') {
    updateModalToFailed(activeUpdateModal, error);
  }
};

function renderGlassModal({ icon, title, subtitle, versionInfo, contentHtml, actions }) {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";

  let versionInfoHtml = "";
  if (versionInfo) {
    versionInfoHtml = `
      <div class="version-info">
        <span>Current: <strong>v${versionInfo.current}</strong></span>
        <span>Latest: <strong>${versionInfo.latest}</strong></span>
      </div>
    `;
  }

  overlay.innerHTML = `
    <div class="glass-modal">
      <div class="update-header">
        <span class="update-icon">${icon}</span>
        <h2 class="update-title">${title}</h2>
      </div>
      ${versionInfoHtml}
      <div class="changelog">
        <h3>${subtitle}</h3>
        ${contentHtml}
      </div>
      <div class="modal-actions">
        ${actions.map((action, i) => `
          <button class="${action.primary ? "primary" : "glass-button"}" id="modalAction${i}">
            ${action.label}
          </button>
        `).join("")}
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  actions.forEach((action, i) => {
    overlay.querySelector(`#modalAction${i}`).addEventListener("click", () => action.onClick(overlay));
  });

  return overlay;
}

function showAndroidPromotion() {
  renderGlassModal({
    icon: "📱",
    title: "Get the Android App",
    subtitle: "Benefits",
    contentHtml: `
      <ul>
        <li>Offline support</li>
        <li>Faster experience</li>
        <li>Native Android interface</li>
        <li>Local data storage</li>
        <li>OTA updates</li>
      </ul>
    `,
    actions: [
      { 
        label: "Download Android App", 
        primary: true, 
        onClick: (modal) => {
          window.open(`https://github.com/${GITHUB_REPO}/releases/latest`, "_blank");
          modal.remove();
          localStorage.setItem("dismissed_android_promotion", "true");
        } 
      },
      { 
        label: "Dismiss", 
        onClick: (modal) => {
          modal.remove();
          localStorage.setItem("dismissed_android_promotion", "true");
        } 
      }
    ]
  });
}
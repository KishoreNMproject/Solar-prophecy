export const CURRENT_VERSION = "1.5.03";
const GITHUB_REPO = "KishoreNMproject/Solar-prophecy";

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

    if (isNewerVersion(latestVersion, CURRENT_VERSION)) {
      showUpdateModal(release, isAndroid);
    }
  } catch (err) {
    console.error("Update check failed:", err);
  }
}

export async function manualUpdateCheck() {
  try {
    const isAndroid = !!window.SolarAndroid;
    const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`);
    if (!response.ok) throw new Error("Failed to fetch latest release.");
    const release = await response.json();
    const latestVersion = release.tag_name.replace(/^v/, "");

    if (isNewerVersion(latestVersion, CURRENT_VERSION)) {
      showUpdateModal(release, isAndroid);
    } else {
      renderGlassModal({
        icon: "✅",
        title: "Up to date",
        subtitle: "Software Status",
        contentHtml: `<p>You are running the latest version of Solar Prophecy (v${CURRENT_VERSION}).</p>`,
        actions: [
          { label: "Close", primary: true, onClick: (modal) => modal.remove() }
        ]
      });
    }
    return latestVersion;
  } catch (err) {
    console.error(err);
    alert("Failed to check for updates.");
    return null;
  }
}

export function openReleaseNotes() {
  window.open(`https://github.com/${GITHUB_REPO}/releases`, "_blank");
}

function isNewerVersion(latest, current) {
  const l = latest.split(".").map(Number);
  const c = current.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if (l[i] > (c[i] || 0)) return true;
    if (l[i] < (c[i] || 0)) return false;
  }
  return false;
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
    <p style="font-size: 0.9rem; color: var(--green); margin-bottom: 12px; font-weight: 600;">Update ready to install</p>
    <button class="primary" id="otaInstallBtn">Install Now</button>
    <button class="secondary" id="otaLaterBtn">Later</button>
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
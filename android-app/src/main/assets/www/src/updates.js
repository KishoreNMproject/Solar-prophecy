const CURRENT_VERSION = "1.3.1";
const GITHUB_REPO = "KishoreNMproject/Solar-prophecy";

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
    "Smart inverter reset detection",
    "Meter epoch system",
    "Virtual cumulative generation tracking",
    "Production preservation after resets",
    "Native OTA update support",
    "Improved Android experience",
    "GitHub release integration"
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
  const changelogHtml = release.body 
    ? `<ul>${release.body.split("\n").filter(l => l.trim().startsWith("*") || l.trim().startsWith("-")).map(l => `<li>${l.replace(/^[* -]+/, "").trim()}</li>`).slice(0, 5).join("")}</ul>`
    : "<ul><li>Performance improvements</li><li>Bug fixes</li></ul>";

  const apkAsset = release.assets.find(a => a.name.endsWith(".apk"));
  const downloadUrl = apkAsset ? apkAsset.browser_download_url : release.html_url;

  renderGlassModal({
    icon: isAndroid ? "🚀" : "📱",
    title: isAndroid ? "Solar Prophecy Update Available" : "Android App Update Available",
    subtitle: `What's New`,
    versionInfo: { current: CURRENT_VERSION, latest: release.tag_name },
    contentHtml: changelogHtml,
    actions: [
      { 
        label: isAndroid ? "Download Update" : "Download Android App", 
        primary: true, 
        onClick: () => window.open(downloadUrl, "_blank") 
      },
      { label: "View Full Release Notes", onClick: () => window.open(release.html_url, "_blank") },
      { label: isAndroid ? "Remind Me Later" : "Dismiss", onClick: (modal) => modal.remove() }
    ]
  });
}

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
}

function showAndroidPromotion() {
  const container = document.querySelector(".shell");
  if (!container) return;

  const card = document.createElement("div");
  card.className = "promotion-card";
  card.innerHTML = `
    <button class="close-btn">&times;</button>
    <h3>Get the Android App</h3>
    <ul>
      <li>Offline support</li>
      <li>Faster experience</li>
      <li>Native Android interface</li>
      <li>Local data storage</li>
      <li>OTA updates</li>
    </ul>
    <button class="primary" id="promoDownloadBtn" style="margin-top: 8px;">Download Android App</button>
  `;

  container.prepend(card);

  card.querySelector(".close-btn").addEventListener("click", () => {
    card.remove();
    localStorage.setItem("dismissed_android_promotion", "true");
  });

  card.querySelector("#promoDownloadBtn").addEventListener("click", () => {
    window.open(`https://github.com/${GITHUB_REPO}/releases/latest`, "_blank");
  });
}

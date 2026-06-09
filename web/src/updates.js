const CURRENT_VERSION = "1.3.0";
const GITHUB_REPO = "KishoreNMproject/Solar-prophecy";

export async function checkForUpdates() {
  try {
    const isAndroid = !!window.SolarAndroid;
    const dismissedPromotion = localStorage.getItem("dismissed_android_promotion");

    // Web-to-Android Promotion
    if (!isAndroid && !dismissedPromotion) {
      showAndroidPromotion();
    }

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

function showUpdateModal(release, isAndroid) {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";

  const changelogHtml = release.body 
    ? `<ul>${release.body.split("\n").filter(l => l.trim().startsWith("*") || l.trim().startsWith("-")).map(l => `<li>${l.replace(/^[* -]+/, "").trim()}</li>`).slice(0, 5).join("")}</ul>`
    : "<ul><li>Performance improvements</li><li>Bug fixes</li></ul>";

  const apkAsset = release.assets.find(a => a.name.endsWith(".apk"));
  const downloadUrl = apkAsset ? apkAsset.browser_download_url : release.html_url;

  overlay.innerHTML = `
    <div class="glass-modal">
      <div class="update-header">
        <span class="update-icon">${isAndroid ? "🚀" : "📱"}</span>
        <h2 class="update-title">${isAndroid ? "Solar Prophecy Update Available" : "Android App Update Available"}</h2>
      </div>
      <div class="version-info">
        <span>Current: <strong>v${CURRENT_VERSION}</strong></span>
        <span>Latest: <strong>${release.tag_name}</strong></span>
      </div>
      <div class="changelog">
        <h3>What's New</h3>
        ${changelogHtml}
      </div>
      <div class="modal-actions">
        <button class="primary" id="downloadUpdateBtn">${isAndroid ? "Download Update" : "Download Android App"}</button>
        <button class="glass-button" id="viewReleaseNotesBtn">View Full Release Notes</button>
        <button class="secondary" id="remindLaterBtn">${isAndroid ? "Remind Me Later" : "Dismiss"}</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  overlay.querySelector("#downloadUpdateBtn").addEventListener("click", () => {
    window.open(downloadUrl, "_blank");
    if (isAndroid) {
       // In a real app, we might trigger a background download here.
    }
    overlay.remove();
  });

  overlay.querySelector("#viewReleaseNotesBtn").addEventListener("click", () => {
    window.open(release.html_url, "_blank");
  });

  overlay.querySelector("#remindLaterBtn").addEventListener("click", () => {
    overlay.remove();
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

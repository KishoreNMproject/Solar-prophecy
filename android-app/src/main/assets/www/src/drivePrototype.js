import { showDialog, showConfirm, showDangerConfirm, showAlert } from "./dialog.js";

// Cloud Sync V2 Alpha - Drive AppData Prototype
let driveAccessToken = null;
let googleSubjectId = null;
let googleEmail = null;
let googleName = null;

export function setupDrivePrototype(els) {
  // We grab elements dynamically since we just added them to HTML
  const navProfileArea = document.getElementById("navProfileArea");
  const navProfileAvatar = document.getElementById("navProfileAvatar");
  const navProfileName = document.getElementById("navProfileName");
  const navProfileStatus = document.getElementById("navProfileStatus");

  const syncMgmtSignedOut = document.getElementById("syncMgmtSignedOut");
  const syncMgmtSignedIn = document.getElementById("syncMgmtSignedIn");
  const mgmtSyncStatus = document.getElementById("mgmtSyncStatus");
  const mgmtLastSync = document.getElementById("mgmtLastSync");
  const prototypeUploadTest = document.getElementById("prototypeUploadTest");
  const prototypeDownloadTest = document.getElementById("prototypeDownloadTest");
  const mgmtLogOutBtn = document.getElementById("mgmtLogOutBtn");
  const mgmtDeleteCloudBtn = document.getElementById("mgmtDeleteCloudBtn");
  const mgmtDeleteAccountBtn = document.getElementById("mgmtDeleteAccountBtn");
  
  const diagSubjectId = document.getElementById("diagSubjectId");
  const diagFileId = document.getElementById("diagFileId");

  // Alpha hidden diagnostics panel toggling
  let versionTaps = 0;
  const diagPanel = document.getElementById("diagnosticsPanel");
  const aboutAppVersion = document.getElementById("diagAppVersion");
  if (aboutAppVersion) {
    aboutAppVersion.addEventListener("click", () => {
      versionTaps++;
      if (versionTaps >= 5) {
        diagPanel.style.display = "block";
        versionTaps = 0;
      }
    });
  }

  const renderSignedOut = () => {
    driveAccessToken = null;
    googleSubjectId = null;
    googleEmail = null;
    googleName = null;

    if (navProfileAvatar) navProfileAvatar.innerHTML = `<svg viewBox="0 0 24 24" width="32" height="32" fill="var(--ink)"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>`;
    if (navProfileName) navProfileName.textContent = "Sign In";
    if (navProfileStatus) navProfileStatus.textContent = "Optional Cloud Sync";

    if (syncMgmtSignedOut) syncMgmtSignedOut.style.display = "flex";
    if (syncMgmtSignedIn) syncMgmtSignedIn.style.display = "none";
    if (diagSubjectId) diagSubjectId.textContent = "N/A";
  };

  const renderSignedIn = (name, email, photoUrl) => {
    if (navProfileAvatar) {
      if (photoUrl && photoUrl.trim() !== "") {
        navProfileAvatar.innerHTML = `<img src="${photoUrl}" alt="Profile" style="width: 100%; height: 100%; object-fit: cover;">`;
      } else if (name && name.trim() !== "") {
        const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        navProfileAvatar.innerHTML = `<div style="font-size: 1.2rem;">${initials}</div>`;
      } else {
        navProfileAvatar.innerHTML = `<svg viewBox="0 0 24 24" width="32" height="32" fill="var(--ink)"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>`;
      }
    }
    
    if (navProfileName) navProfileName.textContent = name || email;
    if (navProfileStatus) navProfileStatus.textContent = "Signed in with Google ✓";
    
    if (syncMgmtSignedOut) syncMgmtSignedOut.style.display = "none";
    if (syncMgmtSignedIn) syncMgmtSignedIn.style.display = "flex";
  };

  // Listen for native OAuth callbacks
  window.onNativeOAuthSuccess = (accessToken, email, name, photoUrl, subjectId) => {
    driveAccessToken = accessToken;
    googleEmail = email;
    googleName = name;
    googleSubjectId = subjectId;
    
    if (diagSubjectId) diagSubjectId.textContent = subjectId || "Unknown";

    renderSignedIn(name, email, photoUrl);

    // If first-sync safety prompt is needed (e.g. check local flag if we've ever synced before)
    const hasSynced = localStorage.getItem("has_synced_cloud");
    if (!hasSynced) {
      showDialog({
        title: "Connected to Google Drive",
        message: "You have successfully connected to Google Drive. Would you like to upload your local data to the cloud, or download existing cloud data to this device?",
        actions: [
          { label: "Upload Local to Cloud", primary: true, onClick: () => prototypeUploadTest.click() },
          { label: "Download Cloud to Device", primary: false, onClick: () => prototypeDownloadTest.click() },
          { label: "Cancel", primary: false }
        ]
      });
    }
  };

  window.onNativeOAuthFailure = (errorCode) => {
    renderSignedOut();
    if (errorCode !== 12501 && errorCode !== 999) { // 12501 is user canceled, 999 is silent fail
      showAlert("Sign-In Error", "Google Sign-In failed (Code: " + errorCode + ")");
    }
  };

  window.onNativeSignOutComplete = () => {
    renderSignedOut();
    localStorage.removeItem("has_synced_cloud");
  };

  window.onNativeRevokeComplete = () => {
    renderSignedOut();
    localStorage.removeItem("has_synced_cloud");
  };

  // Attempt silent sign-in on launch
  if (window.SolarAndroid && window.SolarAndroid.silentSignInGoogle) {
    window.SolarAndroid.silentSignInGoogle();
  } else {
    renderSignedOut();
  }

  // Modals & Navigation
  if (navProfileArea) {
    navProfileArea.addEventListener('click', () => {
      if (!driveAccessToken) {
        // Show Sign-In Benefits Modal
        showDialog({
          title: "Sign in to Solar Prophecy",
          message: `
            <div style="margin-bottom: 12px; font-weight: bold;">This feature is completely optional.<br>Solar Prophecy works fully offline without signing in.</div>
            <ul style="padding-left: 20px; line-height: 1.6; color: var(--muted); margin-bottom: 24px;">
              <li>☁ <strong>Cloud Backup</strong> - Keep your solar readings safely backed up.</li>
              <li>📱 <strong>Multi-Device Access</strong> - Access your data across your devices.</li>
              <li>🔄 <strong>Automatic Synchronization</strong> - Keep data updated between installations.</li>
              <li>🛡 <strong>Data Safety</strong> - Your data remains owned by you and stored in your Google account.</li>
              <li>⚡ <strong>Offline First</strong> - Solar Prophecy continues working without internet.</li>
            </ul>
          `,
          actions: [
            { label: "Continue Offline", primary: false },
            { 
              label: "Sign in with Google", 
              primary: true, 
              onClick: () => {
                if (window.SolarAndroid && window.SolarAndroid.startGoogleSignIn) {
                  window.SolarAndroid.startGoogleSignIn();
                } else {
                  showAlert("Not Available", "Cloud Sync is only available in the Android App.");
                }
              }
            }
          ]
        });
      } else {
        // Navigate to Settings
        document.getElementById('closeNav').click();
        const settingsBtn = Array.from(document.querySelectorAll('.nav-btn')).find(b => b.dataset.target === 'screen-settings');
        if (settingsBtn) settingsBtn.click();
      }
    });
  }

  const setStatus = (msg, error = false) => {
    if (mgmtSyncStatus) {
      mgmtSyncStatus.textContent = msg;
      mgmtSyncStatus.style.color = error ? "var(--danger)" : "var(--ink)";
    }
  };

  if (prototypeUploadTest) {
    prototypeUploadTest.addEventListener('click', async () => {
      if (!driveAccessToken) return;
      setStatus("Syncing...");
      try {
        const data = {
          message: "Hello from Solar Prophecy Prototype Alpha!",
          timestamp: new Date().toISOString()
        };
        
        const fileId = await uploadToDriveAppData("test.json", JSON.stringify(data));
        setStatus("Synced ✓");
        localStorage.setItem("has_synced_cloud", "true");
        if (mgmtLastSync) mgmtLastSync.textContent = new Date().toLocaleTimeString();
        if (diagFileId) diagFileId.textContent = fileId;
      } catch (err) {
        setStatus("Error", true);
        document.getElementById("diagApiErr").textContent = err.message;
      }
    });
  }

  if (prototypeDownloadTest) {
    prototypeDownloadTest.addEventListener('click', async () => {
      if (!driveAccessToken) return;
      setStatus("Downloading...");
      try {
        const content = await downloadFromDriveAppData("test.json");
        if (content) {
          setStatus("Synced ✓");
          localStorage.setItem("has_synced_cloud", "true");
          if (mgmtLastSync) mgmtLastSync.textContent = new Date().toLocaleTimeString();
        } else {
          setStatus("No Cloud Data", true);
        }
      } catch (err) {
        setStatus("Error", true);
        document.getElementById("diagApiErr").textContent = err.message;
      }
    });
  }

  if (mgmtLogOutBtn) {
    mgmtLogOutBtn.addEventListener("click", () => {
      showConfirm("Sign Out", "Are you sure you want to sign out?", () => {
        if (window.SolarAndroid && window.SolarAndroid.signOutGoogle) {
          window.SolarAndroid.signOutGoogle();
        } else {
          renderSignedOut();
        }
      });
    });
  }

  if (mgmtDeleteCloudBtn) {
    mgmtDeleteCloudBtn.addEventListener("click", () => {
      showDangerConfirm("Delete Cloud Data", "Are you sure you want to delete your cloud data? This cannot be undone.", "Proceed", () => {
        showDangerConfirm("Final Warning", "This will permanently delete your cloud copy stored in Google Drive.\\n\\nYour local readings, settings, and backups will NOT be deleted.", "Permanently Delete", async () => {
          setStatus("Deleting...");
          try {
            await deleteFromDriveAppData("test.json");
            setStatus("Idle");
            showAlert("Success", "Cloud data has been deleted.");
            if (mgmtLastSync) mgmtLastSync.textContent = "Never";
            if (diagFileId) diagFileId.textContent = "N/A";
          } catch (e) {
            setStatus("Error", true);
            showAlert("Error", "Failed to delete cloud data: " + e.message);
          }
        });
      });
    });
  }

  if (mgmtDeleteAccountBtn) {
    mgmtDeleteAccountBtn.addEventListener("click", () => {
      showDangerConfirm("Delete Account", "This will completely disconnect Solar Prophecy, delete cloud data, and sign you out. Local data will NOT be deleted.", "Delete Account", async () => {
        setStatus("Deleting...");
        try {
          await deleteFromDriveAppData("test.json");
        } catch (e) {
          console.warn("Could not delete file during account deletion", e);
        }
        if (window.SolarAndroid && window.SolarAndroid.revokeGoogleAccess) {
          window.SolarAndroid.revokeGoogleAccess();
        } else {
          renderSignedOut();
        }
      });
    });
  }
}

// Drive REST API Helpers
async function getFileId(filename) {
  const url = \`https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name='\${filename}'&fields=files(id,name)\`;
  const res = await fetch(url, {
    headers: { Authorization: "Bearer " + driveAccessToken }
  });
  if (!res.ok) throw new Error("Search failed: " + res.statusText);
  const data = await res.json();
  if (data.files && data.files.length > 0) {
    return data.files[0].id;
  }
  return null;
}

async function uploadToDriveAppData(filename, content) {
  const existingId = await getFileId(filename);
  
  const metadata = {
    name: filename,
    parents: existingId ? undefined : ['appDataFolder']
  };

  const boundary = "-------314159265358979323846";
  const delimiter = "\\r\\n--" + boundary + "\\r\\n";
  const close_delim = "\\r\\n--" + boundary + "--";

  let multipartRequestBody =
    delimiter +
    "Content-Type: application/json\\r\\n\\r\\n" +
    JSON.stringify(metadata) +
    delimiter +
    "Content-Type: application/json\\r\\n\\r\\n" +
    content +
    close_delim;

  let url = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";
  let method = "POST";
  
  if (existingId) {
    url = \`https://www.googleapis.com/upload/drive/v3/files/\${existingId}?uploadType=multipart\`;
    method = "PATCH";
  }

  const res = await fetch(url, {
    method,
    headers: {
      "Authorization": "Bearer " + driveAccessToken,
      "Content-Type": "multipart/related; boundary=" + boundary
    },
    body: multipartRequestBody
  });

  if (!res.ok) throw new Error("Upload failed: " + res.statusText);
  const data = await res.json();
  return data.id;
}

async function downloadFromDriveAppData(filename) {
  const fileId = await getFileId(filename);
  if (!fileId) return null;

  const url = \`https://www.googleapis.com/drive/v3/files/\${fileId}?alt=media\`;
  const res = await fetch(url, {
    headers: { Authorization: "Bearer " + driveAccessToken }
  });

  if (!res.ok) throw new Error("Download failed: " + res.statusText);
  return await res.text();
}

async function deleteFromDriveAppData(filename) {
  const fileId = await getFileId(filename);
  if (!fileId) return;

  const url = \`https://www.googleapis.com/drive/v3/files/\${fileId}\`;
  const res = await fetch(url, {
    method: "DELETE",
    headers: { Authorization: "Bearer " + driveAccessToken }
  });

  if (!res.ok) throw new Error("Delete failed: " + res.statusText);
}

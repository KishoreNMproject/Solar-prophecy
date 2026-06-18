import { showDialog, showConfirm, showDangerConfirm, showAlert } from "./dialog.js";
import { getSyncMetadata, saveSyncMetadata, exportBackup, importBackup, mergeBackup, getTombstones } from "./db.js";

// Cloud Sync V2 Alpha - Drive AppData Prototype
let driveAccessToken = null;
let googleSubjectId = null;
let googleEmail = null;
let googleName = null;
let syncInterval = null;
const CLOUD_FILENAME = "solar_prophecy_backup_v2.json";

export function setupDrivePrototype(els, db) {
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
  const prototypeSyncNow = document.getElementById("prototypeSyncNow");
  const syncMgmtOnboarding = document.getElementById("syncMgmtOnboarding");
  const syncMgmtUnified = document.getElementById("syncMgmtUnified");
  const mgmtLogOutBtn = document.getElementById("mgmtLogOutBtn");
  const mgmtDeleteCloudBtn = document.getElementById("mgmtDeleteCloudBtn");
  const mgmtDeleteAccountBtn = document.getElementById("mgmtDeleteAccountBtn");
  
  const diagSubjectId = document.getElementById("diagSubjectId");
  const diagActiveFileId = document.getElementById("diagActiveFileId");
  const diagTombstoneCount = document.getElementById("diagTombstoneCount");
  const diagLastTombstone = document.getElementById("diagLastTombstone");
  const diagLastMerge = document.getElementById("diagLastMerge");
  const diagLastConflict = document.getElementById("diagLastConflict");
  const diagLastLocalModified = document.getElementById("diagLastLocalModified");
  const diagLastSuccessfulSync = document.getElementById("diagLastSuccessfulSync");
  const diagOnboardingCompleted = document.getElementById("diagOnboardingCompleted");

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


  // --- ECO-FRIENDLY SYNC ENGINE ---
  async function doEcoSync(manual = false) {
    if (!driveAccessToken) return;
    const meta = await getSyncMetadata(db);
    
    // First-Sync Safety Gate
    if (!meta.onboardingCompleted) {
      if (manual) showAlert("Sync Required", "Please complete the initial sync setup by signing out and signing in again.");
      return;
    }

    if (manual) setStatus("Syncing...");
    
    try {
      const fileInfo = await getFileId(CLOUD_FILENAME);
      const cloudModified = fileInfo ? fileInfo.modifiedTime : 0;
      
      const lastSyncStr = localStorage.getItem("lastSyncTime");
      const lastSyncTime = lastSyncStr ? parseInt(lastSyncStr, 10) : 0;
      
      const localModStr = localStorage.getItem("localLastModified");
      const localModified = localModStr ? parseInt(localModStr, 10) : 0;

      const cloudNewer = cloudModified > lastSyncTime;
      const localNewer = localModified > lastSyncTime;

      let merged = false;

      if (!cloudNewer && !localNewer) {
        // Eco-Friendly: Nothing changed!
        if (manual) setStatus("Up to Date \u2714\ufe0f");
        return;
      }

      if (cloudNewer && !localNewer) {
        // Only Cloud changed -> Download & Overwrite Local
        const cloudDataStr = await downloadFromDriveAppData(CLOUD_FILENAME);
        if (cloudDataStr) {
          const cloudBackup = JSON.parse(cloudDataStr);
          await mergeBackup(db, cloudBackup); // Use merge to safely apply
          merged = true; // Set to true so UI refreshes!
        }
      } else if (!cloudNewer && localNewer) {
        // Only Local changed -> Upload to Cloud
        const backup = await exportBackup(db);
        await uploadToDriveAppData(CLOUD_FILENAME, JSON.stringify(backup));
      } else if (cloudNewer && localNewer) {
        // BOTH changed -> Download, Merge, Upload
        const cloudDataStr = await downloadFromDriveAppData(CLOUD_FILENAME);
        if (cloudDataStr) {
          const cloudBackup = JSON.parse(cloudDataStr);
          await mergeBackup(db, cloudBackup);
          merged = true;
        }
        const backup = await exportBackup(db);
        await uploadToDriveAppData(CLOUD_FILENAME, JSON.stringify(backup));
      }

      // Sync complete
      const now = Date.now();
      localStorage.setItem("lastSyncTime", now.toString());
      if (mgmtLastSync) mgmtLastSync.textContent = new Date(now).toLocaleTimeString();
      if (diagFileId && fileInfo) diagFileId.textContent = fileInfo.id;
      setStatus("Synced \u2714\ufe0f");
      
      if (merged && window.refresh) await window.refresh();

    } catch (err) {
      console.error(err);
      setStatus("Error", true);
      document.getElementById("diagApiErr").textContent = err.message;
    }
  }

  function startSyncTimer() {
    if (syncInterval) clearInterval(syncInterval);
    syncInterval = setInterval(() => {
      doEcoSync(false);
    }, 5 * 60 * 1000); // 5 minutes
  }

  function stopSyncTimer() {
    if (syncInterval) clearInterval(syncInterval);
    syncInterval = null;
  }


  async function updateUI() {
    if (!driveAccessToken) {
      if (navProfileArea) navProfileArea.style.display = "none";
      if (syncMgmtSignedOut) syncMgmtSignedOut.style.display = "flex";
      if (syncMgmtSignedIn) syncMgmtSignedIn.style.display = "none";
      return;
    }
    
    if (navProfileArea) navProfileArea.style.display = "flex";
    if (navProfileAvatar && googleEmail) {
      navProfileAvatar.textContent = googleEmail.substring(0, 1).toUpperCase();
      navProfileAvatar.style.display = "flex";
    }
    
    if (navProfileName) navProfileName.textContent = googleName || googleEmail;
    if (navProfileStatus) navProfileStatus.textContent = "Signed in with Google \u2714\ufe0f";
    
    if (syncMgmtSignedOut) syncMgmtSignedOut.style.display = "none";
    if (syncMgmtSignedIn) syncMgmtSignedIn.style.display = "flex";
    
    const lastSyncStr = localStorage.getItem("lastSyncTime");
    if (lastSyncStr && mgmtLastSync) {
      mgmtLastSync.textContent = new Date(parseInt(lastSyncStr, 10)).toLocaleTimeString();
    }
    
    const meta = await getSyncMetadata(db);
    if (meta.onboardingCompleted) {
      if (syncMgmtOnboarding) syncMgmtOnboarding.style.display = "none";
      if (syncMgmtUnified) syncMgmtUnified.style.display = "flex";
    } else {
      if (syncMgmtOnboarding) syncMgmtOnboarding.style.display = "flex";
      if (syncMgmtUnified) syncMgmtUnified.style.display = "none";
    }
    
    // Diagnostics
    if (diagSubjectId) diagSubjectId.textContent = googleSubjectId || "N/A";
    if (diagOnboardingCompleted) diagOnboardingCompleted.textContent = meta.onboardingCompleted ? "true" : "false";
    
    const localModStr = localStorage.getItem("localLastModified");
    if (diagLastLocalModified) diagLastLocalModified.textContent = localModStr ? new Date(parseInt(localModStr, 10)).toISOString() : "N/A";
    if (diagLastSuccessfulSync) diagLastSuccessfulSync.textContent = lastSyncStr ? new Date(parseInt(lastSyncStr, 10)).toISOString() : "N/A";
    
    try {
      const tombstones = await getTombstones(db);
      if (diagTombstoneCount) diagTombstoneCount.textContent = tombstones.length.toString();
      if (diagLastTombstone) {
        if (tombstones.length > 0) {
          const sorted = [...tombstones].sort((a,b) => b.deletedAt - a.deletedAt);
          diagLastTombstone.textContent = new Date(sorted[0].deletedAt).toISOString();
        } else {
          diagLastTombstone.textContent = "N/A";
        }
      }
    } catch(e) {}
  }
  
  const renderSignedOut = () => {
    driveAccessToken = null;
    googleSubjectId = null;
    googleEmail = null;
    googleName = null;
    stopSyncTimer();

    if (navProfileAvatar) navProfileAvatar.innerHTML = `<svg viewBox="0 0 24 24" width="32" height="32" fill="var(--ink)"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>`;
    if (navProfileName) navProfileName.textContent = "Sign In";
    if (navProfileStatus) navProfileStatus.textContent = "Optional Cloud Sync";
    
    if (syncMgmtSignedOut) syncMgmtSignedOut.style.display = "flex";
    if (syncMgmtSignedIn) syncMgmtSignedIn.style.display = "none";
    if (diagSubjectId) diagSubjectId.textContent = "N/A";
  };

  const renderSignedIn = (name, email, photoUrl) => {
    updateUI();
  };

  // Listen for native OAuth callbacks
  window.onNativeOAuthSuccess = (accessToken, email, name, photoUrl, subjectId) => {
    driveAccessToken = accessToken;
    googleEmail = email;
    googleName = name;
    googleSubjectId = subjectId;
    
    if (diagSubjectId) diagSubjectId.textContent = subjectId || "Unknown";

    renderSignedIn(name, email, photoUrl);

    // First-Sync Safety Gate
    getSyncMetadata(db).then(meta => {
      if (!meta.onboardingCompleted) {
        showDialog({
          title: "Initial Synchronization",
          message: "You have successfully connected to Google Drive. Would you like to upload your local data to the cloud, or download existing cloud data to this device?",
          actions: [
            { 
              label: "Upload Local to Cloud", 
              primary: true, 
              onClick: async () => {
                setStatus("Uploading...");
                const backup = await exportBackup(db);
                await uploadToDriveAppData(CLOUD_FILENAME, JSON.stringify(backup));
                await saveSyncMetadata(db, { onboardingCompleted: true, onboardingChoice: 'upload' });
                localStorage.setItem("lastSyncTime", Date.now().toString());
                setStatus("Synced \u2714\ufe0f");
                startSyncTimer();
                updateUI();
              }
            },
            { 
              label: "Download Cloud to Device", 
              primary: false, 
              onClick: async () => {
                setStatus("Downloading...");
                const cloudDataStr = await downloadFromDriveAppData(CLOUD_FILENAME);
                if (cloudDataStr) {
                  const cloudBackup = JSON.parse(cloudDataStr);
                  await importBackup(db, cloudBackup);
                }
                await saveSyncMetadata(db, { onboardingCompleted: true, onboardingChoice: 'download' });
                localStorage.setItem("lastSyncTime", Date.now().toString());
                setStatus("Synced \u2714\ufe0f");
                startSyncTimer();
                updateUI();
                if (window.refresh) await window.refresh();
              }
            },
            { label: "Cancel", primary: false }
          ]
        });
      } else {
        // Startup Sync permitted
        doEcoSync(false);
        startSyncTimer();
      }
    });
  };

  window.onNativeOAuthFailure = (errorCode) => {
    let code = parseInt(errorCode, 10);
    renderSignedOut();
    if (code !== 12501 && code !== 999 && code !== 4) { // 12501: user canceled, 999: silent fail, 4: sign-in required
      showAlert("Sign-In Error", "Google Sign-In failed (Code: " + code + ")");
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
              <li>\u2601\ufe0f <strong>Cloud Backup</strong> - Keep your solar readings safely backed up.</li>
              <li>\uD83D\uDCF1 <strong>Multi-Device Access</strong> - Access your data across your devices.</li>
              <li>\uD83D\uDD04 <strong>Automatic Synchronization</strong> - Keep data updated between installations.</li>
              <li>\uD83D\uDEE1\ufe0f <strong>Data Safety</strong> - Your data remains owned by you and stored in your Google account.</li>
              <li>\u26A1 <strong>Offline First</strong> - Solar Prophecy continues working without internet.</li>
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

  if (prototypeSyncNow) {
    prototypeSyncNow.addEventListener('click', async () => {
      await doEcoSync(true);
      await updateUI();
    });
  }

  if (prototypeUploadTest) {
    prototypeUploadTest.addEventListener('click', async () => {
      if (!driveAccessToken) return;
      setStatus("Syncing...");
      try {
        const backup = await exportBackup(db);
        const fileId = await uploadToDriveAppData(CLOUD_FILENAME, JSON.stringify(backup));
        const now = Date.now().toString();
        localStorage.setItem("lastSyncTime", now);
        
        const meta = await getSyncMetadata(db);
        meta.onboardingCompleted = true;
        meta.onboardingChoice = "upload";
        await saveSyncMetadata(db, meta);
        
        setStatus("Synced \u2714\ufe0f");
        if (diagActiveFileId) diagActiveFileId.textContent = fileId;
        await updateUI();
      } catch (err) {
        setStatus("Error", true);
        const errSpan = document.getElementById("diagApiErr");
        if (errSpan) errSpan.textContent = err.message;
      }
    });
  }

  if (prototypeDownloadTest) {
    prototypeDownloadTest.addEventListener('click', async () => {
      if (!driveAccessToken) return;
      setStatus("Downloading...");
      try {
        const content = await downloadFromDriveAppData(CLOUD_FILENAME);
        if (content) {
          const cloudBackup = JSON.parse(content);
          await importBackup(db, cloudBackup); // Overwrite local with cloud using importBackup
          const now = Date.now().toString();
          localStorage.setItem("lastSyncTime", now);
          
          const meta = await getSyncMetadata(db);
          meta.onboardingCompleted = true;
          meta.onboardingChoice = "download";
          await saveSyncMetadata(db, meta);
          
          setStatus("Synced \u2714\ufe0f");
          if (window.refresh) await window.refresh();
          await updateUI();
        } else {
          setStatus("No Cloud Data", true);
        }
      } catch (err) {
        setStatus("Error", true);
        const errSpan = document.getElementById("diagApiErr");
        if (errSpan) errSpan.textContent = err.message;
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
        showDangerConfirm("Final Warning", "This will permanently delete your cloud copy stored in Google Drive.\n\nYour local readings, settings, and backups will NOT be deleted.", "Permanently Delete", async () => {
          setStatus("Deleting...");
          try {
            await deleteFromDriveAppData(CLOUD_FILENAME);
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
          await deleteFromDriveAppData(CLOUD_FILENAME);
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
  const url = `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name='${filename}'&fields=files(id,name,modifiedTime)`;
  const res = await fetch(url, {
    headers: { Authorization: "Bearer " + driveAccessToken }
  });
  if (!res.ok) throw new Error("Search failed: " + res.statusText);
  const data = await res.json();
  if (data.files && data.files.length > 0) {
    return { id: data.files[0].id, modifiedTime: new Date(data.files[0].modifiedTime).getTime() };
  }
  return null;
}

async function uploadToDriveAppData(filename, content) {
  const fileInfo = await getFileId(filename);
  const existingId = fileInfo ? fileInfo.id : null;
  
  const metadata = {
    name: filename,
    parents: existingId ? undefined : ['appDataFolder']
  };

  const boundary = "-------314159265358979323846";
  const delimiter = "\r\n--" + boundary + "\r\n";
  const close_delim = "\r\n--" + boundary + "--";

  let multipartRequestBody =
    delimiter +
    "Content-Type: application/json\r\n\r\n" +
    JSON.stringify(metadata) +
    delimiter +
    "Content-Type: application/json\r\n\r\n" +
    content +
    close_delim;

  let url = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";
  let method = "POST";
  
  if (existingId) {
    url = `https://www.googleapis.com/upload/drive/v3/files/${existingId}?uploadType=multipart`;
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
  const fileInfo = await getFileId(filename);
  if (!fileInfo) return null;
  const fileId = fileInfo.id;

  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  const res = await fetch(url, {
    headers: { Authorization: "Bearer " + driveAccessToken }
  });

  if (!res.ok) throw new Error("Download failed: " + res.statusText);
  return await res.text();
}

async function deleteFromDriveAppData(filename) {
  const fileInfo = await getFileId(filename);
  if (!fileInfo) return;
  const fileId = fileInfo.id;

  const url = `https://www.googleapis.com/drive/v3/files/${fileId}`;
  const res = await fetch(url, {
    method: "DELETE",
    headers: { Authorization: "Bearer " + driveAccessToken }
  });

  if (!res.ok) throw new Error("Delete failed: " + res.statusText);
}

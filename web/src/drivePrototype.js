// Cloud Sync V2 Drive AppData Prototype

let driveAccessToken = null;

export function setupDrivePrototype(els) {
  if (!els.prototypeGoogleSignIn || !els.prototypeUploadTest || !els.prototypeDownloadTest) return;

  // Listen for native OAuth callbacks
  window.onNativeOAuthSuccess = (accessToken, email, name, photoUrl) => {
    driveAccessToken = accessToken;
    els.prototypeSyncStatus.textContent = "Signed in as " + email;
    els.prototypeSyncStatus.style.color = "var(--green)";
    els.prototypeGoogleSignIn.style.display = "none";
    els.prototypeSyncControls.style.display = "flex";
  };

  window.onNativeOAuthFailure = (errorCode) => {
    els.prototypeSyncStatus.textContent = "Sign-in failed (Code: " + errorCode + ")";
    els.prototypeSyncStatus.style.color = "var(--danger)";
  };

  els.prototypeGoogleSignIn.addEventListener('click', () => {
    if (window.SolarAndroid && window.SolarAndroid.startGoogleSignIn) {
      els.prototypeSyncStatus.textContent = "Starting sign-in...";
      window.SolarAndroid.startGoogleSignIn();
    } else {
      els.prototypeSyncStatus.textContent = "Only available in Android App";
      els.prototypeSyncStatus.style.color = "var(--amber)";
    }
  });

  els.prototypeUploadTest.addEventListener('click', async () => {
    if (!driveAccessToken) return;
    els.prototypeSyncStatus.textContent = "Uploading...";
    try {
      const data = {
        message: "Hello from Solar Prophecy Prototype!",
        timestamp: new Date().toISOString()
      };
      
      const fileId = await uploadToDriveAppData("test.json", JSON.stringify(data));
      els.prototypeSyncStatus.textContent = "Uploaded successfully (ID: " + fileId + ")";
      els.prototypeSyncStatus.style.color = "var(--green)";
    } catch (err) {
      els.prototypeSyncStatus.textContent = "Upload failed: " + err.message;
      els.prototypeSyncStatus.style.color = "var(--danger)";
    }
  });

  els.prototypeDownloadTest.addEventListener('click', async () => {
    if (!driveAccessToken) return;
    els.prototypeSyncStatus.textContent = "Downloading...";
    try {
      const content = await downloadFromDriveAppData("test.json");
      if (content) {
        els.prototypeSyncStatus.textContent = "Downloaded: " + JSON.parse(content).timestamp;
        els.prototypeSyncStatus.style.color = "var(--green)";
      } else {
        els.prototypeSyncStatus.textContent = "File not found";
        els.prototypeSyncStatus.style.color = "var(--amber)";
      }
    } catch (err) {
      els.prototypeSyncStatus.textContent = "Download failed: " + err.message;
      els.prototypeSyncStatus.style.color = "var(--danger)";
    }
  });
}

// Drive REST API Helpers
async function getFileId(filename) {
  const url = `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name='${filename}'&fields=files(id,name)`;
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
  const fileId = await getFileId(filename);
  if (!fileId) return null;

  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  const res = await fetch(url, {
    headers: { Authorization: "Bearer " + driveAccessToken }
  });

  if (!res.ok) throw new Error("Download failed: " + res.statusText);
  return await res.text();
}

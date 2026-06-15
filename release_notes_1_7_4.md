# Solar Prophecy v1.7.4 Release Notes

## SECTION 1 — Solar Prophecy Release Notes

**OTA Usability Correction**
This release refines the installation experience of over-the-air updates without introducing new security heuristic triggers. 

**What changed:**
* The update system now fully leverages the Android system's native `DownloadManager` complete-notification.
* By properly declaring the downloaded payload as a package archive (`application/vnd.android.package-archive`), tapping the system notification immediately launches the native Android Package Installer. 
* The internal web UI has been updated to instruct the user to tap the system notification, while preserving the "Open Downloads Folder" button solely as a fallback.

**Why it changed:**
Forcing the user to manually browse their Downloads folder to install an update (v1.7.1) was a safe workaround but provided a suboptimal, unpolished experience. Relying on the `DownloadManager` system notification completely avoids the Play Protect heuristic—because the system itself initiates the install, not our app—while restoring a seamless, one-tap installation workflow.

**User impact:**
Updating the application is now much smoother. When an update finishes downloading, users simply swipe down and tap the native "Download complete" notification to install the update directly, without searching their files.

**Technical impact:**
This approach successfully maintains the stripped-down permission model (no `REQUEST_INSTALL_PACKAGES` required) and avoids executing a `PackageInstaller` intent inside the application boundary.

---

## SECTION 2 — Auto-Generated Git Diff Changelog

**Changed:**
* `MainActivity.java`: Added `request.setMimeType("application/vnd.android.package-archive")` to the `DownloadManager` request to ensure system-level install intents function natively.
* `updates.js`: Revised the `updateModalToReady` UI text to guide users toward the system notification for installation.
* `service-worker.js`: Bumped internal cache identifier to `v1.7.4`.
* Bumped project version to "1.7.4" and Android `versionCode` to 174.

# Solar Prophecy v1.7.1 Release Notes

## SECTION 1 — Solar Prophecy Release Notes

**Play Protect Remediation Hotfix**
This release addresses an issue where Google Play Protect incorrectly flagged Solar Prophecy as a "Harmful App" on some devices. 

**What changed:**
* Stripped the `REQUEST_INSTALL_PACKAGES` permission and simplified the manifest.
* Removed the automatic, background 1-click installation process.
* The OTA update workflow now simply downloads the update and securely opens your native Android Downloads folder for manual installation.

**Why it changed:**
Because Solar Prophecy is distributed outside of the Google Play Store, its built-in self-updating mechanism (which downloaded an APK and launched an installer intent) strongly resembled the heuristic signatures used by Play Protect to identify malware (specifically, dropper apps). Removing the direct installation intent eliminates this heuristic trigger entirely, ensuring users can safely install and trust the application without alarming security warnings.

**User impact:**
Updating the application will require one extra tap. When an update is ready, the app will open your Downloads folder instead of launching the installer directly. You will need to manually tap the `SolarProphecy-1.7.1.apk` file to complete the installation.

**Technical impact:**
The `androidx.core.content.FileProvider` and several permissions (`REQUEST_INSTALL_PACKAGES`, `READ_EXTERNAL_STORAGE`) have been entirely removed, significantly reducing the application's attack surface and required permissions.

---

## SECTION 2 — Auto-Generated Git Diff Changelog

**Changed:**
* OTA installation system now routes to `DownloadManager.ACTION_VIEW_DOWNLOADS` instead of `Intent.ACTION_VIEW` for the APK directly.
* Bumped version code to 171 and version string to "1.7.1".

**Removed:**
* `REQUEST_INSTALL_PACKAGES` permission.
* `READ_EXTERNAL_STORAGE` permission.
* `FileProvider` component from `AndroidManifest.xml` and Java implementation.

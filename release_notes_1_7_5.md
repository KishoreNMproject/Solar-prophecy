# Solar Prophecy v1.7.5 Release Notes

## SECTION 1 — Solar Prophecy Release Notes

**OTA Storage Mitigation Hotfix**
This release resolves an issue where old OTA update packages were accumulating in the user's public Downloads folder.

**What changed:**
* Implemented automatic cleanup of previous Solar Prophecy OTA APKs in the public `Downloads/SolarProphecy/` directory.
* When a new update is requested, all older installation packages are immediately removed.

**Why it changed:**
Physical-device testing confirmed that the public downloads folder was accumulating multiple outdated `.apk` files, taking up unnecessary storage space and creating an unpolished experience where users could accidentally re-install outdated versions.

**User impact:**
Users will no longer see multiple historical updates in their Downloads folder. The OTA process will feel more application-managed by automatically cleaning up after itself.

**Technical impact:**
Added pre-download file iteration and deletion logic in `MainActivity.java` that targets the application's specific download directory inside `Environment.DIRECTORY_DOWNLOADS`. This serves as an immediate, low-risk mitigation while maintaining compatibility with the safe, zero-permission `DownloadManager` installation flow on Android 14+.

---

## SECTION 2 — Auto-Generated Git Diff Changelog

**Added:**
* `MainActivity.java`: `startUpdateDownload` now scans and deletes old `.apk` files in the `SolarProphecy` subdirectory of the public `Downloads` directory.

**Changed:**
* Bumped version code to 175 and version string to "1.7.5".
* Updated Service Worker `CACHE_NAME` to `solar-prophecy-v1.7.5`.
* Incremented `CURRENT_VERSION` fallback string to `1.7.5` in `updates.js`.

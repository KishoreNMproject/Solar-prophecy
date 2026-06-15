# Solar Prophecy v1.7.7 Release Notes

## SECTION 1 — Solar Prophecy Release Notes

**Diagnostic Logging Hotfix**
This pre-release version introduces detailed diagnostic logging to the OTA update mechanism.

**What changed:**
* Replaced the generic "Could not reach the update server" message with a detailed diagnostic modal.
* The modal now captures the HTTP status code, Request URL, Exception type, Stack trace, and a snippet of the raw payload whenever an update check fails.

**Why it changed:**
Physical-device testing revealed that OTA update checks were consistently failing on existing versions (v1.7.5, v1.7.6), despite internet connectivity. Because the failure was caught by a generic error handler, the root cause remained hidden. This update exposes the internal failure path so it can be diagnosed and fully resolved in the next stable release.

**User impact:**
If the update check fails again, users will now see a detailed error report containing the technical state of the failure. This information can be used to identify exactly why the GitHub API request or parsing logic is failing on physical Android hardware.

**Technical impact:**
Modifications were made strictly to `manualUpdateCheck()` in `updates.js` to construct an HTML modal with error information instead of simply logging to the developer console. No changes were made to the Android codebase, and the existing OTA file-management behavior is completely preserved.

---

## SECTION 2 — Auto-Generated Git Diff Changelog

**Changed:**
* `updates.js`: Rewrote `manualUpdateCheck` `try/catch` block to explicitly capture `response.status`, `err.name`, `err.stack`, and `response.text()`.
* `updates.js`: Removed the generic `showAlert()` for update check failures, replacing it with a new diagnostic `renderGlassModal()` overlay.
* Bumped project version to "1.7.7" and Android `versionCode` to 177.
* `service-worker.js`: Updated cache identifier to `solar-prophecy-v1.7.7`.

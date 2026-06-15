# Solar Prophecy v1.7.6 Release Notes

## SECTION 1 — Solar Prophecy Release Notes

**OTA UX Refactoring Hotfix**
This release refines the in-app Over-The-Air (OTA) update dialog to provide a simpler, more outcome-focused user experience.

**What changed:**
* Simplified the update readiness messaging: "Android is ready to install the update."
* Removed verbose technical explanations regarding native Android installer dependencies.
* De-emphasized the fallback action (Open Downloads Folder), prioritizing the native system notification flow.

**Why it changed:**
The previous update dialog read like a troubleshooting manual and exposed unnecessary technical implementation details to the user. This update provides a cleaner, polished experience that focuses purely on downloading and installing.

**User impact:**
Users will see a simplified success message when an OTA update is ready, removing confusion and technical jargon.

**Technical impact:**
Modifications were made strictly to the web-layer UI modal (`updates.js`). The underlying v1.7.5 storage management and automatic APK cleanup behaviors remain entirely intact.

---

## SECTION 2 — Auto-Generated Git Diff Changelog

**Changed:**
* `updates.js`: Simplified `updateModalToReady` HTML to remove technical instructions and demote the fallback button.
* Bumped version code to 176 and version string to "1.7.6".
* Updated Service Worker `CACHE_NAME` to `solar-prophecy-v1.7.6`.
* Incremented `CURRENT_VERSION` fallback string to `1.7.6` in `updates.js`.

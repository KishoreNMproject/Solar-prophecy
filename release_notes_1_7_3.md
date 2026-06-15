# Solar Prophecy v1.7.3 Release Notes

## SECTION 1 — Solar Prophecy Release Notes

**Cache-Correctness Hotfix**
This release permanently resolves an issue where installed APK updates failed to display the latest UI assets due to an aggressive offline caching policy.

**What changed:**
* Redesigned the internal `service-worker.js` lifecycle to automatically purge old caches during an APK upgrade.
* Added standard `skipWaiting()` and `clients.claim()` instructions so the web layer immediately adopts newly installed assets on launch without requiring a secondary restart.

**Why it changed:**
The initial v1 implementation of the Service Worker used a static `solar-prophecy-v1` cache name. Because this cache name was never bumped during subsequent APK updates, the Android WebView's Service Worker intercepted all local file requests and aggressively served the old, stale HTML and CSS from its cache instead of reading the new files actually packaged inside the updated APK.

**User impact:**
Users upgrading to v1.7.3 (and all future versions) will now immediately see the correct UI assets corresponding to that release build on their first launch. This guarantees that UI fixes, such as the Actual vs Forecast color contrast adjustments and the modern Home button icon (packaged in v1.7.2), are successfully displayed. 

**Technical impact:**
The Service Worker cache mechanism now properly acts as a secondary layer rather than aggressively overriding local APK file updates.

---

## SECTION 2 — Auto-Generated Git Diff Changelog

**Changed:**
* `service-worker.js`: Bumped `CACHE_NAME` to `solar-prophecy-v1.7.3`.
* `service-worker.js`: Implemented `self.skipWaiting()` and `self.clients.claim()` to guarantee immediate activation and stale cache eviction.
* `service-worker.js`: Added newly introduced internal scripts to the `ASSETS` array manifest.
* Bumped project version to "1.7.3" and Android `versionCode` to 173.

# Solar Prophecy Release v1.5.10

## SECTION 1 — Solar Prophecy Release Notes

**What changed**
* Fixed a logical inconsistency where the predicted generation for the current day could fall below the already confirmed actual live generation.
* Fixed an issue preventing the Android app from running correctly on modern Android 15/16/17 WebView environments where Service Worker threads bypass traditional WebViewAssetLoader requests.

**Why it changed**
* During intraday production, if the model predicted 1.2 kWh but the user had already generated 1.41 kWh, the forecast was shown as lower than reality. Forecasts must extend from current reality, never regress below it.
* Service Workers on modern Android WebViews require `ServiceWorkerClientCompat` integration. Without it, the service-worker.js cache requests fail, leading to an inability to load resources properly in modern emulators and devices.

**User impact**
* The "Graphs" page forecast line will now accurately start at or above the current actual production for the day.
* Users running modern Android versions (API 35+) or updated WebViews will no longer experience crashes, empty white screens, or failing resources.

**Technical impact**
* Added `liveTodayGeneration` clamping validation within the `buildForecasts` pipeline. Overrides are logged appropriately.
* Implemented `ServiceWorkerControllerCompat` in `MainActivity.java` allowing `WebViewAssetLoader` to seamlessly serve local assets to Service Worker fetch events.

## SECTION 2 — Auto-Generated Git Diff Changelog

**Changed**
* `android-app/build.gradle`
* `android-app/src/main/assets/www/src/analytics.js`
* `android-app/src/main/java/app/solarprophecy/MainActivity.java`
* `package.json`
* `web/src/analytics.js`

**Fixed**
* Forecast baseline continuity regression (analytics.js)
* Modern Android WebView ServiceWorker interception (MainActivity.java)

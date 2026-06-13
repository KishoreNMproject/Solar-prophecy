# Solar Prophecy Release v1.5.13 (Corrective Release)

## SECTION 1 — Solar Prophecy Release Notes

**What changed**
* Fixed installed version detection failure (Update Dialog Loop).
* Improved update status text visibility with a high-contrast badge.
* Restored danger-state styling for the delete confirmation button.
* Rebuilt forecast-to-actual substitution logic so actual values immediately replace forecasts upon entry.

**Why it changed**
* **Version Detection:** The update checker previously used a hardcoded fallback string instead of reading the actual installed APK `versionName`. This caused the app to think an update was available even when already running the latest build.
* **Update Visibility:** The previous color (`var(--green)`) on standard light-mode backgrounds was completely unreadable.
* **Delete Button:** A visual regression made the destructive delete action look like a normal secondary button, risking accidental deletions.
* **Forecast Replacement:** The chart and metrics generated a "forecast" bar that persisted even when a user added an intraday reading. The new logic immediately classifies the incoming actual data as authoritative (`kind: "actual"`).

**User impact**
* The app will no longer endlessly prompt for updates when already up-to-date.
* Status messages regarding updates are instantly readable.
* Accidental deletions are significantly less likely.
* Dashboard charts and tomorrow's forecast dynamically reflect new intraday entries correctly.

**Technical impact**
* Added `@JavascriptInterface getAppVersion()` to `SolarAndroidBridge` in `MainActivity.java` allowing `updates.js` to correctly source the version string natively from the Android Package Manager.
* Modified `buildForecasts` in `analytics.js` to override `kind` with `"actual"` and correctly point the `tomorrowPrediction` index to the actual `+1` day key instead of the array head.
* Added explicit `.danger` class definitions in `styles.css` using `var(--rose)` and high-contrast styling.

## SECTION 2 — Auto-Generated Git Diff Changelog

**Fixed**
* Android APK native `versionName` extraction in JavaScript update loops.
* Dialog button styling (danger state rendering).
* Forecast replacement overlap (intraday recordings correctly register as `actual`).
* `tomorrowPrediction` indexing in `buildForecasts`.

**Changed**
* `android-app/src/main/java/app/solarprophecy/MainActivity.java`
* `web/src/updates.js`
* `web/src/dialog.js`
* `web/styles.css`
* `web/src/analytics.js`
* `android-app/build.gradle`
* `package.json`

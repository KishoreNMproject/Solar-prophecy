# SOLAR PROPHECY – FULL PROJECT STRUCTURE AUDIT
*Generated automatically from current repository state.*

## SECTION 1 – CURRENT PRODUCT OVERVIEW

**Current Application Purpose:**
Solar Prophecy is a self-learning offline solar analytics engine designed to track, evaluate, and predict solar generation patterns without relying on cloud services.

**Core Functionality:**
* Offline manual reading entry system.
* Self-correcting learning algorithm for solar forecasting.
* Multi-range generation tracking (Daily, Monthly, Trend).
* On-device database (IndexedDB) with backup/restore capabilities via Android Native intents.
* Fully autonomous Over-The-Air (OTA) APK updates directly from GitHub.

**Primary User Workflow:**
1. User enters cumulative inverter reading (with current or custom timestamp).
2. Analytics engine calculates generation deltas and identifies the "Daily Closing Record."
3. Progress charts update instantly, reflecting actual generation versus predicted targets.
4. Future forecasts dynamically recalibrate based on historical performance patterns.

**Current Development Phase:**
Stabilization & Architectural Refinement. Recent updates shifted the focus from "visual prototypes" to "Correctness First," enforcing strict rules regarding data integrity (Daily Closing Record gatekeeping).

**Supported Platforms:**
* Android (Native Wrapper via `app.solarprophecy`).
* Web Desktop/Mobile (PWA / `manifest.webmanifest`).

---

## SECTION 2 – FEATURE INVENTORY

| Feature | Status | Description | Location | Dependencies | User-Facing Behavior |
| --- | --- | --- | --- | --- | --- |
| **Reading Entry** | Stable | Manual data entry for inverter cumulative values. | `app.js`, `db.js`, UI (`#screen-home`) | IndexedDB | Form on home screen with custom timestamp toggle. |
| **Progress Chart (Today)** | Stable | Dual-color bar showing actual accumulated vs remaining forecast. | `charts.js`, `analytics.js` | HTML5 Canvas | Dynamic chart that grows/shrinks live on entry. |
| **Daily Gen History** | Stable | Historical chart of past Daily Closing Records. | `app.js`, UI (`#screen-daily-history`) | `analytics.js` | Read-only graph of confirmed past generation. |
| **Forecast Engine** | Stable | Capacity-aware generation predictor. | `analytics.js` (`buildForecasts`) | `db.js` | 7-day future bar chart, Monthly projections. |
| **Data Quality Dashboard** | Stable | Monitors reading volume and forecast readiness. | `app.js` (`renderQuality`) | `analytics.js` | Displays model readiness percentages and counts. |
| **Settings / Theme System** | Stable | Adaptive visual themes and solar array capacity configuration. | `theme.js`, `app.js` | IndexedDB | Form allowing capacity edits and Light/Dark toggles. |
| **Data Export/Import** | Stable | System backup via JSON files. | `db.js`, `MainActivity.java` | Android SAF | Exports/Imports data using native file pickers. |
| **OTA Update System** | Stable | Queries GitHub for releases, downloads, and installs APKs. | `updates.js`, `MainActivity.java` | GitHub API | Prompts users, downloads APK in background, triggers intent. |
| **Native Dialog System** | Stable | Glassmorphism-styled modals. | `dialog.js` | CSS (`.modal-overlay`) | Overlays custom UI to replace browser alerts/prompts. |

---

## SECTION 3 – UI STRUCTURE MAP

```text
Home (#screen-home)
 ├ Celestial Widget (Sun/Moon visuals)
 ├ Progress Gauge (Today's performance)
 ├ Reading Entry Form (Live input)
 ├ Model Status Panel (Learning/Ready state)
 ├ Low Generation Warning (Dynamic alerts)
 ├ Quality Warning (Data integrity alerts)
 └ Metrics Grid (Summary stats)

Graphs (#screen-graphs)
 ├ Daily Generation Chart (Canvas: #dailyChart)
 ├ Monthly Generation Chart (Canvas: #monthlyChart)
 ├ Forecast Chart (Canvas: #forecastChart)
 └ Trend Analysis Chart (Canvas: #trendChart)

History (#screen-history)
 ├ Readings (Table of raw inverter inputs)
 └ Forecast (List of numerical predictions)

Daily Gen. History (#screen-daily-history)
 └ Daily History Table (List of confirmed DCRs)

Settings (#screen-settings)
 ├ System Settings (Installation year, Capacity)
 ├ Appearance (Theme Mode selector)
 └ Data Management (Export Backup, Import Backup)

Navigation (#sideNav & Topbar)
 ├ Status Pill (Model state indicator)
 ├ Menu Options (Screen routing)
 ├ Check for Updates
 └ About
```

---

## SECTION 4 – DIALOG INVENTORY

**Browser-Native Dialog Status:** No `alert()`, `confirm()`, or `prompt()` calls remain in primary execution paths. All alerts use the custom `renderGlassModal` or standard `showDialog` wrapper.

| Dialog | Trigger | Purpose | Type | Location | Styling |
| --- | --- | --- | --- | --- | --- |
| **Generic Alert** | Errors/Info | Simple notification | `showAlert` | `dialog.js` | `primary` |
| **Generic Confirm** | Safe actions | Yes/No prompt | `showConfirm` | `dialog.js` | `primary`, `secondary` |
| **Danger Confirm** | Deletions | High-risk confirmation | `showDangerConfirm` | `dialog.js` | `danger` (`var(--rose)`) |
| **Update Available** | `updates.js` | Prompts OTA download | `showUpdateModal` | `updates.js` | Custom UI with Progress Bar |
| **What's New** | Version mismatch | Welcomes user post-update | `showWhatsNew` | `updates.js` | `primary` |
| **Up To Date** | Manual check | Confirms latest version | `manualUpdateCheck` | `updates.js` | `primary` |
| **About Modal** | Nav Menu | App info & features | `showAboutModal` | `updates.js` | Standard |
| **Android Promo** | Web Browser | Promotes APK usage | `showAndroidPromotion` | `updates.js` | Standard |

---

## SECTION 5 – CHART SYSTEM INVENTORY

**Rendering Engine:** Vanilla HTML5 `<canvas>` via Context 2D. No external libraries (e.g., Chart.js) are used.

**Charts Documented:**
1. **Daily Chart:** Bar chart showing up to 45 days. Sources from `dailySeries`.
2. **Monthly Chart:** Bar chart showing monthly aggregates. Sources from `monthlySeries`.
3. **Forecast Chart:** Bar chart showing 7-day predictions. Sources from `forecastSeries`.
4. **Trend Chart:** Line chart showing 14-day rolling averages over 90 days.

**Data & Rendering Logic:**
* **Historical Days:** Points labeled `kind: "actual"`. Rendered as solid dark cyan blocks.
* **Future Days:** Points labeled `kind: "forecast"`. Rendered as translucent light cyan blocks.
* **Current Day (Today):** Points labeled `kind: "today"`. Employs a composite stacked rendering architecture calculating `point.actualValue` against `point.value` (Target), stacking an actual solid bar inside a translucent remaining forecast bar, with dual-labeling dynamically adjusted to prevent overlap.

---

## SECTION 6 – FORECAST ENGINE

**Location:** `web/src/analytics.js` (`buildForecasts`, `predictDay`)

**Forecast Readiness Gatekeeping:**
* **0-6 Days:** `state = "learning"` (Forecasts suppressed, UI displays "Learning").
* **7-29 Days:** `state = "limited"` (Short-term enabled, Long-term hidden).
* **30+ Days:** `state = "ready"` (Full analytics suite active).

**Data Constraints:**
* Strictly relies on `getDailyClosingRecords()`, filtering raw readings down to only observations falling in `SOLAR_PHASE.POST` (after 19:00) or `SOLAR_PHASE.CLOSED` (past dates). Intraday readings strictly do not mutate training sets.

**Generation Process:**
1. Data normalized and epoch offsets applied.
2. DCRs identified.
3. Historical generation deltas calculated.
4. `predictDay()` isolates day-of-week patterns and applies a rolling decay weight, factoring in configured `capacityKW`.
5. Confidence dynamically drops by 3.5% per consecutive forecasted day into the future.

---

## SECTION 7 – UPDATE SYSTEM

**Location:** `web/src/updates.js` & `MainActivity.java`

**Data Sources:**
* **GitHub Repository:** `https://api.github.com/repos/KishoreNMproject/Solar-prophecy/releases/latest`
* **Installed Version:** Bridged natively via `window.SolarAndroid.getAppVersion()`. Falls back to hardcoded `CURRENT_VERSION` if running in standard browser.
* **APK Download:** Extracts `.apk` asset URL from GitHub Release payload.

**Update Lifecycle:**
1. Version mismatch triggers modal.
2. User approves download -> native `startUpdateDownload` called.
3. Native `BroadcastReceiver` tracks DownloadManager status, streaming progress back via `window.onUpdateDownloadProgress`.
4. Upon completion, UI transitions to "Install Now" triggering standard Android Package Installer.

---

## SECTION 8 – STORAGE ARCHITECTURE

**Primary Database:** IndexedDB (`DB_NAME = "solar-prophecy"`, `DB_VERSION = 1`)
* `READING_STORE`: KeyPath `id`. Indexes by `timestamp`. Contains `{ id, value, timestamp, epoch, updatedAt }`.
* `SETTINGS_STORE`: KeyPath `key`. Contains configuration preferences (capacity, theme, etc.).

**Cache / LocalStorage Usage:**
* `dismissed_android_promotion` (Tracks if Web user hid APK ad).
* `last_seen_version` (Triggers 'What's New' dialog on upgrades).

**Data Retention:**
* Fully local. No external servers or telemetry. Data retained indefinitely unless explicitly deleted via Settings menu. Backups output to standard JSON.

---

## SECTION 9 – RELEASE HISTORY ANALYSIS

**Evolution Timeline:**
* **v1.6.0 (Latest):** UI Feature - Today Progress Bar System.
* **v1.5.13:** Corrective Release - Version detection fix, update status readability, danger dialog styling, forecast overwrite regression fixed.
* **v1.5.12:** Chart label clipping fixed.
* **v1.5.11:** Android 14+ SecurityException for BroadcastReceiver patched.
* **v1.5.10:** Android 14 Broadcast receiver.
* **v1.5.8:** Native Dialog Overhaul (eliminated standard `alert()`).
* **v1.5.6:** Platform Specific Update Management.
* **v1.5.03:** Daily Generation History formatting fixes.
* **v1.5.02:** Financial Insights officially removed.
* **v1.4.0:** Analytics Architecture Update (Major internal rewrite).
* **v1.3.10:** Theme stabilization, new light theme.
* **v1.3.2:** OTA update system introduced.
* **v1.2.0:** Capacity-aware forecasting added.
* **v1.1.0:** Initialization and early stability patches.

---

## SECTION 10 – REGRESSION HISTORY

| Regression | Introduced | Fixed In | Status |
| --- | --- | --- | --- |
| **Android 14 BroadcastReceiver Crash** | v1.3.2 (OTA addition) | v1.5.11 | Fixed |
| **Chart Label Disappearance** | v1.5.0 (UI overhaul) | v1.5.12 | Fixed |
| **Update Detection Loop (False Positives)** | v1.3.2 (OTA addition) | v1.5.13 | Fixed |
| **Dialog Danger Styling Drop** | v1.5.8 (Dialog overhaul) | v1.5.13 | Fixed |
| **Forecast Rendering Overlap** | v1.4.0 (Analytics update) | v1.5.13 / v1.6.0 | Fixed |

---

## SECTION 11 – ANDROID COMPATIBILITY

**Configuration File:** `android-app/build.gradle` & `AndroidManifest.xml`
* **minSdk:** 28 (Android 9 Pie)
* **targetSdk:** 35 (Android 15)
* **compileSdk:** 35
* **Permissions:** `INTERNET`, `READ_EXTERNAL_STORAGE` (maxSdk 32), `WRITE_EXTERNAL_STORAGE` (maxSdk 28), `REQUEST_INSTALL_PACKAGES`.

**Architecture:** Pure Native WebView wrapper. No Capacitor or Cordova dependencies exist. Custom JavascriptInterfaces (`SolarAndroidBridge`) handle file I/O, Version checking, and OTA Downloads.

---

## SECTION 12 – WEB DEPLOYMENT

* **Build Process:** No build step required for web. Vanilla HTML/CSS/JS.
* **Deployment Flow:** Local execution via `npx http-server`. While a `manifest.webmanifest` exists for PWA usage, there is currently NO `netlify.toml` or active automated CI/CD pipeline targeting web hosting providers. Deployment is strictly manual or via the Android APK artifact.

---

## SECTION 13 – TECHNICAL DEBT REPORT

* **Dead Code:** `old_charts.js` and `old_charts_utf8.js` remain in `web/src/` taking up space without being referenced.
* **Duplicated Logic:** Array mapping loops inside `app.js` (`model.dailySeries.map` and `model.forecastSeries.map`) share nearly identical object construction logic.
* **Fragmented Storage:** Mixed usage of `localStorage` (for UI state) and `IndexedDB` (for settings/readings). 
* **Potential Fragility:** GitHub release version parsing relies on regex `release.tag_name.replace(/^v/, "")`. If release tags deviate from the standard `v1.x.x` format, updates will break.

---

## SECTION 14 – CURRENT STATE SNAPSHOT

**Executive Summary:**
Solar Prophecy has successfully matured from a visual prototype into a structurally sound offline utility. The recent enforcement of the Daily Closing Record architecture ensures high data integrity.

* **Current Stable Feature Set:** Fully functional offline database, native SAF backups, predictive analytics gating, dual-color progress tracking, and robust OTA updates.
* **Current Known Issues:** None documented in active operation.
* **Current Architectural Strengths:** Zero external dependencies on the web layer (No NPM bundles, React, or Chart.js). Lightning fast parsing. Native Java bridge guarantees deep Android integration without Cordova bloat.
* **Current Architectural Weaknesses:** Legacy chart files lingering in source control. Lack of automated CI/CD Web deployments.
* **Recommended Next Priorities:** 
  1. Cleanup dead code (`old_charts.js`).
  2. Implement an automated Web Deployment pipeline (Netlify/GitHub Pages).
  3. Consolidate `localStorage` data into the `IndexedDB` settings store for unified data lifecycles.

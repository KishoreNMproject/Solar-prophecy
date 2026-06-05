# Solar Prophecy

Solar Prophecy is an offline-first self-learning solar analytics app for home inverter readings. The user enters only a cumulative kWh reading and a timestamp. The app derives daily production, detects missing days, learns production patterns from history, and forecasts future generation with honest confidence scores.

## Technology Stack

- Shared web app: HTML, CSS, ES modules, Canvas charts
- Local persistence: IndexedDB in the browser and Android WebView
- Offline support: PWA service worker for web, bundled assets for Android
- Android shell: Java WebView app using AndroidX WebKit `WebViewAssetLoader`
- Build system: Android Gradle project
- Tests: Node-based unit tests for the analytics engine

This stack keeps the engine portable and avoids a backend, account system, cloud dependency, or framework lock-in. The model code in `web/src/analytics.js` is pure JavaScript and can later be reused by smart inverter integrations, weather enrichment, battery analytics, or AI-assisted forecasting.

The Android build is configured with `minSdk 28`, covering Android 9 and newer. Current target SDK is 35; Android 16 devices remain forward-compatible with the app.

## Architecture

- `web/src/analytics.js`: self-learning analytics, missing-data estimation, aggregation, confidence scoring, forecasts
- `web/src/db.js`: IndexedDB persistence, import/export backup format
- `web/src/charts.js`: Canvas rendering for actual, estimated, and forecast series
- `web/src/app.js`: UI state, forms, settings, backup/restore, dashboard rendering
- `android-app/`: APK wrapper that runs the same web app offline
- `scripts/sync-android-assets.js`: copies `web/` into Android assets before APK build
- `tests/analytics.test.js`: regression checks for gaps, replacement of estimates, and confidence behavior

## Data Model

Actual readings:

```json
{
  "id": "uuid",
  "timestamp": "2026-06-05T08:00:00.000Z",
  "value": 1234.56,
  "updatedAt": "2026-06-05T08:01:00.000Z"
}
```

Settings:

```json
{
  "installationDate": "2026-01-01"
}
```

Derived daily records are not stored as truth. They are rebuilt from actual readings every time:

```json
{
  "date": "2026-06-03",
  "generation": 5.2,
  "kind": "estimated",
  "source": "gap interpolation",
  "confidence": 0.45
}
```

Kinds are:

- `actual`: derived from an interval ending in a real reading
- `estimated`: internal missing-day interpolation, never shown as an actual reading
- `forecast`: future predicted values

## Database Schema

IndexedDB database: `solar-prophecy`

Object stores:

- `readings`
  - key path: `id`
  - index: `timestamp`
  - fields: `id`, `timestamp`, `value`, `updatedAt`
- `settings`
  - key path: `key`
  - fields: `key`, `value`

Backup schema: `solar-prophecy.backup.v1`

## Forecasting Approach

The model starts with no solar-specific assumptions. It learns from the user's own series:

- average daily generation
- weekday pattern
- monthly pattern
- variability
- long-term linear trend

Forecasts blend these learned signals. Confidence is capped and based on:

- number of actual generated days
- observed calendar span
- completeness ratio versus internally estimated days

The app intentionally reports low confidence when data is sparse.

## Missing Data Strategy

When readings skip calendar days, the interval delta is distributed across the missing dates for modeling. Those records are marked `estimated`. Estimates are never written as actual readings and are rebuilt from scratch after every edit/import/delete. If a real reading is later inserted for an estimated date, the estimate for that date is discarded by recalculation.

## UI/UX Structure

- Entry panel: cumulative inverter kWh and editable timestamp
- Settings panel: optional installation date
- Dashboard cards: today, weekly/monthly averages, best/worst actual day, lifetime, quality, confidence, service-life estimate
- Charts: daily, monthly, lifetime, trend
- Readings table: edit/delete only actual user-entered readings
- Forecast panel: tomorrow, 7-day, monthly, bi-monthly, annual
- Backup panel: export/import JSON backups

Visual language separates actual, estimated, and forecasted values by color and line style.

## Run the Web App

Open `web/index.html` directly, or serve it locally:

```powershell
npm run serve
```

The web app is offline-capable after first load when served from a local server or HTTPS origin.

## Build the Android APK

Prerequisites:

- JDK 17 or newer
- Android SDK with API 35
- Gradle installed, or open the project in Android Studio

Build:

```powershell
npm run sync:android
gradle :android-app:assembleDebug
```

This workspace also supports the local build-tool setup used during development:

```powershell
$env:ANDROID_HOME='C:\tmp\solar-android-sdk'
$env:ANDROID_SDK_ROOT='C:\tmp\solar-android-sdk'
C:\tmp\solar-build-tools\gradle-8.10.2\bin\gradle.bat :android-app:assembleDebug
```

APK output:

```text
android-app/build/outputs/apk/debug/android-app-debug.apk
```

Convenience copy:

```text
SolarProphecy-Android9Plus-debug.apk
```

Install with:

```powershell
adb install android-app/build/outputs/apk/debug/android-app-debug.apk
```

The Android app runs fully offline from bundled assets. Backups are saved as JSON in the app's external documents directory.

## Testing Strategy

- Unit-test the pure analytics engine for interval calculation, missing-day detection, estimate replacement, confidence, and lifetime analysis.
- Add persistence tests around backup import/export when a browser test runner is introduced.
- Add visual regression tests for chart state once Playwright or another browser runner is installed.
- Add Android instrumentation tests for WebView startup, data persistence, backup save, and tablet/phone layouts.

Run current tests:

```powershell
npm test
```

## Implementation Plan

1. Keep the analytics engine pure and deterministic.
2. Expand the model with robust seasonal smoothing after enough data exists.
3. Add multi-system support by introducing `systemId` to readings and settings.
4. Add weather integration as an optional enrichment source, never as a required dependency.
5. Add battery analytics as a separate domain module.
6. Add inverter integrations as import adapters that write normal reading records.
7. Add signed release APK configuration when publishing credentials are available.

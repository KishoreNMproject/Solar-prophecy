# Solar Prophecy - Project Mandates & Roadmap

## Current Project Status
The analytics layer foundation is being repaired. UI stability and performance have been significantly improved. Scrolling is now smooth on Android, and charts have been optimized for high-density information display. The backup import system is fully functional with native Android file picker integration.

### Recent Accomplishments (Session 2026-06-07)
- **Import System Recovery**: Restored full backup import functionality.
  - Implemented `WebChromeClient` in `MainActivity.java` to support Android Storage Access Framework.
  - Added robust JSON validation and performance-optimized database insertion.
  - Refined UI to hide native browser file controls in favor of a professional, programmatic trigger.
- **UI Performance Optimization**:
  - Reduced `backdrop-filter` overhead (from 20px to 8px) for smooth scrolling.
  - Implemented CSS layout containment (`contain: content`) on major panels.
  - Significantly reduced chart height (from 260px to 180px) and tightened padding for better information density.
- **Build Pipeline**: Verified signed release APK generation.

## Core Mandates (Most Important Rules)
- **Correctness First:** Correctness is now the only priority. Transform Solar Prophecy from a visually impressive prototype into a trustworthy solar analytics platform.
- **No New Features:** Do not improve appearance. Do not add features. Do not add AI, ML, or weather APIs.
- **Data Integrity:** Only the latest observation of a day becomes the **Daily Closing Record**. Historical accounting must consume Daily Closing Records only.
- **Forecast Gatekeeping:** Respect data availability thresholds (0-6: Learning, 7-29: Limited, 30+: Normal). Hide long-range predictions until sufficient data exists.
- **Release Notes:** Use appropriate version incrementals, for devastatingly large updates, the version no. must jump from 1.x.x to 2.x.x, for major updates it will be like x.1.x to x.2.x, for minor updates or very small changes use x.x.1 to x.x.2 like versioning
- **Scope Restriction:** Focus exclusively on correcting the data model and analytics architecture. Do not implement UI, visual, or forecasting algorithm changes unless required for correctness/gatekeeping.
- **Android Native Integration:** All file system interactions (import/export) must use proper Android intents and callbacks. Standard HTML file inputs must be hidden and triggered programmatically for a native feel.
CRITICAL:

Do NOT provide source code changes only.

Do NOT stop after editing files.

The task is considered FAILED unless a SIGNED RELEASE APK is successfully generated and its exact output path is reported.

If release signing is impossible, identify the exact missing configuration and stop with a failure report.

A debug APK is not an acceptable deliverable.

## Current Known Problems
1. **Intraday Influence:** Multiple observations per day incorrectly influence analytics.
2. **Deletion Instability:** Deleting one intraday observation causes major forecast/analytics changes.
3. **Fabricated Precision:** Forecasts and gauges show unjustified precision (e.g., 93% progress with 2 days of data).
4. **Premature Long-range Projections:** Annual forecasts appear with only a few records.
5. **Misleading Visualizations:** Charts generate representations despite insufficient data.

# Android Build Completion Rules

Solar Prophecy is an Android application.

A task is NOT considered complete merely because source code was modified.

For every completed feature, bug fix, UI change, analytics change, storage change, or architecture change:

Required completion checklist:

1. Build web application.
2. Verify web build succeeds.
3. Sync updated web assets into Android project.
4. Verify APK generation succeeds.
5. Report APK output path.
6. If requested for release:

   * Build signed Release APK.
   * Report output paths.

   Build Requirements

After implementation:

1. Build web assets.
2. Sync Android assets.
3. Build Signed Release APK only.
4. Report release APK path.
5. Do not generate Debug APK unless explicitly requested.

Do not claim a task is complete until the Android build succeeds.

If the Android build fails:

* Stop.
* Report the build failure.
* Explain the error.
* Do not mark the task complete.

Expected deliverables after implementation:

* Updated source code.
* Updated web build.
* Updated Android build.
* APK path.
* Build summary.

A source code modification without a successful Android build is considered incomplete.

## Versioning Policy

Use semantic-style versioning for all Solar Prophecy releases.

### PATCH Releases (x.x.Z)

Use for:

* Bug fixes
* UI adjustments
* Text corrections
* Theme tweaks
* Minor OTA improvements
* Small usability enhancements

Examples:

* 1.3.6 → 1.3.7
* 1.3.7 → 1.3.8

### MINOR Releases (x.Y.x)

Use for:

* New features
* Significant UI redesigns
* New settings
* New analytics capabilities
* New forecast features
* New import/export capabilities
* New update-system functionality

Examples:

* 1.3.8 → 1.4.0
* 1.4.0 → 1.5.0

### MAJOR Releases (X.x.x)

Use for:

* Architectural redesigns
* Major forecasting engine upgrades
* Breaking changes
* Complete UI overhauls
* New platform support
* Major workflow changes
* Features that fundamentally change how Solar Prophecy operates

Examples:

* 1.9.4 → 2.0.0
* 2.4.7 → 3.0.0

### Additional Rules

* Never skip versions without reason.
* Always increment sequentially.
* Generate release notes automatically.
* Ensure APK versionName and versionCode remain synchronized.
* Use the smallest version increment that accurately reflects the scope of the update.

## Roadmap & Implementation Steps

### Step 1 - Audit
Identify where:
- Raw observations are used directly.
- Analytics bypass daily closing records.
- Forecasts/confidence are fabricated or generated from insufficient data.
- Charts create misleading representations.

### Step 2 - Daily Closing Record Layer
Create a subsystem where only the latest valid observation of a day becomes the Daily Closing Record. Historical accounting must consume these records only.

### Step 3 - Rebuild Analytics Pipeline
Derive metrics (Daily, Weekly, Monthly, Lifetime, Best/Worst day) exclusively from Daily Closing Records.

### Step 4 - Rebuild Deletion Logic
Deleting an intraday observation must not alter historical metrics unless it was the active Daily Closing Record.

### Step 5 - Forecast Gatekeeping
- 0-6 days: Learning Mode
- 7-29 days: Limited Forecasting
- 30+ days: Normal Forecasting
Hide long-range predictions until thresholds are met.

### Step 6 - Disable Misleading Metrics
Temporarily hide remaining generation, annual/lifetime projections, and advanced gauges. Replace with "Learning - insufficient historical data".

### Step 7 - Gauge Redesign
Do not calculate Expected Generation or Progress Percentage until 30+ Daily Closing Records exist. Display "Learning Phase" and record counts instead.

### Step 8 - Data Quality Dashboard
Add a "Model Status" panel showing: Raw Observations, Daily Closing Records, Intraday Observations, Missing Days, Estimated Days, and Forecast State.

### Step 9 - Android Storage
- Export location: `Documents/Solar/`
- User-accessible backups that survive uninstall.
- Use Android Storage Access Framework/proper public directories.

### Step 10 - Build Validation
1. Run analytics validation tests.
2. Test deletion, intraday, and missing-day scenarios.
3. Verify exports/imports.
4. Generate Working Debug APK, Signed Release APK.

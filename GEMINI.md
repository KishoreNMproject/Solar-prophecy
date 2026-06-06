# Solar Prophecy - Project Mandates & Roadmap

## Current Project Status
The UI has improved significantly, but the analytics layer is still fundamentally incorrect. The application is still producing forecasts, confidence values, gauges, and long-term projections from insufficient data and from the wrong data sources. We must now stop feature development and repair the foundation.

## Core Mandates (Most Important Rules)
- **Correctness First:** Correctness is now the only priority. Transform Solar Prophecy from a visually impressive prototype into a trustworthy solar analytics platform.
- **No New Features:** Do not improve appearance. Do not add features. Do not add AI, ML, or weather APIs.
- **Data Integrity:** Only the latest observation of a day becomes the **Daily Closing Record**. Historical accounting must consume Daily Closing Records only.
- **Forecast Gatekeeping:** Respect data availability thresholds (0-6: Learning, 7-29: Limited, 30+: Normal). Hide long-range predictions until sufficient data exists.
- **Scope Restriction:** Focus exclusively on correcting the data model and analytics architecture. Do not implement UI, visual, or forecasting algorithm changes unless required for correctness/gatekeeping.

## Current Known Problems
1. **Intraday Influence:** Multiple observations per day incorrectly influence analytics.
2. **Deletion Instability:** Deleting one intraday observation causes major forecast/analytics changes.
3. **Fabricated Precision:** Forecasts and gauges show unjustified precision (e.g., 93% progress with 2 days of data).
4. **Premature Long-range Projections:** Annual forecasts appear with only a few records.
5. **Misleading Visualizations:** Charts generate representations despite insufficient data.

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

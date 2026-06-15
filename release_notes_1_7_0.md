# Solar Prophecy Release Notes v1.7.0

## SECTION 1 — Solar Prophecy Release Notes

**What changed:**
- **Forecast Validation Persistence:** Introduced a new `VALIDATIONS_STORE` to persistently capture and store the forecast prediction exactly as it appeared before the day ended, comparing it against the final actual generation.
- **Snapshot Architecture:** Re-engineered the forecasting cycle to capture "pending" snapshots early in the day and strictly isolate today's prediction from back-testing bias once the day enters the Post-Generation Window.
- **UI Readability & Corrections:** Enhanced mobile responsiveness by adding horizontal scroll support to charts and modernized the forecast colors (Violet/Indigo) to distinctly contrast with actual generation. 

**Why it changed:**
- To ensure data integrity, it was critical to lock in forecast predictions based strictly on the models known *at that time*, ensuring historical forecasts are not artificially corrupted by future data (back-testing bias).
- The chart interpretation for mobile users was problematic due to Actual and Forecast bars bleeding together visually; the distinct color adjustments and scroll functionality resolve these data visualization correctness issues.

**User impact:**
- Users can now safely back up and restore their historical validation accuracy.
- Users will clearly differentiate current progress versus expected generation in historical charting, especially on smaller mobile displays.

**Technical impact:**
- Database upgraded to Schema v2 (`DB_VERSION = 2`) to support the new validation indexing and `syncValidations` workflow.
- Complete separation of the intraday live-blending estimation layer from the formal snapshot validation persistence.

## SECTION 2 — Auto-Generated Git Diff Changelog

Added:
- `VALIDATIONS_STORE` database schema and CRUD operations (`db.js`).
- Backup/Restore serialization support for validation collections.
- `syncValidations` cycle interceptor (`app.js`).

Changed:
- `analytics.js` `buildForecasts` to accept and utilize historical snapshot payloads.
- `analytics.js` `actualDays` array pipeline to emit frozen forecast values for historical visualization.
- `charts.js` rendering logic to overlay forecast projections on historical `Actual` bars when data is available.
- `styles.css` custom property tokens for chart colors and `.chart-wrapper` containment context.
- Target `versionName` incremented to `1.7.0` (from `1.6.4`), `versionCode` bumped to `170`.

Fixed:
- Daily chart rendering dual Actual/Forecast overlapping bounds for Post-Generation and Closed days.

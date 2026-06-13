# Solar Prophecy Release v1.6.0 (Major Feature Update)

## SECTION 1 — Solar Prophecy Release Notes

**What changed**
* **Today Progress Bar System**: Redesigned the chart visualization for the current day to act as a live progress indicator. Instead of forcing a choice between a forecast OR an actual reading, the chart now intelligently stacks your actual accumulated generation inside the total remaining forecast target. 
* Two labels are now rendered for the current day:
  * Top of total bar: Total Forecast Target
  * Top of inner solid bar: Actual Accumulated Generation

**Why it changed**
* This evolution brings the chart visualization much closer to real-world solar generation behavior. During the learning phase and daily usage, it provides an instant snapshot of whether production is ahead of, on track with, or behind the generated forecast without requiring you to switch to a secondary dashboard.

**User impact**
* Past days remain fully authoritative showing only Actuals.
* Future days remain predictive showing only Forecasts.
* The current day provides a beautiful, dual-colored composite bar (Dark Solar Cyan for actual, Light translucent Cyan for remaining forecast).

**Technical impact**
* Expanded `analytics.js` (`buildForecasts`) to emit a composite `"today"` point when evaluating the current date instead of a boolean replace override.
* Upgraded the HTML Canvas rendering engine in `charts.js` (`renderBarChart`) to support multi-segment stacked rendering. 
* Refactored `charts.js` tooltips and label offset geometry to dynamically handle collision and dual-label rotations on small screens.

## SECTION 2 — Auto-Generated Git Diff Changelog

**Added**
* `today` chart data type and stacked composite logic.
* Multi-label rendering offset algorithm.

**Changed**
* `web/src/analytics.js` (Today point evaluation)
* `web/src/app.js` (Property pass-through)
* `web/src/charts.js` (Canvas drawing lifecycle)
* `package.json`
* `android-app/build.gradle`
* `web/src/updates.js`

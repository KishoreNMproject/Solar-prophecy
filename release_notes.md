# Solar Prophecy v1.5.7 - UX & Navigation Polish

## SECTION 1 — Solar Prophecy Release Notes

**What changed**
- The Home page Reading Entry block has been elevated to directly below the "kWh Today" gauge, eliminating unnecessary scrolling to input records.
- Implemented a "smart header" that elegantly hides itself when scrolling down to maximize screen real estate, and immediately reappears when scrolling up.
- Eliminated all artificial gap-filling logic from the daily history and charts. Only concrete Daily Closing Records are plotted.
- Fixed a frustrating double-scrollbar visual bug in the "About" modal.

**Why it changed**
- Moving the Reading Entry block upwards aligns with the primary user intent: launching the app, seeing today's stats, and entering a new reading.
- A smart header provides a much cleaner, app-like scrolling experience.
- The history logic previously inferred empty days with "0 kWh" or estimated values. This created misleading analytics since days with no data should simply be absent.

**User impact**
- Navigation is much smoother and more intuitive.
- The charts and history views are 100% truthful to actual observed data without visual padding.
- The reading input workflow is immediate and frictionless.

**Technical impact**
- Reordered DOM nodes in `index.html`.
- Implemented `requestAnimationFrame` throttled scroll listener in `app.js` manipulating the `.topbar` CSS transform.
- Refactored `buildDailySeries` in `analytics.js` to strip gap interpolation and return actual readings exclusively.

## SECTION 2 — Auto-Generated Git Diff Changelog

### Added
- Smart scrolling logic bound to `window` inside `app.js`.
- Topbar sticky positioning and cubic-bezier transition properties in `styles.css`.

### Changed
- Swapped `.entry-panel` and `.model-status-panel` DOM locations.
- Modified `buildDailySeries` generation loop.
- Relocated max-height constraints from the About modal inner `div` to the parent `.glass-modal` class to prevent redundant scroll targets.

### Removed
- Extraneous estimated data loops from `buildDailySeries`.

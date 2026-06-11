# Solar Prophecy v1.5.03 - UI Layout and Daily Generation History Fixes

## SECTION 1 — Solar Prophecy Release Notes

**What changed**
- Corrected the "Daily Generation History" module to render generation deltas derived exclusively from finalized Daily Closing Records, discarding all synthetic interpolation, missing day estimations, or 0 kWh placeholder gap entries.
- Re-architected the "Home" dashboard layout hierarchy. The Reading Entry Block is now positioned prominently immediately below the Forecast Readiness indicator. 

**Why it changed**
- The original design mapping filled timeline gaps with synthetic records, causing misleading zero values or estimations to appear in the History table. The new strict constraint guarantees that only physically confirmed historical events appear in the log.
- Adjusting the Home screen layout prioritizes the optimal user workflow: (Check Today's Generation -> View Readiness -> Enter Reading). Returning to this ordering significantly reduces visual friction.

**User impact**
- Users reviewing their Daily Gen. History will see an authentic sequence of reading comparisons with zero estimated gaps.
- When launching the application, users will intuitively encounter the Reading form directly below the primary metrics rather than beneath all dashboard warning banners and analytical grids. 

**Technical impact**
- `renderDailyHistory` within `app.js` now maps specifically against raw delta calculations of consecutive `dailyClosingRecords`. The table explicitly filters any non-positive or synthetically inserted zero entries. 
- The DOM element sequence in `index.html` was refactored, moving `<section class="entry-panel">` back to its rightful place. 

## SECTION 2 — Auto-Generated Git Diff Changelog

### Added
- Native strict calculation for DCR deltas injected into `dailyHistoryTable`.

### Changed
- Moved the `.entry-panel` section ahead of warnings and secondary metrics grids within `screen-home` to restore logical DOM hierarchy.
- Version increments across package.json, build.gradle, and updates.js to `v1.5.03`.

### Removed
- Removed the mapping of `model.actualDailySeries` for the Daily History log to drop zero-gaps / synthetic placeholders.

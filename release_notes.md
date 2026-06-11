# Solar Prophecy v1.5.0

## What changed
* Fully redesigned the Daily Closing Record architecture to preserve all valid historical production data.
* Implemented formal day-state generation windows (Early, Peak, Late, Post-Sunset, Closed Day).
* Synchronized model data between actual tracked days and raw observations to fix counting discrepancies.
* Corrected live-today generation calculations to resolve NaN values appearing on the dashboard.
* Established a formal Release Discipline policy requiring signed APK generation, GitHub release creation, and structured changelogs for all future development.

## Why it changed
* A regression was silently deleting initial baseline generation and dropping valid intraday deltas, causing the lifetime production sum to be inaccurate.
* The formal Git release discipline was necessary to prevent untested regressions from shipping to production.

## User impact
* Lifetime generation metrics and Daily Record counts are now strictly accurate.
* The dashboard no longer occasionally fails with NaN errors during active production windows.

## Technical impact
* `analytics.js` now derives actual days correctly including initial baseline records.
* Git and Release validation is strictly enforced.

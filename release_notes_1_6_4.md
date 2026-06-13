# Solar Prophecy Release Notes v1.6.4

## SECTION 1 — Solar Prophecy Release Notes

**What changed**
- The "Composite Live Prediction" (the today-only forecast) has been mathematically repaired to incorporate historical intraday generation curves.
- As the day progresses, the forecast for today smoothly transitions from the baseline historical expectation to a mathematically sound projection based on real-time observations and typical time-of-day completion percentages. 

**Why it changed**
- Previously, the live forecast for today simply clamped the historical baseline to ensure it never dipped below what was already generated. This under-utilized valuable real-time progression data (e.g., if you had already hit 90% of your baseline by 10 AM, the forecast did not meaningfully adapt to project an explosive completion). 

**User impact**
- Your "Expected Today Generation" will now dynamically adjust up and down as the day progresses based on the pace of generation compared to your own system's typical historical performance curve. 
- Long-term forecasts (Weekly, Monthly, Annual) are strictly unaffected by this intraday data, ensuring your foundational historical learning stays pure and uncorrupted by temporary intra-day volatility.

**Technical impact**
- Implemented `learnIntradayProfile` inside `analytics.js` to derive a percent-completion map per hour using all historical valid observations against their respective Daily Closing Records.
- Added a quadratic confidence blend (`weight = completionPct²`) in `buildForecasts` strictly for `date === now`.

## SECTION 2 — Auto-Generated Git Diff Changelog

### Added
- `learnIntradayProfile()` function to dynamically compute an hourly completion percentage map using `allReadings` and `dailyClosingRecords`.

### Changed
- `buildSolarModel` modified to compute the intraday profile once during init and pass it to `buildForecasts`.
- `buildForecasts` modified to extract `completionPct` for the current hour and apply a quadratic confidence blend projection for today's forecast.
- Bumped app versions to `1.6.4`.

### Fixed
- Fixed an architectural mismatch where today's "composite live prediction" was acting strictly as a clamping floor rather than a true real-time composite projection.

### Removed
- N/A

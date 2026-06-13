# Solar Prophecy Release v1.5.12

## SECTION 1 — Solar Prophecy Release Notes

**What changed**
* Fixed a regression bug where chart value labels were disappearing, rendering inconsistently, and becoming unreadable.
* Separated bar chart rendering from label rendering to prevent z-index issues.
* Adjusted the chart headroom so the maximum bar label does not overlap with the chart title.
* Automatically rotates the value labels dynamically when there is insufficient horizontal space for high-density bar charts.

**Why it changed**
* The bug reappeared when chart heights were reduced to 180px and layouts were compressed. The text labels for older bars were occasionally being obscured by newer taller bars, or clipped by the chart boundary due to insufficient space above the largest bars. The arbitrary limit of 15 points also caused values to vanish completely as soon as the history was large enough.

**User impact**
* Every visible bar will now cleanly display its value regardless of how many data points exist, rotating dynamically if space gets tight, ensuring reliable data visibility across Android and Desktop browsers.
* Ensures information correctly scales on device rotation or app restarts.

**Technical impact**
* The `charts.js` rendering logic was modified to separate rendering bars and labels into two consecutive drawing loops (fixing canvas z-index overlapping). The max value `max` now correctly scales by an additional 15% to maintain proper headroom. Dynamic `Math.PI / 2` rotation applied when `barWidth` shrinks below 14px.

## SECTION 2 — Auto-Generated Git Diff Changelog

**Fixed**
* Chart labels clipping and inconsistent z-index visibility issues.

**Changed**
* `web/src/charts.js`
* `android-app/build.gradle`
* `package.json`

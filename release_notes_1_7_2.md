# Solar Prophecy v1.7.2 Release Notes

## SECTION 1 — Solar Prophecy Release Notes

**UI Correctness Hotfix**
This release resolves visualization readability issues on mobile screens and updates navigation components.

**What changed:**
* Significantly increased the color contrast between Actual and Forecast bars on the Daily Generation chart. The forecast bars now use a distinct muted gray-blue color.
* Replaced the temporary Home emoji (`🏠`) on secondary screens with a modern, filled SVG glyph that aligns with the application's design language.

**Why it changed:**
User testing on both phones and tablets revealed that the original teal and cyan colors used for Actual vs Forecast charts were too similar, requiring users to pause and inspect the legend. The new color scheme allows for instant, at-a-glance interpretation of the data. The Home button icon was also updated to finalize the UI polish.

**User impact:**
Users will immediately notice clearer chart visualizations without any changes to underlying analytics or forecasting behaviors. 

**Technical impact:**
Updated CSS variables for the chart color scheme and replaced text-based emojis with SVG paths in the layout header.

---

## SECTION 2 — Auto-Generated Git Diff Changelog

**Changed:**
* CSS variables `--chart-forecast` updated to `#546e7a` (dark mode) and `#90a4ae` (light mode) for enhanced contrast.
* Replaced `🏠` with a native SVG icon path in `index.html`.
* Bumped version code to 172 and version string to "1.7.2".

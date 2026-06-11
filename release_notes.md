# Solar Prophecy v1.5.01 - Application Navigation Restructure

## SECTION 1 — Solar Prophecy Release Notes

**What changed**
Converted Solar Prophecy from a single-page long-scrolling dashboard into a structured multi-screen application. Introduced a persistent Hamburger Menu with dedicated screens for Home, Graphs, History, Daily Savings, and Settings. Implemented the "Daily Savings" feature to track financial insights. Re-located the "Check for Updates" functionality and Import/Export buttons to appropriate menus.

**Why it changed**
The previous dashboard had become crowded and difficult to navigate as more features were added. The new navigation system provides a modern, intuitive, and cleaner user experience, ensuring scalability for future features without cluttering the Home view.

**User impact**
Users will experience a cleaner, app-like navigation flow with dedicated views for different functionalities. They no longer need to scroll endlessly to find settings, charts, or historical logs. The new "Daily Savings" feature provides real-time financial insights based on an electricity rate setting. 

**Technical impact**
The application architecture shifted from monolithic CSS/HTML visibility to a state-based screen container system. Event listeners and UI DOM elements in `app.js` and `styles.css` were refactored for the new structure without breaking data models or forecast tracking loops.

## SECTION 2 — Auto-Generated Git Diff Changelog

### Added
- Multi-screen UI navigation logic (`app.js`).
- Navigation state classes, side menu overlay, and transitions (`styles.css`).
- Daily Savings financial computations tied to electricity rate settings (`analytics.js`, `app.js`).

### Changed
- Re-structured `index.html` to group features into explicit `<div class="screen">` containers.
- Settings structure updated to include the electricity rate configuration.
- Topbar styling modified to include the hamburger menu trigger.

### Removed
- Removed manual update check button directly from the settings page, moved it to the side nav.
- Single-page layout scrolling removed.

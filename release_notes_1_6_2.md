# Solar Prophecy Release Notes v1.6.2

## SECTION 1 — Solar Prophecy Release Notes

**What changed**
- Added a "Sticky Home Action" to the topbar.
- The "Home" button smoothly scrolls the user back to the top of the dashboard.
- The button fades in automatically after scrolling down 300px.
- The button is responsive, showing an icon and text on desktop/tablet, and an icon-only variant on mobile.

**Why it changed**
- To improve navigation efficiency and reduce friction on long-scroll pages, allowing a fast return-to-top mechanism without opening the hamburger menu.

**User impact**
- Users can easily return to the dashboard from the lower analytics and forecast sections with a single click.

**Technical impact**
- Implemented entirely within the Web UI layer (`index.html`, `app.js`, `styles.css`) using smooth scrolling API (`window.scrollTo`).
- Synchronized assets to Android WebView and bumped application version to deploy to all platforms natively.

## SECTION 2 — Auto-Generated Git Diff Changelog

### Added
- Sticky Home button in `index.html` topbar actions.
- Scroll event listener in `app.js` to control visibility of the sticky home button.
- Smooth scroll to top behavior on click in `app.js`.
- Responsive CSS media queries in `styles.css` to hide the "Home" text on mobile screens.

### Changed
- Reverted web-only versions to 1.6.1 and bumped package/android/web app versions to `1.6.2` to reflect full application release.
- Android WebView assets synchronized with Web UI source.

### Fixed
- N/A

### Removed
- N/A

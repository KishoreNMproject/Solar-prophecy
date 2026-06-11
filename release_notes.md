# Solar Prophecy v1.5.4 - Stable Navigation Release & Native Patch Notes

## SECTION 1 — Solar Prophecy Release Notes

**What changed**
- Converted the "About" screen from an external browser redirect into a native, fully offline in-app modal.
- Built-in scrollable release notes (What's New) display directly inside the application interface.
- Consolidated all the transitional UI and layout restructuring from v1.5.01 through v1.5.03 into the first stable v1.5.4 release.

**Why it changed**
- The application aims to function entirely offline, including providing version information and update histories. Opening a browser to GitHub broke the immersion and offline functionality.
- This stabilizes the latest UI changes and formally establishes the multi-screen navigation architecture as the new baseline for future updates.

**User impact**
- Selecting "About" from the menu now instantly displays the app version, build date, and patch notes without leaving the app.
- A smoother, more integrated experience that completely avoids external browser dependencies unless actively downloading an update.

**Technical impact**
- Deprecated `openReleaseNotes` and replaced it with `showAboutModal` inside `updates.js`.
- Hardcoded `RELEASE_NOTES` array added to `updates.js` which acts as the localized source of truth for the active changelog.

## SECTION 2 — Auto-Generated Git Diff Changelog

### Added
- Native `showAboutModal` function in `updates.js` utilizing the existing `renderGlassModal` architecture.
- `RELEASE_NOTES` exported array acting as the internal database for displaying patch notes.

### Changed
- Replaced the `window.open` external link behavior bound to the "About" navigation button in `app.js`.
- Stabilized package tracking, gradle configs, and update logic to version `1.5.4`.

### Removed
- `openReleaseNotes` function that redirected to GitHub.

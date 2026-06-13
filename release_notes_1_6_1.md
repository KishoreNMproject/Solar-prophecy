# Solar Prophecy Release Notes v1.6.1

## SECTION 1 — Solar Prophecy Release Notes

**What changed**
- Added Android App discovery entry points to the Web UI.
- Included a dismissible promotional card on the Web Home screen.
- Added an "Android App" link to the side navigation menu (Web only).
- Added an Android App download section to the About dialog (Web only).
- Integrated direct downloading of the latest stable APK from GitHub releases.

**Why it changed**
- To improve discoverability and adoption of the native Android application for users visiting the Web version.

**User impact**
- Web users will now be aware of the Android App and can easily download the latest release with a single click.
- Android users will not see these prompts, maintaining a seamless native experience.

**Technical impact**
- Utilizes the existing `window.SolarAndroid` detection mechanism to conditionally render UI components.
- Added `downloadLatestApk` to dynamically fetch and trigger the download of the `.apk` asset from the latest GitHub release.

## SECTION 2 — Auto-Generated Git Diff Changelog

### Added
- Direct APK download logic (`downloadLatestApk`) in `updates.js`.
- Android App promo card in `index.html`.
- Android App navigation link in `index.html`.

### Changed
- Modified `app.js` to handle visibility and dismissal of the Android App promo card.
- Modified `showAboutModal` in `updates.js` to append Android App download information for Web users.
- Updated `package.json` and `build.gradle` version to `1.6.1`.

### Fixed
- N/A

### Removed
- N/A

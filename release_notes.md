# Solar Prophecy v1.5.6 - Platform Specific Update Management

## SECTION 1 — Solar Prophecy Release Notes

**What changed**
- The "Check for Updates" application logic and user interface has been disabled for the Web platform.
- The Android application retains full continuous OTA capabilities and GitHub release integrations.

**Why it changed**
- The Web interface operates dynamically via standard browser caching logic, inherently rendering a manual "Check for Updates" control redundant and confusing for Web users. The feature holds value exclusively for packaged Android deployments running statically.

**User impact**
- Users accessing Solar Prophecy via standard web browsers will no longer encounter out-of-place update dialogs, Android promotions, or menu controls meant for packaged applications.
- Android users remain unaffected and will continue experiencing regular OTA updates.

**Technical impact**
- App initialization (`app.js`) now gates `checkForUpdates()` strictly behind the `window.SolarAndroid` bridge namespace check.
- The `navCheckUpdates` DOM element and its parent container are forcibly hidden using an inline style when running outside the Android webview wrapper.

## SECTION 2 — Auto-Generated Git Diff Changelog

### Added
- Platform detection logic masking `navCheckUpdates` menu parent element dynamically.

### Changed
- Conditionalized `checkForUpdates` background execution to Android environments.
- Version incremented to `v1.5.6`.

# Solar Prophecy Release Notes

## Version 1.4.2 (Patch)
**Theme System Fixes & Architecture Consistency**

### What changed
* Reverted Android `minSdk` 28 (Android 9) base theme to `Theme.Material.Light.NoActionBar` to prevent compilation errors.
* Introduced a dedicated `values-v29/styles.xml` file configured with `Theme.DeviceDefault.DayNight` to explicitly enforce `prefers-color-scheme` media queries to automatically trigger in the WebView.

### Why it changed
* Android devices set to Dark Mode were rendering the Day (Light) Theme on the Web UI when set to "Follow Device Theme" due to the Android Activity forcefully overriding the system preference into Light Mode.
* WebView requires an Activity wrapped in a `DayNight` theme configuration in order to propagate the `prefers-color-scheme: dark` attribute natively without Javascript/WebView workarounds.

### User impact
* Android 10+ (API 29+) users will now experience correct and fully automatic "Follow Device Theme" switching, resolving the dark-mode inconsistency bug.

### Technical impact
* Fixed Android theme inheritance for the native Android shell without bumping minSdk, maintaining API 28 backwards compatibility.
* Aligned Android and Web-Reference implementations.

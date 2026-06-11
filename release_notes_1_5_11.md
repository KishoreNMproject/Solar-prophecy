# Solar Prophecy Release v1.5.11

## SECTION 1 — Solar Prophecy Release Notes

**What changed**
* Fixed a severe fatal crash that occurred immediately upon launching the app on modern Android devices (API 34+).

**Why it changed**
* Android 14 (API 34) and newer mandate that dynamic `BroadcastReceiver` registrations must declare whether they are exported or not, even for system broadcasts. The previous implementation called `registerReceiver` without this flag, which caused an immediate `SecurityException` at runtime before the application could initialize.

**User impact**
* Users running Android 14, 15, 16, or 17 (API 34+) will now be able to launch the app successfully instead of experiencing an immediate crash.

**Technical impact**
* Added an explicit SDK version check in `MainActivity.java` and applied `Context.RECEIVER_EXPORTED` to the `DownloadManager.ACTION_DOWNLOAD_COMPLETE` intent filter registration when running on `Build.VERSION_CODES.TIRAMISU` or higher.

## SECTION 2 — Auto-Generated Git Diff Changelog

**Changed**
* `android-app/build.gradle`
* `android-app/src/main/java/app/solarprophecy/MainActivity.java`
* `package.json`

**Fixed**
* `java.lang.SecurityException` regarding `RECEIVER_EXPORTED` on modern Android environments.

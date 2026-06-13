# Solar Prophecy Release Notes v1.6.3

## SECTION 1 — Solar Prophecy Release Notes

**What changed**
- The "Sticky Home Action" button is now visible from *any* screen (e.g. Daily Generation History, Settings, etc.).
- When clicked on a secondary screen, the button smoothly returns the user back to the Home Dashboard and scrolls to the top simultaneously.

**Why it changed**
- The previous implementation only tracked scroll height on the home dashboard. Users navigating to other screens could not access the quick return-to-top/home feature because their scroll height was zero on those screens. 

**User impact**
- Users can now quickly jump back to the Home Dashboard from anywhere in the app with a single tap, drastically improving usability.

**Technical impact**
- Modified `app.js` routing logic to expose the sticky home button depending on the active screen state (`hidden` attribute), falling back to `window.scrollY > 300` logic only when actively on the Home screen.

## SECTION 2 — Auto-Generated Git Diff Changelog

### Added
- Screen-aware visibility logic in `app.js` for `stickyHomeBtn`.

### Changed
- `app.js` modified to check `!document.getElementById('screen-home').hidden` instead of relying purely on scroll height.
- `app.js` nav menu handler now re-evaluates Home button visibility after screen transition.
- Bumped app versions to `1.6.3`.

### Fixed
- Fixed bug where the "Home" return button was completely hidden when the user was actively viewing secondary screens like Daily Generation History.

### Removed
- N/A

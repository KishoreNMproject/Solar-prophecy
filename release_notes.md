# Solar Prophecy v1.5.5 - UI Bug Fix: Custom Timestamp Checkbox

## SECTION 1 — Solar Prophecy Release Notes

**What changed**
- Corrected a CSS inheritance bug that was causing the "Custom date and time" checkbox to render incorrectly as a full-width text input.

**Why it changed**
- The global `<input>` styling was inadvertently overriding native `<input type="checkbox">` attributes, stripping the `appearance` property and setting width to 100%. This caused confusing UI layouts and a degraded user experience.

**User impact**
- The "Custom date and time" toggle will now render as a properly scaled and recognizable checkbox directly inline with its label. The visual friction of having an "empty bar" has been resolved. Keyboard navigation and touch targets remain accessible and correct.

**Technical impact**
- Updated `styles.css` global `input` selector to explicitly exclude checkboxes (`input:not([type="checkbox"])`).
- Introduced dedicated `input[type="checkbox"]` scaling, and `.checkbox-row` flexbox layout definitions.

## SECTION 2 — Auto-Generated Git Diff Changelog

### Added
- Specific CSS rules for `input[type="checkbox"]` enforcing native `appearance: auto`, size normalization, and `accent-color`.
- Layout rules for `.checkbox-row` ensuring vertical alignment and gap spacing.

### Changed
- Global `input` and `select` rules modified to exclude checkbox interactions via CSS pseudo-class `:not()`.
- Bumped versions to `v1.5.5` across the project.

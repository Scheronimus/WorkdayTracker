# Changelog

## Unreleased

### Changed

- Match History to Today’s route typography: inline arrival/departure labels and times, compact timestamp rows, and the same neutral route background. Keep timestamp correction controls and original-value details.
- Mark recorded arrival home with a green completion check, distinct from an in-progress journey home.
- Use the shared chronological trip timeline in expanded History, including the recorded arrival home. Customer/distance pencils support draft editing while timestamp pencils preserve correction review, original values, and manual-change markers.
- Replace Today’s route cards with a compact chronological timeline, with editable kilometre legs and an explicit missing-distance state. Show the return-home stop only after the home journey starts.
- Add a draft stop editor for customer names and incoming kilometres, with Save/Cancel and English/Spanish validation. Existing timestamps and original correction metadata are preserved.
- Replace the outlined Undo/Deshacer button with a subtle curved-arrow icon beside the timestamp, retaining its 44px target, accessible label, and confirmation.
- Refine Today, History, Options, and editing with shared typography, spacing, surfaces, icons, and larger phone targets in English and Spanish.
- Emphasize the current stop and show timestamps before secondary distance fields; clarify elapsed workday time and incomplete distance subtotals.
- Simplify History labels while keeping seconds, correction markers, originals, and overnight dates visible.
- Group preferences, data transfer, installation guidance, and app information; make version notices compact with expandable details.

### Fixed

- Keep sheet keyboard focus inside native modal dialogs, make the background inert, support Escape, and restore focus when closing.
- Adapt dialogs to the visible phone viewport and measure action/navigation clearance, including enlarged text.
- Give the CSV chooser a 48-pixel target and visible keyboard focus; label the note field explicitly.
- Use Playwright-managed Chromium sessions for existing browser checks, avoiding local raw-WebSocket transport timeouts.

### Validation

- Add English/Spanish mobile usability checks at 320, 390, and 430 pixels, with Chromium and WebKit support, screenshots, full workday recording, modal keyboard interaction, large text, overnight corrections, draft discard, CSV, and persistence.
- Include the mobile usability suites in the release command and deployment checks. No storage or CSV format changes.

## 1.6.0 — 2026-10-26

### Added

- Edit completed workdays: customer names, notes, kilometres, and all dates and times.
- Correct individual timestamps from subtle pencil controls, with a before/after review and explicit confirmation.
- Preserve the original value of manually corrected timestamps; show `*` and the original time in History.
- Show a dismissible, localized “What’s new” notice once per app version, available again from Options.
- Add automated browser layout, correction, persistence, CSV, and screenshot checks.
- Gate deployment on a production 1.5.0-to-1.6.0 service-worker upgrade suite that checks exact preservation of existing data, cancelled/confirmed edits, offline reload, and legacy/new CSV transfer.
- Add WebKit upgrade tests and English/Spanish iPhone-width screenshots, with a required macOS compatibility job before deployment. Real installed-iPhone testing remains separate.

### Changed

- Keep history edits in a draft until saved; allow cancellation without changing stored records.
- Validate journey order, dates, customer names, and distances before saving.
- Support narrow phone layouts and concise English and Spanish instructions.

### Data compatibility

- Existing local workdays and history remain compatible; no data reset is required.
- CSV exports now include complete ISO timestamps and an eleventh column for original timestamp metadata. Import continues accepting previous nine- and ten-column exports. Older app versions cannot import the new exports.
- Original timestamps are retained from the first correction made with this feature; previously overwritten values cannot be recovered.
- Release-note dismissal is stored separately from workday data. All functionality remains local and available offline.

## 1.5.0

### Added

- Two-stage journey home: enter kilometres and start driving, then review kilometres and confirm arrival at home.

Earlier releases predate this changelog. See Git history for their changes.

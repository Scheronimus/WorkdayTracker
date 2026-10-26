# Changelog

## 1.6.0 — Unreleased

### Added

- Edit completed workdays: customer names, notes, kilometres, and all dates and times.
- Correct individual timestamps from subtle pencil controls, with a before/after review and explicit confirmation.
- Preserve the original value of manually corrected timestamps; show `*` and the original time in History.
- Show a dismissible, localized “What’s new” notice once per app version, available again from Options.
- Add automated browser layout, correction, persistence, CSV, and screenshot checks.

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

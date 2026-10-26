# Workday Tracker 1.6.0

Release date: 26 October 2026.

## User changes

- Correct completed workdays in History: customer names, notes, kilometres, and all dates/times.
- Use a subtle pencil control for a single time correction. Review the previous and new values, then confirm before saving.
- Manually changed timestamps show `*`. The first recorded value is retained, including after further corrections.
- Read concise English/Spanish release notes once per version, or reopen them from Options.

## Compatibility

Existing browser data remains compatible. No reset or manual migration is needed.

New CSV exports retain full timestamp dates and original values. This version imports previous nine- and ten-column exports and the new eleven-column format. Older app versions cannot import new exports.

Values overwritten before original-time tracking was added cannot be recovered. Data remains local to the browser and origin.

## Verification

Run `npm run test:release` with Edge/Chromium installed, or set `BROWSER_PATH`. This runs unit tests, lint, the production build, production browser checks, and the production-data upgrade suite. The browser uses synthetic data in isolated profiles; evidence is saved under `artifacts/history-ui/` and `artifacts/upgrade-ui/`.

Browser checks cover 320/390/485/1280px history layouts, timestamp confirmation, original values and star markers, persistence, CSV transfer, English/Spanish release notes and dismissal, and service-worker offline loading.

Validated on 26 October 2026: all 42 unit tests, lint, production build, browser checks at all four widths, and production offline reload passed in Windows/Edge. WebKit/iPhone-emulation checks and a required macOS WebKit deployment job have also been added; this is not real-iOS device coverage. See [Safari and iPhone checks](IOS-TESTING.md) for the exact scope and remaining device setup.

The 14 WebKit tests passed locally on Windows: six same-origin service-worker upgrade scenarios and eight English/Spanish phone-layout/version-notice cases. The six Chromium upgrade scenarios also passed after sharing the fixture matrix. The macOS WebKit CI job has also passed during release validation; production deployment still requires passing checks for the published commit. No actual iPhone/Home Screen app test has run.

### Strict upgrade verification

`npm run test:upgrade` builds the actual Git-tagged `v1.5.0` source and serves it as a production PWA. It then replaces the served build with the release candidate on the same origin, updating the real service worker while retaining each browser context and all its storage.

Six isolated scenarios cover an active customer visit, a journey home in Spanish, a completed current day with imported history, a prepared day with legacy optional fields, 1,000 completed days, and a day recorded through the normal 1.5.0 buttons. Records include numeric/string IDs, null/zero/decimal distances, missing optional fields, Unicode, quotes, multiline notes, overnight dates, and timestamp milliseconds.

Every stored key/value must remain byte-for-byte identical after the upgrade, navigation, reload, offline loading, and a cancelled edit. A confirmed correction must change only the selected timestamp and original-time metadata, plus the matching completed current-day copy when applicable. Actual 1.5.0 CSV exports must import identically to the old importer; new exports must preserve all exported fields and original-time metadata.

The suite records the baseline Git SHA, scenario results, storage snapshot hashes, synthetic before snapshots, and screenshots. Deployment now requires this suite and the production UI checks to pass. This is strong automated coverage, not a guarantee against device failure, browser storage removal, or an untested browser engine. No real user's data is accessed or modified by these tests.

## Publication

Prepare and review this release before merging it into `main`. The repository workflow uses `develop` for integration. Publishing a push to `main` automatically deploys to GitHub Pages. Create the `v1.6.0` tag on the approved final release commit.

Release preparation alone does not push branches, create the release tag, or deploy the application.

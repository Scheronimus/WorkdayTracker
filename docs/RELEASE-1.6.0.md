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

Run `npm run test:release` with Edge/Chromium installed, or set `BROWSER_PATH`. This runs unit tests, lint, the production build, and production browser checks. The browser uses synthetic data in an isolated profile; screenshots are saved under `artifacts/history-ui/`.

Browser checks cover 320/390/485/1280px history layouts, timestamp confirmation, original values and star markers, persistence, CSV transfer, English/Spanish release notes and dismissal, and service-worker offline loading.

Validated on 26 October 2026: all 42 unit tests, lint, production build, browser checks at all four widths, and production offline reload passed. These automated browser checks use Windows/Edge; iOS/Safari was not tested.

## Publication

Prepare and review this release before merging it into `main`. The repository workflow uses `develop` for integration. Publishing a push to `main` automatically deploys to GitHub Pages. Create the `v1.6.0` tag on the approved final release commit.

Release preparation alone does not push branches, create the release tag, or deploy the application.

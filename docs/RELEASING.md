# Release preparation and publication

## Prepare a candidate

1. Start `release/<version>` from verified `develop`. New compatible product
   features use a minor bump; the current candidate is 1.7.0.
2. Update the root versions in `package.json` and `package-lock.json`, including
   the lockfile root package entry. Do not change dependency versions incidentally.
3. Move completed Unreleased entries into a versioned changelog section labelled
   as a candidate. Add `docs/RELEASE-<version>.md` with scope, compatibility and
   validation status. Keep Unreleased for subsequent work.
4. Refresh the release-note keys in `src/releaseNotes.js` and their English/Spanish
   copy in `src/i18n.js`. Verify that dismissal of the previous version still lets
   the candidate notice appear without changing workdays.
5. Review README, architecture, tests and technical debt. Archive dated reports
   through the documentation index; retain published-release records.
6. Set `scripts/upgrade-baseline.mjs` to the previous published tag. Do not create
   or move that tag during testing. Browser fixtures read the candidate version
   from `scripts/release-version.mjs`; they must not pin a stale dismissal value.

## Validate

```sh
npm ci
npm run test:release
```

The gate includes unit/documentation checks, lint, production build, History/offline,
recording, route editing, recovery, display, duration and statistics suites, six
Chromium upgrade scenarios, and fourteen WebKit upgrade/iPhone-layout tests.
Chromium/Edge and Playwright WebKit must be available. See [Testing](TESTING.md)
and [iPhone coverage](IOS-TESTING.md) for setup and manual/device limits.

Default upgrade coverage for 1.7.0 is `v1.6.0` to the candidate, on the same origin
without resetting storage. The default is shared by Chromium and WebKit. Additional
legacy coverage can select a tag with `UPGRADE_BASELINE`, for example in PowerShell:

```powershell
$env:UPGRADE_BASELINE = 'v1.5.0'
try {
  npm run test:upgrade
  if ($LASTEXITCODE -ne 0) { throw 'Legacy Chromium upgrade checks failed' }
  npm run test:webkit
  if ($LASTEXITCODE -ne 0) { throw 'Legacy WebKit checks failed' }
} finally {
  Remove-Item Env:UPGRADE_BASELINE
}
```

Use synthetic records and isolated contexts. Record exact results, tested version,
baseline tags and remaining device/CI work in the candidate release document.
Generated evidence stays under `artifacts/`; do not commit browser storage fixtures
from a real user. Re-run affected checks after fixes and require green CI for the
final publication commit.

## Publish after approval

Preparation does not publish. After approval:

1. Commit the verified candidate on its release branch and push it for CI/review.
   CI validates `main`, `develop` and `release/**`; release branches do not deploy.
2. Merge the approved candidate into `main`. Mark the changelog/release document
   with the actual publication date and require the final commit's CI to pass.
3. Tag the approved final commit `v<version>` and push the tag and `main` according
   to the agreed release workflow. Pushing `main` triggers GitHub Pages deployment;
   both Ubuntu/Chromium and macOS/WebKit jobs must pass.
4. Verify the deployed version, cached reload and installed-app behavior using
   [the manual checks](TESTING.md). Avoid changing production user data during QA.
5. Merge the release changes back into `develop` so version and documentation
   remain aligned. Keep the previous tag available for subsequent upgrade tests.

The 1.7.0 preparation does not authorize pushing, tagging, merging into `main` or
deploying; those publication actions require release approval.

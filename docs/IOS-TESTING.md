# Safari and iPhone release checks

## Automated coverage in this repository

`npm run test:webkit` runs Playwright WebKit with an iPhone device profile, touch input, Europe/Berlin dates, and narrow phone layouts. It builds the previous tagged release (`v1.6.0` by default) and replaces it with the production candidate on the same origin and in the same browser context. It does not reset storage during the upgrade.

Fourteen tests cover:

- Six upgrade scenarios shared with the Chromium suite, including active workdays, imported/legacy history, Spanish, 1,000 days, and data recorded using the original workflow.
- Exact preservation of every stored value before editing, after reload, and after cancellation.
- Confirmed timestamp corrections, preservation of original values, star markers, unchanged unrelated fields, and CSV transfer.
- Cached loading and editing during a simulated server outage. Every app resource returns HTTP 503, and the test verifies that the controlled service worker can still load the app. This is distinct from a physically disconnected iPhone. Chromium separately tests browser-forced offline mode.
- English/Spanish version messages, dismissal persistence, accessible correction controls, and screenshots at 320/375/390/430 pixels.

WebKit upgrade tests wait for the updated service worker to take control before checking the new version. They use browser-native registration APIs rather than Playwright's Chromium-only worker inspection APIs.

## Run locally

```sh
npm ci
npx playwright install webkit
npm run build
npm run test:webkit
```

Linux hosts may need `npx playwright install --with-deps webkit`. Reports, screenshots, storage snapshots, and failure traces are saved under `artifacts/webkit-results/` and `artifacts/webkit-report/`. They contain synthetic fixtures only.

`npm run test:release` includes WebKit alongside the existing tests. The deployment workflow also has a required `webkit` job on macOS. Deployment depends on both the existing build/data checks and that WebKit job. Local Windows execution does not verify the macOS runner; require green CI for the final release commit. `UPGRADE_BASELINE` can select an older tag for additional legacy coverage.

The release command also runs bilingual recording, route, recovery, display, duration
and statistics checks in WebKit. Statistics includes chart/period switching, daily
details, date filtering, period export, empty states and enlarged text. Those
responsive checks do not all use the iPhone device profile of the fourteen-test suite.

On this managed Windows workspace, Playwright can finish all fourteen assertions
and then wait for test-server cleanup. If that occurs, identify and stop only the
`serve-webkit-upgrade.mjs` process started by that test run; do not stop unrelated
Node processes. Confirm the runner then reports success before continuing.

## Actual installed iPhone PWA: remaining coverage

WebKit is not branded Safari or an installed iOS Home Screen app. Device emulation does not reproduce Apple's app lifecycle, storage-container separation, keyboard, installation, background suspension, or operating-system storage policies.

No Apple test setup or device-service account is available for this project at present. Real-device Appium automation has therefore not been configured or run, and passing WebKit tests must not be labelled as passing real-iPhone tests.

To add real iOS automation later, provide a dedicated test iPhone connected to a Mac with Xcode/Appium XCUITest, or an automation-capable device service. The installed PWA's web view must be inspectable. Keep the same test device, origin, and installed app across both builds; verify standalone mode and never substitute a Safari tab for the Home Screen app. Appium's support for the selected device's standalone web view must be verified during setup.

The device workflow should:

1. Install the isolated previous-release test PWA and record active and completed days through its normal controls.
2. Capture all localStorage values from that installed app's own web context.
3. Change the served build to the release candidate without reinstalling the PWA or clearing its storage.
4. Close/reopen the same Home Screen app, wait for the new version, and compare every existing stored value exactly.
5. Correct a time, reject/confirm the change, and verify originals, stars, and unrelated records.
6. Disconnect the device, close/reopen the installed app, and verify cached loading and persistent data.
7. Export results, screenshots, and the tested iOS/browser versions. Fail release approval on any mismatch.

Use synthetic records and an isolated test origin. Never automate data creation, deletion, or fixture seeding against users' production records.

References: [Playwright browsers](https://playwright.dev/docs/browsers), [Appium XCUITest](https://appium.github.io/appium-xcuitest-driver/latest/overview/).

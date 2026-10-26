# Mobile UI/UX improvements

Implemented on `feature/mobile-ux-polish`, following [the assessment](UI-UX-REVIEW.md). All copy and interactions support English and Spanish. The workday state machine, storage keys/schema, CSV format, timestamp audit data, and confirmation requirements are unchanged.

## Assessment coverage

| Recommendation | Implementation |
| --- | --- |
| Current-task hierarchy | Smaller active header, a prominent current-stop card before the quieter route, explicit current/upcoming state labels, secondary note control, and timestamps before editable distance. Completed route entries keep their original sequence numbers. |
| Readable mobile controls | System typography, 14px supporting labels, 16px fields, 44px secondary targets, 48px inputs/file chooser, and a 52px primary dock action. |
| Consistent appearance | Shared colors, borders, spacing and corner rules; restrained elevation; matching SVG note/check/close icons; consistent editor and sheet fields/actions. |
| History scanning | Concise arrival/departure rows, shared day headings, aligned route distances, omitted empty notes, and explicitly labeled recorded subtotals. Seconds, corrections, originals, and dates on overnight events remain visible. |
| Clearer language | “Workday elapsed” accurately describes the existing timer. All new statuses, settings descriptions, and notices have Spanish translations; displayed distances use locale-specific decimal separators. Native language names are shown only when they add information. |
| Better Options organization | Preferences first; consistent installation and data-transfer panels; About section explains existing browser-local storage and contains release notes. Data transfer explains where to export history. |
| Compact release notice | Once-per-version Today notice keeps its dismiss button and expandable details. Full notes remain in Options. |
| Modal usability | Shared native dialog lifecycle makes the background inert, contains Tab/Shift+Tab, handles Escape, locks background scrolling, and restores focus. Opening buttons explicitly receive focus for Safari. The note textarea has an accessible label and description. Draft cancellation keeps its existing discard safeguard. |
| Keyboard and safe-area clearance | Sheets/editors follow `visualViewport` height and offset. The dock and page clearance use measured navigation/action heights. Enlarged text stacks summary fields; long action text is visually limited to two lines while its full accessible name and full customer heading remain available. |
| Contrast and motion | Slate supporting text has approximately 5.9:1 contrast on white; input outlines approximately 3.45:1; indigo primary text/background approximately 7.9:1. Focus rings remain explicit, and animations respect reduced motion. This is not a complete accessibility certification. |

No new product capability was required. The chronological route details remain available below the focused current task.

## Verification

- Existing unit tests cover workday state, undo/reopen, validation, CSV transfer, timestamp corrections, and releases.
- `npm run test:ui -- --production` checks History layouts, focused correction/review/save, originals, stars, CSV, and offline service-worker loading.
- `npm run test:upgrade` checks exact preservation of all pre-existing stored values across six production upgrades from tagged v1.5.0, including 1,000 history records.
- `npm run test:ux -- --production` runs the new interaction checks in Chromium/Edge; append `--webkit` to run the same checks in WebKit.
- The usability matrix covers English/Spanish at 320/390/430px, full workday recording, undo, all sheets, focus containment/return, short viewports, 200% text, overnight correction review and originals, discarded drafts, CSV export, file target/focus, invalid import feedback, language, and reload persistence.
- Existing WebKit tests cover six upgrades and eight English/Spanish phone layouts. Both new usability suites are included in CI and `test:release`.

Browser tests use isolated profiles with synthetic records. Screenshots are generated under `artifacts/mobile-ux/`; WebKit screenshots are under its `webkit/` directory. Existing History and upgrade evidence remain under their original artifact directories.

The older Chromium checks now use the installed Playwright dependency to manage browser sessions and CDP transport, retaining their assertions while avoiding local raw-WebSocket command timeouts. No dependency was added.

Physical iPhone/Android software keyboards, installed-PWA lifecycle/safe areas, screen-reader interaction, and outdoor readability still require device QA. A reduced viewport exercises layout sizing, not a real operating-system keyboard. See [the manual checklist](TESTING.md) and [iOS testing limits](IOS-TESTING.md).

## Local validation results

On 26 October 2026: 42 unit tests passed; lint and production build passed; production History/offline checks passed; all six Chromium upgrade scenarios passed; all 14 existing WebKit tests passed; and all 12 new production usability scenarios passed (two languages × three widths × two browser engines). The final usability run also checks that a visit with a missing arrival and retained departure stays visible as the current task.

The existing WebKit runner needed its own test-server process stopped after its assertions completed on this managed Windows environment; it then exited successfully with 14 passed. Physical-device QA and remote CI execution were not performed.

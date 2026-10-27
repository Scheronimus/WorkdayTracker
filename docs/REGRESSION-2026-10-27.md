# Feature regression audit — 27 October 2026

Branch: `feature/mobile-ux-polish`. Application revision checked: `350205e`.

**Result: no feature regressions found in the automated checks or source review.** No application code needed changing during this audit. Recovery tests and their release/CI integration were added to protect the previously less-covered recovery flows.

## Completed checks

| Check | Result |
| --- | --- |
| Unit tests | 42 passed: workday progression, undo/reopen eligibility, timestamp validation, original-value retention, CSV parsing/compatibility, release notes, and deployment identity. |
| Lint / production build | Passed. |
| Production History/offline suite | Passed: corrected times and originals, confirmation/cancellation, CSV round trip, bilingual notes, responsive layouts, and offline reload. |
| Mobile usability | All 12 scenarios passed across Chromium/WebKit, English/Spanish, and 320/390/430px: recording, notes, undo, modal focus, large text, short viewports, correction review, draft discard, CSV export, and persistence. |
| Route / History editing | All 12 scenarios passed across the same language/engine/width matrix: edit names and kilometres, cancel drafts, distinguish zero/missing distances, preserve exact timestamps, synchronize completed Today/History records, and show final Home only after the journey starts or arrival is recorded. |
| Chromium upgrade suite | All six scenarios passed, preserving every pre-existing localStorage value byte for byte through upgrade, navigation, reload, offline access, and cancellation; includes 1,000-day history and legacy/imported data. |
| WebKit/iPhone-emulation suite | All 14 tests passed, including six upgrades, corrections, CSV, cached loading during server outage, and eight bilingual phone-width layouts. |
| Additional recovery UI suite | All four engine/language scenarios passed: undo home departure and completed customer departure; cancel Undo; undo after adding a later customer; preserve subsequent data; reopen/re-complete a day; preserve notes/home-journey state across reload; export and import into a fresh context; cancel import; skip duplicates; preserve history when preparing another day; cancel/confirm deletion; reject reopening imported records. |

The existing release gate completed successfully. The new recovery suites were run separately in both engines and then added to `test:release` and CI. The managed-Windows WebKit test-server process needed explicit cleanup after all 14 tests completed, as already documented for this workspace; the runner subsequently exited successfully.

## Source review and evidence

The core workday state machine (`src/workday.js`), correction/validation logic (`src/historyEdit.js`), and CSV parser (`src/csvImport.js`) have no changes against the stable branch. Reviewed route edits update only the selected name/distance; timestamp pencils still use the existing reviewed/confirmed correction path and retain original values. Tests verify that completed Today copies stay synchronized with History without changing unrelated records.

Evidence is generated under `artifacts/history-ui/`, `artifacts/upgrade-ui/`, `artifacts/webkit-results/`, and `artifacts/mobile-ux/`. Recovery screenshots and JSON results are under `artifacts/mobile-ux/recovery-chromium/` and `recovery-webkit/`. These contain synthetic workdays in isolated browser profiles, not personal records.

## Limits

Passing these checks establishes no detected regression in the exercised behavior; it is not a guarantee against every device-specific issue. Physical iPhone/Android keyboards, screen readers, native installation prompts, and the actual installed-PWA lifecycle remain manual/device-QA items. WebKit emulation is not a physical iPhone. Remote CI execution and deployment were not performed.

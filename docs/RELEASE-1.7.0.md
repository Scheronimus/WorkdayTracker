# Workday Tracker 1.7.0

Status: release candidate prepared on 27 October 2026 on `release/1.7.0`.
Not published, tagged or deployed.

## User changes

- Switch History between saved workdays and statistics using the header icon.
- Compare daily work/travel time in stacked bars or daily recorded kilometres.
- Choose one week, one month or three months; navigate periods or return to the
  current period. Select dates by chart, keyboard or day selector.
- Inspect aligned daily work/travel totals, open matching workdays, or use the
  accessible daily table. Export only the displayed statistics period.
- See work/travel durations directly in History cards.
- Use the compact shared trip timeline, draft customer/distance editing and
  clearer Today, History, Options and modal layouts.
- Benefit from exact decimal totals, corrected validation feedback, keyboard
  focus handling, larger controls and enlarged-text layout fixes.

All new controls and current release notes support English and Spanish.

## Compatibility and calculation rules

No storage migration or CSV format change from 1.6.0. Existing workdays, notes,
original timestamp metadata and eleven-column CSV exports remain compatible.
Legacy nine-/ten-column exports remain importable. Versions before 1.6.0 cannot
import the full-instant export format introduced by 1.6.0.

Statistics groups completed workdays by local departure date and combines records
on the same date. Overnight records stay on departure day. Invalid durations are
excluded and counted; incomplete kilometres are marked. Long valid records remain
visible with a review warning. Daily distance totals preserve decimal precision;
chart maxima round up to the next whole hour/kilometre, with a minimum of one.
List CSV export still includes all completed History. Statistics exports include
only completed records in the displayed period. CSV is not an active-day backup.

## Documentation maintenance

Updated README deployment/branch guidance, architecture/storage/statistics details,
the testing checklist, iPhone limitations and debt register. Added a documentation
index and release procedure. Archived five dated UI/regression reports with their
evidence and corrected relative links; retained the 1.6.0 release record. Removed
obsolete current guidance rather than deleting historical evidence.

## Validation

Validated locally on 27 October 2026 with candidate version 1.7.0:

| Check | Result |
| --- | --- |
| Unit and documentation tests | 60 passed, including Markdown links and package/lockfile/release-document consistency |
| Lint and production build | Passed |
| Full `npm run test:release` | Passed: production History/offline, recording, route editing, recovery, display, durations and statistics in Chromium and WebKit |
| Previous-release upgrades | All six Chromium scenarios from tagged 1.6.0 passed; all fourteen WebKit upgrade/iPhone-layout tests passed |
| Legacy upgrades | All six additional Chromium scenarios from tagged 1.5.0 passed |
| Release notice | Current English/Spanish copy, persistence and reappearance after dismissing the previous version passed |

Upgrade checks preserve every pre-existing stored value through update, reload,
offline/cached loading and cancellation; the scenarios include 1,000 completed
days. Legacy 1.5.0 WebKit was not rerun for this candidate; the candidate WebKit
upgrade gate uses 1.6.0.

Logs: `artifacts/release-1.7.0-validation.log` and
`artifacts/release-1.7.0-legacy-upgrade.log`. Upgrade reports and screenshots are in
`artifacts/upgrade-ui/`; browser evidence is in `artifacts/history-ui/`,
`artifacts/mobile-ux/` and `artifacts/webkit-results/`. These files are generated
and excluded from Git.

The candidate gate tests the previous tagged `v1.6.0` by default. Legacy `v1.5.0`
can be selected through `UPGRADE_BASELINE`; both browser suites share the setting.
See [release preparation](RELEASING.md).

Physical iPhone/Android keyboards, screen readers and installed-PWA lifecycle are
manual/device QA. Local WebKit is not an actual iPhone or macOS CI run. Remote CI
must pass for the final publication commit. See [iPhone testing](IOS-TESTING.md).

## Publication

Publication is pending approval. Follow [the release checklist](RELEASING.md) to
merge to `main`, create `v1.7.0`, push and verify deployment after approval.

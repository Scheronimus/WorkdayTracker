# Architecture

## Overview

Workday Tracker is a client-only React application rendered by `src/main.jsx`.
There is no router, backend, account system, telemetry, or external data service.
`src/App.jsx` owns the main state, persistence, navigation and CSV export.
`src/App.css` supplies component styles; `src/index.css` defines shared design tokens.

The primary views are Today (recording), History (completed records and statistics),
and Options (language, installation, data transfer and current release notes).

## Modules

| Module | Responsibility |
| --- | --- |
| `workday.js` | Journey transitions, latest timestamp undo, reopening eligibility, incomplete distances |
| `durations.js` | Work/travel split from ordered recorded instants; invalid records return null |
| `distance.js` | Exact decimal addition without changing recorded leg values |
| `RouteTimeline.jsx` | Shared chronological Today/History route and edit controls |
| `StopEditor.jsx` | Draft customer-name/incoming-distance or home-distance editing |
| `HistoryEditor.jsx`, `historyEdit.js` | Full/focused timestamp drafts, validation, review and audit metadata |
| `HistoryStatistics.jsx`, `historyStatistics.js` | Chart controls, daily grouping, period calculations, details and table |
| `csvImport.js` | Legacy/current localized CSV parsing and validation |
| `Sheet.jsx`, `useModalDialog.js` | Native modal lifecycle, keyboard containment and focus restoration |
| `ReleaseNotes.jsx`, `releaseNotes.js`, `i18n.js` | Current bilingual version notice and dismissal |

## Workday lifecycle

Only one workday is current. Customer visits proceed sequentially. A new customer
requires all previous visits to have arrival and departure timestamps. Latest
normal timestamps can be undone after confirmation without cascading deletion.

Driving home records the distance and `homeJourneyStarted`, without recording
arrival. Confirming arrival sets `arrivedHomeAt`, prepends the completed record to
History and removes any existing entry with the same ID. Starting a new day
replaces the current record without clearing History.

Only the latest locally created completed workday can be reopened, on its local
calendar day, if no different workday is active. After confirmation, reopening
clears only arrival home, removes the completed History entry, and makes it current.
Imported, older and previous-day workdays cannot be reopened.

## Persistence and data model

| localStorage key | Content |
| --- | --- |
| `workday-tracker-current` | JSON current workday or null, including a just-completed day until a new day starts |
| `workday-tracker-history` | JSON completed workdays, sorted by arrival home when loaded |
| `workday-tracker-language` | JSON string `en` or `es` |
| `workday-tracker-last-seen-release` | Plain version string of the dismissed release notice |

Effects persist workday/history/language changes. Malformed JSON falls back to a
safe default, but structurally invalid JSON objects are not comprehensively
validated (see [technical debt](TECHNICAL_DEBT.md)). Storage belongs to the browser
profile and origin; statistics preferences and filters are transient.

```js
{
  id: Number | String, // local IDs are numeric; imported IDs may be strings
  leftHomeAt: String | null, // full ISO instant
  arrivedHomeAt: String | null,
  kilometresHome: Number | null,
  homeJourneyStarted: Boolean, // older records can omit this
  note: String, // older records can omit this
  visits: [{
    id: Number | String,
    name: String,
    kilometres: Number | null,
    arrivedAt: String | null,
    leftAt: String | null
  }],
  timestampCorrections: { // optional; only after a confirmed manual correction
    'arrivedHomeAt': { original: String | null }
  }
}
```

Other correction paths include `leftHomeAt`, `visits.0.arrivedAt` and
`visits.0.leftAt`. The first original value is retained exactly through subsequent
corrections, including milliseconds. Clearing/restoring a time retains the audit
marker. Cancelled or invalid drafts create no metadata.

## History and editing

Collapsed History cards show date, time range, customer count, recorded kilometres,
and work/travel durations. Missing distance fields are marked; zero is valid.
Work time sums customer visits; travel time is the remaining elapsed time between
leaving and arriving home. Invalid or unordered timestamps show incomplete durations.

Expanded History uses the shared editable route, note, original-time details and
full editor. Stop editors save name/distance drafts explicitly. Timestamp edits
require before/after review and confirmation; name, note and distance changes do
not. Saves synchronize the matching completed Today copy and re-sort History.
Deletion affects only the selected History record after confirmation.

## Statistics

Statistics first mounts when opened from the History header. It groups completed
records by local departure date, combining several workdays on one date and
assigning overnight workdays to departure day. Time reuses `workdayDurations`;
distance uses exact decimal addition. Invalid times are excluded and counted;
missing/invalid distances are identified while recorded values remain included.
Unusually long records stay visible with a review warning.

Weeks start Monday; one or three calendar months start on the first. Daily bars
use a zero baseline and a maximum rounded up to a whole hour/kilometre (minimum
one). Three-month charts scroll; day selection, keyboard controls and a daily table
provide alternative access. View workdays filters History to the selected date.
See [statistics behavior](HISTORY-STATISTICS.md) for interaction details.

## CSV transfer

Exports run in the browser through a temporary Blob URL. List export includes all
History; statistics export includes only completed records in the displayed period.
There is one row per customer, or one empty-customer row for a day without visits.
Day-level fields repeat. Commas, quotes and newlines are escaped. Headers and
filenames follow the selected language; full ISO instants preserve dates and
milliseconds. The eleventh column stores correction metadata as JSON.

Import accepts current eleven-column and legacy nine-/ten-column exports,
validates fields and audit paths, requests confirmation, preserves existing records
and skips duplicate IDs. Versions before 1.6.0 cannot import the newer full-instant
exports. Version 1.7.0 changes neither storage schema nor CSV format from 1.6.0.
CSV is a history copy, not a backup of active workdays or preferences.

## PWA, deployment and validation

`deployment.config.mjs` defines repository identity, origin, URLs and asset paths.
Vite/PWA and QR generation consume it. The manifest uses `/WorkdayTracker/` as start
URL and scope. Workbox precaches the production shell with automatic service-worker
updates. Offline use requires the app to have been loaded and cached beforehand.

CI validates `main`, `develop` and `release/**`; only `main` deploys. Chromium and
macOS WebKit jobs gate publication. Upgrade tests default to tagged `v1.6.0`,
replace it with the candidate on the same origin, and compare storage exactly.
`UPGRADE_BASELINE` permits an additional legacy baseline. See [testing](TESTING.md),
[iPhone limitations](IOS-TESTING.md), and [release preparation](RELEASING.md).

## Diagnostics decision

No analytics, telemetry or remote error reporting is collected. Customer names,
notes, routes and timestamps remain local. Reconsider diagnostics only if backend,
account or operational requirements justify consent-based reporting that excludes
stored workday data by default.

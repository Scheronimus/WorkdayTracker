# Technical debt

This register tracks known, non-blocking engineering risks. Items belong here when the current behaviour is acceptable for production but the implementation, resilience, or maintainability should improve. Product defects and urgent security issues should be tracked separately and fixed promptly.

Priority meanings:

- **High:** address before the application or its data model grows substantially.
- **Medium:** plan when working in the affected area.
- **Low:** worthwhile improvement with limited current impact.

## Open items

### TD-001 — Local-only data has limited recovery

- **Priority:** High
- **Area:** Data resilience
- **Risk:** Workdays are stored only in `localStorage`. Removing an installed web app, clearing website data, changing origin, or losing the device can make data unavailable.
- **Current mitigation:** Users can export completed history as CSV and import that CSV into another installation.
- **Remaining gap:** CSV does not preserve an unfinished current workday, application preferences, or explicit data-format metadata.
- **Suggested completion criteria:** Provide a versioned full backup and restore format covering current workday, history, and preferences; validate it before import and document the recovery workflow.

### TD-002 — Persisted data has no explicit schema version

- **Priority:** High
- **Area:** Data integrity
- **Risk:** Application updates read stored objects directly. Future model changes could require migrations, while malformed but valid JSON may reach rendering and update logic.
- **Current mitigation:** JSON parsing failures fall back to safe defaults, and new optional fields use fallbacks.
- **Suggested completion criteria:** Store a schema version, validate persisted objects, and add tested forward migrations for every breaking model change.

### TD-003 — PWA updates are opaque on iOS

- **Priority:** Medium
- **Area:** PWA lifecycle
- **Risk:** Service-worker activation timing, cached versions, fixed Home Screen icons, and multiple installations can make users unsure which version and data container they are using.
- **Current mitigation:** The application displays its version and uses automatic service-worker updates.
- **Suggested completion criteria:** Detect a waiting update, show an “Update available” action, document iOS multiple-install behaviour, and test upgrades from the previous production release.

### TD-004 — CSV is a positional, localized interchange format

- **Priority:** Medium
- **Area:** Import/export
- **Risk:** Import relies on the existing nine- or ten-column order. Spreadsheet edits, future columns, or additional translations could make otherwise recognizable exports invalid.
- **Current mitigation:** The importer validates the file, supports the legacy and current English/Spanish exports, handles quoted fields, skips duplicate IDs, and never replaces existing history silently.
- **Suggested completion criteria:** Add a format/version marker or stable machine-readable headers, retain backward compatibility tests, and expose row-specific validation errors.

### TD-005 — Core application component is too large

- **Priority:** Medium
- **Area:** Maintainability
- **Risk:** `src/App.jsx` owns persistence, domain transitions, PWA installation, CSV workflows, translations, and most interface rendering. Changes in one concern can cause regressions elsewhere.
- **Current mitigation:** CSV parsing is isolated in its own tested module.
- **Suggested completion criteria:** Extract persistence and workday-domain hooks, then split Today, History, Options, and modal sheets into focused components without changing behaviour.

### TD-006 — Automated coverage is narrow

- **Priority:** Medium
- **Area:** Quality assurance
- **Risk:** Most workday transitions, persistence, translations, accessibility, service-worker upgrades, and mobile layouts depend on manual regression testing.
- **Current mitigation:** ESLint and production builds run in CI; CSV parsing has unit tests; `docs/TESTING.md` contains a manual checklist.
- **Suggested completion criteria:** Add component tests for critical workday flows and import confirmation, plus a small browser-level suite covering persistence, language switching, and an upgrade from stored legacy data.

### TD-007 — Deployment identity is duplicated in configuration

- **Priority:** Low
- **Area:** Release engineering
- **Risk:** Repository name, base path, production URL, QR generation, and documentation are maintained in several files. Moving or renaming the deployment could produce inconsistent links or PWA scope.
- **Current mitigation:** Production build and deployment checks catch some path failures.
- **Suggested completion criteria:** Define the production base/URL once and consume it from Vite configuration, QR generation, launch guidance, and documentation generation.

### TD-008 — No production diagnostics

- **Priority:** Low
- **Area:** Operability
- **Risk:** The client-only application has no privacy-conscious error reporting, so failures are known only when a user reports them.
- **Current mitigation:** The application has a small surface area and avoids a backend or account data.
- **Suggested completion criteria:** Decide explicitly whether diagnostics are warranted; if adopted, collect only minimal technical errors with consent and without customer names, notes, routes, or timestamps.

## Maintenance rules

- Review this file during production-readiness reviews and before minor releases.
- Add an owner or target release when an item is scheduled.
- Link the implementing pull request or commit when closing an item.
- Remove completed items from **Open items** and record them below with the completion date.

## Completed items

None yet.

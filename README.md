# Workday Tracker

Workday Tracker is a mobile-first browser application for recording a workday made up of travel from home, customer visits, and travel back home. Data is stored locally in the browser; the application has no accounts, backend, GPS, or cloud storage.

## Features

- Record leaving home and arriving home with timestamps.
- Undo the latest normal timestamp without removing later workday data.
- Reopen the latest locally completed workday on the same calendar day, after confirmation, when no other workday is active.
- Add sequential customer visits and record arrival and departure times.
- Record optional kilometres between stops and before starting the final journey home.
- Review and correct the final-journey kilometres when recording arrival home.
- Add and edit an automatically saved note for the whole workday.
- Keep completed workdays in persistent, expandable history with work/travel duration summaries.
- Switch History to daily time or kilometre charts for a week, month, or three months; inspect a date and open its workdays.
- Identify completed days with missing journey kilometres directly in History.
- Edit active-day kilometres and correct completed workdays using a draft editor for names, notes, kilometres, and all dates/times.
- Review before/after timestamp changes and explicitly confirm before saving; other edits save without an extra confirmation.
- Correct any History timestamp directly using its Edit button, with a focused time/date dialog and saved confirmation.
- Manually corrected timestamps show `*` and retain their original recorded value, including through CSV export/import.
- See concise English/Spanish “What’s new” notes once per version, or read them again from Options.
- Delete individual completed workdays after confirmation.
- Export all completed workdays as CSV, or export only the displayed statistics period.
- Import completed workdays from Options using a CSV exported by an earlier installation; existing history is preserved and duplicates are skipped.
- Switch between English and Spanish (Spain) from Options, with the preference saved locally.
- Install as a Progressive Web App (PWA) and use the cached application shell offline.
- Follow the in-app iPhone/iPad installation guidance from Options.

## Technology stack

- React 19
- Vite 8
- Plain JavaScript and CSS
- Browser `localStorage`
- `vite-plugin-pwa` / Workbox-generated service worker
- ESLint
- Node.js test runner and Playwright (Chromium/WebKit)

## Prerequisites

- Node.js and npm. The deployment workflow uses Node.js 24; the repository does not declare a minimum local Node.js version.
- A modern browser with `localStorage` support.

## Installation

```sh
npm ci
```

## Run locally

### One-click start on Windows

Double-click **`Start Workday Tracker.cmd`** in the project folder. The launcher installs dependencies when needed, starts the local server, and opens the app in your default browser.

Keep the launcher window open while testing. Press `Ctrl+C` in that window to stop the app.

### One-click mobile testing

Connect the computer and phone to the same Wi-Fi, then double-click **`Start Workday Tracker on Mobile.cmd`**. Scan the QR code displayed in the terminal with the phone camera. There is no URL to type.

### Production app on mobile

Scan this QR code with the phone camera to open the deployed application:

<img src="docs/production-app-qr.svg" width="220" alt="QR code for the deployed Workday Tracker application" />

[Open Workday Tracker](https://scheronimus.github.io/WorkdayTracker/)

On iPhone or iPad, open **Options** in the app and follow the instructions to add it to the Home Screen.

### Command line

```sh
npm start
```

The browser opens automatically. To start without opening a browser:

```sh
npm run dev
```

Open the local URL printed by Vite.

## Production build

```sh
npm run build
```

The generated production files are written to `dist/`. To serve that build locally:

```sh
npm run preview
```

## Validation

Run `npm run test:release` before publication. It checks unit tests, documentation
links and release versions, lint, production build, browser workflows and upgrades
from the previous tagged release. Browser setup, manual/device checks and evidence
locations are documented in [Testing](docs/TESTING.md).

## Git workflow

- `main` is the stable branch and is deployed to GitHub Pages.
- `develop` is the development branch.
- Develop features on `feature/*` branches and merge verified work into `develop`.
- Prepare a minor release on `release/<version>` from `develop`; verify the candidate before merging approved stable changes into `main`. See [the release checklist](docs/RELEASING.md).

## Deployment

Deployment is implemented by `.github/workflows/deploy.yml` using GitHub Actions and GitHub Pages.

The workflow validates pushes to `main`, `develop`, and `release/**`, and can also be started with `workflow_dispatch`. Only `main` deploys to GitHub Pages. It:

1. Checks out the repository on Ubuntu.
2. Configures Node.js 24 with npm caching.
3. Installs locked dependencies with `npm ci`.
4. Runs the automated tests, including deployment-identity consistency checks.
5. Lints the project.
6. Builds the application with `npm run build`.
7. Runs production browser checks and the strict upgrade suite from the tagged previous release (currently `v1.6.0`), including exact preservation of existing stored data.
8. Retains validation evidence and configures GitHub Pages.
9. Uploads `dist/` as the Pages artifact.
10. Requires the separate macOS WebKit/iPhone-emulation upgrade and layout job to pass, then deploys the artifact with `actions/deploy-pages` to the `github-pages` environment.

`deployment.config.mjs` is the source of truth for the repository name, production origin, base path, production URL, and deployment-relative asset paths. Vite, the PWA manifest, and production QR generation consume it directly. The automated tests also confirm that the deployment guidance below remains consistent with it.

Vite uses the base path `/WorkdayTracker/`. The PWA manifest uses the same start URL and scope. The deployed application is available at <https://scheronimus.github.io/WorkdayTracker/>.

After changing the deployment identity, regenerate the committed production QR code:

```sh
npm run generate:production-qr
```

## Project documentation

- [Changelog](CHANGELOG.md)
- [Version 1.7.0 release notes](docs/RELEASE-1.7.0.md)
- [Release preparation and publication](docs/RELEASING.md)
- [History statistics and data rules](docs/HISTORY-STATISTICS.md)
- [Documentation index and archived reviews](docs/README.md)
- [Safari and iPhone test coverage](docs/IOS-TESTING.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Testing and regression checklist](docs/TESTING.md)
- [Technical debt register](docs/TECHNICAL_DEBT.md)

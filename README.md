# Workday Tracker

Workday Tracker is a mobile-first browser application for recording a workday made up of travel from home, customer visits, and travel back home. Data is stored locally in the browser; the application has no accounts, backend, GPS, or cloud storage.

## Features

- Record leaving home and arriving home with timestamps.
- Add sequential customer visits and record arrival and departure times.
- Record optional kilometres between stops and from the final customer to home.
- Add and edit an automatically saved note for the whole workday.
- Keep completed workdays in persistent, expandable history.
- Edit kilometre values in active and completed workdays.
- Delete individual completed workdays after confirmation.
- Export all completed workdays as CSV.
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

## Git workflow

- `main` is the stable branch and is deployed to GitHub Pages.
- `develop` is the development branch.
- Develop and verify changes on `develop`, then merge approved stable changes into `main`.

## Deployment

Deployment is implemented by `.github/workflows/deploy.yml` using GitHub Actions and GitHub Pages.

The workflow runs automatically for pushes to `main` and can also be started with `workflow_dispatch`. It:

1. Checks out the repository on Ubuntu.
2. Configures Node.js 24 with npm caching.
3. Installs locked dependencies with `npm ci`.
4. Builds the application with `npm run build`.
5. Configures GitHub Pages and uploads `dist/` as the Pages artifact.
6. Deploys the artifact with `actions/deploy-pages` to the `github-pages` environment.

Vite uses the base path `/WorkdayTracker/`. The PWA manifest uses the same start URL and scope. The deployed application is available at <https://scheronimus.github.io/WorkdayTracker/>.

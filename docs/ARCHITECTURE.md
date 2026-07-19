# Architecture

## Overview

The application is a client-only React single page rendered into `#root` by `src/main.jsx`. `src/App.jsx` contains the application component, state transitions, persistence, history, formatting, and CSV export. `src/App.css` contains component styling, while `src/index.css` provides global styles. There is no router, backend, account system, or external data service.

The interface is mobile-first and presents three related areas:

- Current-day controls for leaving home, adding and timing customer visits, and arriving home.
- A single “Start new day” action after completion.
- Expandable completed-workday history, including kilometre editing, deletion, and CSV export.

## Application state

`App` owns four React state values:

- `workday`: the current workday object or `null`.
- `history`: an array of completed workdays, sorted newest first when loaded.
- `name`: the customer-name form value.
- `kilometres`: the new-customer kilometre form value.

Only one workday is current. Customer visits proceed sequentially: a new customer can be added only when the previous visit has been left. Arriving home completes the current workday, adds it to history, and hides its active-day detail. Starting a new day replaces the current workday with an empty one without clearing history.

## Persistence

Two JSON values are stored in browser `localStorage`:

| Key | Content |
| --- | --- |
| `workday-tracker-current` | Current workday, including a just-completed workday until a new day starts |
| `workday-tracker-history` | Array of completed workdays |

React effects write each value after state changes. Invalid stored JSON falls back to `null` for the current workday or an empty history array. Data is local to the browser profile and origin.

## Data models

Workday:

```js
{
  id: Number,                 // Date.now() at creation
  leftHomeAt: String | null, // ISO timestamp
  arrivedHomeAt: String | null,
  kilometresHome: Number | null,
  visits: CustomerVisit[]
}
```

Customer visit:

```js
{
  id: Number,                // Date.now() when added
  name: String,
  kilometres: Number | null,
  arrivedAt: String | null,  // ISO timestamp
  leftAt: String | null      // ISO timestamp
}
```

Kilometre values may remain `null` and can be edited later. Customer names and recorded timestamps are not editable after creation.

## History management

Completing a workday prepends it to history and removes an existing history object with the same workday ID. History cards show the date, times, visit count, and the sum of recorded kilometre values. Expanding a card shows its visits and editable kilometre fields. Deletion uses a browser confirmation dialog and filters only the selected ID from history; the persistence effect saves the result.

## CSV export

CSV export runs entirely in the browser. It produces one row per customer visit and one row with empty customer fields for a workday without visits. Workday-level fields repeat on every row. Values containing commas, quotes, or line breaks are quoted, and embedded quotes are doubled. A `Blob` and temporary object URL trigger a download named `workday-history-YYYY-MM-DD.csv`.

## PWA support

`vite-plugin-pwa` is configured in `vite.config.js` with automatic service-worker updates. The generated manifest identifies the app as “Workday Tracker,” uses standalone display mode, and sets both scope and start URL to `/WorkdayTracker/`. The production build generates the service worker and precaches the built application assets, supporting installation and offline loading of the cached application shell.

# Manual Regression Checklist

## Start the app

On Windows, double-click **`Start Workday Tracker.cmd`** in the project folder. It installs dependencies when necessary, starts the server, and opens the correct local URL automatically. Keep its terminal window open during testing and press `Ctrl+C` there when finished.

From a terminal, the equivalent command is:

```sh
npm start
```

To test on a phone, connect the phone and computer to the same Wi-Fi and double-click **`Start Workday Tracker on Mobile.cmd`**. Scan the QR code in the terminal with the phone camera. Keep the terminal open during testing.

Run these checks in a modern browser. Use a production build served with `npm run preview` for PWA and offline checks.

## Initial state and start new day

- [ ] With no saved data, confirm today’s date, “Workday ready,” and “Leave home now” are shown.
- [ ] Select “Leave home now” and confirm the workday begins with a visible timestamp.
- [ ] Complete a day, select “Start new day,” and confirm a prepared workday for today is shown without deleting History.
- [ ] Refresh before leaving home and confirm the fresh current day remains available.

## Add customer

- [ ] Leave home and add a customer with a name and kilometre value.
- [ ] Confirm the customer appears with the entered name and kilometres.
- [ ] Add a customer with an empty kilometre field and confirm the workflow is not blocked.
- [ ] Confirm another customer cannot be added until the current customer has been left.
- [ ] After leaving a customer, add another and confirm both appear in sequence.

## Edit customer

- [ ] Confirm customer names and recorded timestamps are displayed but are not editable.
- [ ] Confirm the supported customer edit—the kilometres from the previous stop—can be changed during an active day.

## Customer timestamps

- [ ] Select “Arrive now” and confirm an arrival timestamp appears.
- [ ] Confirm “Leave now” becomes available only after arrival.
- [ ] Select “Leave now” and confirm a departure timestamp appears.
- [ ] Refresh and confirm all recorded timestamps remain unchanged.

## Edit kilometres

- [ ] Enter, change, and clear kilometres on an active customer visit.
- [ ] Enter, change, and clear kilometres from the last customer to home.
- [ ] Confirm empty kilometre values remain valid and do not block any action.
- [ ] In expanded History, edit and clear both types of kilometre value and confirm totals update.
- [ ] Refresh and confirm History kilometre edits persist.

## Finish workday

- [ ] Confirm “Finish workday at home” is unavailable while a customer is present but has not been left.
- [ ] Confirm each kilometre field names its journey leg, such as “Kilometres from home to Customer 1” and “Kilometres from Customer 1 to Customer 2.”
- [ ] Confirm the final-journey kilometre field is not displayed in the active route.
- [ ] Select “Finish workday at home” and confirm the finish sheet opens with a field labelled “Kilometres from [final customer] to home.”
- [ ] Close the finish sheet and confirm the active workday remains unchanged.
- [ ] Open the finish sheet again, enter a kilometre value, and select “Confirm and finish workday.”
- [ ] Confirm the active-day details disappear and only “Start new day” remains for the current day.
- [ ] Confirm the completed day is added to History immediately.

## History

- [ ] Complete multiple workdays and confirm History displays newest first.
- [ ] Confirm each collapsed entry shows its date, leave/arrival times, customer count, and recorded kilometre total when available.
- [ ] Expand each entry and confirm all customer names, arrival/departure times, and kilometre fields are present.
- [ ] Confirm a completed workday with no customers is displayed correctly.
- [ ] Confirm History date headers remain horizontally aligned when entries are open or closed.

## Delete workday

- [ ] Select “Delete day” and cancel the confirmation; confirm nothing is deleted.
- [ ] Select “Delete day,” accept the confirmation, and confirm only that history entry disappears.
- [ ] Refresh and confirm the deleted entry remains deleted and other entries remain intact.

## CSV export

- [ ] Select “Export CSV” and confirm a file named `workday-history-YYYY-MM-DD.csv` downloads.
- [ ] Confirm the columns appear in the documented application order and every completed workday is included.
- [ ] Confirm each customer visit has its own row with repeated workday-level values.
- [ ] Confirm a workday without customers has one row with empty customer fields.
- [ ] Confirm empty kilometre fields remain empty in the CSV.
- [ ] Use a customer name containing a comma, quote, or line break and confirm the resulting CSV remains correctly structured.

## Persistence after restart

- [ ] During an active day, close and reopen the browser or tab and confirm the current workday is restored.
- [ ] After completing days, close and reopen the browser or tab and confirm History is restored.
- [ ] Confirm the application data is isolated to the current browser profile and deployed origin.

## Language

- [ ] Open Options, choose Español, and confirm Today, History, Options, dialogs, journey labels, and dates switch to Spanish immediately.
- [ ] Refresh and restart the app, then confirm Spanish remains selected.
- [ ] Export History in Spanish and confirm the CSV filename and column headings are translated.
- [ ] Choose English and confirm the complete interface returns to English and remains English after refresh.

## PWA installation

- [ ] Build and serve the production application, then confirm the browser offers PWA installation where supported.
- [ ] Install the PWA and confirm it opens in standalone mode.
- [ ] Confirm the installed app starts at `/WorkdayTracker/`.

## Offline mode

- [ ] Load the production application online once and wait for service-worker registration.
- [ ] Switch the browser to offline mode and reload the installed app or production URL.
- [ ] Confirm the cached application shell loads.
- [ ] Record or edit data offline, reload, and confirm localStorage persistence still works.

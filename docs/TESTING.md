# Manual Regression Checklist

## Mobile design and usability

`npm run test:recovery` (after building; append `-- --webkit` for WebKit) checks English/Spanish recovery through the actual UI: cancel/confirm leaving-home and departure Undo, Undo after adding a later customer, reopen and re-complete a day, preserve notes and home-journey state across reload, export then restore CSV into a fresh isolated context, cancel import, skip duplicates, preserve history when preparing another day, and cancel/confirm deletion. It also verifies imported days cannot be reopened as local workdays. Evidence is under `artifacts/mobile-ux/recovery-chromium/` and `recovery-webkit/`. Both variants are included in release and CI checks.

`npm run test:route` (after building) verifies the compact route and customer/distance editor in English/Spanish at 320/390/430px. Append `-- --webkit` for WebKit. It covers Save/Cancel/Escape, validation and corrected errors, first-invalid-field focus, zero versus missing distances, renamed journey labels, timestamp preservation, and final Home visibility only after departure home. Screenshots are under `artifacts/mobile-ux/route-chromium/` and `route-webkit/`. Both variants are part of release and CI checks.

The route suite also opens the completed workday in History, checks the same chronological timeline and all timestamp pencils, cancels and saves customer edits, verifies the matching completed Today record stays synchronized, and checks cancellation of timestamp correction. History screenshots use the `-history.png` suffix. Imported completed days show the recorded final Home even when older records do not have a home-journey flag.

Run `npm run test:ux` for development or `npm run test:ux -- --production` after building. Set `BROWSER_PATH` if Chromium/Edge is not automatically detected. Run `npm run test:ux -- --production --webkit` with Playwright WebKit installed to check the same flows in WebKit. Both are included in `test:release` and CI.

The suite uses isolated synthetic records in English and Spanish at 320, 390, and 430 pixels. It checks a complete workday, timestamp undo, all sheets, Tab/Shift+Tab containment, Escape and focus restoration, 200% text, a shorter keyboard-sized viewport, overnight dates/originals, correction review, draft discard, CSV export, file-picker focus/target size, language and reload persistence. Screenshots are saved in `artifacts/mobile-ux/`.

These checks do not emulate an actual software keyboard or an installed phone app. On physical iPhone and Android devices, verify that opening each input keeps it and the relevant action reachable; try portrait/landscape and installed/browser modes. Also check screen-reader labels, large text, outdoor readability, long customer names, and the eight-hour warning in both languages. The chronological route and all existing recording, recovery, confirmation, import/export, and offline behavior must remain available.

## Production upgrade gate

Run `npm run test:release` before publication. It includes `npm run test:upgrade`, which builds tagged v1.5.0 and updates it to the candidate on the same browser origin through the real service worker. Every pre-existing localStorage value must remain byte-for-byte identical through update, reload, navigation, offline loading and cancellation. Confirmed corrections and actual old/new CSV exports are also checked. Evidence is saved under `artifacts/upgrade-ui/`.

The upgrade fixture matrix covers active visits, travel home, completed/current duplicates, imported string IDs, legacy missing fields, Spanish/English, overnight dates, milliseconds, special characters, and 1,000 workdays. CI blocks deployment if the upgrade or browser suite fails. `npm run test:webkit` additionally runs fourteen WebKit/iPhone-emulation tests; a required macOS job runs them before deployment. Actual installed-iPhone testing still requires a device setup; see [iOS testing](IOS-TESTING.md).

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

- [ ] Confirm customer names are displayed but are not editable.
- [ ] Confirm the supported customer edit—the kilometres from the previous stop—can be changed during an active day.

## Customer timestamps

- [ ] Select “Arrived at [customer]” and confirm an arrival timestamp appears.
- [ ] Confirm “Leave [customer]” becomes available only after arrival.
- [ ] Select “Leave [customer]” and confirm a departure timestamp appears.
- [ ] Confirm only the latest recorded timestamp has an “Undo” action and that it does not use destructive-delete styling.
- [ ] Select “Undo,” cancel the warning, and confirm the timestamp remains unchanged.
- [ ] Confirm the Undo warning identifies “Arrived” or “Left,” includes the customer name and recorded date/time, says the time cannot be recovered, and says other workday data is preserved.
- [ ] Undo a departure and confirm only that timestamp is cleared and the departure action becomes available again.
- [ ] Undo the arrival next and confirm all customers, kilometres, notes, and earlier timestamps remain unchanged.
- [ ] Add an untimestamped customer and confirm leaving-home cannot be undone while that customer exists.
- [ ] Add a second customer, undo the preceding departure, and confirm the app returns to that departure before allowing the second customer arrival.
- [ ] Refresh and confirm all recorded timestamps remain unchanged.
- [ ] Keep or simulate an active workday lasting eight hours and confirm the long-workday warning appears without ending the workday.

## Edit kilometres

- [ ] Enter, change, and clear kilometres on an active customer visit.
- [ ] Before driving home, enter, change, and clear kilometres from the final customer to home.
- [ ] Confirm empty kilometre values remain valid and do not block any action.
- [ ] In expanded History, edit and clear both types of kilometre value and confirm totals update.
- [ ] Refresh and confirm History kilometre edits persist.

## Day note

- [ ] During an active workday, select “Add day note” and confirm the note sheet opens.
- [ ] Enter a multiline note, close the sheet, and confirm the action changes to “Edit day note” with a saved indicator.
- [ ] Reopen the note, edit it, refresh the app, and confirm the latest text persists.
- [ ] Finish the workday, open it in History, and confirm the note is displayed and remains editable.
- [ ] Export History and confirm the day note is included in the CSV.
- [ ] Switch to Español (España) and confirm the complete note workflow is translated.

## Finish workday

- [ ] Confirm “Drive home” is unavailable while a customer is present but has not been left.
- [ ] Confirm each kilometre field names its journey leg, such as “Kilometres from home to Customer 1” and “Kilometres from Customer 1 to Customer 2.”
- [ ] Confirm the final-journey kilometre field is not displayed in the active route before choosing “Drive home.”
- [ ] Select “Drive home” and confirm the sheet opens with a field labelled “Kilometres from [final customer] to home.”
- [ ] Enter a kilometre value, select “Start driving home,” and confirm no arrival timestamp is recorded yet.
- [ ] Refresh and confirm the home journey and kilometre value remain active.
- [ ] Select “Arrived home,” review or change the kilometre value, and confirm the arrival.
- [ ] Confirm the active-day details disappear and only “Start new day” remains for the current day.
- [ ] Confirm the Today header does not show a “Workday complete” status after finishing.
- [ ] Confirm the completed day is added to History immediately.
- [ ] Select “Reopen workday,” cancel its confirmation, and confirm the completed day is unchanged.
- [ ] Confirm the reopen message identifies “Arrived home” and its recorded date/time, says the time cannot be recovered, and says all other workday data is preserved.
- [ ] Confirm reopening clears only arrival home, removes the day from History, and restores the active route.
- [ ] Reload after completion, reopen from History, and confirm the same recovery behaviour.
- [ ] Confirm only the latest locally completed day offers reopening; older and imported days do not.
- [ ] Advance to the next local calendar day and confirm the previously completed workday can no longer be reopened.
- [ ] Start a different active workday and confirm completed History entries cannot be reopened.

## History

- [ ] Complete multiple workdays and confirm History displays newest first.
- [ ] Confirm each collapsed entry shows its date, leave/arrival times, customer count, and recorded kilometre total when available.
- [ ] Finish a day with any customer or final-journey kilometre field blank and confirm its collapsed History entry immediately shows “Kilometres incomplete.”
- [ ] Enter `0` in every journey field and confirm the incomplete warning is not shown.
- [ ] Fill the missing fields from History and save the draft and confirm the warning disappears; clear one, save again and confirm it returns.
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

## Import old history

- [ ] Confirm “Import old history” appears under “Data transfer” in Options and no longer appears at the top of History.
- [ ] Import a valid previous export and confirm the existing duplicate, confirmation, and status behaviour is unchanged.
- [ ] Switch to Español (España) and confirm the complete Data transfer panel is translated.

## Persistence after restart

- [ ] During an active day, close and reopen the browser or tab and confirm the current workday is restored.
- [ ] After completing days, close and reopen the browser or tab and confirm History is restored.
- [ ] Confirm the application data is isolated to the current browser profile and deployed origin.

## Language

- [ ] Open Options, choose Español (España), and confirm the Today, History, and Options sections, dialogs, journey labels, and dates switch immediately using Spanish (Spain) conventions.
- [ ] Refresh and restart the app, then confirm Spanish remains selected.
- [ ] Export History in Spanish and confirm the CSV filename and column headings are translated.
- [ ] Choose English and confirm the complete interface returns to English and remains English after refresh.

## Primary navigation

- [ ] Confirm Today, History, and Options use consistently sized 2D outline icons in inactive and active states.

## PWA installation

- [ ] Scan the production QR code in the README and confirm it opens `https://scheronimus.github.io/WorkdayTracker/`.
- [ ] Build and serve the production application, then confirm the browser offers PWA installation where supported.
- [ ] On iPhone or iPad, open Options and confirm the Share → Add to Home Screen instructions appear.
- [ ] On a supported Chromium browser, open Options and confirm the install button opens the native installation prompt.
- [ ] Install the PWA and confirm it opens in standalone mode.
- [ ] Confirm the installation panel is hidden when running as an installed app.
- [ ] Confirm the indigo “route W” icon appears on the Home Screen.
- [ ] Confirm the installed app starts at `/WorkdayTracker/`.

## Offline mode

- [ ] Load the production application online once and wait for service-worker registration.
- [ ] Switch the browser to offline mode and reload the installed app or production URL.
- [ ] Confirm the cached application shell loads.
- [ ] Record or edit data offline, reload, and confirm localStorage persistence still works.

## History draft editor (v1.6)

- [ ] Open History ? Edit workday on desktop and phone; verify dates/times, customer names, kilometres and note are editable.
- [ ] Edit names, note and kilometres only; Save changes must save directly without timestamp confirmation.
- [ ] Change each timestamp type, including clearing an optional customer time; Save changes must show previous and new values, without modifying stored history.
- [ ] Return from review and edit again; only Confirm and save may persist timestamp changes and the other draft fields together.
- [ ] Cancel or press Escape with changes; Keep editing retains the draft and Discard changes leaves stored data unchanged.
- [ ] Enter invalid chronology, blank names and negative kilometres; errors identify fields and prevent saving.
- [ ] Test zero kilometres, blank kilometres, imported entries, no customers, equal times and overnight/multi-day journeys.
- [ ] Reload after saving; verify history order, totals, incomplete-distance badges, notes and the matching completed Today entry.
- [ ] Export and re-import corrected multi-day records into a separate browser profile; verify exact timestamps.
- [ ] Repeat confirmation and cancellation in Spanish; verify keyboard focus stays in the dialog and returns to Edit workday after closing.

## Version notice

- [ ] On a fresh installation or after a version change, verify Today shows a concise “What’s new” card with the current package version.
- [ ] Dismiss it and reload: it stays hidden without changing current workday or history data.
- [ ] Read the notes again from Options → What’s new. Switch to Spanish and verify the notes and controls are translated.
- [ ] Verify the card fits a narrow phone screen, can be dismissed by keyboard, and is available offline with the cached app.
- [ ] For each release, update `package.json`/lockfile, the current notes in `src/i18n.js`, and `CHANGELOG.md`. Keep unreleased changes marked Unreleased until release.

## Quick timestamp correction checks

Run `npm run test:ui` with Edge or Chromium installed (or set `BROWSER_PATH`). It uses a temporary browser profile and synthetic data, verifies history row widths at 320, 390, 485 and 1280 pixels, exercises timestamp review and saving, and writes screenshots to `artifacts/history-ui/`. It requires permission to launch browser rendering processes. Screenshots are excluded from Git.

- [ ] Finish a day late, open History, and select Edit beside Arrived home. Confirm the dialog shows the workday date, recorded timestamp, time field first, and a separate date field.
- [ ] Set the correct time and select Review change. Confirm stored data is unchanged until Confirm and save, and that Recorded and Corrected values identify the full dates and times.
- [ ] Return to editing from review; verify the correction remains. Cancel and discard; verify the original time remains.
- [ ] Confirm a correction; verify Changes saved appears, history updates, the matching completed Today entry updates, and reloading preserves the correction.
- [ ] Correct home departure and each customer arrival/departure using their own Edit buttons. Verify other timestamps, customer names, notes and kilometres are preserved exactly.
- [ ] Enter an arrival home before the last customer departure. Verify the conflict blocks confirmation and explains how to use Edit workday for several corrections.
- [ ] Correct an overnight date, fill an unrecorded customer timestamp, and clear an optional customer timestamp; verify each change requires confirmation.
- [ ] Test the focused dialog at phone width and with the keyboard; verify the time field receives focus and all actions remain reachable. Repeat in Spanish.
- [ ] Correct a timestamp and verify `*` appears only beside that timestamp (also in the collapsed summary for home times), with its original time underneath. Confirm its tooltip/accessible label explains the marker in both languages.
- [ ] Correct the same timestamp again, then reload: the first recorded time must remain unchanged. Cancelled/invalid edits and changes to names, notes or kilometres must not add stars.
- [ ] Clear a customer timestamp and verify the original remains available; filling an originally missing time should show that no original was recorded.
- [ ] Export and re-import corrected history into a separate profile: verify stars, original timestamps and current values survive.

# History statistics

The chart button in the History header switches between the saved-workday list
and statistics. Time uses stacked work/travel bars; Distance uses daily kilometre
bars. One week starts on Monday. One month starts on the first day; three months
starts on the first day of the selected month and covers three consecutive calendar
months. Previous/next moves by the selected period, and Current period returns to
the present. Statistics initially shows the current month.

Daily totals group completed workdays by local departure date, including overnight
records. Multiple workdays on one date are combined. Calculations reuse the existing
duration and distance helpers; no totals or chart state are written into saved
workdays. Invalid duration records are excluded and counted. Incomplete distances
are marked and recorded distances remain included. Records longer than 24 hours
remain visible with a review warning.

Select a bar, use arrow/Home/End keys, or use the day selector for details. View
workdays filters the list to that date and opens the first entry. Show all workdays
clears the filter. Chart selections survive the switch between statistics and the
list. The list scroll position is restored by the header toggle. Three-month charts
scroll horizontally; a daily data table provides an alternative to the chart.
The chart maximum rounds up to the nearest whole hour or kilometre, with a minimum
of one. Daily distance aggregation preserves decimal precision so floating-point
tails cannot inflate this maximum. Chart data is first rendered when statistics
is opened, and keyboard Tab visits the selected bar while arrow keys navigate days.

Export period CSV uses the existing CSV schema and includes only completed records
within the displayed date range. List export continues to export the full history.

Validation:

```sh
npm test
npm run lint
npm run build
npm run test:statistics
npm run test:statistics -- --webkit
```

Browser checks cover English and Spanish at 320, 390 and 1280 px, 200% text,
period navigation, totals, metric switching, keyboard selection, daily drilldown,
filtered exports, empty history, and unchanged saved workday contents. Screenshots
are written under `artifacts/mobile-ux/statistics-{chromium,webkit}/`.
Both browser variants are included in `test:release` and CI.

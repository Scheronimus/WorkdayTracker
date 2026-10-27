# Second UI/UX pass — 27 October 2026

## Assessment

The current direction is coherent: Today emphasizes the active task, the route reads chronologically without large completed-stop cards, History uses the same inline time treatment, and the green arrival-home check clearly signals completion. The next improvements are fit-and-finish corrections rather than another redesign or new features.

This pass inspected rendered Today, History, full editing, and Options screens in English and Spanish at 320, 390, and 430px, including 200% text, long customer names, and decimal distances. Synthetic records and isolated Chromium/WebKit contexts were used.

## Findings addressed

| Issue | Resolution |
| --- | --- |
| Adding 0.1 km and 0.2 km displayed `0.30000000000000004 km`, which crowded the overview and made the result look unreliable. | Sum the recorded decimal representations for display. The overview and History now show `0.3 km` / `0,3 km`; original leg values, timestamps, and CSV formats are unchanged. Zero and missing kilometres remain distinct. |
| Full History editing retained an error after the user corrected the field, unlike the newer stop editor. | Revalidate a previously submitted draft when a field changes, including related time-order conflicts. Corrected errors clear without saving anything or bypassing timestamp review. |
| The last route connector used a fixed height, so larger text or wrapped leg labels could separate it from its stop. | Make the connector follow the stop's actual layout and mask the continuation below its marker. |
| Enlarged text made decorative route numbers extend outside their fixed-size circles. | Keep the number fitted within its marker. The actual customer name, state, and timestamps continue to scale with text size. |

## Design decisions retained

- Keep the flat route and inline arrival/departure labels in both Today and History.
- Keep the final Home hidden until the journey begins; use a green check only for a recorded arrival.
- Keep Undo quiet, borderless, and keyboard named, with its 44px target.
- Keep name/distance editing as a small draft sheet with explicit Save/Cancel.
- Keep full dates for overnight timestamps, correction stars, original values, notes, and existing confirmations.
- Keep Options grouped into language, installation where applicable, transfer, and app information. No additional navigation or product features were introduced.

## Validation

Passed: 45 unit tests, lint, production build, production History/offline checks, six Chromium upgrade scenarios including 1,000 days, twelve mobile usability scenarios, twelve route/editing scenarios, four recovery/import scenarios, and twelve new design scenarios. The language/width matrices run in Chromium and WebKit.

The new design suite checks decimal totals, error recovery, unchanged stored records while formatting/validating, number containment at enlarged text, no horizontal page overflow, and fresh screenshots of each reviewed screen. It is included in release and CI checks as `npm run test:design` and `npm run test:design -- --webkit`.

Screenshots:

- [Today, Spanish, 320px](../artifacts/mobile-ux/design-chromium/es-320-today.png)
- [History, Spanish, 390px](../artifacts/mobile-ux/design-chromium/es-390-history.png)
- [Full editor, Spanish, 390px](../artifacts/mobile-ux/design-chromium/es-390-editor.png)
- [Options, Spanish, 390px](../artifacts/mobile-ux/design-chromium/es-390-options.png)
- [Enlarged-text route, Spanish, 320px](../artifacts/mobile-ux/design-chromium/es-320-route-large-text.png)

## Remaining device review

No blocking issue was found in the reviewed normal phone layouts after these fixes. At 200% text, long names and navigation labels still wrap; their content stays available rather than being hidden. Test physical phone keyboards, screen readers, installed-PWA safe areas, and outdoor readability before release. Compact History timestamp pencils retain 44px-wide × 24px-high targets to preserve the approved compact rows; verify their comfort on the intended phone. Native date/number controls also follow browser/device preferences, which can differ from the selected app language.

This is a rendered UI/source review, not a physical-device usability study or a claim of complete accessibility conformance. No deployment or remote CI execution was performed.

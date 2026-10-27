> Historical review from October 2026. Findings and test counts describe that revision, not the current release. See the [current documentation](../../README.md). Screenshot links refer to generated local artifacts.

# Compact Today route — independent UX assessment

27 October 2026 · `feature/mobile-ux-polish`

The user approved a compact chronological route with kilometre legs between stops, customer-name/distance editing, the existing subtle Undo, and no return-home stop before starting the journey home.

An independent UI/UX reviewer agent assessed the rendered English/Spanish phone screenshots and implementation, separately from the implementing agent. Result: **approved for review; no remaining blocking UI/UX issues identified**.

The reviewer found that the continuous route is easier to read at 320px and 390px; distances are visibly between stops; `0 km` and missing distances remain distinct; customer pencils are discoverable without dominating; and latest Undo no longer expands a completed stop. The source retains 44px edit targets, chronological current-stop representation, draft Save/Cancel, original timestamp data, and conditional final Home visibility.

The review identified a stale validation error after correcting a customer name. This was fixed by clearing the field error on edits and focusing the first invalid field on failed Save. The reviewer inspected the corrected screenshot/source and approved the change.

Validation: 42 existing unit tests; lint and production build; production History/offline checks; twelve existing mobile-usability scenarios across Chromium/WebKit; and twelve new route scenarios across Chromium/WebKit, English/Spanish, and 320/390/430px passed. Route checks cover cancellation, Escape, validation, focus restoration, zero/missing distances, name updates in leg labels, exact timestamp preservation, and home-leg editing without recording arrival.

Screenshots with synthetic records:

- [Spanish route, 390px](../../../artifacts/mobile-ux/route-chromium/es-390-route.png)
- [Spanish stop editor, 390px](../../../artifacts/mobile-ux/route-chromium/es-390-edit.png)
- [English route, 390px](../../../artifacts/mobile-ux/route-chromium/en-390-route.png)

This is an independent agent review of rendered UI and source, not a physical-device usability study. Actual iPhone/Android keyboard and screen-reader interaction remain device-QA items. No deployment or remote CI execution was performed.

# Workday Tracker UI/UX assessment

Reviewed 26 October 2026 · local version 1.6.0

## Scope and confidence

This is an expert review of the current React/CSS implementation and locally rendered screens in an isolated Edge browser at 390 × 844 CSS pixels. Synthetic records were used; user data was not accessed. Reviewed first opening, an active two-customer workday, expanded History, full workday editing, Options, and the note sheet. Captures and browser observations are in `artifacts/ux-review/`.

This is not a user study, a complete accessibility audit, or a physical iPhone/Android test. Software keyboards, outdoor readability, installed-PWA safe areas, long translations, and large text need subsequent device validation. Full-page screenshots place fixed navigation at the captured viewport position; this alone is not evidence of overlap during normal scrolling.

## Overall judgment

The app has a good foundation and needs refinement rather than a feature redesign. Three bottom tabs, an explicit next action, a route timeline, recent customers, and compact completed stops are appropriate for a focused phone utility. The restrained indigo palette is already cohesive.

The main weakness is hierarchy: the app title, notes, statistics, route details, and editable kilometres compete with the current task. History becomes tall and repetitive, while the editor feels visually separate. A calmer, more consistent interface would make the app feel more polished without changing how workdays are recorded.

## What to preserve

- Today / History / Options navigation, including text labels and a visible selected state.
- A prominent, thumb-reachable next-action button.
- Sequential customer visits and the existing arrival/departure/home workflow.
- Compact completed visits and the route metaphor.
- Optional kilometres, notes, recent customers, and English/Spanish support.
- Explicit timestamp review, original timestamps, deletion/reopen confirmations, and CSV compatibility.
- Existing focus indicators and reduced-motion support.

## Prioritized findings

Effort is relative design/implementation scope, not a delivery estimate. P1 should precede decorative work; P2 improves everyday clarity; P3 is polish.

| Priority | Finding and evidence | Recommended change | Benefit / effort |
| --- | --- | --- | --- |
| P1 | The note sheet declares `aria-modal`, but pressing Tab from its textarea reaches Today, History, and Options behind it. Customer and finish sheets use the same custom overlay pattern. | Give every sheet real modal focus containment, Escape handling, background inertness, and focus restoration. Verify each independently. Native dialog is a possible implementation. | Makes existing forms reliably usable with keyboard and assistive technology. Medium. |
| P1 | The CSV file chooser is a styled label, not a button; measured height is 21 px. It misses the global button sizing and looks like loose text. | Render a clear, padded control with a 44–48 px interaction height and visible keyboard focus when the file input is focused. Keep the existing file picker and import behavior. | Easier to discover and tap. Small. |
| P1 | Overview labels are 0.7 rem; several timestamp/helper styles are 0.78–0.8 rem. Undo is 34 px tall and sheet close controls are 42 px. | Use roughly 14 px for meaningful supporting text and 16 px for main content/inputs; adopt a 44 px minimum touch target as a product design target, preferably 48 px for frequent actions. Small typography should be reserved for incidental metadata. | Less effort to read and operate on phones. Small–medium. |
| P1 | Custom sheets use `100svh` and the action dock uses a fixed 74 px navigation offset. Source indicates keyboard, text-growth, and safe-area risks; these were not reproduced on a physical phone. | Validate with real keyboards and installed mode. Make content scrollable above the keyboard; keep focused fields and primary actions visible. Size dock clearance from actual navigation dimensions. | Prevents inaccessible fields/actions across phone configurations. Medium. |
| P2 | The active screen spends substantial vertical space on a roughly 39 px app title, status, metrics, a full-width note button, and the eight-hour warning before the current visit. | Reduce the active-state title to about 28–32 px; tighten header spacing; make notes visually secondary while keeping its target generous. Put the current visit in the strongest visual position. Retain the warning and all metrics. | Faster recognition of what to do now. Medium. |
| P2 | The current visit has the same white surface/border treatment as other cards. Its distance field precedes arrival/departure information. | Add a restrained accent border or tinted header to the active card; emphasize customer and current arrival/departure state; group kilometres as secondary detail. Keep recorded stops quieter. | Clear current/past/upcoming distinction without relying on color alone. Medium. |
| P2 | Expanded History repeats customer names, dates, seconds, and long journey labels. A two-customer record becomes a long scroll. | Use aligned arrival/departure rows under each customer heading and concise route-distance rows. Show the shared date once where unambiguous; preserve seconds, original values, correction markers, and cross-date context. Do not truncate audit information. | Faster scanning while retaining precision. Medium. |
| P2 | A record with missing kilometres still displays a bold numeric total, such as 36 km, beside an incomplete warning. | Label that figure as a recorded subtotal when incomplete, such as “36 km recorded”; keep the existing incomplete warning and calculation. | Prevents a partial total being read as the complete distance. Small. |
| P2 | Empty History notes display “Add any relevant details…” as ordinary text, though the paragraph is not an editing control. | Use a neutral “No day note” state or omit the empty note paragraph; leave note editing in the existing editor. | Removes a misleading apparent invitation to type. Small. |
| P2 | Today uses rounded bottom sheets; full editing uses a full-screen form; individual timestamp correction uses a centered dialog. Different sizes are reasonable, but fields, headings, and actions are inconsistent. | Share typography, field borders, spacing, button roles, and error styling across these surfaces. Keep full-screen editing for long forms and compact surfaces for short tasks. Preserve confirmation steps. | A more coherent app with lower relearning effort. Medium. |
| P2 | Options starts with release notes and describes only language, although it also contains data transfer and installation. English is shown twice in the language row. Export and import live in separate tabs. | Lead with preferences; place release notes lower; make the intro cover the whole screen. Group Language, Data transfer, Installation, and About using one section style. Keep History export; explain its relationship to import through copy. Remove redundant language text. | Better orientation and cleaner settings. Small–medium. |
| P3 | On first opening, release notes precede the start-workday card and occupy much of the first screen. | Keep the existing once-per-version notice but make its initial presentation more compact; retain access to full notes in Options. | Gives the core action greater prominence. Small. |
| P3 | Many cards use their own radius, tinted background, border, and shadow combinations; notes use a text glyph while navigation/editing use SVG icons. | Consolidate surface, spacing, radius, and icon rules; use one consistent SVG icon family. | Visual polish and easier maintenance. Small–medium. |

## Proposed visual direction

Aim for a quiet, professional field-work utility. Retain indigo as the main accent, dark slate text, a soft neutral canvas, and white content surfaces. Use amber for incomplete/attention states and red for destructive actions; pair colors with text or symbols. Reserve the strongest shadow and filled accent for the next action.

Suggested design tokens, subject to rendered validation:

- Spacing: 4, 8, 12, 16, 24, 32 px; approximately 16–20 px phone side gutters.
- Typography: 28–32 px active screen title, 20–24 px section titles, 16–18 px customer names, 16 px body/inputs, 14 px supporting labels. Use tabular numerals for times and distances.
- Shape: approximately 16 px cards, 12 px fields/buttons, 24 px sheet top corners. Distinguish shape by component role rather than making every surface identical.
- Elevation: thin borders for ordinary content; restrained shadow for overlays and primary actions.
- Font: use a deliberate system-font stack, or explicitly load the intended typeface. Inter is currently named in CSS but not bundled or loaded by the inspected source, so typography can vary across devices.

Proposed Today reading order: compact app/date header → existing day summary → clearly emphasized current visit and state → quieter completed/upcoming route → persistent next action → bottom navigation. Keep notes readily reachable as a secondary control. This is a presentation change; it does not alter recording order or timing semantics.

## Accessibility criteria

Use [WCAG 2.2](https://www.w3.org/TR/WCAG22/) as the reference: normal text contrast at least 4.5:1, large text 3:1, visible and unobscured focus, and appropriately sized/spaced targets. WCAG AA target sizing is 24 × 24 px with exceptions; the proposed 44–48 px phone target is a stronger product target, not the AA minimum. The 21 px import control needs spacing analysis before declaring a formal WCAG failure.

The existing pale version footer deserves a contrast check, but its incidental nature makes it less important than action labels, field text, and warnings. Do not infer contrast failures from screenshot appearance alone. Verify screen-reader names for inputs, particularly the note textarea, which currently lacks an explicit associated label in the inspected markup. Validate keyboard-accessible import focus and dialog focus return.

## New features

No new feature is necessary to achieve the proposed improvement. Search, charts, GPS, accounts, cloud sync, themes, reminders, and new navigation destinations are outside this recommendation. Even history search should wait for evidence that users struggle to retrieve records at their actual history volume.

Clarifying existing behavior through copy is justified: “On the road” currently represents elapsed time since leaving home, including customer visits. “Workday elapsed” would be more precise without changing the timer. A brief explanation near existing data-transfer controls that records are stored in this browser would also clarify the current storage model without adding a capability.

## Suggested implementation order and acceptance

1. Fix modal focus, import target/focus styling, note labeling, and phone keyboard clearance.
2. Establish shared visual tokens; refine Today hierarchy and current-visit emphasis.
3. Simplify History presentation and align editor and Options styling.
4. Refine release-note prominence, icons, and subtle motion.

Before release, validate at 320, 390, and 430 px widths; large text/200% zoom; English and Spanish; long customer names; many visits; missing distances; corrected timestamps; and cross-midnight workdays. Test real iPhone Safari and Android Chrome, both browser and installed mode. Exercise keyboard/screen-reader navigation and ensure that all current recording, correction, undo, reopen, import/export, offline, and persistence behaviors remain intact.

Use representative users to check whether they can identify the next action immediately, record a visit without hesitation, explain when kilometres are incomplete, and correct a historical timestamp without losing context. These are validation goals, not measured improvements from this review.

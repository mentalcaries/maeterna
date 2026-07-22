# Mobile Access Guide Dialog

## Context

The doctor patient-access tutorial is usable in desktop browser emulation, but
its full surface exceeds the available height in iOS Safari when browser chrome
is visible. Later steps contain more copy and the final `Finish` action can be
cut off below the viewport.

This change keeps navigation available at every step and reduces nonessential
mobile height without removing the full desktop tutorial.

## Settled Behavior

1. The dialog uses the small viewport height so expanded Safari browser chrome
   is included in its available space.
2. The header and Back/Next/Finish footer remain visible while the tutorial's
   middle content scrolls independently.
3. Changing steps resets the middle content to its top.
4. Mobile uses the shorter title `Patient access guide`.
5. The introductory description and per-step supporting details are visually
   hidden on mobile but remain available to assistive technology.
6. The final mobile reminder reads `Refresh your patient list after access is
granted.`
7. Existing title and explanatory copy remain visible from the `sm` breakpoint.
8. Phone previews use tighter mobile dimensions while preserving their desktop
   presentation.

## Implementation

- Update only
  `apps/web/src/components/doctor/PatientAccessGuideDialog.tsx`.
- Make the dialog popup a bounded flex column with an overflow-hidden shell.
- Give the central tutorial area `min-height: 0` and vertical scrolling.
- Keep the header and footer as non-shrinking siblings of the scroll area.
- Remove mobile preview minimum heights and reduce mobile-only spacing, frame
  size, placeholders, and simulated control padding.
- Preserve step animation, keyboard behavior, reduced-motion handling, and
  doctor-name personalization.

## Acceptance Criteria

1. Back, Next, and Finish remain visible on all three steps at short iPhone
   viewport heights.
2. The middle content can scroll without moving the dialog header or footer.
3. Each step opens at the top of its instructions.
4. Step 3's preview remains legible and its Finish action remains reachable.
5. Hidden mobile descriptions are still exposed to screen readers.
6. Desktop dialog copy, dimensions, and two-column layout remain unchanged.
7. The dialog remains usable at widths down to 320 pixels.
8. Repository checks and the web production build pass.

## Out Of Scope

- Changing tutorial steps or access-grant behavior
- Persisting the current step
- Altering shared dialog primitives
- Adding mobile browser detection or JavaScript viewport measurement

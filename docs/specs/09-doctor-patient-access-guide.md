# Doctor Patient Access Guide

## Context

The doctor dashboard lists patients who have already granted the signed-in
doctor access, but it does not explain how a new patient grants that access.
Doctors need a concise, visual guide they can use while walking a patient
through the existing patient-side access flow.

Add an interactive tutorial to the doctor dashboard. The tutorial should
faithfully represent the patient experience without making API requests,
changing access grants, or navigating away from the dashboard.

This task covers `apps/web` only. It does not require API, authentication,
database, or access-control changes.

## Settled Behavior

1. Add a `How to get access` action to the doctor dashboard near the existing
   `Refresh Patient List` action.
2. Selecting the action opens a dialog titled `Guide a patient to grant
access`.
3. The dialog presents three manually controlled steps:
   - Ask the patient to open `Access` from their patient navigation.
   - Ask the patient to search for the signed-in doctor's name and select the
     matching result.
   - Ask the patient to select the appropriate access scope and tap `Grant
access`.
4. The dialog is an instructional simulation only. Interacting with it must
   not search doctors, grant access, refresh patients, or call any API.
5. The walkthrough uses the signed-in doctor's first and last name from the
   existing session query. It must not fetch `GET /doctors/me` or introduce any
   other request for tutorial personalization.
6. The session does not contain the doctor's registration number or
   affiliations. The simulated search result should use the doctor's real name
   and explain that the patient should verify the registration details shown
   in their real result rather than displaying invented profile data.
7. The doctor controls progression with `Back` and `Next` actions. The final
   step uses `Finish` to close the dialog.
8. Closing and reopening the dialog starts the walkthrough at the first step.
9. The final step tells the doctor to refresh the patient list after the
   patient confirms the grant.

## Dashboard Placement

- Update `apps/web/src/routes/doctor/dashboard.tsx`.
- Place `How to get access` in the dashboard header action group with `Refresh
Patient List`.
- Use the existing `Button` component and an appropriate Remix access/help
  icon.
- Keep both actions full-width and stacked at narrow widths, then place them
  inline at the existing `sm` breakpoint.
- Preserve the current refresh behavior, pending state, patient query, patient
  cards, and empty state.

## Dialog Structure

Implement the walkthrough as a focused doctor component under
`apps/web/src/components/doctor/`, using the existing dialog primitives.

The dialog should include:

- The title `Guide a patient to grant access`.
- A short description clarifying that the patient remains in control of their
  health data.
- A visible `Step {current} of 3` label.
- A compact three-part progress indicator.
- A concise instruction for the doctor to say or describe to the patient.
- A visual patient-side preview for the current step.
- `Back`, `Next`, and `Finish` controls as appropriate.
- A close control that is keyboard accessible and has an accessible name.

Use a wider dialog where desktop space permits, while retaining the existing
dialog visual language: semantic colors, fine borders, restrained shadows,
Nunito Sans, and rounded surfaces. The content should remain usable within a
narrow mobile viewport.

## Patient-Side Preview

The preview should be built from semantic HTML, existing components, Tailwind
utilities, and Remix icons. Do not use screenshots or add image assets. It
should resemble the constrained mobile patient interface in
`apps/web/src/routes/patient/route.tsx` and the real access flow in
`apps/web/src/routes/patient/access.tsx`.

### Step 1: Open Access

- Show a simplified patient phone viewport.
- Include enough of the patient navigation to make the `Access` destination
  recognizable.
- Highlight the shield icon and `Access` label as the next control to tap.
- Use the instruction `Ask the patient to tap Access.`

### Step 2: Find the Doctor

- Show the `Manage Access` heading and `Grant access` section.
- Show the real `Search by doctor name…` field populated with the signed-in
  doctor's full name.
- Show one matching result using the actual doctor name from `useSession()`.
- Include the real `Grant` affordance from the patient search result.
- Do not invent a registration number, practice, hospital, or department.
- Add concise supporting copy telling the doctor that the patient should
  verify the registration details shown on their device before selecting the
  result.
- Use the instruction `Ask the patient to search your name and select your
profile.`

### Step 3: Grant Access

- Show a compact representation of the real `Grant access` patient dialog.
- Display the signed-in doctor's name.
- Show the individual option selected with the real `This doctor only` label.
- Explain that a department option may also appear when the doctor has an
  eligible institution affiliation.
- Highlight the `Grant access` action.
- Use the instruction `Ask the patient to choose the access scope and tap Grant
access.`
- Include a completion note telling the doctor to close the guide and use
  `Refresh Patient List` after the patient confirms.

The preview controls are illustrative. They should not be interactive except
where interaction directly supports navigating the tutorial itself.

## Motion

- Animate transitions between tutorial steps with the existing
  `tw-animate-css` utilities; add no animation dependency.
- Use a short fade and directional horizontal movement when the doctor moves
  forward or backward.
- Use restrained visual emphasis on the patient control relevant to each step.
- Do not autoplay. The doctor must be able to pause indefinitely while guiding
  the patient.
- Motion is decorative and must not communicate information unavailable in
  the text.
- Honor reduced-motion preferences by disabling step movement and nonessential
  emphasis with `motion-reduce` utilities.

## State And Data

- Keep dialog-open state on the doctor dashboard or in the guide component.
- Keep the current step as local component state.
- Read the existing cached session through `useSession()` and normalize it with
  `getAppUser()`.
- Construct the display name from `firstName` and `lastName`, omitting empty
  values cleanly.
- Do not add React Query keys, mutations, network requests, local storage, or
  persisted tutorial state.
- Do not modify the patient access workflow or extract patient behavior solely
  for this illustrative guide. Mirror its current copy and visual patterns in
  the preview.

## Responsive And Accessibility Requirements

- Support the doctor dashboard and dialog from a `320px` viewport through wide
  desktop layouts without horizontal scrolling.
- Keep dialog content within the viewport and allow vertical scrolling when
  browser height is constrained.
- Keep primary navigation actions at least `44px` high where practical.
- Preserve visible focus styles and logical keyboard order.
- Use buttons for all actionable controls.
- Announce the dialog title and description through the existing dialog
  primitives.
- Expose the current step in text, not by color alone.
- Mark decorative phone chrome and emphasis effects as nonessential to
  assistive technology.
- Ensure highlighted controls retain sufficient text and border contrast.
- Verify that longer doctor names wrap without overlapping the result action or
  overflowing the preview.

## Implementation Notes

- Prefer a single `PatientAccessGuideDialog` component unless a small local
  preview helper materially improves readability.
- Reuse `Dialog`, `Button`, `Input`, `Separator`, and existing theme tokens.
- Mirror the patient access search row and grant option styling without
  coupling the guide to live patient queries or mutations.
- Use keyed step content and transition utilities for animation. Track
  navigation direction only if needed to distinguish forward and backward
  movement.
- Do not add global CSS when Tailwind and `tw-animate-css` utilities are
  sufficient.
- Do not edit `apps/web/src/routeTree.gen.ts`.

## Acceptance Criteria

1. The doctor dashboard displays a clear `How to get access` action without
   disrupting the existing refresh action.
2. Activating the action opens a three-step guide that a doctor can use to walk
   a patient through granting access.
3. The steps accurately represent opening patient `Access`, searching the
   doctor's name, selecting the doctor, and confirming `Grant access`.
4. The guide personalizes the search and grant previews with the signed-in
   doctor's name from the existing session cache.
5. Opening and using the guide produces no additional network requests and no
   access-grant side effects.
6. The guide does not display invented registration or affiliation data and
   reminds the patient to verify the real search result.
7. Backward and forward navigation works, and reopening the dialog resets it to
   step one.
8. Step changes animate smoothly under normal motion preferences and remain
   clear with reduced motion enabled.
9. The final step explains that the doctor can refresh the patient list after
   access is granted.
10. The dialog is keyboard accessible, responsive at narrow widths, and does
    not overflow the viewport.
11. Existing doctor and patient behavior remains unchanged.
12. `vp check` and `pnpm --filter ./apps/web build` pass.

## Out Of Scope

- Doctor-initiated access requests or invitations
- Changes to grant, revoke, department-sharing, or access-log APIs
- Changes to the patient access workflow
- Persisting tutorial completion or showing it automatically
- Registration-number or affiliation data in the Better Auth session
- New API requests for doctor profile data
- New animation, tour, or illustration dependencies
- Screenshots, videos, or new image assets

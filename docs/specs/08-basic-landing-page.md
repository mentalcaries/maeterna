# Basic Public Landing Page

## Context

Maeterna currently uses the root route as an authentication dispatcher. A
signed-out visitor navigating to `/` is immediately redirected to `/login`,
while authenticated users are sent to the appropriate onboarding flow or role
dashboard.

Add a clean, patient-first public landing page at `/`. The page should explain
the product before asking a new visitor to sign in, while preserving the fast
path into the application for existing authenticated users.

This task covers `apps/web` only. It does not require API, authentication, or
data-model changes.

## Settled Behavior

1. Signed-out visitors to `/` see the landing page instead of being redirected
   to `/login`.
2. Authenticated visitors retain the current redirect behavior:
   - Users without a role go to `/signup/select-role`.
   - Patients without a completed profile go to `/signup/patient`.
   - Completed patients go to `/patient/dashboard`.
   - Doctors without a completed profile go to `/signup/doctor`.
   - Completed doctors go to `/doctor/dashboard`.
   - Admins go to `/admin/dashboard`.
3. Public calls to action use the existing unified `/login` flow. New users
   choose their role after authentication; the landing page must not introduce
   a parallel registration flow.
4. The landing page is informational and does not fetch application data.

## Visual Direction

- Match the existing application rather than introducing a separate marketing
  design system.
- Reuse Nunito Sans, existing color tokens, button styles, fine borders,
  spacing conventions, and restrained shadows.
- Draw the decorative palette from `apps/web/public/logo.png`: deep purple,
  soft pink, cream, and muted lavender.
- Use soothing pastel gradients as background atmosphere, with sufficient
  contrast for all text and controls.
- Keep the composition clean and elegant. Avoid dense marketing copy,
  oversized decorative effects, stock imagery, or unrelated illustrations.
- Use the existing logo and custom, product-specific SVG illustrations. Avoid
  generic icon-library symbols in landing-page feature content. Add no
  dependencies or image assets.

## Page Structure

### 1. Header

- Display the Maeterna logo and wordmark.
- Include a clear `Sign in` action linking to `/login`.
- Include a primary `Get started` action linking to `/login` where space
  permits.
- Keep navigation compact and usable at narrow mobile widths.

### 2. Hero

- Lead with a patient-first statement that communicates simple maternal-health
  tracking and patient ownership.
- Supporting copy should mention logging glucose and blood-pressure readings,
  sharing them only with trusted care providers, and staying connected to care.
- Include one primary `Get started` call to action via `/login`. Do not place a
  redundant returning-user action beside it.
- Feature the existing logo within a subtle cream, pink, and lavender gradient
  treatment. Decorative elements must not compete with the message.
- Do not overlay a floating data-control card on the logo or add a separate
  reassurance row beneath the hero action.

### 3. Product Benefits

Present three concise patient benefits using semantic headings and custom
illustrations derived from actual product concepts:

1. **Easy reading logs:** Patients can quickly record glucose and blood-pressure
   readings.
2. **Privacy and patient-controlled data:** Privacy is of utmost importance.
   Patients retain ownership of their readings, decide which doctors or
   hospitals can access them, can revoke access, and can delete their readings.
3. **Connected clinical care:** Authorized doctors can monitor readings in real
   time and review or adjust treatment plans accordingly.

Patient data control is the central trust message and should receive at least
equal visual prominence to the tracking and clinician features. Do not imply
that doctors have access without explicit patient authorization.

### 4. Doctor Benefits

Immediately after the patient benefits, include a distinct doctor-focused
section. It must make clear that clinicians see data only after the patient has
authorized access.

- Lead with the value of understanding patterns rather than isolated readings.
- Feature a custom, responsive glucose-over-time preview modeled on the actual
  product chart. Include a normal-range band, threshold guides, fasted and
  post-meal markers, and a visibly high reading.
- Feature a custom, responsive reading-history preview modeled on the actual
  product table. Organize readings by date and meal context so the value of
  quick scanning is immediately clear.
- Build the previews with lightweight inline SVG and semantic HTML rather than
  screenshots or live application data. They are illustrative and must not
  become stale image assets.
- On narrow screens, simplify the preview labels and columns rather than
  causing horizontal page scrolling.

### 5. Closing Call to Action

- End with a short, reassuring invitation to start tracking.
- Link the primary action to `/login`.
- Avoid unsupported security, medical-outcome, or regulatory claims.
- Use an abstract logo-inspired decoration rather than a generic medical icon.

## Responsive and Accessibility Requirements

- Treat the phone experience as the primary design target. Start at a `320px`
  viewport, then progressively enhance the layout for tablet and desktop.
- Check representative widths around `320px`, `375px`, `390px`, `768px`, and a
  wide desktop viewport.
- Stack hero content and feature panels naturally on mobile; use available
  width without horizontal scrolling.
- Keep the core patient message and primary call to action early in the mobile
  page. Decorative logo treatments must not crowd them out of the initial
  viewport.
- Use compact mobile navigation, responsive type sizes, and controls with touch
  targets of at least `44px` in each dimension.
- Make primary actions full-width where that improves narrow-screen usability;
  avoid tightly packed or undersized controls.
- Use semantic `header`, `main`, `section`, and heading structure.
- Provide meaningful image alt text and accessible labels where visible text is
  insufficient.
- Preserve visible keyboard focus through the existing component styles.
- Ensure gradient-backed text and controls meet readable contrast levels.
- Decorative gradients and shapes must be ignored by assistive technology.
- Allow enough bottom padding that the existing fixed legal footer does not
  obscure landing-page content or controls, including at narrow widths where
  the footer text and links may wrap.
- Verify that browser zoom and longer text do not cause clipping or overlap.
- Do not add essential animation. Any decorative motion added during
  implementation must honor reduced-motion preferences.

## Implementation Notes

- Implement the page in `apps/web/src/routes/index.tsx` unless a small local
  component extraction clearly improves readability.
- Keep the existing `beforeLoad` session check, but return normally for a
  signed-out visitor instead of redirecting to `/login`.
- Preserve all authenticated redirect branches exactly as described above.
- Reuse `Button`, `buttonVariants`, or established TanStack Router `Link`
  patterns rather than creating a new button system.
- Prefer existing Tailwind utilities and theme tokens. Only add global CSS when
  the visual treatment cannot be expressed cleanly in the route.
- Do not edit `apps/web/src/routeTree.gen.ts` manually.

## Acceptance Criteria

1. A signed-out visit to `/` renders the complete landing page and does not
   navigate to `/login` automatically.
2. Every landing-page sign-in or get-started action navigates to `/login`.
3. Signed-in patients, doctors, admins, incomplete profiles, and users without a
   role continue to reach the same destinations they reached before this
   change.
4. The page clearly communicates easy reading entry, patient-controlled access
   and deletion, and authorized real-time doctor monitoring.
5. The privacy card explicitly prioritizes patient privacy and ownership, not
   just access-management mechanics.
6. A doctor section follows the patient benefits and clearly demonstrates both
   glucose-over-time trends and structured reading-history visualization.
7. Landing-page feature visuals are custom and product-specific; generic stock
   feature icons are not used.
8. The page visually matches the application and logo using the existing
   typography, components, and pastel purple/pink/cream palette.
9. The layout is usable without overlap or horizontal scrolling on mobile and
   remains balanced on desktop.
10. The existing privacy policy, terms of service, and global footer remain
    available.
11. `vp check` and `pnpm --filter ./apps/web build` pass.

## Out of Scope

- API or database changes
- Authentication-provider or onboarding changes
- A separate signup route or lead-capture form
- Testimonials, pricing, blog, contact, or analytics integrations
- New product claims beyond capabilities already present in the app
- Changes to authenticated patient, doctor, or admin screens

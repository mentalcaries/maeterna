# Frontend: Doctor Self-Attestation, Affiliations, Registration Number Display

## Context

The backend for the doctor self-attestation refactor is complete and merged (see `backend-doctor-self-attestation.md` for the full model). MBTT verification is gone. Doctors now self-attest with a registration number (write-once, set at onboarding) and phone number (editable). Doctors have zero or more affiliations, each either a seeded public institution or a free-text private practice name. Patients verify doctors themselves via the registration number shown in the patient portal.

This prompt covers `apps/web` only.

**Before writing any code:** regenerate the API types via the existing `openapi-typescript` flow from the updated `maeterna-openapi.yaml`, and work strictly from the regenerated types. If any endpoint or field described below does not exist in the regenerated types, STOP and report the mismatch — do not guess shapes or hand-write types.

## 1. Doctor onboarding

Update the doctor onboarding flow:

- Add **Registration number** — required text input. Label it "Medical registration number". Helper text: something brief and neutral, e.g., "Shown to patients so they can verify your registration." No format hint (format is unenforced by design).
- Add **Phone number** — required tel input (`type="tel"`, `autocomplete="tel"`). Client-side validation mirroring the backend rule (optional `+`, 7–15 digits after stripping spaces/dashes/parentheses); surface backend validation errors normally.
- Remove any UI related to MBTT verification: name-match confirmation steps, "pending verification" states, verified badges, etc. Grep the frontend for `mbtt`, `verif`, `registry` and remove what's dead. List removals in the summary.
- Remove the old required/inline institution-selection step if present. Affiliation setup during onboarding is optional and uses the same affiliation management UI as the profile (see §2) — a doctor may finish onboarding with zero affiliations.

## 2. Doctor profile — edit

On the doctor's profile/settings page:

- **Registration number:** display read-only when set. If (and only if) the value is null/empty — the legacy-account case — show it as an editable field with the same validation as onboarding; once saved it becomes read-only. Follow the backend's set-once semantics; if the regenerated types/endpoint reject `registrationNumber` in the update payload entirely, display-only with no edit path, and note this in the summary.
- **Phone number:** editable, same validation as onboarding.
- **Affiliations:** full management UI backed by the affiliation CRUD endpoints:
  - List current affiliations. Render institution affiliations by institution name; practice affiliations by their free-text name. Visually distinguishable is fine but keep it subtle (e.g., a small "Public" / "Private practice" tag) — no colors implying status.
  - **Add:** a control offering two paths — select a public institution from the seeded list (fetch via the existing institutions endpoint), or enter a private practice name (free text, trimmed, max ~120 chars). One affiliation per add action.
  - **Remove:** per-row remove with a confirm step (simple confirm is fine; follow existing destructive-action patterns in the codebase, e.g., how grant revoke is confirmed).
  - Handle 409 duplicate responses from the backend with a clear inline message ("Already added").
  - Use TanStack Query mutations with invalidation of the affiliations query on add/remove. Follow existing query-key conventions.

## 3. Patient portal — doctor search results

Update the search result card in Manage Access → Grant access:

- Line 1: doctor name (as today)
- Line 2: registration number (e.g., rendered as `Reg. MB-2019-0421` — prefix "Reg." for clarity, muted styling)
- Line 3: affiliations rendered from the structured `affiliations` array — join each entry's `displayName` with a middle-dot separator: `Port of Spain General Hospital · Westshore Medical`. Omit the line entirely when the array is empty — no placeholder, no "Private practice" label.
- Keep the existing Grant action unchanged, including the individual-vs-department scope choice in the grant dialog: department options come from institution-type affiliation entries (`institutionId`/`departmentId`), labeled by their `displayName`. Practice-type entries (null ids) are never offered as department targets. A doctor with only practice affiliations (or none) gets an individual-only grant dialog.
- Long affiliation lists: allow wrapping; do not truncate with ellipsis on mobile (patients need to read these).

## 4. Patient portal — grant confirmation

If the grant flow has a confirmation step/dialog before the grant is created, show the same details there: name, registration number, affiliations (`displayName` values). The confirmation must also state the scope being granted — the individual doctor, or a specific department — reflecting the choice made in the grant dialog. If confirmation is currently a bare confirm with no doctor details, add them — this is the moment the patient should be checking the registration number. If there is no confirmation step at all, add a lightweight confirm dialog showing name + reg number + affiliations with Confirm/Cancel; follow the existing dialog patterns (shadcn/ui).

## 5. Patient portal — active grants

On the Active Grants list, for `INDIVIDUAL` grants:

- Add the registration number to the grant card, beneath or beside the doctor name, muted styling consistent with §3.
- Department/institution grants unchanged.

## 6. General

- Mobile-first: the patient portal changes (§3–5) must be checked at narrow widths first; the doctor profile/onboarding (§1–2) is doctor-dashboard context.
- No verification badges, checkmarks, or "verified" language anywhere — the product no longer makes verification claims. Registration number is presented as plain information.
- Reuse existing form components/patterns (shadcn/ui, existing form validation approach). No new dependencies.

## 7. Out of scope

- Backend changes of any kind
- Department grant flows
- Readings, charts, severity UI

## 8. Summary requirements

Report: files changed, MBTT-related UI removed, whether the grant confirmation step existed or was added, how the registration-number edit case (§2) resolved against the actual regenerated types, and any mismatches between this spec and the regenerated API types.

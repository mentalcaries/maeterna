# Share Access with a Doctor's Hospital (from an Existing Individual Grant)

## Context

Patients grant doctors access to their data from the Manage Access page. At initial grant time, if the doctor is affiliated with an institution, the grant dialog offers individual-or-department scope. Once an individual grant exists, however, there is no way to later grant access to that doctor's hospital department without re-searching the doctor.

This task adds that capability from the individual grant card, replacing the previous "Extend access" implementation, which shipped with UX problems: developer-facing language ("Extend access" means nothing to a layperson), and a broken all-granted state (the button remained visible and the dialog offered a live "Grant access" primary action when there was nothing left to grant).

Covers `apps/api` and `apps/web`. Backend first; update OpenAPIHono schemas for any changed/new endpoints and regenerate types before frontend work. Where the previous implementation exists, refactor it to this spec — do not build a parallel flow.

## Settled behavior (do not deviate)

1. Entry point is the individual grant card on the Active Grants list ONLY. No standalone institution search or browse. No changes to the search-triggered grant dialog.
2. This flow creates and revokes DEPARTMENT grants only. It NEVER modifies the individual grant — that coexists and is revoked only via its own existing Revoke action, unchanged.
3. The dialog lists the doctor's CURRENT institution-type affiliations, fetched live. Practice-type affiliations never appear.
4. Each seeded institution has exactly one department; the patient picks the institution, the system resolves the department. The word "department" is never surfaced to the patient — all copy speaks in terms of "all doctors at [hospital name]".
5. Patient-facing language never uses "extend", "grant" as a noun, "individual", "scope", or "department". Verbs and hospital names only. Reference copy is given in F2/F3; small wording adjustments to match the app's existing voice are fine, but the vocabulary constraint is not negotiable.

## Backend

### B1. Data for the sharing dialog

For each `INDIVIDUAL` entry in the active-grants list response, include the doctor's current institution-type affiliations:

```
hospitalSharingOptions: [
  {
    institutionId,
    departmentId,
    displayName,                       // institution name
    activeDepartmentGrantId: string | null,  // patient's active grant for this department, if any
    grantedAt: string | null                  // when that grant was created, if any
  }
]
```

- Read live from `doctor_affiliation` at request time; institution rows only.
- `activeDepartmentGrantId` is resolved against the requesting patient's active (non-revoked) department grants — this is what lets the frontend compute every card/dialog state without extra requests.
- Batch the lookups across all grants in the list response — no per-grant queries (same batching discipline as `buildGrantResponse`).
- Department grant entries in the list: unchanged.
- Suspended doctors: their existing individual grants already appear in this list (settled behavior). Include their `hospitalSharingOptions` normally — sharing with a hospital is about the hospital's doctors, not the suspended individual.

### B2. Department grant creation

Reuse the existing department grant creation endpoint used by the search-triggered grant dialog. Do NOT create a parallel creation path. If the existing endpoint requires input not present in B1's response, stop and report the mismatch.

Duplicate safety net: creating a department grant where the patient already holds an ACTIVE (non-revoked) grant for the same department must fail with 409. Verify whether this check already exists; if application-level, confirm it ignores revoked grants (a previously revoked grant for the same department must NOT block a new one). If absent, add a revoked-aware application-level check.

### B3. Revocation

Reuse the existing grant revocation endpoint for revokes initiated from the dialog. Identical in effect to revoking from the Active Grants list. No new logic.

## Frontend

### F1. Grant card button

On `INDIVIDUAL` grant cards only, show a secondary button (subordinate to Revoke, per existing card action patterns):

- **Label:** if the doctor has exactly one institution affiliation, name it: `Share with [hospital name]` (truncate gracefully on narrow screens — full name visible in the dialog). If multiple: `Share with hospital`.
- **Visibility — show the button only when at least one affiliation has `activeDepartmentGrantId === null`.** Hide it entirely (never disabled) when:
  - the doctor has zero institution affiliations, OR
  - every affiliated institution already has an active department grant (nothing left to share; managing those grants happens on their own department cards or via revoke in the dialog reached from a different doctor — the button must not open a dead-end dialog).
- All states derive from `hospitalSharingOptions` in the list response — no extra fetch on render.
- Department grant cards: unchanged.

### F2. Sharing dialog

Opens from the card button. shadcn/ui, following the existing grant dialog's option-card visual language.

- **Title:** `Share with a hospital`
- **Subtitle:** `Let all doctors at a hospital where Dr. [name] works see your health data. Dr. [name]'s own access is not affected.`
- One row per institution affiliation, two possible states:
  - **Not yet shared** (`activeDepartmentGrantId === null`): selectable option card — institution name, sub-label `All doctors at this hospital`. Selecting it enables the primary action.
  - **Already shared:** non-selectable — institution name, indicator `Shared since [date]` (from `grantedAt`), and a `Stop sharing` action using the existing destructive-confirm pattern, calling B3.
- **Primary action:** `Share` — DISABLED until a not-yet-shared row is selected. Never enabled with nothing selected. On click, a confirm step consistent with existing grant confirmations, naming the hospital: `Share your health data with all doctors at [hospital name]?` → creates the grant via B2.
- **Single-affiliation case** (the common one): the lone row is pre-selected if not yet shared, so the flow is open → confirm → done.
- **After a successful share:** the row flips to the already-shared state in place, and the dialog shows a brief success confirmation (existing toast/inline pattern). If no not-yet-shared rows remain, the dialog stays open in its informational state (rows + Close only) — the primary action disappears rather than sitting disabled with nothing selectable. Note: the card button underneath will be hidden on next render per F1; the open dialog completing its flow is the expected UX.
- **After a Stop sharing:** the row flips to not-yet-shared in place; dialog stays open.
- **Buttons when nothing is shareable and nothing is selected:** `Close` only alongside the disabled/hidden primary per above — at no point may the patient see an enabled `Share` button that has nothing to act on. This is the exact bug being fixed; treat it as an acceptance criterion.
- Query invalidation on share/stop-sharing: active-grants list query, so the underlying list and all derived card buttons update.
- Loading: skeleton rows while the dialog's data resolves (if rendered from list-response data, there is no fetch — render immediately). Errors: a 409 on share (concurrent duplicate) surfaces as `Already shared` and refreshes rows, not a raw error.

### F3. Grants list after sharing

A new department grant appears in Active Grants as department grants already do, alongside the untouched individual grant. Verify invalidation makes it appear without manual refresh. No structural list changes.

## Acceptance criteria (test these states explicitly)

1. Doctor with one institution, not shared → card shows `Share with [hospital]`; dialog pre-selects it; Share enabled; confirm creates department grant; row flips to `Shared since…`; grants list gains the department card.
2. Same doctor after sharing → card button is GONE. No path to the dead-end dialog.
3. Doctor with two institutions, one shared → button shows `Share with hospital`; dialog shows one selectable row + one `Shared since…` row with `Stop sharing`; Share disabled until the selectable row is selected.
4. Stop sharing from the dialog → row flips to selectable; department card leaves the grants list; individual grant untouched.
5. Doctor with only practice affiliations or none → no button.
6. Revoking the individual grant is unchanged in all cases.
7. No patient-facing string anywhere in this feature contains "extend", "department", "individual", or "scope".

## Out of scope

- Search-triggered grant dialog (unchanged)
- Individual grant revocation (unchanged)
- Institution/department browse or search
- Grant model changes beyond the B2 duplicate safety net
- Access log behavior

## Summary requirements

Report: what was refactored vs newly added relative to the previous "Extend access" implementation; whether the B2 duplicate check pre-existed and its revoked-grant handling; confirmation of each acceptance criterion; files changed; any spec-vs-code mismatches.

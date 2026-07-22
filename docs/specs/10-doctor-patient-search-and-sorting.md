# Doctor Patient Search And Sorting

## Context

The doctor dashboard loads every patient the signed-in doctor can access. As a
doctor's patient list grows, they need to find a patient by name and see their
most recently viewed records first.

The expected list size is 100 to 150 patients, so searching and sorting should
happen in the browser after the existing patient-list request completes.

## Settled Behavior

1. `My Patients` continues to fetch all assigned patients on initial load.
2. A search field above the list filters patients by first, last, or full name.
3. Name matching is trimmed, case-insensitive, and performed only on the
   frontend.
4. A sort control offers `Recently viewed` and `Alphabetical: A–Z`.
5. `Recently viewed` is selected by default.
6. Recently viewed patients sort by the current doctor's latest view, newest
   first. Patients without a prior view follow in alphabetical order.
7. Equal view timestamps use alphabetical order as a deterministic tie-breaker.
8. Alphabetical mode sorts all patients by full name.
9. Search and sort do not change the assigned-patient count.
10. A search with no matches displays `No patients found.` independently of the
    existing no-assigned-patients state.

## Last Viewed Data

The existing `access_log` table records `doctorId`, `patientId`, and
`accessedAt` whenever the doctor patient-detail endpoint successfully reads a
patient record. No new database column or migration is required.

`GET /doctors/me/patients` returns a nullable `lastViewedAt` for each result. It
is derived as the maximum `accessedAt` for the signed-in doctor and patient.
The API supplies the timestamp but does not apply presentation ordering.

After a patient-detail request succeeds, the web app invalidates the cached
doctor patient list. Returning to the dashboard therefore fetches the updated
timestamp and applies the default order.

## Implementation

- Update the runtime response schema and handler in
  `apps/api/src/routes/doctors.ts`.
- Keep `apps/api/maeterna-openapi.yaml` and the generated web API type aligned
  with the runtime contract.
- Add local search and sorting controls to
  `apps/web/src/routes/doctor/dashboard.tsx` using existing input and select
  components.
- Preserve patient cards, alert indicators, last-reading text, refresh
  behavior, and access-guide behavior.
- Keep controls usable at narrow mobile widths by stacking them before the
  existing desktop row layout.

## Acceptance Criteria

1. The initial request returns all assigned patients and includes each
   doctor-patient pair's nullable `lastViewedAt`.
2. The default dashboard order is most recently viewed first.
3. Never-viewed patients appear after viewed patients and are alphabetical.
4. Doctors can switch the complete list to alphabetical order.
5. Entering any case-insensitive portion of a patient's name filters the list
   without another network request.
6. Clearing the search restores the complete list in the selected order.
7. Returning after viewing a patient causes that patient to appear first in
   the default order.
8. Assigned and search-empty states remain distinct.
9. Search and sort controls are keyboard accessible and responsive.
10. Repository checks and the web production build pass.

## Out Of Scope

- Server-side search, pagination, or sorting parameters
- Persisting the selected search or sort mode
- Adding a materialized `lastViewedAt` database column
- Changing when patient-detail access is logged
- Changing patient card contents or alert-count semantics

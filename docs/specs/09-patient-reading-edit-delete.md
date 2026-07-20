# Patient Reading Edit and Delete

## Context

Patients can currently log glucose and blood-pressure readings, but cannot
correct or remove them afterward. Erroneous and duplicate readings therefore
remain in their history and continue to affect the information shown to the
patient and their doctors.

Add patient-facing controls for editing and deleting readings from Reading
history. The work covers `apps/api` and `apps/web`. Implement the API contract
first, regenerate the web API types from the running API's `/openapi.json`, and
then implement the frontend against those generated types.

No database schema change or migration is expected. The existing `reading`
table already stores every editable field.

## Settled Behavior (Do Not Deviate)

1. Patients may edit or delete only readings they logged themselves. A reading
   is eligible only when both `patientId` and `loggedById` match the
   authenticated patient's user ID. Doctor-entered readings remain visible but
   have no patient edit or delete controls.
2. Edit and delete controls appear on the patient Reading history page only.
   The patient dashboard's recent-readings list remains read-only.
3. Editing happens in a dialog populated with the existing reading. The
   explicit `Save changes` action is the edit confirmation; do not add a second
   confirmation step.
4. Deleting requires a separate destructive confirmation dialog before the
   request is sent.
5. Patients may edit the reading value, date, time, and glucose fasted state.
   Reading type, notes, ownership, attribution, and creation time are
   immutable in this flow.
6. Deletion is permanent. Do not add soft deletion, undo, or audit-history
   behavior as part of this task.

## Backend

### B1. Patient Reading Update Endpoint

Add:

```text
PATCH /patients/me/readings/{readingId}
```

Use the existing authenticated-patient middleware patterns, registering the
nested route explicitly so it is not missed by exact path middleware.

The request body must be a type-safe discriminated union consistent with the
existing reading create contract:

- Glucose: `type`, `value1`, `unit`, `context`, and `timestamp`.
- Blood pressure: `type`, `value1`, `value2`, `unit`, `context`, and
  `timestamp`.
- Do not accept `notes`, `patientId`, `loggedById`, or `createdAt`.
- `type` identifies the request variant but must match the stored reading's
  type. Reject attempts to change the type.
- Glucose context remains `fasted | post_meal`; blood-pressure context remains
  `morning | evening`.
- Apply appropriate numeric and datetime validation. Values must be finite and
  positive. Reject invalid type/context combinations.

Normalize glucose values to canonical `mg/dL` using the same conversion as the
create endpoint. Persist blood pressure in `mmHg`.

The update must be scoped in the database operation by all of:

```text
reading.id = readingId
reading.patientId = authenticated patient ID
reading.loggedById = authenticated patient ID
```

Do not rely only on a preceding ownership lookup. Return `404` for a missing
reading, another patient's reading, or a doctor-entered reading so the endpoint
does not disclose record existence. Return the serialized updated reading with
severity recomputed from the patient's current thresholds.

Use a non-empty string parameter rather than UUID-only validation. Local seed
readings use identifiers such as `seed-reading-b-1` and must remain usable for
development and acceptance testing.

### B2. Patient Reading Delete Endpoint

Add:

```text
DELETE /patients/me/readings/{readingId}
```

Apply the same middleware, parameter handling, and three-part ownership scope
as B1. The ownership predicates must be part of the delete operation itself.

Return `204 No Content` after a successful deletion. Return `404` for a
missing, other-patient, or doctor-entered reading.

### B3. Existing Behavior

- Existing patient and doctor reading creation remains unchanged.
- Existing doctor note editing remains unchanged.
- Do not allow this feature to change notes.
- Do not add edit or delete capabilities for doctors.
- Do not alter severity storage or threshold behavior; severity remains
  computed when a reading is serialized.

### B4. OpenAPI and Generated Types

1. Define both new endpoints in the runtime `@hono/zod-openapi` route schemas.
2. Update `apps/api/maeterna-openapi.yaml` as reference documentation for the
   new contract.
3. Start the API and regenerate `apps/web/src/lib/api.types.ts` from
   `http://localhost:8787/openapi.json`. Do not generate from the drifted YAML
   document and do not hand-maintain parallel request types.

## Frontend

### F1. History Row Actions

Extend `ReadingList` with optional edit and delete callbacks so action controls
can be enabled by a parent route without changing every use of the component.

On `/patient/history`:

- Show edit and delete controls only when `reading.loggedById` matches the
  authenticated patient's ID.
- Use accessible labels that identify each action and reading.
- Use touch targets appropriate for the mobile-first patient layout.
- Follow existing ghost/outline/destructive button styling and Remix Icon
  conventions.

Do not pass the callbacks from the dashboard, leaving its reading list
unchanged and read-only.

The history route should own the selected reading and dialog state. Do not
create mutation and dialog state independently inside every list row.

### F2. Edit Reading Dialog

Create a controlled edit dialog that matches the existing dialog and reading
form visual language. It must initialize from the selected reading and expose:

- Glucose value in the patient's preferred display unit.
- Both systolic and diastolic values for blood pressure.
- Glucose fasted or after-eating state.
- Existing local calendar date.
- Existing local time rounded to the nearest available hour.

Requirements:

- Keep the reading type fixed and clearly identify whether the patient is
  editing glucose or blood pressure.
- Preserve blood-pressure context unchanged; this scope does not add a
  morning/evening editor.
- Preserve notes unchanged and do not show a notes editor.
- Use the same calendar popover and hourly time dropdown as reading creation.
  Initialize non-hour timestamps to the nearest hour; minutes below 30 round
  down and minutes at or above 30 round up. Do not round into a future time.
- Convert local date and time back to an ISO timestamp correctly when saving.
- Apply the same unit warning and basic positive-number validation expected by
  reading creation where relevant.
- Buttons are `Cancel` and `Save changes`; `Save changes` is the confirmation
  action.
- Disable submission and dismissal while the mutation is pending.
- Show pending copy such as `Saving...` using the app's established typography
  and button behavior.
- Keep the dialog open and display an inline destructive error if the request
  fails.
- Use a viewport-bounded, scrollable dialog layout so the complete form and
  footer remain usable on mobile screens.

### F3. Delete Confirmation Dialog

Create a controlled confirmation dialog based on the existing revoke-access
dialog pattern:

- Title: `Delete reading?`
- Description clearly states that the reading will be permanently deleted and
  identifies its value and timestamp.
- Buttons: outline `Cancel` and destructive `Delete`.
- Use pending copy such as `Deleting...`.
- Prevent dismissal while deletion is pending.
- Keep the dialog open and show an inline error if deletion fails.
- Do not require typed confirmation for a single reading.

### F4. Mutations and Cache Refresh

Use the generated API client methods for PATCH and DELETE. `openapi-fetch`
returns HTTP failures in `result.error`, so mutation functions must explicitly
throw when an API error is present. An HTTP failure must never run success
behavior.

After a successful update or deletion:

1. Await invalidation of the `['readings']` query prefix.
2. Close the dialog only after invalidation completes.
3. Reset the selected reading and mutation error state.

Prefix invalidation must refresh both filtered history queries and the
dashboard's recent-reading query. Do not introduce a toast dependency; use the
app's existing inline error and pending-state patterns.

## Verification

### API Scenarios

1. A patient successfully edits their own glucose value, timestamp, and
   fasted/post-meal state; the response reflects recomputed severity.
2. A patient successfully edits both values and the timestamp of their own
   blood-pressure reading while context and notes remain unchanged.
3. Glucose submitted in `mmol/L` is stored and returned using the existing
   canonical-unit behavior.
4. A patient successfully deletes their own reading and it no longer appears
   in subsequent list responses.
5. Update and delete return `404` for another patient's reading.
6. Update and delete return `404` for a doctor-entered reading attached to the
   patient.
7. Update rejects a type change, invalid context, invalid timestamp, and
   non-positive values.
8. Seeded non-UUID IDs, including `seed-reading-b-1`, work with both routes.

### Frontend Scenarios

1. Eligible history rows show edit and delete actions; doctor-entered rows do
   not.
2. Dashboard rows remain read-only.
3. The edit dialog opens with the current values, local date, nearest available
   hour, and glucose fasted state.
4. Canceling edit makes no request or data change.
5. Saving updates history and dashboard data without a manual reload.
6. Canceling delete leaves the reading intact.
7. Confirming delete removes the reading from history and dashboard data
   without a manual reload.
8. API errors leave the relevant dialog open and show an inline error instead
   of false success.
9. Both dialogs remain usable at the patient layout's narrow mobile width.

### Commands

- Run `vp check` from the workspace root.
- Run the web build.
- Smoke-test PATCH and DELETE against the local seeded API; do not run the
  remote D1 migration command.

## Out of Scope

- Editing or deleting doctor-entered readings.
- Reading actions on the patient dashboard.
- Editing reading type, notes, ownership, attribution, or creation time.
- Doctor-facing reading edit or delete controls.
- Soft deletion, undo, revision history, or deletion audit records.
- Pagination or performance changes to the existing reading-list endpoint.
- A new toast/notification system.
- Database schema changes or migrations.

## Completion Report

At completion, report:

1. API endpoints and authorization predicates added.
2. OpenAPI documentation and generated type updates.
3. Frontend components and routes changed.
4. Verification performed, including patient-entered versus doctor-entered
   behavior and seeded non-UUID IDs.
5. Any spec-to-code mismatch or verification that could not be completed.

## Documentation

Update the implementation guidance and project documentation alongside the
feature:

- `apps/api/CLAUDE.md`: document patient-owned reading mutation rules and
  ensure severity is described as computed on read.
- `apps/api/README.md`: describe patient reading correction/deletion and fix
  stale reading/severity wording.
- `apps/api/src/routes/README.md`: list the new PATCH and DELETE routes and
  their ownership restrictions.
- `apps/web/README.md`: describe History-only edit/delete behavior and the
  generated API client methods.
- Root `README.md`: update the high-level patient reading capability summary
  where appropriate.

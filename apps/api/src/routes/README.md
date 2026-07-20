# Routes

Each file here registers a group of `@hono/zod-openapi` routes and their handlers together — there's no separate controller layer. A route is defined with `createRoute({...})` (path, method, request/response schemas) and wired to its handler via `app.openapi(route, async (c) => {...})`. Each file exports a single `register*Routes(app)` function called from `src/index.ts`.

## `institutions.ts`

- `GET /institutions` — list all institutions with their nested departments.

Read-only, no role restriction beyond having a session.

## `search.ts`

- `GET /search/doctors?q=&limit=` — search doctors by name or institution name, returning each match with their affiliations.

Used by patients to find a doctor to grant access to.

## `preferences.ts`

- `GET /preferences` / `PATCH /preferences` — get/set the current user's `glucoseUnit` (`mg/dL` or `mmol/L`).

Stored in `userPreferences`, upserted via `onConflictDoUpdate`.

## `invites.ts`

- `POST /invites` _(doctor only)_ — create a 72-hour invite token scoped to one of the doctor's departments.
- `GET /invites/{token}` _(no auth)_ — resolve a token to doctor/institution/department names. The only route in the API that doesn't require a session.

Used during patient onboarding to pre-wire an access grant.

## `patients.ts`

- `GET /patients/me` / `PATCH /patients/me` / `DELETE /patients/me` _(patient only)_ — view, edit, or delete your own patient profile.

`PATCH` keeps the derived `user.name` in sync when first/last name change. `DELETE` hard-deletes the user row.

## `access.ts`

- `GET /patients/me/grants` / `POST /patients/me/grants` / `DELETE /patients/me/grants/{grantId}` _(patient only)_ — list, create, or revoke access grants to a doctor (`individual`) or a whole department (`department`). Creating a duplicate active grant returns `409`.
- `GET /patients/me/access-log` _(patient only)_ — see which doctors have viewed your record and when.

Grant/log responses are enriched with doctor/institution/department display names via joins.

## `readings.ts`

- `GET /patients/me/readings?type=&from=&limit=&offset=` / `POST /patients/me/readings` _(patient only)_ — list or log your own glucose / blood-pressure readings, paginated, optionally filtered to `timestamp >= from`.
- `POST /patients/{patientId}/readings` _(doctor)_ — log a reading on behalf of a patient; requires an active access grant (checked via `doctorHasAccess` from `../lib/access`). Request body is a discriminated union on `type` that also constrains `context` (`glucose` → `fasted`/`post_meal`, `blood_pressure` → `morning`/`evening`) and requires `value2` for `blood_pressure`.
- `PATCH /readings/{readingId}/notes` _(doctor)_ — add/edit a note on a reading; also requires an active access grant.

Glucose values are normalized to mg/dL on write. `severity` (`normal`/`high`) is **not stored** — it's computed on every read via `computeSeverity` (`../lib/thresholds`) against the patient's current thresholds, so changing a patient's thresholds changes severity on subsequent reads immediately, with no writes to `reading`.

## `doctors.ts`

- `GET /doctors/me` / `PATCH /doctors/me` _(doctor only)_ — view or edit your own doctor profile.
- `GET /doctors/me/patients` — list patients who've granted you access, with unread alert counts (computed on the fly from each patient's readings + thresholds) and last-reading timestamps.
- `GET /doctors/me/patients/{patientId}?from=` — full patient detail (profile, readings, thresholds), optionally filtered to `timestamp >= from`. Also writes an `access_log` row for the patient's audit trail.
- `GET /doctors/me/patients/{patientId}/thresholds` / `PUT .../thresholds` — read or set the patient's alert thresholds (one row per patient; falls back to `DEFAULT_THRESHOLDS` if none set). Any doctor with access can update it — `doctorId` on the row is attribution of who last updated it, not part of the key.

All patient-scoped routes are gated by `doctorHasAccess` (shared with `readings.ts` via `../lib/access`).

## `admin.ts`

- `GET /admin/users` — list/filter all users by role and status.
- `PATCH /admin/users/{userId}/status` — suspend or reactivate an account. An admin cannot suspend their own account (`400`).
- `POST /admin/invites` — send an email invite to a new patient or doctor. _(Email sending itself is a `TODO` stub.)_
- `GET /admin/audit-log` — view platform audit log entries, newest first. _(`targetName` resolution is a `TODO` stub — currently always `null`.)_

Every route requires the `admin` role. All mutating actions write an `auditLog` entry via the local `writeAuditLog` helper.

## `profile.ts`

Onboarding flow, run after a user's first sign-in:

- `PATCH /profile/role` — set your role once (`patient` or `doctor`); `409` if already set.
- `POST /profile/complete` — finalize your profile.
  - Patients: just need `dateOfBirth`.
  - Doctors: self-attest a `registrationNumber` and `phoneNumber` (shape-validated only, no external registry check) and are `active` immediately. `registrationNumber` is written once here — `PATCH /doctors/me` cannot change it afterwards.
- `GET`/`POST`/`DELETE /profile/doctor/affiliations` _(doctor only)_ — list, add, or remove institution/private-practice affiliations.

## Shared helpers

- `../lib/access.ts` — `doctorHasAccess(db, doctorId, patientId)`: checks whether a doctor has an active individual or department-level access grant for a patient. Used by both `readings.ts` and `doctors.ts`.
- `../lib/thresholds.ts` — `computeSeverity(type, context, value1, value2, thresholds)` (pure, returns `"normal" | "high"`), `DEFAULT_THRESHOLDS`, and `resolveThresholds(db, patientId)` (fetches the patient's custom threshold row or falls back to defaults).
- `../lib/readings.ts` — `serializeReading(row, thresholds)`: shared response serializer that computes `severity` on read.
- `../lib/errors.ts` — `raise(status, message)` helper for throwing typed HTTP errors; `isUniqueConstraintError(err)` detects a racing unique-index violation.
- `../lib/affiliations.ts` — `mapAffiliation(row)`: shared serializer for a `doctor_affiliation` row (used by `admin.ts`, `doctors.ts`, `profile.ts`).

All authenticated routes (every route except `GET /invites/{token}`) pass through `sessionMiddleware`, which now also rejects `status = 'suspended'` users with a `403 ACCOUNT_SUSPENDED` before any route logic runs.

# Backend: Doctor Self-Attestation, Affiliations Refactor, MBTT Removal

## Context

Maeterna is replacing MBTT registry-based doctor verification with a self-attestation model. Doctors will provide their medical registration number and phone number at signup. Patients verify doctors themselves via the registration number displayed in the patient portal (search results, grant confirmation, active grants). The MBTT scraper, its cron trigger, and all name-matching verification logic are to be removed entirely.

Additionally, doctor-institution affiliation changes from optional-single to many-to-many: a doctor may have zero or more affiliations, each being EITHER a seeded public institution (FK) OR a free-text private practice name. A doctor with no affiliations is valid (e.g., a solo private practitioner who operates under their own name).

This prompt covers the backend (`apps/api`) only. After completion, `openapi-typescript` types will be regenerated and a separate frontend prompt will follow. Ensure the OpenAPI spec (`maeterna-openapi.yaml` / OpenAPIHono route definitions) fully reflects every schema change described here.

## 1. Schema changes (Drizzle + D1 migration)

### 1.1 Doctor profile fields

Add to the doctor profile table (wherever doctor-specific profile data lives):

- `registrationNumber` — TEXT, NOT NULL. Free text; do NOT enforce any jurisdiction-specific format. Trim whitespace on write. No uniqueness constraint (registration numbers from different jurisdictions could theoretically collide, and we are not policing authenticity at the system level).
- `phoneNumber` — TEXT, NOT NULL. Store as entered after trimming. Validate at the API layer (see §3.2) but store as plain text.

Migration note: if existing doctor rows exist in production, NOT NULL cannot be applied directly. Handle this as follows: add the columns as nullable in the migration, then enforce NOT NULL at the application layer (Zod) for all writes, and add a follow-up note in the migration file comment that a backfill + constraint tightening can happen once existing doctors have supplied values. If the doctor table is empty or only contains seed data locally, you may recreate/apply NOT NULL directly — check the current migration state and choose accordingly, stating your choice in the PR/summary.

### 1.2 Affiliations table

Create a new table `doctor_affiliations`:

- `id` — primary key (follow the existing PK convention in the codebase — do not invent a new one)
- `doctorId` — FK to the doctor/user table, NOT NULL, ON DELETE CASCADE
- `institutionId` — FK to the institutions table, nullable
- `practiceName` — TEXT, nullable (free-text private practice name)
- `createdAt` — follow existing timestamp conventions in the codebase

Constraint: exactly ONE of `institutionId` / `practiceName` must be non-null per row. Enforce with a SQLite CHECK constraint:

```sql
CHECK (
  (institution_id IS NOT NULL AND practice_name IS NULL) OR
  (institution_id IS NULL AND practice_name IS NOT NULL)
)
```

Also enforce the same rule in Zod (see §3.3) so the API returns a clean 400 rather than a raw DB error.

Add a uniqueness guard against duplicate rows for the same doctor: unique index on (`doctorId`, `institutionId`) where `institutionId` is not null, and prevent duplicate (`doctorId`, `practiceName`) pairs at the application layer (case-insensitive comparison after trimming). SQLite partial unique indexes are supported by D1 — use one for the institution case; the free-text case is application-enforced only.

### 1.3 Remove existing single-affiliation field

The current model has doctors optionally linked to a single institution/department (private practice doctors skip affiliation). Locate this existing linkage (likely a nullable `institutionId` or `departmentId` on the doctor profile) and:

1. Write a data migration that copies any existing non-null values into `doctor_affiliations` rows (as `institutionId` affiliations)
2. Drop the old column

Do NOT touch the department-level access grant model — patients granting access to a hospital department is unchanged and unrelated to this refactor. Verify that department grants do not depend on the doctor's old single-affiliation column; if they do, stop and report before proceeding rather than guessing.

### 1.4 Remove verification fields

Remove any doctor verification state from the schema: verified flags, verification status enums, MBTT match metadata, `memberId`/registry-sourced fields, etc. Search the schema thoroughly — verification state may exist on the doctor profile, a separate verification table, or both. List everything you remove in your summary.

## 2. MBTT scraper removal

Remove entirely:

- The MBTT scraper worker code (Cloudflare cron worker that scrapes the MBTT registry monthly)
- Its cron trigger configuration in `wrangler.jsonc` (or a separate wrangler config if the scraper is its own worker)
- Any D1 tables/columns storing scraped MBTT registry data — include a migration dropping them
- The name-matching logic (including the word-level first-name matching code)
- Any endpoints, queues, or scheduled handlers related to verification
- Any admin endpoints for reviewing/approving doctor verification, if they exist

Grep broadly: `mbtt`, `registry`, `verif`, `scrape`, `match`. List every file deleted or modified for this in your summary. If anything ambiguous turns up (code that looks verification-related but is used elsewhere), report it rather than deleting blindly.

## 3. API changes (OpenAPIHono routes + Zod)

### 3.1 Doctor signup / onboarding

Wherever the doctor role is established (post-auth onboarding flow — recall that Better Auth creates the user and role assignment happens in onboarding), the doctor onboarding request must now require:

- `registrationNumber`: Zod `z.string().trim().min(1)`, sensible max length (e.g., 50)
- `phoneNumber`: see §3.2

Remove any onboarding inputs/steps related to MBTT verification (e.g., name confirmation for matching) and remove the institution-selection step from onboarding if it exists as a required/inline step — affiliations are now managed via the endpoints in §3.3 (the frontend may still surface affiliation setup during onboarding, but the backend treats it as the separate affiliations resource, not part of the doctor-profile payload).

Doctors are searchable by patients immediately upon completing onboarding. There is no pending/verification holding state.

### 3.2 Phone number validation

Zod: trim, strip internal spaces/dashes/parentheses for validation purposes, then require it to match a permissive international pattern: optional leading `+`, then 7–15 digits (`/^\+?[0-9]{7,15}$/` after stripping). Store the original trimmed input, not the stripped form. Do not attempt country-specific validation and do not add a phone-validation library.

### 3.3 Affiliation management endpoints

New endpoints under the doctor's own profile scope (authenticated doctor managing their own affiliations — follow the existing route/auth middleware patterns in the codebase, and be careful of the known Hono path-matching pitfall where literal segments like `/me` can be swallowed by `:param` routes; register literal routes before parameterized ones):

- `GET` list own affiliations — returns array of affiliation objects
- `POST` create affiliation — body is a discriminated union in effect: `{ institutionId: string }` XOR `{ practiceName: string }`. Zod: use `z.union` of two object schemas, or a single object with `.refine` enforcing exactly-one. `practiceName`: trim, min 1, max ~120 chars. Reject duplicates per §1.2 with a 409.
- `DELETE` remove own affiliation by id — 404 if not found or not owned by the requesting doctor

Response shape for an affiliation (design the Zod response schema accordingly):

```
{
  id,
  type: "institution" | "practice",
  institution: { id, name } | null,   // populated when type === "institution"
  practiceName: string | null          // populated when type === "practice"
}
```

Validate `institutionId` exists (404 or 400 with clear message if not).

### 3.4 Doctor search (patient-facing)

The patient-facing doctor search endpoint currently returns doctor names. Update its response schema per result to:

```
{
  id,
  name,
  registrationNumber,
  affiliations: [
    {
      type: "institution" | "practice",
      institutionId: string | null,   // set for institution rows
      departmentId: string | null,    // set for institution rows (the institution's derived O&G department) — required by the grant dialog's department-scope option
      displayName: string             // institution name, or practiceName
    }
  ]   // ordered: institution rows first, then practice rows; empty array if none
}
```

- `affiliations` is structured, not flat strings: the search card renders the `displayName` values joined (e.g., "Port of Spain General Hospital · Westshore Medical"), while the grant dialog uses `institutionId`/`departmentId` from institution-type entries to offer department-scoped grants. Practice-type entries have null ids and offer no department option.
- Do NOT include phoneNumber in patient-facing search results.
- Search matching remains name-based only (doctor name). Do not add institution or reg-number matching to the search query.
- Watch query efficiency: fetch affiliations for the result set with a single join/second query keyed by doctor ids — no N+1.

### 3.5 Grants (patient-facing)

- Active grants list endpoint: for `INDIVIDUAL` (doctor) grants, add `registrationNumber` to the doctor object in the response. Department grants unchanged.
- If there is a "grant preview/confirmation" endpoint that returns doctor details before the patient confirms a grant, add `registrationNumber` and the `affiliations` display array there too. If confirmation is purely a frontend concern using search-result data (no separate endpoint), state that in your summary and change nothing.

### 3.6 Doctor profile read/update

- Doctor's own profile GET should include `registrationNumber`, `phoneNumber`, and affiliations (either inline or via the §3.3 list endpoint — follow whichever pattern the existing profile endpoint uses for related data; if unclear, keep affiliations on the separate endpoint only).
- Doctor's own profile UPDATE should allow editing `phoneNumber` (same validation as onboarding). `registrationNumber` is write-once: set at onboarding, immutable thereafter — omit it from the update request schema entirely (do not accept-and-ignore). Affiliations are edited only via §3.3 endpoints, not through profile update.
- Any doctor-facing or admin-facing responses that previously exposed verification status must have those fields removed from both the code and the OpenAPI schemas.

## 4. Seed script

Update the local DB seed script for the new model:

- Seeded doctor accounts get plausible `registrationNumber` values (e.g., `MB-2019-0421` style placeholders — any format, since format is unenforced) and `phoneNumber` values in T&T format (e.g., `+18685550142`)
- Give seeded doctors varied affiliation shapes to exercise the UI: one with a single public institution, one with an institution + a named private practice, one with only a named practice, one with no affiliations
- Remove any seeding related to MBTT/verification state
- Keep the script idempotent per the existing convention (`wrangler d1 execute --local`, no `--remote` variant)

## 5. OpenAPI

Every request/response schema change above must be reflected in the OpenAPIHono route definitions so the regenerated `maeterna-openapi.yaml` is accurate. This is critical — the frontend prompt depends on regenerated types. Double-check: onboarding, profile GET/UPDATE, affiliation CRUD, doctor search, active grants, grant confirmation (if applicable).

## 6. Out of scope — do not touch

- Frontend (`apps/web`) — separate prompt
- Department/institution grant mechanics
- Glucose/BP severity, readings, charts
- Auth flows (magic link, passkey, Google OAuth)
- Institution seed data for public hospitals (the seeded institutions themselves are unchanged)

## 7. Deliverables / summary requirements

At the end, provide:

1. List of all files deleted (scraper removal)
2. List of migrations created and what each does, including how the NOT NULL question in §1.1 was resolved
3. List of all removed verification fields/tables
4. Any ambiguities encountered and how they were resolved (or flagged)
5. Confirmation that OpenAPI schemas were updated for every changed endpoint

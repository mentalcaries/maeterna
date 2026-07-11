# Local dev DB seed script

## Objective

A script that seeds the **local** D1 database with realistic test data (patients, doctors, readings, thresholds) for manual testing and development. Must run identically on any developer's machine with no machine-specific paths or state, and must never be able to target the production database.

## Why `wrangler d1 execute --local`

Local D1 is a SQLite file managed by Miniflare under `.wrangler/state`, and its exact path can vary by Wrangler version/OS. Rather than reading that file directly, use Wrangler's own `--local` flag, which resolves the correct local file automatically on any machine:

```bash
wrangler d1 execute <DATABASE_NAME> --local --file=./seed/seed.sql
```

`<DATABASE_NAME>` is the `database_name` from the `d1_databases` binding in `wrangler.jsonc` — do not hardcode a path or UUID.

## Deliverables

### 1. `seed/seed.sql`

A single idempotent SQL script (safe to re-run — `DELETE`/`INSERT` or `INSERT OR REPLACE`, not raw `INSERT` that fails on second run) that creates:

**Doctors (2):**

- One verified (`doctorProfile.verified = true`), one unverified, to exercise the verification-gated UI paths.
- Each with a `doctorAffiliation` to a seeded institution/department.

**Institution + department (1 each):** minimum needed to satisfy foreign keys and populate the doctor affiliation UI.

**Patients (4–5):** covering distinct testing scenarios:

| Patient              | Purpose                                                                                                                                                                    |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Patient A            | Normal history — all readings within normal range, both types                                                                                                              |
| Patient B            | Mixed history — some high glucose (fasted and post-meal) and high BP readings, to test alert counts and cell highlighting                                                  |
| Patient C            | Custom thresholds — has a `threshold` row with non-default values, to verify severity computed on read respects per-patient overrides                                      |
| Patient D            | No threshold row — verifies the default-threshold fallback path                                                                                                            |
| Patient E (optional) | Sparse/edge-case data — a single reading, or readings spanning a meal-slot boundary (e.g., one at 10:59, one at 11:00 local) to exercise the pivot table's slot assignment |

**Readings:** for glucose patients, include entries in all four slot categories (`fasted`, and `post_meal` at times that land in breakfast/lunch/dinner windows) across at least 2–3 different dates, including:

- At least one date with two readings in the same slot (collision case, e.g., two `post_meal` readings before 11am on the same day) for at least one patient.
- A mix of `normal` and `high` values under the current binary thresholds (fasted >= 95, post-meal > 140, BP systolic >= 140 or diastolic >= 90) so the seeded data visibly exercises both states without needing severity to be stored — confirm values against current thresholds, not the old warning/critical scale.

For BP: both `morning` and `evening` contexts represented, including a collision (two `morning` readings same day) for at least one patient.

**Access grants:** grant the verified doctor access to all seeded patients (`accessGrant`, `individual` grant type, not revoked) so the doctor dashboard can immediately show them without a separate manual grant step.

**Notes:** populate `notes` on a subset of readings with realistic short text (matching the style already in the app, e.g., meal descriptions) and leave others `NULL` to test the add-note vs edit-note UI states.

**IDs:** use fixed, human-readable IDs (e.g., `seed-patient-a`, `seed-doctor-verified`, `seed-reading-a-1`) rather than generated UUIDs, so the script is deterministic and re-running it produces identical rows, and so individual rows are easy to reference when debugging.

### 2. `seed/seed.ts` (optional companion, if the team prefers TS-driven seeding over raw SQL)

If richer logic is easier in TypeScript (e.g., timestamp math for "3 days ago", unit conversions), an alternative is a Drizzle script that:

- Connects to the local D1 binding via `wrangler dev`'s local persistence (using `better-sqlite3` pointed at the resolved local D1 file is fragile across machines — prefer generating SQL and still applying it via `wrangler d1 execute --local --file=`, or run the script through `wrangler dev` with a scripted fetch to a dev-only seed endpoint).
- If this path is used, document clearly in the script's header comment that it still shells out to `wrangler d1 execute --local`, never opens the SQLite file directly, and never accepts a `--remote` or production flag.

Default to plain SQL (`seed.sql`) unless the timestamp/data generation genuinely needs code — it's simpler, has zero dependencies, and is trivially portable.

### 3. `package.json` script

```json
"db:seed:local": "wrangler d1 execute <DATABASE_NAME> --local --file=./seed/seed.sql"
```

Replace `<DATABASE_NAME>` with the actual binding name from `wrangler.jsonc`.

### 4. Safety guardrails

- The script must **never** include or default to `--remote`. Do not add a `db:seed:prod` counterpart in this task.
- Add a header comment at the top of `seed.sql` stating it is for local development only and must not be run with `--remote`.
- `seed/` should be committed to the repo (not gitignored) since it contains no secrets — only fabricated test data.
- Timestamps should be relative to "now" at seed time where practical (e.g., "yesterday", "3 days ago") so the seeded data always falls inside the "past week"/"past month" filters regardless of when it's run, keeping the pivot table and time-range filter exercised correctly. Fixed literal dates are acceptable only for a couple of "older" rows meant to test the "All time" filter boundary.

### 5. README note

Add a short section to the repo's `CLAUDE.md` or `README.md`: how to run the seed (`pnpm db:seed:local`), what it creates (brief patient list from the table above), and that it's safe to re-run.

## 6. Local login for seeded users (magic link, console-logged)

Every seeded user — both doctors and patients — must be actually loggable-into locally by any developer, using the existing magic-link flow. No new auth method, no password. This lets any dev test both sides: log in as the doctor to view the dashboard, log in as a specific seeded patient to test the patient portal against that same data.

### Approach

Add a dev-only override to the magic-link email-sending function so it can log the link to the terminal instead of (or in addition to) sending real email.

**Two-layer gate — do not collapse into one check:**

1. **Layer 1 — local-only signal.** Before anything else, check for a binding/var that only ever exists when running via `wrangler dev` locally (set in `.dev.vars`, never present in `wrangler secret bulk` for production, never set in the Cloudflare dashboard). If this signal is absent, the code must always take the real-send path — no further checks, no way to override in a deployed environment even if some other var is accidentally set there.
2. **Layer 2 — `LOCAL_EMAIL_MODE`.** Only read when layer 1 confirms local dev:
   - `console` (default locally) — log the magic-link URL to the terminal; do not call the email provider.
   - `send` — call the real email provider, same as prod, for testing the actual email template/deliverability locally.

```ts
async function sendMagicLinkEmail(email: string, url: string) {
  const isLocalDev = Boolean(env.LOCAL_DEV_ONLY_SIGNAL) // present only in .dev.vars
  if (isLocalDev && process.env.LOCAL_EMAIL_MODE !== "send") {
    console.log(`[magic link] ${email} -> ${url}`)
    return
  }
  await realEmailProvider.send(email, url) // unconditional in prod
}
```

- Add `LOCAL_DEV_ONLY_SIGNAL=true` (or similar) and `LOCAL_EMAIL_MODE=console` to `.dev.vars.example` and each dev's own `.dev.vars` (gitignored). Document both in the README section (below).
- Prod's `wrangler.jsonc` `vars`/secrets must never define `LOCAL_DEV_ONLY_SIGNAL` — confirm this explicitly during review, since its absence is what makes the override impossible in production.

### Login flow for either developer

1. Run the seed script.
2. Go to the app's login page, request a magic link for whichever seeded account you want to test as (doctor or a specific patient — see table below).
3. With `LOCAL_EMAIL_MODE=console` (default), copy the printed URL from the `wrangler dev` terminal output and open it in the browser.
4. To test real email delivery locally instead, set `LOCAL_EMAIL_MODE=send` and use a real inbox you control as that seeded user's email (per-developer override in their own `.dev.vars`, not the checked-in seed data).

### Test account reference table

Every seeded user needs a fixed, human-readable email (matching the fixed-ID convention in section 1) so this table stays accurate without needing to query the DB. Add this table to the README/CLAUDE.md section (below), populated with the actual seeded values:

| Role                | Email                         | Scenario                                      |
| ------------------- | ----------------------------- | --------------------------------------------- |
| Doctor (verified)   | `doctor.verified@seed.test`   | Has access to all seeded patients             |
| Doctor (unverified) | `doctor.unverified@seed.test` | Exercises verification-gated UI               |
| Patient A           | `patient.a@seed.test`         | Normal history, both types                    |
| Patient B           | `patient.b@seed.test`         | Mixed — high glucose and high BP present      |
| Patient C           | `patient.c@seed.test`         | Custom thresholds set                         |
| Patient D           | `patient.d@seed.test`         | No threshold row — default fallback           |
| Patient E           | `patient.e@seed.test`         | Sparse/edge-case data, slot-boundary readings |

This table must be kept in sync with whatever IDs/emails the script actually seeds — generate it from the same constants used in `seed.sql`, not typed independently, to avoid drift.

## Acceptance criteria

- [ ] `pnpm db:seed:local` runs successfully on a clean local D1 instance
- [ ] Running it a second time does not error and does not duplicate rows
- [ ] No file, script, or package.json entry references `--remote` or a production database identifier
- [ ] Seeded data includes both `normal` and `high` outcomes under current thresholds for glucose (fasted + post-meal) and blood pressure
- [ ] At least one same-slot collision exists for glucose and one for blood pressure
- [ ] At least one patient has a custom `threshold` row; at least one has none
- [ ] The verified doctor has an active access grant to every seeded patient
- [ ] Works without modification on a teammate's machine after a fresh clone (no machine-specific paths)
- [ ] Requesting a magic link locally with `LOCAL_EMAIL_MODE=console` (or unset) prints the link to the terminal and does not call the real email provider, for both doctor and patient accounts
- [ ] Setting `LOCAL_EMAIL_MODE=send` locally still sends a real email via the existing provider
- [ ] Each seeded patient can be logged into independently (not just the doctor) and lands in the patient portal showing that patient's own seeded readings
- [ ] The README/CLAUDE.md test account table lists every seeded user's email and scenario, matching the actual values in `seed.sql`
- [ ] The local-only signal (e.g. `LOCAL_DEV_ONLY_SIGNAL`) is present only in `.dev.vars` / `.dev.vars.example`, is gitignored where it contains any per-developer value, and is confirmed absent from prod `wrangler.jsonc` vars and prod secrets
- [ ] With the local-only signal absent (simulated prod), the email function always sends real email regardless of `LOCAL_EMAIL_MODE`

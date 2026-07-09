# Manual testing guide

How to get a fully-populated local environment and log in as any seeded account — no real email required.

## 1. Seed the database

```bash
pnpm db:seed:local
```

Runs `wrangler d1 execute maeterna --local --file=./seed/seed.sql` against the **local** D1 database only (never `--remote`). Safe to re-run any time — it deletes and re-inserts every row it owns (all ids/emails are prefixed `seed-` / `@seed.test`) before re-inserting, so nothing duplicates.

Source of truth for every value below is `seed/seed.sql` — if you change the script, update this file too.

## 2. Log in without real email

`sendMagicLink` (`src/lib/auth.ts`) has a dev-only override, gated on two vars that only ever exist in `.dev.vars` (never in production — see `worker-configuration.d.ts` / `wrangler.jsonc`):

1. Start the API: `pnpm run dev` (`http://localhost:8787`, or the next free port if that one's taken).
2. On the login page, request a magic link for any account email from the tables below.
3. With `LOCAL_EMAIL_MODE=console` (the default in `.dev.vars.example`), the link prints straight to the `wrangler dev` terminal — copy it into your browser instead of checking an inbox:
   ```
   [magic link] doctor.verified@seed.test -> http://localhost:8787/api/auth/magic-link/verify?token=...
   ```
4. To test real delivery instead, set `LOCAL_EMAIL_MODE=send` in your own `.dev.vars` and use a real inbox you control as that account's email — a per-developer override, don't edit the checked-in seed emails.

## 3. Doctors

| Name           | Email                         | Status                                                    | What it tests                                                                                                                             |
| -------------- | ----------------------------- | --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Vera Verified  | `doctor.verified@seed.test`   | `active`, `doctor_profile.verified = true`                | Full dashboard access — has an active access grant to every seeded patient (A–E)                                                          |
| Uma Unverified | `doctor.unverified@seed.test` | `pending_verification`, `doctor_profile.verified = false` | The verification gate — the web app's doctor route guard redirects this account straight to `/signup/doctor/pending`, no dashboard access |

Both are affiliated with **Seed Test Hospital / Seed Test Department** (a fixed local institution/department, independent of the real Trinidad hospital data in `seed/institutions.sql`).

## 4. Patients

Each patient has roughly a month of dated readings (last ~30 days) built from a mix of hand-crafted "anchor" rows (specific correctness cases — collisions, threshold flips, boundary edges) and generated background rows. Every glucose slot (fasted / breakfast / lunch / dinner) and BP slot (AM / PM) is generated independently per patient, so patients differ in **both** how many days they log and how many slots they complete on a given day — not just a uniform "logs X% of days."

| Name           | Email                 | DOB        | Scenario                                                                                                         | What it tests                                                                                                                                                                                                                                                                              |
| -------------- | --------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Alice Anderson | `patient.a@seed.test` | 1990-03-14 | **Ideal / disciplined** — logs fasted + breakfast + lunch + dinner + BP AM/PM (up to 6 readings) on ~90% of days | Dense, complete history; all values comfortably normal — glucose history table should show all four columns (Fasted/Breakfast/Lunch/Dinner) populated on nearly every row                                                                                                                  |
| Bianca Brooks  | `patient.b@seed.test` | 1988-07-22 | **Uncontrolled** — frequently high readings; logs fasted often but skips individual meals/BP inconsistently      | Real gaps + partial slot coverage; a glucose slot collision (two `post_meal` readings before 11am, same day) and a BP slot collision (two `morning` readings, same day); one reading dated 2026-02-15 to test the "All time" filter boundary                                               |
| Carla Chen     | `patient.c@seed.test` | 1992-11-05 | **Custom (looser) thresholds**, moderate logging                                                                 | Has a `threshold` row (`fastingGlucoseHigh 110, postMealGlucoseHigh 160, systolicHigh 150, diastolicHigh 95`) — several readings are `high` under platform defaults but `normal` under her override, so severity should visibly change if you compare against/without the custom threshold |
| Diana Dawson   | `patient.d@seed.test` | 1995-01-30 | **No threshold row**, least disciplined of A–D — sparser logging across all slots                                | Exercises the `DEFAULT_THRESHOLDS` fallback path (`resolveThresholds()`); natural normal/high mix                                                                                                                                                                                          |
| Elena Ellis    | `patient.e@seed.test` | 1991-09-18 | **Sparse / edge case** — just two readings                                                                       | A same-day pair at local 10:59 and 11:00, straddling the Breakfast→Lunch boundary (`glucoseSlotFor()` in `apps/web/src/lib/reading-history.ts`); also the account to check the "no/near-empty history" UI state                                                                            |

## 5. Notes on the data

- **Severity is never stored** — it's computed at read time (`computeSeverity()` in `src/lib/thresholds.ts`) against whichever threshold set applies, so re-seeding never leaves stale severity values.
- **Timestamps assume AST (UTC-4, Trinidad & Tobago)** — hardcoded as a fixed +4h offset rather than computed dynamically, since SQLite's `'localtime'` modifier proved unreliable inside `wrangler d1 execute`'s multi-statement batching. If you're developing from a different timezone, the meal-slot columns still populate correctly relative to each other, just not at exactly 7am/8am/1pm/7pm local for you.
- **Notes**: roughly half of all readings have a short note (e.g. "After breakfast", "Feeling good"), the rest are `NULL`, so both the add-note and edit-note UI states are exercised.
- All doctor access to these patients comes from `seed-doctor-verified`'s access grants — the unverified doctor has none (and can't reach the dashboard to use them anyway).

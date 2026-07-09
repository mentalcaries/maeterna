# Maeterna — API

REST API for Maeterna, built on [Hono](https://hono.dev/) and deployed to Cloudflare Workers, backed by Cloudflare D1 (SQLite) via Drizzle ORM. Auth is handled by [Better Auth](https://www.better-auth.com/) (magic link, Google OAuth, passkeys).

## Domain model

- **Roles**: `patient`, `doctor`, `admin` — attached to the user record, drives authorization
- **Readings**: `glucose` or `blood_pressure`, with a `context` (e.g. `fasting`, `post_meal`), and a `severity` (`normal` / `warning` / `critical`) computed at write time against thresholds
- **Thresholds**: platform defaults, overridable per-patient by a doctor
- **Access grants**: patients grant an individual doctor or a whole department read access; revocable; doctor reads are logged to `access_log`
- **Doctor affiliations**: doctor ↔ institution/department pairs
- **Invites**: doctors generate invite tokens (scoped to a department) for patients to redeem during onboarding
- **Onboarding**: after first sign-in, `POST /profile/complete` — patients supply DOB; doctors supply only first/last name, which triggers a **name-only** MBTT registry lookup (exact last name match, first name word match). No match → `POST /profile/complete/submit-for-review` puts the doctor in `pending_verification` until an admin approves them.
- A scheduled Worker cron syncs the MBTT registry monthly (`src/lib/mbtt-sync.ts`).

## Running locally

```bash
pnpm run dev          # wrangler dev, http://localhost:8787 — runs against LOCAL D1 (Miniflare) by default
```

Copy `.dev.vars.example` to `.dev.vars` (gitignored) and fill in real values — Drizzle Kit needs the `CLOUDFLARE_*` credentials to talk to the remote D1 database (for `db:generate`/`db:migrate`/`db:studio` only), and the Worker itself needs the rest (`BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `FRONTEND_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `SUPER_ADMIN_EMAIL`).

## Local dev seed data

```bash
pnpm db:seed:local    # populate the LOCAL D1 database with test patients/doctors — safe to re-run
```

Seeds two doctors and five patients. Patients A–D each get roughly a month of dated readings (a handful of hand-crafted "anchor" rows for specific correctness cases, plus a generated background — each glucose slot (fasted/breakfast/lunch/dinner) and BP slot (AM/PM) has its own independent day filter, so patients differ in _both_ how many days they log and how many slots they complete per day) covering normal/high severity for both glucose and blood pressure; patient C has a custom per-patient threshold. An access grant gives the verified doctor visibility into every seeded patient. Every account is loggable-in via the normal magic-link flow — see [Local login without real email](#local-login-without-real-email) below.

| Role                | Email                         | Scenario                                                                                                                                                                                                     |
| ------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Doctor (verified)   | `doctor.verified@seed.test`   | Has access to all seeded patients                                                                                                                                                                            |
| Doctor (unverified) | `doctor.unverified@seed.test` | `pending_verification` — exercises the verification-gated redirect                                                                                                                                           |
| Patient A           | `patient.a@seed.test`         | Ideal / disciplined — logs fasted + breakfast + lunch + dinner + BP AM/PM (up to 6 readings) on ~90% of days, values stay comfortably normal                                                                 |
| Patient B           | `patient.b@seed.test`         | Uncontrolled — frequently high readings; logs fasted often but skips individual meals/BP inconsistently, same-slot glucose and BP collisions on one day, plus one very old reading for the "All time" filter |
| Patient C           | `patient.c@seed.test`         | Custom (looser) thresholds, moderate logging — values hover near her personal cutoffs, so severity visibly depends on the override                                                                           |
| Patient D           | `patient.d@seed.test`         | No threshold row, least disciplined of A–D — sparser logging across all slots, natural normal/high mix under default thresholds                                                                              |
| Patient E           | `patient.e@seed.test`         | Sparse data — a single reading, plus a pair straddling a meal-slot boundary                                                                                                                                  |

Source of truth for these values is `seed/seed.sql` — if it changes, this table should too. The script is idempotent: it deletes every row it owns (all ids/emails are prefixed `seed-`/`@seed.test`) before re-inserting, so running it repeatedly never duplicates data. It only ever targets the local D1 instance (`wrangler d1 execute maeterna --local`) — never pass `--remote`.

### Local login without real email

`sendMagicLink` in `src/lib/auth.ts` has a dev-only override, gated on two env vars that only ever exist in `.dev.vars` (never in production):

1. Request a magic link from the login page for any seeded (or manually created) account.
2. With `LOCAL_EMAIL_MODE=console` (the default in `.dev.vars.example`), the link is printed to the `wrangler dev` terminal instead of being emailed — copy it into your browser.
3. To test real email delivery instead, set `LOCAL_EMAIL_MODE=send` in your own `.dev.vars` and use a real inbox you control as that account's email (a per-developer override — don't change the checked-in seed emails).

## Database (Drizzle + D1)

```bash
pnpm run db:generate  # diff src/db/schema.ts against migrations/ — local only, no DB connection
pnpm run db:migrate   # apply pending migrations to the REMOTE D1 database
pnpm run db:studio    # browse the remote D1 database
```

`db:generate` is safe to run anytime after a schema change. `db:migrate` is not — it mutates the shared remote database, so treat it like a production deploy.

## Deploying

```bash
pnpm run deploy       # wrangler deploy --minify
pnpm run cf-typegen   # regenerate the CloudflareBindings type after changing wrangler.jsonc
```

## API contract

`/openapi.json` is generated dynamically at runtime from the `@hono/zod-openapi` route definitions (`src/routes/*.ts`, wired up via `app.doc(...)` in `src/index.ts`) — that's the real, always-accurate contract.

`maeterna-openapi.yaml` in this directory is a hand-maintained reference doc and **has drifted from the live routes** — don't treat it as ground truth. If `apps/web`'s generated `api.types.ts` needs updating, regenerate it from a running server's `/openapi.json`, not from this yaml file.

## More detail

See [`CLAUDE.md`](./CLAUDE.md) for architecture notes, auth internals, and route-by-route conventions.

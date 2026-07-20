# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm run dev        # Start local dev server via wrangler dev (localhost:8787)
pnpm run deploy     # Deploy to Cloudflare Workers (minified)
pnpm run cf-typegen # Regenerate CloudflareBindings type from wrangler.jsonc
pnpm db:seed:local  # Populate the local D1 database with test patients/doctors — see README.md#local-dev-seed-data
```

Drizzle (run from `apps/api`; env vars are loaded automatically from `.dev.vars` via `drizzle.config.ts`):

```bash
pnpm run db:generate  # Generate migration from schema changes
pnpm run db:migrate   # Apply migrations to the remote D1 database
pnpm run db:studio    # Open Drizzle Studio for the D1 database
```

The `.dev.vars` file holds the three env vars drizzle-kit needs (`CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_D1_DATABASE_ID`, `CLOUDFLARE_D1_TOKEN`). These are for drizzle-kit only — the Worker runtime accesses D1 through the `DB` binding defined in `wrangler.jsonc`.

Local D1 (Miniflare) is provisioned automatically by `wrangler dev` — no separate setup file; see `README.md`'s "Running locally" and "Local dev seed data" sections. `db:migrate` above only ever applies to the remote database.

## Architecture

**Stack**: [Hono](https://hono.dev/) on Cloudflare Workers → Cloudflare D1 (SQLite) via Drizzle ORM → Better Auth for authentication.

The full API contract is intended to live in `maeterna-openapi.yaml`, but in practice it has **drifted from the actual Hono route definitions** — don't trust it as ground truth without cross-checking the route files under `src/routes/`. The runtime contract actually served at `/openapi.json` is generated dynamically from the `@hono/zod-openapi` `createRoute(...)` schemas via `app.doc(...)` in `src/index.ts`, independent of the yaml file. When `apps/web`'s generated `src/lib/api.types.ts` needs updating, regenerate it from a running server's `/openapi.json` (or hand-edit the specific changed fields) — regenerating from `maeterna-openapi.yaml` can produce a large, unrelated diff. If you intentionally change a route's contract, update the yaml too for documentation purposes, but the source of truth is the Zod route schemas.

The database schema lives in `src/db/schema.ts` (referenced by `drizzle.config.ts`); migrations are output to `drizzle/migrations/`. `db:generate` only diffs the schema file locally (no DB connection needed); `db:migrate` applies pending migrations to the **remote** D1 database using the credentials in `.dev.vars` — treat it as a real, hard-to-reverse production action.

**Domain model** (from the OpenAPI spec):

- **Three roles**: `patient`, `doctor`, `admin`. Role is attached to the user record and drives all authorization.
- **Account status**: Every user also has a `status` (`active` | `suspended`), independent of role and toggled by an admin via `PATCH /admin/users/{userId}/status` (an admin cannot suspend their own account — `400`). Suspension gates the entire platform, not just data access — `sessionMiddleware` rejects a `suspended` user on every authenticated route (see Auth below) before any route logic runs. It does **not** revoke existing access grants; reactivating a doctor or patient restores access automatically. Patient-facing doctor search excludes suspended doctors so they can't be granted _new_ access, but a patient's existing grant to a doctor who is later suspended stays visible and untouched in their grant list.
- **Readings**: Two types — `glucose` (stored canonically in mg/dL, single value) and `blood_pressure` (mmHg, systolic + diastolic). Each reading has a `context` (`fasted`, `post_meal`, `morning`, or `evening`), a `severity` computed on read against current thresholds (`normal` / `high`), and a `loggedById` that can be either the patient or a doctor. Patients may update or delete only readings where both `patientId` and `loggedById` match their own user ID; doctor-entered readings are patient-visible but patient-immutable.
- **Thresholds**: Platform defaults exist for glucose and BP; doctors can set per-patient custom thresholds. Severity is computed on read against whichever set currently applies.
- **Access grants**: Patients explicitly grant access to either an individual doctor (`grantType: individual`) or an entire department (`grantType: department`). Grants can be revoked. Doctor reads of a patient record are logged in `access_log`.
- **Doctor affiliations**: Doctors have zero or more affiliations (`doctor_affiliation`), each either a seeded public `institution` (optionally with a `department` for access-grant purposes) or a free-text private-practice name (`practiceName`) — exactly one of `institutionId`/`practiceName` is set per row, enforced by a DB CHECK constraint. Managed via `GET`/`POST`/`DELETE /profile/doctor/affiliations`. Institutions are typed (`hospital`, `health_centre`, `private_practice`).
- **Invites**: Doctors create invite tokens (scoped to a department) that patients use during onboarding to pre-wire an access grant. One public endpoint (`GET /invites/{token}`) requires no auth. Admin can also send invites by email.
- **Onboarding flow**: After first sign-in (magic link / passkey / Google via Better Auth), users hit `POST /profile/complete`. Patients supply DOB; doctors self-attest a `registrationNumber` and `phoneNumber` (both required, validated for shape only — no external registry check) and are `active` immediately. `registrationNumber` is write-once: it's only ever set here — `PATCH /doctors/me` doesn't accept it, so it can't be changed afterward. Patients verify a doctor themselves via the registration number shown in search results and grant details. There is no verification-review/approval flow or `pending_verification` status.

**Auth**: Bearer JWT issued by Better Auth. All routes require auth except `GET /invites/{token}`. `sessionMiddleware` also rejects a `suspended` account with `403 { code: "ACCOUNT_SUSPENDED" }` before any route handler runs (see Account status above). The `admin` tag routes are restricted to the `admin` role.

**Cloudflare binding**: The D1 database is bound as `DB` in `wrangler.jsonc`. When instantiating Hono, pass `CloudflareBindings` (generated by `cf-typegen`) as the bindings generic so `c.env.DB` is typed.

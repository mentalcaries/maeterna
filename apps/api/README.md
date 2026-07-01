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
pnpm run dev          # wrangler dev --remote, http://localhost:8787
```

Needs a `.dev.vars` file (gitignored) with the Cloudflare credentials Drizzle Kit needs to talk to D1:

```
CLOUDFLARE_ACCOUNT_ID=...
CLOUDFLARE_D1_DATABASE_ID=...
CLOUDFLARE_D1_TOKEN=...
```

The Worker itself needs these bound as secrets/vars in `wrangler.jsonc` / via `wrangler secret put`: `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `FRONTEND_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `SUPER_ADMIN_EMAIL`.

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

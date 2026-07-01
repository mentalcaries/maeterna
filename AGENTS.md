# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

<!--VITE PLUS START-->

# Using Vite+, the Unified Toolchain for the Web

This project is using Vite+, a unified toolchain built on top of Vite, Rolldown, Vitest, tsdown, Oxlint, Oxfmt, and Vite Task. Vite+ wraps runtime management, package management, and frontend tooling in a single global CLI called `vp`. Vite+ is distinct from Vite, and it invokes Vite through `vp dev` and `vp build`. Run `vp help` to print a list of commands and `vp <command> --help` for information about a specific command.

Docs are local at `node_modules/vite-plus/docs` or online at https://viteplus.dev/guide/.

## Review Checklist

- [ ] Run `vp install` after pulling remote changes and before getting started.
- [ ] Run `vp check` and `vp test` to format, lint, type check and test changes.
- [ ] Check if there are `vite.config.ts` tasks or `package.json` scripts necessary for validation, run via `vp run <script>`.
- [ ] If setup, runtime, or package-manager behavior looks wrong, run `vp env doctor` and include its output when asking for help.

<!--VITE PLUS END-->

## Commands

```bash
# Start the dev server (run from monorepo root — never vp dev from the root directly)
pnpm dev                        # turbo dev → runs vp dev --port 3000 in apps/web
pnpm --filter web dev           # target web app directly

# Install / sync dependencies
vp install                      # run after any package.json change

# Validate (format + lint + typecheck in one pass)
vp check                        # read-only check
vp check --fix                  # auto-fix formatting issues

# Add shadcn/ui components to packages/ui
pnpm dlx shadcn@latest add <component> -c apps/web
```

## Monorepo structure

```
apps/web/          React SPA — TanStack Router + TanStack Query, Tailwind CSS
apps/api/          Hono API on Cloudflare Workers — D1 (Drizzle ORM), Better Auth
packages/ui/       Shared component library (shadcn/ui, Base UI, Tailwind)
```

Root `vite.config.ts` is **not** a dev server — it only configures staged hooks, lint rules, and formatting. Running `vp dev` from the monorepo root will 404 because `index.html` lives in `apps/web/`.

`apps/api` has its own `CLAUDE.md` with backend-specific architecture, commands, and Drizzle migration workflow — read it before touching anything under `apps/api/`.

## Routing

File-based routing via `@tanstack/router-plugin`. Route tree is auto-generated into `apps/web/src/routeTree.gen.ts` on every `vp dev` start — never edit that file.

Route layout by role:

- `/patient/*` — mobile-first, max-w-lg, bottom nav bar with 3 tabs
- `/doctor/*` — desktop, sidebar or header nav
- `/admin/*` — desktop, sidebar nav

Each role's `route.tsx` acts as an auth guard: it reads the session on mount (via `useSession()` from `apps/web/src/lib/session.ts`, or `authClient.getSession()` directly) and redirects to the role's `/login` if the session is missing or the role doesn't match. The login pages are excluded from the guard via an `isLoginPage` check on the pathname.

## Authentication & session

Real auth via [Better Auth](https://www.better-auth.com/), backed by `apps/api`:

- `apps/web/src/lib/auth-client.ts` — `authClient` (Better Auth client, magic-link plugin) plus `getAppUser()`, which unwraps `authClient.getSession()`'s response into an `AppUser` (`{ id, email, name, role, firstName?, lastName?, status? }`).
- `apps/web/src/lib/session.ts` — `useSession()`, a thin TanStack Query wrapper around `authClient.getSession()` (query key `["session"]`, 5 min `staleTime`). Prefer this hook over calling `authClient.getSession()` ad hoc so session reads share cache.
- Login screens do a real magic-link / passkey / Google sign-in (see `apps/api` `CLAUDE.md` for the backend side); there's no dropdown user picker.

`apps/web/src/mock/auth.ts` (sessionStorage-based fake session) still exists in the tree but is **dead code** — nothing imports it anymore. Don't build new features on it.

## API client & mock data layer

Real data flows through the backend in `apps/api` via `apps/web/src/lib/api-client.ts`:

```ts
import { apiClient } from "@/lib/api-client"
apiClient.GET("/patients/me/readings", { ... })
apiClient.POST("/profile/complete", { body })
```

`apiClient` is an `openapi-fetch` client typed against `apps/web/src/lib/api.types.ts` (auto-generated — never hand-edit the bulk of it; a comment at the top says so). **Regenerate it from the live server's `/openapi.json`** (e.g. `npx openapi-typescript http://localhost:8787/openapi.json -o src/lib/api.types.ts` with `apps/api` running), not from `apps/api/maeterna-openapi.yaml`. That yaml file has drifted from the actual Hono route definitions — regenerating from it produces a huge, unrelated diff. If you can't run the live server, hand-edit only the specific fields you changed in the corresponding Hono route (`createRoute` body/response schemas) to keep the generated file minimally correct.

`apps/web/src/mock/db.ts` is **legacy and mostly dead**: its in-memory arrays (`patients`, `doctors`, `readings`, `auditLog`) and mutation functions (`addReading`, `addNote`, `setPatientThresholds`, `inviteUser`, `setAccountStatus`, `reassignPatient`, `addAuditEntry`, `verifyMBTT`, etc.) are not imported anywhere else in the app. The file is kept alive only for its **type exports** (`Reading`, `ReadingType`, `ReadingContext`, `MealContext`, `TimeOfDay`, etc.), which are still `import type`-ed by chart/list components and route files. Don't add new mutation logic here — it won't be wired to anything; use `apiClient` against the real API instead.

## Reading model

A `Reading` has `type` (`glucose` | `blood_pressure`), `value1`, optional `value2` (diastolic), and three context fields:

- `context: ReadingContext` — the legacy/combined field used by `computeSeverity` (`fasting`, `post_meal`, `morning`, `before_bed`)
- `mealContext?: MealContext` — glucose-only (`fasted`, `post_meal`)
- `timeOfDay?: TimeOfDay` — time slot (`morning`, `afternoon`, `evening`, `before_bed`)

When rendering context in the doctor view, prefer `mealContext` / `timeOfDay` when present and fall back to `context` for older records (see `readingContext()` in `apps/web/src/routes/doctor/patients/$id.tsx`). The real `Reading` API model (`apps/api` `ReadingSchema`) only has the single `context: string` field — `ReadingForm` collapses `mealContext` into that one field on submit (`context: mealContext`), so `mealContext`/`timeOfDay` only ever populate on the legacy mock shape, not on API-sourced readings.

Severity (`normal` | `warning` | `critical`) is computed by `computeSeverity()` — `apps/web/src/lib/thresholds.ts` for the old mock flow, `apps/api/src/lib/thresholds.ts` for the real API (`apps/api/src/routes/readings.ts` calls it at write time). Unlike the mock's `setPatientThresholds()`, the real `PUT /doctors/me/patients/{patientId}/thresholds` endpoint does **not** retroactively recompute severity on existing readings when thresholds change — severity is fixed at the time each reading was logged.

## UI components

All components come from `@workspace/ui/components/<name>` (re-exported shadcn). Utility: `cn()` from `@workspace/ui/lib/utils`. Icons from `@remixicon/react`.

The `ChoiceCard` pattern (grid of toggle buttons with icon + label) is defined in `ReadingForm` and used for card-based selection UI — reuse this pattern for any similar selector.

Patient screens cap width at `max-w-lg` centered, with `pb-20` on the main content area to clear the fixed bottom nav bar.

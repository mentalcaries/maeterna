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
packages/ui/       Shared component library (shadcn/ui, Base UI, Tailwind)
```

Root `vite.config.ts` is **not** a dev server — it only configures staged hooks, lint rules, and formatting. Running `vp dev` from the monorepo root will 404 because `index.html` lives in `apps/web/`.

## Routing

File-based routing via `@tanstack/router-plugin`. Route tree is auto-generated into `apps/web/src/routeTree.gen.ts` on every `vp dev` start — never edit that file.

Route layout by role:

- `/patient/*` — mobile-first, max-w-lg, bottom nav bar with 3 tabs
- `/doctor/*` — desktop, sidebar or header nav
- `/admin/*` — desktop, sidebar nav

Each role's `route.tsx` acts as an auth guard: it reads `getSession()` on mount and redirects to the role's `/login` if the session is missing or the role doesn't match. The login pages are excluded from the guard via an `isLoginPage` check on the pathname.

## Authentication & session

`apps/web/src/mock/auth.ts` — thin wrapper around `sessionStorage`. `getSession()` / `setSession()` / `clearSession()`. The session stores `{ userId, role, name }`. No real auth — login screens let you pick a user from a dropdown.

## Mock data layer

`apps/web/src/mock/db.ts` — single module with in-memory arrays (`doctors`, `patients`, `readings`, `auditLog`) and mutating functions. All data resets on page refresh. Patterns:

- Export the raw arrays directly (e.g. `patients`, `doctors`) for reads
- Export named mutation functions (`addReading`, `addNote`, `setPatientThresholds`, `inviteUser`, `setAccountStatus`, `reassignPatient`, `addAuditEntry`) for writes
- `makeReading()` is an internal helper — it calls `computeSeverity()` automatically
- Auto-increment IDs use module-level counters (`_nextReadingIndex`, `_nextAuditIndex`)

## Reading model

A `Reading` has `type` (`glucose` | `blood_pressure`), `value1`, optional `value2` (diastolic), and three context fields:

- `context: ReadingContext` — the legacy/combined field used by `computeSeverity` (`fasting`, `post_meal`, `morning`, `before_bed`)
- `mealContext?: MealContext` — glucose-only (`fasted`, `post_meal`)
- `timeOfDay?: TimeOfDay` — time slot (`morning`, `afternoon`, `evening`, `before_bed`)

When rendering context in the doctor view, prefer `mealContext` / `timeOfDay` when present and fall back to `context` for older records (see `readingContext()` in `apps/web/src/routes/doctor/patients/$id.tsx`).

Severity (`warning` | `critical` | undefined) is computed by `computeSeverity()` in `apps/web/src/lib/thresholds.ts` and stored on the reading. When patient thresholds change, `setPatientThresholds()` recomputes severity for all that patient's existing readings.

## UI components

All components come from `@workspace/ui/components/<name>` (re-exported shadcn). Utility: `cn()` from `@workspace/ui/lib/utils`. Icons from `@remixicon/react`.

The `ChoiceCard` pattern (grid of toggle buttons with icon + label) is defined in `ReadingForm` and used for card-based selection UI — reuse this pattern for any similar selector.

Patient screens cap width at `max-w-lg` centered, with `pb-20` on the main content area to clear the fixed bottom nav bar.

# Maeterna

Maeterna is a maternal health monitoring app for pregnant women and their OB-GYN doctors in Trinidad & Tobago. Patients log glucose and blood pressure readings; doctors monitor their patients against configurable severity thresholds; admins manage accounts and doctor verification.

## Monorepo layout

```
apps/web/       React SPA (patient / doctor / admin portals) — see apps/web/README.md
apps/api/       Hono API on Cloudflare Workers + D1        — see apps/api/README.md
```

This is a pnpm workspace managed with [Turborepo](https://turbo.build/) and [Vite+](https://viteplus.dev/) (`vp`), a unified toolchain wrapping Vite, Vitest, Oxlint, and Oxfmt.

## Getting started

```bash
pnpm install     # or: vp install
```

Each app needs its own env file — see [`apps/web/README.md`](apps/web/README.md) and [`apps/api/README.md`](apps/api/README.md) for what's required.

```bash
pnpm dev         # turbo dev — runs the web app (port 3000) and API (port 8787)
```

## Common commands

```bash
vp check           # format + lint + typecheck (read-only)
vp check --fix      # same, but auto-fixes formatting
pnpm build          # turbo build — builds all apps
```

Run these from the repo root. Don't run `vp dev` directly from the root — it has no dev server of its own; use `pnpm dev` or target one app with `pnpm --filter ./apps/web dev` / `pnpm --filter maeterna-api dev`.

> Note: `apps/web`'s `package.json` name is `maeterna` (same as the root), not `web`, so `pnpm --filter web` won't resolve — use the path filter above instead.

## Docs

- [`AGENTS.md`](./AGENTS.md) (symlinked as `CLAUDE.md`) — conventions and architecture notes for AI coding agents working in this repo; also useful background for human contributors.
- Each app has its own `CLAUDE.md` with deeper, app-specific implementation notes.

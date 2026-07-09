// Auto-generated base: run `pnpm run cf-typegen` after adding new bindings.
// Secrets (set via `wrangler secret put`) are manually typed here.
interface CloudflareBindings {
  DB: D1Database
  BETTER_AUTH_SECRET: string
  BETTER_AUTH_URL: string
  GOOGLE_CLIENT_ID: string
  GOOGLE_CLIENT_SECRET: string
  FRONTEND_URL: string
  RESEND_API_KEY: string
  RESEND_FROM_EMAIL: string
  SUPER_ADMIN_EMAIL: string
  // Local dev only — set in .dev.vars, never in production. See src/lib/auth.ts.
  LOCAL_DEV_ONLY_SIGNAL?: string
  LOCAL_EMAIL_MODE?: string
}

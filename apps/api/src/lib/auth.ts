import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { magicLink } from "better-auth/plugins"
import { passkey } from "@better-auth/passkey"
import { Resend } from "resend"
import { createDb } from "../db"
import * as schema from "../db/schema"
import { magicLinkEmail } from "./email"

// Cache auth instance per env object (stable per CF Worker isolate).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const authCache = new WeakMap<object, any>()

export function getAuth(env: CloudflareBindings) {
  const cached = authCache.get(env)
  if (cached) return cached

  const db = createDb(env.DB)

  const auth = betterAuth({
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    trustedOrigins: [env.BETTER_AUTH_URL, env.FRONTEND_URL],
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
      },
    }),
    socialProviders: {
      google: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
      },
    },
    plugins: [
      magicLink({
        expiresIn: 600,
        allowedAttempts: 3,
        sendMagicLink: async ({ email, url }) => {
          // Layer 1: only ever true when running via `wrangler dev` locally
          // (LOCAL_DEV_ONLY_SIGNAL lives in .dev.vars only — never a prod var
          // or secret). Layer 2 is only consulted once layer 1 is true, so a
          // deployed environment can never skip the real send.
          const isLocalDev = Boolean(env.LOCAL_DEV_ONLY_SIGNAL)
          if (isLocalDev && env.LOCAL_EMAIL_MODE !== "send") {
            console.log(`[magic link] ${email} -> ${url}`)
            return
          }

          const resend = new Resend(env.RESEND_API_KEY)
          const { subject, html, text } = magicLinkEmail(url, env.FRONTEND_URL)
          await resend.emails.send({
            from: `Maeterna Health Monitoring <${env.RESEND_FROM_EMAIL}>`,
            to: email,
            subject,
            html,
            text,
          })
        },
      }),
      passkey(),
    ],
    user: {
      additionalFields: {
        role: { type: "string", required: false, nullable: true },
        status: { type: "string", defaultValue: "active", required: false },
        firstName: { type: "string", required: false, nullable: true },
        lastName: { type: "string", required: false, nullable: true },
        termsAcceptedAt: {
          type: "date",
          required: false,
          nullable: true,
          input: false,
        },
      },
    },
    databaseHooks: {
      user: {
        create: {
          before: async (userData) => {
            if (userData.email === env.SUPER_ADMIN_EMAIL) {
              return { data: { ...userData, role: "admin" } }
            }
          },
        },
      },
    },
  })

  authCache.set(env, auth)
  return auth
}

export type Auth = ReturnType<typeof getAuth>

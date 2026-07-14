import { OpenAPIHono } from "@hono/zod-openapi"
import { HTTPException } from "hono/http-exception"
import { cors } from "hono/cors"
import { getAuth } from "./lib/auth"
import { STATUS_CODES } from "./lib/errors"
import { registerProfileRoutes } from "./routes/profile"
import { registerPatientRoutes } from "./routes/patients"
import { registerReadingRoutes } from "./routes/readings"
import { registerAccessRoutes } from "./routes/access"
import { registerSearchRoutes } from "./routes/search"
import { registerInstitutionRoutes } from "./routes/institutions"
import { registerDoctorRoutes } from "./routes/doctors"
import { registerInviteRoutes } from "./routes/invites"
import { registerAdminRoutes } from "./routes/admin"
import { registerPreferencesRoutes } from "./routes/preferences"
import type { AppEnv } from "./types"
import type { AppStatus } from "./lib/errors"

const app = new OpenAPIHono<AppEnv>({
  defaultHook: (result, c) => {
    if (!result.success) {
      return c.json(
        { code: "VALIDATION_ERROR", message: result.error.message },
        422
      )
    }
  },
})

app.use("*", async (c, next) => {
  return cors({
    origin: [c.env.FRONTEND_URL],
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
  })(c, next)
})

// ── Better Auth handler (magic link, Google OAuth callbacks, session mgmt) ───
app.on(["GET", "POST"], "/api/auth/*", async (c) => {
  const auth = getAuth(c.env)
  return auth.handler(c.req.raw)
})

registerProfileRoutes(app)
registerPatientRoutes(app)
registerReadingRoutes(app)
registerAccessRoutes(app)
registerSearchRoutes(app)
registerInstitutionRoutes(app)
registerDoctorRoutes(app)
registerInviteRoutes(app)
registerAdminRoutes(app)
registerPreferencesRoutes(app)

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    const code = STATUS_CODES[err.status as AppStatus] ?? "ERROR"
    return c.json({ code, message: err.message }, err.status as AppStatus)
  }
  console.error(err)
  return c.json(
    { code: "INTERNAL_ERROR", message: "Internal server error" },
    500
  )
})

app.doc("/openapi.json", {
  openapi: "3.0.3",
  info: {
    title: "Maeterna API",
    version: "1.0.0",
    description:
      "REST API for Maeterna — a maternal health monitoring app for pregnant women and their OB-GYN doctors in Trinidad & Tobago.",
  },
})

export default {
  fetch: app.fetch,
}

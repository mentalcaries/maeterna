import { createRoute, z } from "@hono/zod-openapi"
import { eq } from "drizzle-orm"
import { createDb } from "../db"
import { userPreferences } from "../db/schema"
import { sessionMiddleware } from "../middleware/session"
import { UserPreferencesSchema, responses } from "../schemas"
import type { AppRouter } from "../types"

const getPreferencesRoute = createRoute({
  method: "get",
  path: "/preferences",
  tags: ["Preferences"],
  summary: "Get user preferences",
  responses: {
    200: {
      content: { "application/json": { schema: UserPreferencesSchema } },
      description: "User preferences",
    },
    ...responses,
  },
})

const patchPreferencesRoute = createRoute({
  method: "patch",
  path: "/preferences",
  tags: ["Preferences"],
  summary: "Update user preferences",
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: z.object({ glucoseUnit: z.enum(["mg/dL", "mmol/L"]) }),
        },
      },
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: UserPreferencesSchema } },
      description: "Updated preferences",
    },
    ...responses,
  },
})

export function registerPreferencesRoutes(app: AppRouter) {
  app.use("/preferences", sessionMiddleware)

  app.openapi(getPreferencesRoute, async (c) => {
    const u = c.get("user")
    const db = createDb(c.env.DB)
    const row = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, u.id))
      .get()
    return c.json({ glucoseUnit: row?.glucoseUnit ?? "mg/dL" } as const)
  })

  app.openapi(patchPreferencesRoute, async (c) => {
    const u = c.get("user")
    const { glucoseUnit } = c.req.valid("json")
    const db = createDb(c.env.DB)
    const now = new Date()
    await db
      .insert(userPreferences)
      .values({ userId: u.id, glucoseUnit, updatedAt: now })
      .onConflictDoUpdate({
        target: userPreferences.userId,
        set: { glucoseUnit, updatedAt: now },
      })
    return c.json({ glucoseUnit } as const)
  })
}

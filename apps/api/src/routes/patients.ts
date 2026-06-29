import { createRoute, z } from "@hono/zod-openapi"
import { eq } from "drizzle-orm"
import { createDb } from "../db"
import { user as userTable, patientProfile } from "../db/schema"
import { sessionMiddleware, requireRole } from "../middleware/session"
import { PatientSchema, responses } from "../schemas"
import type { AppRouter } from "../types"

const getMeRoute = createRoute({
  method: "get",
  path: "/patients/me",
  tags: ["Patients"],
  summary: "Get own patient profile",
  responses: {
    200: {
      content: { "application/json": { schema: PatientSchema } },
      description: "Patient profile",
    },
    ...responses,
  },
})

const patchMeRoute = createRoute({
  method: "patch",
  path: "/patients/me",
  tags: ["Patients"],
  summary: "Update own patient profile",
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: z.object({
            firstName: z.string().optional(),
            lastName: z.string().optional(),
            dateOfBirth: z.string().optional(),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: PatientSchema } },
      description: "Updated patient profile",
    },
    ...responses,
  },
})

const deleteMeRoute = createRoute({
  method: "delete",
  path: "/patients/me",
  tags: ["Patients"],
  summary: "Delete own account",
  responses: {
    204: { description: "Account and all associated data deleted" },
    ...responses,
  },
})

export function registerPatientRoutes(app: AppRouter) {
  app.use("/patients/me", sessionMiddleware)
  app.use("/patients/me", requireRole("patient"))

  app.openapi(getMeRoute, async (c) => {
    const u = c.get("user")
    const db = createDb(c.env.DB)
    const profile = await db
      .select()
      .from(patientProfile)
      .where(eq(patientProfile.userId, u.id))
      .get()
    return c.json({
      id: u.id,
      firstName: u.firstName ?? "",
      lastName: u.lastName ?? "",
      email: u.email,
      dateOfBirth: profile?.dateOfBirth ?? "",
      avatarUrl: u.image,
      role: "patient" as const,
      status: u.status,
      createdAt: u.createdAt.toISOString(),
    })
  })

  app.openapi(patchMeRoute, async (c) => {
    const u = c.get("user")
    const body = c.req.valid("json")
    const db = createDb(c.env.DB)
    const now = new Date()

    const userUpdates: Record<string, unknown> = { updatedAt: now }
    if (body.firstName !== undefined) {
      userUpdates.firstName = body.firstName
      userUpdates.name = `${body.firstName} ${u.lastName ?? ""}`
    }
    if (body.lastName !== undefined) {
      userUpdates.lastName = body.lastName
      userUpdates.name = `${u.firstName ?? ""} ${body.lastName}`
    }
    await db.update(userTable).set(userUpdates).where(eq(userTable.id, u.id))

    if (body.dateOfBirth !== undefined) {
      await db
        .update(patientProfile)
        .set({ dateOfBirth: body.dateOfBirth, updatedAt: now })
        .where(eq(patientProfile.userId, u.id))
    }

    const updated = await db
      .select()
      .from(userTable)
      .where(eq(userTable.id, u.id))
      .get()
    const profile = await db
      .select()
      .from(patientProfile)
      .where(eq(patientProfile.userId, u.id))
      .get()

    return c.json({
      id: updated!.id,
      firstName: updated!.firstName ?? "",
      lastName: updated!.lastName ?? "",
      email: updated!.email,
      dateOfBirth: profile?.dateOfBirth ?? "",
      avatarUrl: updated!.image,
      role: "patient" as const,
      status: updated!.status as "active",
      createdAt: updated!.createdAt.toISOString(),
    })
  })

  app.openapi(deleteMeRoute, async (c) => {
    const u = c.get("user")
    const db = createDb(c.env.DB)
    await db.delete(userTable).where(eq(userTable.id, u.id))
    return new Response(null, { status: 204 }) as never
  })
}

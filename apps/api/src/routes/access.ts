import { createRoute, z } from "@hono/zod-openapi"
import { eq, isNull, and } from "drizzle-orm"
import { createDb } from "../db"
import {
  accessGrant,
  accessLog,
  user as userTable,
  doctorProfile,
  doctorAffiliation,
  department,
  institution,
} from "../db/schema"
import { sessionMiddleware, requireRole } from "../middleware/session"
import {
  AccessGrantSchema,
  AccessLogEntrySchema,
  GrantTypeSchema,
  responses,
} from "../schemas"
import { raise } from "../lib/errors"
import type { AppRouter } from "../types"

const listGrantsRoute = createRoute({
  method: "get",
  path: "/patients/me/grants",
  tags: ["Access"],
  summary: "List active access grants",
  responses: {
    200: {
      content: { "application/json": { schema: z.array(AccessGrantSchema) } },
      description: "Active grants",
    },
    ...responses,
  },
})

const createGrantRoute = createRoute({
  method: "post",
  path: "/patients/me/grants",
  tags: ["Access"],
  summary: "Grant access to a doctor or department",
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: z.object({
            grantType: GrantTypeSchema,
            granteeId: z.string().min(1),
          }),
        },
      },
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: AccessGrantSchema } },
      description: "Grant created",
    },
    409: {
      content: {
        "application/json": {
          schema: z.object({ code: z.string(), message: z.string() }),
        },
      },
      description: "Already exists",
    },
    ...responses,
  },
})

const revokeGrantRoute = createRoute({
  method: "delete",
  path: "/patients/me/grants/{grantId}",
  tags: ["Access"],
  summary: "Revoke an access grant",
  request: { params: z.object({ grantId: z.string().uuid() }) },
  responses: {
    204: { description: "Grant revoked" },
    ...responses,
  },
})

const accessLogRoute = createRoute({
  method: "get",
  path: "/patients/me/access-log",
  tags: ["Access"],
  summary: "View who has accessed patient records",
  request: {
    query: z.object({
      limit: z.coerce.number().int().min(1).max(200).default(50),
      offset: z.coerce.number().int().min(0).default(0),
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": { schema: z.array(AccessLogEntrySchema) },
      },
      description: "Access log entries",
    },
    ...responses,
  },
})

type CreateDbReturn = ReturnType<typeof createDb>

async function buildGrantResponse(
  db: CreateDbReturn,
  grant: typeof accessGrant.$inferSelect
) {
  let granteeName = ""
  let institutionName = ""
  let registrationNumber: string | null = null

  if (grant.grantType === "individual") {
    const doctor = await db
      .select()
      .from(userTable)
      .where(eq(userTable.id, grant.granteeId))
      .get()
    granteeName = doctor
      ? `Dr. ${doctor.firstName ?? ""} ${doctor.lastName ?? ""}`.trim()
      : grant.granteeId

    const profile = await db
      .select({ registrationNumber: doctorProfile.registrationNumber })
      .from(doctorProfile)
      .where(eq(doctorProfile.userId, grant.granteeId))
      .get()
    registrationNumber = profile?.registrationNumber ?? null

    const aff = await db
      .select({
        institutionName: institution.name,
        practiceName: doctorAffiliation.practiceName,
      })
      .from(doctorAffiliation)
      .leftJoin(
        institution,
        eq(doctorAffiliation.institutionId, institution.id)
      )
      .where(eq(doctorAffiliation.doctorId, grant.granteeId))
      .orderBy(doctorAffiliation.createdAt)
      .limit(1)
      .get()
    institutionName = aff?.institutionName ?? aff?.practiceName ?? ""
  } else {
    const dept = await db
      .select({ deptName: department.name, instName: institution.name })
      .from(department)
      .innerJoin(institution, eq(department.institutionId, institution.id))
      .where(eq(department.id, grant.granteeId))
      .get()
    granteeName = dept?.deptName ?? grant.granteeId
    institutionName = dept?.instName ?? ""
  }

  return {
    id: grant.id,
    patientId: grant.patientId,
    grantType: grant.grantType as "individual" | "department",
    granteeId: grant.granteeId,
    granteeName,
    institutionName,
    registrationNumber,
    grantedAt: grant.grantedAt.toISOString(),
    revokedAt: grant.revokedAt?.toISOString() ?? null,
  }
}

export function registerAccessRoutes(app: AppRouter) {
  app.use("/patients/me/grants", sessionMiddleware)
  app.use("/patients/me/grants", requireRole("patient"))
  app.use("/patients/me/grants/*", sessionMiddleware)
  app.use("/patients/me/grants/*", requireRole("patient"))
  app.use("/patients/me/access-log", sessionMiddleware)
  app.use("/patients/me/access-log", requireRole("patient"))

  // GET /patients/me/grants
  app.openapi(listGrantsRoute, async (c) => {
    const u = c.get("user")
    const db = createDb(c.env.DB)
    const grants = await db
      .select()
      .from(accessGrant)
      .where(
        and(eq(accessGrant.patientId, u.id), isNull(accessGrant.revokedAt))
      )
    return c.json(
      await Promise.all(grants.map((g) => buildGrantResponse(db, g)))
    )
  })

  // POST /patients/me/grants
  app.openapi(createGrantRoute, async (c) => {
    const u = c.get("user")
    const { grantType, granteeId } = c.req.valid("json")
    const db = createDb(c.env.DB)

    const existing = await db
      .select({ id: accessGrant.id })
      .from(accessGrant)
      .where(
        and(
          eq(accessGrant.patientId, u.id),
          eq(accessGrant.granteeId, granteeId),
          eq(accessGrant.grantType, grantType),
          isNull(accessGrant.revokedAt)
        )
      )
      .get()

    if (existing) raise(409, "Grant already exists")

    const now = new Date()
    const newGrant = {
      id: crypto.randomUUID(),
      patientId: u.id,
      grantType,
      granteeId,
      grantedAt: now,
      revokedAt: null,
    }
    await db.insert(accessGrant).values(newGrant)
    return c.json(await buildGrantResponse(db, newGrant), 201)
  })

  // DELETE /patients/me/grants/{grantId}
  app.openapi(revokeGrantRoute, async (c) => {
    const u = c.get("user")
    const { grantId } = c.req.valid("param")
    const db = createDb(c.env.DB)

    const grant = await db
      .select()
      .from(accessGrant)
      .where(and(eq(accessGrant.id, grantId), eq(accessGrant.patientId, u.id)))
      .get()

    if (!grant) raise(404, "Grant not found")

    await db
      .update(accessGrant)
      .set({ revokedAt: new Date() })
      .where(eq(accessGrant.id, grantId))
    return new Response(null, { status: 204 }) as never
  })

  // GET /patients/me/access-log
  app.openapi(accessLogRoute, async (c) => {
    const u = c.get("user")
    const { limit, offset } = c.req.valid("query")
    const db = createDb(c.env.DB)

    const entries = await db
      .select({
        id: accessLog.id,
        doctorId: accessLog.doctorId,
        accessedAt: accessLog.accessedAt,
        doctorFirstName: userTable.firstName,
        doctorLastName: userTable.lastName,
      })
      .from(accessLog)
      .innerJoin(userTable, eq(accessLog.doctorId, userTable.id))
      .where(eq(accessLog.patientId, u.id))
      .orderBy(accessLog.accessedAt)

    const sliced = entries.slice(offset, offset + limit)

    const results = await Promise.all(
      sliced.map(async (e) => {
        const aff = await db
          .select({
            institutionName: institution.name,
            practiceName: doctorAffiliation.practiceName,
          })
          .from(doctorAffiliation)
          .leftJoin(
            institution,
            eq(doctorAffiliation.institutionId, institution.id)
          )
          .where(eq(doctorAffiliation.doctorId, e.doctorId))
          .orderBy(doctorAffiliation.createdAt)
          .limit(1)
          .get()
        return {
          id: e.id,
          doctorId: e.doctorId,
          doctorName:
            `Dr. ${e.doctorFirstName ?? ""} ${e.doctorLastName ?? ""}`.trim(),
          institutionName: aff?.institutionName ?? aff?.practiceName ?? "",
          accessedAt: e.accessedAt.toISOString(),
        }
      })
    )

    return c.json(results)
  })
}

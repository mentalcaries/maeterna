import { createRoute, z } from "@hono/zod-openapi"
import { eq, and, or, isNull, inArray, gte, desc } from "drizzle-orm"
import { createDb } from "../db"
import {
  user as userTable,
  doctorProfile,
  doctorAffiliation,
  institution,
  department,
  patientProfile,
  accessGrant,
  accessLog,
  reading,
  threshold,
} from "../db/schema"
import { sessionMiddleware, requireRole } from "../middleware/session"
import {
  DoctorSchema,
  PatientSchema,
  ReadingSchema,
  ThresholdsSchema,
  responses,
} from "../schemas"
import { computeSeverity, resolveThresholds } from "../lib/thresholds"
import { serializeReading } from "../lib/readings"
import { doctorHasAccess } from "../lib/access"
import { raise } from "../lib/errors"
import type { AppRouter } from "../types"
import type { DB } from "../db"

// ── Helpers ───────────────────────────────────────────────────────────────────

async function buildDoctorResponse(db: DB, userId: string) {
  const doctorUser = await db
    .select()
    .from(userTable)
    .where(eq(userTable.id, userId))
    .get()
  const profile = await db
    .select()
    .from(doctorProfile)
    .where(eq(doctorProfile.userId, userId))
    .get()
  const affs = await db
    .select({
      id: doctorAffiliation.id,
      institutionId: doctorAffiliation.institutionId,
      institutionName: institution.name,
      departmentId: doctorAffiliation.departmentId,
      departmentName: department.name,
    })
    .from(doctorAffiliation)
    .innerJoin(institution, eq(doctorAffiliation.institutionId, institution.id))
    .innerJoin(department, eq(doctorAffiliation.departmentId, department.id))
    .where(eq(doctorAffiliation.doctorId, userId))

  return {
    id: doctorUser!.id,
    firstName: doctorUser!.firstName ?? "",
    lastName: doctorUser!.lastName ?? "",
    email: doctorUser!.email,
    registrationNumber: profile?.registrationNumber ?? null,
    verified: profile?.verified ?? false,
    role: "doctor" as const,
    status: doctorUser!.status as
      | "active"
      | "suspended"
      | "pending_verification",
    affiliations: affs,
    createdAt: doctorUser!.createdAt.toISOString(),
  }
}

// ── Routes ────────────────────────────────────────────────────────────────────

const getMeRoute = createRoute({
  method: "get",
  path: "/doctors/me",
  tags: ["Doctors"],
  summary: "Get own doctor profile",
  responses: {
    200: {
      content: { "application/json": { schema: DoctorSchema } },
      description: "Doctor profile",
    },
    ...responses,
  },
})

const listPatientsRoute = createRoute({
  method: "get",
  path: "/doctors/me/patients",
  tags: ["Doctors"],
  summary: "List patients who have granted this doctor access",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.array(
            z.object({
              patient: PatientSchema,
              unreadAlertCount: z.number().int(),
              lastReadingAt: z.string().datetime().nullable(),
            })
          ),
        },
      },
      description: "Patient list with alert counts",
    },
    ...responses,
  },
})

const getPatientDetailRoute = createRoute({
  method: "get",
  path: "/doctors/me/patients/{patientId}",
  tags: ["Doctors"],
  summary: "Get a patient's full detail",
  request: {
    params: z.object({ patientId: z.string().min(1) }),
    query: z.object({ from: z.string().datetime().optional() }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            patient: PatientSchema,
            readings: z.array(ReadingSchema),
            thresholds: ThresholdsSchema,
          }),
        },
      },
      description: "Patient detail",
    },
    ...responses,
  },
})

const getThresholdsRoute = createRoute({
  method: "get",
  path: "/doctors/me/patients/{patientId}/thresholds",
  tags: ["Doctors"],
  summary: "Get thresholds for a patient",
  request: { params: z.object({ patientId: z.string().min(1) }) },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            thresholds: ThresholdsSchema,
            isCustom: z.boolean(),
          }),
        },
      },
      description: "Thresholds",
    },
    ...responses,
  },
})

const setThresholdsRoute = createRoute({
  method: "put",
  path: "/doctors/me/patients/{patientId}/thresholds",
  tags: ["Doctors"],
  summary: "Set custom alert thresholds for a patient",
  request: {
    params: z.object({ patientId: z.string().min(1) }),
    body: {
      required: true,
      content: { "application/json": { schema: ThresholdsSchema } },
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: ThresholdsSchema } },
      description: "Custom thresholds saved",
    },
    ...responses,
  },
})

const patchMeRoute = createRoute({
  method: "patch",
  path: "/doctors/me",
  tags: ["Doctors"],
  summary: "Update own doctor profile",
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: z.object({
            firstName: z.string().min(1).optional(),
            lastName: z.string().min(1).optional(),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: DoctorSchema } },
      description: "Updated doctor profile",
    },
    ...responses,
  },
})

export function registerDoctorRoutes(app: AppRouter) {
  app.use("/doctors/*", sessionMiddleware)
  app.use("/doctors/*", requireRole("doctor"))

  // GET /doctors/me
  app.openapi(getMeRoute, async (c) => {
    return c.json(
      await buildDoctorResponse(createDb(c.env.DB), c.get("user").id)
    )
  })

  // GET /doctors/me/patients
  app.openapi(listPatientsRoute, async (c) => {
    const doctor = c.get("user")
    const db = createDb(c.env.DB)

    const affiliations = await db
      .select({ departmentId: doctorAffiliation.departmentId })
      .from(doctorAffiliation)
      .where(eq(doctorAffiliation.doctorId, doctor.id))
    const deptIds = affiliations.map((a) => a.departmentId)

    const individualCond = and(
      eq(accessGrant.grantType, "individual"),
      eq(accessGrant.granteeId, doctor.id)
    )!
    const deptCond =
      deptIds.length > 0
        ? and(
            eq(accessGrant.grantType, "department"),
            inArray(accessGrant.granteeId, deptIds)
          )
        : null

    const grants = await db
      .select({ patientId: accessGrant.patientId })
      .from(accessGrant)
      .where(
        and(
          isNull(accessGrant.revokedAt),
          deptCond ? or(individualCond, deptCond) : individualCond
        )
      )

    const patientIds = [...new Set(grants.map((g) => g.patientId))]
    if (patientIds.length === 0) return c.json([])

    const patients = await db
      .select()
      .from(userTable)
      .where(inArray(userTable.id, patientIds))

    const results = await Promise.all(
      patients.map(async (p) => {
        const profile = await db
          .select()
          .from(patientProfile)
          .where(eq(patientProfile.userId, p.id))
          .get()

        const { thresholds } = await resolveThresholds(db, p.id)
        const patientReadings = await db
          .select({
            type: reading.type,
            context: reading.context,
            value1: reading.value1,
            value2: reading.value2,
          })
          .from(reading)
          .where(eq(reading.patientId, p.id))
        const unreadAlertCount = patientReadings.filter(
          (r) =>
            computeSeverity(
              r.type,
              r.context,
              r.value1,
              r.value2,
              thresholds
            ) === "high"
        ).length

        const lastReading = await db
          .select({ timestamp: reading.timestamp })
          .from(reading)
          .where(eq(reading.patientId, p.id))
          .orderBy(desc(reading.timestamp))
          .limit(1)
          .get()

        return {
          patient: {
            id: p.id,
            firstName: p.firstName ?? "",
            lastName: p.lastName ?? "",
            email: p.email,
            dateOfBirth: profile?.dateOfBirth ?? "",
            avatarUrl: p.image,
            role: "patient" as const,
            status: p.status as "active",
            createdAt: p.createdAt.toISOString(),
          },
          unreadAlertCount,
          lastReadingAt: lastReading?.timestamp?.toISOString() ?? null,
        }
      })
    )

    return c.json(results)
  })

  // GET /doctors/me/patients/{patientId}
  app.openapi(getPatientDetailRoute, async (c) => {
    const doctor = c.get("user")
    const { patientId } = c.req.valid("param")
    const { from } = c.req.valid("query")
    const db = createDb(c.env.DB)

    if (!(await doctorHasAccess(db, doctor.id, patientId)))
      raise(403, "No active access grant for this patient")

    const patientUser = await db
      .select()
      .from(userTable)
      .where(eq(userTable.id, patientId))
      .get()
    if (!patientUser || patientUser.role !== "patient")
      raise(404, "Patient not found")

    await db.insert(accessLog).values({
      id: crypto.randomUUID(),
      patientId,
      doctorId: doctor.id,
      accessedAt: new Date(),
    })

    const profile = await db
      .select()
      .from(patientProfile)
      .where(eq(patientProfile.userId, patientId))
      .get()

    const conditions = [eq(reading.patientId, patientId)]
    if (from) conditions.push(gte(reading.timestamp, new Date(from)))

    const [readings, { thresholds }] = await Promise.all([
      db
        .select()
        .from(reading)
        .where(and(...conditions))
        .orderBy(desc(reading.timestamp)),
      resolveThresholds(db, patientId),
    ])

    return c.json({
      patient: {
        id: patientUser.id,
        firstName: patientUser.firstName ?? "",
        lastName: patientUser.lastName ?? "",
        email: patientUser.email,
        dateOfBirth: profile?.dateOfBirth ?? "",
        avatarUrl: patientUser.image,
        role: "patient" as const,
        status: patientUser.status as "active",
        createdAt: patientUser.createdAt.toISOString(),
      },
      readings: readings.map((r) => serializeReading(r, thresholds)),
      thresholds,
    })
  })

  // GET /doctors/me/patients/{patientId}/thresholds
  app.openapi(getThresholdsRoute, async (c) => {
    const doctor = c.get("user")
    const { patientId } = c.req.valid("param")
    const db = createDb(c.env.DB)

    if (!(await doctorHasAccess(db, doctor.id, patientId)))
      raise(403, "No active access grant for this patient")

    const { thresholds, isCustom } = await resolveThresholds(db, patientId)
    return c.json({ thresholds, isCustom })
  })

  // PATCH /doctors/me
  app.openapi(patchMeRoute, async (c) => {
    const { firstName, lastName } = c.req.valid("json")
    const db = createDb(c.env.DB)
    await db
      .update(userTable)
      .set({
        ...(firstName !== undefined && { firstName }),
        ...(lastName !== undefined && { lastName }),
      })
      .where(eq(userTable.id, c.get("user").id))
    return c.json(await buildDoctorResponse(db, c.get("user").id))
  })

  // PUT /doctors/me/patients/{patientId}/thresholds
  app.openapi(setThresholdsRoute, async (c) => {
    const doctor = c.get("user")
    const { patientId } = c.req.valid("param")
    const body = c.req.valid("json")
    const db = createDb(c.env.DB)

    if (!(await doctorHasAccess(db, doctor.id, patientId)))
      raise(403, "No active access grant for this patient")

    const now = new Date()
    await db
      .insert(threshold)
      .values({
        id: crypto.randomUUID(),
        patientId,
        doctorId: doctor.id,
        ...body,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [threshold.patientId],
        set: { ...body, doctorId: doctor.id, updatedAt: now },
      })

    return c.json(body)
  })
}

import { createRoute, z } from "@hono/zod-openapi"
import { eq, and, or, isNull, inArray, desc, count } from "drizzle-orm"
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
import { DEFAULT_THRESHOLDS } from "../lib/thresholds"
import { raise } from "../lib/errors"
import type { AppRouter } from "../types"
import type { DB } from "../db"

// ── Helpers ───────────────────────────────────────────────────────────────────

async function doctorHasAccess(
  db: DB,
  doctorId: string,
  patientId: string
): Promise<boolean> {
  const affiliations = await db
    .select({ departmentId: doctorAffiliation.departmentId })
    .from(doctorAffiliation)
    .where(eq(doctorAffiliation.doctorId, doctorId))

  const deptIds = affiliations.map((a) => a.departmentId)
  const individualCond = and(
    eq(accessGrant.grantType, "individual"),
    eq(accessGrant.granteeId, doctorId)
  )!
  const deptCond =
    deptIds.length > 0
      ? and(
          eq(accessGrant.grantType, "department"),
          inArray(accessGrant.granteeId, deptIds)
        )
      : null

  const grants = await db
    .select({ id: accessGrant.id })
    .from(accessGrant)
    .where(
      and(
        eq(accessGrant.patientId, patientId),
        isNull(accessGrant.revokedAt),
        deptCond ? or(individualCond, deptCond) : individualCond
      )
    )
    .limit(1)

  return grants.length > 0
}

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
    registrationNumber: profile?.registrationNumber ?? "",
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

function serializeReading(r: typeof reading.$inferSelect) {
  return {
    id: r.id,
    patientId: r.patientId,
    loggedById: r.loggedById,
    type: r.type as "glucose" | "blood_pressure",
    value1: r.value1,
    value2: r.value2 ?? null,
    unit: r.unit,
    context: r.context,
    notes: r.notes ?? null,
    timestamp: r.timestamp.toISOString(),
    severity: r.severity as "normal" | "warning" | "critical",
    createdAt: r.createdAt.toISOString(),
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
  request: { params: z.object({ patientId: z.string().uuid() }) },
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
  request: { params: z.object({ patientId: z.string().uuid() }) },
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
    params: z.object({ patientId: z.string().uuid() }),
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

        const alertResult = await db
          .select({ count: count() })
          .from(reading)
          .where(
            and(
              eq(reading.patientId, p.id),
              or(
                eq(reading.severity, "warning"),
                eq(reading.severity, "critical")
              )
            )
          )
          .get()

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
          unreadAlertCount: alertResult?.count ?? 0,
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
    const readings = await db
      .select()
      .from(reading)
      .where(eq(reading.patientId, patientId))
      .orderBy(desc(reading.timestamp))

    const custom = await db
      .select()
      .from(threshold)
      .where(
        and(
          eq(threshold.patientId, patientId),
          eq(threshold.doctorId, doctor.id)
        )
      )
      .get()

    const thresholds = custom
      ? {
          fastingGlucoseWarning: custom.fastingGlucoseWarning,
          fastingGlucoseCritical: custom.fastingGlucoseCritical,
          postMealGlucoseWarning: custom.postMealGlucoseWarning,
          postMealGlucoseCritical: custom.postMealGlucoseCritical,
          systolicWarning: custom.systolicWarning,
          systolicCritical: custom.systolicCritical,
          diastolicWarning: custom.diastolicWarning,
          diastolicCritical: custom.diastolicCritical,
        }
      : { ...DEFAULT_THRESHOLDS }

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
      readings: readings.map(serializeReading),
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

    const custom = await db
      .select()
      .from(threshold)
      .where(
        and(
          eq(threshold.patientId, patientId),
          eq(threshold.doctorId, doctor.id)
        )
      )
      .get()

    if (custom) {
      return c.json({
        thresholds: {
          fastingGlucoseWarning: custom.fastingGlucoseWarning,
          fastingGlucoseCritical: custom.fastingGlucoseCritical,
          postMealGlucoseWarning: custom.postMealGlucoseWarning,
          postMealGlucoseCritical: custom.postMealGlucoseCritical,
          systolicWarning: custom.systolicWarning,
          systolicCritical: custom.systolicCritical,
          diastolicWarning: custom.diastolicWarning,
          diastolicCritical: custom.diastolicCritical,
        },
        isCustom: true,
      })
    }

    return c.json({ thresholds: { ...DEFAULT_THRESHOLDS }, isCustom: false })
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
        target: [threshold.patientId, threshold.doctorId],
        set: { ...body, updatedAt: now },
      })

    return c.json(body)
  })
}

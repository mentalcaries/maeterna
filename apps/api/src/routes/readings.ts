import { createRoute, z } from "@hono/zod-openapi"
import { eq, and, or, isNull, inArray, desc } from "drizzle-orm"
import { createDb } from "../db"
import { reading, accessGrant, doctorAffiliation } from "../db/schema"
import { sessionMiddleware, requireRole } from "../middleware/session"
import { ReadingSchema, ReadingTypeSchema, responses } from "../schemas"
import { computeSeverity, DEFAULT_THRESHOLDS } from "../lib/thresholds"
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

const readingBodySchema = z.object({
  type: ReadingTypeSchema,
  value1: z.number(),
  value2: z.number().nullable().optional(),
  context: z.string(),
  notes: z.string().nullable().optional(),
  timestamp: z.string().datetime(),
})

const listOwnReadingsRoute = createRoute({
  method: "get",
  path: "/patients/me/readings",
  tags: ["Readings"],
  summary: "Get own reading history",
  request: {
    query: z.object({
      type: ReadingTypeSchema.optional(),
      limit: z.coerce.number().int().min(1).max(200).default(50),
      offset: z.coerce.number().int().min(0).default(0),
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({ data: z.array(ReadingSchema), total: z.number() }),
        },
      },
      description: "List of readings, newest first",
    },
    ...responses,
  },
})

const logOwnReadingRoute = createRoute({
  method: "post",
  path: "/patients/me/readings",
  tags: ["Readings"],
  summary: "Log a new reading (patient)",
  request: {
    body: {
      required: true,
      content: { "application/json": { schema: readingBodySchema } },
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: ReadingSchema } },
      description: "Reading created",
    },
    ...responses,
  },
})

const logReadingForPatientRoute = createRoute({
  method: "post",
  path: "/patients/{patientId}/readings",
  tags: ["Readings"],
  summary: "Log a reading on behalf of a patient (doctor)",
  request: {
    params: z.object({ patientId: z.string().uuid() }),
    body: {
      required: true,
      content: { "application/json": { schema: readingBodySchema } },
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: ReadingSchema } },
      description: "Reading created",
    },
    ...responses,
  },
})

const addNoteRoute = createRoute({
  method: "patch",
  path: "/readings/{readingId}/notes",
  tags: ["Readings"],
  summary: "Add or edit a note on a reading (doctor)",
  request: {
    params: z.object({ readingId: z.string().uuid() }),
    body: {
      required: true,
      content: {
        "application/json": { schema: z.object({ notes: z.string() }) },
      },
    },
  },
  responses: {
    200: {
      content: { "application/json": { schema: ReadingSchema } },
      description: "Reading with updated note",
    },
    ...responses,
  },
})

export function registerReadingRoutes(app: AppRouter) {
  app.use("/patients/me/readings", sessionMiddleware)
  app.use("/patients/me/readings", requireRole("patient"))
  app.use("/patients/:patientId/readings", sessionMiddleware)
  app.use("/patients/:patientId/readings", requireRole("doctor"))
  app.use("/readings/:readingId/notes", sessionMiddleware)
  app.use("/readings/:readingId/notes", requireRole("doctor"))

  // GET /patients/me/readings
  app.openapi(listOwnReadingsRoute, async (c) => {
    const u = c.get("user")
    const { type, limit, offset } = c.req.valid("query")
    const db = createDb(c.env.DB)

    const allReadings = await db
      .select()
      .from(reading)
      .where(
        type
          ? and(eq(reading.patientId, u.id), eq(reading.type, type))
          : eq(reading.patientId, u.id)
      )
      .orderBy(desc(reading.timestamp))

    return c.json({
      data: allReadings.slice(offset, offset + limit).map(serializeReading),
      total: allReadings.length,
    })
  })

  // POST /patients/me/readings
  app.openapi(logOwnReadingRoute, async (c) => {
    const u = c.get("user")
    const body = c.req.valid("json")
    const db = createDb(c.env.DB)

    if (body.type === "blood_pressure" && body.value2 == null)
      raise(422, "value2 (diastolic) is required for blood_pressure readings")

    const severity = computeSeverity(
      body.type,
      body.context,
      body.value1,
      body.value2,
      DEFAULT_THRESHOLDS
    )
    const unit = body.type === "glucose" ? "mmol/L" : "mmHg"
    const now = new Date()

    const newReading = {
      id: crypto.randomUUID(),
      patientId: u.id,
      loggedById: u.id,
      type: body.type,
      value1: body.value1,
      value2: body.value2 ?? null,
      unit,
      context: body.context,
      notes: body.notes ?? null,
      timestamp: new Date(body.timestamp),
      severity,
      createdAt: now,
    }

    await db.insert(reading).values(newReading)
    return c.json(serializeReading(newReading), 201)
  })

  // POST /patients/{patientId}/readings (doctor)
  app.openapi(logReadingForPatientRoute, async (c) => {
    const doctor = c.get("user")
    const { patientId } = c.req.valid("param")
    const body = c.req.valid("json")
    const db = createDb(c.env.DB)

    if (!(await doctorHasAccess(db, doctor.id, patientId)))
      raise(403, "No active access grant for this patient")
    if (body.type === "blood_pressure" && body.value2 == null)
      raise(422, "value2 (diastolic) is required for blood_pressure readings")

    const severity = computeSeverity(
      body.type,
      body.context,
      body.value1,
      body.value2,
      DEFAULT_THRESHOLDS
    )
    const unit = body.type === "glucose" ? "mmol/L" : "mmHg"

    const newReading = {
      id: crypto.randomUUID(),
      patientId,
      loggedById: doctor.id,
      type: body.type,
      value1: body.value1,
      value2: body.value2 ?? null,
      unit,
      context: body.context,
      notes: body.notes ?? null,
      timestamp: new Date(body.timestamp),
      severity,
      createdAt: new Date(),
    }

    await db.insert(reading).values(newReading)
    return c.json(serializeReading(newReading), 201)
  })

  // PATCH /readings/{readingId}/notes (doctor)
  app.openapi(addNoteRoute, async (c) => {
    const doctor = c.get("user")
    const { readingId } = c.req.valid("param")
    const { notes } = c.req.valid("json")
    const db = createDb(c.env.DB)

    const existing = await db
      .select()
      .from(reading)
      .where(eq(reading.id, readingId))
      .get()
    if (!existing) raise(404, "Reading not found")
    if (!(await doctorHasAccess(db, doctor.id, existing.patientId)))
      raise(403, "No active access grant for this patient")

    const updated = await db
      .update(reading)
      .set({ notes })
      .where(eq(reading.id, readingId))
      .returning()
    return c.json(serializeReading(updated[0]))
  })
}

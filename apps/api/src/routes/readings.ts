import { createRoute, z } from "@hono/zod-openapi"
import { eq, and, gte, desc } from "drizzle-orm"
import { createDb } from "../db"
import { reading } from "../db/schema"
import { sessionMiddleware, requireRole } from "../middleware/session"
import { ReadingSchema, ReadingTypeSchema, responses } from "../schemas"
import { resolveThresholds } from "../lib/thresholds"
import { serializeReading } from "../lib/readings"
import { doctorHasAccess } from "../lib/access"
import { raise } from "../lib/errors"
import type { AppRouter } from "../types"

// ── Helpers ───────────────────────────────────────────────────────────────────

const MMOL_TO_MGDL = 18.0182

function toMgDl(value: number, unit: string): number {
  return unit === "mmol/L" ? Math.round(value * MMOL_TO_MGDL * 10) / 10 : value
}

// ── Routes ────────────────────────────────────────────────────────────────────

const glucoseBodySchema = z.object({
  type: z.literal("glucose"),
  value1: z.number(),
  unit: z.enum(["mg/dL", "mmol/L"]),
  context: z.enum(["fasted", "post_meal"]),
  notes: z.string().nullable().optional(),
  timestamp: z.string().datetime(),
})

const bpBodySchema = z.object({
  type: z.literal("blood_pressure"),
  value1: z.number(),
  value2: z.number(),
  unit: z.literal("mmHg"),
  context: z.enum(["morning", "evening"]),
  notes: z.string().nullable().optional(),
  timestamp: z.string().datetime(),
})

const readingBodySchema = z.discriminatedUnion("type", [
  glucoseBodySchema,
  bpBodySchema,
])

const listOwnReadingsRoute = createRoute({
  method: "get",
  path: "/patients/me/readings",
  tags: ["Readings"],
  summary: "Get own reading history",
  request: {
    query: z.object({
      type: ReadingTypeSchema.optional(),
      from: z.string().datetime().optional(),
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
    params: z.object({ patientId: z.string().min(1) }),
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
  // Note: /patients/:patientId/readings intentionally has no requireRole middleware
  // here because the :patientId pattern also matches /patients/me/readings, which
  // would incorrectly block patients. The doctor role check is done inline below.
  app.use("/patients/:patientId/readings", sessionMiddleware)
  app.use("/readings/:readingId/notes", sessionMiddleware)
  app.use("/readings/:readingId/notes", requireRole("doctor"))

  // GET /patients/me/readings
  app.openapi(listOwnReadingsRoute, async (c) => {
    const u = c.get("user")
    const { type, from, limit, offset } = c.req.valid("query")
    const db = createDb(c.env.DB)

    const conditions = [eq(reading.patientId, u.id)]
    if (type) conditions.push(eq(reading.type, type))
    if (from) conditions.push(gte(reading.timestamp, new Date(from)))

    const [allReadings, { thresholds }] = await Promise.all([
      db
        .select()
        .from(reading)
        .where(and(...conditions))
        .orderBy(desc(reading.timestamp)),
      resolveThresholds(db, u.id),
    ])

    return c.json({
      data: allReadings
        .slice(offset, offset + limit)
        .map((r) => serializeReading(r, thresholds)),
      total: allReadings.length,
    })
  })

  // POST /patients/me/readings
  app.openapi(logOwnReadingRoute, async (c) => {
    const u = c.get("user")
    const body = c.req.valid("json")
    const db = createDb(c.env.DB)

    const value1 =
      body.type === "glucose" ? toMgDl(body.value1, body.unit) : body.value1
    const unit = body.type === "glucose" ? "mg/dL" : "mmHg"
    const now = new Date()

    const newReading = {
      id: crypto.randomUUID(),
      patientId: u.id,
      loggedById: u.id,
      type: body.type,
      value1,
      value2: body.type === "blood_pressure" ? body.value2 : null,
      unit,
      context: body.context,
      notes: body.notes ?? null,
      timestamp: new Date(body.timestamp),
      createdAt: now,
    }

    const { thresholds } = await resolveThresholds(db, u.id)
    await db.insert(reading).values(newReading)
    return c.json(serializeReading(newReading, thresholds), 201)
  })

  // POST /patients/{patientId}/readings (doctor)
  app.openapi(logReadingForPatientRoute, async (c) => {
    const doctor = c.get("user")
    if (!doctor || doctor.role !== "doctor")
      raise(403, "Only doctors can log readings for patients")
    const { patientId } = c.req.valid("param")
    const body = c.req.valid("json")
    const db = createDb(c.env.DB)

    if (!(await doctorHasAccess(db, doctor.id, patientId)))
      raise(403, "No active access grant for this patient")

    const value1 =
      body.type === "glucose" ? toMgDl(body.value1, body.unit) : body.value1
    const unit = body.type === "glucose" ? "mg/dL" : "mmHg"

    const newReading = {
      id: crypto.randomUUID(),
      patientId,
      loggedById: doctor.id,
      type: body.type,
      value1,
      value2: body.type === "blood_pressure" ? body.value2 : null,
      unit,
      context: body.context,
      notes: body.notes ?? null,
      timestamp: new Date(body.timestamp),
      createdAt: new Date(),
    }

    const { thresholds } = await resolveThresholds(db, patientId)
    await db.insert(reading).values(newReading)
    return c.json(serializeReading(newReading, thresholds), 201)
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

    const [updated, { thresholds }] = await Promise.all([
      db
        .update(reading)
        .set({ notes })
        .where(eq(reading.id, readingId))
        .returning(),
      resolveThresholds(db, existing.patientId),
    ])
    return c.json(serializeReading(updated[0], thresholds))
  })
}

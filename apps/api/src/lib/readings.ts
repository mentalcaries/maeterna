import { computeSeverity, type Thresholds } from "./thresholds"
import type { reading } from "../db/schema"

const MMOL_TO_MGDL = 18.0182

type ReadingWriteValues =
  | {
      type: "glucose"
      value1: number
      unit: "mg/dL" | "mmol/L"
    }
  | {
      type: "blood_pressure"
      value1: number
      value2: number
      unit: "mmHg"
    }

export function canonicalReadingValues(body: ReadingWriteValues) {
  if (body.type === "glucose") {
    return {
      value1:
        body.unit === "mmol/L"
          ? Math.round(body.value1 * MMOL_TO_MGDL * 10) / 10
          : body.value1,
      value2: null,
      unit: "mg/dL" as const,
    }
  }

  return {
    value1: body.value1,
    value2: body.value2,
    unit: "mmHg" as const,
  }
}

export function serializeReading(
  r: typeof reading.$inferSelect,
  thresholds: Thresholds
) {
  return {
    id: r.id,
    patientId: r.patientId,
    loggedById: r.loggedById,
    type: r.type as "glucose" | "blood_pressure",
    value1: r.value1,
    value2: r.value2 ?? null,
    unit: r.unit,
    context: r.context as "fasted" | "post_meal" | "morning" | "evening",
    notes: r.notes ?? null,
    timestamp: r.timestamp.toISOString(),
    severity: computeSeverity(
      r.type as "glucose" | "blood_pressure",
      r.context,
      r.value1,
      r.value2,
      thresholds
    ),
    createdAt: r.createdAt.toISOString(),
  }
}

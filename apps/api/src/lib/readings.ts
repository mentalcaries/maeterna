import { computeSeverity, type Thresholds } from "./thresholds"
import type { reading } from "../db/schema"

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

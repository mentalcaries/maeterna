import type { components } from "@/lib/api.types"
import type { Reading } from "@/mock/db"

export function adaptReading(r: components["schemas"]["Reading"]): Reading {
  return {
    id: r.id,
    patientId: r.patientId,
    loggedById: r.loggedById,
    type: r.type,
    value1: r.value1,
    value2: r.value2 ?? undefined,
    unit: r.unit,
    context: r.context as import("@/mock/db").ReadingContext,
    notes: r.notes ?? undefined,
    timestamp: r.timestamp,
    severity: r.severity,
  }
}

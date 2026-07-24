import type { components } from "@/lib/api.types"
import { formatGlucose, type GlucoseUnit } from "@/lib/glucose"
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

const MEAL_LABELS: Record<string, string> = {
  fasted: "Fasted",
  post_meal: "After eating",
}
const TIME_LABELS: Record<string, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
  before_bed: "Night",
  at_clinic: "At clinic",
}
const CONTEXT_LABELS: Record<string, string> = {
  fasted: "Fasted",
  post_meal: "After eating",
  morning: "Morning",
  evening: "Evening",
}

export function readingContext(r: {
  context: string
  mealContext?: string
  timeOfDay?: string
}): string {
  const parts: string[] = []
  if (r.mealContext) parts.push(MEAL_LABELS[r.mealContext] ?? r.mealContext)
  if (r.timeOfDay) parts.push(TIME_LABELS[r.timeOfDay] ?? r.timeOfDay)
  if (parts.length === 0) parts.push(CONTEXT_LABELS[r.context] ?? r.context)
  return parts.join(" · ")
}

export function formatReadingValue(
  reading: {
    type: "glucose" | "blood_pressure"
    value1: number
    value2?: number | null
  },
  glucoseUnit: GlucoseUnit = "mg/dL"
): string {
  if (reading.type === "blood_pressure") {
    return `${reading.value1}/${reading.value2 ?? "?"} mmHg`
  }
  return formatGlucose(reading.value1, glucoseUnit)
}

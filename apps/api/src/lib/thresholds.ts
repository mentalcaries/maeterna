import { eq } from "drizzle-orm"
import type { DB } from "../db"
import { threshold } from "../db/schema"

export type Thresholds = {
  fastingGlucoseHigh: number
  postMealGlucoseHigh: number
  systolicHigh: number
  diastolicHigh: number
}

export const DEFAULT_THRESHOLDS: Thresholds = {
  fastingGlucoseHigh: 95,
  postMealGlucoseHigh: 140,
  systolicHigh: 140,
  diastolicHigh: 90,
}

export function computeSeverity(
  type: "glucose" | "blood_pressure",
  context: string,
  value1: number,
  value2: number | null | undefined,
  t: Thresholds = DEFAULT_THRESHOLDS
): "normal" | "high" {
  if (type === "glucose") {
    if (context === "post_meal")
      return value1 > t.postMealGlucoseHigh ? "high" : "normal"
    return value1 >= t.fastingGlucoseHigh ? "high" : "normal"
  }
  // blood_pressure — either value breaching triggers high
  const systolic = value1
  const diastolic = value2 ?? 0
  return systolic >= t.systolicHigh || diastolic >= t.diastolicHigh
    ? "high"
    : "normal"
}

export async function resolveThresholds(
  db: DB,
  patientId: string
): Promise<{ thresholds: Thresholds; isCustom: boolean }> {
  const row = await db
    .select()
    .from(threshold)
    .where(eq(threshold.patientId, patientId))
    .get()

  if (!row) return { thresholds: { ...DEFAULT_THRESHOLDS }, isCustom: false }

  return {
    thresholds: {
      fastingGlucoseHigh: row.fastingGlucoseHigh,
      postMealGlucoseHigh: row.postMealGlucoseHigh,
      systolicHigh: row.systolicHigh,
      diastolicHigh: row.diastolicHigh,
    },
    isCustom: true,
  }
}

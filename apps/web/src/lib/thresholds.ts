export type SeverityType = "normal" | "high"

export interface Thresholds {
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

export function getEffectiveThresholds(
  patientOverrides?: Partial<Thresholds>
): Thresholds {
  return { ...DEFAULT_THRESHOLDS, ...patientOverrides }
}

export function computeSeverity(
  type: "glucose" | "blood_pressure",
  context: string,
  value1: number,
  value2: number | null | undefined,
  thresholds: Thresholds = DEFAULT_THRESHOLDS
): SeverityType {
  if (type === "glucose") {
    if (context === "post_meal")
      return value1 > thresholds.postMealGlucoseHigh ? "high" : "normal"
    return value1 >= thresholds.fastingGlucoseHigh ? "high" : "normal"
  }

  const systolic = value1
  const diastolic = value2 ?? 0
  return systolic >= thresholds.systolicHigh ||
    diastolic >= thresholds.diastolicHigh
    ? "high"
    : "normal"
}

// Canonical severity color pair — reused by ReadingList dots and both charts.
export const SEVERITY_COLORS: Record<SeverityType, string> = {
  normal: "#22c55e",
  high: "#ef4444",
}

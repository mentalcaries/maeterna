export const DEFAULT_THRESHOLDS = {
  fastingGlucoseWarning: 5.3,
  fastingGlucoseCritical: 7.0,
  postMealGlucoseWarning: 7.8,
  postMealGlucoseCritical: 11.1,
  systolicWarning: 140,
  systolicCritical: 160,
  diastolicWarning: 90,
  diastolicCritical: 110,
} as const

export type Thresholds = typeof DEFAULT_THRESHOLDS

export function computeSeverity(
  type: "glucose" | "blood_pressure",
  context: string,
  value1: number,
  value2: number | null | undefined,
  t: Thresholds = DEFAULT_THRESHOLDS
): "normal" | "warning" | "critical" {
  if (type === "glucose") {
    const isPostMeal = context === "post_meal"
    const warn = isPostMeal ? t.postMealGlucoseWarning : t.fastingGlucoseWarning
    const crit = isPostMeal
      ? t.postMealGlucoseCritical
      : t.fastingGlucoseCritical
    if (value1 >= crit) return "critical"
    if (value1 >= warn) return "warning"
    return "normal"
  }
  // blood_pressure — either value breaching triggers the higher severity
  const systolic = value1
  const diastolic = value2 ?? 0
  if (systolic >= t.systolicCritical || diastolic >= t.diastolicCritical)
    return "critical"
  if (systolic >= t.systolicWarning || diastolic >= t.diastolicWarning)
    return "warning"
  return "normal"
}

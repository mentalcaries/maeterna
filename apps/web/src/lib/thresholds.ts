export type AlertSeverity = "warning" | "critical"

export interface Thresholds {
  fasting_glucose_warning: number
  fasting_glucose_critical: number
  postmeal_glucose_warning: number
  postmeal_glucose_critical: number
  systolic_warning: number
  systolic_critical: number
  diastolic_warning: number
  diastolic_critical: number
}

export const DEFAULT_THRESHOLDS: Thresholds = {
  fasting_glucose_warning: 95,
  fasting_glucose_critical: 126,
  postmeal_glucose_warning: 140,
  postmeal_glucose_critical: 200,
  systolic_warning: 140,
  systolic_critical: 160,
  diastolic_warning: 90,
  diastolic_critical: 110,
}

export function getEffectiveThresholds(
  patientOverrides?: Partial<Thresholds>
): Thresholds {
  return { ...DEFAULT_THRESHOLDS, ...patientOverrides }
}

export function computeSeverity(
  type: "glucose" | "blood_pressure",
  value1: number,
  value2: number | undefined,
  context: "fasting" | "post_meal" | "morning" | "before_bed",
  thresholds: Thresholds
): AlertSeverity | undefined {
  if (type === "glucose") {
    const isFasting = context === "fasting" || context === "morning"
    const warningLimit = isFasting
      ? thresholds.fasting_glucose_warning
      : thresholds.postmeal_glucose_warning
    const criticalLimit = isFasting
      ? thresholds.fasting_glucose_critical
      : thresholds.postmeal_glucose_critical

    if (value1 > criticalLimit) return "critical"
    if (value1 > warningLimit) return "warning"
    return undefined
  }

  if (type === "blood_pressure") {
    const systolicCritical = value1 > thresholds.systolic_critical
    const systolicWarning = value1 > thresholds.systolic_warning
    const diastolicCritical =
      value2 !== undefined && value2 > thresholds.diastolic_critical
    const diastolicWarning =
      value2 !== undefined && value2 > thresholds.diastolic_warning

    if (systolicCritical || diastolicCritical) return "critical"
    if (systolicWarning || diastolicWarning) return "warning"
    return undefined
  }

  return undefined
}

export const MMOL_TO_MGDL = 18.0182

export type GlucoseUnit = "mg/dL" | "mmol/L"

export function mgdlToMmol(mgdl: number): number {
  return Math.round((mgdl / MMOL_TO_MGDL) * 10) / 10
}

export function mmolToMgdl(mmol: number): number {
  return Math.round(mmol * MMOL_TO_MGDL * 10) / 10
}

export function formatGlucose(mgdl: number, unit: GlucoseUnit): string {
  if (unit === "mmol/L") return `${mgdlToMmol(mgdl)} mmol/L`
  return `${mgdl} mg/dL`
}

export function isSuspiciousGlucoseValue(
  value: number,
  unit: GlucoseUnit
): boolean {
  if (unit === "mmol/L" && value > 35) return true
  if (unit === "mg/dL" && value < 20 && value > 0) return true
  return false
}

export function oppositeGlucoseUnit(unit: GlucoseUnit): GlucoseUnit {
  return unit === "mg/dL" ? "mmol/L" : "mg/dL"
}

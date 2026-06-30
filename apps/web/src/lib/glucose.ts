export const MMOL_TO_MGDL = 18.0182

export function mgdlToMmol(mgdl: number): number {
  return Math.round((mgdl / MMOL_TO_MGDL) * 10) / 10
}

export function mmolToMgdl(mmol: number): number {
  return Math.round(mmol * MMOL_TO_MGDL * 10) / 10
}

export function formatGlucose(mgdl: number, unit: "mg/dL" | "mmol/L"): string {
  if (unit === "mmol/L") return `${mgdlToMmol(mgdl)} mmol/L`
  return `${mgdl} mg/dL`
}

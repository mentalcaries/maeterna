import * as XLSX from "xlsx"
import type { Reading } from "@/mock/db"
import { toLocalDateStr, toLocalTimeStr } from "@/lib/reading-history"
import { readingContext } from "@/lib/readings"

export function exportReadingsToExcel(
  readings: Reading[],
  patientName: string,
  displayUnit: "mg/dL" | "mmol/L"
) {
  const rows = readings.map((r) => {
    const d = new Date(r.timestamp)
    return {
      Date: toLocalDateStr(d),
      Time: toLocalTimeStr(d),
      Type: r.type === "blood_pressure" ? "Blood Pressure" : "Glucose",
      Value:
        r.type === "blood_pressure"
          ? `${r.value1}/${r.value2 ?? "?"}`
          : String(r.value1),
      Unit: r.type === "blood_pressure" ? "mmHg" : displayUnit,
      Context: readingContext(r),
      Notes: r.notes ?? "",
      Status: r.severity === "high" ? "High" : "Normal",
    }
  })
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "Readings")
  XLSX.writeFile(wb, `${patientName.replace(/\s+/g, "_")}_readings.xlsx`)
}

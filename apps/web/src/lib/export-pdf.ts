import { jsPDF } from "jspdf"
import type { Reading } from "@/mock/db"
import { toLocalDateStr, toLocalTimeStr } from "@/lib/reading-history"
import { readingContext } from "@/lib/readings"

export function exportReadingsToPDF(
  readings: Reading[],
  patientName: string,
  displayUnit: "mg/dL" | "mmol/L"
) {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  })

  doc.setFontSize(12)
  doc.setFont("helvetica", "bold")
  doc.text(`${patientName} — Reading History`, 14, 12)
  doc.setFontSize(8)
  doc.setFont("helvetica", "normal")
  doc.text(`Exported ${new Date().toLocaleDateString("en-TT")}`, 14, 18)

  const headers = [
    "Date",
    "Time",
    "Type",
    "Value",
    "Unit",
    "Context",
    "Notes",
    "Status",
  ]
  const colW = [24, 15, 30, 22, 14, 36, 82, 18]
  const totalW = colW.reduce((a, b) => a + b, 0)
  const startX = 14
  const rowH = 6.5
  const pageH = 200

  function drawHeader(yPos: number) {
    doc.setFillColor(243, 244, 246)
    doc.rect(startX, yPos, totalW, rowH, "F")
    doc.setFontSize(7)
    doc.setFont("helvetica", "bold")
    let x = startX
    headers.forEach((h, i) => {
      doc.text(h, x + 1.5, yPos + 4.5)
      x += colW[i]!
    })
  }

  function fitText(text: string, maxW: number): string {
    if (doc.getTextWidth(text) <= maxW) return text
    let t = text
    while (t.length > 0 && doc.getTextWidth(t + "…") > maxW) {
      t = t.slice(0, -1)
    }
    return t + "…"
  }

  let y = 24
  drawHeader(y)
  y += rowH

  readings.forEach((r, ri) => {
    if (y + rowH > pageH) {
      doc.addPage()
      y = 14
      drawHeader(y)
      y += rowH
    }

    if (ri % 2 === 0) {
      doc.setFillColor(249, 250, 251)
      doc.rect(startX, y, totalW, rowH, "F")
    }

    const d = new Date(r.timestamp)
    const cells = [
      toLocalDateStr(d),
      toLocalTimeStr(d),
      r.type === "blood_pressure" ? "Blood Pressure" : "Glucose",
      r.type === "blood_pressure"
        ? `${r.value1}/${r.value2 ?? "?"}`
        : String(r.value1),
      r.type === "blood_pressure" ? "mmHg" : displayUnit,
      readingContext(r),
      r.notes ?? "",
      r.severity === "high" ? "High" : "Normal",
    ]

    doc.setFontSize(7)
    doc.setFont("helvetica", "normal")
    let x = startX
    cells.forEach((cell, ci) => {
      const maxW = colW[ci]! - 3
      doc.text(fitText(cell, maxW), x + 1.5, y + 4.5)
      x += colW[ci]!
    })

    y += rowH
  })

  doc.save(`${patientName.replace(/\s+/g, "_")}_readings.pdf`)
}

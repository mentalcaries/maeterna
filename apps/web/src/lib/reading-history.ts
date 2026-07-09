import type { components } from "@/lib/api.types"

export type ApiReading = components["schemas"]["Reading"]

export function toLocalDateStr(d: Date, opts?: { showYear?: boolean }): string {
  return d.toLocaleDateString("en-TT", {
    month: "short",
    day: "numeric",
    ...(opts?.showYear ? { year: "numeric" } : {}),
  })
}

export function toLocalTimeStr(d: Date): string {
  return d.toLocaleTimeString("en-TT", { hour: "2-digit", minute: "2-digit" })
}

export function localDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export const MEAL_SLOT_BOUNDARIES = {
  BREAKFAST_END_HOUR: 11,
  LUNCH_END_HOUR: 16,
} as const

export type GlucoseSlot = "fasted" | "breakfast" | "lunch" | "dinner"

export function glucoseSlotFor(reading: {
  context: string
  timestamp: string
}): GlucoseSlot {
  if (reading.context === "fasted") return "fasted"
  const hour = new Date(reading.timestamp).getHours()
  if (hour < MEAL_SLOT_BOUNDARIES.BREAKFAST_END_HOUR) return "breakfast"
  if (hour < MEAL_SLOT_BOUNDARIES.LUNCH_END_HOUR) return "lunch"
  return "dinner"
}

export type BPSlot = "AM" | "PM"

export function bpSlotFor(reading: { context: string }): BPSlot {
  return reading.context === "morning" ? "AM" : "PM"
}

export interface DateRow<T> {
  dateKey: string
  date: Date
  readings: T[]
}

export function groupByLocalDate<T extends { timestamp: string }>(
  readings: T[]
): DateRow<T>[] {
  const groups = new Map<string, DateRow<T>>()
  for (const reading of readings) {
    const date = new Date(reading.timestamp)
    const dateKey = localDateKey(date)
    let group = groups.get(dateKey)
    if (!group) {
      group = { dateKey, date, readings: [] }
      groups.set(dateKey, group)
    }
    group.readings.push(reading)
  }
  const rows = [...groups.values()]
  for (const row of rows) {
    row.readings.sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )
  }
  rows.sort((a, b) => b.date.getTime() - a.date.getTime())
  return rows
}

export function datesSpanMultipleYears(rows: { date: Date }[]): boolean {
  if (rows.length === 0) return false
  const years = new Set(rows.map((r) => r.date.getFullYear()))
  return years.size > 1
}

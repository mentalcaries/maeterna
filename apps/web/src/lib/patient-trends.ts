import { mgdlToMmol, type GlucoseUnit } from "@/lib/glucose"
import type { components } from "@/lib/api.types"

type Reading = components["schemas"]["Reading"]

export interface GlucoseTrendDay {
  date: string
  label: string
  fasted?: number
  postMeal?: number
  highFasted?: number
  highPostMeal?: number
  readings: Reading[]
}

export interface BPTrendDay {
  date: string
  label: string
  systolic?: number
  diastolic?: number
  readings: Reading[]
}

export function lastSevenDates(now = new Date()): string[] {
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today)
    date.setDate(today.getDate() - (6 - index))
    return localDateKey(date)
  })
}

export function sevenDaysFrom(now = new Date()): string {
  const date = new Date(now)
  date.setDate(date.getDate() - 6)
  date.setHours(0, 0, 0, 0)
  return date.toISOString()
}

export function buildGlucoseTrend(
  readings: Reading[],
  dates: string[] = lastSevenDates()
): GlucoseTrendDay[] {
  return dates.map((date) => {
    const dailyReadings = readings.filter(
      (reading) => readingDate(reading) === date
    )
    const fasted = dailyReadings.find((reading) => reading.context === "fasted")
    const postMealReadings = dailyReadings.filter(
      (reading) => reading.context === "post_meal"
    )

    const postMeal = average(postMealReadings.map((reading) => reading.value1))
    const highFasted = fasted?.severity === "high"
    const highPostMeal = postMealReadings.some(
      (reading) => reading.severity === "high"
    )

    return {
      date,
      label: shortDateLabel(date),
      fasted: fasted?.value1,
      postMeal,
      highFasted: highFasted ? fasted?.value1 : undefined,
      highPostMeal: highPostMeal ? postMeal : undefined,
      readings: dailyReadings,
    }
  })
}

export function buildBPTrend(
  readings: Reading[],
  dates: string[] = lastSevenDates()
): BPTrendDay[] {
  return dates.map((date) => {
    const dailyReadings = readings.filter(
      (reading) => readingDate(reading) === date && reading.value2 !== null
    )

    return {
      date,
      label: shortDateLabel(date),
      systolic: average(dailyReadings.map((reading) => reading.value1)),
      diastolic: average(
        dailyReadings.map((reading) => reading.value2).filter(isNumber)
      ),
      readings: dailyReadings,
    }
  })
}

export function glucoseTrendForUnit(
  trend: GlucoseTrendDay[],
  unit: GlucoseUnit
): GlucoseTrendDay[] {
  if (unit === "mg/dL") return trend

  return trend.map((day) => ({
    ...day,
    fasted: day.fasted === undefined ? undefined : mgdlToMmol(day.fasted),
    postMeal: day.postMeal === undefined ? undefined : mgdlToMmol(day.postMeal),
    highFasted:
      day.highFasted === undefined ? undefined : mgdlToMmol(day.highFasted),
    highPostMeal:
      day.highPostMeal === undefined ? undefined : mgdlToMmol(day.highPostMeal),
  }))
}

export function latestReading(readings: Reading[]): Reading | undefined {
  return readings.reduce<Reading | undefined>((latest, reading) => {
    if (!latest || reading.timestamp > latest.timestamp) return reading
    return latest
  }, undefined)
}

export function inRangeCount(readings: Reading[]): number {
  return readings.filter((reading) => reading.severity === "normal").length
}

function readingDate(reading: Reading): string {
  return reading.readingDate ?? localDateKey(new Date(reading.timestamp))
}

function localDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function shortDateLabel(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-TT", {
    weekday: "short",
  })
}

function average(values: number[]): number | undefined {
  if (values.length === 0) return undefined
  return (
    Math.round(
      (values.reduce((sum, value) => sum + value, 0) / values.length) * 10
    ) / 10
  )
}

function isNumber(value: number | null): value is number {
  return value !== null
}

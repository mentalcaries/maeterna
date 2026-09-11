import { describe, expect, it } from "vite-plus/test"
import type { components } from "@/lib/api.types"
import {
  buildBPTrend,
  buildGlucoseTrend,
  glucoseTrendForUnit,
  inRangeCount,
  latestReading,
} from "@/lib/patient-trends"

type Reading = components["schemas"]["Reading"]

function reading(overrides: Partial<Reading>): Reading {
  return {
    id: "reading-1",
    patientId: "patient-1",
    loggedById: "patient-1",
    type: "glucose",
    value1: 100,
    value2: null,
    unit: "mg/dL",
    context: "fasted",
    notes: null,
    readingDate: "2026-09-11",
    slot: "fasted",
    timestamp: "2026-09-11T07:00:00.000Z",
    severity: "normal",
    createdAt: "2026-09-11T07:00:00.000Z",
    ...overrides,
  }
}

describe("patient trends", () => {
  const dates = ["2026-09-10", "2026-09-11"]

  it("summarizes glucose without hiding a high post-meal reading", () => {
    const trend = buildGlucoseTrend(
      [
        reading({ value1: 90 }),
        reading({ id: "breakfast", context: "post_meal", value1: 120 }),
        reading({
          id: "dinner",
          context: "post_meal",
          value1: 150,
          severity: "high",
        }),
      ],
      dates
    )

    expect(trend[1]).toMatchObject({
      fasted: 90,
      postMeal: 135,
      highFasted: undefined,
      highPostMeal: 135,
    })
  })

  it("averages blood pressure values by calendar date", () => {
    const trend = buildBPTrend(
      [
        reading({ type: "blood_pressure", value1: 120, value2: 80 }),
        reading({
          id: "evening",
          type: "blood_pressure",
          value1: 130,
          value2: 70,
        }),
      ],
      dates
    )

    expect(trend[1]).toMatchObject({ systolic: 125, diastolic: 75 })
  })

  it("keeps empty dates between non-consecutive reading days", () => {
    const trend = buildGlucoseTrend(
      [
        reading({ id: "first", readingDate: dates[0], value1: 90 }),
        reading({ id: "last", value1: 120 }),
      ],
      ["2026-09-09", ...dates, "2026-09-12"]
    )

    expect(trend.map((day) => day.fasted)).toEqual([
      undefined,
      90,
      120,
      undefined,
    ])
  })

  it("converts displayed glucose trend values and counts individual readings", () => {
    const trend = glucoseTrendForUnit(
      [
        {
          date: dates[1],
          label: "Fri",
          fasted: 90,
          postMeal: 135,
          highFasted: undefined,
          highPostMeal: undefined,
          readings: [],
        },
      ],
      "mmol/L"
    )

    expect(trend[0]).toMatchObject({ fasted: 5, postMeal: 7.5 })
    expect(
      inRangeCount([reading({}), reading({ id: "high", severity: "high" })])
    ).toBe(1)
  })

  it("uses the most recent individual reading for the summary", () => {
    const latest = latestReading([
      reading({ timestamp: "2026-09-11T07:00:00.000Z" }),
      reading({ id: "latest", timestamp: "2026-09-11T20:00:00.000Z" }),
    ])

    expect(latest?.id).toBe("latest")
  })
})

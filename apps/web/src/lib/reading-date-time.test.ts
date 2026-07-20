import { describe, expect, it } from "vite-plus/test"
import {
  combineLocalDateAndHour,
  hourOptionValue,
  roundToNearestAvailableHour,
} from "./reading-date-time"

describe("roundToNearestAvailableHour", () => {
  it("rounds minutes below 30 down", () => {
    const result = roundToNearestAvailableHour(
      new Date(2026, 6, 19, 9, 29),
      new Date(2026, 6, 20)
    )
    expect(result.getHours()).toBe(9)
    expect(result.getMinutes()).toBe(0)
  })

  it("rounds minutes at 30 up", () => {
    const result = roundToNearestAvailableHour(
      new Date(2026, 6, 19, 9, 30),
      new Date(2026, 6, 20)
    )
    expect(result.getHours()).toBe(10)
    expect(result.getMinutes()).toBe(0)
  })

  it("rolls late readings into the next day", () => {
    const result = roundToNearestAvailableHour(
      new Date(2026, 6, 18, 23, 45),
      new Date(2026, 6, 20)
    )
    expect(result.getDate()).toBe(19)
    expect(result.getHours()).toBe(0)
  })

  it("does not round a reading into the future", () => {
    const result = roundToNearestAvailableHour(
      new Date(2026, 6, 20, 9, 40),
      new Date(2026, 6, 20, 9, 45)
    )
    expect(result.getHours()).toBe(9)
    expect(result.getMinutes()).toBe(0)
  })
})

describe("reading date and time values", () => {
  it("formats an hourly option value", () => {
    expect(hourOptionValue(new Date(2026, 6, 20, 6, 45))).toBe("06:00")
  })

  it("combines a local date and selected hour", () => {
    const result = combineLocalDateAndHour(new Date(2026, 6, 20), "14:00")
    expect(result?.getFullYear()).toBe(2026)
    expect(result?.getMonth()).toBe(6)
    expect(result?.getDate()).toBe(20)
    expect(result?.getHours()).toBe(14)
    expect(result?.getMinutes()).toBe(0)
  })
})

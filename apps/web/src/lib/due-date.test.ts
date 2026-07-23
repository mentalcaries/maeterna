import { describe, expect, it } from "vite-plus/test"
import {
  computeGestationalAge,
  formatDueDate,
  formatGestationalAge,
  isDueDateValid,
  parseDueDate,
} from "./due-date"

describe("formatDueDate", () => {
  it("formats an ISO date string for display", () => {
    expect(formatDueDate("2026-10-15")).toBe("Oct 15, 2026")
  })

  it("formats a date in a single-digit month and day", () => {
    expect(formatDueDate("2026-01-05")).toBe("Jan 5, 2026")
  })
})

describe("parseDueDate", () => {
  it("returns undefined for null", () => {
    expect(parseDueDate(null)).toBeUndefined()
  })

  it("returns undefined for undefined", () => {
    expect(parseDueDate(undefined)).toBeUndefined()
  })

  it("returns a Date object for a valid ISO date string", () => {
    const result = parseDueDate("2026-10-15")
    expect(result).toBeInstanceOf(Date)
    expect(result?.getFullYear()).toBe(2026)
    expect(result?.getMonth()).toBe(9) // October is month 9 (0-indexed)
    expect(result?.getDate()).toBe(15)
  })
})

describe("computeGestationalAge", () => {
  it("returns null when EDD is more than 280 days away", () => {
    const today = new Date(2026, 6, 23) // Jul 23, 2026
    expect(computeGestationalAge("2027-06-01", today)).toBeNull()
  })

  it("returns null when EDD is exactly 280 days away (0w 0d is not meaningful)", () => {
    const today = new Date(2026, 6, 23) // Jul 23, 2026
    // Apr 29, 2027 is exactly 280 days from today
    expect(computeGestationalAge("2027-04-29", today)).toBeNull()
  })

  it("returns 30w 0d when EDD is exactly 10 weeks (70 days) away", () => {
    const today = new Date(2026, 6, 23) // Jul 23, 2026
    // Oct 1, 2026 is 70 days away → gestational_days = 280 - 70 = 210 = 30w 0d
    expect(computeGestationalAge("2026-10-01", today)).toEqual({
      weeks: 30,
      days: 0,
    })
  })

  it("returns correct weeks and fractional days for a partial week", () => {
    const today = new Date(2026, 6, 23) // Jul 23, 2026
    // Oct 4, 2026 is 73 days away → gestational_days = 280 - 73 = 207 = 29w 4d
    expect(computeGestationalAge("2026-10-04", today)).toEqual({
      weeks: 29,
      days: 4,
    })
  })

  it("handles an overdue pregnancy (EDD in the past)", () => {
    const today = new Date(2026, 6, 23) // Jul 23, 2026
    // Jul 13, 2026 is 10 days ago → gestational_days = 280 + 10 = 290 = 41w 3d
    expect(computeGestationalAge("2026-07-13", today)).toEqual({
      weeks: 41,
      days: 3,
    })
  })
})

describe("formatGestationalAge", () => {
  it("formats weeks and days", () => {
    expect(formatGestationalAge({ weeks: 31, days: 4 })).toBe("31w 4d")
  })

  it("formats zero days", () => {
    expect(formatGestationalAge({ weeks: 30, days: 0 })).toBe("30w 0d")
  })
})

describe("isDueDateValid", () => {
  it("rejects a date in the past", () => {
    const past = new Date()
    past.setDate(past.getDate() - 1)
    expect(isDueDateValid(past)).toBe(false)
  })

  it("accepts a date tomorrow", () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    expect(isDueDateValid(tomorrow)).toBe(true)
  })

  it("accepts a date 9 months out", () => {
    const nineMonths = new Date()
    nineMonths.setMonth(nineMonths.getMonth() + 9)
    expect(isDueDateValid(nineMonths)).toBe(true)
  })

  it("rejects a date more than 12 months out", () => {
    const tooFar = new Date()
    tooFar.setMonth(tooFar.getMonth() + 13)
    expect(isDueDateValid(tooFar)).toBe(false)
  })
})

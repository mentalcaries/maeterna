import { describe, expect, it } from "vite-plus/test"
import { formatDueDate, isDueDateValid, parseDueDate } from "./due-date"

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

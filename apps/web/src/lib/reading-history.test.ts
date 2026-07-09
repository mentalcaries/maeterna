import { describe, expect, it } from "vite-plus/test"
import {
  bpSlotFor,
  datesSpanMultipleYears,
  glucoseSlotFor,
  groupByLocalDate,
  localDateKey,
} from "./reading-history"

function localTimestamp(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute = 0
): string {
  return new Date(year, month - 1, day, hour, minute).toISOString()
}

describe("glucoseSlotFor", () => {
  it("returns fasted for fasted context regardless of time", () => {
    expect(
      glucoseSlotFor({
        context: "fasted",
        timestamp: localTimestamp(2026, 6, 3, 23, 30),
      })
    ).toBe("fasted")
  })

  it("returns breakfast just before the breakfast boundary", () => {
    expect(
      glucoseSlotFor({
        context: "post_meal",
        timestamp: localTimestamp(2026, 6, 3, 10, 59),
      })
    ).toBe("breakfast")
  })

  it("returns lunch exactly at the breakfast boundary", () => {
    expect(
      glucoseSlotFor({
        context: "post_meal",
        timestamp: localTimestamp(2026, 6, 3, 11, 0),
      })
    ).toBe("lunch")
  })

  it("returns lunch just before the dinner boundary", () => {
    expect(
      glucoseSlotFor({
        context: "post_meal",
        timestamp: localTimestamp(2026, 6, 3, 15, 59),
      })
    ).toBe("lunch")
  })

  it("returns dinner exactly at the dinner boundary", () => {
    expect(
      glucoseSlotFor({
        context: "post_meal",
        timestamp: localTimestamp(2026, 6, 3, 16, 0),
      })
    ).toBe("dinner")
  })
})

describe("bpSlotFor", () => {
  it("returns AM for morning context", () => {
    expect(bpSlotFor({ context: "morning" })).toBe("AM")
  })

  it("returns PM for evening context", () => {
    expect(bpSlotFor({ context: "evening" })).toBe("PM")
  })
})

describe("groupByLocalDate", () => {
  it("groups readings on the same local date into one row, earliest first", () => {
    const readings = [
      { id: "b", timestamp: localTimestamp(2026, 6, 3, 18, 0) },
      { id: "a", timestamp: localTimestamp(2026, 6, 3, 7, 0) },
    ]
    const rows = groupByLocalDate(readings)
    expect(rows).toHaveLength(1)
    expect(rows[0]!.readings.map((r) => r.id)).toEqual(["a", "b"])
  })

  it("sorts rows by date descending", () => {
    const readings = [
      { id: "old", timestamp: localTimestamp(2026, 6, 1, 9, 0) },
      { id: "new", timestamp: localTimestamp(2026, 6, 5, 9, 0) },
      { id: "mid", timestamp: localTimestamp(2026, 6, 3, 9, 0) },
    ]
    const rows = groupByLocalDate(readings)
    expect(rows.map((r) => r.readings[0]!.id)).toEqual(["new", "mid", "old"])
  })
})

describe("localDateKey", () => {
  it("is stable for two timestamps on the same local calendar day", () => {
    const morning = new Date(2026, 5, 3, 0, 5)
    const night = new Date(2026, 5, 3, 23, 55)
    expect(localDateKey(morning)).toBe(localDateKey(night))
  })
})

describe("datesSpanMultipleYears", () => {
  it("is false when all rows share a year", () => {
    expect(
      datesSpanMultipleYears([
        { date: new Date(2026, 0, 1) },
        { date: new Date(2026, 11, 31) },
      ])
    ).toBe(false)
  })

  it("is true when rows span more than one year", () => {
    expect(
      datesSpanMultipleYears([
        { date: new Date(2025, 11, 31) },
        { date: new Date(2026, 0, 1) },
      ])
    ).toBe(true)
  })
})

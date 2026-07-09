export type TimeRange = "week" | "2weeks" | "month" | "all"

const RANGE_DAYS: Record<Exclude<TimeRange, "all">, number> = {
  week: 7,
  "2weeks": 14,
  month: 30,
}

export const RANGE_LABELS: Record<TimeRange, string> = {
  week: "Past week",
  "2weeks": "Past 2 weeks",
  month: "Past month",
  all: "All time",
}

export function rangeToFrom(range: TimeRange): string | undefined {
  if (range === "all") return undefined
  return new Date(
    Date.now() - RANGE_DAYS[range] * 24 * 60 * 60 * 1000
  ).toISOString()
}

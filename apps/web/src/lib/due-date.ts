export function formatDueDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number)
  return new Date(year!, month! - 1, day!).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function parseDueDate(
  isoDate: string | null | undefined
): Date | undefined {
  if (!isoDate) return undefined
  const [year, month, day] = isoDate.split("-").map(Number)
  return new Date(year!, month! - 1, day!)
}

export function computeGestationalAge(
  eddIso: string,
  today = new Date()
): { weeks: number; days: number } | null {
  const [year, month, day] = eddIso.split("-").map(Number)
  const eddUtc = Date.UTC(year!, month! - 1, day!)
  const lmpUtc = eddUtc - 280 * 24 * 60 * 60 * 1000
  const todayUtc = Date.UTC(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  )
  const gestationalDays = Math.floor(
    (todayUtc - lmpUtc) / (24 * 60 * 60 * 1000)
  )
  if (gestationalDays <= 0) return null
  return { weeks: Math.floor(gestationalDays / 7), days: gestationalDays % 7 }
}

export function formatGestationalAge(ga: {
  weeks: number
  days: number
}): string {
  return `${ga.weeks}w ${ga.days}d`
}

export function isDueDateValid(date: Date): boolean {
  const now = new Date()
  const max = new Date()
  max.setMonth(max.getMonth() + 12)
  return date > now && date <= max
}

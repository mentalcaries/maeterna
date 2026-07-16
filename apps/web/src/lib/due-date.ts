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

export function isDueDateValid(date: Date): boolean {
  const now = new Date()
  const max = new Date()
  max.setMonth(max.getMonth() + 12)
  return date > now && date <= max
}
